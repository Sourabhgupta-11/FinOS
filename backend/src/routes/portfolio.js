const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/portfolioController');

router.get('/', ctrl.getPortfolio);
router.post('/', ctrl.addOrUpdateHolding);
router.delete('/:id', ctrl.deleteHolding);
router.post('/refresh', ctrl.refreshPrices);
router.get('/transactions', ctrl.getTransactions);

module.exports = router;
