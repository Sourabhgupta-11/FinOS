/**
 * Portfolio Fetch Service
 * Fetches holdings from NSDL, CDSL, MF Central, and major brokers
 * via phone number + consent (SEBI AA framework)
 *
 * In sandbox/dev mode returns mock data.
 * In production: integrates with
 *   - Setu FI for demat holdings (NSDL/CDSL)
 *   - MF Central API for mutual fund folios
 *   - BSE Star MF for MF NAV data
 */

const axios = require('axios');
const { query } = require('../db/pool');
const { cacheSet, cacheGet } = require('./redis');
const logger = require('../utils/logger');

const MF_CENTRAL_BASE = 'https://www.mfcentral.com/api';
const BSE_STAR_BASE   = 'https://bsestarmf.in/api';
const AMFI_NAV_URL    = 'https://www.amfiindia.com/spages/NAVAll.txt';

// ── Mock data for dev/sandbox ──────────────────────────────────────────────────
const MOCK_DEMAT_HOLDINGS = [
  { symbol: 'RELIANCE',  name: 'Reliance Industries Ltd',       isin: 'INE002A01018', quantity: 10,  avgPrice: 2400, currentPrice: 2856, exchange: 'NSE', assetType: 'stock' },
  { symbol: 'TCS',       name: 'Tata Consultancy Services Ltd', isin: 'INE467B01029', quantity: 5,   avgPrice: 3200, currentPrice: 3741, exchange: 'NSE', assetType: 'stock' },
  { symbol: 'HDFCBANK',  name: 'HDFC Bank Ltd',                 isin: 'INE040A01034', quantity: 20,  avgPrice: 1450, currentPrice: 1658, exchange: 'NSE', assetType: 'stock' },
  { symbol: 'INFY',      name: 'Infosys Ltd',                   isin: 'INE009A01021', quantity: 15,  avgPrice: 1380, currentPrice: 1492, exchange: 'NSE', assetType: 'stock' },
  { symbol: 'NIFTYBEES', name: 'Nippon India ETF Nifty BeES',   isin: 'INF204KB14I2', quantity: 100, avgPrice: 195,  currentPrice: 244,  exchange: 'NSE', assetType: 'etf' },
];

const MOCK_MF_HOLDINGS = [
  {
    schemeCode: '120503',
    schemeName: 'Axis Bluechip Fund - Direct Plan - Growth',
    folioNumber: '12345678',
    units: 245.67,
    avgNav: 42.50,
    currentNav: 67.83,
    category: 'Large Cap',
    subCategory: 'Large Cap Fund',
    amc: 'Axis Mutual Fund',
    benchmark: 'Nifty 50 TRI',
    returns1y: 18.4,
    returns3y: 14.2,
    returns5y: 16.8,
    benchmark1y: 15.2,
    benchmark3y: 12.1,
    benchmark5y: 14.3,
    expenseRatio: 0.45,
    assetType: 'mutual_fund',
    exchange: 'BSE',
  },
  {
    schemeCode: '148621',
    schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
    folioNumber: '87654321',
    units: 89.43,
    avgNav: 38.20,
    currentNav: 71.25,
    category: 'Flexi Cap',
    subCategory: 'Flexi Cap Fund',
    amc: 'PPFAS Mutual Fund',
    benchmark: 'NIFTY 500 TRI',
    returns1y: 24.6,
    returns3y: 20.1,
    returns5y: 22.4,
    benchmark1y: 17.8,
    benchmark3y: 13.5,
    benchmark5y: 15.2,
    expenseRatio: 0.59,
    assetType: 'mutual_fund',
    exchange: 'BSE',
  },
  {
    schemeCode: '101206',
    schemeName: 'UTI Nifty 50 Index Fund - Direct Plan - Growth',
    folioNumber: '11223344',
    units: 312.18,
    avgNav: 95.40,
    currentNav: 148.62,
    category: 'Index Fund',
    subCategory: 'Index Funds',
    amc: 'UTI Mutual Fund',
    benchmark: 'Nifty 50 TRI',
    returns1y: 15.2,
    returns3y: 12.1,
    returns5y: 14.3,
    benchmark1y: 15.2,
    benchmark3y: 12.1,
    benchmark5y: 14.3,
    expenseRatio: 0.18,
    assetType: 'mutual_fund',
    exchange: 'BSE',
  },
];

// ── Fetch live price from Yahoo Finance (NSE) ──────────────────────────────────
async function fetchLivePrice(symbol, exchange = 'NSE') {
  const cacheKey = `price:${symbol}:${exchange}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const suffix = exchange === 'BSE' ? '.BO' : '.NS';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}${suffix}`;
    const res = await axios.get(url, {
      timeout: 6000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const price = res.data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price) {
      await cacheSet(cacheKey, price, 300); // cache 5 min
      return price;
    }
  } catch (err) {
    logger.warn(`Price fetch failed ${symbol}: ${err.message}`);
  }
  return null;
}

