const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/portfolioController');

router.get('/', ctrl.getPortfolio);
router.post('/', ctrl.addHolding);
router.delete('/:id', ctrl.deleteHolding);
router.post('/refresh', ctrl.refreshPrices);
router.get('/insights', ctrl.getInsights);

module.exports = router;