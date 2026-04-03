-- 002_feature_expansion.sql

-- ── Subscriptions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  razorpay_subscription_id VARCHAR(255) UNIQUE,
  razorpay_customer_id VARCHAR(255),
  plan VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (plan IN ('free','premium')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','pending')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ── Email verifications ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Password resets ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Email verified flag on users ──────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- ── Push notification subscriptions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_label VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- ── Portfolio holdings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('stock','mutual_fund','etf','gold','fd','ppf','nps','crypto','other')),
  quantity DECIMAL(18,6) NOT NULL DEFAULT 0,
  avg_buy_price DECIMAL(14,4) NOT NULL DEFAULT 0,
  current_price DECIMAL(14,4),
  current_value DECIMAL(14,2),
  invested_value DECIMAL(14,2),
  gain_loss DECIMAL(14,2),
  gain_loss_pct DECIMAL(8,4),
  exchange VARCHAR(20),
  last_updated TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, symbol, asset_type)
);

-- ── Portfolio transactions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  holding_id UUID REFERENCES portfolio_holdings(id) ON DELETE SET NULL,
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

-- ── Tax calculations ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tax_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  financial_year VARCHAR(10) NOT NULL,
  gross_salary DECIMAL(14,2) NOT NULL,
  hra_received DECIMAL(14,2) DEFAULT 0,
  hra_exemption DECIMAL(14,2) DEFAULT 0,
  lta DECIMAL(14,2) DEFAULT 0,
  standard_deduction DECIMAL(14,2) DEFAULT 50000,
  deduction_80c DECIMAL(14,2) DEFAULT 0,
  deduction_80d DECIMAL(14,2) DEFAULT 0,
  deduction_80ccd DECIMAL(14,2) DEFAULT 0,
  deduction_80tta DECIMAL(14,2) DEFAULT 0,
  other_deductions DECIMAL(14,2) DEFAULT 0,
  old_regime_tax DECIMAL(14,2),
  new_regime_tax DECIMAL(14,2),
  recommended_regime VARCHAR(10),
  tax_saved DECIMAL(14,2),
  effective_old_rate DECIMAL(6,4),
  effective_new_rate DECIMAL(6,4),
  input_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Bank accounts linked ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('savings','current','credit_card','loan','demat','wallet')),
  account_number_masked VARCHAR(20),
  balance DECIMAL(14,2) DEFAULT 0,
  credit_limit DECIMAL(14,2),
  setu_fi_id VARCHAR(255),
  setu_consent_id VARCHAR(255),
  setu_consent_status VARCHAR(50) DEFAULT 'pending',
  is_manual BOOLEAN DEFAULT true,
  color VARCHAR(7) DEFAULT '#3b82f6',
  icon VARCHAR(50) DEFAULT 'bank',
  last_synced TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Transaction categories ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7),
  type VARCHAR(20) NOT NULL CHECK (type IN ('income','expense')),
  is_default BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default categories (shared, user_id = NULL)
INSERT INTO categories (name, icon, color, type, is_default) VALUES
  ('Salary',        'briefcase',    '#10b981', 'income',  true),
  ('Freelance',     'laptop',       '#3b82f6', 'income',  true),
  ('Investment',    'trending-up',  '#8b5cf6', 'income',  true),
  ('Other Income',  'plus-circle',  '#6b7280', 'income',  true),
  ('Food & Dining', 'utensils',     '#ef4444', 'expense', true),
  ('Transport',     'car',          '#f59e0b', 'expense', true),
  ('Shopping',      'shopping-bag', '#ec4899', 'expense', true),
  ('Entertainment', 'film',         '#8b5cf6', 'expense', true),
  ('Utilities',     'zap',          '#06b6d4', 'expense', true),
  ('Rent & Housing','home',         '#64748b', 'expense', true),
  ('Health',        'heart',        '#ef4444', 'expense', true),
  ('Education',     'book',         '#3b82f6', 'expense', true),
  ('Insurance',     'shield',       '#10b981', 'expense', true),
  ('Investments',   'trending-up',  '#8b5cf6', 'expense', true),
  ('EMI / Loan',    'credit-card',  '#f97316', 'expense', true),
  ('Travel',        'plane',        '#14b8a6', 'expense', true),
  ('Subscriptions', 'repeat',       '#6366f1', 'expense', true),
  ('Personal Care', 'user',         '#fb7185', 'expense', true),
  ('Gifts',         'gift',         '#f59e0b', 'expense', true),
  ('Other',         'more-horizontal','#6b7280','expense',true)
ON CONFLICT DO NOTHING;

-- ── Financial transactions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('income','expense','transfer')),
  amount DECIMAL(14,2) NOT NULL,
  description TEXT NOT NULL,
  merchant VARCHAR(255),
  notes TEXT,
  tags TEXT[],
  transaction_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurring_interval VARCHAR(20),
  source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual','setu','csv_import','auto')),
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Budgets ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  period VARCHAR(20) NOT NULL CHECK (period IN ('monthly','quarterly','yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  alert_at_pct INTEGER DEFAULT 80,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Notification log ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_read BOOLEAN DEFAULT false,
  action_url VARCHAR(255),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Razorpay webhook events (idempotency) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(50) NOT NULL,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_bank ON transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON portfolio_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_tx_user_id ON portfolio_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_webhook_events_id ON webhook_events(event_id);

-- Triggers
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_portfolio_holdings_updated_at BEFORE UPDATE ON portfolio_holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
