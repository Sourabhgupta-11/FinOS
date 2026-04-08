-- 004_add_lemonsqueezy_support.sql
-- Adds Lemonsqueezy payment integration columns
-- Safe to re-run. Only adds columns if they don't exist.

-- Add Lemonsqueezy columns to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS lemonsqueezy_subscription_id VARCHAR(255) UNIQUE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS lemonsqueezy_customer_id VARCHAR(255);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS lemonsqueezy_plan_type VARCHAR(20);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'lemonsqueezy';

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemonsqueezy_id 
  ON subscriptions(lemonsqueezy_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemonsqueezy_customer 
  ON subscriptions(lemonsqueezy_customer_id);

-- Ensure webhook_events table exists
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(50) NOT NULL,
  event_id VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_type 
  ON webhook_events(provider, event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed 
  ON webhook_events(processed);
