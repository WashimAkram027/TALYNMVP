-- Migration: Remove Wise integration tables and columns
-- The payout model has changed: employees will NOT be paid via Wise.
-- Focus is now solely on employer-to-TALYN money movement via Stripe ACH.

-- Drop audit triggers on Wise tables
DROP TRIGGER IF EXISTS audit_wise_transfers ON wise_transfers;
DROP TRIGGER IF EXISTS audit_wise_recipients ON wise_recipients;

-- Drop Wise tables
DROP TABLE IF EXISTS wise_transfers CASCADE;
DROP TABLE IF EXISTS wise_recipients CASCADE;

-- Remove Wise columns from existing tables
ALTER TABLE organizations DROP COLUMN IF EXISTS wise_profile_id;
ALTER TABLE organization_members DROP COLUMN IF EXISTS wise_recipient_id;
ALTER TABLE payroll_runs DROP COLUMN IF EXISTS wise_batch_group_id;
ALTER TABLE payroll_items DROP COLUMN IF EXISTS wise_transfer_id;
ALTER TABLE payroll_items DROP COLUMN IF EXISTS transfer_status;
ALTER TABLE payroll_items DROP COLUMN IF EXISTS exchange_rate;
ALTER TABLE payroll_items DROP COLUMN IF EXISTS target_amount_npr;
ALTER TABLE payroll_items DROP COLUMN IF EXISTS payout_completed_at;

-- Clean up any 'wise' webhook_events before updating constraint
DELETE FROM webhook_events WHERE provider = 'wise';
ALTER TABLE webhook_events DROP CONSTRAINT IF EXISTS webhook_events_provider_check;
ALTER TABLE webhook_events ADD CONSTRAINT webhook_events_provider_check CHECK (provider IN ('stripe'));
