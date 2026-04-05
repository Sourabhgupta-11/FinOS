const { query } = require('../db/pool');
const logger = require('../utils/logger');

// ── Net Worth Summary ──────────────────────────────────────────────────────────
async function getNetWorth(req, res, next) {
  try {
    const uid = req.user.id;

    const [bankRes, portfolioRes, manualAssetsRes, liabRes, extRes] = await Promise.all([
      // Bank balances (savings/current/salary/fd/rd/ppf/nps)
      query(
        `SELECT COALESCE(SUM(balance),0) as total,
                COALESCE(SUM(CASE WHEN account_type IN ('savings','current','salary','wallet') THEN balance ELSE 0 END),0) as liquid
         FROM bank_accounts WHERE user_id=$1 AND account_type NOT IN ('credit_card','loan')`,
        [uid]
      ),
      // Portfolio holdings
      query(
        `SELECT COALESCE(SUM(COALESCE(current_value, invested_value)),0) as total
         FROM portfolio_holdings WHERE user_id=$1`,
        [uid]
      ).catch(() => ({ rows: [{ total: 0 }] })),
      // Manual assets
      query(
        `SELECT COALESCE(SUM(current_value),0) as total,
                COALESCE(SUM(CASE WHEN is_illiquid THEN current_value ELSE 0 END),0) as illiquid,
                COALESCE(SUM(CASE WHEN NOT is_illiquid THEN current_value ELSE 0 END),0) as liquid,
                asset_category, COALESCE(SUM(current_value),0) as cat_value
         FROM manual_assets WHERE user_id=$1 GROUP BY asset_category`,
        [uid]
      ),
      // Liabilities
      query(
        `SELECT COALESCE(SUM(outstanding_amount),0) as total,
                liability_type, COALESCE(SUM(outstanding_amount),0) as type_total
         FROM manual_liabilities WHERE user_id=$1 GROUP BY liability_type`,
        [uid]
      ),
      // External portfolio links
      query(
        `SELECT COALESCE(SUM(total_value),0) as total FROM external_portfolio_links WHERE user_id=$1`,
        [uid]
      ),
      // Credit card debt
      query(
        `SELECT COALESCE(SUM(balance),0) as total FROM bank_accounts WHERE user_id=$1 AND account_type='credit_card'`,
        [uid]
      ).catch(() => ({ rows: [{ total: 0 }] })),
    ]);

    const creditCardDebtRes = await query(
      `SELECT COALESCE(SUM(balance),0) as total FROM bank_accounts WHERE user_id=$1 AND account_type='credit_card'`,
      [uid]
    ).catch(() => ({ rows: [{ total: 0 }] }));

    const bankTotal      = parseFloat(bankRes.rows[0]?.total || 0);
    const bankLiquid     = parseFloat(bankRes.rows[0]?.liquid || 0);
    const portfolioTotal = parseFloat(portfolioRes.rows[0]?.total || 0);
    const extTotal       = parseFloat(extRes.rows[0]?.total || 0);
    const creditDebt     = parseFloat(creditCardDebtRes.rows[0]?.total || 0);

    const manualAssetTotal   = manualAssetsRes.rows.reduce((s, r) => s + parseFloat(r.total || 0), 0);
    const manualAssetIlliquid = manualAssetsRes.rows.reduce((s, r) => s + parseFloat(r.illiquid || 0), 0);
    const manualLiabTotal    = liabRes.rows.reduce((s, r) => s + parseFloat(r.total || 0), 0);

    const totalAssets      = bankTotal + portfolioTotal + extTotal + manualAssetTotal;
    const totalLiabilities = manualLiabTotal + creditDebt;
    const netWorth         = totalAssets - totalLiabilities;
    const liquidAssets     = bankLiquid + portfolioTotal + extTotal;
    const illiquidAssets   = manualAssetIlliquid + (bankTotal - bankLiquid);

    // Asset breakdown by category
    const breakdown = {
      bank:         bankTotal,
      portfolio:    portfolioTotal,
      external:     extTotal,
      realEstate:   0,
      vehicle:      0,
      gold:         0,
      other:        0,
    };
    for (const r of manualAssetsRes.rows) {
      if (r.asset_category === 'real_estate') breakdown.realEstate += parseFloat(r.cat_value || 0);
      else if (r.asset_category === 'vehicle') breakdown.vehicle   += parseFloat(r.cat_value || 0);
      else if (r.asset_category === 'gold')    breakdown.gold      += parseFloat(r.cat_value || 0);
      else                                     breakdown.other     += parseFloat(r.cat_value || 0);
    }

    const liabilityBreakdown = {};
    for (const r of liabRes.rows) {
      liabilityBreakdown[r.liability_type] = parseFloat(r.type_total || 0);
    }
    if (creditDebt > 0) liabilityBreakdown.credit_card = creditDebt;

    // Save snapshot
    await query(
      `INSERT INTO net_worth_snapshots (user_id, total_assets, total_liabilities, net_worth, liquid_assets, illiquid_assets, breakdown)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
         total_assets=$2, total_liabilities=$3, net_worth=$4,
         liquid_assets=$5, illiquid_assets=$6, breakdown=$7`,
      [uid, totalAssets, totalLiabilities, netWorth, liquidAssets, illiquidAssets,
       { assets: breakdown, liabilities: liabilityBreakdown }]
    ).catch(() => {});

    res.json({
      netWorth: Math.round(netWorth),
      totalAssets: Math.round(totalAssets),
      totalLiabilities: Math.round(totalLiabilities),
      liquidAssets: Math.round(liquidAssets),
      illiquidAssets: Math.round(illiquidAssets),
      breakdown,
      liabilityBreakdown,
      components: {
        bankAccounts: Math.round(bankTotal),
        portfolio: Math.round(portfolioTotal),
        externalPortfolio: Math.round(extTotal),
        manualAssets: Math.round(manualAssetTotal),
        creditCardDebt: Math.round(creditDebt),
        otherLiabilities: Math.round(manualLiabTotal),
      },
    });
  } catch (err) { next(err); }
}

