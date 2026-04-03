const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis = null;
let connected = false;

function getRedis() {
  if (!redis && process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
      lazyConnect: true,
    });
    redis.on('connect', () => { connected = true; logger.info('Redis connected'); });
    redis.on('error', (err) => { connected = false; logger.warn('Redis error (non-fatal):', err.message); });
  }
  return redis;
}

// Safe cache get — returns null on failure instead of throwing
async function cacheGet(key) {
  try {
    const r = getRedis();
    if (!r || !connected) return null;
    const val = await r.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

// Safe cache set
async function cacheSet(key, value, ttlSeconds = 300) {
  try {
    const r = getRedis();
    if (!r || !connected) return;
    await r.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch { /* non-fatal */ }
}

// Safe cache delete
async function cacheDel(key) {
  try {
    const r = getRedis();
    if (!r || !connected) return;
    await r.del(key);
  } catch { /* non-fatal */ }
}

// Cache with auto-fetch pattern
async function cacheOrFetch(key, fetcher, ttlSeconds = 300) {
  const cached = await cacheGet(key);
  if (cached !== null) return cached;
  const fresh = await fetcher();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}

async function connectRedis() {
  const r = getRedis();
  if (r) {
    try { await r.connect(); } catch { /* already connected or no redis */ }
  }
}

module.exports = { getRedis, cacheGet, cacheSet, cacheDel, cacheOrFetch, connectRedis };
