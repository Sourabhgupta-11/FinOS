const { query } = require('../db/pool');

const PLAN_ORDER = { free: 0, pro: 1, premium: 2 };

/**
 * Returns middleware that requires a minimum plan level.
 * Handles missing subscriptions table gracefully (treats as free).
 */
function requirePlan(minPlan) {
  return async (req, res, next) => {
    try {
      const { rows } = await query(
        `SELECT plan, status, current_period_end FROM subscriptions WHERE user_id = $1`,
        [req.user.id]
      );

      const sub = rows[0];
      const rawPlan = sub?.plan || 'free';
      const isActive =
        !sub ||
        sub.status === 'active' ||
        !sub.current_period_end ||
        new Date(sub.current_period_end) > new Date();

      const effectivePlan = isActive ? rawPlan : 'free';
      req.userPlan = effectivePlan;

      if ((PLAN_ORDER[effectivePlan] ?? 0) >= (PLAN_ORDER[minPlan] ?? 0)) {
        return next();
      }

      return res.status(402).json({
        error: `${minPlan.charAt(0).toUpperCase() + minPlan.slice(1)} plan required`,
        code: 'PLAN_REQUIRED',
        requiredPlan: minPlan,
        currentPlan: effectivePlan,
        upgradeUrl: '/subscription',
      });
    } catch (err) {
      // Table doesn't exist yet — treat everyone as free
      if (err.code === '42P01') {
        req.userPlan = 'free';
        if (minPlan === 'free') return next();
        return res.status(402).json({
          error: `${minPlan} plan required`,
          code: 'PLAN_REQUIRED',
          currentPlan: 'free',
        });
      }
      next(err);
    }
  };
}

// Convenience exports
const requireFree    = requirePlan('free');
const requirePro     = requirePlan('pro');
const requirePremium = requirePlan('premium');

module.exports = { requirePlan, requireFree, requirePro, requirePremium };
