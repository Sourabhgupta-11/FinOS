-- 004_bank_accounts_schema_fix.sql

-- Add IFSC code column
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20);
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS account_number_full_encrypted TEXT;

-- Make salary a proper account type
ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_account_type_check;
ALTER TABLE bank_accounts
  ADD CONSTRAINT bank_accounts_account_type_check
  CHECK (account_type IN (
    'savings','current','salary','credit_card','loan',
    'demat','wallet','rd','fd','ppf','nps'
  ));

-- Add ai_usage table if migration 003 didn't run
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, date);

-- Ensure subscriptions row exists for ALL current users
INSERT INTO subscriptions (user_id, plan, status)
SELECT id, 'free', 'active' FROM users
ON CONFLICT (user_id) DO NOTHING;

-- portfolio_transactions - ensure table exists
CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  holding_id UUID,
  symbol VARCHAR(50) NOT NULL,
  asset_type VARCHAR(50) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('buy','sell','sip','dividend','bonus')),
  quantity DECIMAL(18,6) NOT NULL,
  price DECIMAL(14,4) NOT NULL,
  total_amount DECIMAL(14,2) NOT NULL,
  fees DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_tx_user ON portfolio_transactions(user_id);
