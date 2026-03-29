-- Add day-count, SSF, and leave deduction columns to payroll_items
-- These fields make payroll items reflect the actual prorated salary
-- accounting for unpaid leave, public holidays, and weekly offs.

ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS gross_salary DECIMAL(12,2);
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS employer_ssf DECIMAL(12,2);
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS employee_ssf DECIMAL(12,2);
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS leave_deduction DECIMAL(12,2) DEFAULT 0;
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS payable_days INTEGER;
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS calendar_days INTEGER;
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS deduction_days INTEGER DEFAULT 0;
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS paid_leave_days NUMERIC(4,1) DEFAULT 0;
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS unpaid_leave_days NUMERIC(4,1) DEFAULT 0;
