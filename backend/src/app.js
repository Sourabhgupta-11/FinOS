require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const passport = require("passport");

const authRoutes = require("./routes/auth");
const authExtendedRoutes = require("./routes/authExtended");
const googleAuthRoutes = require("./routes/googleAuth");
const profileRoutes = require("./routes/profile");
const financeRoutes = require("./routes/finance");
const advisorRoutes = require("./routes/advisor");
const subscriptionRoutes = require("./routes/subscription");
const emailRoutes = require("./routes/email");
const portfolioRoutes = require("./routes/portfolio");
const taxRoutes = require("./routes/tax");
const bankRoutes = require("./routes/bank");
const notifRoutes = require("./routes/notifications");
const networthRoutes = require("./routes/networth");

const { errorHandler } = require("./middleware/errorHandler");
const { authenticate } = require("./middleware/auth");
const {
  requirePlan,
  requirePro,
  requirePremium,
} = require("./middleware/requirePlan");
const logger = require("./utils/logger");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(compression());
app.use(
  morgan("combined", {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.path === "/health",
  }),
);
app.use(passport.initialize());

app.use("/api/subscription/webhook", express.raw({ type: "*/*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
});
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use("/api/", apiLimiter);
app.use("/api/advisor/", aiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.get("/health", (req, res) =>
  res.json({
    status: "ok",
    version: "3.2.0",
    timestamp: new Date().toISOString(),
  }),
);

// ── Public ────────────────────────────────────────────────────────────────────
app.use("/api/auth", googleAuthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/subscription", subscriptionRoutes);

// ── All authenticated users ───────────────────────────────────────────────────
app.use("/api/auth", authenticate, authExtendedRoutes);
app.use("/api/profile", authenticate, profileRoutes);
app.use("/api/finance", authenticate, financeRoutes); // history/simulator gated inside by Pro
app.use("/api/advisor", authenticate, advisorRoutes); // rate-limited inside by plan
app.use("/api/networth", authenticate, networthRoutes); // free+

// ── Pro (₹99/mo): expenses, bank, notifications, simulator, history ──────────
app.use("/api/bank", authenticate, requirePro, bankRoutes);
app.use("/api/notifications", authenticate, requirePro, notifRoutes);

// ── Premium (₹199/mo): portfolio, tax, budgets ─────────────────────────────
app.use("/api/portfolio", authenticate, requirePremium, portfolioRoutes);
app.use("/api/tax", authenticate, requirePremium, taxRoutes);

// ── 404 + error ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use(errorHandler);

module.exports = app;
