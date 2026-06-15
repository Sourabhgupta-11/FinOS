-- 009_launch_features.sql
-- Launch features: waitlist, subscription tracking, and launch pricing

-- Waitlist table for pre-launch registrations
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notified_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at DESC);

-- Launch configuration tracking
CREATE TABLE IF NOT EXISTS launch_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  description VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial launch config
INSERT INTO launch_config (config_key, config_value, description) VALUES
  ('free_tier_limit', '5', 'Number of users who get free subscription for 6 months'),
  ('pro_discounted_limit', '5', 'Number of Pro subscriptions at launch discount price'),
  ('premium_discounted_limit', '5', 'Number of Premium subscriptions at launch discount price'),
  ('launch_mode_enabled', 'true', 'Enable/disable launch pricing'),
  ('free_tier_months', '3', 'How many months the free tier subscriptions are free')
ON CONFLICT (config_key) DO NOTHING;

-- Track subscription count for launch pricing
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_launch_free BOOLEAN DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS free_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS subscription_number INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS launch_price DECIMAL(10,2);

CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_number ON subscriptions(subscription_number) WHERE subscription_number IS NOT NULL;
