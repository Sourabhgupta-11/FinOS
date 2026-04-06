const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/portfolioController');

router.get('/', ctrl.getPortfolio);
router.post('/', ctrl.addHolding);   // fixed
router.delete('/:id', ctrl.deleteHolding);
router.post('/refresh', ctrl.refreshPrices);

// optional — remove if not implemented
//router.get('/transactions', ctrl.getTransactions);

module.exports = router;