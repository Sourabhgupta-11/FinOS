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

    const { email: rawEmail, password, name } = req.body;

    // Normalize email: lowercase, trim whitespace
    const email = rawEmail.toLowerCase().trim();

    if (!email || email.length === 0) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if email already exists (case-insensitive)
    const existing = await query(
      "SELECT id, google_id, password_hash FROM users WHERE LOWER(email) = LOWER($1)",
      [email],
    );
    if (existing.rows[0]) {
      const existingUser = existing.rows[0];
      // Email already exists - provide specific guidance
      if (existingUser.google_id && !existingUser.password_hash) {
        logger.info(
          "Registration attempt with email already registered via Google",
          { email },
        );
        return res.status(409).json({
          error:
            "This email is already registered via Google. Please sign in with Google instead or use a different email.",
          code: "EMAIL_GOOGLE_REGISTERED",
        });
      }
      logger.info("Registration attempt with already registered email", {
        email,
      });
      return res.status(409).json({
        error: "This email is already registered. Please sign in instead.",
        code: "EMAIL_ALREADY_REGISTERED",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      "INSERT INTO users (email, password_hash, name, email_verified) VALUES ($1, $2, $3, false) RETURNING id, email, name",
      [email, passwordHash, name],
    );

    const user = rows[0];
    const token = generateToken(user.id);

    logger.info("New user registered with email/password", {
      userId: user.id,
      email: user.email,
    });

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    // Handle unique constraint violation
    if (
      err.code === "23505" &&
      (err.constraint === "users_email_key" ||
        err.constraint === "users_email_lower_unique")
    ) {
      logger.warn("Email uniqueness constraint violated", {
        constraint: err.constraint,
      });
      return res.status(409).json({
        error: "This email is already registered. Please sign in instead.",
        code: "EMAIL_ALREADY_REGISTERED",
      });
    }
    logger.error("Error in register function", {
      error: err.message,
      code: err.code,
    });
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email: rawEmail, password } = req.body;

    // Normalize email: lowercase, trim whitespace
    const email = rawEmail.toLowerCase().trim();

    console.log("🔐 LOGIN ATTEMPT:", {
      rawEmail,
      normalizedEmail: email,
      passwordLength: password?.length,
    });

    const { rows } = await query(
      "SELECT id, email, name, password_hash, google_id FROM users WHERE LOWER(email) = LOWER($1)",
      [email],
    );

    const user = rows[0];

    console.log("🔍 USER LOOKUP:", {
      email,
      found: !!user,
      userId: user?.id,
      hasPasswordHash: !!user?.password_hash,
      hasGoogleId: !!user?.google_id,
    });

    if (!user) {
      logger.warn("Login attempt with non-existent email", { email });
      console.log("❌ User not found for email:", email);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // If user has no password_hash, they can't login with password
    if (!user.password_hash) {
      logger.info("Login attempt for Google-only account with password", {
        email,
      });
      console.log("⚠️  User has no password set, must use Google");
      return res.status(401).json({
        error:
          "You registered with Google. Please sign in with Google instead.",
      });
    }

    console.log(
      "🔑 COMPARING PASSWORD - stored hash starts with:",
      user.password_hash.substring(0, 20),
    );

    const valid = await bcrypt.compare(password, user.password_hash);

    console.log("✓ PASSWORD COMPARISON RESULT:", valid);

    if (!valid) {
      logger.warn("Failed login - invalid password", {
        email,
        userId: user.id,
      });
      console.log("❌ Password comparison failed for user:", user.id);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user.id);
    logger.info("User logged in successfully", { userId: user.id, email });

    console.log("✅ LOGIN SUCCESSFUL for:", email);

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    console.error("🚨 LOGIN ERROR:", err);
    next(err);
  }
}

async function getMe(req, res) {
  const { rows } = await query(
    `SELECT u.id, u.email, u.name, u.password_hash, u.created_at,
     fp.salary, fp.age, fp.risk_level, fp.goal, fp.monthly_expenses
     FROM users u
     LEFT JOIN financial_profiles fp ON fp.user_id = u.id
     WHERE u.id = $1`,
    [req.user.id],
  );

  const user = rows[0];
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Return user data without exposing password hash
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    has_password: !!user.password_hash,
    created_at: user.created_at,
    salary: user.salary,
    age: user.age,
    risk_level: user.risk_level,
    goal: user.goal,
    monthly_expenses: user.monthly_expenses,
  });
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
