/**
 * src/api/razorpay/index.js
 *
 * Barrel file — re-exports all Razorpay route handlers.
 * Import from here in controllers or routes:
 *
 *   const { createOrder, verifyPayment, cancelSubscription } = require('../api/razorpay');
 */

const createOrder        = require("./create-order");
const verifyPayment      = require("./verify");
const cancelSubscription = require("./cancel");

module.exports = { createOrder, verifyPayment, cancelSubscription };
