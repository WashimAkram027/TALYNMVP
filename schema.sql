-- =============================================
-- TALYN MVP - Complete Database Schema
-- Version: 3.0 (Full MVP Schema)
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. ENUMS (Custom Types)
-- Using DO blocks to handle "already exists" errors
-- =============================================

-- Existing enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('employer', 'candidate');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_status AS ENUM ('pending', 'active', 'suspended', 'deactivated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE org_status AS ENUM ('pending_verification', 'active', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE industry_type AS ENUM (
        'mep_engineering',
        'energy_consulting',
        'building_information_modeling',
        'architectural_designs',
        'product_design',
        'engineering_analysis',
        'accounting',
        'construction_management',
        'legal_services',
        'healthcare_services',
        'it_consulting',
        'software_development',
        'office_administration',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE member_role AS ENUM ('owner', 'admin', 'manager', 'employee', 'contractor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE member_status AS ENUM ('invited', 'pending', 'active', 'inactive', 'offboarded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract', 'freelance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- NEW ENUMS FOR MVP FEATURES
-- =============================================

-- Payroll enums
DO $$ BEGIN
    CREATE TYPE payroll_status AS ENUM ('draft', 'processing', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payroll_item_status AS ENUM ('pending', 'paid', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Time off enums
DO $$ BEGIN
    CREATE TYPE time_off_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Job posting enums
DO $$ BEGIN
    CREATE TYPE job_posting_status AS ENUM ('draft', 'open', 'closed', 'filled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE application_stage AS ENUM ('applied', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Compliance enums
DO $$ BEGIN
    CREATE TYPE compliance_item_type AS ENUM ('contract', 'tax_form', 'id_verification', 'background_check', 'work_permit', 'insurance', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE compliance_status AS ENUM ('pending', 'submitted', 'approved', 'rejected', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_type AS ENUM ('info', 'warning', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Invoice enums
DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Document enums
DO $$ BEGIN
    CREATE TYPE document_category AS ENUM ('contract', 'policy', 'tax', 'identity', 'payslip', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Benefits enrollment status
DO $$ BEGIN
    CREATE TYPE benefits_status AS ENUM ('not_enrolled', 'pending', 'active', 'cancelled', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- =============================================
-- 2. INDUSTRIES LOOKUP TABLE (for dropdown)
-- =============================================

CREATE TABLE IF NOT EXISTS industries (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- Insert industry options (ignore duplicates)
INSERT INTO industries (code, name, display_order) VALUES
    ('mep_engineering', 'MEP Engineering', 1),
    ('energy_consulting', 'Energy Consulting', 2),
    ('building_information_modeling', 'Building Information Modeling', 3),
    ('architectural_designs', 'Architectural Designs', 4),
    ('product_design', 'Product Design', 5),
    ('engineering_analysis', 'Engineering Analysis', 6),
    ('accounting', 'Accounting', 7),
    ('construction_management', 'Construction Management', 8),
    ('legal_services', 'Legal Services', 9),
    ('healthcare_services', 'Healthcare Services', 10),
    ('it_consulting', 'IT Consulting', 11),
    ('software_development', 'Software Development', 12),
    ('office_administration', 'Office Administration', 13),
    ('other', 'Other', 99)
ON CONFLICT (code) DO NOTHING;


-- =============================================
-- 3. PROFILES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    full_name TEXT GENERATED ALWAYS AS (
        TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
    ) STORED,
    phone TEXT,
    avatar_url TEXT,
    role user_role NOT NULL,
    status account_status NOT NULL DEFAULT 'pending',
    resume_url TEXT,
    resume_filename TEXT,
    linkedin_url TEXT,
    organization_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE
);

-- Add constraints if they don't exist
DO $$ BEGIN
    ALTER TABLE profiles ADD CONSTRAINT valid_email
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE profiles ADD CONSTRAINT valid_linkedin
    CHECK (
        linkedin_url IS NULL OR
        linkedin_url = '' OR
        linkedin_url ~* '^https?://(www\.)?linkedin\.com/in/[a-zA-Z0-9_-]+/?.*$'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- =============================================
-- 4. ORGANIZATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    industry industry_type NOT NULL,
    industry_other TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    website TEXT,
    legal_name TEXT,
    registration_number TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'NP',
    logo_url TEXT,
    status org_status NOT NULL DEFAULT 'pending_verification',
    verified_at TIMESTAMPTZ,
    owner_id UUID NOT NULL,
    settings JSONB DEFAULT '{
        "payment_terms": 30,
        "default_currency": "NPR",
        "invoice_prefix": "INV",
        "timezone": "Asia/Kathmandu"
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add constraint for industry_other
DO $$ BEGIN
    ALTER TABLE organizations ADD CONSTRAINT industry_other_required
    CHECK (
        (industry != 'other') OR
        (industry = 'other' AND industry_other IS NOT NULL AND industry_other != '')
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add foreign keys (if not exist)
DO $$ BEGIN
    ALTER TABLE profiles
    ADD CONSTRAINT fk_profiles_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE organizations
    ADD CONSTRAINT fk_organizations_owner
    FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- =============================================
-- 5. ORGANIZATION MEMBERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    member_role member_role NOT NULL DEFAULT 'employee',
    job_title TEXT,
    department TEXT,
    employment_type employment_type DEFAULT 'full_time',
    status member_status NOT NULL DEFAULT 'invited',
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    invited_by UUID REFERENCES profiles(id),
    joined_at TIMESTAMPTZ,
    offboarded_at TIMESTAMPTZ,
    salary_amount DECIMAL(12,2),
    salary_currency TEXT DEFAULT 'NPR',
    pay_frequency TEXT DEFAULT 'monthly',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, profile_id)
);


-- =============================================
-- 6. PAYROLL TABLES
-- =============================================

-- Payroll runs (batches)
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    pay_date DATE NOT NULL,
    status payroll_status NOT NULL DEFAULT 'draft',
    total_amount DECIMAL(14,2) DEFAULT 0,
    currency TEXT DEFAULT 'NPR',
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual payroll items (one per employee per run)
CREATE TABLE IF NOT EXISTS payroll_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
    base_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
    bonuses DECIMAL(12,2) DEFAULT 0,
    deductions DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) GENERATED ALWAYS AS (
        base_salary + COALESCE(bonuses, 0) - COALESCE(deductions, 0) - COALESCE(tax_amount, 0)
    ) STORED,
    status payroll_item_status NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(payroll_run_id, member_id)
);


-- =============================================
-- 7. TIME OFF TABLES
-- =============================================

-- Time off policy types (Vacation, Sick, Personal, etc.)
CREATE TABLE IF NOT EXISTS time_off_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    days_per_year INT NOT NULL DEFAULT 0,
    carry_over_days INT DEFAULT 0,
    carry_over_expires_months INT DEFAULT 3,
    is_paid BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employee time off balances (per policy per year)
CREATE TABLE IF NOT EXISTS time_off_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES time_off_policies(id) ON DELETE CASCADE,
    year INT NOT NULL,
    total_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    used_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    pending_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    carry_over_days DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(member_id, policy_id, year)
);

-- Time off requests
CREATE TABLE IF NOT EXISTS time_off_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES time_off_policies(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested DECIMAL(5,2) NOT NULL,
    reason TEXT,
    status time_off_request_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================
-- 8. HOLIDAYS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT TRUE,
    country TEXT DEFAULT 'NP',
    year INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)::INT) STORED,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default Nepal holidays (organization_id NULL = global defaults)
INSERT INTO holidays (organization_id, name, date, is_paid, country) VALUES
    (NULL, 'New Year''s Day', '2025-01-01', TRUE, 'NP'),
    (NULL, 'Magh Sankranti', '2025-01-15', TRUE, 'NP'),
    (NULL, 'Saraswati Puja', '2025-02-03', TRUE, 'NP'),
    (NULL, 'Democracy Day', '2025-02-19', TRUE, 'NP'),
    (NULL, 'Maha Shivaratri', '2025-02-26', TRUE, 'NP'),
    (NULL, 'Holi', '2025-03-14', TRUE, 'NP'),
    (NULL, 'Nepali New Year', '2025-04-14', TRUE, 'NP'),
    (NULL, 'Buddha Jayanti', '2025-05-12', TRUE, 'NP'),
    (NULL, 'Republic Day', '2025-05-28', TRUE, 'NP'),
    (NULL, 'Gaijatra', '2025-08-09', TRUE, 'NP'),
    (NULL, 'Krishna Janmashtami', '2025-08-16', TRUE, 'NP'),
    (NULL, 'Constitution Day', '2025-09-19', TRUE, 'NP'),
    (NULL, 'Dashain (10 days)', '2025-10-01', TRUE, 'NP'),
    (NULL, 'Tihar (5 days)', '2025-10-20', TRUE, 'NP'),
    (NULL, 'Chhath Parva', '2025-10-28', TRUE, 'NP')
ON CONFLICT DO NOTHING;


-- =============================================
-- 9. ANNOUNCEMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES profiles(id),
    is_published BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================
-- 10. JOB POSTINGS & APPLICATIONS TABLES
-- =============================================

-- Job postings
CREATE TABLE IF NOT EXISTS job_postings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    requirements TEXT,
    responsibilities TEXT,
    department TEXT,
    location TEXT,
    is_remote BOOLEAN DEFAULT TRUE,
    employment_type employment_type DEFAULT 'full_time',
    salary_min DECIMAL(12,2),
    salary_max DECIMAL(12,2),
    salary_currency TEXT DEFAULT 'NPR',
    show_salary BOOLEAN DEFAULT FALSE,
    status job_posting_status NOT NULL DEFAULT 'draft',
    applications_count INT DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    published_at TIMESTAMPTZ,
    closes_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Job applications
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stage application_stage NOT NULL DEFAULT 'applied',
    resume_url TEXT,
    cover_letter TEXT,
    notes TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(job_posting_id, candidate_id)
);

-- Application activity/history
CREATE TABLE IF NOT EXISTS application_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_stage application_stage,
    to_stage application_stage NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================
-- 11. COMPLIANCE TABLES
-- =============================================

-- Compliance checklist items
CREATE TABLE IF NOT EXISTS compliance_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES organization_members(id) ON DELETE CASCADE,
    item_type compliance_item_type NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT TRUE,
    status compliance_status NOT NULL DEFAULT 'pending',
    due_date DATE,
    completed_at TIMESTAMPTZ,
    document_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compliance alerts/notifications
CREATE TABLE IF NOT EXISTS compliance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES organization_members(id) ON DELETE CASCADE,
    compliance_item_id UUID REFERENCES compliance_items(id) ON DELETE SET NULL,
    alert_type alert_type NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================
-- 12. INVOICES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    member_id UUID REFERENCES organization_members(id) ON DELETE SET NULL,
    client_name TEXT,
    client_email TEXT,
    client_address TEXT,
    amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(14,2) GENERATED ALWAYS AS (amount + COALESCE(tax_amount, 0)) STORED,
    currency TEXT DEFAULT 'NPR',
    status invoice_status NOT NULL DEFAULT 'draft',
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    line_items JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, invoice_number)
);


-- =============================================
-- 13. DOCUMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES organization_members(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INT,
    category document_category NOT NULL DEFAULT 'other',
    is_sensitive BOOLEAN DEFAULT FALSE,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================
-- 14. BENEFITS ENROLLMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS benefits_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    plan_type TEXT NOT NULL,
    provider TEXT,
    monthly_cost DECIMAL(10,2),
    employer_contribution DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS benefits_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES benefits_plans(id) ON DELETE CASCADE,
    status benefits_status NOT NULL DEFAULT 'pending',
    enrolled_at TIMESTAMPTZ,
    coverage_start_date DATE,
    coverage_end_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(member_id, plan_id)
);


-- =============================================
-- 15. ACTIVITY LOG TABLE (Audit Trail)
-- =============================================

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================
-- 16. INDEXES
-- =============================================

-- Existing indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_industry ON organizations(industry);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_profile ON organization_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_org_members_status ON organization_members(status);

-- New indexes for MVP tables
CREATE INDEX IF NOT EXISTS idx_payroll_runs_org ON payroll_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_pay_date ON payroll_runs(pay_date);
CREATE INDEX IF NOT EXISTS idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_member ON payroll_items(member_id);

CREATE INDEX IF NOT EXISTS idx_time_off_policies_org ON time_off_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_time_off_balances_member ON time_off_balances(member_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_member ON time_off_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_status ON time_off_requests(status);

CREATE INDEX IF NOT EXISTS idx_holidays_org ON holidays(organization_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_year ON holidays(year);

CREATE INDEX IF NOT EXISTS idx_announcements_org ON announcements(organization_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published, published_at);

CREATE INDEX IF NOT EXISTS idx_job_postings_org ON job_postings(organization_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_stage ON applications(stage);

CREATE INDEX IF NOT EXISTS idx_compliance_items_org ON compliance_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_items_member ON compliance_items(member_id);
CREATE INDEX IF NOT EXISTS idx_compliance_items_status ON compliance_items(status);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_org ON compliance_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_read ON compliance_alerts(is_read, is_dismissed);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_member ON documents(member_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

CREATE INDEX IF NOT EXISTS idx_benefits_plans_org ON benefits_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_benefits_enrollments_member ON benefits_enrollments(member_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_org ON activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);


-- =============================================
-- 17. UPDATED_AT TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate triggers to avoid duplicates
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_members_updated_at ON organization_members;
CREATE TRIGGER update_org_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payroll_runs_updated_at ON payroll_runs;
CREATE TRIGGER update_payroll_runs_updated_at
    BEFORE UPDATE ON payroll_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payroll_items_updated_at ON payroll_items;
CREATE TRIGGER update_payroll_items_updated_at
    BEFORE UPDATE ON payroll_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_off_policies_updated_at ON time_off_policies;
CREATE TRIGGER update_time_off_policies_updated_at
    BEFORE UPDATE ON time_off_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_off_balances_updated_at ON time_off_balances;
CREATE TRIGGER update_time_off_balances_updated_at
    BEFORE UPDATE ON time_off_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_off_requests_updated_at ON time_off_requests;
CREATE TRIGGER update_time_off_requests_updated_at
    BEFORE UPDATE ON time_off_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_holidays_updated_at ON holidays;
CREATE TRIGGER update_holidays_updated_at
    BEFORE UPDATE ON holidays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_postings_updated_at ON job_postings;
CREATE TRIGGER update_job_postings_updated_at
    BEFORE UPDATE ON job_postings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_compliance_items_updated_at ON compliance_items;
CREATE TRIGGER update_compliance_items_updated_at
    BEFORE UPDATE ON compliance_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_benefits_plans_updated_at ON benefits_plans;
CREATE TRIGGER update_benefits_plans_updated_at
    BEFORE UPDATE ON benefits_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_benefits_enrollments_updated_at ON benefits_enrollments;
CREATE TRIGGER update_benefits_enrollments_updated_at
    BEFORE UPDATE ON benefits_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================
-- 18. AUTO-CREATE PROFILE ON SIGNUP
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (
        id,
        email,
        first_name,
        last_name,
        role,
        status
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(
            (NEW.raw_user_meta_data->>'role')::user_role,
            'candidate'
        ),
        'pending'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- =============================================
-- 19. ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefits_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefits_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - EXISTING TABLES
-- =============================================

-- Drop existing policies first (to allow re-run)
DROP POLICY IF EXISTS "Anyone can view industries" ON industries;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Employers can view org member profiles" ON profiles;
DROP POLICY IF EXISTS "Members can view their organization" ON organizations;
DROP POLICY IF EXISTS "Owners can update organization" ON organizations;
DROP POLICY IF EXISTS "Employers can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view own membership" ON organization_members;
DROP POLICY IF EXISTS "Org admins can view all members" ON organization_members;
DROP POLICY IF EXISTS "Org owners can add members" ON organization_members;
DROP POLICY IF EXISTS "Org owners can update members" ON organization_members;
DROP POLICY IF EXISTS "Org owners can delete members" ON organization_members;

-- Create policies for existing tables
CREATE POLICY "Anyone can view industries"
ON industries FOR SELECT USING (true);

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Employers can view org member profiles"
ON profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.profile_id = profiles.id
        AND om.organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Members can view their organization"
ON organizations FOR SELECT
USING (
    owner_id = auth.uid()
    OR id IN (SELECT organization_id FROM organization_members WHERE profile_id = auth.uid())
    OR id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Owners can update organization"
ON organizations FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Employers can create organizations"
ON organizations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own membership"
ON organization_members FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Org admins can view all members"
ON organization_members FOR SELECT
USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
);

CREATE POLICY "Org owners can add members"
ON organization_members FOR INSERT
WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Org owners can update members"
ON organization_members FOR UPDATE
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Org owners can delete members"
ON organization_members FOR DELETE
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));


-- =============================================
-- RLS POLICIES - PAYROLL
-- =============================================

DROP POLICY IF EXISTS "Org members can view payroll runs" ON payroll_runs;
DROP POLICY IF EXISTS "Org admins can create payroll runs" ON payroll_runs;
DROP POLICY IF EXISTS "Org admins can update payroll runs" ON payroll_runs;
DROP POLICY IF EXISTS "Org owners can delete payroll runs" ON payroll_runs;

CREATE POLICY "Org members can view payroll runs"
ON payroll_runs FOR SELECT
USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
);

CREATE POLICY "Org admins can create payroll runs"
ON payroll_runs FOR INSERT
WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Org admins can update payroll runs"
ON payroll_runs FOR UPDATE
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Org owners can delete payroll runs"
ON payroll_runs FOR DELETE
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Employees can view own payroll items" ON payroll_items;
DROP POLICY IF EXISTS "Org admins can view all payroll items" ON payroll_items;
DROP POLICY IF EXISTS "Org admins can manage payroll items" ON payroll_items;

CREATE POLICY "Employees can view own payroll items"
ON payroll_items FOR SELECT
USING (
    member_id IN (SELECT id FROM organization_members WHERE profile_id = auth.uid())
);

CREATE POLICY "Org admins can view all payroll items"
ON payroll_items FOR SELECT
USING (
    payroll_run_id IN (
        SELECT id FROM payroll_runs WHERE organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    )
);

CREATE POLICY "Org admins can manage payroll items"
ON payroll_items FOR ALL
USING (
    payroll_run_id IN (
        SELECT id FROM payroll_runs WHERE organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    )
);


-- =============================================
-- RLS POLICIES - TIME OFF
-- =============================================

DROP POLICY IF EXISTS "Org members can view time off policies" ON time_off_policies;
DROP POLICY IF EXISTS "Org admins can manage time off policies" ON time_off_policies;

CREATE POLICY "Org members can view time off policies"
ON time_off_policies FOR SELECT
USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
);

CREATE POLICY "Org admins can manage time off policies"
ON time_off_policies FOR ALL
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Employees can view own time off balances" ON time_off_balances;
DROP POLICY IF EXISTS "Org admins can view all time off balances" ON time_off_balances;
DROP POLICY IF EXISTS "Org admins can manage time off balances" ON time_off_balances;

CREATE POLICY "Employees can view own time off balances"
ON time_off_balances FOR SELECT
USING (member_id IN (SELECT id FROM organization_members WHERE profile_id = auth.uid()));

CREATE POLICY "Org admins can view all time off balances"
ON time_off_balances FOR SELECT
USING (
    member_id IN (
        SELECT id FROM organization_members WHERE organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    )
);

CREATE POLICY "Org admins can manage time off balances"
ON time_off_balances FOR ALL
USING (
    member_id IN (
        SELECT id FROM organization_members WHERE organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Employees can view own time off requests" ON time_off_requests;
DROP POLICY IF EXISTS "Employees can create time off requests" ON time_off_requests;
DROP POLICY IF EXISTS "Employees can update own pending requests" ON time_off_requests;
DROP POLICY IF EXISTS "Org admins can view all time off requests" ON time_off_requests;
DROP POLICY IF EXISTS "Org admins can update time off requests" ON time_off_requests;

CREATE POLICY "Employees can view own time off requests"
ON time_off_requests FOR SELECT
USING (member_id IN (SELECT id FROM organization_members WHERE profile_id = auth.uid()));

CREATE POLICY "Employees can create time off requests"
ON time_off_requests FOR INSERT
WITH CHECK (member_id IN (SELECT id FROM organization_members WHERE profile_id = auth.uid()));

CREATE POLICY "Employees can update own pending requests"
ON time_off_requests FOR UPDATE
USING (
    member_id IN (SELECT id FROM organization_members WHERE profile_id = auth.uid())
    AND status = 'pending'
);

CREATE POLICY "Org admins can view all time off requests"
ON time_off_requests FOR SELECT
USING (
    member_id IN (
        SELECT id FROM organization_members WHERE organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    )
);

CREATE POLICY "Org admins can update time off requests"
ON time_off_requests FOR UPDATE
USING (
    member_id IN (
        SELECT id FROM organization_members WHERE organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    )
);


-- =============================================
-- RLS POLICIES - HOLIDAYS
-- =============================================

DROP POLICY IF EXISTS "Anyone can view global holidays" ON holidays;
DROP POLICY IF EXISTS "Org members can view org holidays" ON holidays;
DROP POLICY IF EXISTS "Org admins can manage org holidays" ON holidays;

CREATE POLICY "Anyone can view global holidays"
ON holidays FOR SELECT
USING (organization_id IS NULL);

CREATE POLICY "Org members can view org holidays"
ON holidays FOR SELECT
USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
);

CREATE POLICY "Org admins can manage org holidays"
ON holidays FOR ALL
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));


-- =============================================
-- RLS POLICIES - ANNOUNCEMENTS
-- =============================================

DROP POLICY IF EXISTS "Org members can view published announcements" ON announcements;
DROP POLICY IF EXISTS "Org admins can manage announcements" ON announcements;

CREATE POLICY "Org members can view published announcements"
ON announcements FOR SELECT
USING (
    is_published = TRUE
    AND (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
        OR organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
    )
);

CREATE POLICY "Org admins can manage announcements"
ON announcements FOR ALL
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));


-- =============================================
-- RLS POLICIES - JOB POSTINGS & APPLICATIONS
-- =============================================

DROP POLICY IF EXISTS "Anyone can view open job postings" ON job_postings;
DROP POLICY IF EXISTS "Org admins can manage job postings" ON job_postings;

CREATE POLICY "Anyone can view open job postings"
ON job_postings FOR SELECT
USING (status = 'open');

CREATE POLICY "Org admins can manage job postings"
ON job_postings FOR ALL
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Candidates can view own applications" ON applications;
DROP POLICY IF EXISTS "Candidates can create applications" ON applications;
DROP POLICY IF EXISTS "Org admins can view applications" ON applications;
DROP POLICY IF EXISTS "Org admins can update applications" ON applications;

CREATE POLICY "Candidates can view own applications"
ON applications FOR SELECT
USING (candidate_id = auth.uid());

CREATE POLICY "Candidates can create applications"
ON applications FOR INSERT
WITH CHECK (candidate_id = auth.uid());

CREATE POLICY "Org admins can view applications"
ON applications FOR SELECT
USING (
    job_posting_id IN (
        SELECT id FROM job_postings WHERE organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    )
);

CREATE POLICY "Org admins can update applications"
ON applications FOR UPDATE
USING (
    job_posting_id IN (
        SELECT id FROM job_postings WHERE organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Org admins can view application activities" ON application_activities;
DROP POLICY IF EXISTS "Org admins can create application activities" ON application_activities;

CREATE POLICY "Org admins can view application activities"
ON application_activities FOR SELECT
USING (
    application_id IN (
        SELECT a.id FROM applications a
        JOIN job_postings jp ON jp.id = a.job_posting_id
        WHERE jp.organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
    )
);

CREATE POLICY "Org admins can create application activities"
ON application_activities FOR INSERT
WITH CHECK (
    application_id IN (
        SELECT a.id FROM applications a
        JOIN job_postings jp ON jp.id = a.job_posting_id
        WHERE jp.organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
    )
);


-- =============================================
-- RLS POLICIES - COMPLIANCE
-- =============================================

DROP POLICY IF EXISTS "Employees can view own compliance items" ON compliance_items;
DROP POLICY IF EXISTS "Org admins can view all compliance items" ON compliance_items;
DROP POLICY IF EXISTS "Org admins can manage compliance items" ON compliance_items;

CREATE POLICY "Employees can view own compliance items"
ON compliance_items FOR SELECT
USING (
    member_id IN (SELECT id FROM organization_members WHERE profile_id = auth.uid())
    OR (member_id IS NULL AND organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
);

CREATE POLICY "Org admins can view all compliance items"
ON compliance_items FOR SELECT
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Org admins can manage compliance items"
ON compliance_items FOR ALL
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Employees can view own compliance alerts" ON compliance_alerts;
DROP POLICY IF EXISTS "Org admins can view all compliance alerts" ON compliance_alerts;
DROP POLICY IF EXISTS "Org admins can manage compliance alerts" ON compliance_alerts;

CREATE POLICY "Employees can view own compliance alerts"
ON compliance_alerts FOR SELECT
USING (
    member_id IN (SELECT id FROM organization_members WHERE profile_id = auth.uid())
    OR (member_id IS NULL AND organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
);

CREATE POLICY "Org admins can view all compliance alerts"
ON compliance_alerts FOR SELECT
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Org admins can manage compliance alerts"
ON compliance_alerts FOR ALL
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));


-- =============================================
-- RLS POLICIES - INVOICES
-- =============================================

DROP POLICY IF EXISTS "Org members can view invoices" ON invoices;
DROP POLICY IF EXISTS "Org admins can manage invoices" ON invoices;

CREATE POLICY "Org members can view invoices"
ON invoices FOR SELECT
USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
);

CREATE POLICY "Org admins can manage invoices"
ON invoices FOR ALL
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));


