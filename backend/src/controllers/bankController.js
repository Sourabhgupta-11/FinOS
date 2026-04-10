const { query } = require("../db/pool");
const setuService = require("../services/setu");
const categorizationService = require("../services/categorization");
const { parse } = require("csv-parse/sync");
const logger = require("../utils/logger");

// ── Bank Accounts ─────────────────────────────────────────────────────────────
async function getAccounts(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT ba.*,
         COUNT(t.id) as transaction_count,
         SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END) as total_income,
         SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END) as total_expense
       FROM bank_accounts ba
       LEFT JOIN transactions t ON t.bank_account_id = ba.id
         AND t.transaction_date >= date_trunc('month', CURRENT_DATE)
       WHERE ba.user_id = $1
       GROUP BY ba.id
       ORDER BY ba.created_at`,
      [req.user.id],
    );
    res.json({ accounts: rows });
  } catch (err) {
    next(err);
  }
}

async function addAccount(req, res, next) {
  try {
    const {
      accountName,
      bankName,
      accountType,
      accountNumberMasked,
      ifscCode,
      balance,
      creditLimit,
      color,
    } = req.body;
    const { rows } = await query(
      `INSERT INTO bank_accounts
         (user_id, account_name, bank_name, account_type, account_number_masked, ifsc_code, balance, credit_limit, color, is_manual)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
       RETURNING *`,
      [
        req.user.id,
        accountName,
        bankName,
        accountType,
        accountNumberMasked,
        ifscCode || null,
        balance || 0,
        creditLimit || null,
        color || "#3b82f6",
      ],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function updateAccount(req, res, next) {
  try {
    const { balance, accountName, color } = req.body;
    const { rows } = await query(
      `UPDATE bank_accounts SET
         balance = COALESCE($1, balance),
         account_name = COALESCE($2, account_name),
         color = COALESCE($3, color),
         updated_at = NOW()
       WHERE id = $4 AND user_id = $5 RETURNING *`,
      [balance, accountName, color, req.params.id, req.user.id],
    );
    if (!rows[0]) return res.status(404).json({ error: "Account not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function deleteAccount(req, res, next) {
  try {
    await query("DELETE FROM bank_accounts WHERE id = $1 AND user_id = $2", [
      req.params.id,
      req.user.id,
    ]);
    res.json({ message: "Account removed" });
  } catch (err) {
    next(err);
  }
}

// ── Setu AA Integration ───────────────────────────────────────────────────────
async function initiateSetuConsent(req, res, next) {
  try {
    if (!process.env.SETU_CLIENT_ID) {
      return res.status(503).json({
        error: "Bank linking not configured. Use manual entry or CSV import.",
      });
    }

    const userWithPhone = { ...req.user, phone: req.body.phone };
    const consent = await setuService.createConsent(
      userWithPhone,
      req.body.fiTypes,
    );

    res.json({
      consentId: consent.id,
      redirectUrl: consent.redirectUrl,
      status: consent.status,
    });
  } catch (err) {
    next(err);
  }
}

async function setuCallback(req, res, next) {
  try {
    const { consentId, accountId } = req.body;
    const status = await setuService.getConsentStatus(consentId);

    if (status.status !== "ACTIVE") {
      return res.json({
        status: status.status,
        message: "Consent not yet active",
      });
    }

    // Fetch FI data
    const fiData =
      process.env.NODE_ENV === "development"
        ? setuService.getMockBankData()
        : await setuService.fetchFIData(consentId);

    // Update account setu status
    await query(
      `UPDATE bank_accounts SET setu_consent_id = $1, setu_consent_status = 'active', last_synced = NOW()
       WHERE id = $2 AND user_id = $3`,
      [consentId, accountId, req.user.id],
    );

    // Parse and insert transactions
    const txs = setuService.parseSetuTransactions(
      fiData,
      accountId,
      req.user.id,
    );
    let inserted = 0;
    for (const tx of txs) {
      try {
        await query(
          `INSERT INTO transactions (user_id, bank_account_id, type, amount, description, merchant, transaction_date, source, raw_data)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT DO NOTHING`,
          [
            tx.user_id,
            tx.bank_account_id,
            tx.type,
            tx.amount,
            tx.description,
            tx.merchant,
            tx.transaction_date,
            tx.source,
            tx.raw_data,
          ],
        );
        inserted++;
      } catch {
        /* skip duplicates */
      }
    }

    res.json({ message: `Synced ${inserted} transactions`, inserted });
  } catch (err) {
    next(err);
  }
}

// ── Transactions ──────────────────────────────────────────────────────────────
async function getTransactions(req, res, next) {
  try {
    const {
      from,
      to,
      type,
      categoryId,
      accountId,
      limit = 50,
      offset = 0,
      search,
    } = req.query;

    let sql = `
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             ba.account_name, ba.bank_name
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN bank_accounts ba ON ba.id = t.bank_account_id
      WHERE t.user_id = $1
    `;
    const params = [req.user.id];
    let p = 2;

    if (from) {
      sql += ` AND t.transaction_date >= $${p++}`;
      params.push(from);
    }
    if (to) {
      sql += ` AND t.transaction_date <= $${p++}`;
      params.push(to);
    }
    if (type) {
      sql += ` AND t.type = $${p++}`;
      params.push(type);
    }
    if (categoryId) {
      sql += ` AND t.category_id = $${p++}`;
      params.push(categoryId);
    }
    if (accountId) {
      sql += ` AND t.bank_account_id = $${p++}`;
      params.push(accountId);
    }
    if (search) {
      sql += ` AND (t.description ILIKE $${p} OR t.merchant ILIKE $${p++})`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT $${p++} OFFSET $${p++}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await query(sql, params);

    // Total count
    const countRes = await query(
      `SELECT COUNT(*) FROM transactions WHERE user_id = $1`,
      [req.user.id],
    );

    res.json({ transactions: rows, total: parseInt(countRes.rows[0].count) });
  } catch (err) {
    next(err);
  }
}

async function addTransaction(req, res, next) {
  try {
    let {
      bankAccountId,
      categoryId,
      type,
      amount,
      description,
      merchant,
      notes,
      tags,
      transactionDate,
      isRecurring,
      recurringInterval,
    } = req.body;

    // ── AI Auto-categorization ──────────────────────────────────────────────
    // If no category provided and it's an expense, use AI to categorize
    if (!categoryId && type === "expense" && (description || merchant)) {
      try {
        const { rows: categories } = await query(
          `SELECT id, name FROM categories WHERE type = 'expense' ORDER BY name`,
        );

        const suggestedCategoryId =
          await categorizationService.categorizeExpense(
            description,
            merchant,
            categories,
          );

        if (suggestedCategoryId) {
          categoryId = suggestedCategoryId;
          logger.info(
            `Auto-categorized expense: "${description}" → category ID ${categoryId}`,
          );
        }
      } catch (err) {
        logger.warn(
          "Auto-categorization failed, proceeding without category:",
          err.message,
        );
      }
    }

    const { rows } = await query(
      `INSERT INTO transactions
         (user_id, bank_account_id, category_id, type, amount, description, merchant,
          notes, tags, transaction_date, is_recurring, recurring_interval, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'manual')
       RETURNING *`,
      [
        req.user.id,
        bankAccountId || null,
        categoryId || null,
        type,
        amount,
        description,
        merchant || null,
        notes || null,
        tags || null,
        transactionDate,
        isRecurring || false,
        recurringInterval || null,
      ],
    );

    // Update account balance
    if (bankAccountId) {
      const delta =
        type === "income" ? parseFloat(amount) : -parseFloat(amount);
      await query(
        "UPDATE bank_accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
        [delta, bankAccountId],
      );
    }

    // Check budget alerts
    await checkBudgetAlert(req.user.id, categoryId, amount);

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function updateTransaction(req, res, next) {
  try {
    const { categoryId, description, merchant, notes, tags, transactionDate } =
      req.body;
    const { rows } = await query(
      `UPDATE transactions SET
         category_id = COALESCE($1, category_id),
         description = COALESCE($2, description),
         merchant = COALESCE($3, merchant),
         notes = COALESCE($4, notes),
         tags = COALESCE($5, tags),
         transaction_date = COALESCE($6, transaction_date),
         updated_at = NOW()
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [
        categoryId,
        description,
        merchant,
        notes,
        tags,
        transactionDate,
        req.params.id,
        req.user.id,
      ],
    );
    if (!rows[0])
      return res.status(404).json({ error: "Transaction not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function deleteTransaction(req, res, next) {
  try {
    await query("DELETE FROM transactions WHERE id = $1 AND user_id = $2", [
      req.params.id,
      req.user.id,
    ]);
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
}

// ── CSV Import ────────────────────────────────────────────────────────────────
async function importCSV(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const content = req.file.buffer.toString("utf-8");
    let records;
    try {
      records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: true,
        cast_date: false,
      });
    } catch {
      return res.status(400).json({ error: "Invalid CSV format" });
    }

    const accountId = req.body.accountId || null;
    let inserted = 0,
      skipped = 0;

    for (const row of records) {
      // Try common column name patterns
      const date =
        row.Date || row.date || row.TransactionDate || row["Transaction Date"];
      const desc =
        row.Description ||
        row.Narration ||
        row.narration ||
        row.description ||
        row.Particulars;
      const debit = parseFloat(
        row.Debit ||
          row.debit ||
          row.Withdrawal ||
          row["Withdrawal Amount"] ||
          0,
      );
      const credit = parseFloat(
        row.Credit || row.credit || row.Deposit || row["Deposit Amount"] || 0,
      );
      const amount = debit > 0 ? debit : credit;
      const type = credit > 0 ? "income" : "expense";

      if (!date || !amount || !desc) {
        skipped++;
        continue;
      }

      // Parse date
      let txDate;
      try {
        const d = new Date(date);
        txDate = isNaN(d) ? null : d.toISOString().split("T")[0];
      } catch {
        skipped++;
        continue;
      }

      try {
        await query(
          `INSERT INTO transactions
             (user_id, bank_account_id, type, amount, description, transaction_date, source)
           VALUES ($1,$2,$3,$4,$5,$6,'csv_import')`,
          [req.user.id, accountId, type, amount, desc, txDate],
        );
        inserted++;
      } catch {
        skipped++;
      }
    }

    res.json({ inserted, skipped, total: records.length });
  } catch (err) {
    next(err);
  }
}

