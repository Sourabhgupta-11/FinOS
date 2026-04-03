const express = require('express');
const { body } = require('express-validator');
const { chat, getChatHistory, createSession } = require('../controllers/advisorController');

const router = express.Router();

router.post('/chat', [
  body('message').trim().isLength({ min: 1, max: 2000 }),
  body('sessionId').optional().isUUID(),
], chat);

router.post('/session', createSession);
router.get('/history', getChatHistory);
router.get('/history/:sessionId', getChatHistory);

module.exports = router;
