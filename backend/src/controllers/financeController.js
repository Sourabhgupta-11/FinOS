const { validationResult } = require("express-validator");
const { query } = require("../db/pool");
const logger = require("../utils/logger");

function calculateAllocation(salary, expenses, riskLevel, goal, age) {
  const surplus = salary - expenses;
  if (surplus <= 0)
    throw Object.assign(new Error("Expenses exceed salary"), { status: 400 });

  const riskMap = {
    low: { sip: 0.25, ef: 0.25, stocks: 0.05 },
    medium: { sip: 0.35, ef: 0.2, stocks: 0.15 },
    high: { sip: 0.4, ef: 0.15, stocks: 0.25 },
  };

  // Age-based adjustment: reduce stocks allocation if age > 45
  let { sip, ef, stocks } = riskMap[riskLevel];
  if (age > 45) stocks = Math.max(stocks - 0.1, 0);
  if (age > 55) {
    sip += 0.1;
    stocks = 0;
  }

  // Normalize
  const total = sip + ef + stocks;
  const savings = 1 - total;

  return {
    surplus: Math.round(surplus),
    sip: Math.round(surplus * sip),
    emergencyFund: Math.round(surplus * ef),
    stocks: Math.round(surplus * stocks),
    savings: Math.round(surplus * savings),
    percentages: {
      sip: Math.round(sip * 100),
      emergencyFund: Math.round(ef * 100),
      stocks: Math.round(stocks * 100),
      savings: Math.round(savings * 100),
    },
  };
}

function calculateHealthScore(alloc, salary, hasInsurance, efMonths) {
  const savingsRate = (alloc.surplus / salary) * 100;
  let score = 40;

  if (savingsRate >= 30) score += 15;
  else if (savingsRate >= 20) score += 10;
  else if (savingsRate >= 10) score += 5;

  if (alloc.sip > 0) score += 15;
  if (efMonths >= 6) score += 15;
  else if (efMonths >= 3) score += 8;

  if (hasInsurance) score += 10;
  if (alloc.stocks > 0) score += 5;

  return Math.min(Math.max(score, 10), 100);
}

function generateRoadmap(alloc, goal) {
  const roadmap = [
    {
      month: 1,
      action: `Build emergency fund — target ₹${(alloc.emergencyFund * 6).toLocaleString("en-IN")} (6 months of expenses)`,
    },
    {
      month: 2,
      action: `Start SIP of ₹${alloc.sip.toLocaleString("en-IN")}/month in index + flexi cap fund`,
    },
    {
      month: 3,
      action: "Open ELSS fund for 80C tax saving — up to ₹1.5L deductible",
    },
    { month: 4, action: "Get term insurance (cover = 10–15x annual salary)" },
  ];

  const goalActions = {
    wealth: {
      month: 5,
      action: "Diversify into Nifty 50, Midcap 150 index funds",
    },
    travel: { month: 5, action: "Create a dedicated travel fund SIP" },
    house: {
      month: 5,
      action: "Open PPF for home down-payment savings (7.1% guaranteed)",
    },
    car: {
      month: 5,
      action: "Start a dedicated car fund SIP for down-payment & registration",
    },
    retire: {
      month: 5,
      action: "Start NPS Tier-1 for retirement + extra 80CCD tax benefit",
    },
  };
  roadmap.push(goalActions[goal] || roadmap[3]);
  roadmap.push({
    month: 6,
    action: "Review & rebalance portfolio allocation annually",
  });

  return roadmap;
}

function generateAlerts(alloc, salary, efMonths, hasInsurance) {
  const alerts = [];
  const savingsRate = (alloc.surplus / salary) * 100;

  if (efMonths < 3)
    alerts.push({
      type: "danger",
      message: "Emergency fund critically low — target 6 months of expenses",
    });
  else if (efMonths < 6)
    alerts.push({
      type: "warning",
      message: "Emergency fund below 6 months — keep building it",
    });
  else alerts.push({ type: "success", message: "Emergency fund is healthy" });

  if (!hasInsurance)
    alerts.push({
      type: "warning",
      message: "No term insurance detected — consider 10–15x salary coverage",
    });
  if (savingsRate < 20)
    alerts.push({
      type: "warning",
      message: `Savings rate is ${savingsRate.toFixed(0)}% — target 20%+`,
    });
  if (alloc.sip > 0)
    alerts.push({
      type: "success",
      message: `SIP of ₹${alloc.sip.toLocaleString("en-IN")}/month will build long-term wealth`,
    });

  return alerts;
}

