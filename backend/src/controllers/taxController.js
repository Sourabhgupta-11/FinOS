const { query } = require('../db/pool');

// ── Old Regime Tax Slabs (FY 2024-25) ────────────────────────────────────────
function calcOldRegimeTax(taxableIncome) {
  if (taxableIncome <= 250000) return 0;
  if (taxableIncome <= 500000) return (taxableIncome - 250000) * 0.05;
  if (taxableIncome <= 1000000) {
    return 12500 + (taxableIncome - 500000) * 0.20;
  }
  return 12500 + 100000 + (taxableIncome - 1000000) * 0.30;
}

// ── New Regime Tax Slabs (FY 2024-25, post Jul 2024 budget) ──────────────────
function calcNewRegimeTax(taxableIncome) {
  if (taxableIncome <= 300000) return 0;
  if (taxableIncome <= 700000) return (taxableIncome - 300000) * 0.05;
  if (taxableIncome <= 1000000) return 20000 + (taxableIncome - 700000) * 0.10;
  if (taxableIncome <= 1200000) return 50000 + (taxableIncome - 1000000) * 0.15;
  if (taxableIncome <= 1500000) return 80000 + (taxableIncome - 1200000) * 0.20;
  return 140000 + (taxableIncome - 1500000) * 0.30;
}

// ── Rebate u/s 87A ────────────────────────────────────────────────────────────
function applyRebate87A(tax, taxableIncome, regime) {
  // Old: rebate up to ₹12,500 if income ≤ ₹5L
  // New: rebate up to ₹25,000 if income ≤ ₹7L
  if (regime === 'old' && taxableIncome <= 500000)  return Math.max(0, tax - 12500);
  if (regime === 'new' && taxableIncome <= 700000)  return Math.max(0, tax - 25000);
  return tax;
}

// ── Surcharge ─────────────────────────────────────────────────────────────────
function addSurcharge(tax, income) {
  if (income > 50000000)  return tax * 1.37; // 37%
  if (income > 20000000)  return tax * 1.25; // 25%
  if (income > 10000000)  return tax * 1.15; // 15%
  if (income > 5000000)   return tax * 1.10; // 10%
  return tax;
}

// ── Health & Education Cess (4%) ──────────────────────────────────────────────
function addCess(tax) { return tax * 1.04; }

function computeTax(grossIncome, deductions, regime) {
  const taxableIncome = Math.max(0, grossIncome - deductions);
  let tax = regime === 'old'
    ? calcOldRegimeTax(taxableIncome)
    : calcNewRegimeTax(taxableIncome);
  tax = applyRebate87A(tax, taxableIncome, regime);
  tax = addSurcharge(tax, taxableIncome);
  tax = addCess(tax);
  return Math.round(tax);
}

