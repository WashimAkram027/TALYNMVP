-- Add pending_bank_details column for pre-Wise bank details storage
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_bank_details JSONB;

-- Set existing candidates as onboarded (prevent lockout)
UPDATE profiles
SET onboarding_completed = true, onboarding_step = null
WHERE role = 'candidate' AND email_verified = true;

-- Set onboarding_step = 1 for unverified candidates (they haven't started yet)
UPDATE profiles
SET onboarding_step = 1
WHERE role = 'candidate' AND (email_verified = false OR email_verified IS NULL)
  AND onboarding_completed = false;