async function allocateSalary(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = errors.array()[0];
      return res.status(400).json({
        error: `${error.param}: ${error.msg}`,
      });
    }

    const {
      salary,
      age,
      riskLevel,
      goal,
      monthlyExpenses,
      hasInsurance = false,
      emergencyFundMonths = 0,
    } = req.body;

    // Ensure all numbers are properly converted
    const salaryNum = parseFloat(salary);
    const ageNum = parseInt(age, 10);
    const expensesNum = monthlyExpenses
      ? parseFloat(monthlyExpenses)
      : Math.round(salaryNum * 0.5);
    const efMonthsNum = parseInt(emergencyFundMonths, 10);

    if (!salaryNum || salaryNum < 1000) {
      return res.status(400).json({ error: "Salary must be at least ₹1000" });
    }
    if (!ageNum || ageNum < 18 || ageNum > 80) {
      return res.status(400).json({ error: "Age must be between 18 and 80" });
    }
    if (!riskLevel || !["low", "medium", "high"].includes(riskLevel)) {
      return res.status(400).json({ error: "Invalid risk level" });
    }
    if (
      !goal ||
      !["wealth", "house", "car", "travel", "retire"].includes(goal)
    ) {
      return res.status(400).json({ error: "Invalid goal selected" });
    }

    const alloc = calculateAllocation(
      salaryNum,
      expensesNum,
      riskLevel,
      goal,
      ageNum,
    );
    const score = calculateHealthScore(
      alloc,
      salaryNum,
      hasInsurance,
      efMonthsNum,
    );
    const roadmap = generateRoadmap(alloc, goal);
    const alerts = generateAlerts(alloc, salaryNum, efMonthsNum, hasInsurance);

    // Save to DB
    await query(
      `INSERT INTO financial_profiles (user_id, salary, age, risk_level, goal, monthly_expenses, has_insurance, emergency_fund_months)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO UPDATE SET
         salary = EXCLUDED.salary, age = EXCLUDED.age, risk_level = EXCLUDED.risk_level,
         goal = EXCLUDED.goal, monthly_expenses = EXCLUDED.monthly_expenses,
         has_insurance = EXCLUDED.has_insurance, emergency_fund_months = EXCLUDED.emergency_fund_months,
         updated_at = NOW()`,
      [
        req.user.id,
        salaryNum,
        ageNum,
        riskLevel,
        goal,
        expensesNum,
        hasInsurance,
        efMonthsNum,
      ],
    );

    await query(
      `INSERT INTO allocations (user_id, salary, surplus, sip_amount, emergency_fund_amount, stocks_amount, savings_amount, health_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.user.id,
        salaryNum,
        alloc.surplus,
        alloc.sip,
        alloc.emergencyFund,
        alloc.stocks,
        alloc.savings,
        score,
      ],
    );

    await query(
      `INSERT INTO health_scores (user_id, score, savings_rate, emergency_fund_ok, has_investments, has_insurance)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        score,
        ((alloc.surplus / salaryNum) * 100).toFixed(2),
        efMonthsNum >= 3,
        alloc.sip > 0,
        hasInsurance,
      ],
    );

    res.json({
      allocation: alloc,
      healthScore: score,
      roadmap,
      alerts,
      expenses: expensesNum,
    });
  } catch (err) {
    logger.error("Allocation error", { error: err.message, stack: err.stack });
    next(err);
  }
}

async function getHealthScore(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT score, savings_rate, emergency_fund_ok, has_investments, has_insurance, created_at
       FROM health_scores WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 30`,
      [req.user.id],
    );
    res.json({ scores: rows });
  } catch (err) {
    next(err);
  }
}

async function getAllocationHistory(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT id, salary, surplus, sip_amount, emergency_fund_amount, stocks_amount, savings_amount, health_score, created_at
       FROM allocations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [req.user.id],
    );
    res.json({ allocations: rows });
  } catch (err) {
    next(err);
  }
}

async function simulateDecision(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const {
      purchaseAmount,
      monthlySurplus,
      expectedReturn,
      timeHorizonYears,
      itemName = "this purchase",
    } = req.body;

    const annualReturn = expectedReturn / 100;
    const monthlyReturn = annualReturn / 12;
    const n = timeHorizonYears * 12;

    const monthsDelay = Math.ceil(purchaseAmount / monthlySurplus);
    const opportunityValue = Math.round(
      purchaseAmount * Math.pow(1 + annualReturn, timeHorizonYears),
    );
    const sipFV = Math.round(
      monthlySurplus * ((Math.pow(1 + monthlyReturn, n) - 1) / monthlyReturn),
    );

    const ratio = opportunityValue / purchaseAmount;
    let verdict, recommendation;
    if (ratio > 2.5) {
      recommendation = "invest";
      verdict = `Investing ₹${purchaseAmount.toLocaleString("en-IN")} instead of buying ${itemName} could grow to ₹${opportunityValue.toLocaleString("en-IN")} in ${timeHorizonYears} years — that's ${ratio.toFixed(1)}x your money. Consider a cheaper alternative or delay purchase.`;
    } else {
      recommendation = "neutral";
      verdict = `The opportunity cost is ₹${opportunityValue.toLocaleString("en-IN")} in ${timeHorizonYears} years. If it's a tool that increases earning potential or quality of life significantly, the purchase may be justified.`;
    }

    await query(
      `INSERT INTO simulations (user_id, item_name, purchase_amount, monthly_surplus, expected_return, time_horizon_years, months_delay, opportunity_value, decision)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        req.user.id,
        itemName,
        purchaseAmount,
        monthlySurplus,
        expectedReturn,
        timeHorizonYears,
        monthsDelay,
        opportunityValue,
        recommendation,
      ],
    );

    res.json({
      monthsDelay,
      opportunityValue,
      sipFutureValue: sipFV,
      ratio: parseFloat(ratio.toFixed(2)),
      verdict,
      recommendation,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  allocateSalary,
  getHealthScore,
  simulateDecision,
  getAllocationHistory,
};
