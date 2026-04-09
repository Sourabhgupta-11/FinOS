const { query } = require("../../db/pool");
const razorpayService = require("../../services/razorpay");
const logger = require("../../utils/logger");

// Plan amounts in paise (1 INR = 100 paise)
const PLAN_AMOUNTS = {
  pro: 9900,      // ₹99
  premium: 19900, // ₹199
};

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
      return res.status(400).json({ error: "Invalid plan type. Must be 'pro' or 'premium'." });
    }

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
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await query(
        `UPDATE subscriptions SET
           plan=$1, status='active',
           current_period_start=$2, current_period_end=$3,
           cancel_at_period_end=false, payment_provider='demo', updated_at=NOW()
         WHERE user_id=$4`,
        [planType, now, end, req.user.id],
      );

      logger.info(`Demo order activated: ${planType} for user ${req.user.id}`);
      return res.json({
        demo: true,
        plan: planType,
        message: `${planType} plan activated (demo mode)`,
      });
    }

    // ── LIVE MODE ──────────────────────────────────────────────────────
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
    const receipt = `finos_${planType}_${req.user.id}_${Date.now()}`;
    const order = await razorpayService.createOrder(
      PLAN_AMOUNTS[planType],
      "INR",
      receipt,
      { plan_type: planType, user_id: String(req.user.id) },
    );

    // Persist pending order so webhook / verify can find it
    await query(
      `UPDATE subscriptions SET
         plan=$1, status='pending', payment_provider='razorpay',
         razorpay_subscription_id=$2, updated_at=NOW()
       WHERE user_id=$3`,
      [planType, order.id, req.user.id],
    );

    logger.info(`Razorpay order created: ${order.id} | plan=${planType} | user=${req.user.id}`);

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
    });
  } catch (err) {
    logger.error("create-order error:", err);
    next(err);
  }
}

module.exports = createOrder;