-- =============================================
-- RLS POLICIES - DOCUMENTS
-- =============================================

DROP POLICY IF EXISTS "Employees can view own documents" ON documents;
DROP POLICY IF EXISTS "Org admins can view all documents" ON documents;
DROP POLICY IF EXISTS "Org admins can manage documents" ON documents;
DROP POLICY IF EXISTS "Employees can upload own documents" ON documents;

CREATE POLICY "Employees can view own documents"
ON documents FOR SELECT
USING (
    member_id IN (SELECT id FROM organization_members WHERE profile_id = auth.uid())
    OR (member_id IS NULL AND organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
);

CREATE POLICY "Org admins can view all documents"
ON documents FOR SELECT
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Org admins can manage documents"
ON documents FOR ALL
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

CREATE POLICY "Employees can upload own documents"
ON documents FOR INSERT
WITH CHECK (
    member_id IN (SELECT id FROM organization_members WHERE profile_id = auth.uid())
    AND uploaded_by = auth.uid()
);


-- =============================================
-- RLS POLICIES - BENEFITS
-- =============================================

DROP POLICY IF EXISTS "Org members can view benefits plans" ON benefits_plans;
DROP POLICY IF EXISTS "Org admins can manage benefits plans" ON benefits_plans;

CREATE POLICY "Org members can view benefits plans"
ON benefits_plans FOR SELECT
USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
);

