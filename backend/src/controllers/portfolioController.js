const { query } = require('../db/pool');
const { cacheGet, cacheSet } = require('../services/redis');
const axios = require('axios');
const logger = require('../utils/logger');

// Fetch price from Yahoo Finance (free, no auth needed)
async function fetchLivePrice(symbol, exchange = 'NSE') {
  const cacheKey = `price:${symbol}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const ySymbol = exchange === 'NSE' ? `${symbol}.NS` : `${symbol}.BO`;
    const res = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ySymbol}`,
      { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const price = res.data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price) {
      await cacheSet(cacheKey, price, 300); // cache 5 min
      return price;
    }
  } catch (err) {
    logger.warn(`Price fetch failed for ${symbol}: ${err.message}`);
  }
  return null;
}

async function getPortfolio(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT * FROM portfolio_holdings WHERE user_id = $1 ORDER BY current_value DESC NULLS LAST`,
      [req.user.id]
    );

    // Compute summary
    const totalInvested = rows.reduce((s, h) => s + parseFloat(h.invested_value || 0), 0);
    const totalCurrent  = rows.reduce((s, h) => s + parseFloat(h.current_value || h.invested_value || 0), 0);
    const totalGain     = totalCurrent - totalInvested;
    const totalGainPct  = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(2) : 0;

    // Asset breakdown
    const byType = {};
    for (const h of rows) {
      byType[h.asset_type] = (byType[h.asset_type] || 0) + parseFloat(h.current_value || h.invested_value || 0);
    }

    res.json({
      holdings: rows,
      summary: { totalInvested, totalCurrent, totalGain, totalGainPct: parseFloat(totalGainPct) },
      byAssetType: byType,
    });
  } catch (err) { next(err); }
}

async function addOrUpdateHolding(req, res, next) {
  try {
    const {
      symbol, name, assetType, quantity, avgBuyPrice, exchange,
    } = req.body;

    const investedValue = parseFloat(quantity) * parseFloat(avgBuyPrice);
    let currentPrice = await fetchLivePrice(symbol, exchange);
    if (!currentPrice) currentPrice = parseFloat(avgBuyPrice); // fallback
    const currentValue = parseFloat(quantity) * currentPrice;
    const gainLoss = currentValue - investedValue;
    const gainLossPct = ((gainLoss / investedValue) * 100);

    const { rows } = await query(
      `INSERT INTO portfolio_holdings
         (user_id, symbol, name, asset_type, quantity, avg_buy_price, current_price,
          current_value, invested_value, gain_loss, gain_loss_pct, exchange, last_updated)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       ON CONFLICT (user_id, symbol, asset_type) DO UPDATE SET
         quantity = EXCLUDED.quantity,
         avg_buy_price = EXCLUDED.avg_buy_price,
         current_price = EXCLUDED.current_price,
         current_value = EXCLUDED.current_value,
         invested_value = EXCLUDED.invested_value,
         gain_loss = EXCLUDED.gain_loss,
         gain_loss_pct = EXCLUDED.gain_loss_pct,
         last_updated = NOW(), updated_at = NOW()
       RETURNING *`,
      [req.user.id, symbol.toUpperCase(), name, assetType,
       quantity, avgBuyPrice, currentPrice, currentValue,
       investedValue, gainLoss, gainLossPct, exchange || 'NSE']
    );

    // Log the transaction
    await query(
      `INSERT INTO portfolio_transactions
         (user_id, holding_id, symbol, asset_type, transaction_type, quantity, price, total_amount, transaction_date)
       VALUES ($1,$2,$3,$4,'buy',$5,$6,$7,NOW()::date)`,
      [req.user.id, rows[0].id, symbol.toUpperCase(), assetType, quantity, avgBuyPrice, investedValue]
    );

    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function deleteHolding(req, res, next) {
  try {
    await query(
      'DELETE FROM portfolio_holdings WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Holding removed' });
  } catch (err) { next(err); }
}

async function refreshPrices(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT id, symbol, asset_type, quantity, invested_value, exchange
       FROM portfolio_holdings WHERE user_id = $1 AND asset_type IN ('stock','etf')`,
      [req.user.id]
    );

    let updated = 0;
    for (const h of rows) {
      const price = await fetchLivePrice(h.symbol, h.exchange);
      if (price) {
        const currentValue = parseFloat(h.quantity) * price;
        const gainLoss = currentValue - parseFloat(h.invested_value);
        const gainLossPct = (gainLoss / parseFloat(h.invested_value)) * 100;
        await query(
          `UPDATE portfolio_holdings SET
             current_price=$1, current_value=$2, gain_loss=$3, gain_loss_pct=$4, last_updated=NOW()
           WHERE id=$5`,
          [price, currentValue, gainLoss, gainLossPct, h.id]
        );
        updated++;
      }
    }

    res.json({ message: `Updated ${updated} holdings`, updated });
  } catch (err) { next(err); }
}

async function getTransactions(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT * FROM portfolio_transactions WHERE user_id = $1 ORDER BY transaction_date DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ transactions: rows });
  } catch (err) { next(err); }
}

module.exports = { getPortfolio, addOrUpdateHolding, deleteHolding, refreshPrices, getTransactions };
