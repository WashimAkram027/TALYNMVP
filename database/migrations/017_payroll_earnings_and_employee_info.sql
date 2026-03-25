-- Migration: 017_payroll_earnings_and_employee_info
-- Date: 2026-03-23
-- Description: Add employee identity fields, payroll approval tracking, and detailed earnings columns

-- 1. Add employee identity & bank fields to organization_members
ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS pan_number TEXT,
  ADD COLUMN IF NOT EXISTS ssf_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- 2. Add payroll approval tracking to payroll_runs
ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 3. Add detailed earnings columns to payroll_items
ALTER TABLE payroll_items
  ADD COLUMN IF NOT EXISTS dearness_allowance DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_allowance DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS festival_allowance DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leave_encashments DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_payments DECIMAL(12,2) DEFAULT 0;

-- 4. Recreate net_amount GENERATED column to include new earnings
ALTER TABLE payroll_items DROP COLUMN IF EXISTS net_amount;
ALTER TABLE payroll_items ADD COLUMN net_amount DECIMAL(12,2) GENERATED ALWAYS AS (
  base_salary
  + COALESCE(bonuses, 0)
  + COALESCE(dearness_allowance, 0)
  + COALESCE(other_allowance, 0)
  + COALESCE(festival_allowance, 0)
  + COALESCE(leave_encashments, 0)
  + COALESCE(other_payments, 0)
  - COALESCE(deductions, 0)
  - COALESCE(tax_amount, 0)
) STORED;