CREATE POLICY "Org admins can manage benefits plans"
ON benefits_plans FOR ALL
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Employees can view own benefits enrollments" ON benefits_enrollments;
DROP POLICY IF EXISTS "Org admins can view all benefits enrollments" ON benefits_enrollments;
DROP POLICY IF EXISTS "Org admins can manage benefits enrollments" ON benefits_enrollments;

CREATE POLICY "Employees can view own benefits enrollments"
ON benefits_enrollments FOR SELECT
USING (member_id IN (SELECT id FROM organization_members WHERE profile_id = auth.uid()));

CREATE POLICY "Org admins can view all benefits enrollments"
ON benefits_enrollments FOR SELECT
USING (
    member_id IN (
        SELECT id FROM organization_members WHERE organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    )
);

CREATE POLICY "Org admins can manage benefits enrollments"
ON benefits_enrollments FOR ALL
USING (
    member_id IN (
        SELECT id FROM organization_members WHERE organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    )
);


-- =============================================
-- RLS POLICIES - ACTIVITY LOG
-- =============================================

DROP POLICY IF EXISTS "Org admins can view activity log" ON activity_log;
DROP POLICY IF EXISTS "System can insert activity log" ON activity_log;

CREATE POLICY "Org admins can view activity log"
ON activity_log FOR SELECT
USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

