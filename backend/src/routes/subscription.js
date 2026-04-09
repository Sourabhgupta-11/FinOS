const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/subscriptionController');
const { authenticate } = require('../middleware/auth');

router.post('/webhook', express.raw({ type: '*/*' }), ctrl.handleWebhook);

router.get('/', authenticate, ctrl.getSubscription);
router.post('/', authenticate, ctrl.createSubscription);
router.post('/verify', authenticate, ctrl.verifyPayment);
router.delete('/', authenticate, ctrl.cancelSubscription);

module.exports = router;