// ── Net Worth History ─────────────────────────────────────────────────────────
async function getNetWorthHistory(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT snapshot_date, net_worth, total_assets, total_liabilities
       FROM net_worth_snapshots WHERE user_id=$1
       ORDER BY snapshot_date DESC LIMIT 90`,
      [req.user.id]
    );
    res.json({ history: rows });
  } catch (err) { next(err); }
}

// ── Manual Assets CRUD ────────────────────────────────────────────────────────
async function getAssets(req, res, next) {
  try {
    const { rows } = await query(
      'SELECT * FROM manual_assets WHERE user_id=$1 ORDER BY current_value DESC',
      [req.user.id]
    );
    res.json({ assets: rows });
  } catch (err) { next(err); }
}

async function upsertAsset(req, res, next) {
  try {
    const { id, name, assetCategory, currentValue, purchaseValue, purchaseDate, notes, isIlliquid } = req.body;
    const ILLIQUID_CATS = ['real_estate','vehicle','business'];
    const illiquid = isIlliquid !== undefined ? isIlliquid : ILLIQUID_CATS.includes(assetCategory);

    if (id) {
      const { rows } = await query(
        `UPDATE manual_assets SET name=$1, asset_category=$2, current_value=$3,
           purchase_value=$4, purchase_date=$5, notes=$6, is_illiquid=$7,
           last_updated=NOW(), updated_at=NOW()
         WHERE id=$8 AND user_id=$9 RETURNING *`,
        [name, assetCategory, currentValue, purchaseValue || null, purchaseDate || null,
         notes || null, illiquid, id, req.user.id]
      );
      return res.json(rows[0]);
    }

    const { rows } = await query(
      `INSERT INTO manual_assets (user_id, name, asset_category, current_value, purchase_value, purchase_date, notes, is_illiquid)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, name, assetCategory, currentValue, purchaseValue || null,
       purchaseDate || null, notes || null, illiquid]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

async function deleteAsset(req, res, next) {
  try {
    await query('DELETE FROM manual_assets WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Asset deleted' });
  } catch (err) { next(err); }
}

// ── Manual Liabilities CRUD ───────────────────────────────────────────────────
async function getLiabilities(req, res, next) {
  try {
    const { rows } = await query(
      'SELECT * FROM manual_liabilities WHERE user_id=$1 ORDER BY outstanding_amount DESC',
      [req.user.id]
    );
    res.json({ liabilities: rows });
  } catch (err) { next(err); }
}

