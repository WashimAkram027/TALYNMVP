-- =============================================
-- Migration 021: Fix Cascade Delete Trigger + Orphan Cleanup
-- =============================================
--
-- PROBLEM 1: The on_profile_deleted trigger is BEFORE DELETE,
-- which crashes with "tuple to be deleted was already modified
-- by an operation triggered by the current command".
-- FIX: Convert to AFTER DELETE trigger.
--
-- PROBLEM 2: Several FK constraints use NO ACTION which blocks
-- profile deletion. Fix them to SET NULL.
-- =============================================

-- STEP 1: Fix trigger timing from BEFORE to AFTER DELETE
DROP TRIGGER IF EXISTS on_profile_deleted ON profiles;

CREATE TRIGGER on_profile_deleted
AFTER DELETE ON profiles
FOR EACH ROW
EXECUTE FUNCTION delete_auth_user();

-- STEP 2: Fix NO ACTION FK constraints that block profile deletion
-- (change to SET NULL so deletion proceeds cleanly)

-- organization_members.created_by
ALTER TABLE organization_members
DROP CONSTRAINT IF EXISTS organization_members_created_by_fkey;

ALTER TABLE organization_members
ADD CONSTRAINT organization_members_created_by_fkey
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- organization_members.bank_verified_by (duplicate constraint)
ALTER TABLE organization_members
DROP CONSTRAINT IF EXISTS organization_members_bank_verified_by_fkey;

ALTER TABLE organization_members
ADD CONSTRAINT organization_members_bank_verified_by_fkey
FOREIGN KEY (bank_verified_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- organizations.entity_reviewed_by
ALTER TABLE organizations
DROP CONSTRAINT IF EXISTS organizations_entity_reviewed_by_fkey;

ALTER TABLE organizations
ADD CONSTRAINT organizations_entity_reviewed_by_fkey
FOREIGN KEY (entity_reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- entity_documents.uploaded_by
ALTER TABLE entity_documents
DROP CONSTRAINT IF EXISTS entity_documents_uploaded_by_fkey;

ALTER TABLE entity_documents
ADD CONSTRAINT entity_documents_uploaded_by_fkey
FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- eor_quotes.generated_by
ALTER TABLE eor_quotes
DROP CONSTRAINT IF EXISTS eor_quotes_generated_by_fkey;

ALTER TABLE eor_quotes
ADD CONSTRAINT eor_quotes_generated_by_fkey
FOREIGN KEY (generated_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- eor_quotes.accepted_by
ALTER TABLE eor_quotes
DROP CONSTRAINT IF EXISTS eor_quotes_accepted_by_fkey;

ALTER TABLE eor_quotes
ADD CONSTRAINT eor_quotes_accepted_by_fkey
FOREIGN KEY (accepted_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- invoices.approved_by
ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS invoices_approved_by_fkey;

ALTER TABLE invoices
ADD CONSTRAINT invoices_approved_by_fkey
FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- invoices.rejected_by
ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS invoices_rejected_by_fkey;

ALTER TABLE invoices
ADD CONSTRAINT invoices_rejected_by_fkey
FOREIGN KEY (rejected_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- payroll_runs.approved_by
ALTER TABLE payroll_runs
DROP CONSTRAINT IF EXISTS payroll_runs_approved_by_fkey;

ALTER TABLE payroll_runs
ADD CONSTRAINT payroll_runs_approved_by_fkey
FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- admin_activity_log.admin_id
ALTER TABLE admin_activity_log
DROP CONSTRAINT IF EXISTS admin_activity_log_admin_id_fkey;

ALTER TABLE admin_activity_log
ADD CONSTRAINT admin_activity_log_admin_id_fkey
FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- admin_roles.created_by
ALTER TABLE admin_roles
DROP CONSTRAINT IF EXISTS admin_roles_created_by_fkey;

ALTER TABLE admin_roles
ADD CONSTRAINT admin_roles_created_by_fkey
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- NOTE: fk_organizations_owner stays as RESTRICT intentionally.
-- Users who own organizations must transfer ownership first.
