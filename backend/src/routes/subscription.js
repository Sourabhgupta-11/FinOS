// routes/subscription.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/subscriptionController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getSubscription);
router.post('/', authenticate, ctrl.createSubscription);
router.delete('/', authenticate, ctrl.cancelSubscription);
router.post('/webhook', express.raw({ type: 'application/json' }), ctrl.handleWebhook);

module.exports = router;
