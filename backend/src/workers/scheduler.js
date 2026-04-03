const { query } = require('../db/pool');
const { sendPushToUser } = require('../services/pushNotification');
const { sendSIPReminderEmail, sendBudgetAlertEmail } = require('../services/email');
const logger = require('../utils/logger');

// Simple in-process scheduler (replace with BullMQ + Redis in high-scale production)
function startScheduler() {
  logger.info('Background scheduler started');

  // SIP reminders — run daily at 9 AM (check every hour)
  setInterval(checkSIPReminders, 60 * 60 * 1000);

  // Budget alerts — run every 6 hours
  setInterval(checkBudgetAlerts, 6 * 60 * 60 * 1000);

  // Portfolio price refresh — every 15 min during market hours
  setInterval(refreshPortfolioPrices, 15 * 60 * 1000);

  // Initial run after 30 seconds startup delay
  setTimeout(async () => {
    await checkSIPReminders().catch(err => logger.error('SIP reminder error:', err));
  }, 30 * 1000);
}

async function checkSIPReminders() {
  const now = new Date();
  // Only run once per day between 9-10 AM
  if (now.getHours() !== 9) return;

  const today = now.getDate();
  // Common SIP dates: 1st, 5th, 10th, 15th, 20th, 25th
  const sipDates = [1, 5, 10, 15, 20, 25];
  if (!sipDates.includes(today)) return;

  try {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, fp.salary, a.sip_amount
       FROM users u
       JOIN financial_profiles fp ON fp.user_id = u.id
       JOIN allocations a ON a.user_id = u.id
       WHERE a.sip_amount > 0
       AND a.created_at = (
         SELECT MAX(created_at) FROM allocations WHERE user_id = u.id
       )`
    );

    for (const user of rows) {
      if (!user.sip_amount || parseFloat(user.sip_amount) <= 0) continue;

      await sendPushToUser(
        user.id,
        '⏰ SIP Reminder',
        `Your SIP of ₹${parseFloat(user.sip_amount).toLocaleString('en-IN')} is due today`,
        { type: 'sip_reminder', url: '/advisor' }
      ).catch(() => {});

      await sendSIPReminderEmail(user, parseFloat(user.sip_amount)).catch(() => {});

      logger.info(`SIP reminder sent to user ${user.id}`);
    }
  } catch (err) {
    logger.error('checkSIPReminders error:', err);
  }
}

async function checkBudgetAlerts() {
  try {
    const { rows } = await query(
      `SELECT b.user_id, b.id, b.amount, b.alert_at_pct, c.name as category_name,
         COALESCE(SUM(t.amount), 0) as spent
       FROM budgets b
       LEFT JOIN categories c ON c.id = b.category_id
       LEFT JOIN transactions t ON t.category_id = b.category_id
         AND t.user_id = b.user_id AND t.type = 'expense'
         AND t.transaction_date >= date_trunc('month', CURRENT_DATE)
       WHERE b.is_active = true
       GROUP BY b.id, b.user_id, b.amount, b.alert_at_pct, c.name
       HAVING COALESCE(SUM(t.amount), 0) > 0`
    );

    for (const budget of rows) {
      const pct = Math.round((parseFloat(budget.spent) / parseFloat(budget.amount)) * 100);
      if (pct >= budget.alert_at_pct) {
        await sendPushToUser(
          budget.user_id,
          `⚠ Budget: ${budget.category_name}`,
          `${pct}% used (₹${parseFloat(budget.spent).toLocaleString('en-IN')} / ₹${parseFloat(budget.amount).toLocaleString('en-IN')})`,
          { type: 'budget_alert', url: '/expenses' }
        ).catch(() => {});
      }
    }
  } catch (err) {
    logger.error('checkBudgetAlerts error:', err);
  }
}

async function refreshPortfolioPrices() {
  // Only during NSE market hours (9:15 AM – 3:30 PM IST = 3:45–10:00 UTC)
  const utcHour = new Date().getUTCHours();
  if (utcHour < 3 || utcHour > 10) return;

  try {
    const { rows } = await query(
      `SELECT DISTINCT ON (symbol, exchange) id, symbol, asset_type, quantity, invested_value, exchange
       FROM portfolio_holdings
       WHERE asset_type IN ('stock','etf')
       AND last_updated < NOW() - INTERVAL '10 minutes'
       LIMIT 50`
    );

    if (rows.length === 0) return;

    const { fetchLivePrice } = require('../controllers/portfolioController');
    let updated = 0;

    for (const h of rows) {
      try {
        const price = await fetchLivePrice?.(h.symbol, h.exchange);
        if (price) {
          const currentValue = parseFloat(h.quantity) * price;
          const gainLoss = currentValue - parseFloat(h.invested_value);
          const gainLossPct = (gainLoss / parseFloat(h.invested_value)) * 100;
          await query(
            `UPDATE portfolio_holdings SET current_price=$1, current_value=$2, gain_loss=$3, gain_loss_pct=$4, last_updated=NOW() WHERE id=$5`,
            [price, currentValue, gainLoss, gainLossPct, h.id]
          );
          updated++;
        }
      } catch { /* skip individual failures */ }
    }

    if (updated > 0) logger.info(`Portfolio prices refreshed: ${updated} holdings`);
  } catch (err) {
    logger.error('refreshPortfolioPrices error:', err);
  }
}

module.exports = { startScheduler, checkSIPReminders, checkBudgetAlerts };
