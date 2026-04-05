const { query } = require('../db/pool');
const { cacheGet, cacheSet } = require('../services/redis');
const portfolioFetch = require('../services/portfolioFetch');
const Groq = require('groq-sdk');
const logger = require('../utils/logger');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function linkByPhone(req, res, next) {
  try {
    const { phoneNumber, panNumber } = req.body;
    const cleaned = (phoneNumber || '').replace(/\D/g, '');
    if (cleaned.length < 10) {
      return res.status(400).json({ error: 'Valid 10-digit mobile number required' });
    }
    const result = await portfolioFetch.linkPortfolioByPhone(req.user.id, cleaned, panNumber);

    // Immediately sync after linking
    try {
      const { rows } = await query(
        `SELECT id FROM linked_accounts WHERE user_id=$1 AND phone_number=$2`,
        [req.user.id, cleaned]
      );
      if (rows[0]) {
        await portfolioFetch.syncHoldings(req.user.id, rows[0].id);
      }
    } catch (e) { logger.warn('Auto-sync after link failed:', e.message); }

    res.json({ ...result, message: 'Portfolio linked and synced successfully' });
  } catch (err) { next(err); }
}

async function syncLinkedAccount(req, res, next) {
  try {
    const result = await portfolioFetch.syncHoldings(req.user.id, req.params.id);
    res.json({ ...result, message: `Synced ${result.total} holdings` });
  } catch (err) { next(err); }
}

async function syncAllAccounts(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT id FROM linked_accounts WHERE user_id=$1 AND link_status='active'`,
      [req.user.id]
    );
    let total = { inserted: 0, updated: 0, holdings: 0 };
    for (const acc of rows) {
      try {
        const r = await portfolioFetch.syncHoldings(req.user.id, acc.id);
        total.inserted += r.inserted; total.updated += r.updated; total.holdings += r.total;
      } catch (e) { logger.warn(`Sync failed ${acc.id}: ${e.message}`); }
    }
    res.json({ ...total, message: `Synced ${total.holdings} holdings across ${rows.length} linked accounts` });
  } catch (err) { next(err); }
}

async function getLinkedAccounts(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT id, phone_number, broker_name, account_type, link_status,
              last_synced, next_refresh_due, pan_number, created_at
       FROM linked_accounts WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    const now = new Date();
    res.json({
      accounts: rows.map(r => ({
        ...r,
        phone_masked: r.phone_number?.replace(/(\d{2})\d{6}(\d{2})/, '$1XXXXXX$2'),
        refresh_due: r.next_refresh_due && new Date(r.next_refresh_due) < now,
      })),
    });
  } catch (err) { next(err); }
}

async function removeLinkedAccount(req, res, next) {
  try {
    await query('DELETE FROM linked_accounts WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Account unlinked' });
  } catch (err) { next(err); }
}

async function getPortfolio(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT ph.*, mb.benchmark_name, mb.returns_1y as scheme_1y,
              mb.returns_3y as scheme_3y, mb.returns_5y as scheme_5y,
              mb.benchmark_1y, mb.benchmark_3y, mb.benchmark_5y,
              mb.expense_ratio, mb.category as mf_category, mb.amc
       FROM portfolio_holdings ph
       LEFT JOIN mf_benchmarks mb ON mb.scheme_code = ph.scheme_code
       WHERE ph.user_id=$1 ORDER BY ph.current_value DESC NULLS LAST`,
      [req.user.id]
    );
    const totalInvested = rows.reduce((s, h) => s + parseFloat(h.invested_value || 0), 0);
    const totalCurrent  = rows.reduce((s, h) => s + parseFloat(h.current_value || h.invested_value || 0), 0);
    const totalGain     = totalCurrent - totalInvested;
    const totalGainPct  = totalInvested > 0 ? (totalGain / totalInvested * 100) : 0;
    const byType = {};
    for (const h of rows) byType[h.asset_type] = (byType[h.asset_type] || 0) + parseFloat(h.current_value || h.invested_value || 0);
    res.json({ holdings: rows, summary: { totalInvested, totalCurrent, totalGain, totalGainPct: parseFloat(totalGainPct.toFixed(2)) }, byAssetType: byType });
  } catch (err) { next(err); }
}

