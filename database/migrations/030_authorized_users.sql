-- Migration 030: Authorized Users
-- Adds invitation token columns to organization_members for the authorized user invite flow.
-- member_role is a Postgres enum. Migration 031 adds 'authorized_user' to it.

-- Add invitation token columns
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS invitation_token_hash TEXT;

ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS invitation_token_expires_at TIMESTAMPTZ;

-- Index for fast token lookup during account setup
CREATE INDEX IF NOT EXISTS idx_members_invitation_token_hash
ON organization_members(invitation_token_hash)
WHERE invitation_token_hash IS NOT NULL;
