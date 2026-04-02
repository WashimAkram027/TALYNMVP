-- Migration 029: Add review request fields to payroll_items
-- Allows employers to flag payroll issues and admins to resolve them

ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT NULL;
-- NULL = no review, 'pending' = flagged by employer, 'in_progress' = admin working, 'resolved' = done

ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS review_notes JSONB DEFAULT NULL;
-- Array of review entries: [{ type, description, submitted_by, submitted_at, resolved_by, resolved_at, resolution_notes }]

ALTER TABLE payroll_items ADD CONSTRAINT payroll_items_review_status_check
CHECK (review_status IS NULL OR review_status IN ('pending', 'in_progress', 'resolved'));

COMMENT ON COLUMN payroll_items.review_status IS 'Review request status: NULL, pending, in_progress, resolved';
COMMENT ON COLUMN payroll_items.review_notes IS 'JSONB array of review request and resolution entries';
