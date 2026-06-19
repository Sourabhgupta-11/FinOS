const { query } = require("../../db/pool");
const razorpayService = require("../../services/razorpay");
const logger = require("../../utils/logger");

// Plan amounts in paise (1 INR = 100 paise)
// Base prices
const PLAN_AMOUNTS = {
  pro: 19900, // ₹199 (normal price)
  premium: 39900, // ₹399 (normal price)
};

// Launch pricing (50% off)
const LAUNCH_PRICING = {
  pro: 9900, // ₹99 (50% off)
  premium: 19900, // ₹199 (50% off)
};



/**
 * Determine pricing and eligibility for a plan
 * Returns: { amount, isLaunchFree, isBelowDiscountedPrice, launchPrice }
 */
async function determinePricing(planType) {
  return {
    amount: LAUNCH_PRICING[planType], // Pro ₹99, Premium ₹199
    isLaunchFree: false,
    isBelowDiscountedPrice: true,
    launchPrice: LAUNCH_PRICING[planType],
    discountInfo: {
      originalPrice: PLAN_AMOUNTS[planType],
      discountPercent: 50,
    },
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
     pending_plan=$1,
     payment_provider='razorpay',
     razorpay_order_id=$2,
     launch_price=$3,
     updated_at=NOW()
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