CREATE POLICY "System can insert activity log"
ON activity_log FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);


-- =============================================
-- 20. HELPER FUNCTIONS
-- =============================================

-- Complete EMPLOYER signup
CREATE OR REPLACE FUNCTION complete_employer_signup(
    p_first_name TEXT,
    p_last_name TEXT,
    p_industry TEXT,
    p_industry_other TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_org_id UUID;
    v_industry industry_type;
    v_result JSON;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT email INTO v_user_email FROM profiles WHERE id = v_user_id;

    BEGIN
        v_industry := p_industry::industry_type;
    EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Invalid industry type: %', p_industry;
    END;

    IF v_industry = 'other' AND (p_industry_other IS NULL OR p_industry_other = '') THEN
        RAISE EXCEPTION 'Other industry description is required when industry is "other"';
    END IF;

    INSERT INTO organizations (email, industry, industry_other, owner_id)
    VALUES (
        v_user_email,
        v_industry,
        CASE WHEN v_industry = 'other' THEN p_industry_other ELSE NULL END,
        v_user_id
    )
    RETURNING id INTO v_org_id;

    UPDATE profiles
    SET
        first_name = p_first_name,
        last_name = p_last_name,
        role = 'employer',
        organization_id = v_org_id,
        status = 'active',
        onboarding_completed = TRUE
    WHERE id = v_user_id;

    INSERT INTO organization_members (organization_id, profile_id, member_role, status, joined_at)
    VALUES (v_org_id, v_user_id, 'owner', 'active', NOW());

    SELECT json_build_object(
        'success', true,
        'organization_id', v_org_id,
        'user_id', v_user_id,
        'message', 'Employer account created successfully'
    ) INTO v_result;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Complete CANDIDATE signup
CREATE OR REPLACE FUNCTION complete_candidate_signup(
    p_first_name TEXT,
    p_last_name TEXT,
    p_resume_url TEXT DEFAULT NULL,
    p_resume_filename TEXT DEFAULT NULL,
    p_linkedin_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_result JSON;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE profiles
    SET
        first_name = p_first_name,
        last_name = p_last_name,
        role = 'candidate',
        resume_url = p_resume_url,
        resume_filename = p_resume_filename,
        linkedin_url = NULLIF(TRIM(p_linkedin_url), ''),
        status = 'active',
        onboarding_completed = TRUE
    WHERE id = v_user_id;

    SELECT json_build_object(
        'success', true,
        'user_id', v_user_id,
        'message', 'Candidate account created successfully'
    ) INTO v_result;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Get current user profile
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'id', p.id,
        'email', p.email,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'full_name', p.full_name,
        'role', p.role,
        'status', p.status,
        'avatar_url', p.avatar_url,
        'resume_url', p.resume_url,
        'resume_filename', p.resume_filename,
        'linkedin_url', p.linkedin_url,
        'onboarding_completed', p.onboarding_completed,
        'created_at', p.created_at,
        'last_login_at', p.last_login_at,
        'organization', CASE
            WHEN p.organization_id IS NOT NULL THEN json_build_object(
                'id', o.id,
                'name', o.name,
                'email', o.email,
                'industry', o.industry,
                'industry_other', o.industry_other,
                'status', o.status,
                'logo_url', o.logo_url
            )
            ELSE NULL
        END
    )
    INTO v_result
    FROM profiles p
    LEFT JOIN organizations o ON o.id = p.organization_id
    WHERE p.id = auth.uid();

    IF v_result IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Profile not found');
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Update last login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS JSON AS $$
BEGIN
    UPDATE profiles SET last_login_at = NOW() WHERE id = auth.uid();
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Check if email exists
CREATE OR REPLACE FUNCTION check_email_exists(p_email TEXT)
RETURNS JSON AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM profiles WHERE LOWER(email) = LOWER(p_email)) INTO v_exists;
    RETURN json_build_object('exists', v_exists);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- 21. DASHBOARD STATS FUNCTIONS
