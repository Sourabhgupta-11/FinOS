const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const emailService = require('../services/email');
const logger = require('../utils/logger');

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function sendVerification(req, res, next) {
  try {
    const user = req.user;
    if (user.email_verified) return res.json({ message: 'Email already verified' });

    const token = generateToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await query(
      `INSERT INTO email_verifications (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [user.id, token, expires]
    );

    await emailService.sendVerificationEmail(user, token);
    res.json({ message: 'Verification email sent' });
  } catch (err) { next(err); }
}

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;
    const { rows } = await query(
      `SELECT ev.*, u.id as uid FROM email_verifications ev
       JOIN users u ON u.id = ev.user_id
       WHERE ev.token = $1 AND ev.used_at IS NULL AND ev.expires_at > NOW()`,
      [token]
    );

    if (!rows[0]) return res.status(400).json({ error: 'Invalid or expired token' });

    await query('UPDATE users SET email_verified = true WHERE id = $1', [rows[0].uid]);
    await query('UPDATE email_verifications SET used_at = NOW() WHERE token = $1', [token]);

    res.json({ message: 'Email verified successfully' });
  } catch (err) { next(err); }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const { rows } = await query('SELECT id, name, email FROM users WHERE email = $1', [email]);

    // Always return success to prevent email enumeration
    if (rows[0]) {
      const token = generateToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

      await query(
        `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [rows[0].id, token, expires]
      );

      await emailService.sendPasswordResetEmail(rows[0], token).catch(() => {});
      logger.info(`Password reset requested for ${email}`);
    }

    res.json({ message: 'If an account exists, a reset link has been sent' });
  } catch (err) { next(err); }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const { rows } = await query(
      `SELECT user_id FROM password_resets
       WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [token]
    );

    if (!rows[0]) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const hash = await bcrypt.hash(password, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, rows[0].user_id]);
    await query('UPDATE password_resets SET used_at = NOW() WHERE token = $1', [token]);

    res.json({ message: 'Password reset successful' });
  } catch (err) { next(err); }
}

module.exports = { sendVerification, verifyEmail, forgotPassword, resetPassword };
