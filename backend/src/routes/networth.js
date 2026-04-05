const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/netWorthController');

// Net worth
router.get('/', ctrl.getNetWorth);
router.get('/history', ctrl.getNetWorthHistory);

// Manual assets
router.get('/assets', ctrl.getAssets);
router.post('/assets', ctrl.upsertAsset);
router.put('/assets/:id', ctrl.upsertAsset);
router.delete('/assets/:id', ctrl.deleteAsset);

// Manual liabilities
router.get('/liabilities', ctrl.getLiabilities);
router.post('/liabilities', ctrl.upsertLiability);
router.put('/liabilities/:id', ctrl.upsertLiability);
router.delete('/liabilities/:id', ctrl.deleteLiability);

// Goals
router.get('/goals', ctrl.getGoals);
router.post('/goals', ctrl.upsertGoal);
router.put('/goals/:id', ctrl.upsertGoal);
router.delete('/goals/:id', ctrl.deleteGoal);

// External portfolio links
router.get('/external', ctrl.getExternalLinks);
router.post('/external', ctrl.linkExternalPortfolio);
router.post('/external/:id/refresh', ctrl.refreshExternalPortfolio);
router.delete('/external/:id', ctrl.deleteExternalLink);

module.exports = router;
