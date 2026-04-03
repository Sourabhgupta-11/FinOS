const webpush = require('web-push');
const { query } = require('../db/pool');
const logger = require('../utils/logger');

function initWebPush() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@financialos.in',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    logger.info('Web Push VAPID configured');
  } else {
    logger.warn('VAPID keys not set — push notifications disabled');
  }
}

async function sendPushToUser(userId, title, body, data = {}) {
  if (!process.env.VAPID_PUBLIC_KEY) return;

  const { rows } = await query(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );

  const payload = JSON.stringify({ title, body, ...data, icon: '/icon-192.png', badge: '/badge.png' });

  const results = await Promise.allSettled(
    rows.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  // Remove expired subscriptions (410 Gone)
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'rejected') {
      const err = results[i].reason;
      if (err.statusCode === 410 || err.statusCode === 404) {
        await query(
          'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
          [userId, rows[i].endpoint]
        );
        logger.info(`Removed stale push subscription for user ${userId}`);
      }
    }
  }

  // Also save to notifications table
  await query(
    'INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, $4)',
    [userId, title, body, data.type || 'general']
  );
}

async function sendBulkPush(title, body, type = 'broadcast') {
  if (!process.env.VAPID_PUBLIC_KEY) return;

  const { rows } = await query(
    `SELECT DISTINCT user_id FROM push_subscriptions`
  );

  await Promise.allSettled(
    rows.map(({ user_id }) => sendPushToUser(user_id, title, body, { type }))
  );

  logger.info(`Bulk push sent to ${rows.length} users: ${title}`);
}

module.exports = { initWebPush, sendPushToUser, sendBulkPush };
