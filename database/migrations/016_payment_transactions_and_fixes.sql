-- Migration 016: Payment Transactions Table & Constraint Fixes
-- 1. Creates payment_transactions table for ACH payment audit trail
-- 2. No constraint change needed — code now uses 'succeeded' which matches existing CHECK

-- ============================================================
-- 1. PAYMENT TRANSACTIONS TABLE
-- ============================================================

-- Tracks every ACH payment attempt for audit and reconciliation.
-- One row per PaymentIntent creation — whether it succeeds or fails.
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL CONSTRAINT fk_payment_txn_organization REFERENCES organizations(id),
  payroll_run_id UUID CONSTRAINT fk_payment_txn_payroll_run REFERENCES payroll_runs(id),
  stripe_payment_intent_id TEXT UNIQUE,
  type TEXT NOT NULL DEFAULT 'ach_debit'
    CHECK (type IN ('ach_debit', 'refund', 'dispute')),
  amount_cents BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'disputed', 'refunded')),
  error_message TEXT,
  idempotency_key TEXT UNIQUE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_txn_org ON payment_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_txn_payroll_run ON payment_transactions(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payment_txn_status ON payment_transactions(status) WHERE status NOT IN ('succeeded', 'refunded');
CREATE INDEX IF NOT EXISTS idx_payment_txn_stripe_pi ON payment_transactions(stripe_payment_intent_id);

-- RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Read-only for org members via authenticated role
CREATE POLICY "org_read_payment_transactions" ON payment_transactions
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE profile_id = auth.uid()
  ));

-- ============================================================
-- 2. AUDIT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS audit_payment_transactions ON payment_transactions;
CREATE TRIGGER audit_payment_transactions
  AFTER INSERT OR UPDATE OR DELETE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
