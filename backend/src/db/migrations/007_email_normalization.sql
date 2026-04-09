-- 007_email_normalization.sql
-- Implement case-insensitive email uniqueness
-- Normalize ALL existing emails to lowercase
-- Add generated column and unique constraint

-- Step 1: First, update all existing emails to lowercase
UPDATE users SET email = LOWER(TRIM(email))
WHERE email != LOWER(TRIM(email));

-- Step 2: Delete duplicate emails (keep only the first one, oldest first)
DELETE FROM users
WHERE id NOT IN (
  SELECT DISTINCT ON (LOWER(email)) id
  FROM users
  ORDER BY LOWER(email), created_at ASC
);

-- Step 3: Drop the old simple unique constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Step 4: Create a unique index using LOWER function (PostgreSQL requires this instead of constraint)
DROP INDEX IF EXISTS idx_users_email_lower;
CREATE UNIQUE INDEX idx_users_email_lower ON users (LOWER(email));
