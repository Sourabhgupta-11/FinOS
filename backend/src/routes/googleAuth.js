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
        const rawEmail = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const googleId = profile.id;

        if (!rawEmail)
          return done(new Error("No email returned from Google"), null);

        // Normalize email: lowercase, trim whitespace
        const email = rawEmail.toLowerCase().trim();

        // Check if user already exists with this email (case-insensitive)
        const existing = await query(
          "SELECT id, email, name, google_id, password_hash FROM users WHERE LOWER(email) = LOWER($1)",
          [email],
        );

        let user = existing.rows[0];

        if (user) {
          // User exists - link Google to this account if not already linked
          if (!user.google_id) {
            // User previously signed up with password - link Google to same account
            await query(
              "UPDATE users SET google_id = $1, email_verified = true WHERE id = $2",
              [googleId, user.id],
            );
            logger.info("Google linked to existing password account", {
              userId: user.id,
              email: user.email,
            });
          } else if (user.google_id === googleId) {
            // Same Google account, user just logging in
            logger.info("Google user logged in", {
              userId: user.id,
              email: user.email,
            });
          } else {
            // Different Google ID with same email - suspicious activity
            logger.warn("Multiple Google IDs for same email attempted", {
              email: user.email,
              existingGoogleId: user.google_id,
              newGoogleId: googleId,
            });
            // Still return existing user to prevent account takeover
            return done(null, user);
          }
          return done(null, user);
        } else {
          // Create new user — password_hash is NULL for Google users
          try {
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
          } catch (dbErr) {
            // Handle race condition: unique constraint violated
            if (dbErr.code === "23505") {
              logger.warn(
                "Duplicate email during Google OAuth (race condition)",
                {
                  email: email,
                },
              );
              // Retry the lookup - the other request should have inserted by now
              const retryExisting = await query(
                "SELECT id, email, name, google_id, password_hash FROM users WHERE LOWER(email) = LOWER($1)",
                [email],
              );
              if (retryExisting.rows[0]) {
                user = retryExisting.rows[0];
                // Link Google if not already linked
                if (!user.google_id) {
                  await query(
                    "UPDATE users SET google_id = $1, email_verified = true WHERE id = $2",
                    [googleId, user.id],
                  );
                }
                return done(null, user);
              }
            }
            throw dbErr;
          }
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
      logger.info("User logged in via Google", {
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
