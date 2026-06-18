const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const { query } = require("../db/pool");
const logger = require("../utils/logger");
const emailService = require("../services/email");
const { sendPushToUser } = require("../services/pushNotification");

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

// ─── Helper: save in-app notification ───────────────────────────────────────
async function saveNotification(userId, title, body, type = "general") {
  try {
    await query(
      "INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, $4)",
      [userId, title, body, type]
    );
  } catch (err) {
    logger.warn("Failed to save notification:", err.message);
  }
}

// ─── Helper: send both push + email notification ─────────────────────────────
async function notifyUser(userId, { title, body, type, emailSubject, emailHtml }) {
  // In-app push notification
  try {
    await sendPushToUser(userId, title, body, { type });
  } catch (err) {
    logger.warn("Push notification failed:", err.message);
    // Still save in-app even if push fails
    await saveNotification(userId, title, body, type);
  }
  // Email (if provided)
  if (emailSubject && emailHtml) {
    const { rows } = await query("SELECT email, name FROM users WHERE id = $1", [userId]);
    if (rows[0]) {
      try {
        await emailService.sendEmail({ to: rows[0].email, subject: emailSubject, html: emailHtml });
      } catch (err) {
        logger.warn("Notification email failed:", err.message);
      }
    }
  }
}

// ─── REGISTER (original — immediate login, used by Google flow) ───────────────
async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email: rawEmail, password, name } = req.body;
    const email = rawEmail.toLowerCase().trim();

    const existing = await query(
      "SELECT id, google_id, password_hash FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );
    if (existing.rows[0]) {
      const eu = existing.rows[0];
      if (eu.google_id && !eu.password_hash) {
        return res.status(409).json({ error: "This email is already registered via Google. Please sign in with Google instead.", code: "EMAIL_GOOGLE_REGISTERED" });
      }
      return res.status(409).json({ error: "This email is already registered. Please sign in instead.", code: "EMAIL_ALREADY_REGISTERED" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      "INSERT INTO users (email, password_hash, name, email_verified) VALUES ($1, $2, $3, true) RETURNING id, email, name",
      [email, passwordHash, name]
    );

    const user = rows[0];
    const token = generateToken(user.id);
    logger.info("New user registered", { userId: user.id, email: user.email });

    // Welcome notification
    await saveNotification(user.id, "Welcome to FinOS! 🎉", `Hi ${name}, your account is ready. Start exploring your financial dashboard.`, "account");

    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "This email is already registered. Please sign in instead.", code: "EMAIL_ALREADY_REGISTERED" });
    }
    next(err);
  }
}

// ─── REGISTER-PENDING (email+password — sends confirmation, no immediate login) ──
async function registerPending(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email: rawEmail, password, name } = req.body;
    const email = rawEmail.toLowerCase().trim();

    const existing = await query(
      "SELECT id, google_id, password_hash, email_verified FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    let userId;

    if (existing.rows[0]) {
      const eu = existing.rows[0];
      if (eu.google_id && !eu.password_hash) {
        return res.status(409).json({ error: "This email is already registered via Google. Please sign in with Google instead.", code: "EMAIL_GOOGLE_REGISTERED" });
      }
      if (eu.email_verified) {
        return res.status(409).json({ error: "This email is already registered and verified. Please sign in instead.", code: "EMAIL_ALREADY_REGISTERED" });
      }
      userId = eu.id;
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      const { rows } = await query(
        "INSERT INTO users (email, password_hash, name, email_verified) VALUES ($1, $2, $3, false) RETURNING id",
        [email, passwordHash, name]
      );
      userId = rows[0].id;
      logger.info("Pending user created", { userId, email });
    }

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO email_verifications (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3`,
      [userId, verifyToken, expires]
    );

    // ── Non-fatal email send ──────────────────────────────────────────────────
    try {
      await emailService.sendVerificationEmail({ email, name }, verifyToken);
      logger.info("Verification email sent", { userId, email });
    } catch (emailErr) {
      logger.error("Verification email failed (non-fatal):", emailErr.message);
      // User + token are saved — they can use resend flow
    }

    res.status(201).json({ message: "Confirmation email sent. Please check your inbox." });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "This email is already registered. Please sign in instead.", code: "EMAIL_ALREADY_REGISTERED" });
    }
    next(err);
  }
}

// ─── RESEND VERIFICATION ─────────────────────────────────────────────────────
async function resendVerification(req, res, next) {
  try {
    const { email: rawEmail } = req.body;
    if (!rawEmail) return res.status(400).json({ error: "Email required" });
    const email = rawEmail.toLowerCase().trim();

    const { rows } = await query(
      "SELECT id, name, email_verified FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );
    if (!rows[0]) return res.status(404).json({ error: "No account found with this email" });
    if (rows[0].email_verified) return res.status(400).json({ error: "Email already verified. Please sign in." });

    const userId = rows[0].id;
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO email_verifications (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3`,
      [userId, verifyToken, expires]
    );

    await emailService.sendVerificationEmail({ email, name: rows[0].name }, verifyToken);
    res.json({ message: "Verification email resent" });
  } catch (err) {
    next(err);
  }
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email: rawEmail, password } = req.body;
    const email = rawEmail.toLowerCase().trim();

    const { rows } = await query(
      "SELECT id, email, name, password_hash, google_id, email_verified FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );
    const user = rows[0];

    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (!user.password_hash) return res.status(401).json({ error: "You registered with Google. Please sign in with Google instead." });

    // Check email verified for email+password registrations
    if (!user.email_verified) {
      return res.status(403).json({ error: "Please verify your email before signing in. Check your inbox for the confirmation link.", code: "EMAIL_NOT_VERIFIED" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken(user.id);
    logger.info("User logged in", { userId: user.id, email });

    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (err) {
    next(err);
  }
}

// ─── GET ME ───────────────────────────────────────────────────────────────────
async function getMe(req, res) {
  const { rows } = await query(
    `SELECT u.id, u.email, u.name, u.password_hash, u.created_at,
     fp.salary, fp.age, fp.risk_level, fp.goal, fp.monthly_expenses
     FROM users u
     LEFT JOIN financial_profiles fp ON fp.user_id = u.id
     WHERE u.id = $1`,
    [req.user.id]
  );
  const user = rows[0];
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    id: user.id, email: user.email, name: user.name,
    has_password: !!user.password_hash, created_at: user.created_at,
    salary: user.salary, age: user.age, risk_level: user.risk_level,
    goal: user.goal, monthly_expenses: user.monthly_expenses,
  });
}

// ─── GET ALL USERS (admin) ────────────────────────────────────────────────────
async function getAllUsers(req, res) {
  try {
    const { rows } = await query(
      `SELECT id, email, name, google_id, password_hash, email_verified, created_at FROM users ORDER BY created_at DESC`
    );
    const sanitized = rows.map((u) => ({
      id: u.id, email: u.email, name: u.name,
      google_id: u.google_id || null, has_password: !!u.password_hash,
      email_verified: u.email_verified, created_at: u.created_at,
    }));
    res.json({ total: sanitized.length, users: sanitized });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

module.exports = { register, registerPending, resendVerification, login, getMe, getAllUsers, notifyUser, saveNotification };