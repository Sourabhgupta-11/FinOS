const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/launchController");

// Public routes
router.get("/stats", ctrl.getLaunchStats);
router.get("/waitlist/count", ctrl.getWaitlistCount);
router.get("/waitlist/check", ctrl.checkWaitlist);
router.post("/waitlist", ctrl.joinWaitlist);

module.exports = router;
