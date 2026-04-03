const { query } = require('../db/pool');
const { sendPushToUser } = require('../services/pushNotification');

async function subscribe(req, res, next) {
  try {
    const { endpoint, keys, deviceLabel } = req.body;
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, device_label)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh=$3, auth=$4`,
      [req.user.id, endpoint, keys.p256dh, keys.auth, deviceLabel || 'Browser']
    );
    res.json({ message: 'Push subscription saved' });
  } catch (err) { next(err); }
}

async function unsubscribe(req, res, next) {
  try {
    await query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [req.user.id, req.body.endpoint]
    );
    res.json({ message: 'Unsubscribed' });
  } catch (err) { next(err); }
}

async function getNotifications(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY sent_at DESC LIMIT 30`,
      [req.user.id]
    );
    const unread = rows.filter(n => !n.is_read).length;
    res.json({ notifications: rows, unread });
  } catch (err) { next(err); }
}

async function markRead(req, res, next) {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND id = ANY($2::uuid[])',
      [req.user.id, req.body.ids || [req.params.id]]
    );
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
}

async function testPush(req, res, next) {
  try {
    await sendPushToUser(req.user.id, '₹ Financial OS', 'Push notifications are working!', { type: 'test' });
    res.json({ message: 'Test push sent' });
  } catch (err) { next(err); }
}

async function getVapidKey(req, res) {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
}

module.exports = { subscribe, unsubscribe, getNotifications, markRead, testPush, getVapidKey };
