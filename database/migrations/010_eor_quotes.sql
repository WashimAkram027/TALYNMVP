-- EOR Cost Configuration table
-- Stores statutory rates and platform fees per country
CREATE TABLE IF NOT EXISTS eor_cost_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL DEFAULT 'NPL',
  country_name text NOT NULL DEFAULT 'Nepal',
  currency text NOT NULL DEFAULT 'NPR',
  employer_ssf_rate numeric(5,4) NOT NULL DEFAULT 0.2000,
  employee_ssf_rate numeric(5,4) NOT NULL DEFAULT 0.1100,
  platform_fee_amount integer NOT NULL DEFAULT 59900,
  platform_fee_currency text NOT NULL DEFAULT 'USD',
  periods_per_year integer NOT NULL DEFAULT 12,
  is_active boolean NOT NULL DEFAULT true,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default Nepal config
INSERT INTO eor_cost_config (
  country_code, country_name, currency,
  employer_ssf_rate, employee_ssf_rate,
  platform_fee_amount, platform_fee_currency,
  periods_per_year, is_active, effective_from
) VALUES (
  'NPL', 'Nepal', 'NPR',
  0.2000, 0.1100,
  59900, 'USD',
  12, true, '2025-01-01'
);

-- EOR Quotes table
-- Stores generated cost quotes with full breakdown snapshot
CREATE TABLE IF NOT EXISTS eor_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'accepted', 'expired', 'cancelled')),

  -- Employee info snapshot
  employee_email text NOT NULL,
  employee_first_name text,
  employee_last_name text,
  job_title text,
  department text,
  employment_type text DEFAULT 'full_time',
  start_date date,

  -- Salary info
  annual_salary integer NOT NULL,
  salary_currency text NOT NULL DEFAULT 'NPR',
  pay_frequency text NOT NULL DEFAULT 'monthly',
  periods_per_year integer NOT NULL DEFAULT 12,
  monthly_gross_salary integer NOT NULL,

  -- Cost breakdown (all in minor units -- paisa for NPR, cents for USD)
  employer_ssf_rate numeric(5,4) NOT NULL,
  employer_ssf_amount integer NOT NULL,
  employee_ssf_rate numeric(5,4) NOT NULL,
  employee_ssf_amount integer NOT NULL,
  estimated_net_salary integer NOT NULL,
  platform_fee_amount integer NOT NULL,
  platform_fee_currency text NOT NULL DEFAULT 'USD',
  total_monthly_cost_local integer NOT NULL,
  total_annual_cost_local integer NOT NULL,

  -- Config snapshot
  config_snapshot jsonb NOT NULL DEFAULT '{}',
  country_code text NOT NULL DEFAULT 'NPL',

  -- Validity
  valid_until timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES profiles(id),

  -- Audit
  generated_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(organization_id, quote_number)
);

-- Add quote_id to organization_members
ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES eor_quotes(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eor_quotes_org ON eor_quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_eor_quotes_status ON eor_quotes(status);
CREATE INDEX IF NOT EXISTS idx_eor_quotes_number ON eor_quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_eor_cost_config_active ON eor_cost_config(country_code, is_active);

-- RLS policies
ALTER TABLE eor_cost_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE eor_quotes ENABLE ROW LEVEL SECURITY;

-- Config: read-only for authenticated users
CREATE POLICY "Authenticated users can read active config"
  ON eor_cost_config FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Quotes: org-scoped reads
CREATE POLICY "Users can read quotes for their org"
  ON eor_quotes FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Service role has full access (backend uses service_role key)
