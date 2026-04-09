const { query } = require("../../db/pool");
const razorpayService = require("../../services/razorpay");
const emailService = require("../../services/email");
const logger = require("../../utils/logger");

/**
 * POST /api/subscription/verify
 * Called by the frontend immediately after the Razorpay checkout modal
 * fires its success handler with { razorpay_order_id, razorpay_payment_id,
 * razorpay_signature }.
 *
 * Verifies the HMAC signature so we know Razorpay actually collected the
 * payment, then marks the subscription as active in the DB.
 */
async function verifyPayment(req, res, next) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planType,
    } = req.body;

    // Basic field validation
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        error: "Missing payment fields. Expected razorpay_order_id, razorpay_payment_id and razorpay_signature.",
      });
    }

    if (!planType || !["pro", "premium"].includes(planType)) {
      return res.status(400).json({ error: "Invalid or missing planType." });
    }

    // ── Signature verification ─────────────────────────────────────────
    // Razorpay signs: order_id + "|" + payment_id with RAZORPAY_KEY_SECRET
    const isValid = razorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );

    if (!isValid) {
      logger.warn(
        `Invalid payment signature | order=${razorpay_order_id} | user=${req.user.id}`,
      );
      return res.status(400).json({
        error: "Payment signature verification failed. Please contact support@finos.app.",
      });
    }

    // ── Activate subscription ──────────────────────────────────────────
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

    await query(
      `UPDATE subscriptions SET
         plan=$1, status='active',
         current_period_start=$2, current_period_end=$3,
         cancel_at_period_end=false, payment_provider='razorpay',
         razorpay_subscription_id=$4, updated_at=NOW()
       WHERE user_id=$5`,
      [planType, now, periodEnd, razorpay_payment_id, req.user.id],
    );

    // ── Send confirmation email (non-blocking) ─────────────────────────
    const { rows: userRows } = await query(
      "SELECT * FROM users WHERE id = $1",
      [req.user.id],
    );
    if (userRows[0]) {
      emailService
        .sendSubscriptionConfirmEmail(userRows[0], planType)
        .catch((e) => logger.warn("Confirmation email failed (non-fatal):", e.message));
    }

    logger.info(
      `Payment verified & plan activated | plan=${planType} | payment=${razorpay_payment_id} | user=${req.user.id}`,
    );

    return res.json({
      success: true,
      plan: planType,
      message: `${planType.charAt(0).toUpperCase() + planType.slice(1)} plan activated successfully!`,
    });
  } catch (err) {
    logger.error("verify-payment error:", err);
    next(err);
  }
}

module.exports = verifyPayment;
