const crypto = require("crypto");
const https = require("https");
const logger = require("../utils/logger");

/**
 * Lemonsqueezy Payment Service
 * Handles subscription management via Lemonsqueezy API
 */

const LEMONSQUEEZY_API_BASE = "https://api.lemonsqueezy.com/v1";
const API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const STORE_ID = process.env.LEMONSQUEEZY_STORE_ID;
const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

/**
 * Make HTTPS request to Lemonsqueezy API
 */
async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${LEMONSQUEEZY_API_BASE}${path}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(
              new Error(
                `Lemonsqueezy API error: ${res.statusCode} ${parsed.message || data}`,
              ),
            );
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Create a checkout URL for subscription
 * Returns a checkout link that redirects to Lemonsqueezy's payment page
 */
async function createCheckoutURL(customerId, variantId, email, userName) {
  try {
    const payload = {
      data: {
        type: "checkouts",
        attributes: {
          email: email,
          name: userName,
          custom_data: {
            customer_id: customerId,
          },
          product_options: {
            redirect_url: `${process.env.FRONTEND_URL}/subscription?success=true`,
            expires_at: new Date(
              Date.now() + 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
        },
        relationships: {
          variant: {
            data: {
              type: "variants",
              id: variantId,
            },
          },
        },
      },
    };

    const response = await makeRequest(
      "POST",
      `/stores/${STORE_ID}/checkouts`,
      payload,
    );
    return response.data.attributes.url;
  } catch (err) {
    logger.error("Failed to create checkout URL:", err);
    throw err;
  }
}

/**
 * Get customer subscription details
 */
async function getCustomerSubscriptions(customerId) {
  try {
    const response = await makeRequest(
      "GET",
      `/subscriptions?filter[customer_id]=${customerId}`,
    );
    return response.data || [];
  } catch (err) {
    logger.error("Failed to fetch subscriptions:", err);
    throw err;
  }
}

/**
 * Cancel a subscription
 */
async function cancelSubscription(subscriptionId) {
  try {
    const response = await makeRequest(
      "PATCH",
      `/subscriptions/${subscriptionId}`,
      {
        data: {
          type: "subscriptions",
          id: subscriptionId,
          attributes: {
            cancelled: true,
          },
        },
      },
    );
    return response.data;
  } catch (err) {
    logger.error("Failed to cancel subscription:", err);
    throw err;
  }
}

/**
 * Get subscription details
 */
async function getSubscription(subscriptionId) {
  try {
    const response = await makeRequest(
      "GET",
      `/subscriptions/${subscriptionId}`,
    );
    return response.data;
  } catch (err) {
    logger.error("Failed to fetch subscription:", err);
    throw err;
  }
}

/**
 * Verify webhook signature from Lemonsqueezy
 * Lemonsqueezy sends an HMAC-SHA256 signature in the x-signature header
 */
function verifyWebhookSignature(body, signature) {
  if (!WEBHOOK_SECRET || !signature) return false;

  try {
    // Lemonsqueezy uses HMAC-SHA256 with the webhook secret
    const expectedSignature = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    );
  } catch (err) {
    logger.error("Webhook signature verification error:", err);
    return false;
  }
}

/**
 * Map Lemonsqueezy events to plan types
 */
function getVariantIdForPlan(planType) {
  if (planType === "pro") {
    return process.env.LEMONSQUEEZY_PRO_VARIANT_ID;
  } else if (planType === "premium") {
    return process.env.LEMONSQUEEZY_PREMIUM_VARIANT_ID;
  }
  throw new Error(`Unknown plan type: ${planType}`);
}

function getPlanTypeFromVariantId(variantId) {
  if (variantId === process.env.LEMONSQUEEZY_PRO_VARIANT_ID) {
    return "pro";
  } else if (variantId === process.env.LEMONSQUEEZY_PREMIUM_VARIANT_ID) {
    return "premium";
  }
  return "premium"; // default
}

module.exports = {
  createCheckoutURL,
  getCustomerSubscriptions,
  cancelSubscription,
  getSubscription,
  verifyWebhookSignature,
  getVariantIdForPlan,
  getPlanTypeFromVariantId,
  LEMONSQUEEZY_API_BASE,
};
