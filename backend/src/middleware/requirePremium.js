const { query } = require('../db/pool');

async function requirePremium(req, res, next) {
  const { rows } = await query(
    `SELECT plan, status, current_period_end
     FROM subscriptions WHERE user_id = $1`,
    [req.user.id]
  );

  const sub = rows[0];
  const isPremium =
    sub &&
    sub.plan === 'premium' &&
    sub.status === 'active' &&
    (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

  if (!isPremium) {
    return res.status(402).json({
      error: 'Premium subscription required',
      code: 'PREMIUM_REQUIRED',
      upgradeUrl: '/subscription',
    });
  }
  next();
}

module.exports = { requirePremium };
