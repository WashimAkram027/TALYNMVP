-- =============================================
-- Reset All Users Script
-- Run this in Supabase SQL Editor to delete all user data
-- WARNING: This deletes ALL users and related data!
-- =============================================

-- Disable triggers temporarily to avoid issues during cleanup
-- (We'll manually clean auth.users at the end)
ALTER TABLE profiles DISABLE TRIGGER on_profile_deleted;

-- =============================================
-- DELETE IN ORDER (respecting foreign keys)
-- =============================================

-- 1. Application-related tables
DELETE FROM application_activities;
DELETE FROM applications;

-- 2. Compliance tables
DELETE FROM compliance_alerts;
DELETE FROM compliance_items;

-- 3. Benefits tables
DELETE FROM benefits_enrollments;
DELETE FROM benefits_plans;

-- 4. Documents and Invoices
DELETE FROM documents;
DELETE FROM invoices;

-- 5. Payroll tables
DELETE FROM payroll_items;
DELETE FROM payroll_runs;

-- 6. Time off tables
DELETE FROM time_off_requests;
DELETE FROM time_off_balances;
DELETE FROM time_off_policies;

-- 7. Holidays (only org-specific, keep global holidays)
DELETE FROM holidays WHERE organization_id IS NOT NULL;

-- 8. Announcements and Job postings
DELETE FROM announcements;
DELETE FROM job_postings;

-- 9. Activity log
DELETE FROM activity_log;

-- 10. Email/Auth tokens
DELETE FROM email_verification_tokens;
DELETE FROM email_logs;
-- DELETE FROM password_reset_tokens; -- Uncomment if table exists

-- 11. Organization members
DELETE FROM organization_members;

-- 12. Break circular dependency: clear org reference from profiles
UPDATE profiles SET organization_id = NULL;

-- 13. Delete organizations (owner_id has RESTRICT, but profiles still exist)
DELETE FROM organizations;

-- 14. Delete profiles
DELETE FROM profiles;

-- 15. Delete from auth.users (the trigger was disabled)
DELETE FROM auth.users;

-- Re-enable the trigger
ALTER TABLE profiles ENABLE TRIGGER on_profile_deleted;

-- =============================================
-- VERIFICATION
-- =============================================
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL SELECT 'auth.users', COUNT(*) FROM auth.users
UNION ALL SELECT 'organizations', COUNT(*) FROM organizations
UNION ALL SELECT 'organization_members', COUNT(*) FROM organization_members
UNION ALL SELECT 'applications', COUNT(*) FROM applications
UNION ALL SELECT 'job_postings', COUNT(*) FROM job_postings;

-- =============================================
-- Expected output: All counts should be 0
-- =============================================
