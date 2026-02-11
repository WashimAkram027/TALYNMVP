-- =============================================
-- Migration 004: Fix Cascade Deletes
-- Run this in Supabase SQL Editor
-- =============================================
--
-- Problem: When deleting a user from profiles, signup still says user exists
-- because the user still exists in auth.users (Supabase Auth).
--
-- This migration:
-- 1. Adds a trigger to delete from auth.users when profiles is deleted
-- 2. Fixes missing ON DELETE clauses on foreign keys referencing profiles(id)
-- =============================================

-- =============================================
-- STEP 1: Create trigger to delete auth.users when profile is deleted
-- =============================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_profile_deleted ON profiles;
DROP FUNCTION IF EXISTS delete_auth_user();

-- Create function to delete auth.users entry when profile is deleted
-- Uses SECURITY DEFINER to have permission to delete from auth.users
CREATE OR REPLACE FUNCTION delete_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the auth.users record (requires service role)
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that runs BEFORE DELETE on profiles
-- This ensures auth.users is cleaned up when profile is deleted
CREATE TRIGGER on_profile_deleted
BEFORE DELETE ON profiles
FOR EACH ROW
EXECUTE FUNCTION delete_auth_user();

-- =============================================
-- STEP 2: Fix organization_members.invited_by
-- =============================================

-- Drop existing constraint (may have different name depending on how it was created)
ALTER TABLE organization_members
DROP CONSTRAINT IF EXISTS organization_members_invited_by_fkey;

-- Recreate with ON DELETE SET NULL
ALTER TABLE organization_members
ADD CONSTRAINT organization_members_invited_by_fkey
FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- =============================================
-- STEP 3: Fix payroll_runs.created_by
-- =============================================

ALTER TABLE payroll_runs
DROP CONSTRAINT IF EXISTS payroll_runs_created_by_fkey;

ALTER TABLE payroll_runs
ADD CONSTRAINT payroll_runs_created_by_fkey
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- =============================================
-- STEP 4: Fix time_off_requests.reviewed_by
-- =============================================

ALTER TABLE time_off_requests
DROP CONSTRAINT IF EXISTS time_off_requests_reviewed_by_fkey;

ALTER TABLE time_off_requests
ADD CONSTRAINT time_off_requests_reviewed_by_fkey
FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- =============================================
-- STEP 5: Fix job_postings.created_by
-- =============================================

ALTER TABLE job_postings
DROP CONSTRAINT IF EXISTS job_postings_created_by_fkey;

ALTER TABLE job_postings
ADD CONSTRAINT job_postings_created_by_fkey
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- =============================================
-- STEP 6: Fix application_activities.created_by
-- =============================================

ALTER TABLE application_activities
DROP CONSTRAINT IF EXISTS application_activities_created_by_fkey;

ALTER TABLE application_activities
ADD CONSTRAINT application_activities_created_by_fkey
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- =============================================
-- STEP 7: Fix invoices.created_by
-- =============================================

ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS invoices_created_by_fkey;

ALTER TABLE invoices
ADD CONSTRAINT invoices_created_by_fkey
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- =============================================
-- STEP 8: Fix documents.uploaded_by
-- =============================================

ALTER TABLE documents
DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey;

ALTER TABLE documents
ADD CONSTRAINT documents_uploaded_by_fkey
FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- =============================================
-- STEP 9: Fix announcements.author_id
-- Make column nullable first, then add constraint with ON DELETE SET NULL
-- =============================================

-- Make author_id nullable (it was NOT NULL before)
ALTER TABLE announcements
ALTER COLUMN author_id DROP NOT NULL;

-- Drop and recreate foreign key constraint
ALTER TABLE announcements
DROP CONSTRAINT IF EXISTS announcements_author_id_fkey;

ALTER TABLE announcements
ADD CONSTRAINT announcements_author_id_fkey
FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- =============================================
-- VERIFICATION QUERIES (optional - run to verify)
-- =============================================
--
-- Check that the trigger was created:
-- SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname = 'on_profile_deleted';
--
-- Check foreign key constraints:
-- SELECT
--   tc.constraint_name,
--   tc.table_name,
--   kcu.column_name,
--   rc.delete_rule
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.referential_constraints rc
--   ON tc.constraint_name = rc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND kcu.column_name IN ('invited_by', 'created_by', 'reviewed_by', 'uploaded_by', 'author_id');
--
-- =============================================
-- NOTES
-- =============================================
--
-- 1. Organization owners cannot be deleted (RESTRICT is intentional)
--    The fk_organizations_owner constraint prevents deletion of a profile
--    that owns an organization. User must transfer ownership first.
--
-- 2. Proper user deletion flow:
--    a) If user owns an organization: transfer ownership or delete org first
--    b) DELETE FROM profiles WHERE id = 'user-id';
--    c) Trigger automatically deletes from auth.users
--    d) All created_by, uploaded_by, etc. fields become NULL
--
-- 3. Tables with correct CASCADE (no changes needed):
--    - organization_members.profile_id -> CASCADE
--    - organization_members.organization_id -> CASCADE
--    - applications.candidate_id -> CASCADE
--    - password_reset_tokens.user_id -> CASCADE
--    - email_verification_tokens.user_id -> CASCADE
--    - activity_log.user_id -> SET NULL
-- =============================================
