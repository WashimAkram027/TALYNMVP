-- Bug 2/6: Fix integer columns to numeric for fractional day support
ALTER TABLE payroll_items ALTER COLUMN payable_days TYPE numeric;
ALTER TABLE payroll_items ALTER COLUMN calendar_days TYPE numeric;
ALTER TABLE payroll_items ALTER COLUMN deduction_days TYPE numeric;

-- Bug 5: Fix salary_currency default from NGN (Nigeria) to NPR (Nepal)
ALTER TABLE organization_members ALTER COLUMN salary_currency SET DEFAULT 'NPR';
UPDATE organization_members SET salary_currency = 'NPR' WHERE salary_currency = 'NGN';

-- Bug 11: Add payslip PDF URL cache column
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS payslip_pdf_url TEXT;
