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

    // Check if email already exists (from Google auth or regular signup)
    const existing = await query(
      "SELECT id, google_id FROM users WHERE email = $1",
      [email],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].google_id) {
        return res
          .status(409)
          .json({
            error:
              "Email already registered with Google. Please sign in with Google.",
          });
      } else {
        return res.status(409).json({ error: "Email already registered" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      "INSERT INTO users (email, password_hash, name, email_verified) VALUES ($1, $2, $3, false) RETURNING id, email, name",
      [email, passwordHash, name],
    );

    const user = rows[0];
    const token = generateToken(user.id);

    logger.info("New user registered", { userId: user.id, email: user.email });

    res
      .status(201)
      .json({
        user: { id: user.id, email: user.email, name: user.name },
        token,
      });
  } catch (err) {
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

    // If user registered with Google, they can't login with email/password
    if (user.google_id && !user.password_hash) {
      return res
        .status(401)
        .json({
          error: "You registered with Google. Please sign in with Google.",
        });
    }

    // If user has no password_hash (shouldn't happen, but safety check)
    if (!user.password_hash) {
      return res.status(401).json({ error: "Invalid credentials" });
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

module.exports = { register, login, getMe };
