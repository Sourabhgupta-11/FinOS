const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');

router.get('/vapid-key', ctrl.getVapidKey);
router.post('/subscribe', ctrl.subscribe);
router.post('/unsubscribe', ctrl.unsubscribe);
router.get('/', ctrl.getNotifications);
router.post('/read', ctrl.markRead);
router.put('/:id/read', ctrl.markRead);
router.post('/test', ctrl.testPush);

module.exports = router;