-- =============================================

-- Get employer dashboard statistics
CREATE OR REPLACE FUNCTION get_employer_dashboard_stats(p_org_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_org_id UUID;
    v_result JSON;
BEGIN
    -- Get org_id from parameter or current user's profile
    IF p_org_id IS NOT NULL THEN
        v_org_id := p_org_id;
    ELSE
        SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();
    END IF;

    IF v_org_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No organization found');
    END IF;

    SELECT json_build_object(
        'success', true,
        'organization_id', v_org_id,
        'active_employees', (
            SELECT COUNT(*) FROM organization_members
            WHERE organization_id = v_org_id AND status = 'active'
        ),
        'upcoming_payroll', (
            SELECT json_build_object(
                'amount', COALESCE(total_amount, 0),
                'pay_date', pay_date,
                'status', status
            )
            FROM payroll_runs
            WHERE organization_id = v_org_id
            AND pay_date >= CURRENT_DATE
            AND status IN ('draft', 'processing')
            ORDER BY pay_date ASC
            LIMIT 1
        ),
        'candidates_in_pipeline', (
            SELECT COUNT(*) FROM applications a
            JOIN job_postings jp ON jp.id = a.job_posting_id
            WHERE jp.organization_id = v_org_id
            AND a.stage NOT IN ('hired', 'rejected')
        ),
        'pipeline_by_stage', (
            SELECT json_object_agg(stage, count)
            FROM (
                SELECT a.stage, COUNT(*) as count
                FROM applications a
                JOIN job_postings jp ON jp.id = a.job_posting_id
                WHERE jp.organization_id = v_org_id
                GROUP BY a.stage
            ) stages
        ),
        'compliance_score', (
            SELECT CASE
                WHEN COUNT(*) = 0 THEN 100
                ELSE ROUND((COUNT(*) FILTER (WHERE status = 'approved')::DECIMAL / COUNT(*) * 100)::NUMERIC, 0)
            END
            FROM compliance_items
            WHERE organization_id = v_org_id AND is_required = TRUE
        ),
        'active_alerts', (
            SELECT COUNT(*) FROM compliance_alerts
            WHERE organization_id = v_org_id AND is_dismissed = FALSE
        ),
        'critical_alerts', (
            SELECT COUNT(*) FROM compliance_alerts
            WHERE organization_id = v_org_id AND is_dismissed = FALSE AND alert_type = 'critical'
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Get employee dashboard statistics
CREATE OR REPLACE FUNCTION get_employee_dashboard_stats(p_member_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_member_id UUID;
    v_org_id UUID;
    v_result JSON;
BEGIN
    -- Get member_id from parameter or current user
    IF p_member_id IS NOT NULL THEN
        v_member_id := p_member_id;
    ELSE
        SELECT id INTO v_member_id FROM organization_members WHERE profile_id = auth.uid() LIMIT 1;
    END IF;

    IF v_member_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No membership found');
    END IF;

    SELECT organization_id INTO v_org_id FROM organization_members WHERE id = v_member_id;

    SELECT json_build_object(
        'success', true,
        'member_id', v_member_id,
        'time_off_balance', (
            SELECT json_agg(json_build_object(
                'policy_name', tp.name,
                'total_days', tob.total_days,
                'used_days', tob.used_days,
                'remaining_days', tob.total_days - tob.used_days - tob.pending_days,
                'pending_days', tob.pending_days
            ))
            FROM time_off_balances tob
            JOIN time_off_policies tp ON tp.id = tob.policy_id
            WHERE tob.member_id = v_member_id
            AND tob.year = EXTRACT(YEAR FROM CURRENT_DATE)
        ),
        'next_payday', (
            SELECT pay_date FROM payroll_runs
            WHERE organization_id = v_org_id
            AND pay_date >= CURRENT_DATE
            AND status IN ('draft', 'processing')
            ORDER BY pay_date ASC
            LIMIT 1
        ),
        'benefits_coverage', (
            SELECT json_agg(json_build_object(
                'plan_name', bp.name,
                'plan_type', bp.plan_type,
                'status', be.status,
                'coverage_start', be.coverage_start_date
            ))
            FROM benefits_enrollments be
            JOIN benefits_plans bp ON bp.id = be.plan_id
            WHERE be.member_id = v_member_id AND be.status = 'active'
        ),
        'upcoming_time_off', (
            SELECT json_agg(json_build_object(
                'id', tor.id,
                'policy_name', tp.name,
                'start_date', tor.start_date,
                'end_date', tor.end_date,
                'days', tor.days_requested,
                'status', tor.status
            ))
            FROM time_off_requests tor
            JOIN time_off_policies tp ON tp.id = tor.policy_id
            WHERE tor.member_id = v_member_id
            AND tor.status = 'approved'
            AND tor.start_date >= CURRENT_DATE
            ORDER BY tor.start_date ASC
            LIMIT 5
        ),
        'upcoming_holidays', (
            SELECT json_agg(json_build_object(
                'name', h.name,
                'date', h.date,
                'is_paid', h.is_paid
            ))
            FROM holidays h
            WHERE (h.organization_id = v_org_id OR h.organization_id IS NULL)
            AND h.date >= CURRENT_DATE
            ORDER BY h.date ASC
            LIMIT 6
        ),
        'recent_announcements', (
            SELECT json_agg(json_build_object(
                'id', a.id,
                'title', a.title,
                'content', a.content,
                'published_at', a.published_at
            ))
            FROM announcements a
            WHERE a.organization_id = v_org_id
            AND a.is_published = TRUE
            AND (a.expires_at IS NULL OR a.expires_at > NOW())
            ORDER BY a.published_at DESC
            LIMIT 5
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Get hiring pipeline stats
CREATE OR REPLACE FUNCTION get_pipeline_stats(p_org_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_org_id UUID;
    v_result JSON;
BEGIN
    IF p_org_id IS NOT NULL THEN
        v_org_id := p_org_id;
    ELSE
        SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();
    END IF;

    IF v_org_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No organization found');
    END IF;

    SELECT json_build_object(
        'success', true,
        'total_applications', (
            SELECT COUNT(*) FROM applications a
            JOIN job_postings jp ON jp.id = a.job_posting_id
            WHERE jp.organization_id = v_org_id
        ),
        'by_stage', (
            SELECT json_object_agg(stage, count)
            FROM (
                SELECT a.stage, COUNT(*) as count
                FROM applications a
                JOIN job_postings jp ON jp.id = a.job_posting_id
                WHERE jp.organization_id = v_org_id
                GROUP BY a.stage
            ) stages
        ),
        'open_positions', (
            SELECT COUNT(*) FROM job_postings
            WHERE organization_id = v_org_id AND status = 'open'
        ),
        'recent_applications', (
            SELECT json_agg(app)
            FROM (
                SELECT json_build_object(
                    'id', a.id,
                    'job_title', jp.title,
                    'candidate_name', p.full_name,
                    'stage', a.stage,
                    'applied_at', a.applied_at
                ) as app
                FROM applications a
                JOIN job_postings jp ON jp.id = a.job_posting_id
                JOIN profiles p ON p.id = a.candidate_id
                WHERE jp.organization_id = v_org_id
                ORDER BY a.applied_at DESC
                LIMIT 10
            ) recent
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Get compliance score and details
CREATE OR REPLACE FUNCTION get_compliance_details(p_org_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_org_id UUID;
    v_result JSON;
BEGIN
    IF p_org_id IS NOT NULL THEN
        v_org_id := p_org_id;
    ELSE
        SELECT organization_id INTO v_org_id FROM profiles WHERE id = auth.uid();
    END IF;

    IF v_org_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No organization found');
    END IF;

    SELECT json_build_object(
        'success', true,
        'overall_score', (
            SELECT CASE
                WHEN COUNT(*) = 0 THEN 100
                ELSE ROUND((COUNT(*) FILTER (WHERE status = 'approved')::DECIMAL / COUNT(*) * 100)::NUMERIC, 0)
            END
            FROM compliance_items
            WHERE organization_id = v_org_id AND is_required = TRUE
        ),
        'by_type', (
            SELECT json_object_agg(item_type, stats)
            FROM (
                SELECT
                    item_type,
                    json_build_object(
                        'total', COUNT(*),
                        'completed', COUNT(*) FILTER (WHERE status = 'approved'),
                        'pending', COUNT(*) FILTER (WHERE status IN ('pending', 'submitted'))
                    ) as stats
                FROM compliance_items
                WHERE organization_id = v_org_id AND is_required = TRUE
                GROUP BY item_type
            ) type_stats
        ),
        'pending_items', (
            SELECT json_agg(item)
            FROM (
                SELECT json_build_object(
                    'id', ci.id,
                    'name', ci.name,
                    'type', ci.item_type,
                    'status', ci.status,
                    'due_date', ci.due_date,
                    'member_name', p.full_name
                ) as item
                FROM compliance_items ci
                LEFT JOIN organization_members om ON om.id = ci.member_id
                LEFT JOIN profiles p ON p.id = om.profile_id
                WHERE ci.organization_id = v_org_id
                AND ci.status IN ('pending', 'submitted')
                ORDER BY ci.due_date ASC NULLS LAST
                LIMIT 10
            ) pending
        ),
        'active_alerts', (
            SELECT json_agg(alert)
            FROM (
                SELECT json_build_object(
                    'id', ca.id,
                    'title', ca.title,
                    'message', ca.message,
                    'type', ca.alert_type,
                    'action_url', ca.action_url,
                    'created_at', ca.created_at
                ) as alert
                FROM compliance_alerts ca
                WHERE ca.organization_id = v_org_id AND ca.is_dismissed = FALSE
                ORDER BY
                    CASE ca.alert_type WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
                    ca.created_at DESC
                LIMIT 10
            ) alerts
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- 22. PAYROLL HELPER FUNCTIONS
-- =============================================

-- Create a new payroll run
CREATE OR REPLACE FUNCTION create_payroll_run(
    p_org_id UUID,
    p_pay_period_start DATE,
    p_pay_period_end DATE,
    p_pay_date DATE
)
RETURNS JSON AS $$
DECLARE
    v_run_id UUID;
    v_total DECIMAL(14,2) := 0;
    v_result JSON;
BEGIN
    -- Verify user is org owner
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id AND owner_id = auth.uid()) THEN
        RETURN json_build_object('success', false, 'error', 'Not authorized');
    END IF;

    -- Create payroll run
    INSERT INTO payroll_runs (organization_id, pay_period_start, pay_period_end, pay_date, created_by)
    VALUES (p_org_id, p_pay_period_start, p_pay_period_end, p_pay_date, auth.uid())
    RETURNING id INTO v_run_id;

    -- Create payroll items for all active members
    INSERT INTO payroll_items (payroll_run_id, member_id, base_salary)
    SELECT
        v_run_id,
        om.id,
        COALESCE(om.salary_amount, 0)
    FROM organization_members om
    WHERE om.organization_id = p_org_id AND om.status = 'active';

    -- Calculate total
    SELECT COALESCE(SUM(net_amount), 0) INTO v_total
    FROM payroll_items WHERE payroll_run_id = v_run_id;

    -- Update total in payroll run
    UPDATE payroll_runs SET total_amount = v_total WHERE id = v_run_id;

    SELECT json_build_object(
        'success', true,
        'payroll_run_id', v_run_id,
        'total_amount', v_total,
        'employee_count', (SELECT COUNT(*) FROM payroll_items WHERE payroll_run_id = v_run_id)
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- 23. TIME OFF HELPER FUNCTIONS
-- =============================================

-- Request time off
CREATE OR REPLACE FUNCTION request_time_off(
    p_policy_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_member_id UUID;
    v_days DECIMAL(5,2);
    v_request_id UUID;
    v_result JSON;
BEGIN
    -- Get member_id for current user
    SELECT id INTO v_member_id FROM organization_members WHERE profile_id = auth.uid() LIMIT 1;

    IF v_member_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No membership found');
    END IF;

    -- Calculate days (simple calculation - business days would need more logic)
    v_days := p_end_date - p_start_date + 1;

    -- Create request
    INSERT INTO time_off_requests (member_id, policy_id, start_date, end_date, days_requested, reason)
    VALUES (v_member_id, p_policy_id, p_start_date, p_end_date, v_days, p_reason)
    RETURNING id INTO v_request_id;

    -- Update pending days in balance
    UPDATE time_off_balances
    SET pending_days = pending_days + v_days
    WHERE member_id = v_member_id
    AND policy_id = p_policy_id
    AND year = EXTRACT(YEAR FROM p_start_date);

    SELECT json_build_object(
        'success', true,
        'request_id', v_request_id,
        'days_requested', v_days
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Approve/reject time off request
CREATE OR REPLACE FUNCTION review_time_off_request(
    p_request_id UUID,
    p_approved BOOLEAN,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_request RECORD;
    v_result JSON;
BEGIN
    -- Get request details
    SELECT * INTO v_request FROM time_off_requests WHERE id = p_request_id;

    IF v_request IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Request not found');
    END IF;

    -- Verify user is org owner
    IF NOT EXISTS (
        SELECT 1 FROM organization_members om
        JOIN organizations o ON o.id = om.organization_id
        WHERE om.id = v_request.member_id AND o.owner_id = auth.uid()
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Not authorized');
    END IF;

    -- Update request
    UPDATE time_off_requests
    SET
        status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        reviewer_notes = p_notes
    WHERE id = p_request_id;

    -- Update balance
    IF p_approved THEN
        UPDATE time_off_balances
        SET
            used_days = used_days + v_request.days_requested,
            pending_days = pending_days - v_request.days_requested
        WHERE member_id = v_request.member_id
        AND policy_id = v_request.policy_id
        AND year = EXTRACT(YEAR FROM v_request.start_date);
    ELSE
        UPDATE time_off_balances
        SET pending_days = pending_days - v_request.days_requested
        WHERE member_id = v_request.member_id
        AND policy_id = v_request.policy_id
        AND year = EXTRACT(YEAR FROM v_request.start_date);
    END IF;

    SELECT json_build_object(
        'success', true,
        'request_id', p_request_id,
        'status', CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- 24. APPLICATION HELPER FUNCTIONS
-- =============================================

-- Move application to next stage
CREATE OR REPLACE FUNCTION move_application_stage(
    p_application_id UUID,
    p_new_stage application_stage,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_app RECORD;
    v_result JSON;
BEGIN
    -- Get application
    SELECT * INTO v_app FROM applications WHERE id = p_application_id;

    IF v_app IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Application not found');
    END IF;

    -- Verify user is org owner
    IF NOT EXISTS (
        SELECT 1 FROM job_postings jp
        JOIN organizations o ON o.id = jp.organization_id
        WHERE jp.id = v_app.job_posting_id AND o.owner_id = auth.uid()
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Not authorized');
    END IF;

    -- Update application
    UPDATE applications SET stage = p_new_stage WHERE id = p_application_id;

    -- Log activity
    INSERT INTO application_activities (application_id, from_stage, to_stage, notes, created_by)
    VALUES (p_application_id, v_app.stage, p_new_stage, p_notes, auth.uid());

    SELECT json_build_object(
        'success', true,
        'application_id', p_application_id,
        'previous_stage', v_app.stage,
        'new_stage', p_new_stage
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- 25. INVOICE HELPER FUNCTIONS
-- =============================================

-- Generate next invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(p_org_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_next_num INT;
    v_number TEXT;
BEGIN
    -- Get invoice prefix from org settings
    SELECT COALESCE(settings->>'invoice_prefix', 'INV') INTO v_prefix
    FROM organizations WHERE id = p_org_id;

    -- Get next number
    SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM '[0-9]+$')::INT), 0) + 1
    INTO v_next_num
    FROM invoices WHERE organization_id = p_org_id;

    -- Format: PREFIX-YYYY-NNNN
    v_number := v_prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_next_num::TEXT, 4, '0');

    RETURN v_number;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- 26. STORAGE BUCKET FOR DOCUMENTS
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'resumes',
    'resumes',
    false,
    10485760,
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    52428800,
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'logos',
    'logos',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Users can upload own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own resume" ON storage.objects;
DROP POLICY IF EXISTS "Employers can view candidate resumes" ON storage.objects;

CREATE POLICY "Users can upload own resume"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own resume"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own resume"
ON storage.objects FOR UPDATE
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own resume"
ON storage.objects FOR DELETE
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Employers can view candidate resumes"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'resumes' AND
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN organization_members om ON om.organization_id = p.organization_id
        WHERE p.id = auth.uid()
        AND p.role = 'employer'
        AND om.profile_id::text = (storage.foldername(name))[1]
    )
);

-- Document storage policies
DROP POLICY IF EXISTS "Org members can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can view documents" ON storage.objects;

CREATE POLICY "Org members can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM organizations WHERE owner_id = auth.uid()
        UNION
        SELECT organization_id::text FROM profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Org members can view documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM organizations WHERE owner_id = auth.uid()
        UNION
        SELECT organization_id::text FROM profiles WHERE id = auth.uid()
    )
);

-- Avatar storage policies (public read)
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Logo storage policies (public read)
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Org owners can upload logos" ON storage.objects;

CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Org owners can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'logos' AND
    (storage.foldername(name))[1] IN (SELECT id::text FROM organizations WHERE owner_id = auth.uid())
);


-- =============================================
-- DONE! Schema is ready.
-- =============================================

-- Summary of tables:
-- 1.  industries          - Industry lookup
-- 2.  profiles            - User profiles
-- 3.  organizations       - Companies/employers
-- 4.  organization_members - Employee relationships
-- 5.  payroll_runs        - Payroll batches
-- 6.  payroll_items       - Individual payroll entries
-- 7.  time_off_policies   - Leave policy types
-- 8.  time_off_balances   - Employee leave balances
-- 9.  time_off_requests   - Leave requests
-- 10. holidays            - Company/global holidays
-- 11. announcements       - Company announcements
-- 12. job_postings        - Open positions
-- 13. applications        - Job applications
-- 14. application_activities - Application stage history
-- 15. compliance_items    - Compliance checklist
-- 16. compliance_alerts   - Compliance notifications
-- 17. invoices            - Billing invoices
-- 18. documents           - File storage metadata
-- 19. benefits_plans      - Available benefits
-- 20. benefits_enrollments - Employee benefit enrollments
-- 21. activity_log        - Audit trail