async function calculateTax(req, res, next) {
  try {
    const {
      financialYear = '2024-25',
      grossSalary,
      hraReceived = 0,
      rentPaid = 0,
      isMetroCity = false,
      lta = 0,
      deduction80C = 0,
      deduction80D = 0,
      deduction80CCD = 0,  // NPS extra ₹50k
      deduction80TTA = 0,  // Savings interest max ₹10k
      otherDeductions = 0,
      homeLoanInterest = 0, // Section 24b max ₹2L
      otherIncome = 0,
    } = req.body;

    const totalIncome = parseFloat(grossSalary) + parseFloat(otherIncome);
    const STANDARD_DEDUCTION = 50000;
    const NEW_REGIME_STANDARD = 75000; // FY 2024-25 increased to 75k

    // ── HRA Exemption (Old regime only) ──────────────────────────────────────
    const monthlyBasic = parseFloat(grossSalary) * 0.4 / 12; // assume 40% of CTC is basic
    const monthlyHRA = parseFloat(hraReceived) / 12;
    const monthlyRent = parseFloat(rentPaid) / 12;
    const hraActualReceived = parseFloat(hraReceived);
    const hra50Pct = isMetroCity ? monthlyBasic * 12 * 0.5 : monthlyBasic * 12 * 0.4;
    const hraRentExcess = Math.max(0, parseFloat(rentPaid) - (monthlyBasic * 12 * 0.1));
    const hraExemption = Math.min(hraActualReceived, hra50Pct, hraRentExcess);

    // ── Old Regime Deductions ─────────────────────────────────────────────────
    const cap80C = Math.min(parseFloat(deduction80C), 150000);
    const cap80D = Math.min(parseFloat(deduction80D), 75000); // 25k self + 50k parents
    const cap80CCD = Math.min(parseFloat(deduction80CCD), 50000);
    const cap80TTA = Math.min(parseFloat(deduction80TTA), 10000);
    const capHome = Math.min(parseFloat(homeLoanInterest), 200000);

    const oldDeductions =
      STANDARD_DEDUCTION +
      hraExemption +
      parseFloat(lta) +
      cap80C + cap80D + cap80CCD + cap80TTA + capHome +
      parseFloat(otherDeductions);

    // ── New Regime Deductions (very limited) ──────────────────────────────────
    const newDeductions = NEW_REGIME_STANDARD + cap80CCD; // only NPS + std deduction

    const oldTaxableIncome = Math.max(0, totalIncome - oldDeductions);
    const newTaxableIncome = Math.max(0, totalIncome - newDeductions);

    const oldTax = computeTax(totalIncome, oldDeductions, 'old');
    const newTax = computeTax(totalIncome, newDeductions, 'new');

    const recommended = newTax <= oldTax ? 'new' : 'old';
    const taxSaved = Math.abs(oldTax - newTax);
    const effectiveOldRate = ((oldTax / totalIncome) * 100).toFixed(2);
    const effectiveNewRate = ((newTax / totalIncome) * 100).toFixed(2);

    // Deduction breakdown
    const deductionBreakdown = [
      { label: 'Standard deduction', oldRegime: STANDARD_DEDUCTION, newRegime: NEW_REGIME_STANDARD },
      { label: 'HRA exemption',      oldRegime: Math.round(hraExemption), newRegime: 0 },
      { label: 'Section 80C (ELSS/PPF/LIC)', oldRegime: cap80C, newRegime: 0 },
      { label: 'Section 80D (Health insurance)', oldRegime: cap80D, newRegime: 0 },
      { label: 'NPS 80CCD(1B)',       oldRegime: cap80CCD, newRegime: cap80CCD },
      { label: 'Home loan interest',  oldRegime: capHome,  newRegime: 0 },
      { label: 'Savings interest 80TTA', oldRegime: cap80TTA, newRegime: 0 },
    ];

    // Save to DB
    await query(
      `INSERT INTO tax_calculations
         (user_id, financial_year, gross_salary, hra_received, hra_exemption, lta,
          deduction_80c, deduction_80d, deduction_80ccd, deduction_80tta,
          old_regime_tax, new_regime_tax, recommended_regime, tax_saved,
          effective_old_rate, effective_new_rate, input_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        req.user.id, financialYear, grossSalary, hraReceived, Math.round(hraExemption),
        lta, cap80C, cap80D, cap80CCD, cap80TTA,
        oldTax, newTax, recommended, taxSaved,
        effectiveOldRate, effectiveNewRate, req.body,
      ]
    );

    res.json({
      financialYear,
      grossIncome: totalIncome,
      oldRegime: {
        taxableIncome: oldTaxableIncome,
        totalDeductions: Math.round(oldDeductions),
        tax: oldTax,
        effectiveRate: parseFloat(effectiveOldRate),
      },
      newRegime: {
        taxableIncome: newTaxableIncome,
        totalDeductions: Math.round(newDeductions),
        tax: newTax,
        effectiveRate: parseFloat(effectiveNewRate),
      },
      recommended,
      taxSaved,
      deductionBreakdown,
      tips: generateTaxTips(cap80C, cap80D, cap80CCD, recommended, grossSalary),
    });
  } catch (err) { next(err); }
}

function generateTaxTips(c80c, c80d, c80ccd, recommended, salary) {
  const tips = [];
  if (c80c < 150000) tips.push(`Invest ₹${(150000 - c80c).toLocaleString('en-IN')} more in ELSS/PPF to max 80C deduction`);
  if (c80d < 25000) tips.push('Buy ₹25,000 health insurance to get full 80D deduction');
  if (c80ccd < 50000) tips.push('Invest in NPS to claim extra ₹50,000 deduction under 80CCD(1B)');
  if (recommended === 'new') tips.push('New regime is better for you — fewer deductions needed');
  if (parseFloat(salary) > 1500000) tips.push('Consider salary restructuring: increase HRA, LTA to reduce old regime tax');
  return tips;
}

async function getTaxHistory(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT * FROM tax_calculations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [req.user.id]
    );
    res.json({ calculations: rows });
  } catch (err) { next(err); }
}

module.exports = { calculateTax, getTaxHistory };
