const { query } = require('../db/pool');
const razorpayService = require('../services/razorpay');
const emailService = require('../services/email');
const logger = require('../utils/logger');

// Ensure a subscription row always exists for the user
async function ensureSubscriptionRow(userId) {
  await query(
    `INSERT INTO subscriptions (user_id, plan, status)
     VALUES ($1, 'free', 'active')
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  ).catch(() => {});
}

async function getSubscription(req, res, next) {
  try {
    await ensureSubscriptionRow(req.user.id);
    const { rows } = await query(
      'SELECT * FROM subscriptions WHERE user_id = $1',
      [req.user.id]
    );
    // Always return something — never 404
    res.json(rows[0] || { plan: 'free', status: 'active' });
  } catch (err) {
    // Table doesn't exist yet — return free
    if (err.code === '42P01') return res.json({ plan: 'free', status: 'active' });
    next(err);
  }
}

async function createSubscription(req, res, next) {
  try {
    const { planType = 'premium' } = req.body;
    await ensureSubscriptionRow(req.user.id);

    const planId = planType === 'pro'
      ? process.env.RAZORPAY_PRO_PLAN_ID
      : process.env.RAZORPAY_PREMIUM_PLAN_ID;

    // Demo mode — no Razorpay configured
    if (!process.env.RAZORPAY_KEY_ID || !planId) {
      const now = new Date();
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await query(
        `UPDATE subscriptions SET
           plan=$1, status='active',
           current_period_start=$2, current_period_end=$3,
           cancel_at_period_end=false, updated_at=NOW()
         WHERE user_id=$4`,
        [planType, now, end, req.user.id]
      );
      logger.info(`Demo subscription activated: ${planType} for ${req.user.id}`);
      return res.json({ demo: true, plan: planType, message: `${planType} plan activated (demo mode)` });
    }

    // Get or create Razorpay customer
    const { rows } = await query(
      'SELECT razorpay_customer_id FROM subscriptions WHERE user_id = $1',
      [req.user.id]
    );
    let customerId = rows[0]?.razorpay_customer_id;
    if (!customerId) {
      const customer = await razorpayService.createCustomer(
        req.user.name, req.user.email, req.body.phone
      );
      customerId = customer.id;
    }

    const subscription = await razorpayService.getRazorpay().subscriptions.create({
      plan_id: planId,
      customer_id: customerId,
      quantity: 1,
      total_count: 120,
      customer_notify: 1,
    });

    await query(
      `UPDATE subscriptions SET
         razorpay_subscription_id=$1, razorpay_customer_id=$2,
         status='pending', razorpay_plan_type=$3, updated_at=NOW()
       WHERE user_id=$4`,
      [subscription.id, customerId, planType, req.user.id]
    );

    res.json({
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: planType === 'pro' ? 9900 : 19900,
      currency: 'INR',
      planType,
    });
  } catch (err) { next(err); }
}

async function cancelSubscription(req, res, next) {
  try {
    await ensureSubscriptionRow(req.user.id);

    const { rows } = await query(
      'SELECT * FROM subscriptions WHERE user_id = $1',
      [req.user.id]
    );
    const sub = rows[0];

    if (!sub || sub.plan === 'free') {
      return res.status(400).json({ error: 'No active paid subscription found' });
    }

    // Cancel on Razorpay if linked
    if (sub.razorpay_subscription_id) {
      await razorpayService.cancelSubscription(sub.razorpay_subscription_id).catch(err => {
        logger.warn('Razorpay cancel failed (non-fatal):', err.message);
      });
    }

    await query(
      `UPDATE subscriptions SET cancel_at_period_end=true, updated_at=NOW() WHERE user_id=$1`,
      [req.user.id]
    );

    logger.info(`Subscription cancel_at_period_end set for user ${req.user.id}`);
    res.json({ message: 'Subscription will cancel at end of billing period' });
  } catch (err) { next(err); }
}

async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body);

    if (signature && !razorpayService.verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const parsed = Buffer.isBuffer(req.body) ? JSON.parse(rawBody) : req.body;
    const { event, payload } = parsed;
    const eventId = parsed.id || `${event}-${Date.now()}`;

    // Idempotency
    const existing = await query(
      'SELECT id FROM webhook_events WHERE event_id=$1',
      [eventId]
    ).catch(() => ({ rows: [] }));
    if (existing.rows[0]) return res.json({ status: 'already_processed' });

    await query(
      'INSERT INTO webhook_events (provider, event_id, event_type, payload) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
      ['razorpay', eventId, event, parsed]
    ).catch(() => {});

    const subId = payload?.subscription?.entity?.id;

    if (event === 'subscription.activated' || event === 'subscription.charged') {
      const sub = payload.subscription.entity;
      const { rows: subRows } = await query(
        'SELECT razorpay_plan_type FROM subscriptions WHERE razorpay_subscription_id=$1',
        [subId]
      );
      const planType = subRows[0]?.razorpay_plan_type || 'premium';

      await query(
        `UPDATE subscriptions SET
           plan=$1, status='active',
           current_period_start=to_timestamp($2),
           current_period_end=to_timestamp($3),
           cancel_at_period_end=false, updated_at=NOW()
         WHERE razorpay_subscription_id=$4`,
        [planType, sub.current_start, sub.current_end, subId]
      );

      const { rows: userRows } = await query(
        `SELECT u.* FROM users u JOIN subscriptions s ON s.user_id=u.id WHERE s.razorpay_subscription_id=$1`,
        [subId]
      );
      if (userRows[0]) {
        emailService.sendSubscriptionConfirmEmail(userRows[0], planType).catch(() => {});
      }
      logger.info(`Subscription activated: ${subId} → ${planType}`);
    }

    if (['subscription.cancelled','subscription.completed','subscription.halted'].includes(event)) {
      const newStatus = event === 'subscription.halted' ? 'expired' : 'cancelled';
      await query(
        `UPDATE subscriptions SET plan='free', status=$1, cancel_at_period_end=false, updated_at=NOW()
         WHERE razorpay_subscription_id=$2`,
        [newStatus, subId]
      );
      logger.info(`Subscription ended: ${subId} → ${newStatus}`);
    }

    await query(
      'UPDATE webhook_events SET processed=true, processed_at=NOW() WHERE event_id=$1',
      [eventId]
    ).catch(() => {});

    res.json({ status: 'ok' });
  } catch (err) { next(err); }
}

module.exports = { getSubscription, createSubscription, cancelSubscription, handleWebhook };
