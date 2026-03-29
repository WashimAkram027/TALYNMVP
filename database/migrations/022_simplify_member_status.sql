-- Migration 022: Simplify member_status enum from 13 values to 3: invited, onboarding, active
-- Old values: invited, pending, active, inactive, offboarded, onboarding, onboarding_at_risk,
--             onboarding_overdue, ready_to_start, offboarding, in_review,
--             quote_requires_changes, no_active_contracts

-- Step 1: Map all existing rows to one of the 3 new statuses
UPDATE organization_members SET status = 'invited'
WHERE status IN ('pending', 'in_review', 'quote_requires_changes', 'no_active_contracts');

UPDATE organization_members SET status = 'onboarding'
WHERE status IN ('onboarding_at_risk', 'onboarding_overdue', 'ready_to_start');

UPDATE organization_members SET status = 'active'
WHERE status IN ('inactive', 'offboarding', 'offboarded');

-- Step 2: Create new enum type with only 3 values
CREATE TYPE member_status_new AS ENUM ('invited', 'onboarding', 'active');

-- Step 3: Swap the column to use the new enum
ALTER TABLE organization_members
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE organization_members
  ALTER COLUMN status TYPE member_status_new
  USING status::text::member_status_new;

ALTER TABLE organization_members
  ALTER COLUMN status SET DEFAULT 'invited'::member_status_new;

-- Step 4: Drop old type and rename new one
DROP TYPE member_status;
ALTER TYPE member_status_new RENAME TO member_status;
