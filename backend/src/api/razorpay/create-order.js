const { query } = require("../../db/pool");
const razorpayService = require("../../services/razorpay");
const logger = require("../../utils/logger");

// Plan amounts in paise (1 INR = 100 paise)
// Base prices
const PLAN_AMOUNTS = {
  pro: 9900, // ₹99 (normal price)
  premium: 19900, // ₹199 (normal price)
};

// Launch pricing (50% off)
const LAUNCH_PRICING = {
  pro: 4900, // ₹49 (50% off)
  premium: 9900, // ₹99 (50% off)
};

/**
 * Get launch pricing configuration
 */
async function getLaunchConfig() {
  try {
    const result = await query(
      `SELECT config_key, config_value FROM launch_config 
       WHERE config_key IN ('free_tier_limit', 'pro_discounted_limit', 'premium_discounted_limit', 'launch_mode_enabled', 'free_tier_months')`,
    ).catch(() => ({ rows: [] }));

    const config = {
      launchModeEnabled: "false",
      freeTierLimit: 10,
      proDiscountedLimit: 50,
      premiumDiscountedLimit: 50,
      freeTierMonths: 6,
    };

    result.rows.forEach((row) => {
      if (row.config_key === "launch_mode_enabled")
        config.launchModeEnabled = row.config_value;
      if (row.config_key === "free_tier_limit")
        config.freeTierLimit = parseInt(row.config_value, 10);
      if (row.config_key === "pro_discounted_limit")
        config.proDiscountedLimit = parseInt(row.config_value, 10);
      if (row.config_key === "premium_discounted_limit")
        config.premiumDiscountedLimit = parseInt(row.config_value, 10);
      if (row.config_key === "free_tier_months")
        config.freeTierMonths = parseInt(row.config_value, 10);
    });

    return config;
  } catch (err) {
    logger.error("Error fetching launch config:", err);
    return {
      launchModeEnabled: "false",
      freeTierLimit: 10,
      proDiscountedLimit: 50,
      premiumDiscountedLimit: 50,
      freeTierMonths: 6,
    };
  }
}

/**
 * Get subscription counts and determine pricing tier
 */
async function getSubscriptionStats() {
  try {
    const result = await query(`
      SELECT plan, COUNT(*) as count 
      FROM subscriptions 
      WHERE status = 'active'
      GROUP BY plan
    `).catch(() => ({ rows: [] }));

    const counts = {
      free: 0,
      pro: 0,
      premium: 0,
      total: 0,
    };

    result.rows.forEach((row) => {
      if (row.plan === "free") counts.free = parseInt(row.count, 10);
      if (row.plan === "pro") counts.pro = parseInt(row.count, 10);
      if (row.plan === "premium") counts.premium = parseInt(row.count, 10);
    });

    counts.total = counts.free + counts.pro + counts.premium;
    return counts;
  } catch (err) {
    logger.error("Error fetching subscription stats:", err);
    return { free: 0, pro: 0, premium: 0, total: 0 };
  }
}

/**
 * Determine pricing and eligibility for a plan
 * Returns: { amount, isLaunchFree, isBelowDiscountedPrice, launchPrice }
 */
async function determinePricing(planType) {
  const config = await getLaunchConfig();

  if (config.launchModeEnabled !== "true") {
    return {
      amount: PLAN_AMOUNTS[planType],
      isLaunchFree: false,
      isBelowDiscountedPrice: false,
      launchPrice: null,
    };
  }

  const stats = await getSubscriptionStats();
  const totalActive = stats.free + stats.pro + stats.premium;

  // Check if eligible for FREE tier (first N users)
  if (totalActive < config.freeTierLimit) {
    return {
      amount: 0, // FREE
      isLaunchFree: true,
      isBelowDiscountedPrice: false,
      launchPrice: null,
      freeUntilDate: new Date(
        Date.now() + config.freeTierMonths * 30 * 24 * 60 * 60 * 1000,
      ),
    };
  }

  // Check if eligible for DISCOUNTED pricing
  if (planType === "pro" && stats.pro < config.proDiscountedLimit) {
    return {
      amount: LAUNCH_PRICING.pro,
      isLaunchFree: false,
      isBelowDiscountedPrice: true,
      launchPrice: LAUNCH_PRICING.pro,
      discountInfo: { originalPrice: PLAN_AMOUNTS.pro, discountPercent: 50 },
    };
  }

  if (planType === "premium" && stats.premium < config.premiumDiscountedLimit) {
    return {
      amount: LAUNCH_PRICING.premium,
      isLaunchFree: false,
      isBelowDiscountedPrice: true,
      launchPrice: LAUNCH_PRICING.premium,
      discountInfo: {
        originalPrice: PLAN_AMOUNTS.premium,
        discountPercent: 50,
      },
    };
  }

  // Regular pricing
  return {
    amount: PLAN_AMOUNTS[planType],
    isLaunchFree: false,
    isBelowDiscountedPrice: false,
    launchPrice: null,
  };
}

