// backend/src/routes/googleAuth.js
// Google OAuth 2.0 — uses your existing SQL pool (no Prisma)

const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const { query } = require("../db/pool");
const logger = require("../utils/logger");

const router = express.Router();

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const googleId = profile.id;

        if (!email)
          return done(new Error("No email returned from Google"), null);

        // Check if user already exists
        const existing = await query(
          "SELECT id, email, name FROM users WHERE email = $1",
          [email],
        );

        let user = existing.rows[0];

        if (user) {
          // Link google_id if not already linked
          await query(
            "UPDATE users SET google_id = $1, email_verified = true WHERE id = $2 AND google_id IS NULL",
            [googleId, user.id],
          );
        } else {
          // Create new user — password_hash is NULL for Google users (allowed after migration 005)
          const { rows } = await query(
            `INSERT INTO users (email, name, password_hash, google_id, email_verified)
         VALUES ($1, $2, NULL, $3, true)
         RETURNING id, email, name`,
            [email, name, googleId],
          );
          user = rows[0];
          logger.info("New Google user registered", {
            userId: user.id,
            email: user.email,
          });
        }

        return done(null, user);
      } catch (err) {
        logger.error("Google OAuth error", { error: err.message });
        return done(err, null);
      }
    },
  ),
);

// Step 1 — redirect user to Google
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

// Step 2 — Google redirects back here with the code
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    try {
      if (!req.user) {
        const frontendUrl = process.env.APP_URL || "http://localhost:5173";
        return res.redirect(`${frontendUrl}/login?error=google_failed`);
      }

      const token = generateToken(req.user.id);
      const frontendUrl = process.env.APP_URL || "http://localhost:5173";
      logger.info("Google user logged in", {
        userId: req.user.id,
        email: req.user.email,
      });
      // Redirect to frontend callback page which saves the token
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (err) {
      logger.error("Google callback error", { error: err.message });
      const frontendUrl = process.env.APP_URL || "http://localhost:5173";
      res.redirect(`${frontendUrl}/login?error=google_error`);
    }
  },
  (err, req, res, next) => {
    // Error handler for authentication failures
    logger.error("Google auth error", { error: err?.message });
    const frontendUrl = process.env.APP_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/login?error=google_failed`);
  },
);

module.exports = router;
