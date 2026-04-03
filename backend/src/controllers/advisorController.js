const Groq = require('groq-sdk');
const { validationResult } = require('express-validator');
const { query } = require('../db/pool');
const logger = require('../utils/logger');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Free Groq models — pick one:
//   llama-3.3-70b-versatile   best quality (recommended)
//   llama3-8b-8192            fastest response
//   mixtral-8x7b-32768        32k context window
const MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

// ── RAG: Indian personal finance knowledge base ───────────────────────────────
const FINANCE_KB = `
## Indian Personal Finance Knowledge Base

### SIP & Mutual Funds
- SIP: Invest fixed amount monthly. Works on rupee cost averaging — no need to time market.
- Index Funds: Track Nifty 50, Nifty Next 50, Nifty Midcap 150. Expense ratio 0.1–0.2%. Best for beginners.
- Flexi Cap Funds: Fund manager picks large/mid/small mix. Good for medium risk.
- ELSS: Tax-saving MF, 3-year lock-in, qualifies for 80C deduction (up to ₹1.5L).
- Debt Funds: Liquid funds, overnight funds — for parking emergency fund or short-term money.
- Direct vs Regular plans: ALWAYS pick Direct plans (no commission, ~1% higher annual returns).
- Platforms: Zerodha Coin, Groww, Kuvera (all zero commission for direct plans).

### Tax Saving
- 80C (₹1.5L limit): ELSS, PPF, EPF, LIC premium, NSC, 5yr tax-saver FD, home loan principal.
- 80D: Health insurance — ₹25k self+family, ₹50k if parents are senior citizens.
- 80CCD(1B): NPS — extra ₹50k deduction beyond 80C limit.
- 80TTA: ₹10k deduction on savings account interest (non-senior citizens).
- Standard Deduction: ₹50k for all salaried employees (automatic).
- HRA: Exempt if paying rent (calculate: min of actual HRA, 50% salary in metro/40% non-metro, rent paid minus 10% salary).
- New vs Old Regime: If your total deductions > ₹3.75L → old regime wins. Otherwise new regime is better.
- New regime slabs (FY 2024-25): 0-3L=0%, 3-7L=5%, 7-10L=10%, 10-12L=15%, 12-15L=20%, >15L=30%.

### Emergency Fund
- Target: 6 months of monthly expenses (minimum 3 months).
- Where: High-interest savings account (IDFC First ~7%, AU Small Finance ~7%) or Liquid MF.
- Rule: Build emergency fund BEFORE investing in equity/stocks.
- DO NOT put emergency fund in equity, stocks, or long lock-in products.

### Insurance
- Term Life Insurance: Pure risk cover, no maturity benefit, 10–15x annual income.
  Buy before 35. Brands: LIC, HDFC Life, ICICI Pru, Max Life. Buy direct on website.
- Health Insurance: Min ₹5L, prefer ₹10–25L in metros. Family floater works for family.
  Top: Niva Bupa, Care Health, HDFC Ergo, Star Health.
- AVOID: ULIPs, endowment plans, money-back plans (poor returns + high charges).
- Employer cover alone is insufficient — you lose it when you change jobs.

### Long-term Savings
- EPF: 12% basic salary + 12% employer. Interest 8.25%. EEE tax (exempt-exempt-exempt). Mandatory.
- VPF: Voluntary extra contribution to EPF — same 8.25% guaranteed, great risk-free option.
- PPF: 7.1% guaranteed. 15 yr lock-in, extendable. ₹500 min, ₹1.5L max/year. EEE tax.
- NPS: Equity/debt mix, market-linked. Extra 80CCD deduction. Lock till 60. Good for retirement.

### Comparison Table
| Product     | Returns   | Risk  | Lock-in | Best Use              |
|-------------|-----------|-------|---------|----------------------|
| FD          | 6.5–8%    | None  | Fixed   | 1–3 year goals       |
| PPF         | 7.1%      | None  | 15 yr   | Long-term, tax-free  |
| ELSS MF     | 12–15%*   | High  | 3 yr    | Tax saving + wealth  |
| Nifty 50 IF | 12–14%*   | Med   | None    | Wealth creation      |
| NPS         | 10–12%*   | Med   | Till 60 | Retirement           |
| Gold        | 8–10%*    | Med   | None    | Hedge (max 10%)      |
*Expected long-term, not guaranteed.

### Priority Order for New Investor
1. Emergency fund (3–6 months expenses) → liquid/savings account
2. Term insurance (if dependants) + health insurance
3. Clear high-interest debt (credit cards, personal loans)
4. 80C via ELSS or PPF (save tax + grow wealth)
5. NPS for extra ₹50k deduction
6. Nifty 50 index fund SIP for long-term wealth
7. Direct equity only after above steps

### Common Mistakes
- Buying ULIPs / endowment plans — avoid completely
- Investing without emergency fund
- Regular MF plans instead of Direct
- Stopping SIP during market crashes (worst time to stop)
- Ignoring insurance when young (cheapest then)
- All money in savings account / FD (inflation eats real value)
- Not updating nominations in bank/MF/insurance accounts

### Key Formulas
- SIP future value: P × ((1+r)^n − 1) / r × (1+r) where r = monthly rate, n = months
- Rule of 72: years to double = 72 ÷ annual return (e.g. 12% → 6 years)
- Emergency fund = monthly expenses × 6
- Term cover = annual income × 10–15
- Retirement corpus needed = annual expenses × 25 (4% withdrawal rule)
`;

