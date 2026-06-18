const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { query, getClient } = require("../db/pool");
const emailService = require("../services/email");
const { sendPushToUser } = require("../services/pushNotification");
const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");

function generateJWT(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

function generateToken() {
  let token=crypto.randomBytes(32).toString("hex");
  return token;
}

// ─── Helper: in-app notification ─────────────────────────────────────────────
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

// ─── Helper: push + in-app ────────────────────────────────────────────────────
async function pushAndSave(userId, title, body, type) {
  try {
    await sendPushToUser(userId, title, body, { type });
  } catch {
    await saveNotification(userId, title, body, type);
  }
}

async function sendVerification(req, res, next) {  //it only genrate and store token in database used for verification, and after it send verification email(dont verify email but only send verification email) 
  try {
    const user = req.user;
    if (user.email_verified) return res.json({ message: "Email already verified" });

    const token = generateToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO email_verifications (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [user.id, token, expires]
    );

    await emailService.sendVerificationEmail(user, token);
    res.json({ message: "Verification email sent" });
  } catch (err) { next(err); }
}

//after sendVerification when user click verification link -> the below function will be called to verify user email
async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;
    const { rows } = await query(
      `SELECT ev.*, u.id as uid, u.name, u.email FROM email_verifications ev
       JOIN users u ON u.id = ev.user_id
       WHERE ev.token = $1 AND ev.used_at IS NULL AND ev.expires_at > NOW()`,
      [token]
    );

    if (!rows[0]) return res.status(400).json({ error: "Invalid or expired token" });

    await query("UPDATE users SET email_verified = true WHERE id = $1", [rows[0].uid]);
    await query("UPDATE email_verifications SET used_at = NOW() WHERE token = $1", [token]);

    // Welcome notification (in-app + email)
    await pushAndSave(rows[0].uid, "Welcome to FinOS! 🎉", `Hi ${rows[0].name}, your account is now fully active.`, "account");
    await emailService.sendWelcomeEmail({ email: rows[0].email, name: rows[0].name }).catch(() => {});

    const jwtToken = generateJWT(rows[0].uid);
    logger.info("Email verified + welcome notifications sent", { userId: rows[0].uid });
    res.json({ 
      message: "Email verified successfully",
      token: jwtToken,
      user: { id: rows[0].uid, email: rows[0].email, name: rows[0].name }
    });
  } catch (err) { next(err); }
}

async function forgotPassword(req, res, next) {
  try {
    const { email: rawEmail } = req.body;
    const email = rawEmail.toLowerCase().trim();

    const { rows } = await query(
      "SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (rows[0]) {
      const token = generateToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

      await query(
        `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [rows[0].id, token, expires]
      );

      try {
  logger.info(`RESET EMAIL START ${email}`);
  await emailService.sendPasswordResetEmail(rows[0], token);
  logger.info(`RESET EMAIL SUCCESS ${email}`);
} catch (err) {
  logger.error("RESET EMAIL FAILED", {
    email,
    error: err.message,
    stack: err.stack,
  });
}
      logger.info(`Password reset requested for ${email}`);
    } else {
      logger.info(`Password reset requested for non-existent email: ${email}`);
    }

    res.json({ message: "If an account exists, a reset link has been sent" });
  } catch (err) { next(err); }
}

async function resetPassword(req, res, next) {
  let client;
  try {
    const { token, password } = req.body;

    if (!token || typeof token !== "string") return res.status(400).json({ error: "Invalid reset token format" });
    const tokenStr = token.trim();
    if (tokenStr.length === 0 || tokenStr.length > 500) return res.status(400).json({ error: "Invalid reset token" });
    if (!password || typeof password !== "string") return res.status(400).json({ error: "New password is required" });

    const trimmedPassword = password.trim();
    if (trimmedPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

    client = await getClient();
    await client.query("BEGIN");

    const resetTokenResult = await client.query(
      `SELECT id, user_id FROM password_resets
       WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [tokenStr]
    );

    if (resetTokenResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Password reset link has expired or is invalid. Please request a new one." });
    }

    const resetTokenId = resetTokenResult.rows[0].id;
    const userId = resetTokenResult.rows[0].user_id;

    const userResult = await client.query("SELECT id, email, name FROM users WHERE id = $1", [userId]);
    if (userResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(500).json({ error: "Password reset failed. User account not found." });
    }

    const user = userResult.rows[0];
    const hash = await bcrypt.hash(trimmedPassword, 12);

    const updateResult = await client.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id",
      [hash, userId]
    );
    if (updateResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(500).json({ error: "Failed to update password. Please try again." });
    }

    const markResult = await client.query(
      "UPDATE password_resets SET used_at = NOW() WHERE id = $1 RETURNING id",
      [resetTokenId]
    );
    if (markResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(500).json({ error: "Failed to complete password reset. Please try again." });
    }

    await client.query("COMMIT");

    // Notify: password changed (in-app + email)
    await pushAndSave(userId, "Password changed 🔐", "Your FinOS password was successfully changed. If this wasn't you, contact support immediately.", "security");
    await emailService.sendPasswordChangedEmail(user).catch(() => {});

    logger.info("Password reset completed", { userId, email: user.email });
    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch { }
    }
    logger.error("Unexpected error in resetPassword", { error: err.message });
    next(err);
  } finally {
    if (client) client.release();
  }
}

module.exports = { sendVerification, verifyEmail, forgotPassword, resetPassword };