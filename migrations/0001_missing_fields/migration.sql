-- Add missing columns to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS available_regions text[] DEFAULT NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS fiat_currency text NOT NULL DEFAULT 'USD';
ALTER TABLE offers ADD COLUMN IF NOT EXISTS price_type text NOT NULL DEFAULT 'fixed';
ALTER TABLE offers ADD COLUMN IF NOT EXISTS price_margin numeric(6, 2) DEFAULT NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS min_order_amount numeric(10, 2) DEFAULT NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS max_order_amount numeric(10, 2) DEFAULT NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS payment_time_limit integer DEFAULT 15;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS remarks text DEFAULT NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS auto_reply text DEFAULT NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS counterparty_conditions jsonb DEFAULT NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';