async function addHolding(req, res, next) {
  try {
    const { symbol, name, assetType, quantity, avgBuyPrice, exchange } = req.body;
    const investedValue = parseFloat(quantity) * parseFloat(avgBuyPrice);
    let currentPrice = await portfolioFetch.fetchLivePrice(symbol, exchange);
    if (!currentPrice) currentPrice = parseFloat(avgBuyPrice);
    const currentValue = parseFloat(quantity) * currentPrice;
    const gainLoss = currentValue - investedValue;
    const gainLossPct = investedValue > 0 ? (gainLoss / investedValue * 100) : 0;
    const { rows } = await query(
      `INSERT INTO portfolio_holdings
         (user_id,symbol,name,asset_type,quantity,avg_buy_price,current_price,current_value,invested_value,gain_loss,gain_loss_pct,exchange,data_source,last_updated)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'manual',NOW())
       ON CONFLICT (user_id,symbol,asset_type) DO UPDATE SET
         quantity=$5,avg_buy_price=$6,current_price=$7,current_value=$8,
         invested_value=$9,gain_loss=$10,gain_loss_pct=$11,last_updated=NOW(),updated_at=NOW()
       RETURNING *`,
      [req.user.id, symbol.toUpperCase(), name, assetType, quantity, avgBuyPrice, currentPrice, currentValue, investedValue, gainLoss, gainLossPct, exchange || 'NSE']
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function deleteHolding(req, res, next) {
  try {
    await query('DELETE FROM portfolio_holdings WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Holding removed' });
  } catch (err) { next(err); }
}

async function refreshPrices(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT id,symbol,asset_type,quantity,invested_value,exchange FROM portfolio_holdings WHERE user_id=$1 AND asset_type IN ('stock','etf')`,
      [req.user.id]
    );
    let updated = 0;
    for (const h of rows) {
      const price = await portfolioFetch.fetchLivePrice(h.symbol, h.exchange);
      if (price) {
        const cv = parseFloat(h.quantity) * price;
        const gl = cv - parseFloat(h.invested_value);
        const glp = parseFloat(h.invested_value) > 0 ? (gl / parseFloat(h.invested_value) * 100) : 0;
        await query(
          `UPDATE portfolio_holdings SET current_price=$1,current_value=$2,gain_loss=$3,gain_loss_pct=$4,last_updated=NOW() WHERE id=$5`,
          [price, cv, gl, glp, h.id]
        );
        updated++;
      }
    }
    res.json({ message: `Updated ${updated} holdings`, updated });
  } catch (err) { next(err); }
}

async function getInsights(req, res, next) {
  try {
    const cacheKey = `insights:${req.user.id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ insights: cached, cached: true });

    const { rows: dbCache } = await query(
      `SELECT content FROM portfolio_insights WHERE user_id=$1 AND expires_at > NOW() ORDER BY generated_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (dbCache[0]) {
      await cacheSet(cacheKey, dbCache[0].content, 3600);
      return res.json({ insights: dbCache[0].content, cached: true });
    }

    const { rows: holdings } = await query(
      `SELECT ph.*, mb.benchmark_name, mb.returns_1y, mb.returns_3y, mb.returns_5y,
              mb.benchmark_1y, mb.benchmark_3y, mb.benchmark_5y, mb.expense_ratio, mb.category as mf_category
       FROM portfolio_holdings ph
       LEFT JOIN mf_benchmarks mb ON mb.scheme_code = ph.scheme_code
       WHERE ph.user_id=$1`,
      [req.user.id]
    );

    if (holdings.length === 0) {
      return res.json({ insights: 'Add holdings to your portfolio first to get AI insights.', cached: false });
    }

    const totalInvested = holdings.reduce((s, h) => s + parseFloat(h.invested_value || 0), 0);
    const totalCurrent  = holdings.reduce((s, h) => s + parseFloat(h.current_value || h.invested_value || 0), 0);
    const overallReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested * 100).toFixed(1) : 0;

    const summary = holdings.map(h => {
      const cv = parseFloat(h.current_value || h.invested_value || 0);
      const pct = totalCurrent > 0 ? (cv / totalCurrent * 100).toFixed(1) : '0';
      const ret = parseFloat(h.gain_loss_pct || 0).toFixed(1);
      let line = `- ${h.name} (${h.asset_type}): ₹${Math.round(cv).toLocaleString('en-IN')} | ${pct}% of portfolio | ${ret}% return`;
      if (h.benchmark_name) {
        line += ` | Fund: ${parseFloat(h.returns_1y || 0).toFixed(1)}% vs Benchmark: ${parseFloat(h.benchmark_1y || 0).toFixed(1)}% (1Y)`;
        if (h.expense_ratio) line += ` | ER: ${h.expense_ratio}%`;
      }
      return line;
    }).join('\n');

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `You are a senior Indian financial advisor. Analyze this portfolio:\n\nTotal invested: ₹${Math.round(totalInvested).toLocaleString('en-IN')}\nCurrent value: ₹${Math.round(totalCurrent).toLocaleString('en-IN')}\nOverall return: ${overallReturn}%\n\nHoldings:\n${summary}\n\nProvide:\n## 📊 Portfolio Scorecard\n[Diversification, concentration risks, health - 3-4 bullets]\n\n## ✅ What's Working Well\n[2-3 specifics with data]\n\n## ⚠️ What Needs Attention\n[2-3 concerns with exact numbers - underperformance, high ER, over-concentration]\n\n## 🔮 Outlook & Recommendations\n[Each major holding: hold/increase/reduce with reasoning and expected 3-5yr returns]\n\n## 📋 Priority Action Items\n[3-5 specific steps with fund names]\n\nBe direct, data-driven, India-specific. Reference Nifty 50 benchmarks. Use ₹.`
      }],
      max_tokens: 1500,
      temperature: 0.4,
    });

    const insights = completion.choices[0]?.message?.content;
    if (!insights) throw new Error('Empty AI response');

    await query(
      `INSERT INTO portfolio_insights (user_id, content, model, portfolio_snapshot) VALUES ($1,$2,$3,$4)`,
      [req.user.id, insights, process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', JSON.stringify({ totalInvested, totalCurrent })]
    );
    await cacheSet(cacheKey, insights, 86400);
    res.json({ insights, cached: false });
  } catch (err) { next(err); }
}

