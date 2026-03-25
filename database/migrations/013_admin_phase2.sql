-- Add bank verification fields to organization_members
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS bank_verified_at TIMESTAMPTZ;
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS bank_verified_by UUID REFERENCES profiles(id);

-- Add 'pending_approval' to payroll_status enum
ALTER TYPE payroll_status ADD VALUE IF NOT EXISTS 'pending_approval';
