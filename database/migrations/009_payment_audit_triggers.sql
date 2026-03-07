-- Migration 009: Payment Audit Triggers
-- Attaches audit_log triggers to financial tables for immutable change tracking.

-- ============================================================
-- 1. AUDIT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION audit_log_trigger() RETURNS TRIGGER AS $$
DECLARE
  _org_id UUID;
  _old JSONB := NULL;
  _new JSONB := NULL;
BEGIN
  -- Extract organization_id from the row (most financial tables have it)
  IF TG_OP = 'DELETE' THEN
    _old := to_jsonb(OLD);
    _org_id := OLD.organization_id;
  ELSE
    _new := to_jsonb(NEW);
    _org_id := NEW.organization_id;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    _old := to_jsonb(OLD);
  END IF;

  INSERT INTO audit_log (
    organization_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    created_at
  ) VALUES (
    _org_id,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    _old,
    _new,
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. ATTACH TRIGGERS TO FINANCIAL TABLES
-- ============================================================

-- payroll_runs
DROP TRIGGER IF EXISTS audit_payroll_runs ON payroll_runs;
CREATE TRIGGER audit_payroll_runs
  AFTER INSERT OR UPDATE OR DELETE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- payroll_items
DROP TRIGGER IF EXISTS audit_payroll_items ON payroll_items;
CREATE TRIGGER audit_payroll_items
  AFTER INSERT OR UPDATE OR DELETE ON payroll_items
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- payment_methods
DROP TRIGGER IF EXISTS audit_payment_methods ON payment_methods;
CREATE TRIGGER audit_payment_methods
  AFTER INSERT OR UPDATE OR DELETE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- wise_transfers
DROP TRIGGER IF EXISTS audit_wise_transfers ON wise_transfers;
CREATE TRIGGER audit_wise_transfers
  AFTER INSERT OR UPDATE OR DELETE ON wise_transfers
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- wise_recipients
DROP TRIGGER IF EXISTS audit_wise_recipients ON wise_recipients;
CREATE TRIGGER audit_wise_recipients
  AFTER INSERT OR UPDATE OR DELETE ON wise_recipients
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
