const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/taxController');

router.post('/calculate', ctrl.calculateTax);
router.get('/history', ctrl.getTaxHistory);

module.exports = router;
