const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { query } = require("../db/pool");
const logger = require("../utils/logger");

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    // Check if email already exists
    const existing = await query(
      "SELECT id, google_id, password_hash FROM users WHERE email = $1",
      [email],
    );
    if (existing.rows[0]) {
      const existingUser = existing.rows[0];
      // Email already exists - provide specific guidance
      if (existingUser.google_id && !existingUser.password_hash) {
        return res.status(409).json({
          error:
            "Email already registered via Google. Please sign in with Google instead.",
        });
      }
      return res.status(409).json({
        error: "Email already registered. Please sign in instead.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      "INSERT INTO users (email, password_hash, name, email_verified) VALUES ($1, $2, $3, false) RETURNING id, email, name",
      [email, passwordHash, name],
    );

    const user = rows[0];
    const token = generateToken(user.id);

    logger.info("New user registered", { userId: user.id, email: user.email });

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    // Handle unique constraint violation
    if (err.code === "23505" && err.constraint === "users_email_key") {
      return res.status(409).json({
        error: "Email already registered. Please sign in instead.",
      });
    }
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const { rows } = await query(
      "SELECT id, email, name, password_hash, google_id FROM users WHERE email = $1",
      [email],
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // If user has no password_hash, they can't login with password
    if (!user.password_hash) {
      return res.status(401).json({
        error:
          "You registered with Google. Please sign in with Google instead.",
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user.id);
    logger.info("User logged in", { userId: user.id });

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res) {
  const { rows } = await query(
    `SELECT u.id, u.email, u.name, u.created_at,
     fp.salary, fp.age, fp.risk_level, fp.goal, fp.monthly_expenses
     FROM users u
     LEFT JOIN financial_profiles fp ON fp.user_id = u.id
     WHERE u.id = $1`,
    [req.user.id],
  );
  res.json(rows[0]);
}

async function getAllUsers(req, res) {
  try {
    const { rows } = await query(
      `SELECT id, email, name, google_id, password_hash, email_verified, created_at 
       FROM users 
       ORDER BY created_at DESC`,
    );

    // Don't expose password hashes in response, just show if they have one
    const sanitized = rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      google_id: u.google_id || null,
      has_password: !!u.password_hash,
      email_verified: u.email_verified,
      created_at: u.created_at,
    }));

    res.json({
      total: sanitized.length,
      users: sanitized,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

module.exports = { register, login, getMe, getAllUsers };
