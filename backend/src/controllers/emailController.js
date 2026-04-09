const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { query, getClient } = require("../db/pool");
const emailService = require("../services/email");
const logger = require("../utils/logger");

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function sendVerification(req, res, next) {
  try {
    const user = req.user;
    if (user.email_verified)
      return res.json({ message: "Email already verified" });

    const token = generateToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await query(
      `INSERT INTO email_verifications (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [user.id, token, expires],
    );

    await emailService.sendVerificationEmail(user, token);
    res.json({ message: "Verification email sent" });
  } catch (err) {
    next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;
    const { rows } = await query(
      `SELECT ev.*, u.id as uid FROM email_verifications ev
       JOIN users u ON u.id = ev.user_id
       WHERE ev.token = $1 AND ev.used_at IS NULL AND ev.expires_at > NOW()`,
      [token],
    );

    if (!rows[0])
      return res.status(400).json({ error: "Invalid or expired token" });

    await query("UPDATE users SET email_verified = true WHERE id = $1", [
      rows[0].uid,
    ]);
    await query(
      "UPDATE email_verifications SET used_at = NOW() WHERE token = $1",
      [token],
    );

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email: rawEmail } = req.body;

    // Normalize email: lowercase and trim
    const email = rawEmail.toLowerCase().trim();

    const { rows } = await query(
      "SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)",
      [email],
    );

    // Always return success to prevent email enumeration
    if (rows[0]) {
      const token = generateToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

      await query(
        `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [rows[0].id, token, expires],
      );

      await emailService
        .sendPasswordResetEmail(rows[0], token)
        .catch((emailErr) => {
          logger.error("Failed to send password reset email", {
            email,
            error: emailErr.message,
          });
        });
      logger.info(`Password reset requested for ${email}`);
    } else {
      logger.info(`Password reset requested for non-existent email: ${email}`);
    }

    res.json({ message: "If an account exists, a reset link has been sent" });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  let client;
  try {
    const { token, password } = req.body;

    console.log(
      "🔄 RESET PASSWORD REQUEST - token length:",
      token?.length,
      "password length:",
      password?.length,
    );

    // Strict input validation
    if (!token || typeof token !== "string") {
      logger.warn("Reset password called without valid token");
      console.log("❌ Invalid token format");
      return res.status(400).json({ error: "Invalid reset token format" });
    }

    const tokenStr = token.trim();
    if (tokenStr.length === 0 || tokenStr.length > 500) {
      logger.warn("Reset password called with suspiciously formatted token", {
        tokenLength: tokenStr.length,
      });
      console.log("❌ Token length invalid:", tokenStr.length);
      return res.status(400).json({ error: "Invalid reset token" });
    }

    if (!password || typeof password !== "string") {
      logger.warn("Reset password called without valid password");
      console.log("❌ No password provided");
      return res.status(400).json({ error: "New password is required" });
    }

    if (password.length < 8) {
      console.log("❌ Password too short:", password.length);
      return res.status(400).json({
        error: "Password must be at least 8 characters",
      });
    }

    // Trim whitespace from password
    const trimmedPassword = password.trim();
    if (trimmedPassword.length < 8) {
      console.log("❌ Trimmed password too short:", trimmedPassword.length);
      return res.status(400).json({
        error: "Password must be at least 8 characters (no just spaces)",
      });
    }

    // Get client for transaction
    client = await getClient();
    console.log("✓ Got database client for transaction");

    // Start transaction
    await client.query("BEGIN");
    console.log("✓ Transaction started");

    // Find valid reset token with FOR UPDATE to lock it
    const resetTokenResult = await client.query(
      `SELECT id, user_id FROM password_resets
       WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [tokenStr],
    );

    console.log(
      "🔍 Token lookup result - rowCount:",
      resetTokenResult.rowCount,
    );

    if (resetTokenResult.rowCount === 0) {
      await client.query("ROLLBACK");
      logger.warn("Password reset attempted with invalid/expired token", {
        tokenStart: tokenStr.substring(0, 8),
      });
      console.log("❌ Token not found or expired");
      return res.status(400).json({
        error:
          "Password reset link has expired or is invalid. Please request a new one.",
      });
    }

    const resetTokenId = resetTokenResult.rows[0].id;
    const userId = resetTokenResult.rows[0].user_id;

    console.log("✓ Token found - user_id:", userId);

    if (!userId) {
      await client.query("ROLLBACK");
      logger.error("Password reset token has no associated user_id", {
        token: tokenStr.substring(0, 8),
      });
      console.log("❌ No user_id associated with token");
      return res.status(500).json({
        error: "Password reset failed. Please try again.",
      });
    }

    // Verify user exists and get their current info
    const userResult = await client.query(
      "SELECT id, email FROM users WHERE id = $1",
      [userId],
    );

    console.log("🔍 User lookup - found:", userResult.rowCount);

    if (userResult.rowCount === 0) {
      await client.query("ROLLBACK");
      logger.error("User not found for password reset", { userId });
      console.log("❌ User not found for user_id:", userId);
      return res.status(500).json({
        error: "Password reset failed. User account not found.",
      });
    }

    const userEmail = userResult.rows[0].email;
    console.log("✓ User found - email:", userEmail);

    // Hash the new password
    let hash;
    try {
      hash = await bcrypt.hash(trimmedPassword, 12);
      console.log(
        "✓ Password hashed successfully - hash starts with:",
        hash.substring(0, 20),
      );
      logger.debug("Password hashed successfully for reset", { userId });
    } catch (hashErr) {
      await client.query("ROLLBACK");
      logger.error("Failed to hash password during reset", {
        userId,
        error: hashErr.message,
      });
      console.log("❌ Failed to hash password:", hashErr.message);
      return res.status(500).json({
        error: "Failed to process password reset. Please try again.",
      });
    }

    // Update user's password
    const updateUserResult = await client.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id",
      [hash, userId],
    );

    console.log("📝 Password update - rowCount:", updateUserResult.rowCount);

    if (updateUserResult.rowCount === 0) {
      await client.query("ROLLBACK");
      logger.error("Failed to update password_hash for user", { userId });
      console.log("❌ Failed to update user password for user_id:", userId);
      return res.status(500).json({
        error: "Failed to update password. Please try again.",
      });
    }

    // Mark reset token as used
    const markUsedResult = await client.query(
      "UPDATE password_resets SET used_at = NOW() WHERE id = $1 RETURNING id",
      [resetTokenId],
    );

    console.log("✓ Token marked as used - rowCount:", markUsedResult.rowCount);

    if (markUsedResult.rowCount === 0) {
      await client.query("ROLLBACK");
      logger.error("Failed to mark reset token as used", {
        tokenId: resetTokenId,
        userId,
      });
      console.log("❌ Failed to mark token as used");
      return res.status(500).json({
        error: "Failed to complete password reset. Please try again.",
      });
    }

    // Commit transaction
    await client.query("COMMIT");
    console.log(
      "✅ Transaction committed - password reset complete for user:",
      userId,
      "email:",
      userEmail,
    );

    logger.info("Password reset completed successfully", {
      userId,
      email: userEmail,
    });

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    // Rollback in case of error
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackErr) {
        logger.error("Failed to rollback transaction", {
          error: rollbackErr.message,
        });
      }
    }

    logger.error("Unexpected error in resetPassword", {
      error: err.message,
      stack: err.stack,
      name: err.name,
    });
    next(err);
  } finally {
    if (client) {
      client.release();
    }
  }
}

module.exports = {
  sendVerification,
  verifyEmail,
  forgotPassword,
  resetPassword,
};
