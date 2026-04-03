const Groq = require('groq-sdk');
const { query } = require('../db/pool');
const { buildRAGPrompt } = require('../services/rag');
const logger = require('../utils/logger');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const PLAN_LIMITS = { free: 5, pro: 100, premium: -1 };

const BASE_SYSTEM = `You are FinBot, an expert AI financial advisor specialising in Indian personal finance. You are built into FinOS — India's AI-powered personal finance operating system.

## Persona & Style
- Think like Ankur Warikoo (clarity) + Nithin Kamath of Zerodha (market wisdom) + a certified financial planner
- Be encouraging — most Indians are underinvested, help them take the first step
- Use real examples: reference Rakesh Jhunjhunwala, Porinju Veliyath, Warren Buffett where relevant
- Be direct and specific. Never vague.

## Response Rules
- Always use ₹ for all currency amounts
- Give specific product names: PPF, ELSS, Nifty 50, UTI Nifty 50 Index Fund, Niva Bupa, LIC Term, etc.
- Keep responses focused: 3-8 sentences or short bullet points unless detail is truly needed
- Personalise advice using the user profile provided if available
- State expected returns with "expected, not guaranteed"
- Never recommend individual stock tickers — suggest index funds or sectors
- For legal/tax specifics, suggest consulting a CA
- Each response must be contextually different from the previous one in the conversation`;

async function checkRateLimit(userId, plan) {
  const limit = PLAN_LIMITS[plan] ?? 5;
  if (limit === -1) return { allowed: true, used: 0, limit: -1 };
  const today = new Date().toISOString().split('T')[0];
  try {
    const { rows } = await query(
      `SELECT message_count FROM ai_usage WHERE user_id = $1 AND date = $2`,
      [userId, today]
    );
    const used = rows[0]?.message_count || 0;
    return { allowed: used < limit, used, limit };
  } catch { return { allowed: true, used: 0, limit }; }
}

async function incrementUsage(userId) {
  const today = new Date().toISOString().split('T')[0];
  await query(
    `INSERT INTO ai_usage (user_id, date, message_count) VALUES ($1, $2, 1)
     ON CONFLICT (user_id, date) DO UPDATE SET message_count = ai_usage.message_count + 1,
     updated_at = NOW()`,
    [userId, today]
  ).catch(() => {});
}

async function getUserPlan(userId) {
  try {
    const { rows } = await query(
      `SELECT plan, status, current_period_end FROM subscriptions WHERE user_id = $1`,
      [userId]
    );
    const sub = rows[0];
    if (!sub || sub.plan === 'free') return 'free';
    const active = sub.status === 'active' &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
    return active ? sub.plan : 'free';
  } catch { return 'free'; }
}

async function createSession(req, res, next) {
  try {
    const title = (req.body.title || 'New conversation').substring(0, 100);
    const { rows } = await query(
      'INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at',
      [req.user.id, title]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function chat(req, res, next) {
  try {
    const message = (req.body.message || req.body.query || req.body.text || '').trim();
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const { sessionId } = req.body;

    // Check plan and rate limit
    const plan = await getUserPlan(req.user.id);
    const rateCheck = await checkRateLimit(req.user.id, plan);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Daily AI limit reached (${rateCheck.limit} messages on ${plan} plan). Upgrade for more messages.`,
        code: 'RATE_LIMIT',
        used: rateCheck.used,
        limit: rateCheck.limit,
        upgradeUrl: '/subscription',
      });
    }

    // Create session if needed
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const { rows } = await query(
        'INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id',
        [req.user.id, message.substring(0, 60)]
      );
      activeSessionId = rows[0].id;
    } else {
      // Verify ownership
      const check = await query(
        'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2',
        [activeSessionId, req.user.id]
      );
      if (!check.rows[0]) return res.status(403).json({ error: 'Session not found' });
    }

    // Fetch history (excluding current message)
    const history = await query(
      `SELECT role, content FROM chat_messages
       WHERE session_id = $1 ORDER BY created_at ASC LIMIT 20`,
      [activeSessionId]
    );

    // Fetch user profile
    const profileResult = await query(
      'SELECT * FROM financial_profiles WHERE user_id = $1',
      [req.user.id]
    ).catch(() => ({ rows: [] }));
    const profile = profileResult.rows[0] || null;

    // Build RAG context
    const ragContext = buildRAGPrompt(message, profile);
    const systemPrompt = BASE_SYSTEM + ragContext;

    // Build message array for Groq
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.rows.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    // Call Groq API
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.9,
    });

    const reply = completion.choices[0]?.message?.content;
    if (!reply) throw new Error('Empty response from Groq');

    const tokensUsed =
      (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0);

    // Save user message then assistant message (order matters)
    await query(
      'INSERT INTO chat_messages (session_id, user_id, role, content) VALUES ($1,$2,$3,$4)',
      [activeSessionId, req.user.id, 'user', message]
    );
    await query(
      'INSERT INTO chat_messages (session_id, user_id, role, content, tokens_used) VALUES ($1,$2,$3,$4,$5)',
      [activeSessionId, req.user.id, 'assistant', reply, tokensUsed]
    );
    await query(
      'UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1',
      [activeSessionId]
    );

    await incrementUsage(req.user.id);

    logger.info('Groq chat', { userId: req.user.id, model: MODEL, tokens: tokensUsed, plan });

    res.json({
      message: reply,
      sessionId: activeSessionId,
      tokensUsed,
      model: MODEL,
      usage: { used: rateCheck.used + 1, limit: rateCheck.limit, plan },
    });
  } catch (err) {
    if (err?.status === 429 || err?.error?.type === 'requests') {
      return res.status(429).json({ error: 'AI is busy. Please try again in a moment.' });
    }
    if (err?.status === 401) {
      logger.error('Invalid GROQ_API_KEY');
      return res.status(500).json({ error: 'AI service not configured. Check GROQ_API_KEY.' });
    }
    next(err);
  }
}

async function getChatHistory(req, res, next) {
  try {
    const { sessionId } = req.params;
    if (sessionId) {
      const msgs = await query(
        `SELECT id, role, content, created_at FROM chat_messages
         WHERE session_id = $1 AND user_id = $2 ORDER BY created_at ASC`,
        [sessionId, req.user.id]
      );
      return res.json({ messages: msgs.rows });
    }
    const sessions = await query(
      `SELECT cs.id, cs.title, cs.created_at, cs.updated_at, COUNT(cm.id)::int AS message_count
       FROM chat_sessions cs
       LEFT JOIN chat_messages cm ON cm.session_id = cs.id
       WHERE cs.user_id = $1
       GROUP BY cs.id ORDER BY cs.updated_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ sessions: sessions.rows });
  } catch (err) { next(err); }
}

module.exports = { chat, getChatHistory, createSession };
