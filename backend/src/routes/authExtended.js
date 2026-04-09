const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { query } = require("../db/pool");
const logger = require("../utils/logger");
const emailService = require("../services/email");
const { sendPushToUser } = require("../services/pushNotification");

async function pushAndSave(userId, title, body, type) {
  try {
    await sendPushToUser(userId, title, body, { type });
  } catch {
    try {
      await query("INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, $4)", [userId, title, body, type]);
    } catch { }
  }
}

// PUT /api/auth/profile
router.put("/profile", async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const sets = [], params = [];
    let i = 1;

    if (name?.trim()) { sets.push(`name = $${i++}`); params.push(name.trim()); }
    if (email?.trim()) {
      const exists = await query("SELECT id FROM users WHERE email = $1 AND id != $2", [email.trim(), req.user.id]);
      if (exists.rows[0]) return res.status(409).json({ error: "Email already in use" });
      sets.push(`email = $${i++}`, `email_verified = false`);
      params.push(email.trim());
    }

    if (sets.length === 0) return res.status(400).json({ error: "Nothing to update" });
    params.push(req.user.id);

    const { rows } = await query(
      `UPDATE users SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${i} RETURNING id, name, email`,
      params
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/auth/password/set — set initial password (Google-only users)
router.put("/password/set", async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id;

    if (!newPassword || typeof newPassword !== "string") return res.status(400).json({ error: "Password is required" });
    if (newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

    const { rows: userRows } = await query("SELECT id, email, name, password_hash FROM users WHERE id = $1", [userId]);
    if (!userRows[0]) return res.status(404).json({ error: "User not found" });
    if (userRows[0].password_hash) return res.status(400).json({ error: "You already have a password. Use the change password option instead." });

    const hash = await bcrypt.hash(newPassword, 12);
    const updateResult = await query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email",
      [hash, userId]
    );
    if (updateResult.rowCount === 0) return res.status(500).json({ error: "Failed to set password. Please try again." });

    // Notify: password set
    await pushAndSave(userId, "Password set 🔐", "A password has been set for your FinOS account. You can now sign in with email & password.", "security");
    await emailService.sendPasswordChangedEmail({ email: userRows[0].email, name: userRows[0].name }).catch(() => {});

    logger.info("Password set successfully", { userId, email: updateResult.rows[0].email });
    res.json({ message: "Password set successfully" });
  } catch (err) {
    logger.error("Error in password/set", { error: err.message, userId: req.user.id });
    next(err);
  }
});

// PUT /api/auth/password/change — change existing password
router.put("/password/change", async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || typeof currentPassword !== "string") return res.status(400).json({ error: "Current password is required" });
    if (!newPassword || typeof newPassword !== "string") return res.status(400).json({ error: "New password is required" });
    if (newPassword.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters" });
    if (currentPassword === newPassword) return res.status(400).json({ error: "New password must be different from current password" });

    const { rows: userRows } = await query("SELECT email, name, password_hash FROM users WHERE id = $1", [userId]);
    if (!userRows[0]) return res.status(404).json({ error: "User not found" });
    if (!userRows[0].password_hash) return res.status(400).json({ error: "You haven't set a password yet. Please set one first.", hasPassword: false });

    const isValid = await bcrypt.compare(currentPassword, userRows[0].password_hash);
    if (!isValid) return res.status(401).json({ error: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, 12);
    const updateResult = await query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email",
      [hash, userId]
    );
    if (updateResult.rowCount === 0) return res.status(500).json({ error: "Failed to change password. Please try again." });

    // Notify: password changed (in-app + email)
    await pushAndSave(userId, "Password changed 🔐", "Your FinOS password was successfully updated. If this wasn't you, contact support immediately.", "security");
    await emailService.sendPasswordChangedEmail({ email: userRows[0].email, name: userRows[0].name }).catch(() => {});

    logger.info("Password changed successfully", { userId, email: updateResult.rows[0].email });
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    logger.error("Error in password/change", { error: err.message, userId: req.user.id });
    next(err);
  }
});

// Legacy PUT /api/auth/password
router.put("/password", async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Both fields required" });
    if (newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

    const { rows } = await query("SELECT email, name, password_hash FROM users WHERE id = $1", [req.user.id]);
    if (!rows[0].password_hash) return res.status(400).json({ error: "You haven't set a password yet. Please set one first.", hasPassword: false });

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, 12);
    await query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [hash, req.user.id]);

    // Notify
    await pushAndSave(req.user.id, "Password changed 🔐", "Your FinOS password was updated successfully.", "security");
    await emailService.sendPasswordChangedEmail({ email: rows[0].email, name: rows[0].name }).catch(() => {});

    res.json({ message: "Password changed successfully" });
  } catch (err) { next(err); }
});

// DELETE /api/auth/account
router.delete("/account", async (req, res, next) => {
  try {
    const { rows } = await query("DELETE FROM users WHERE id = $1 RETURNING id, email", [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ message: "Account deleted successfully", user: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;