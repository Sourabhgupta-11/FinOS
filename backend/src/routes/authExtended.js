const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');

// GET /api/auth/me  (already exists in authController)

// PUT /api/auth/profile  - update name or email
router.put('/profile', async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const sets = [];
    const params = [];
    let i = 1;

    if (name?.trim()) { sets.push(`name = $${i++}`); params.push(name.trim()); }
    if (email?.trim()) {
      const exists = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email.trim(), req.user.id]);
      if (exists.rows[0]) return res.status(409).json({ error: 'Email already in use' });
      sets.push(`email = $${i++}`, `email_verified = false`);
      params.push(email.trim());
    }

    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.user.id);

    const { rows } = await query(
      `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING id, name, email`,
      params
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/auth/password
router.put('/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) { next(err); }
});

// DELETE /api/auth/account
router.delete('/account', async (req, res, next) => {
  try {
    await query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ message: 'Account deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