const SYSTEM_PROMPT = `You are FinBot, an expert AI financial advisor specialising in Indian personal finance for salaried professionals and self-employed individuals.

${FINANCE_KB}

## How to respond
- Use ₹ symbol for all amounts
-Ensure everyone's risk appetite and think like top investors of global world.
- Give specific, actionable steps with real product names (PPF, ELSS, Nifty 50, etc.)
- Keep responses focused — 3–8 sentences or short bullet points
- Personalise advice if you have the user's salary/age/risk profile
- Approximate returns are fine but always say "expected, not guaranteed"
- If the question involves legal tax specifics, suggest consulting a CA
- Be encouraging — most Indians are underinvested, help them take the first step
- Never recommend individual stocks by name
-always respond like using examples like ANkur Warikoo, Rakesh Jhunjhunwala, Porinju Veliyath, etc. to make it more relatable and inspiring for users.`;

// ── Route handlers ────────────────────────────────────────────────────────────

async function createSession(req, res, next) {
  try {
    const title = req.body.title || 'New conversation';
    const { rows } = await query(
      'INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at',
      [req.user.id, title]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function chat(req, res, next) {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

 const message =
  req.body.message ||
  req.body.query ||
  req.body.text;

const { sessionId } = req.body;
    let activeSessionId = sessionId;

    // Auto-create session if none provided
    if (!activeSessionId) {
      const { rows } = await query(
        'INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id',
        [req.user.id, message.substring(0, 60)]
      );
      activeSessionId = rows[0].id;
    }

    // Verify session ownership
    const sessionCheck = await query(
      'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [activeSessionId, req.user.id]
    );
    if (!sessionCheck.rows[0]) return res.status(403).json({ error: 'Session not found' });

    // Fetch last 20 messages for context
    const history = await query(
      'SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT 20',
      [activeSessionId]
    );

    // Fetch user profile for personalisation
    const profileResult = await query(
      'SELECT * FROM financial_profiles WHERE user_id = $1',
      [req.user.id]
    );
    const profile = profileResult.rows[0];

    let profileCtx = '';
    if (profile) {
      const surplus = parseFloat(profile.salary) - parseFloat(profile.monthly_expenses || profile.salary * 0.5);
      profileCtx = `\n\n[User profile] Salary: ₹${parseFloat(profile.salary).toLocaleString('en-IN')}/mo | Age: ${profile.age} | Risk: ${profile.risk_level} | Goal: ${profile.goal} | Expenses: ₹${parseFloat(profile.monthly_expenses || 0).toLocaleString('en-IN')}/mo | Surplus: ₹${surplus.toLocaleString('en-IN')}/mo | Insurance: ${profile.has_insurance ? 'Yes' : 'No'} | Emergency fund: ${profile.emergency_fund_months || 0} months`;
    }

    // Build messages for Groq (OpenAI-compatible format)
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + profileCtx },
      ...history.rows.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    // Call Groq API
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.9,
    });

    const reply = completion.choices[0]?.message?.content
      || 'Sorry, I could not generate a response. Please try again.';
    const tokensUsed = (completion.usage?.prompt_tokens || 0)
      + (completion.usage?.completion_tokens || 0);

    // Persist messages
    await query(
      'INSERT INTO chat_messages (session_id, user_id, role, content) VALUES ($1,$2,$3,$4)',
      [activeSessionId, req.user.id, 'user', message]
    );
    await query(
      'INSERT INTO chat_messages (session_id, user_id, role, content, tokens_used) VALUES ($1,$2,$3,$4,$5)',
      [activeSessionId, req.user.id, 'assistant', reply, tokensUsed]
    );
    await query('UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1', [activeSessionId]);

    logger.info('Groq chat response', { userId: req.user.id, model: MODEL, tokens: tokensUsed });

    res.json({ message: reply, sessionId: activeSessionId, tokensUsed, model: MODEL });
  } catch (err) {
    if (err.status === 429) {
      return res.status(429).json({ error: 'AI rate limit reached. Please wait a moment and try again.' });
    }
    if (err.status === 401) {
      logger.error('Invalid GROQ_API_KEY');
      return res.status(500).json({ error: 'AI service not configured correctly. Check GROQ_API_KEY.' });
    }
    next(err);
  }
}

async function getChatHistory(req, res, next) {
  try {
    const { sessionId } = req.params;

    if (sessionId) {
      const msgs = await query(
        'SELECT id, role, content, created_at FROM chat_messages WHERE session_id = $1 AND user_id = $2 ORDER BY created_at ASC',
        [sessionId, req.user.id]
      );
      return res.json({ messages: msgs.rows });
    }

    const sessions = await query(
      `SELECT cs.id, cs.title, cs.created_at, cs.updated_at, COUNT(cm.id)::int AS message_count
       FROM chat_sessions cs
       LEFT JOIN chat_messages cm ON cm.session_id = cs.id
       WHERE cs.user_id = $1
       GROUP BY cs.id ORDER BY cs.updated_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ sessions: sessions.rows });
  } catch (err) { next(err); }
}

module.exports = { chat, getChatHistory, createSession };
