require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes         = require('./routes/auth');
const profileRoutes      = require('./routes/profile');
const financeRoutes      = require('./routes/finance');
const advisorRoutes      = require('./routes/advisor');
const subscriptionRoutes = require('./routes/subscription');
const emailRoutes        = require('./routes/email');
const portfolioRoutes    = require('./routes/portfolio');
const taxRoutes          = require('./routes/tax');
const bankRoutes         = require('./routes/bank');
const notifRoutes        = require('./routes/notifications');

const { errorHandler }   = require('./middleware/errorHandler');
const { authenticate }   = require('./middleware/auth');
const { requirePremium } = require('./middleware/requirePremium');
const logger             = require('./utils/logger');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(compression());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) }, skip: req => req.path === '/health' }));

// Raw body for webhook - must be before express.json()
app.use('/api/subscription/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const apiLimiter  = rateLimit({ windowMs: 15*60*1000, max: 300 });
const aiLimiter   = rateLimit({ windowMs: 60*1000, max: 20, message: { error: 'AI rate limit — wait 1 minute' } });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20, message: { error: 'Too many auth attempts' } });
app.use('/api/', apiLimiter);
app.use('/api/advisor/', aiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() }));

// Public
app.use('/api/auth',         authRoutes);
app.use('/api/email',        emailRoutes);
app.use('/api/subscription', subscriptionRoutes);

// Authenticated
app.use('/api/profile',       authenticate, profileRoutes);
app.use('/api/finance',       authenticate, financeRoutes);
app.use('/api/advisor',       authenticate, advisorRoutes);
app.use('/api/notifications', authenticate, notifRoutes);

// Premium only
app.use('/api/portfolio', authenticate, requirePremium, portfolioRoutes);
app.use('/api/tax',       authenticate, requirePremium, taxRoutes);
app.use('/api/bank',      authenticate, requirePremium, bankRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
