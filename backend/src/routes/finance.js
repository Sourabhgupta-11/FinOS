const express = require('express');
const { body } = require('express-validator');
const { allocateSalary, getHealthScore, simulateDecision, getAllocationHistory } = require('../controllers/financeController');
const { requirePlan } = require('../middleware/requirePlan');

const router = express.Router();

// Free: allocate + health score
router.post('/allocate', [
  body('salary').isNumeric().isFloat({ min: 1000 }),
  body('age').isInt({ min: 18, max: 80 }),
  body('riskLevel').isIn(['low','medium','high']),
  body('goal').isIn(['wealth','travel','house','retire']),
  body('monthlyExpenses').optional().isNumeric(),
], allocateSalary);

router.get('/health-score', getHealthScore);

// Pro+: history and simulator
router.get('/history',  requirePlan('pro'), getAllocationHistory);
router.post('/simulate', requirePlan('pro'), [
  body('purchaseAmount').isNumeric().isFloat({ min: 1 }),
  body('monthlySurplus').isNumeric().isFloat({ min: 1 }),
  body('expectedReturn').isNumeric().isFloat({ min: 0, max: 100 }),
  body('timeHorizonYears').isInt({ min: 1, max: 40 }),
  body('itemName').optional().isString().trim(),
], simulateDecision);

module.exports = router;
