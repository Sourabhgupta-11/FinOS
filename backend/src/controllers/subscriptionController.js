const { query } = require('../db/pool');
const razorpayService = require('../services/razorpay');
const emailService = require('../services/email');
const logger = require('../utils/logger');

async function getSubscription(req, res, next) {
  try {
    const { rows } = await query(
      'SELECT * FROM subscriptions WHERE user_id = $1',
      [req.user.id]
    );
    // Ensure row exists
    if (!rows[0]) {
      await query(
        'INSERT INTO subscriptions (user_id, plan, status) VALUES ($1,$2,$3) ON CONFLICT (user_id) DO NOTHING',
        [req.user.id, 'free', 'active']
      );
      return res.json({ plan: 'free', status: 'active' });
    }
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '42P01') return res.json({ plan: 'free', status: 'active' });
    next(err);
  }
}

async function createSubscription(req, res, next) {
  try {
    const { planType = 'premium' } = req.body; // 'pro' or 'premium'
    const planId = planType === 'pro'
      ? process.env.RAZORPAY_PRO_PLAN_ID
      : process.env.RAZORPAY_PREMIUM_PLAN_ID;

    if (!process.env.RAZORPAY_KEY_ID || !planId) {
      // Demo mode — activate plan directly for local dev
      await query(
        `INSERT INTO subscriptions (user_id, plan, status, current_period_end)
         VALUES ($1,$2,'active', NOW() + INTERVAL '30 days')
         ON CONFLICT (user_id) DO UPDATE SET plan=$2, status='active',
         current_period_end=NOW() + INTERVAL '30 days', updated_at=NOW()`,
        [req.user.id, planType]
      );
      return res.json({ demo: true, plan: planType, message: 'Demo mode: plan activated directly' });
    }

    // Get or create Razorpay customer
    let { rows } = await query(
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
      `INSERT INTO subscriptions (user_id, razorpay_subscription_id, razorpay_customer_id, plan, status, razorpay_plan_type)
       VALUES ($1,$2,$3,'free','pending',$4)
       ON CONFLICT (user_id) DO UPDATE SET
         razorpay_subscription_id=$2, razorpay_customer_id=$3,
         status='pending', razorpay_plan_type=$4, updated_at=NOW()`,
      [req.user.id, subscription.id, customerId, planType]
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
    const { rows } = await query(
      'SELECT razorpay_subscription_id FROM subscriptions WHERE user_id = $1 AND plan != $2',
      [req.user.id, 'free']
    );
    if (rows[0]?.razorpay_subscription_id) {
      await razorpayService.cancelSubscription(rows[0].razorpay_subscription_id).catch(() => {});
    }
    await query(
      `UPDATE subscriptions SET cancel_at_period_end=true, updated_at=NOW() WHERE user_id=$1`,
      [req.user.id]
    );
    res.json({ message: 'Subscription will cancel at end of billing period' });
  } catch (err) { next(err); }
}

async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body.toString();

    if (!razorpayService.verifyWebhookSignature(body, signature)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const parsed = JSON.parse(body);
    const { event, payload } = parsed;
    const eventId = parsed.id;

    const existing = await query(
      'SELECT id FROM webhook_events WHERE event_id = $1',
      [eventId]
    ).catch(() => ({ rows: [] }));
    if (existing.rows[0]) return res.json({ status: 'already_processed' });

    await query(
      'INSERT INTO webhook_events (provider, event_id, event_type, payload) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
      ['razorpay', eventId, event, parsed]
    ).catch(() => {});

    const subId = payload.subscription?.entity?.id;

    if (event === 'subscription.activated' || event === 'subscription.charged') {
      const sub = payload.subscription.entity;
      const { rows: subRows } = await query(
        'SELECT razorpay_plan_type FROM subscriptions WHERE razorpay_subscription_id = $1',
        [subId]
      );
      const planType = subRows[0]?.razorpay_plan_type || 'premium';

      await query(
        `UPDATE subscriptions SET plan=$1, status='active',
           current_period_start=to_timestamp($2), current_period_end=to_timestamp($3), updated_at=NOW()
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
    }

    if (['subscription.cancelled','subscription.completed','subscription.halted'].includes(event)) {
      const newStatus = event === 'subscription.halted' ? 'expired' : 'cancelled';
      await query(
        `UPDATE subscriptions SET plan='free', status=$1, updated_at=NOW() WHERE razorpay_subscription_id=$2`,
        [newStatus, subId]
      );
    }

    await query(
      'UPDATE webhook_events SET processed=true, processed_at=NOW() WHERE event_id=$1',
      [eventId]
    ).catch(() => {});

    res.json({ status: 'ok' });
  } catch (err) { next(err); }
}

module.exports = { getSubscription, createSubscription, cancelSubscription, handleWebhook };