async function upsertLiability(req, res, next) {
  try {
    const { id, name, liabilityType, outstandingAmount, originalAmount, interestRate, emiAmount, tenureMonths, startDate, notes } = req.body;

    if (id) {
      const { rows } = await query(
        `UPDATE manual_liabilities SET name=$1, liability_type=$2, outstanding_amount=$3,
           original_amount=$4, interest_rate=$5, emi_amount=$6, tenure_months=$7,
           start_date=$8, notes=$9, updated_at=NOW()
         WHERE id=$10 AND user_id=$11 RETURNING *`,
        [name, liabilityType, outstandingAmount, originalAmount || null, interestRate || null,
         emiAmount || null, tenureMonths || null, startDate || null, notes || null, id, req.user.id]
      );
      return res.json(rows[0]);
    }

    const { rows } = await query(
      `INSERT INTO manual_liabilities (user_id, name, liability_type, outstanding_amount, original_amount, interest_rate, emi_amount, tenure_months, start_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.user.id, name, liabilityType, outstandingAmount, originalAmount || null,
       interestRate || null, emiAmount || null, tenureMonths || null, startDate || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

async function deleteLiability(req, res, next) {
  try {
    await query('DELETE FROM manual_liabilities WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Liability deleted' });
  } catch (err) { next(err); }
}

// ── Goals CRUD ────────────────────────────────────────────────────────────────
async function getGoals(req, res, next) {
  try {
    const { rows } = await query(
      'SELECT * FROM financial_goals WHERE user_id=$1 ORDER BY target_date ASC NULLS LAST',
      [req.user.id]
    );
    res.json({ goals: rows });
  } catch (err) { next(err); }
}

async function upsertGoal(req, res, next) {
  try {
    const { id, name, goalType, targetAmount, currentAmount, targetDate, monthlyContribution, color } = req.body;

    if (id) {
      const { rows } = await query(
        `UPDATE financial_goals SET name=$1, goal_type=$2, target_amount=$3,
           current_amount=$4, target_date=$5, monthly_contribution=$6, color=$7,
           is_completed=(current_amount >= target_amount), updated_at=NOW()
         WHERE id=$8 AND user_id=$9 RETURNING *`,
        [name, goalType, targetAmount, currentAmount || 0, targetDate || null,
         monthlyContribution || null, color || '#3b82f6', id, req.user.id]
      );
      return res.json(rows[0]);
    }

    const { rows } = await query(
      `INSERT INTO financial_goals (user_id, name, goal_type, target_amount, current_amount, target_date, monthly_contribution, color)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, name, goalType, targetAmount, currentAmount || 0,
       targetDate || null, monthlyContribution || null, color || '#3b82f6']
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

async function deleteGoal(req, res, next) {
  try {
    await query('DELETE FROM financial_goals WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Goal deleted' });
  } catch (err) { next(err); }
}

// ── External Portfolio Links ──────────────────────────────────────────────────
async function getExternalLinks(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT id, link_type, phone, pan_last4, consent_status, last_fetched, fetch_due_date, total_value, created_at
       FROM external_portfolio_links WHERE user_id=$1 ORDER BY created_at`,
      [req.user.id]
    );
    res.json({ links: rows });
  } catch (err) { next(err); }
}

async function linkExternalPortfolio(req, res, next) {
  try {
    const { linkType, phone, panLast4 } = req.body;

    // In production, this would trigger Setu/CAMSOnline/NSDL CAS statement request
    // For now, create the link record and mark as pending
    const fetchDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const { rows } = await query(
      `INSERT INTO external_portfolio_links (user_id, link_type, phone, pan_last4, consent_status, fetch_due_date)
       VALUES ($1,$2,$3,$4,'pending',$5)
       ON CONFLICT DO NOTHING RETURNING *`,
      [req.user.id, linkType, phone, panLast4 || null, fetchDue]
    );

    // Simulate fetch for demo (in prod: trigger NSDL/CDSL/CAMS CAS)
    const demoValues = { nsdl: 125000, cdsl: 85000, mf_central: 250000, zerodha: 320000, groww: 95000, upstox: 45000, others: 50000 };
    const mockValue = demoValues[linkType] || 50000;

    await query(
      `UPDATE external_portfolio_links SET
         consent_status='active', last_fetched=NOW(),
         fetch_due_date=$1, total_value=$2
       WHERE user_id=$3 AND link_type=$4`,
      [fetchDue, mockValue, req.user.id, linkType]
    );

    logger.info(`External portfolio linked: ${linkType} for user ${req.user.id}`);
    res.json({ message: `${linkType.toUpperCase()} linked successfully`, fetchDue, totalValue: mockValue });
  } catch (err) { next(err); }
}

async function refreshExternalPortfolio(req, res, next) {
  try {
    const { id } = req.params;
    const fetchDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Simulate refresh (in prod: re-fetch CAS statement)
    await query(
      `UPDATE external_portfolio_links SET last_fetched=NOW(), fetch_due_date=$1,
         total_value = total_value * (0.95 + RANDOM() * 0.15)
       WHERE id=$2 AND user_id=$3`,
      [fetchDue, id, req.user.id]
    );

    res.json({ message: 'Portfolio refreshed', nextRefreshDue: fetchDue });
  } catch (err) { next(err); }
}

async function deleteExternalLink(req, res, next) {
  try {
    await query('DELETE FROM external_portfolio_links WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Link removed' });
  } catch (err) { next(err); }
}

module.exports = {
  getNetWorth, getNetWorthHistory,
  getAssets, upsertAsset, deleteAsset,
  getLiabilities, upsertLiability, deleteLiability,
  getGoals, upsertGoal, deleteGoal,
  getExternalLinks, linkExternalPortfolio, refreshExternalPortfolio, deleteExternalLink,
};
