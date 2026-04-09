const { query } = require("../db/pool");
const razorpayService = require("../services/razorpay");
const emailService = require("../services/email");
const logger = require("../utils/logger");

// Plan mapping for Razorpay
const PLAN_AMOUNTS = {
  pro: 99900, // Rs. 999 in paise per month
  premium: 199900, // Rs. 1999 in paise per month
};

// Ensure a subscription row always exists for the user
async function ensureSubscriptionRow(userId) {
  await query(
    `INSERT INTO subscriptions (user_id, plan, status)
     VALUES ($1, 'free', 'active')
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  ).catch(() => {});
}

async function getSubscription(req, res, next) {
  try {
    await ensureSubscriptionRow(req.user.id);
    const { rows } = await query(
      "SELECT * FROM subscriptions WHERE user_id = $1",
      [req.user.id],
    );
    // Always return something — never 404
    res.json(rows[0] || { plan: "free", status: "active" });
  } catch (err) {
    // Table doesn't exist yet — return free
    if (err.code === "42P01")
      return res.json({ plan: "free", status: "active" });
    next(err);
  }
}

async function createSubscription(req, res, next) {
  try {
    const { planType = "premium" } = req.body;
    await ensureSubscriptionRow(req.user.id);

    // Demo mode — no Razorpay configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_PLAN_ID) {
      const now = new Date();
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await query(
        `UPDATE subscriptions SET
           plan=$1, status='active',
           current_period_start=$2, current_period_end=$3,
           cancel_at_period_end=false, payment_provider='demo', updated_at=NOW()
         WHERE user_id=$4`,
        [planType, now, end, req.user.id],
      );
      logger.info(
        `Demo subscription activated: ${planType} for ${req.user.id}`,
      );
      return res.json({
        demo: true,
        plan: planType,
        message: `${planType} plan activated (demo mode)`,
      });
    }

    // Get or create customer
    const { rows: userRows } = await query(
      "SELECT * FROM users WHERE id = $1",
      [req.user.id],
    );
    const user = userRows[0];

    let customerId;
    const { rows: subRows } = await query(
      "SELECT razorpay_customer_id FROM subscriptions WHERE user_id = $1",
      [req.user.id],
    );

    if (subRows[0]?.razorpay_customer_id) {
      customerId = subRows[0].razorpay_customer_id;
    } else {
      const customer = await razorpayService.createCustomer(
        user.name || "Valued Customer",
        user.email,
        user.phone || "",
      );
      customerId = customer.id;
    }

    // Create subscription with Razorpay
    const subscription = await razorpayService.createSubscription(customerId);

    // Store subscription info (we'll update it when webhook is received)
    await query(
      `UPDATE subscriptions SET
         razorpay_customer_id=$1, razorpay_subscription_id=$2, 
         plan=$3, status='pending', payment_provider='razorpay', updated_at=NOW()
       WHERE user_id=$4`,
      [customerId, subscription.id, planType, req.user.id],
    );

    res.json({
      subscriptionId: subscription.id,
      planType,
      amount: PLAN_AMOUNTS[planType],
      currency: "INR",
      status: subscription.status,
      short_url: subscription.short_url || null,
    });
  } catch (err) {
    logger.error("Error creating subscription:", err);
    next(err);
  }
}

async function cancelSubscription(req, res, next) {
  try {
    await ensureSubscriptionRow(req.user.id);

    const { rows } = await query(
      "SELECT * FROM subscriptions WHERE user_id = $1",
      [req.user.id],
    );
    const sub = rows[0];

    if (!sub || sub.plan === "free") {
      return res
        .status(400)
        .json({ error: "No active paid subscription found" });
    }

    // Cancel on Razorpay if linked
    if (sub.razorpay_subscription_id) {
      await razorpayService
        .cancelSubscription(sub.razorpay_subscription_id)
        .catch((err) => {
          logger.warn("Razorpay cancel failed (non-fatal):", err.message);
        });
    }

    await query(
      `UPDATE subscriptions SET cancel_at_period_end=true, updated_at=NOW() WHERE user_id=$1`,
      [req.user.id],
    );

    logger.info(
      `Subscription cancel_at_period_end set for user ${req.user.id}`,
    );
    res.json({ message: "Subscription will cancel at end of billing period" });
  } catch (err) {
    next(err);
  }
}

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
    const eventId = payload?.subscription?.id || `${event}-${Date.now()}`;

    logger.info(`Received Razorpay webhook: ${event}`);

    // Idempotency check
    const existing = await query(
      "SELECT id FROM webhook_events WHERE event_id=$1",
      [eventId],
    ).catch(() => ({ rows: [] }));
    if (existing.rows[0]) {
      logger.info(`Webhook already processed: ${eventId}`);
      return res.json({ status: "already_processed" });
    }

    // Store the webhook event
    await query(
      "INSERT INTO webhook_events (provider, event_id, event_type, payload) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING",
      ["razorpay", eventId, event, parsed],
    ).catch(() => {});

    // Handle subscription events
    if (event === "subscription.created") {
      await handleSubscriptionCreated(payload);
    } else if (event === "subscription.activated") {
      await handleSubscriptionActivated(payload);
    } else if (event === "subscription.updated") {
      await handleSubscriptionUpdated(payload);
    } else if (event === "subscription.paused") {
      await handleSubscriptionPaused(payload);
    } else if (event === "subscription.resumed") {
      await handleSubscriptionResumed(payload);
    } else if (event === "subscription.cancelled") {
      await handleSubscriptionCancelled(payload);
    } else if (event === "subscription.ended") {
      await handleSubscriptionEnded(payload);
    } else if (event === "subscription.pending") {
      await handleSubscriptionPending(payload);
    } else if (event === "payment.authorized") {
      await handlePaymentAuthorized(payload);
    } else if (event === "payment.captured") {
      await handlePaymentCaptured(payload);
    } else if (event === "payment.failed") {
      await handlePaymentFailed(payload);
    }

    // Mark webhook as processed
    await query(
      "UPDATE webhook_events SET processed=true, processed_at=NOW() WHERE event_id=$1",
      [eventId],
    ).catch(() => {});

    res.json({ status: "ok" });
  } catch (err) {
    logger.error("Webhook handler error:", err);
    next(err);
  }
}

async function handleSubscriptionCreated(payload) {
  try {
    const subscription = payload.subscription;
    const subscriptionId = subscription.id;
    const customerId = subscription.customer_id;
    const status = subscription.status;

    // Get user linked to this customer
    const { rows } = await query(
      "SELECT user_id FROM subscriptions WHERE razorpay_customer_id=$1",
      [customerId],
    );

    if (!rows[0]) {
      logger.warn("No user found for customer:", customerId);
      return;
    }

    const userId = rows[0].user_id;

    // Extract plan type from payload (or use default)
    const planType = payload.notes?.plan_type || "premium";

    await query(
      `UPDATE subscriptions SET
         razorpay_subscription_id=$1, razorpay_customer_id=$2,
         plan=$3, status=$4,
         current_period_start=to_timestamp($5),
         current_period_end=to_timestamp($6),
         cancel_at_period_end=false, updated_at=NOW()
       WHERE user_id=$7`,
      [
        subscriptionId,
        customerId,
        planType,
        status,
        Math.floor(subscription.created_at),
        Math.floor(subscription.expire_by),
        userId,
      ],
    );

    logger.info(
      `Subscription created: ${subscriptionId} → ${planType} for user ${userId}`,
    );
  } catch (err) {
    logger.error("Error handling subscription.created:", err);
  }
}

async function handleSubscriptionActivated(payload) {
  try {
    const subscription = payload.subscription;
    const subscriptionId = subscription.id;

    const { rows } = await query(
      "SELECT user_id FROM subscriptions WHERE razorpay_subscription_id=$1",
      [subscriptionId],
    );

    if (!rows[0]) {
      logger.warn("Subscription not found:", subscriptionId);
      return;
    }

    const userId = rows[0].user_id;
    const planType = payload.notes?.plan_type || "premium";

    await query(
      `UPDATE subscriptions SET
         plan=$1, status='active',
         current_period_start=to_timestamp($2),
         current_period_end=to_timestamp($3),
         cancel_at_period_end=false, updated_at=NOW()
       WHERE razorpay_subscription_id=$4`,
      [
        planType,
        Math.floor(subscription.created_at),
        Math.floor(subscription.expire_by),
        subscriptionId,
      ],
    );

    // Send confirmation email
    const { rows: userRows } = await query(
      "SELECT * FROM users WHERE id = $1",
      [userId],
    );
    if (userRows[0]) {
      emailService
        .sendSubscriptionConfirmEmail(userRows[0], planType)
        .catch(() => {});
    }

    logger.info(`Subscription activated: ${subscriptionId} → active`);
  } catch (err) {
    logger.error("Error handling subscription.activated:", err);
  }
}

async function handleSubscriptionUpdated(payload) {
  try {
    const subscription = payload.subscription;
    const subscriptionId = subscription.id;
    const planType = payload.notes?.plan_type || "premium";

    await query(
      `UPDATE subscriptions SET
         plan=$1, status=$2,
         current_period_start=to_timestamp($3),
         current_period_end=to_timestamp($4),
         updated_at=NOW()
       WHERE razorpay_subscription_id=$5`,
      [
        planType,
        subscription.status,
        Math.floor(subscription.created_at),
        Math.floor(subscription.expire_by),
        subscriptionId,
      ],
    );

    logger.info(
      `Subscription updated: ${subscriptionId} → ${subscription.status}`,
    );
  } catch (err) {
    logger.error("Error handling subscription.updated:", err);
  }
}

async function handleSubscriptionPaused(payload) {
  try {
    const subscriptionId = payload.subscription.id;
    await query(
      `UPDATE subscriptions SET status='paused', updated_at=NOW() 
       WHERE razorpay_subscription_id=$1`,
      [subscriptionId],
    );
    logger.info(`Subscription paused: ${subscriptionId}`);
  } catch (err) {
    logger.error("Error handling subscription.paused:", err);
  }
}

async function handleSubscriptionResumed(payload) {
  try {
    const subscription = payload.subscription;
    const subscriptionId = subscription.id;
    const planType = payload.notes?.plan_type || "premium";

    await query(
      `UPDATE subscriptions SET 
         plan=$1, status='active', 
         current_period_end=to_timestamp($2),
         updated_at=NOW()
       WHERE razorpay_subscription_id=$3`,
      [planType, Math.floor(subscription.expire_by), subscriptionId],
    );
    logger.info(`Subscription resumed: ${subscriptionId}`);
  } catch (err) {
    logger.error("Error handling subscription.resumed:", err);
  }
}

async function handleSubscriptionCancelled(payload) {
  try {
    const subscriptionId = payload.subscription.id;

    await query(
      `UPDATE subscriptions SET
         plan='free', status='cancelled', cancel_at_period_end=false, updated_at=NOW()
       WHERE razorpay_subscription_id=$1`,
      [subscriptionId],
    );

    logger.info(`Subscription cancelled: ${subscriptionId}`);
  } catch (err) {
    logger.error("Error handling subscription.cancelled:", err);
  }
}

async function handleSubscriptionEnded(payload) {
  try {
    const subscriptionId = payload.subscription.id;

    await query(
      `UPDATE subscriptions SET
         plan='free', status='expired', cancel_at_period_end=false, updated_at=NOW()
       WHERE razorpay_subscription_id=$1`,
      [subscriptionId],
    );

    logger.info(`Subscription ended: ${subscriptionId}`);
  } catch (err) {
    logger.error("Error handling subscription.ended:", err);
  }
}

async function handleSubscriptionPending(payload) {
  try {
    const subscription = payload.subscription;
    const subscriptionId = subscription.id;
    const planType = payload.notes?.plan_type || "premium";

    await query(
      `UPDATE subscriptions SET
         plan=$1, status='pending', updated_at=NOW()
       WHERE razorpay_subscription_id=$2`,
      [planType, subscriptionId],
    );

    logger.info(`Subscription pending: ${subscriptionId}`);
  } catch (err) {
    logger.error("Error handling subscription.pending:", err);
  }
}

async function handlePaymentAuthorized(payload) {
  try {
    const payment = payload.payment;
    logger.info(`Payment authorized: ${payment.id}`);
  } catch (err) {
    logger.error("Error handling payment.authorized:", err);
  }
}

async function handlePaymentCaptured(payload) {
  try {
    const payment = payload.payment;
    logger.info(`Payment captured: ${payment.id}`);
  } catch (err) {
    logger.error("Error handling payment.captured:", err);
  }
}

async function handlePaymentFailed(payload) {
  try {
    const payment = payload.payment;
    logger.warn(`Payment failed: ${payment.id} - ${payment.error_description}`);
  } catch (err) {
    logger.error("Error handling payment.failed:", err);
  }
}

module.exports = {
  getSubscription,
  createSubscription,
  cancelSubscription,
  handleWebhook,
};
