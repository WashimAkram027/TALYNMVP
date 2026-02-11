-- Migration: Add invitation tracking columns to organization_members
-- Run this in Supabase SQL Editor

-- Add invitation_email column (stores email for invitations before profile exists)
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS invitation_email TEXT;

-- Add invited_at column (if not exists - may already exist)
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

-- Add joined_at column (if not exists - may already exist)
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ;

-- Add offboarded_at column (if not exists - may already exist)
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS offboarded_at TIMESTAMPTZ;

-- Add created_at column
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Add updated_at column
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add created_by column (who invited this member)
-- Note: This might conflict with existing invited_by column - check first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organization_members' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE organization_members ADD COLUMN created_by UUID REFERENCES profiles(id);
    END IF;
END $$;

-- Create index for email lookup (to match invitations with signups)
CREATE INDEX IF NOT EXISTS idx_members_invitation_email
ON organization_members(invitation_email) WHERE invitation_email IS NOT NULL;

-- Make profile_id nullable (allow invitations before user signs up)
ALTER TABLE organization_members
ALTER COLUMN profile_id DROP NOT NULL;

-- Add comment explaining the invitation flow
COMMENT ON COLUMN organization_members.invitation_email IS 'Email used for invitation, used to match with profile when user signs up';
COMMENT ON COLUMN organization_members.invited_at IS 'Timestamp when the invitation was created';
COMMENT ON COLUMN organization_members.joined_at IS 'Timestamp when status changed to active';

-- Create a trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to organization_members
DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
