require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes         = require('./routes/auth');
const authExtendedRoutes = require('./routes/authExtended');
const profileRoutes      = require('./routes/profile');
const financeRoutes      = require('./routes/finance');
const advisorRoutes      = require('./routes/advisor');
const subscriptionRoutes = require('./routes/subscription');
const emailRoutes        = require('./routes/email');
const portfolioRoutes    = require('./routes/portfolio');
const taxRoutes          = require('./routes/tax');
const bankRoutes         = require('./routes/bank');
const notifRoutes        = require('./routes/notifications');

const { errorHandler }              = require('./middleware/errorHandler');
const { authenticate }              = require('./middleware/auth');
const { requirePlan, requirePremium, requirePro } = require('./middleware/requirePlan');
const logger                        = require('./utils/logger');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(compression());
app.use(morgan('combined', {
  stream: { write: msg => logger.info(msg.trim()) },
  skip: req => req.path === '/health',
}));

// Raw body for webhook BEFORE json()
app.use('/api/subscription/webhook', express.raw({ type: '*/*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter  = rateLimit({ windowMs: 15*60*1000, max: 300, standardHeaders: true });
const aiLimiter   = rateLimit({ windowMs: 60*1000, max: 30, message: { error: 'Too many requests' } });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20, message: { error: 'Too many auth attempts' } });
app.use('/api/', apiLimiter);
app.use('/api/advisor/', aiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Health
app.get('/health', (req, res) =>
  res.json({ status: 'ok', version: '3.0.0', timestamp: new Date().toISOString() })
);

// ── Public routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/email',        emailRoutes);
app.use('/api/subscription', subscriptionRoutes);  // webhook is public inside

// ── Authenticated routes ──────────────────────────────────────────────────────
app.use('/api/auth',     authenticate, authExtendedRoutes);  // profile/password/delete
app.use('/api/profile',  authenticate, profileRoutes);
app.use('/api/finance',  authenticate, financeRoutes);
app.use('/api/advisor',  authenticate, advisorRoutes);

// ── Pro plan (₹99/mo) ─────────────────────────────────────────────────────────
app.use('/api/tax',           authenticate, requirePro,     taxRoutes);
app.use('/api/bank',          authenticate, requirePro,     bankRoutes);
app.use('/api/notifications', authenticate, requirePro,     notifRoutes);

// ── Premium plan (₹199/mo) ───────────────────────────────────────────────────
app.use('/api/portfolio', authenticate, requirePremium, portfolioRoutes);

// ── 404 + error ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
