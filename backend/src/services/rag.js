/**
 * RAG (Retrieval-Augmented Generation) service
 * Lightweight semantic retrieval without external vector DB.
 * Chunks the Indian finance knowledge base and retrieves
 * the most relevant sections for each query.
 */

// ── Knowledge base chunks ─────────────────────────────────────────────────────
const KB_CHUNKS = [
  {
    id: 'sip_basics',
    topic: 'SIP mutual funds investing',
    keywords: ['sip', 'mutual fund', 'invest', 'index', 'elss', 'flexi', 'direct', 'groww', 'zerodha', 'kuvera', 'nifty'],
    content: `## SIP & Mutual Funds
- SIP (Systematic Investment Plan): Invest fixed amount monthly. Works on rupee cost averaging.
- Index Funds: Track Nifty 50, Nifty Next 50, Nifty Midcap 150. Expense ratio 0.1–0.2%. Best for beginners.
- Flexi Cap Funds: Fund manager picks large/mid/small mix. Good for medium risk.
- ELSS: Tax-saving MF, 3-year lock-in, qualifies for 80C deduction (up to ₹1.5L).
- Debt Funds: Liquid funds, overnight funds — for emergency fund or short-term money.
- ALWAYS pick Direct plans (no commission, ~1% higher annual returns).
- Platforms: Zerodha Coin, Groww, Kuvera — all free for direct plans.
- Top index funds: UTI Nifty 50, Nippon India Index, HDFC Index Nifty 50.
- SIP FV formula: P × ((1+r)^n − 1) / r × (1+r), where r = monthly rate, n = months.`,
  },
  {
    id: 'tax_saving',
    topic: 'tax saving deductions 80C 80D HRA NPS',
    keywords: ['tax', '80c', '80d', 'hra', 'nps', 'deduction', 'old regime', 'new regime', 'income tax', 'tds', 'itr', 'ca', 'fy', 'elss', 'ppf'],
    content: `## Indian Tax Saving
- 80C (₹1.5L limit): ELSS, PPF, EPF, LIC premium, NSC, 5yr FD, home loan principal.
- 80D: Health insurance — ₹25k self+family, ₹50k if parents are senior citizens.
- 80CCD(1B): NPS extra ₹50k deduction beyond 80C.
- 80TTA: ₹10k deduction on savings account interest.
- Standard Deduction: ₹75k for salaried (FY 2024-25 new regime), ₹50k old regime.
- HRA exemption: min(actual HRA, 50% salary metro/40% non-metro, rent paid − 10% salary).
- New regime slabs FY 2024-25: 0–3L=0%, 3–7L=5%, 7–10L=10%, 10–12L=15%, 12–15L=20%, >15L=30%.
- Old vs New: If total deductions > ₹3.75L → old regime wins. Otherwise new regime better.
- 87A rebate: Old regime tax=0 if income ≤ ₹5L. New regime tax=0 if income ≤ ₹7L.`,
  },
  {
    id: 'emergency_fund',
    topic: 'emergency fund savings liquid',
    keywords: ['emergency', 'emergency fund', 'savings', 'liquid', 'safety', 'crisis', 'job loss', 'buffer', 'idfc', 'au bank'],
    content: `## Emergency Fund
- Target: 6 months of monthly expenses (minimum 3 months).
- Where to keep: High-interest savings account (IDFC First ~7%, AU Small Finance ~7%) or Liquid MF.
- Build emergency fund BEFORE investing in equity/stocks — this is non-negotiable.
- DO NOT put emergency fund in equity, stocks, or long lock-in products.
- Emergency fund = monthly expenses × 6. Calculate your number first.
- Liquid MFs (overnight/liquid funds): Return ~6.5–7%, withdraw in 1 day. Better than savings a/c.`,
  },
  {
    id: 'insurance',
    topic: 'term life insurance health insurance',
    keywords: ['insurance', 'term', 'life insurance', 'health insurance', 'ulip', 'endowment', 'mediclaim', 'cover', 'policy', 'premium'],
    content: `## Insurance
- Term Life: Pure risk cover, no maturity benefit, 10–15x annual income. Buy before 35.
  Brands: LIC, HDFC Life, ICICI Pru, Max Life. Buy DIRECT on website (cheaper).
- Health Insurance: Min ₹5L, prefer ₹10–25L in metros. Family floater for family.
  Top brands: Niva Bupa, Care Health, HDFC Ergo, Star Health.
- AVOID: ULIPs, endowment plans, money-back plans — poor returns, high charges.
- Employer cover alone is insufficient — you lose it on job change.
- Buy term insurance when young: ₹1Cr cover at 25 costs ₹6–8k/year, at 40 costs ₹20–25k/year.`,
  },
  {
    id: 'retirement_savings',
    topic: 'PPF NPS EPF retirement long term savings',
    keywords: ['ppf', 'nps', 'epf', 'vpf', 'retirement', 'pension', 'long term', 'corpus', 'provident fund'],
    content: `## Long-term & Retirement Savings
- EPF: 12% basic salary deducted, employer adds 12%. Interest 8.25%. EEE tax. Mandatory for salaried.
- VPF: Voluntary extra contribution to EPF — same 8.25% guaranteed, great risk-free option.
- PPF: 7.1% guaranteed. 15 yr lock-in, extendable. ₹500 min, ₹1.5L max/year. EEE tax.
- NPS: Market-linked (equity+debt mix). Lock till 60. Extra ₹50k deduction under 80CCD.
  Choose Tier-1 for retirement. Equity option gives 10–12% expected returns.
- Retirement corpus needed: Annual expenses × 25 (4% safe withdrawal rule).
- Rule of 72: Years to double = 72 ÷ annual return (12% → 6 years to double).`,
  },
  {
    id: 'salary_allocation',
    topic: 'salary allocation budget expenses savings rate',
    keywords: ['salary', 'allocation', 'budget', 'expenses', 'savings rate', 'surplus', 'income', 'ctc', 'in-hand', 'take home'],
    content: `## Salary Allocation Framework
- 50-30-20 Rule: 50% needs, 30% investments, 20% wants/buffer.
- For wealth building: Target 30–40% savings rate.
- Priority order:
  1. Emergency fund (3–6 months expenses) → liquid/savings account
  2. Term insurance + health insurance
  3. Clear high-interest debt (credit cards, personal loans >12% interest)
  4. 80C via ELSS or PPF (save tax + grow wealth)
  5. NPS for extra ₹50k deduction
  6. Nifty 50 index fund SIP for long-term wealth
  7. Direct equity only after above steps
- Common mistake: Investing in equity without emergency fund.`,
  },
  {
    id: 'debt_credit_cards',
    topic: 'debt credit card EMI loan',
    keywords: ['debt', 'credit card', 'loan', 'emi', 'interest', 'personal loan', 'pay off', 'outstanding', 'dues'],
    content: `## Debt Management
- Credit card interest: 36–42% per year. PAY IN FULL EVERY MONTH. Never carry balance.
- Clear all debt >12% interest before investing — guaranteed return = interest saved.
- Personal loan interest: 12–18%. Consider transferring to lower-rate alternatives.
- Home loan interest: 8.5–9.5%. Can continue — Section 24b gives ₹2L deduction.
- EMI should not exceed 40% of take-home salary.
- Debt avalanche method: Pay minimums on all, extra money to highest-interest debt first.
- Debt snowball method: Pay smallest debt first for psychological momentum.`,
  },
  {
    id: 'real_estate_gold',
    topic: 'real estate property gold investment',
    keywords: ['real estate', 'property', 'house', 'flat', 'gold', 'sgb', 'sovereign gold bond', 'buy house', 'rent'],
    content: `## Real Estate & Gold
- Renting vs buying: In metro cities, rent yields are 2–3% but mortgage costs 8.5%+. Usually better to invest difference.
- If buying: Down payment 20%+. Total EMI < 30% of take-home salary.
- Home loan benefits: Section 80C (principal ₹1.5L), Section 24b (interest ₹2L).
- Gold: Keep max 5–10% of portfolio. Prefer Sovereign Gold Bonds (SGBs) — 2.5% extra interest, no capital gains tax if held till maturity.
- REITs (Embassy, Mindspace): Listed on exchange, 7–8% dividend yield, good real estate exposure without buying property.`,
  },
  {
    id: 'stock_market',
    topic: 'stocks equity market direct investing NSE BSE',
    keywords: ['stock', 'equity', 'share', 'market', 'nse', 'bse', 'sensex', 'nifty', 'zerodha', 'groww', 'demat', 'trading'],
    content: `## Stock Market / Direct Equity
- Start with index funds before direct stocks. Even Warren Buffett recommends index funds for most investors.
- If doing direct equity: Start with Nifty 50 companies only. Understand the business first.
- Fundamental analysis: P/E ratio, revenue growth, debt levels, ROE, promoter holding.
- NEVER invest borrowed money in stocks.
- SIP strategy beats lump sum in most market conditions (rupee cost averaging).
- Avoid: IPOs (avg returns poor), F&O trading (95% retail traders lose), penny stocks.
- Demat account: Zerodha, Groww, Upstox. Zerodha most trusted, Groww most beginner-friendly.`,
  },
  {
    id: 'first_salary',
    topic: 'first salary fresher beginner new job',
    keywords: ['first salary', 'first job', 'fresher', 'beginner', 'start', 'new to investing', 'just started', '22', '23', '24', '25'],
    content: `## First Salary / Beginner Guide
- Month 1: Open a high-interest savings account. Start building emergency fund.
- Month 2: Start SIP of ₹1,000–₹2,000 in Nifty 50 index fund. Small start is fine.
- Month 3: Buy term insurance (if dependants) + health insurance (if employer cover is low).
- Month 4: Open ELSS SIP for 80C tax saving. Don't wait till March.
- Rule: Invest before you spend. Set up auto-debit on salary credit day.
- Don't wait for "the right time" — time IN the market > timing the market.
- Starting at 22 vs 32: ₹5,000/month SIP at 22 = ~₹5.2Cr at 60. Starting at 32 = ~₹1.8Cr.`,
  },
  {
    id: 'common_mistakes',
    topic: 'common investing mistakes avoid',
    keywords: ['mistake', 'avoid', 'wrong', 'ulip', 'endowment', 'regular plan', 'timing', 'panic sell'],
    content: `## Common Investing Mistakes to Avoid
1. Buying ULIPs/endowment plans from bank — agents earn 30–40% commission. Returns ~4-5%.
2. Regular MF plans instead of Direct — you lose 1% returns every year (₹10L over 20 years = ₹20L extra).
3. Stopping SIP during market crashes — worst time to stop, best time to buy more.
4. No emergency fund before investing — one crisis wipes out years of investments.
5. All money in savings account/FD — inflation at 6% eats your real returns.
6. Not reviewing/updating nominations in bank/MF/insurance.
7. FOMO investing in crypto/options/IPOs without understanding.
8. Delaying term insurance — every year you wait, premium increases.`,
  },
];

