const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { query } = require("../db/pool");
const logger = require("../utils/logger");

// GET /api/auth/me  (already exists in authController)

// PUT /api/auth/profile  - update name or email
router.put("/profile", async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const sets = [];
    const params = [];
    let i = 1;

    if (name?.trim()) {
      sets.push(`name = $${i++}`);
      params.push(name.trim());
    }
    if (email?.trim()) {
      const exists = await query(
        "SELECT id FROM users WHERE email = $1 AND id != $2",
        [email.trim(), req.user.id],
      );
      if (exists.rows[0])
        return res.status(409).json({ error: "Email already in use" });
      sets.push(`email = $${i++}`, `email_verified = false`);
      params.push(email.trim());
    }

    if (sets.length === 0)
      return res.status(400).json({ error: "Nothing to update" });
    params.push(req.user.id);

    const { rows } = await query(
      `UPDATE users SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${i} RETURNING id, name, email`,
      params,
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/password/set - SET initial password (for Google-only users)
router.put("/password/set", async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!newPassword || typeof newPassword !== "string") {
      return res.status(400).json({ error: "Password is required" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    // Check if user already has a password
    const { rows: userRows } = await query(
      "SELECT id, password_hash FROM users WHERE id = $1",
      [userId],
    );

    if (!userRows[0]) {
      logger.error("User not found for password set", { userId });
      return res.status(404).json({ error: "User not found" });
    }

    // If they already have a password, they should use /change endpoint
    if (userRows[0].password_hash) {
      logger.warn("User tried to use /set endpoint but already has password", {
        userId,
      });
      return res.status(400).json({
        error:
          "You already have a password. Use the change password option instead.",
      });
    }

    // Hash and save the new password
    const hash = await bcrypt.hash(newPassword, 12);
    const updateResult = await query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email",
      [hash, userId],
    );

    if (updateResult.rowCount === 0) {
      logger.error("Failed to set password_hash", { userId });
      return res
        .status(500)
        .json({ error: "Failed to set password. Please try again." });
    }

    logger.info("Password set successfully for user", {
      userId,
      email: updateResult.rows[0].email,
    });
    res.json({ message: "Password set successfully" });
  } catch (err) {
    logger.error("Error in password/set endpoint", {
      error: err.message,
      userId: req.user.id,
    });
    next(err);
  }
});

// PUT /api/auth/password/change - CHANGE existing password
router.put("/password/change", async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validate inputs
    if (!currentPassword || typeof currentPassword !== "string") {
      return res.status(400).json({ error: "Current password is required" });
    }

    if (!newPassword || typeof newPassword !== "string") {
      return res.status(400).json({ error: "New password is required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "New password must be at least 8 characters",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: "New password must be different from current password",
      });
    }

    // Get current password hash
    const { rows: userRows } = await query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId],
    );

    if (!userRows[0]) {
      logger.error("User not found for password change", { userId });
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has a password (for Google-only users)
    if (!userRows[0].password_hash) {
      logger.info(
        "Google-only user tried to change password without setting one first",
        {
          userId,
        },
      );
      return res.status(400).json({
        error: "You haven't set a password yet. Please set one first.",
        hasPassword: false,
      });
    }

    // Verify current password
    const isValid = await bcrypt.compare(
      currentPassword,
      userRows[0].password_hash,
    );
    if (!isValid) {
      logger.warn("Incorrect current password for password change", { userId });
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash and save new password
    const hash = await bcrypt.hash(newPassword, 12);
    const updateResult = await query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email",
      [hash, userId],
    );

    if (updateResult.rowCount === 0) {
      logger.error("Failed to update password_hash", { userId });
      return res
        .status(500)
        .json({ error: "Failed to change password. Please try again." });
    }

    logger.info("Password changed successfully", {
      userId,
      email: updateResult.rows[0].email,
    });
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    logger.error("Error in password/change endpoint", {
      error: err.message,
      userId: req.user.id,
    });
    next(err);
  }
});

// Legacy endpoint - kept for backward compatibility but redirects to /change
router.put("/password", async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: "Both fields required" });
    if (newPassword.length < 8)
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });

    const { rows } = await query(
      "SELECT password_hash FROM users WHERE id = $1",
      [req.user.id],
    );

    // Check if user has password
    if (!rows[0].password_hash) {
      return res.status(400).json({
        error: "You haven't set a password yet. Please set one first.",
        hasPassword: false,
      });
    }

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid)
      return res.status(401).json({ error: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, 12);
    await query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [hash, req.user.id],
    );
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/account
router.delete("/account", async (req, res, next) => {
  try {
    // Delete user and cascade delete all related records
    // Foreign key constraints with ON DELETE CASCADE will handle related data
    const { rows } = await query(
      "DELETE FROM users WHERE id = $1 RETURNING id, email",
      [req.user.id],
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    res
      .status(200)
      .json({ message: "Account deleted successfully", user: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
