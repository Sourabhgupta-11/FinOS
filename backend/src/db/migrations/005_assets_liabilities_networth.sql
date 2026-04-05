-- 005_assets_liabilities_networth.sql

-- ── Fix plan routing (expenses/bank/tax → Premium) ────────────────────────────
-- No schema change needed — handled in middleware

-- ── Fix AI usage limits ───────────────────────────────────────────────────────
-- free: 3/day, pro: 50/day, premium: unlimited
-- Handled in advisorController.js

-- ── Manual assets (car, house, crypto, gold, etc.) ───────────────────────────
CREATE TABLE IF NOT EXISTS manual_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  asset_category VARCHAR(50) NOT NULL CHECK (asset_category IN (
    'real_estate','vehicle','gold','crypto','fd','ppf','nps','epf','insurance',
    'business','other'
  )),
  current_value DECIMAL(16,2) NOT NULL DEFAULT 0,
  purchase_value DECIMAL(16,2),
  purchase_date DATE,
  notes TEXT,
  is_illiquid BOOLEAN DEFAULT false,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Manual liabilities (home loan, car loan, personal loan, CC debt) ──────────
CREATE TABLE IF NOT EXISTS manual_liabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  liability_type VARCHAR(50) NOT NULL CHECK (liability_type IN (
    'home_loan','car_loan','personal_loan','education_loan',
    'credit_card','gold_loan','business_loan','other'
  )),
  outstanding_amount DECIMAL(16,2) NOT NULL DEFAULT 0,
  original_amount DECIMAL(16,2),
  interest_rate DECIMAL(6,2),
  emi_amount DECIMAL(12,2),
  tenure_months INTEGER,
  start_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Financial goals ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  goal_type VARCHAR(50) NOT NULL CHECK (goal_type IN (
    'emergency_fund','house','car','education','retirement',
    'travel','wedding','business','other'
  )),
  target_amount DECIMAL(16,2) NOT NULL,
  current_amount DECIMAL(16,2) NOT NULL DEFAULT 0,
  target_date DATE,
  monthly_contribution DECIMAL(12,2),
  color VARCHAR(7) DEFAULT '#3b82f6',
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── External portfolio links (NSDL/CDSL/MF/broker) ───────────────────────────
CREATE TABLE IF NOT EXISTS external_portfolio_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  link_type VARCHAR(50) NOT NULL CHECK (link_type IN (
    'nsdl','cdsl','mf_central','zerodha','groww','upstox','angel','others'
  )),
  phone VARCHAR(15),
  pan_last4 VARCHAR(4),
  consent_id VARCHAR(255),
  consent_status VARCHAR(30) DEFAULT 'pending',
  last_fetched TIMESTAMP WITH TIME ZONE,
  fetch_due_date TIMESTAMP WITH TIME ZONE,
  data_snapshot JSONB,
  total_value DECIMAL(16,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Net worth snapshots ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_assets DECIMAL(16,2) NOT NULL DEFAULT 0,
  total_liabilities DECIMAL(16,2) NOT NULL DEFAULT 0,
  net_worth DECIMAL(16,2) NOT NULL DEFAULT 0,
  liquid_assets DECIMAL(16,2) DEFAULT 0,
  illiquid_assets DECIMAL(16,2) DEFAULT 0,
  breakdown JSONB,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_net_worth_user_date ON net_worth_snapshots(user_id, snapshot_date);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_manual_assets_user ON manual_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_liabilities_user ON manual_liabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_user ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_ext_portfolio_user ON external_portfolio_links(user_id);
CREATE INDEX IF NOT EXISTS idx_net_worth_user ON net_worth_snapshots(user_id);

-- Triggers
DO $$ BEGIN
  CREATE TRIGGER upd_manual_assets BEFORE UPDATE ON manual_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER upd_manual_liabilities BEFORE UPDATE ON manual_liabilities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER upd_goals BEFORE UPDATE ON financial_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
