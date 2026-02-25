-- Migration: Add onboarding and address fields for employer onboarding wizard
-- Run this in the Supabase SQL Editor

-- Add onboarding fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER;

-- Add address and service fields to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'eor';

-- Add CHECK constraint for service_type
ALTER TABLE organizations
  ADD CONSTRAINT chk_service_type
  CHECK (service_type IN ('eor', 'hire_talent', 'both'));

-- Index for finding employers mid-onboarding
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_step
  ON profiles (onboarding_step)
  WHERE onboarding_step IS NOT NULL;
