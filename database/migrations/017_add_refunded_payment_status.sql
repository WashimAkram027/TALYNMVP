-- Add 'refunded' to payroll_runs.payment_status CHECK constraint
-- Required for handling charge.refunded webhook events
ALTER TABLE payroll_runs
  DROP CONSTRAINT IF EXISTS payroll_runs_payment_status_check;

ALTER TABLE payroll_runs
  ADD CONSTRAINT payroll_runs_payment_status_check
  CHECK (payment_status IN ('none','pending','ach_processing','succeeded','failed','disputed','refunded'));