/**
 * POST /api/subscription
 * Creates a Razorpay order and returns the order details needed
 * to open the Razorpay checkout modal on the frontend.
 *
 * If Razorpay keys are not configured, activates in demo mode.
 */
async function createOrder(req, res, next) {
  try {
    const { planType = "premium" } = req.body;

    if (!PLAN_AMOUNTS[planType]) {
      return res
        .status(400)
        .json({ error: "Invalid plan type. Must be 'pro' or 'premium'." });
    }

    // Determine pricing based on launch configuration
    const pricing = await determinePricing(planType);

    // Ensure subscription row exists for this user
    await query(
      `INSERT INTO subscriptions (user_id, plan, status)
       VALUES ($1, 'free', 'active')
       ON CONFLICT (user_id) DO NOTHING`,
      [req.user.id],
    ).catch(() => {});

    // ── DEMO MODE (no Razorpay keys configured) ────────────────────────
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      const now = new Date();
      const end =
        pricing.freeUntilDate ||
        new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await query(
        `UPDATE subscriptions SET
           plan=$1, status='active',
           current_period_start=$2, current_period_end=$3,
           cancel_at_period_end=false, payment_provider='demo',
           is_launch_free=$4, free_until=$5, launch_price=$6, updated_at=NOW()
         WHERE user_id=$7`,
        [
          planType,
          now,
          end,
          pricing.isLaunchFree,
          pricing.freeUntilDate || null,
          pricing.launchPrice,
          req.user.id,
        ],
      );

      logger.info(
        `Demo order activated: ${planType} for user ${req.user.id} (launch_free: ${pricing.isLaunchFree})`,
      );
      return res.json({
        demo: true,
        plan: planType,
        message: `${planType} plan activated (demo mode)${pricing.isLaunchFree ? " - FREE for 6 months" : ""}`,
        pricing,
      });
    }

    // ── LIVE MODE ──────────────────────────────────────────────────────
    // If plan is FREE (launch special), activate directly without payment
    if (pricing.isLaunchFree) {
      const startDate = new Date();
      const endDate = pricing.freeUntilDate;

      await query(
        `UPDATE subscriptions SET
           plan=$1, status='active',
           current_period_start=$2, current_period_end=$3,
           cancel_at_period_end=false, payment_provider='launch',
           is_launch_free=true, free_until=$3, updated_at=NOW()
         WHERE user_id=$4`,
        [planType, startDate, endDate, req.user.id],
      );

      logger.info(
        `Launch free subscription activated: ${planType} for user ${req.user.id} (free until ${endDate})`,
      );
      return res.json({
        success: true,
        plan: planType,
        message:
          "🎉 Congratulations! You're one of the first 10 users. Your subscription is FREE for 6 months!",
        pricing,
        paymentRequired: false,
        isLaunchFree: true,
      });
    }

    // Fetch user details for prefilling checkout form
    const { rows: userRows } = await query(
      "SELECT id, name, email, phone FROM users WHERE id = $1",
      [req.user.id],
    );
    const user = userRows[0];
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Create Razorpay order
    const receipt = `fn_${planType}_${Date.now().toString().slice(-10)}`;
    const order = await razorpayService.createOrder(
      pricing.amount,
      "INR",
      receipt,
      {
        plan_type: planType,
        user_id: String(req.user.id),
        launch_pricing: pricing.isBelowDiscountedPrice,
      },
    );

    // Persist pending order so webhook / verify can find it
    await query(
      `UPDATE subscriptions SET
         plan=$1, status='pending', payment_provider='razorpay',
         razorpay_subscription_id=$2, launch_price=$3, updated_at=NOW()
       WHERE user_id=$4`,
      [planType, order.id, pricing.launchPrice, req.user.id],
    );

    logger.info(
      `Razorpay order created: ${order.id} | plan=${planType} | user=${req.user.id} | pricing=${pricing.isBelowDiscountedPrice ? "discounted" : "regular"}`,
    );

    // Return everything the frontend Razorpay modal needs
    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      planType,
      userName: user.name || "Valued Customer",
      userEmail: user.email,
      userPhone: user.phone || "",
      pricing,
    });
  } catch (err) {
    logger.error("create-order error:", err);
    next(err);
  }
}

module.exports = createOrder;
