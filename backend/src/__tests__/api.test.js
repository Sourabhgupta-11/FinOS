const request = require('supertest');
const app = require('../../app');
const { pool } = require('../../db/pool');

let authToken = '';
let testEmail = `test_${Date.now()}@financialos.test`;

beforeAll(async () => {
  // Run migrations on test DB
  const { query } = require('../../db/pool');
  await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS financial_profiles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      salary DECIMAL(12,2) NOT NULL,
      age INTEGER NOT NULL,
      risk_level VARCHAR(20) NOT NULL,
      goal VARCHAR(50) NOT NULL,
      monthly_expenses DECIMAL(12,2),
      has_insurance BOOLEAN DEFAULT false,
      has_emergency_fund BOOLEAN DEFAULT false,
      emergency_fund_months INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id)
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS allocations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      salary DECIMAL(12,2) NOT NULL,
      surplus DECIMAL(12,2) NOT NULL,
      sip_amount DECIMAL(12,2) NOT NULL,
      emergency_fund_amount DECIMAL(12,2) NOT NULL,
      stocks_amount DECIMAL(12,2) NOT NULL,
      savings_amount DECIMAL(12,2) NOT NULL,
      health_score INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS health_scores (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      savings_rate DECIMAL(5,2),
      emergency_fund_ok BOOLEAN,
      has_investments BOOLEAN,
      has_insurance BOOLEAN,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      tokens_used INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS simulations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_name VARCHAR(255),
      purchase_amount DECIMAL(12,2) NOT NULL,
      monthly_surplus DECIMAL(12,2) NOT NULL,
      expected_return DECIMAL(5,2) NOT NULL,
      time_horizon_years INTEGER NOT NULL,
      months_delay INTEGER,
      opportunity_value DECIMAL(14,2),
      decision VARCHAR(10),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
});

afterAll(async () => {
  await pool.end();
});

// ── Auth tests ────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('registers a new user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: testEmail,
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testEmail);
    authToken = res.body.token;
  });

  it('rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: testEmail,
      password: 'password123',
    });
    expect(res.status).toBe(409);
  });

  it('rejects short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'other@test.com',
      password: '123',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testEmail,
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testEmail,
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testEmail);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

// ── Finance tests ─────────────────────────────────────────────────────────────
describe('POST /api/finance/allocate', () => {
  it('calculates allocation for medium risk', async () => {
    const res = await request(app)
      .post('/api/finance/allocate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        salary: 80000,
        age: 26,
        riskLevel: 'medium',
        goal: 'wealth',
        monthlyExpenses: 35000,
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('allocation');
    expect(res.body).toHaveProperty('healthScore');
    expect(res.body).toHaveProperty('roadmap');
    expect(res.body).toHaveProperty('alerts');
    expect(res.body.allocation.surplus).toBe(45000);
    expect(res.body.allocation.sip).toBeGreaterThan(0);
    expect(res.body.healthScore).toBeGreaterThan(0);
    expect(res.body.healthScore).toBeLessThanOrEqual(100);
  });

  it('returns 400 when expenses exceed salary', async () => {
    const res = await request(app)
      .post('/api/finance/allocate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        salary: 30000,
        age: 26,
        riskLevel: 'medium',
        goal: 'wealth',
        monthlyExpenses: 50000,
      });
    expect(res.status).toBe(400);
  });

  it('applies higher stock allocation for high risk', async () => {
    const medRes = await request(app)
      .post('/api/finance/allocate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ salary: 80000, age: 26, riskLevel: 'medium', goal: 'wealth', monthlyExpenses: 35000 });

    const highRes = await request(app)
      .post('/api/finance/allocate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ salary: 80000, age: 26, riskLevel: 'high', goal: 'wealth', monthlyExpenses: 35000 });

    expect(highRes.body.allocation.stocks).toBeGreaterThan(medRes.body.allocation.stocks);
  });
});

describe('POST /api/finance/simulate', () => {
  it('calculates decision simulation', async () => {
    const res = await request(app)
      .post('/api/finance/simulate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        purchaseAmount: 150000,
        monthlySurplus: 20000,
        expectedReturn: 12,
        timeHorizonYears: 5,
        itemName: 'MacBook Pro',
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('monthsDelay');
    expect(res.body).toHaveProperty('opportunityValue');
    expect(res.body).toHaveProperty('verdict');
    expect(res.body.monthsDelay).toBe(8); // 150000/20000 = 7.5 → ceil = 8
    expect(res.body.opportunityValue).toBeGreaterThan(150000);
  });
});

describe('GET /api/finance/history', () => {
  it('returns allocation history', async () => {
    const res = await request(app)
      .get('/api/finance/history')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('allocations');
    expect(Array.isArray(res.body.allocations)).toBe(true);
  });
});

// ── Health check ──────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
