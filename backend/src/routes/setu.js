const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");

// POST /api/setu/callback
router.post("/callback", async (req, res) => {
  try {
    logger.info("SETU callback received:", { body: req.body });

    // Process callback data if needed
    // For now, just acknowledge receipt with 200 OK

    return res.status(200).json({
      status: "ok",
      message: "Callback received successfully",
    });
  } catch (err) {
    logger.error("SETU callback error:", err);
    return res.status(200).json({ status: "ok" }); // Always return 200 to avoid webhook retries
  }
});

module.exports = router;
