-- 003_fixes_and_plans.sql
-- Safe to re-run. Fixes plan constraints, adds Pro tier, AI usage tracking.

-- Ensure subscriptions table exists (in case 002 didn't run)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  razorpay_subscription_id VARCHAR(255) UNIQUE,
  razorpay_customer_id VARCHAR(255),
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Drop old constraint and recreate with 'pro' added
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_check CHECK (plan IN ('free','pro','premium')),
  ADD CONSTRAINT subscriptions_status_check CHECK (status IN ('active','cancelled','expired','pending','halted'));

-- Ensure all existing users have a subscriptions row defaulting to free
INSERT INTO subscriptions (user_id, plan, status)
SELECT id, 'free', 'active' FROM users
ON CONFLICT (user_id) DO NOTHING;

-- AI daily usage tracking (for free plan rate limiting)
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

-- Razorpay pro plan id column
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_plan_type VARCHAR(20);

-- Ensure categories table exists (safe fallback)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7),
  type VARCHAR(20) NOT NULL CHECK (type IN ('income','expense')),
  is_default BOOLEAN DEFAULT false,
  parent_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories if not present
INSERT INTO categories (name, icon, color, type, is_default) VALUES
  ('Salary','briefcase','#10b981','income',true),
  ('Freelance','laptop','#3b82f6','income',true),
  ('Investment','trending-up','#8b5cf6','income',true),
  ('Other Income','plus-circle','#6b7280','income',true),
  ('Food & Dining','utensils','#ef4444','expense',true),
  ('Transport','car','#f59e0b','expense',true),
  ('Shopping','shopping-bag','#ec4899','expense',true),
  ('Entertainment','film','#8b5cf6','expense',true),
  ('Utilities','zap','#06b6d4','expense',true),
  ('Rent & Housing','home','#64748b','expense',true),
  ('Health','heart','#ef4444','expense',true),
  ('Education','book','#3b82f6','expense',true),
  ('Insurance','shield','#10b981','expense',true),
  ('Investments','trending-up','#8b5cf6','expense',true),
  ('EMI / Loan','credit-card','#f97316','expense',true),
  ('Travel','plane','#14b8a6','expense',true),
  ('Subscriptions','repeat','#6366f1','expense',true),
  ('Personal Care','user','#fb7185','expense',true),
  ('Gifts','gift','#f59e0b','expense',true),
  ('Other','more-horizontal','#6b7280','expense',true)
ON CONFLICT DO NOTHING;

-- Trigger for subscriptions updated_at
DO $$ BEGIN
  CREATE TRIGGER update_subscriptions_updated_at_v2
    BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_ai_usage_updated_at
    BEFORE UPDATE ON ai_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
