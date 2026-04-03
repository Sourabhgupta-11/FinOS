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
    res.json(rows[0] || { plan: 'free', status: 'active' });
  } catch (err) { next(err); }
}

async function createSubscription(req, res, next) {
  try {
    if (!process.env.RAZORPAY_KEY_ID) {
      return res.status(503).json({ error: 'Payment gateway not configured' });
    }

    // Create or get Razorpay customer
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

    const subscription = await razorpayService.createSubscription(customerId);

    // Upsert subscription record
    await query(
      `INSERT INTO subscriptions (user_id, razorpay_subscription_id, razorpay_customer_id, plan, status)
       VALUES ($1, $2, $3, 'free', 'pending')
       ON CONFLICT (user_id) DO UPDATE SET
         razorpay_subscription_id = EXCLUDED.razorpay_subscription_id,
         razorpay_customer_id = EXCLUDED.razorpay_customer_id,
         status = 'pending', updated_at = NOW()`,
      [req.user.id, subscription.id, customerId]
    );

    res.json({
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: 19900,
      currency: 'INR',
    });
  } catch (err) { next(err); }
}

async function cancelSubscription(req, res, next) {
  try {
    const { rows } = await query(
      'SELECT razorpay_subscription_id FROM subscriptions WHERE user_id = $1 AND plan = $2',
      [req.user.id, 'premium']
    );

    if (!rows[0]?.razorpay_subscription_id) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    await razorpayService.cancelSubscription(rows[0].razorpay_subscription_id);
    await query(
      `UPDATE subscriptions SET cancel_at_period_end = true, updated_at = NOW() WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({ message: 'Subscription will cancel at end of billing period' });
  } catch (err) { next(err); }
}

// Called by Razorpay webhook
async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    if (!razorpayService.verifyWebhookSignature(body, signature)) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const { event, payload } = req.body;
    const eventId = req.body.id;

    // Idempotency check
    const existing = await query(
      'SELECT id FROM webhook_events WHERE event_id = $1',
      [eventId]
    );
    if (existing.rows[0]) return res.json({ status: 'already_processed' });

    // Save event
    await query(
      'INSERT INTO webhook_events (provider, event_id, event_type, payload) VALUES ($1,$2,$3,$4)',
      ['razorpay', eventId, event, req.body]
    );

    const subId = payload.subscription?.entity?.id;

    if (event === 'subscription.activated' || event === 'subscription.charged') {
      const sub = payload.subscription.entity;
      await query(
        `UPDATE subscriptions SET
           plan = 'premium', status = 'active',
           current_period_start = to_timestamp($1),
           current_period_end = to_timestamp($2),
           updated_at = NOW()
         WHERE razorpay_subscription_id = $3`,
        [sub.current_start, sub.current_end, subId]
      );

      // Send confirmation email
      const { rows } = await query(
        `SELECT u.* FROM users u
         JOIN subscriptions s ON s.user_id = u.id
         WHERE s.razorpay_subscription_id = $1`,
        [subId]
      );
      if (rows[0]) {
        await emailService.sendSubscriptionConfirmEmail(rows[0], 'premium').catch(() => {});
      }

      logger.info(`Subscription activated: ${subId}`);
    }

    if (event === 'subscription.cancelled' || event === 'subscription.completed') {
      await query(
        `UPDATE subscriptions SET plan = 'free', status = 'cancelled', updated_at = NOW()
         WHERE razorpay_subscription_id = $1`,
        [subId]
      );
      logger.info(`Subscription cancelled: ${subId}`);
    }

    if (event === 'subscription.halted') {
      await query(
        `UPDATE subscriptions SET status = 'expired', updated_at = NOW()
         WHERE razorpay_subscription_id = $1`,
        [subId]
      );
    }

    await query(
      'UPDATE webhook_events SET processed = true, processed_at = NOW() WHERE event_id = $1',
      [eventId]
    );

    res.json({ status: 'ok' });
  } catch (err) { next(err); }
}

module.exports = { getSubscription, createSubscription, cancelSubscription, handleWebhook };
