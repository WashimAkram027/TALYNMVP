-- Step 1: Address + nationality for employees (JSONB, consistent with pending_bank_details pattern)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address JSONB;

-- Step 2: Emergency contact for employees (JSONB on membership row)
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS emergency_contact JSONB;