// ── Fetch MF NAV from AMFI ─────────────────────────────────────────────────────
async function fetchMFNav(schemeCode) {
  const cacheKey = `mfnav:${schemeCode}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const res = await axios.get(AMFI_NAV_URL, { timeout: 8000 });
    const lines = res.data.split('\n');
    for (const line of lines) {
      const parts = line.split(';');
      if (parts[0] === schemeCode && parts[4]) {
        const nav = parseFloat(parts[4]);
        if (!isNaN(nav)) {
          await cacheSet(cacheKey, nav, 3600); // cache 1 hour
          return nav;
        }
      }
    }
  } catch (err) {
    logger.warn(`AMFI NAV fetch failed ${schemeCode}: ${err.message}`);
  }
  return null;
}

// ── Main: Link portfolio via phone number ──────────────────────────────────────
async function linkPortfolioByPhone(userId, phoneNumber, panNumber = null) {
  // In production: initiate Setu FI consent for the phone number
  // For now: create a linked_account record and simulate fetch

  const existingRes = await query(
    `SELECT id FROM linked_accounts WHERE user_id = $1 AND phone_number = $2`,
    [userId, phoneNumber]
  );

  let linkedAccountId;
  if (existingRes.rows[0]) {
    linkedAccountId = existingRes.rows[0].id;
    await query(
      `UPDATE linked_accounts SET link_status='active', pan_number=COALESCE($1,pan_number), updated_at=NOW()
       WHERE id=$2`,
      [panNumber, linkedAccountId]
    );
  } else {
    const { rows } = await query(
      `INSERT INTO linked_accounts
         (user_id, phone_number, account_type, pan_number, link_status, broker_name)
       VALUES ($1,$2,'demat',$3,'active','NSDL/CDSL (Auto)')
       RETURNING id`,
      [userId, phoneNumber, panNumber]
    );
    linkedAccountId = rows[0].id;

    // Also create MF folio link
    await query(
      `INSERT INTO linked_accounts
         (user_id, phone_number, account_type, pan_number, link_status, broker_name)
       VALUES ($1,$2,'mf_folio',$3,'active','MF Central')
       ON CONFLICT (user_id, phone_number, account_type) DO NOTHING`,
      [userId, phoneNumber, panNumber]
    );
  }

  return { linkedAccountId, status: 'active' };
}

// ── Sync/fetch holdings for a linked account ──────────────────────────────────
async function syncHoldings(userId, linkedAccountId) {
  const { rows: [account] } = await query(
    `SELECT * FROM linked_accounts WHERE id=$1 AND user_id=$2`,
    [linkedAccountId, userId]
  );
  if (!account) throw new Error('Linked account not found');

  const isDev = process.env.NODE_ENV !== 'production' || !process.env.SETU_CLIENT_ID;
  const allHoldings = [];

  if (isDev) {
    // Use mock data in dev
    if (account.account_type === 'demat') {
      allHoldings.push(...MOCK_DEMAT_HOLDINGS);
    } else if (account.account_type === 'mf_folio') {
      allHoldings.push(...MOCK_MF_HOLDINGS.map(h => ({
        ...h,
        symbol: h.schemeCode,
        name: h.schemeName,
        quantity: h.units,
        avgBuyPrice: h.avgNav,
        currentPrice: h.currentNav,
      })));
    }
  }

  // In production: call Setu FI data API here
  // const fiData = await setuService.fetchFIData(account.consent_id);
  // allHoldings = parseFIHoldings(fiData);

  // Refresh live prices for stocks
  let inserted = 0, updated = 0;
  for (const h of allHoldings) {
    let currentPrice = h.currentPrice || h.currentNav;

    // Try live price for stocks/ETFs
    if (['stock', 'etf'].includes(h.assetType) && h.symbol) {
      const live = await fetchLivePrice(h.symbol, h.exchange);
      if (live) currentPrice = live;
    }

    // Try live NAV for mutual funds
    if (h.assetType === 'mutual_fund' && h.schemeCode) {
      const liveNav = await fetchMFNav(h.schemeCode);
      if (liveNav) currentPrice = liveNav;
    }

    const qty = parseFloat(h.quantity || h.units || 0);
    const avgPrice = parseFloat(h.avgBuyPrice || h.avgNav || h.avgPrice || 0);
    const investedValue = qty * avgPrice;
    const currentValue = qty * currentPrice;
    const gainLoss = currentValue - investedValue;
    const gainLossPct = investedValue > 0 ? ((gainLoss / investedValue) * 100) : 0;

    try {
      const existing = await query(
        `SELECT id FROM portfolio_holdings WHERE user_id=$1 AND symbol=$2 AND asset_type=$3`,
        [userId, h.symbol || h.schemeCode, h.assetType]
      );

      const holdingData = [
        currentPrice, currentValue, gainLoss, gainLossPct,
        h.broker || account.broker_name, linkedAccountId, h.schemeCode || null,
        h.isin || null, h.folioNumber || null, 'phone_link',
      ];

      if (existing.rows[0]) {
        await query(
          `UPDATE portfolio_holdings SET
             current_price=$1, current_value=$2, gain_loss=$3, gain_loss_pct=$4,
             broker=$5, linked_account_id=$6, scheme_code=$7, isin=$8, folio_number=$9,
             data_source=$10, last_updated=NOW(), updated_at=NOW()
           WHERE user_id=$11 AND symbol=$12 AND asset_type=$13`,
          [...holdingData, userId, h.symbol || h.schemeCode, h.assetType]
        );
        updated++;
      } else {
        await query(
          `INSERT INTO portfolio_holdings
             (user_id, symbol, name, asset_type, quantity, avg_buy_price, current_price,
              current_value, invested_value, gain_loss, gain_loss_pct, exchange,
              broker, linked_account_id, scheme_code, isin, folio_number, data_source, last_updated)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())`,
          [
            userId, h.symbol || h.schemeCode, h.name || h.schemeName,
            h.assetType, qty, avgPrice, currentPrice,
            currentValue, investedValue, gainLoss, gainLossPct,
            h.exchange || 'NSE',
            ...holdingData.slice(4),
          ]
        );
        inserted++;
      }
    } catch (err) {
      logger.warn(`Failed to upsert holding ${h.symbol}: ${err.message}`);
    }
  }

  // Update sync timestamp
  await query(
    `UPDATE linked_accounts SET last_synced=NOW(), next_refresh_due=NOW() + INTERVAL '7 days', updated_at=NOW() WHERE id=$1`,
    [linkedAccountId]
  );

  // Store MF benchmark data
  for (const h of allHoldings.filter(h => h.assetType === 'mutual_fund' && h.schemeCode)) {
    await query(
      `INSERT INTO mf_benchmarks
         (scheme_code, scheme_name, category, sub_category, amc, expense_ratio,
          benchmark_name, nav, returns_1y, returns_3y, returns_5y,
          benchmark_1y, benchmark_3y, benchmark_5y, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
       ON CONFLICT (scheme_code) DO UPDATE SET
         nav=$8, returns_1y=$9, returns_3y=$10, returns_5y=$11,
         benchmark_1y=$12, benchmark_3y=$13, benchmark_5y=$14, updated_at=NOW()`,
      [
        h.schemeCode, h.schemeName, h.category, h.subCategory, h.amc,
        h.expenseRatio, h.benchmark, h.currentNav || h.currentPrice,
        h.returns1y, h.returns3y, h.returns5y,
        h.benchmark1y, h.benchmark3y, h.benchmark5y,
      ]
    ).catch(() => {});
  }

  logger.info(`Portfolio sync: ${inserted} inserted, ${updated} updated for user ${userId}`);
  return { inserted, updated, total: allHoldings.length };
}

// ── Net worth calculation ──────────────────────────────────────────────────────
async function calculateNetWorth(userId) {
  const [holdings, accounts, manualEntries] = await Promise.all([
    query(`SELECT asset_type, SUM(current_value) as val FROM portfolio_holdings WHERE user_id=$1 GROUP BY asset_type`, [userId]),
    query(`SELECT account_type, SUM(balance) as val FROM bank_accounts WHERE user_id=$1 GROUP BY account_type`, [userId]),
    query(`SELECT entry_type, category, SUM(value) as val, name FROM net_worth_entries WHERE user_id=$1 GROUP BY entry_type, category, name ORDER BY entry_type, val DESC`, [userId]),
  ]);

  const assets = {};
  const liabilities = {};

  // Portfolio holdings as assets
  for (const row of holdings.rows) {
    assets[row.asset_type] = (assets[row.asset_type] || 0) + parseFloat(row.val || 0);
  }

  // Bank accounts
  for (const row of accounts.rows) {
    if (['credit_card', 'loan'].includes(row.account_type)) {
      liabilities[row.account_type] = (liabilities[row.account_type] || 0) + parseFloat(row.val || 0);
    } else {
      assets.bank = (assets.bank || 0) + parseFloat(row.val || 0);
    }
  }

  // Manual entries
  for (const row of manualEntries.rows) {
    if (row.entry_type === 'asset') {
      assets[row.category] = (assets[row.category] || 0) + parseFloat(row.val || 0);
    } else {
      liabilities[row.category] = (liabilities[row.category] || 0) + parseFloat(row.val || 0);
    }
  }

  const totalAssets      = Object.values(assets).reduce((s, v) => s + v, 0);
  const totalLiabilities = Object.values(liabilities).reduce((s, v) => s + v, 0);
  const netWorth         = totalAssets - totalLiabilities;

  return { assets, liabilities, totalAssets, totalLiabilities, netWorth, manualEntries: manualEntries.rows };
}

module.exports = {
  linkPortfolioByPhone,
  syncHoldings,
  fetchLivePrice,
  fetchMFNav,
  calculateNetWorth,
  MOCK_DEMAT_HOLDINGS,
  MOCK_MF_HOLDINGS,
};
