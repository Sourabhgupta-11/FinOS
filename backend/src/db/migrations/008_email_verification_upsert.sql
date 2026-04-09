-- Ensure email_verifications has a unique constraint on user_id for ON CONFLICT upsert
ALTER TABLE email_verifications
  DROP CONSTRAINT IF EXISTS email_verifications_user_id_key;

ALTER TABLE email_verifications
  ADD CONSTRAINT email_verifications_user_id_key UNIQUE (user_id);