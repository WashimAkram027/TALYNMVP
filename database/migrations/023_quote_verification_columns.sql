-- Add quote verification columns to organization_members
-- Used during employee onboarding to verify employment details and EOR quote
ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS quote_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS quote_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quote_dispute_note TEXT;
