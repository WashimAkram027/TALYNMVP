-- Migration 005: Expand member_status enum with new lifecycle statuses
-- Current values: 'invited', 'pending', 'active', 'inactive', 'offboarded'
-- Adding: 'onboarding', 'onboarding_at_risk', 'onboarding_overdue',
--         'ready_to_start', 'offboarding', 'in_review',
--         'quote_requires_changes', 'no_active_contracts'

ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'onboarding';
ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'onboarding_at_risk';
ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'onboarding_overdue';
ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'ready_to_start';
ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'offboarding';
ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'in_review';
ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'quote_requires_changes';
ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'no_active_contracts';
