const { query } = require("../../db/pool");
const razorpayService = require("../../services/razorpay");
const logger = require("../../utils/logger");

/**
 * DELETE /api/subscription
 * Marks the subscription to cancel at end of the current billing period.
 * The user keeps access until current_period_end, then drops to Free.
 *
 * If a razorpay_subscription_id exists we also cancel it on Razorpay's side
 * (at cycle end) so no further charges occur.
 */
async function cancelSubscription(req, res, next) {
  try {
    // Ensure a row exists (safety net)
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
    const sub = rows[0];

    if (!sub || sub.plan === "free") {
      return res.status(400).json({ error: "No active paid subscription found." });
    }

    if (sub.cancel_at_period_end) {
      return res.status(400).json({ error: "Subscription is already set to cancel." });
    }

    // ── Notify Razorpay (non-blocking — don't fail the request if this errors) ──
    if (sub.razorpay_subscription_id && sub.payment_provider === "razorpay") {
      await razorpayService
        .cancelSubscription(sub.razorpay_subscription_id)
        .catch((err) =>
          logger.warn(`Razorpay cancel call failed (non-fatal): ${err.message}`),
        );
    }

    // ── Mark cancel_at_period_end in DB ────────────────────────────────
    await query(
      `UPDATE subscriptions
       SET cancel_at_period_end=true, updated_at=NOW()
       WHERE user_id=$1`,
      [req.user.id],
    );

    logger.info(`Subscription set to cancel at period end | user=${req.user.id}`);

    return res.json({
      success: true,
      message: "Subscription will cancel at the end of the current billing period.",
    });
  } catch (err) {
    logger.error("cancel-subscription error:", err);
    next(err);
  }
}

module.exports = cancelSubscription;