async function getNetWorth(req, res, next) {
  try {
    const data = await portfolioFetch.calculateNetWorth(req.user.id);
    res.json(data);
  } catch (err) { next(err); }
}

async function getNetWorthEntries(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT * FROM net_worth_entries WHERE user_id=$1 ORDER BY entry_type, value DESC`,
      [req.user.id]
    );
    res.json({ entries: rows });
  } catch (err) { next(err); }
}

async function upsertNetWorthEntry(req, res, next) {
  try {
    const { id, name, category, entryType, value, notes } = req.body;
    if (id) {
      const { rows } = await query(
        `UPDATE net_worth_entries SET name=$1,category=$2,entry_type=$3,value=$4,notes=$5,last_updated=NOW(),updated_at=NOW() WHERE id=$6 AND user_id=$7 RETURNING *`,
        [name, category, entryType, value, notes, id, req.user.id]
      );
      return res.json(rows[0]);
    }
    const { rows } = await query(
      `INSERT INTO net_worth_entries (user_id,name,category,entry_type,value,notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, name, category, entryType, value, notes || null]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function deleteNetWorthEntry(req, res, next) {
  try {
    await query('DELETE FROM net_worth_entries WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Entry removed' });
  } catch (err) { next(err); }
}

module.exports = {
  linkByPhone, syncLinkedAccount, syncAllAccounts, getLinkedAccounts, removeLinkedAccount,
  getPortfolio, addHolding, deleteHolding, refreshPrices,
  getInsights, getNetWorth, getNetWorthEntries, upsertNetWorthEntry, deleteNetWorthEntry,
};
