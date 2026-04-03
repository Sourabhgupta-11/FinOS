const express = require('express');
const { query } = require('../db/pool');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM financial_profiles WHERE user_id = $1',
      [req.user.id]
    );
    res.json(rows[0] || null);
  } catch (err) { next(err); }
});

router.delete('/', async (req, res, next) => {
  try {
    await query('DELETE FROM financial_profiles WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Profile deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
