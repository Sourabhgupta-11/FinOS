require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

async function seed() {
  const client = await pool.connect();
  console.log('🌱 Seeding database...');

  try {
    await client.query('BEGIN');

    // Demo user
    const passwordHash = await bcrypt.hash('demo1234', 12);
    const { rows: [user] } = await client.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, email, name`,
      ['demo@financialos.in', passwordHash, 'Rahul Sharma']
    );
    console.log(`  ✓ Demo user: ${user.email} / demo1234`);

    // Financial profile
    await client.query(
      `INSERT INTO financial_profiles
         (user_id, salary, age, risk_level, goal, monthly_expenses, has_insurance, emergency_fund_months)
       VALUES ($1, 80000, 26, 'medium', 'wealth', 35000, false, 2)
       ON CONFLICT (user_id) DO UPDATE SET
         salary = EXCLUDED.salary, age = EXCLUDED.age`,
      [user.id]
    );
    console.log('  ✓ Financial profile created');

    // Allocation records
    const allocations = [
      [user.id, 80000, 45000, 15750, 9000, 6750, 13500, 62],
      [user.id, 80000, 45000, 15750, 9000, 6750, 13500, 64],
      [user.id, 80000, 45000, 15750, 9000, 6750, 13500, 67],
    ];
    for (const a of allocations) {
      await client.query(
        `INSERT INTO allocations
           (user_id, salary, surplus, sip_amount, emergency_fund_amount, stocks_amount, savings_amount, health_score)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        a
      );
    }
    console.log('  ✓ Sample allocations created');

    // Health scores
    const scores = [
      [user.id, 62, 56.25, false, true, false],
      [user.id, 64, 56.25, false, true, false],
      [user.id, 67, 56.25, true, true, false],
    ];
    for (const s of scores) {
      await client.query(
        `INSERT INTO health_scores
           (user_id, score, savings_rate, emergency_fund_ok, has_investments, has_insurance)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        s
      );
    }
    console.log('  ✓ Sample health scores created');

    // Demo chat session
    const { rows: [session] } = await client.query(
      `INSERT INTO chat_sessions (user_id, title)
       VALUES ($1, $2) RETURNING id`,
      [user.id, 'Getting started with SIPs']
    );
    const msgs = [
      ['user',      'How do I start a SIP with ₹5000 per month?'],
      ['assistant', 'Great question! Starting a SIP with ₹5,000/month is a solid first step. Here\'s what I\'d recommend:\n\n**Step 1: Choose a platform**\nUse Zerodha Coin, Groww, or Kuvera — all are free and direct plans.\n\n**Step 2: Pick a fund**\nFor a first SIP, I suggest a Nifty 50 index fund:\n- UTI Nifty 50 Index Fund\n- HDFC Index Fund – Nifty 50\nExpense ratio is very low (~0.1–0.2%) and returns track the market.\n\n**Step 3: Set up auto-debit**\nLink your bank account and set a date (1st or 5th of month recommended).\n\n**Important:** Make sure your emergency fund (3–6 months expenses) is in place before starting equity SIPs.\n\nWant me to explain how much this ₹5,000/month SIP could grow to in 10 years?'],
    ];
    for (const [role, content] of msgs) {
      await client.query(
        `INSERT INTO chat_messages (session_id, user_id, role, content)
         VALUES ($1, $2, $3, $4)`,
        [session.id, user.id, role, content]
      );
    }
    console.log('  ✓ Demo chat session created');

    await client.query('COMMIT');
    console.log('\n✅ Seed complete!');
    console.log('   Login: demo@financialos.in / demo1234');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
