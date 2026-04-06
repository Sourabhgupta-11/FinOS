-- 006_enforce_email_uniqueness.sql
-- Ensures email uniqueness is properly enforced
-- Handles edge cases and duplicates

-- Delete duplicate records (keep only the first one created per email)
DELETE FROM users
WHERE id NOT IN (
  SELECT DISTINCT ON (email) id
  FROM users
  ORDER BY email, created_at ASC
);

-- Create index for faster email lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Note: Email UNIQUE constraint already exists in the schema
-- This migration simply removes any duplicate email records