/**
 * Compute simple relevance score: keyword overlap + topic similarity
 */
function scoreChunk(chunk, query) {
  const q = query.toLowerCase();
  const words = q.split(/\s+/);
  let score = 0;

  // Keyword matching
  for (const kw of chunk.keywords) {
    if (q.includes(kw)) score += 3;
  }

  // Word-level matching
  for (const word of words) {
    if (word.length > 3 && chunk.content.toLowerCase().includes(word)) score += 1;
    if (word.length > 3 && chunk.topic.toLowerCase().includes(word)) score += 2;
  }

  return score;
}

/**
 * Retrieve top-k relevant chunks for a query
 */
function retrieveContext(query, topK = 3) {
  const scored = KB_CHUNKS.map(chunk => ({
    chunk,
    score: scoreChunk(chunk, query),
  }));

  scored.sort((a, b) => b.score - a.score);

  // Always include at least 1 chunk even if score is 0
  return scored
    .filter((s, i) => i < topK && (s.score > 0 || i === 0))
    .map(s => s.chunk.content);
}

/**
 * Build a RAG-augmented system prompt
 */
function buildRAGPrompt(query, userProfile = null) {
  const context = retrieveContext(query, 3);

  let profileCtx = '';
  if (userProfile) {
    const surplus = parseFloat(userProfile.salary) - parseFloat(userProfile.monthly_expenses || userProfile.salary * 0.5);
    profileCtx = `\n\n[User Financial Profile]
- Monthly salary: ₹${parseFloat(userProfile.salary).toLocaleString('en-IN')}
- Age: ${userProfile.age}
- Risk level: ${userProfile.risk_level}
- Goal: ${userProfile.goal}
- Monthly expenses: ₹${parseFloat(userProfile.monthly_expenses || 0).toLocaleString('en-IN')}
- Monthly surplus: ₹${surplus.toLocaleString('en-IN')}
- Has insurance: ${userProfile.has_insurance ? 'Yes' : 'No'}
- Emergency fund: ${userProfile.emergency_fund_months || 0} months`;
  }

  const retrievedContext = context.length > 0
    ? `\n\n[Relevant Knowledge Retrieved]\n${context.join('\n\n---\n\n')}`
    : '';

  return profileCtx + retrievedContext;
}

module.exports = { retrieveContext, buildRAGPrompt, KB_CHUNKS };
