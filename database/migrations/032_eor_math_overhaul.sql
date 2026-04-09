-- EOR Math Overhaul
-- Adds 60% basic salary basis for SSF, severance accrual, exchange rate in quotes,
-- 13th month salary, document handling fee, and dual-currency (NPR + USD) display.

-- 1. New config columns on eor_cost_config
ALTER TABLE eor_cost_config
  ADD COLUMN IF NOT EXISTS basic_salary_ratio NUMERIC(5,4) NOT NULL DEFAULT 0.6000;

ALTER TABLE eor_cost_config
  ADD COLUMN IF NOT EXISTS document_handling_fee INTEGER NOT NULL DEFAULT 8000;

ALTER TABLE eor_cost_config
  ADD COLUMN IF NOT EXISTS document_handling_fee_currency TEXT NOT NULL DEFAULT 'USD';

ALTER TABLE eor_cost_config
  ADD COLUMN IF NOT EXISTS thirteenth_month_included BOOLEAN NOT NULL DEFAULT true;

-- Update platform fee from $599 to $499 for active Nepal config
UPDATE eor_cost_config
  SET platform_fee_amount = 49900,
      updated_at = now()
  WHERE country_code = 'NPL' AND is_active = true;

-- 2. New cost breakdown columns on eor_quotes
ALTER TABLE eor_quotes
  ADD COLUMN IF NOT EXISTS basic_salary_ratio NUMERIC(5,4);

ALTER TABLE eor_quotes
  ADD COLUMN IF NOT EXISTS basic_salary_amount INTEGER;

ALTER TABLE eor_quotes
  ADD COLUMN IF NOT EXISTS severance_amount INTEGER;

ALTER TABLE eor_quotes
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12,6);

ALTER TABLE eor_quotes
  ADD COLUMN IF NOT EXISTS monthly_gross_usd_cents INTEGER;

ALTER TABLE eor_quotes
  ADD COLUMN IF NOT EXISTS monthly_cost_usd_cents INTEGER;

ALTER TABLE eor_quotes
  ADD COLUMN IF NOT EXISTS total_annual_cost_usd_cents INTEGER;

ALTER TABLE eor_quotes
  ADD COLUMN IF NOT EXISTS thirteenth_month_amount INTEGER;

ALTER TABLE eor_quotes
  ADD COLUMN IF NOT EXISTS document_handling_fee INTEGER;

ALTER TABLE eor_quotes
  ADD COLUMN IF NOT EXISTS document_handling_fee_currency TEXT DEFAULT 'USD';
