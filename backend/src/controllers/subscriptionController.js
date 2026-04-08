const { query } = require("../db/pool");
const lemonsqueezyService = require("../services/lemonsqueezy");
const emailService = require("../services/email");
const logger = require("../utils/logger");

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

    const variantId = lemonsqueezyService.getVariantIdForPlan(planType);

    // Demo mode — no Lemonsqueezy configured
    if (!process.env.LEMONSQUEEZY_API_KEY || !variantId) {
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

    // Create a Lemonsqueezy checkout URL
    const checkoutURL = await lemonsqueezyService.createCheckoutURL(
      req.user.id,
      variantId,
      req.user.email,
      req.user.name,
    );

    // Store pending subscription info (we'll update it when webhook is received)
    await query(
      `UPDATE subscriptions SET
         lemonsqueezy_plan_type=$1, status='pending', payment_provider='lemonsqueezy', updated_at=NOW()
       WHERE user_id=$2`,
      [planType, req.user.id],
    );

    res.json({
      checkoutURL,
      planType,
      amount: planType === "pro" ? 9900 : 19900, // in paise
      currency: "INR",
    });
  } catch (err) {
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

    // Cancel on Lemonsqueezy if linked
    if (sub.lemonsqueezy_subscription_id) {
      await lemonsqueezyService
        .cancelSubscription(sub.lemonsqueezy_subscription_id)
        .catch((err) => {
          logger.warn("Lemonsqueezy cancel failed (non-fatal):", err.message);
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
    const signature = req.headers["x-signature"];
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString()
      : JSON.stringify(req.body);

    if (
      signature &&
      !lemonsqueezyService.verifyWebhookSignature(rawBody, signature)
    ) {
      logger.warn("Invalid webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const parsed = Buffer.isBuffer(req.body) ? JSON.parse(rawBody) : req.body;
    const { meta, data } = parsed;
    const eventType = meta?.event_name;
    const eventId = meta?.custom_data?.event_id || `${eventType}-${Date.now()}`;

    logger.info(`Received Lemonsqueezy webhook: ${eventType}`);

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
      ["lemonsqueezy", eventId, eventType, parsed],
    ).catch(() => {});

    // Handle subscription events
    if (eventType === "subscription_created") {
      await handleSubscriptionCreated(data);
    } else if (eventType === "subscription_updated") {
      await handleSubscriptionUpdated(data);
    } else if (eventType === "subscription_payment_success") {
      await handlePaymentSuccess(data);
    } else if (eventType === "subscription_payment_failed") {
      await handlePaymentFailed(data);
    } else if (eventType === "subscription_cancelled") {
      await handleSubscriptionCancelled(data);
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

async function handleSubscriptionCreated(data) {
  try {
    const attributes = data.attributes;
    const customData = attributes.custom_data || {};
    const userId = customData.customer_id;
    const subscriptionId = data.id;
    const variantId = attributes.variant_id;
    const planType = lemonsqueezyService.getPlanTypeFromVariantId(variantId);

    if (!userId) {
      logger.warn("No customer_id in custom_data:", data);
      return;
    }

    // Update subscription in DB
    await query(
      `UPDATE subscriptions SET
         lemonsqueezy_subscription_id=$1, lemonsqueezy_customer_id=$2,
         lemonsqueezy_plan_type=$3, status='active', plan=$4,
         current_period_start=to_timestamp($5),
         current_period_end=to_timestamp($6),
         cancel_at_period_end=false, updated_at=NOW()
       WHERE user_id=$7`,
      [
        subscriptionId,
        customData.customer_id || "lemonsqueezy_customer",
        planType,
        planType,
        Math.floor(attributes.created_at),
        Math.floor(new Date(attributes.renews_at).getTime() / 1000),
        userId,
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

    logger.info(
      `Subscription created: ${subscriptionId} → ${planType} for user ${userId}`,
    );
  } catch (err) {
    logger.error("Error handling subscription_created:", err);
  }
}

async function handleSubscriptionUpdated(data) {
  try {
    const attributes = data.attributes;
    const subscriptionId = data.id;
    const variantId = attributes.variant_id;
    const planType = lemonsqueezyService.getPlanTypeFromVariantId(variantId);

    await query(
      `UPDATE subscriptions SET
         lemonsqueezy_plan_type=$1, plan=$2,
         current_period_start=to_timestamp($3),
         current_period_end=to_timestamp($4),
         updated_at=NOW()
       WHERE lemonsqueezy_subscription_id=$5`,
      [
        planType,
        planType,
        Math.floor(attributes.created_at),
        Math.floor(new Date(attributes.renews_at).getTime() / 1000),
        subscriptionId,
      ],
    );

    logger.info(`Subscription updated: ${subscriptionId} → ${planType}`);
  } catch (err) {
    logger.error("Error handling subscription_updated:", err);
  }
}

async function handlePaymentSuccess(data) {
  try {
    const subscriptionId = data.relationships?.subscription?.data?.id;

    if (!subscriptionId) {
      logger.warn("No subscription ID in payment_success event");
      return;
    }

    // Update subscription status to active
    await query(
      `UPDATE subscriptions SET
         status='active', cancel_at_period_end=false, updated_at=NOW()
       WHERE lemonsqueezy_subscription_id=$1`,
      [subscriptionId],
    );

    logger.info(`Payment successful for subscription: ${subscriptionId}`);
  } catch (err) {
    logger.error("Error handling subscription_payment_success:", err);
  }
}

async function handlePaymentFailed(data) {
  try {
    const subscriptionId = data.relationships?.subscription?.data?.id;

    if (!subscriptionId) {
      logger.warn("No subscription ID in payment_failed event");
      return;
    }

    logger.warn(`Payment failed for subscription: ${subscriptionId}`);
    // Optionally mark subscription as needs attention
  } catch (err) {
    logger.error("Error handling subscription_payment_failed:", err);
  }
}

async function handleSubscriptionCancelled(data) {
  try {
    const subscriptionId = data.id;
    const attributes = data.attributes;

    let newStatus = "cancelled";
    if (attributes.ended_at) {
      newStatus = "expired";
    }

    await query(
      `UPDATE subscriptions SET
         plan='free', status=$1, cancel_at_period_end=false, updated_at=NOW()
       WHERE lemonsqueezy_subscription_id=$2`,
      [newStatus, subscriptionId],
    );

    logger.info(`Subscription cancelled: ${subscriptionId} → ${newStatus}`);
  } catch (err) {
    logger.error("Error handling subscription_cancelled:", err);
  }
}

module.exports = {
  getSubscription,
  createSubscription,
  cancelSubscription,
  handleWebhook,
};
