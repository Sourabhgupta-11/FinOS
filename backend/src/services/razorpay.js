const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('../utils/logger');

let instance = null;

function getRazorpay() {
  if (!instance) {
    instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return instance;
}

async function createCustomer(name, email, phone) {
  const rp = getRazorpay();
  return rp.customers.create({ name, email, contact: phone || '' });
}

async function createSubscription(customerId) {
  const rp = getRazorpay();
  return rp.subscriptions.create({
    plan_id: process.env.RAZORPAY_PLAN_ID,
    customer_id: customerId,
    quantity: 1,
    total_count: 120, // 10 years max
    customer_notify: 1,
  });
}

async function cancelSubscription(subscriptionId) {
  const rp = getRazorpay();
  return rp.subscriptions.cancel(subscriptionId, true); // cancel_at_cycle_end = true
}

async function fetchSubscription(subscriptionId) {
  const rp = getRazorpay();
  return rp.subscriptions.fetch(subscriptionId);
}

function verifyWebhookSignature(body, signature) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function verifyPaymentSignature(orderId, paymentId, signature) {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expected === signature;
}

module.exports = {
  getRazorpay,
  createCustomer,
  createSubscription,
  cancelSubscription,
  fetchSubscription,
  verifyWebhookSignature,
  verifyPaymentSignature,
};
