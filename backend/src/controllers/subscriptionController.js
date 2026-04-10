const { query } = require("../db/pool");
const razorpayService = require("../services/razorpay");
const emailService = require("../services/email");
const logger = require("../utils/logger");

// Re-export payment handlers from api/razorpay
const {
  createOrder,
  verifyPayment,
  cancelSubscription,
} = require("../api/razorpay");

// ── GET /api/subscription ─────────────────────────────────────────────────
async function getSubscription(req, res, next) {
  try {
    await query(
      `INSERT INTO subscriptions (user_id, plan, status)
       VALUES ($1, 'free', 'active')
       ON CONFLICT (user_id) DO NOTHING`,
      [req.user.id],
    ).catch(() => {});

    const { rows } = await query(
      "SELECT * FROM subscriptions WHERE user_id = $1",
      [req.user.id],
    );
    return res.json(rows[0] || { plan: "free", status: "active" });
  } catch (err) {
    if (err.code === "42P01")
      return res.json({ plan: "free", status: "active" });
    next(err);
  }
}

// ── POST /api/subscription/webhook ───────────────────────────────────────
async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString()
      : JSON.stringify(req.body);

    if (
      signature &&
      !razorpayService.verifyWebhookSignature(rawBody, signature)
    ) {
      logger.warn("Invalid webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const parsed = Buffer.isBuffer(req.body) ? JSON.parse(rawBody) : req.body;
    const { event, payload } = parsed;
    const eventId =
      payload?.subscription?.id ||
      payload?.payment?.entity?.id ||
      `${event}-${Date.now()}`;

    logger.info(`Razorpay webhook: ${event}`);

    const existing = await query(
      "SELECT id FROM webhook_events WHERE event_id=$1",
      [eventId],
    ).catch(() => ({ rows: [] }));

    if (existing.rows[0]) {
      return res.json({ status: "already_processed" });
    }

    await query(
      `INSERT INTO webhook_events (provider, event_id, event_type, payload)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      ["razorpay", eventId, event, parsed],
    ).catch(() => {});

    switch (event) {
      case "subscription.created":
        await _onSubscriptionCreated(payload);
        break;
      case "subscription.activated":
        await _onSubscriptionActivated(payload);
        break;
      case "subscription.updated":
        await _onSubscriptionUpdated(payload);
        break;
      case "subscription.paused":
        await _onSubscriptionPaused(payload);
        break;
      case "subscription.resumed":
        await _onSubscriptionResumed(payload);
        break;
      case "subscription.cancelled":
        await _onSubscriptionCancelled(payload);
        break;
      case "subscription.ended":
        await _onSubscriptionEnded(payload);
        break;
      case "subscription.pending":
        await _onSubscriptionPending(payload);
        break;
      case "payment.authorized":
        logger.info(`Payment authorized: ${payload?.payment?.entity?.id}`);
        break;
      case "payment.captured":
        logger.info(`Payment captured: ${payload?.payment?.entity?.id}`);
        break;
      case "payment.failed":
        logger.warn(`Payment failed: ${payload?.payment?.entity?.id}`);
        break;
      default:
        logger.info(`Unhandled webhook event: ${event}`);
    }

    await query(
      "UPDATE webhook_events SET processed=true, processed_at=NOW() WHERE event_id=$1",
      [eventId],
    ).catch(() => {});

    return res.json({ status: "ok" });
  } catch (err) {
    logger.error("Webhook handler error:", err);
    next(err);
  }
}

// ── Internal webhook sub-handlers ─────────────────────────────────────────

async function _onSubscriptionCreated(payload) {
  try {
    const sub = payload.subscription;
    const planType = payload.notes?.plan_type || "premium";
    const { rows } = await query(
      "SELECT user_id FROM subscriptions WHERE razorpay_customer_id=$1",
      [sub.customer_id],
    );
    if (!rows[0]) return logger.warn("No user for customer:", sub.customer_id);
    await query(
      `UPDATE subscriptions SET
         razorpay_subscription_id=$1, razorpay_customer_id=$2,
         plan=$3, status=$4,
         current_period_start=to_timestamp($5), current_period_end=to_timestamp($6),
         cancel_at_period_end=false, updated_at=NOW()
       WHERE user_id=$7`,
      [
        sub.id,
        sub.customer_id,
        planType,
        sub.status,
        Math.floor(sub.created_at),
        Math.floor(sub.expire_by),
        rows[0].user_id,
      ],
    );
    logger.info(`Webhook: subscription created ${sub.id} -> ${planType}`);
  } catch (err) {
    logger.error("_onSubscriptionCreated:", err);
  }
}

async function _onSubscriptionActivated(payload) {
  try {
    const sub = payload.subscription;
    const planType = payload.notes?.plan_type || "premium";
    const { rows } = await query(
      "SELECT user_id FROM subscriptions WHERE razorpay_subscription_id=$1",
      [sub.id],
    );
    if (!rows[0]) return logger.warn("Subscription not found:", sub.id);
    await query(
      `UPDATE subscriptions SET
         plan=$1, status='active',
         current_period_start=to_timestamp($2), current_period_end=to_timestamp($3),
         cancel_at_period_end=false, updated_at=NOW()
       WHERE razorpay_subscription_id=$4`,
      [planType, Math.floor(sub.created_at), Math.floor(sub.expire_by), sub.id],
    );
    const { rows: userRows } = await query("SELECT * FROM users WHERE id=$1", [
      rows[0].user_id,
    ]);
    if (userRows[0]) {
      if (planType === "pro") {
        emailService
          .sendProSubscriptionConfirmEmail(userRows[0], planType)
          .catch(() => {});
      } else {
        emailService
          .sendSubscriptionConfirmEmail(userRows[0], planType)
          .catch(() => {});
      }
    }
    logger.info(`Webhook: subscription activated ${sub.id}`);
  } catch (err) {
    logger.error("_onSubscriptionActivated:", err);
  }
}

async function _onSubscriptionUpdated(payload) {
  try {
    const sub = payload.subscription;
    const planType = payload.notes?.plan_type || "premium";
    await query(
      `UPDATE subscriptions SET
         plan=$1, status=$2,
         current_period_start=to_timestamp($3), current_period_end=to_timestamp($4),
         updated_at=NOW()
       WHERE razorpay_subscription_id=$5`,
      [
        planType,
        sub.status,
        Math.floor(sub.created_at),
        Math.floor(sub.expire_by),
        sub.id,
      ],
    );
    logger.info(`Webhook: subscription updated ${sub.id} -> ${sub.status}`);
  } catch (err) {
    logger.error("_onSubscriptionUpdated:", err);
  }
}

async function _onSubscriptionPaused(payload) {
  try {
    await query(
      "UPDATE subscriptions SET status='paused', updated_at=NOW() WHERE razorpay_subscription_id=$1",
      [payload.subscription.id],
    );
    logger.info(`Webhook: subscription paused ${payload.subscription.id}`);
  } catch (err) {
    logger.error("_onSubscriptionPaused:", err);
  }
}

async function _onSubscriptionResumed(payload) {
  try {
    const sub = payload.subscription;
    const planType = payload.notes?.plan_type || "premium";
    await query(
      `UPDATE subscriptions SET plan=$1, status='active',
       current_period_end=to_timestamp($2), updated_at=NOW()
       WHERE razorpay_subscription_id=$3`,
      [planType, Math.floor(sub.expire_by), sub.id],
    );
    logger.info(`Webhook: subscription resumed ${sub.id}`);
  } catch (err) {
    logger.error("_onSubscriptionResumed:", err);
  }
}

async function _onSubscriptionCancelled(payload) {
  try {
    await query(
      `UPDATE subscriptions SET plan='free', status='cancelled',
       cancel_at_period_end=false, updated_at=NOW()
       WHERE razorpay_subscription_id=$1`,
      [payload.subscription.id],
    );
    logger.info(`Webhook: subscription cancelled ${payload.subscription.id}`);
  } catch (err) {
    logger.error("_onSubscriptionCancelled:", err);
  }
}

async function _onSubscriptionEnded(payload) {
  try {
    await query(
      `UPDATE subscriptions SET plan='free', status='expired',
       cancel_at_period_end=false, updated_at=NOW()
       WHERE razorpay_subscription_id=$1`,
      [payload.subscription.id],
    );
    logger.info(`Webhook: subscription ended ${payload.subscription.id}`);
  } catch (err) {
    logger.error("_onSubscriptionEnded:", err);
  }
}

async function _onSubscriptionPending(payload) {
  try {
    const sub = payload.subscription;
    const planType = payload.notes?.plan_type || "premium";
    await query(
      "UPDATE subscriptions SET plan=$1, status='pending', updated_at=NOW() WHERE razorpay_subscription_id=$2",
      [planType, sub.id],
    );
    logger.info(`Webhook: subscription pending ${sub.id}`);
  } catch (err) {
    logger.error("_onSubscriptionPending:", err);
  }
}

// ── Exports ───────────────────────────────────────────────────────────────
module.exports = {
  getSubscription,
  createSubscription: createOrder, // alias — routes still call createSubscription
  verifyPayment,
  cancelSubscription,
  handleWebhook,
};
