-- Migration 008: Payment & Payroll Foundation (Phase 0)
-- Creates financial infrastructure tables and extends existing tables
-- for Stripe ACH inbound + Wise NPR outbound payment flow.

-- ============================================================
-- 1. EXTEND EXISTING TABLES
-- ============================================================

-- organizations: add payment provider references
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS wise_profile_id TEXT,
  ADD COLUMN IF NOT EXISTS default_payment_method_id UUID,
  ADD COLUMN IF NOT EXISTS billing_email TEXT;

-- payroll_runs: add Stripe payment tracking
ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'none'
    CHECK (payment_status IN ('none','pending','ach_processing','succeeded','failed','disputed')),
  ADD COLUMN IF NOT EXISTS funded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_pull_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS platform_fee_cents BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wise_batch_group_id TEXT;

-- payroll_items: add Wise transfer tracking
ALTER TABLE payroll_items
  ADD COLUMN IF NOT EXISTS wise_transfer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS transfer_status TEXT DEFAULT 'pending'
    CHECK (transfer_status IN ('pending','transfer_created','processing','funds_converted',
                                'completed','failed','bounced_back','cancelled')),
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12,6),
  ADD COLUMN IF NOT EXISTS target_amount_npr BIGINT,
  ADD COLUMN IF NOT EXISTS payout_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- organization_members: add Wise recipient reference
ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS wise_recipient_id TEXT;

-- ============================================================
-- 2. NEW TABLES
-- ============================================================

-- payment_methods: employer bank accounts linked via Stripe
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL CONSTRAINT fk_payment_methods_organization REFERENCES organizations(id),
  stripe_payment_method_id TEXT UNIQUE NOT NULL,
  stripe_setup_intent_id TEXT,
  type TEXT NOT NULL DEFAULT 'us_bank_account',
  status TEXT NOT NULL DEFAULT 'pending_verification'
    CHECK (status IN ('pending_verification','verifying_microdeposits','active',
                      'failed','expired','requires_reauthorization')),
  bank_name TEXT,
  last_four TEXT,
  mandate_status TEXT DEFAULT 'pending'
    CHECK (mandate_status IN ('pending','active','inactive','revoked')),
  is_default BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_methods_org ON payment_methods(organization_id);

-- account_balances: cached employer balance (one row per org)
CREATE TABLE IF NOT EXISTS account_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE CONSTRAINT fk_account_balances_organization REFERENCES organizations(id),
  balance_cents BIGINT NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ledger_transfers: atomic financial movements (double-entry parent)
CREATE TABLE IF NOT EXISTS ledger_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  organization_id UUID NOT NULL CONSTRAINT fk_ledger_transfers_organization REFERENCES organizations(id),
  type TEXT NOT NULL CHECK (type IN ('ach_credit','payroll_debit','platform_fee',
                                      'refund','adjustment','reversal')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_transfers_org ON ledger_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_ledger_transfers_created ON ledger_transfers(organization_id, created_at);

-- ledger_entries: individual debit/credit legs (must sum to zero per transfer)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL CONSTRAINT fk_ledger_entries_transfer REFERENCES ledger_transfers(id),
  account_type TEXT NOT NULL CHECK (account_type IN ('employer_balance','stripe_receivable',
                                                      'wise_payable','platform_revenue','suspense')),
  organization_id UUID NOT NULL CONSTRAINT fk_ledger_entries_organization REFERENCES organizations(id),
  amount_cents BIGINT NOT NULL, -- positive = credit, negative = debit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_transfer ON ledger_entries(transfer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_org ON ledger_entries(organization_id);

-- Immutability trigger: prevent modification of ledger entries
CREATE OR REPLACE FUNCTION prevent_ledger_modification() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Ledger entries are immutable. Create a compensating entry instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_update_ledger_entries ON ledger_entries;
CREATE TRIGGER no_update_ledger_entries
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

-- wise_recipients: employee bank accounts registered with Wise
CREATE TABLE IF NOT EXISTS wise_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL CONSTRAINT fk_wise_recipients_employee REFERENCES organization_members(id),
  organization_id UUID NOT NULL CONSTRAINT fk_wise_recipients_organization REFERENCES organizations(id),
  wise_recipient_id TEXT UNIQUE NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'NPR',
  bank_name TEXT,
  account_last_four TEXT,
  account_holder_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wise_recipients_employee ON wise_recipients(employee_id);
CREATE INDEX IF NOT EXISTS idx_wise_recipients_org ON wise_recipients(organization_id);

-- wise_transfers: individual payout records per payroll item
CREATE TABLE IF NOT EXISTS wise_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_item_id UUID NOT NULL CONSTRAINT fk_wise_transfers_payroll_item REFERENCES payroll_items(id),
  payroll_run_id UUID NOT NULL CONSTRAINT fk_wise_transfers_payroll_run REFERENCES payroll_runs(id),
  organization_id UUID NOT NULL CONSTRAINT fk_wise_transfers_organization REFERENCES organizations(id),
  wise_transfer_id TEXT UNIQUE,
  wise_quote_id TEXT,
  wise_batch_group_id TEXT,
  customer_transaction_id TEXT UNIQUE NOT NULL, -- idempotency key
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','incoming_payment_waiting','processing',
                      'funds_converted','outgoing_payment_sent',
                      'bounced_back','cancelled','funds_refunded','failed')),
  source_amount_cents BIGINT NOT NULL,
  source_currency CHAR(3) NOT NULL DEFAULT 'USD',
  target_amount BIGINT, -- in target currency minor units
  target_currency CHAR(3) NOT NULL DEFAULT 'NPR',
  exchange_rate NUMERIC(12,6),
  wise_fee_cents BIGINT,
  error_code TEXT,
  error_message TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wise_transfers_payroll_run ON wise_transfers(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_wise_transfers_org ON wise_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_wise_transfers_status ON wise_transfers(status) WHERE status NOT IN ('outgoing_payment_sent','cancelled');

-- webhook_events: idempotency log for Stripe and Wise
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'wise')),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','processing','completed','failed')),
  payload JSONB,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, event_id)
);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at);

-- audit_log: immutable record of all financial state changes
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data JSONB,
  new_data JSONB,
  performed_by UUID,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_org ON audit_log(organization_id, created_at);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE wise_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE wise_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Read-only policies for authenticated users (org-scoped)
-- All writes happen through backend service_role client

CREATE POLICY "org_read_payment_methods" ON payment_methods
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE profile_id = auth.uid()
  ));

CREATE POLICY "org_read_account_balances" ON account_balances
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE profile_id = auth.uid()
  ));

CREATE POLICY "org_read_ledger_transfers" ON ledger_transfers
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE profile_id = auth.uid()
  ));

CREATE POLICY "org_read_ledger_entries" ON ledger_entries
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE profile_id = auth.uid()
  ));

CREATE POLICY "org_read_wise_recipients" ON wise_recipients
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE profile_id = auth.uid()
  ));

CREATE POLICY "org_read_wise_transfers" ON wise_transfers
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE profile_id = auth.uid()
  ));

-- webhook_events and audit_log: no authenticated user access
-- Only accessible via service_role