// ── Expense Analytics ─────────────────────────────────────────────────────────
async function getAnalytics(req, res, next) {
  try {
    const { period = "month", from, to } = req.query;
    let dateFilter = "";
    const params = [req.user.id];

    if (period === "month") {
      dateFilter = `AND transaction_date >= date_trunc('month', CURRENT_DATE)`;
    } else if (period === "year") {
      dateFilter = `AND transaction_date >= date_trunc('year', CURRENT_DATE)`;
    } else if (from && to) {
      dateFilter = `AND transaction_date BETWEEN $2 AND $3`;
      params.push(from, to);
    }

    const [byCategory, monthly, totals] = await Promise.all([
      query(
        `SELECT c.name, c.icon, c.color,
           SUM(t.amount) as total, COUNT(t.id) as count
         FROM transactions t
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.user_id = $1 AND t.type = 'expense' ${dateFilter}
         GROUP BY c.name, c.icon, c.color
         ORDER BY total DESC`,
        params,
      ),
      query(
        `SELECT
           to_char(transaction_date, 'YYYY-MM') as month,
           SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
           SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
         FROM transactions
         WHERE user_id = $1
         GROUP BY month
         ORDER BY month DESC
         LIMIT 12`,
        [req.user.id],
      ),
      query(
        `SELECT
           SUM(CASE WHEN type='income' AND transaction_date >= date_trunc('month', CURRENT_DATE) THEN amount ELSE 0 END) as month_income,
           SUM(CASE WHEN type='expense' AND transaction_date >= date_trunc('month', CURRENT_DATE) THEN amount ELSE 0 END) as month_expense,
           SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
           SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expense
         FROM transactions WHERE user_id = $1`,
        [req.user.id],
      ),
    ]);

    res.json({
      byCategory: byCategory.rows,
      monthly: monthly.rows,
      totals: totals.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// ── Budgets ───────────────────────────────────────────────────────────────────
async function getBudgets(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT b.*, c.name as category_name, c.icon, c.color,
         COALESCE(SUM(t.amount), 0) as spent
       FROM budgets b
       LEFT JOIN categories c ON c.id = b.category_id
       LEFT JOIN transactions t ON t.category_id = b.category_id
         AND t.user_id = b.user_id
         AND t.type = 'expense'
         AND t.transaction_date >= date_trunc('month', CURRENT_DATE)
       WHERE b.user_id = $1 AND b.is_active = true
       GROUP BY b.id, c.name, c.icon, c.color
       ORDER BY b.created_at`,
      [req.user.id],
    );

    const budgetsWithPct = rows.map((b) => ({
      ...b,
      pct: b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0,
    }));

    res.json({ budgets: budgetsWithPct });
  } catch (err) {
    next(err);
  }
}

async function upsertBudget(req, res, next) {
  try {
    const { categoryId, name, amount, period, alertAtPct } = req.body;

    // Check if budget exists for this user+category
    const { rows: existingRows } = await query(
      `SELECT id FROM budgets WHERE user_id = $1 AND category_id IS NOT DISTINCT FROM $2`,
      [req.user.id, categoryId || null],
    );

    let rows;
    if (existingRows.length > 0) {
      // Update existing
      const result = await query(
        `UPDATE budgets SET amount=$1, period=$2, alert_at_pct=$3, updated_at=NOW()
         WHERE user_id=$4 AND category_id IS NOT DISTINCT FROM $5
         RETURNING *`,
        [
          amount,
          period || "monthly",
          alertAtPct || 80,
          req.user.id,
          categoryId || null,
        ],
      );
      rows = result.rows;
    } else {
      // Insert new
      const result = await query(
        `INSERT INTO budgets (user_id, category_id, name, amount, period, start_date, alert_at_pct)
         VALUES ($1,$2,$3,$4,$5,date_trunc('month', CURRENT_DATE),$6)
         RETURNING *`,
        [
          req.user.id,
          categoryId || null,
          name,
          amount,
          period || "monthly",
          alertAtPct || 80,
        ],
      );
      rows = result.rows;
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function deleteBudget(req, res, next) {
  try {
    await query("DELETE FROM budgets WHERE id = $1 AND user_id = $2", [
      req.params.id,
      req.user.id,
    ]);
    res.json({ message: "Budget deleted" });
  } catch (err) {
    next(err);
  }
}

async function getCategories(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT DISTINCT ON (name) * FROM categories WHERE user_id IS NULL OR user_id = $1 ORDER BY name, is_default DESC`,
      [req.user.id],
    );
    res.json({ categories: rows });
  } catch (err) {
    next(err);
  }
}

async function checkBudgetAlert(userId, categoryId, amount) {
  if (!categoryId) return;
  try {
    const { rows } = await query(
      `SELECT b.*, c.name as category_name,
         COALESCE(SUM(t.amount), 0) as spent
       FROM budgets b
       LEFT JOIN categories c ON c.id = b.category_id
       LEFT JOIN transactions t ON t.category_id = b.category_id
         AND t.user_id = b.user_id AND t.type = 'expense'
         AND t.transaction_date >= date_trunc('month', CURRENT_DATE)
       WHERE b.user_id = $1 AND b.category_id = $2 AND b.is_active = true
       GROUP BY b.id, c.name`,
      [userId, categoryId],
    );

    const budget = rows[0];
    if (!budget) return;

    const newSpent = parseFloat(budget.spent) + parseFloat(amount);
    const pct = Math.round((newSpent / parseFloat(budget.amount)) * 100);

    if (pct >= budget.alert_at_pct) {
      const { sendPushToUser } = require("../services/pushNotification");
      await sendPushToUser(
        userId,
        `Budget alert: ${budget.category_name}`,
        `You've used ${pct}% of your ₹${parseFloat(budget.amount).toLocaleString("en-IN")} budget`,
        { type: "budget_alert", url: "/expenses" },
      ).catch(() => {});
    }
  } catch {
    /* non-fatal */
  }
}

// ── AI Category Suggestions ────────────────────────────────────────────────────
async function getCategorySuggestions(req, res, next) {
  try {
    const { description, merchant, type = "expense" } = req.query;

    // Get available categories
    const { rows: categories } = await query(
      `SELECT id, name FROM categories WHERE type = $1 ORDER BY name`,
      [type],
    );

    // Get suggestions from categorization service
    const suggestions = await categorizationService.getSuggestedCategories(
      description,
      merchant,
      categories,
    );

    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  initiateSetuConsent,
  setuCallback,
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  importCSV,
  getAnalytics,
  getBudgets,
  upsertBudget,
  deleteBudget,
  getCategories,
  getCategorySuggestions,
};
