-- ============================================================
-- Migration 019: Monthly Invoice Billing Cycle
-- Extends invoice system for Employer→Talyn EOR billing
-- ============================================================

-- Step 1.1: Extend invoice_status enum with new values
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'payment_failed';

-- Step 1.2: Add billing columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'payslip';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payroll_run_id UUID REFERENCES payroll_runs(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_period_start DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_period_end DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal_local_cents BIGINT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS platform_fee_cents BIGINT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount_cents BIGINT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12,6);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS receipt_pdf_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('automatic', 'manual'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES profiles(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS config_snapshot JSONB;

-- Step 1.3: Add payment_type to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'automatic'
  CHECK (payment_type IN ('automatic', 'manual'));

-- Step 1.4: Add exchange_rate to eor_cost_config
ALTER TABLE eor_cost_config ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12,6);

-- Step 1.5: Add invoice_id FK to payroll_runs and payment_transactions
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id);

-- Step 1.6: Add indexes for billing invoice queries
CREATE INDEX IF NOT EXISTS idx_invoices_billing ON invoices(organization_id, billing_period_start) WHERE type = 'billing';
CREATE INDEX IF NOT EXISTS idx_invoices_status_billing ON invoices(status) WHERE type = 'billing';
CREATE INDEX IF NOT EXISTS idx_invoices_payroll_run ON invoices(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_pi ON invoices(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
