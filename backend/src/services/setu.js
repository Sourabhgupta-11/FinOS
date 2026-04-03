const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const BASE_URL = process.env.SETU_BASE_URL || 'https://fiu-sandbox.setu.co';
const CLIENT_ID = process.env.SETU_CLIENT_ID;
const CLIENT_SECRET = process.env.SETU_CLIENT_SECRET;
const REDIRECT_URL = process.env.SETU_REDIRECT_URL;

let tokenCache = { token: null, expiresAt: 0 };

async function getAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('Setu credentials not configured');

  const res = await axios.post(`${BASE_URL}/v2/auth/token`, {
    clientID: CLIENT_ID,
    secret: CLIENT_SECRET,
  });
  tokenCache = {
    token: res.data.accessToken,
    expiresAt: Date.now() + (res.data.expiresIn || 3600) * 1000 - 60000,
  };
  return tokenCache.token;
}

function setuClient(token) {
  return axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
}

// Create consent for data fetch — user will be redirected to AA app
async function createConsent(user, fiTypes = ['DEPOSIT', 'CREDIT_CARD', 'MUTUAL_FUNDS']) {
  const token = await getAccessToken();
  const client = setuClient(token);

  const consentId = uuidv4();
  const now = new Date();
  const from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const to = new Date();

  const payload = {
    consentDuration: { unit: 'MONTH', value: 12 },
    dataLife: { unit: 'MONTH', value: 12 },
    frequency: { unit: 'MONTH', value: 1 },
    consentTypes: ['TRANSACTIONS', 'SUMMARY', 'PROFILE'],
    fiTypes,
    purpose: { code: '101', text: 'Personal Finance Management' },
    dataRange: { from: from.toISOString(), to: to.toISOString() },
    redirectUrl: REDIRECT_URL,
    vua: user.phone ? `${user.phone}@onemoney` : null,
  };

  const res = await client.post('/v2/consent', payload);
  logger.info(`Setu consent created: ${res.data.id}`);
  return res.data;
}

// Check consent status
async function getConsentStatus(consentId) {
  const token = await getAccessToken();
  const client = setuClient(token);
  const res = await client.get(`/v2/consent/${consentId}`);
  return res.data;
}

// Fetch FI (Financial Information) data after consent approval
async function fetchFIData(consentId, from, to) {
  const token = await getAccessToken();
  const client = setuClient(token);

  const sessionRes = await client.post('/v2/fi/fetch', {
    consent: { id: consentId },
    dataRange: {
      from: from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      to: to || new Date().toISOString(),
    },
  });
  return sessionRes.data;
}

// Parse Setu FI transactions into our format
function parseSetuTransactions(fiData, bankAccountId, userId) {
  const transactions = [];

  for (const account of fiData.accounts || []) {
    for (const tx of account.transactions || []) {
      transactions.push({
        user_id: userId,
        bank_account_id: bankAccountId,
        type: tx.type === 'CREDIT' ? 'income' : 'expense',
        amount: Math.abs(parseFloat(tx.amount)),
        description: tx.narration || tx.description || 'Transaction',
        merchant: tx.mode || null,
        transaction_date: tx.transactionTimestamp?.split('T')[0] || new Date().toISOString().split('T')[0],
        source: 'setu',
        raw_data: tx,
      });
    }
  }
  return transactions;
}

// Mock data for sandbox/local dev
function getMockBankData() {
  return {
    accounts: [
      {
        maskedAccNumber: 'XXXX1234',
        accType: 'SAVINGS',
        currentBalance: 45000,
        transactions: [
          { type: 'DEBIT',  amount: '1500', narration: 'SWIGGY ORDER',     transactionTimestamp: '2024-10-15T12:00:00Z', mode: 'UPI' },
          { type: 'DEBIT',  amount: '850',  narration: 'METRO CARD RECHARGE', transactionTimestamp: '2024-10-14T09:00:00Z', mode: 'UPI' },
          { type: 'CREDIT', amount: '80000',narration: 'SALARY CREDIT',    transactionTimestamp: '2024-10-01T00:00:00Z', mode: 'NEFT' },
          { type: 'DEBIT',  amount: '25000',narration: 'RENT TRANSFER',    transactionTimestamp: '2024-10-02T10:00:00Z', mode: 'NEFT' },
          { type: 'DEBIT',  amount: '3200', narration: 'NETFLIX HOTSTAR',  transactionTimestamp: '2024-10-10T00:00:00Z', mode: 'ECS' },
          { type: 'DEBIT',  amount: '5000', narration: 'ZERODHA COIN SIP', transactionTimestamp: '2024-10-05T00:00:00Z', mode: 'ECS' },
        ],
      },
    ],
  };
}

module.exports = {
  createConsent,
  getConsentStatus,
  fetchFIData,
  parseSetuTransactions,
  getMockBankData,
};
