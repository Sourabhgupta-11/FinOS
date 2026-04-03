// routes/email.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/emailController');
const { authenticate } = require('../middleware/auth');
router.post('/verify/send', authenticate, ctrl.sendVerification);
router.post('/verify/confirm', ctrl.verifyEmail);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);
module.exports = router;
