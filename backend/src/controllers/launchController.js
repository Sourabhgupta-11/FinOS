const { query } = require("../db/pool");
const emailService = require("../services/email");
const logger = require("../utils/logger");

// ── GET /api/launch/stats ──────────────────────────────────────────────────
// Get launch pricing configuration and current subscription counts
async function getLaunchStats(req, res, next) {
  try {
    // Get launch config
    const configRes = await query(
      `SELECT config_key, config_value FROM launch_config 
       WHERE config_key IN ('free_tier_limit', 'pro_discounted_limit', 'premium_discounted_limit', 'launch_mode_enabled')`,
    ).catch(() => ({ rows: [] }));

    const config = {};
    configRes.rows.forEach((row) => {
      config[row.config_key] = row.config_value;
    });

    // Count active subscriptions by plan type
    const countRes = await query(`
      SELECT plan, COUNT(*) as count 
      FROM subscriptions 
      WHERE plan IN ('free', 'pro', 'premium') AND status = 'active'
      GROUP BY plan
    `).catch(() => ({ rows: [] }));

    const counts = {
      free: 0,
      pro: 0,
      premium: 0,
    };

    countRes.rows.forEach((row) => {
      counts[row.plan] = parseInt(row.count, 10);
    });

    // Calculate remaining seats
    const freeTierLimit = parseInt(config.free_tier_limit || "10", 10);
    const proLimit = parseInt(config.pro_discounted_limit || "50", 10);
    const premiumLimit = parseInt(config.premium_discounted_limit || "50", 10);

    return res.json({
      launchMode: config.launch_mode_enabled === "true",
      limits: {
        freeTierLimit,
        proDiscountedLimit: proLimit,
        premiumDiscountedLimit: premiumLimit,
      },
      current: counts,
      remaining: {
        freeTier: Math.max(
          0,
          freeTierLimit - counts.free - counts.pro - counts.premium,
        ),
        pro: Math.max(0, proLimit - counts.pro),
        premium: Math.max(0, premiumLimit - counts.premium),
      },
      percentageUsed: {
        freeTier: Math.min(
          100,
          Math.round(
            ((counts.free + counts.pro + counts.premium) / freeTierLimit) * 100,
          ),
        ),
        pro: Math.min(100, Math.round((counts.pro / proLimit) * 100)),
        premium: Math.min(
          100,
          Math.round((counts.premium / premiumLimit) * 100),
        ),
      },
    });
  } catch (err) {
    logger.error("getLaunchStats error:", err);
    next(err);
  }
}

// ── GET /api/waitlist/count ────────────────────────────────────────────────
// Get current waitlist count
async function getWaitlistCount(req, res, next) {
  try {
    const { rows } = await query(
      "SELECT COUNT(*) as count FROM waitlist",
    ).catch(() => ({ rows: [{ count: 0 }] }));

    return res.json({
      count: parseInt(rows[0]?.count || "0", 10),
    });
  } catch (err) {
    logger.error("getWaitlistCount error:", err);
    next(err);
  }
}

// ── POST /api/waitlist ─────────────────────────────────────────────────────
// Join the waitlist
async function joinWaitlist(req, res, next) {
  try {
    const { email, name } = req.body;

    // Validate email
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    // Check if already in waitlist
    const existingRes = await query(
      "SELECT id FROM waitlist WHERE email = $1",
      [email.toLowerCase()],
    ).catch(() => ({ rows: [] }));

    if (existingRes.rows[0]) {
      return res.status(409).json({
        error: "Email already on waitlist",
        message:
          "You're already on our waitlist! We'll notify you when FinOS launches.",
        alreadyJoined: true,
      });
    }

    // Add to waitlist
    const insertRes = await query(
      `INSERT INTO waitlist (email, name) VALUES ($1, $2)
       RETURNING id, created_at`,
      [email.toLowerCase(), name || ""],
    ).catch((err) => {
      logger.error("Waitlist insert error:", err);
      throw err;
    });

    // Get current waitlist position
    const positionRes = await query(
      `SELECT COUNT(*) as position FROM waitlist 
       WHERE created_at <= (SELECT created_at FROM waitlist WHERE id = $1)`,
      [insertRes.rows[0].id],
    ).catch(() => ({ rows: [{ position: 1 }] }));

    // Send confirmation email
    try {
      await emailService.sendWaitlistConfirmationEmail(email, name || "User");
    } catch (emailErr) {
      logger.warn("Failed to send waitlist confirmation email:", emailErr);
    }

    return res.status(201).json({
      message: "Successfully joined the waitlist!",
      position: parseInt(positionRes.rows[0]?.position || "1", 10),
      email: email,
    });
  } catch (err) {
    logger.error("joinWaitlist error:", err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email already exists" });
    }
    next(err);
  }
}

// ── GET /api/waitlist/check ────────────────────────────────────────────────
// Check if email is on waitlist
async function checkWaitlist(req, res, next) {
  try {
    const { email } = req.query;

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    const { rows } = await query(
      `SELECT id, created_at FROM waitlist WHERE email = $1`,
      [email.toLowerCase()],
    ).catch(() => ({ rows: [] }));

    if (!rows[0]) {
      return res.json({ onWaitlist: false });
    }

    // Get position
    const posRes = await query(
      `SELECT COUNT(*) as position FROM waitlist 
       WHERE created_at <= $1`,
      [rows[0].created_at],
    ).catch(() => ({ rows: [{ position: 0 }] }));

    return res.json({
      onWaitlist: true,
      joinedAt: rows[0].created_at,
      position: parseInt(posRes.rows[0]?.position || "1", 10),
    });
  } catch (err) {
    logger.error("checkWaitlist error:", err);
    next(err);
  }
}

module.exports = {
  getLaunchStats,
  getWaitlistCount,
  joinWaitlist,
  checkWaitlist,
};
