-- 005_networth_portfolio_retention.sql

-- ── Net worth: Manual assets & liabilities ────────────────────────────────────
CREATE TABLE IF NOT EXISTS net_worth_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('asset','liability')),
  value DECIMAL(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nw_user ON net_worth_entries(user_id);

-- ── Portfolio linked accounts (broker/demat via phone) ────────────────────────
CREATE TABLE IF NOT EXISTS linked_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR(15) NOT NULL,
  broker_name VARCHAR(100),
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('demat','mf_folio','nps','epf','crypto','other')),
  account_id VARCHAR(255),
  pan_number VARCHAR(10),
  link_status VARCHAR(30) DEFAULT 'pending' CHECK (link_status IN ('pending','active','expired','failed')),
  consent_id VARCHAR(255),
  last_synced TIMESTAMP WITH TIME ZONE,
  next_refresh_due TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, phone_number, account_type)
);
CREATE INDEX IF NOT EXISTS idx_linked_accounts_user ON linked_accounts(user_id);

-- ── AI portfolio insights cache ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) NOT NULL DEFAULT 'full',
  content TEXT NOT NULL,
  model VARCHAR(100),
  portfolio_snapshot JSONB,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);
CREATE INDEX IF NOT EXISTS idx_insights_user ON portfolio_insights(user_id, generated_at DESC);

-- ── Data retention: sessions and messages kept 30 days after last activity ─────
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days');
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Function to refresh session expiry on activity
CREATE OR REPLACE FUNCTION refresh_session_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity = NOW();
  NEW.expires_at = NOW() + INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER refresh_session_on_update
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION refresh_session_expiry();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Update plan constraints to new structure ──────────────────────────────────
-- Pro: expenses, bank, budgets, notifications, chat history, AI 100/day
-- Premium: portfolio, tax, history, simulator, AI unlimited, insights, net worth

-- Update plan check if needed
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free','pro','premium'));

-- Ensure all users have subscription row
INSERT INTO subscriptions (user_id, plan, status)
SELECT id, 'free', 'active' FROM users
ON CONFLICT (user_id) DO NOTHING;

-- ── Mutual fund benchmarks reference ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mf_benchmarks (
  scheme_code VARCHAR(20) PRIMARY KEY,
  scheme_name VARCHAR(500),
  benchmark_name VARCHAR(255),
  category VARCHAR(100),
  sub_category VARCHAR(100),
  amc VARCHAR(255),
  expense_ratio DECIMAL(5,3),
  aum_cr DECIMAL(14,2),
  nav DECIMAL(14,4),
  nav_date DATE,
  returns_1y DECIMAL(8,4),
  returns_3y DECIMAL(8,4),
  returns_5y DECIMAL(8,4),
  benchmark_1y DECIMAL(8,4),
  benchmark_3y DECIMAL(8,4),
  benchmark_5y DECIMAL(8,4),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Holdings: add MF scheme details ──────────────────────────────────────────
ALTER TABLE portfolio_holdings ADD COLUMN IF NOT EXISTS scheme_code VARCHAR(20);
ALTER TABLE portfolio_holdings ADD COLUMN IF NOT EXISTS folio_number VARCHAR(50);
ALTER TABLE portfolio_holdings ADD COLUMN IF NOT EXISTS broker VARCHAR(100);
ALTER TABLE portfolio_holdings ADD COLUMN IF NOT EXISTS linked_account_id UUID REFERENCES linked_accounts(id);
ALTER TABLE portfolio_holdings ADD COLUMN IF NOT EXISTS data_source VARCHAR(30) DEFAULT 'manual';
ALTER TABLE portfolio_holdings ADD COLUMN IF NOT EXISTS isin VARCHAR(20);
