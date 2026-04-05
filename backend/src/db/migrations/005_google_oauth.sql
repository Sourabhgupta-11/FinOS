-- 005_google_oauth.sql
-- Adds Google OAuth support to the users table

-- Make password_hash optional (NULL allowed) for Google sign-in users
ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

-- Add Google OAuth ID column
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Add email_verified column (Google accounts are pre-verified)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Mark existing users as email-verified (they registered normally)
UPDATE users SET email_verified = true WHERE email_verified = false;

-- Index for fast Google ID lookup
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
