-- =============================================
-- TALYN MVP - Complete Database Schema
-- Version: 3.0 (Full MVP Schema)
-- Run this in Supabase SQL Editor
-- =============================================
-- Enable UUID extension
create extension IF not exists "uuid-ossp";

-- =============================================
-- 1. ENUMS (Custom Types)
-- Using DO blocks to handle "already exists" errors
-- =============================================
-- Existing enums
do $$ BEGIN
    CREATE TYPE user_role AS ENUM ('employer', 'candidate');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

do $$ BEGIN
    CREATE TYPE account_status AS ENUM ('pending', 'active', 'suspended', 'deactivated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

do $$ BEGIN
    CREATE TYPE org_status AS ENUM ('pending_verification', 'active', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

do $$ BEGIN
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

do $$ BEGIN
    CREATE TYPE member_role AS ENUM ('owner', 'admin', 'manager', 'employee', 'contractor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

do $$ BEGIN
    CREATE TYPE member_status AS ENUM ('invited', 'pending', 'active', 'inactive', 'offboarded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

do $$ BEGIN
    CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract', 'freelance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- NEW ENUMS FOR MVP FEATURES
-- =============================================
-- Payroll enums
do $$ BEGIN
    CREATE TYPE payroll_status AS ENUM ('draft', 'processing', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

do $$ BEGIN
    CREATE TYPE payroll_item_status AS ENUM ('pending', 'paid', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Time off enums
do $$ BEGIN
    CREATE TYPE time_off_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Job posting enums
do $$ BEGIN
    CREATE TYPE job_posting_status AS ENUM ('draft', 'open', 'closed', 'filled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

do $$ BEGIN
    CREATE TYPE application_stage AS ENUM ('applied', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Compliance enums
do $$ BEGIN
    CREATE TYPE compliance_item_type AS ENUM ('contract', 'tax_form', 'id_verification', 'background_check', 'work_permit', 'insurance', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

do $$ BEGIN
    CREATE TYPE compliance_status AS ENUM ('pending', 'submitted', 'approved', 'rejected', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

do $$ BEGIN
    CREATE TYPE alert_type AS ENUM ('info', 'warning', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Invoice enums
do $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Document enums
do $$ BEGIN
    CREATE TYPE document_category AS ENUM ('contract', 'policy', 'tax', 'identity', 'payslip', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Benefits enrollment status
do $$ BEGIN
    CREATE TYPE benefits_status AS ENUM ('not_enrolled', 'pending', 'active', 'cancelled', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- 2. INDUSTRIES LOOKUP TABLE (for dropdown)
-- =============================================
create table if not exists industries (
  id SERIAL primary key,
  code TEXT unique not null,
  name TEXT not null,
  display_order INT default 0,
  is_active BOOLEAN default true
);

-- Insert industry options (ignore duplicates)
insert into
  industries (code, name, display_order)
values
  ('mep_engineering', 'MEP Engineering', 1),
  ('energy_consulting', 'Energy Consulting', 2),
  (
    'building_information_modeling',
    'Building Information Modeling',
    3
  ),
  (
    'architectural_designs',
    'Architectural Designs',
    4
  ),
  ('product_design', 'Product Design', 5),
  ('engineering_analysis', 'Engineering Analysis', 6),
  ('accounting', 'Accounting', 7),
  (
    'construction_management',
    'Construction Management',
    8
  ),
  ('legal_services', 'Legal Services', 9),
  ('healthcare_services', 'Healthcare Services', 10),
  ('it_consulting', 'IT Consulting', 11),
  (
    'software_development',
    'Software Development',
    12
  ),
  (
    'office_administration',
    'Office Administration',
    13
  ),
  ('other', 'Other', 99)
on conflict (code) do nothing;

-- =============================================
-- 3. PROFILES TABLE
-- =============================================
create table if not exists profiles (
  id UUID primary key references auth.users (id) on delete CASCADE,
  email TEXT not null,
  first_name TEXT not null default '',
  last_name TEXT not null default '',
  full_name TEXT GENERATED ALWAYS as (
    TRIM(
      COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
    )
  ) STORED,
  phone TEXT,
  avatar_url TEXT,
  role user_role not null,
  status account_status not null default 'pending',
  resume_url TEXT,
  resume_filename TEXT,
  linkedin_url TEXT,
  organization_id UUID,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW(),
  last_login_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN default false,
  email_verified BOOLEAN default false
);

-- Add constraints if they don't exist
do $$ BEGIN
    ALTER TABLE profiles ADD CONSTRAINT valid_email
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

do $$ BEGIN
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
create table if not exists organizations (
  id UUID primary key default uuid_generate_v4 (),
  name TEXT,
  industry industry_type not null,
  industry_other TEXT,
  email TEXT not null,
  phone TEXT,
  website TEXT,
  legal_name TEXT,
  registration_number TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT default 'NP',
  logo_url TEXT,
  status org_status not null default 'pending_verification',
  verified_at TIMESTAMPTZ,
  owner_id UUID not null,
  settings JSONB default '{
        "payment_terms": 30,
        "default_currency": "NPR",
        "invoice_prefix": "INV",
        "timezone": "Asia/Kathmandu"
    }'::jsonb,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW()
);

-- Add constraint for industry_other
do $$ BEGIN
    ALTER TABLE organizations ADD CONSTRAINT industry_other_required
    CHECK (
        (industry != 'other') OR
        (industry = 'other' AND industry_other IS NOT NULL AND industry_other != '')
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add foreign keys (if not exist)
do $$ BEGIN
    ALTER TABLE profiles
    ADD CONSTRAINT fk_profiles_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

do $$ BEGIN
    ALTER TABLE organizations
    ADD CONSTRAINT fk_organizations_owner
    FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- 5. ORGANIZATION MEMBERS TABLE
-- =============================================
create table if not exists organization_members (
  id UUID primary key default uuid_generate_v4 (),
  organization_id UUID not null references organizations (id) on delete CASCADE,
  profile_id UUID not null references profiles (id) on delete CASCADE,
  member_role member_role not null default 'employee',
  job_title TEXT,
  department TEXT,
  employment_type employment_type default 'full_time',
  status member_status not null default 'invited',
  invited_at TIMESTAMPTZ default NOW(),
  invited_by UUID references profiles (id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ,
  offboarded_at TIMESTAMPTZ,
  salary_amount DECIMAL(12, 2),
  salary_currency TEXT default 'NPR',
  pay_frequency TEXT default 'monthly',
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW(),
  unique (organization_id, profile_id)
);

-- =============================================
-- 6. PAYROLL TABLES
-- =============================================
-- Payroll runs (batches)
create table if not exists payroll_runs (
  id UUID primary key default uuid_generate_v4 (),
  organization_id UUID not null references organizations (id) on delete CASCADE,
  pay_period_start DATE not null,
  pay_period_end DATE not null,
  pay_date DATE not null,
  status payroll_status not null default 'draft',
  total_amount DECIMAL(14, 2) default 0,
  currency TEXT default 'NPR',
  notes TEXT,
  created_by UUID references profiles (id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW()
);

-- Individual payroll items (one per employee per run)
create table if not exists payroll_items (
  id UUID primary key default uuid_generate_v4 (),
  payroll_run_id UUID not null references payroll_runs (id) on delete CASCADE,
  member_id UUID not null references organization_members (id) on delete CASCADE,
  base_salary DECIMAL(12, 2) not null default 0,
  bonuses DECIMAL(12, 2) default 0,
  deductions DECIMAL(12, 2) default 0,
  tax_amount DECIMAL(12, 2) default 0,
  net_amount DECIMAL(12, 2) GENERATED ALWAYS as (
    base_salary + COALESCE(bonuses, 0) - COALESCE(deductions, 0) - COALESCE(tax_amount, 0)
  ) STORED,
  status payroll_item_status not null default 'pending',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW(),
  unique (payroll_run_id, member_id)
);

-- =============================================
-- 7. TIME OFF TABLES
-- =============================================
-- Time off policy types (Vacation, Sick, Personal, etc.)
create table if not exists time_off_policies (
  id UUID primary key default uuid_generate_v4 (),
  organization_id UUID not null references organizations (id) on delete CASCADE,
  name TEXT not null,
  description TEXT,
  days_per_year INT not null default 0,
  carry_over_days INT default 0,
  carry_over_expires_months INT default 3,
  is_paid BOOLEAN default true,
  requires_approval BOOLEAN default true,
  is_active BOOLEAN default true,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW()
);

-- Employee time off balances (per policy per year)
create table if not exists time_off_balances (
  id UUID primary key default uuid_generate_v4 (),
  member_id UUID not null references organization_members (id) on delete CASCADE,
  policy_id UUID not null references time_off_policies (id) on delete CASCADE,
  year INT not null,
  total_days DECIMAL(5, 2) not null default 0,
  used_days DECIMAL(5, 2) not null default 0,
  pending_days DECIMAL(5, 2) not null default 0,
  carry_over_days DECIMAL(5, 2) default 0,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW(),
  unique (member_id, policy_id, year)
);

-- Time off requests
create table if not exists time_off_requests (
  id UUID primary key default uuid_generate_v4 (),
  member_id UUID not null references organization_members (id) on delete CASCADE,
  policy_id UUID not null references time_off_policies (id) on delete CASCADE,
  start_date DATE not null,
  end_date DATE not null,
  days_requested DECIMAL(5, 2) not null,
  reason TEXT,
  status time_off_request_status not null default 'pending',
  reviewed_by UUID references profiles (id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW()
);

-- =============================================
-- 8. HOLIDAYS TABLE
-- =============================================
create table if not exists holidays (
  id UUID primary key default uuid_generate_v4 (),
  organization_id UUID references organizations (id) on delete CASCADE,
  name TEXT not null,
  date DATE not null,
  is_paid BOOLEAN default true,
  country TEXT default 'NP',
  year INT GENERATED ALWAYS as (
    EXTRACT(
      year
      from
        date
    )::INT
  ) STORED,
  is_recurring BOOLEAN default false,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW()
);

-- Insert default Nepal holidays (organization_id NULL = global defaults)
insert into
  holidays (organization_id, name, date, is_paid, country)
values
  (null, 'New Year''s Day', '2025-01-01', true, 'NP'),
  (null, 'Magh Sankranti', '2025-01-15', true, 'NP'),
  (null, 'Saraswati Puja', '2025-02-03', true, 'NP'),
  (null, 'Democracy Day', '2025-02-19', true, 'NP'),
  (null, 'Maha Shivaratri', '2025-02-26', true, 'NP'),
  (null, 'Holi', '2025-03-14', true, 'NP'),
  (null, 'Nepali New Year', '2025-04-14', true, 'NP'),
  (null, 'Buddha Jayanti', '2025-05-12', true, 'NP'),
  (null, 'Republic Day', '2025-05-28', true, 'NP'),
  (null, 'Gaijatra', '2025-08-09', true, 'NP'),
  (
    null,
    'Krishna Janmashtami',
    '2025-08-16',
    true,
    'NP'
  ),
  (
    null,
    'Constitution Day',
    '2025-09-19',
    true,
    'NP'
  ),
  (
    null,
    'Dashain (10 days)',
    '2025-10-01',
    true,
    'NP'
  ),
  (null, 'Tihar (5 days)', '2025-10-20', true, 'NP'),
  (null, 'Chhath Parva', '2025-10-28', true, 'NP')
on conflict do nothing;

-- =============================================
-- 9. ANNOUNCEMENTS TABLE
-- =============================================
create table if not exists announcements (
  id UUID primary key default uuid_generate_v4 (),
  organization_id UUID not null references organizations (id) on delete CASCADE,
  title TEXT not null,
  content TEXT not null,
  author_id UUID references profiles (id) ON DELETE SET NULL,
  is_published BOOLEAN default false,
  is_pinned BOOLEAN default false,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW()
);

-- =============================================
-- 10. JOB POSTINGS & APPLICATIONS TABLES
-- =============================================
-- Job postings
create table if not exists job_postings (
  id UUID primary key default uuid_generate_v4 (),
  organization_id UUID not null references organizations (id) on delete CASCADE,
  title TEXT not null,
  description TEXT,
  requirements TEXT,
  responsibilities TEXT,
  department TEXT,
  location TEXT,
  is_remote BOOLEAN default true,
  employment_type employment_type default 'full_time',
  salary_min DECIMAL(12, 2),
  salary_max DECIMAL(12, 2),
  salary_currency TEXT default 'NPR',
  show_salary BOOLEAN default false,
  status job_posting_status not null default 'draft',
  applications_count INT default 0,
  created_by UUID references profiles (id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW()
);

-- Job applications
create table if not exists applications (
  id UUID primary key default uuid_generate_v4 (),
  job_posting_id UUID not null references job_postings (id) on delete CASCADE,
  candidate_id UUID not null references profiles (id) on delete CASCADE,
  stage application_stage not null default 'applied',
  resume_url TEXT,
  cover_letter TEXT,
  notes TEXT,
  rating INT check (
    rating >= 1
    and rating <= 5
  ),
  applied_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW(),
  unique (job_posting_id, candidate_id)
);

-- Application activity/history
create table if not exists application_activities (
  id UUID primary key default uuid_generate_v4 (),
  application_id UUID not null references applications (id) on delete CASCADE,
  from_stage application_stage,
  to_stage application_stage not null,
  notes TEXT,
  created_by UUID references profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ not null default NOW()
);

-- =============================================
-- 11. COMPLIANCE TABLES
-- =============================================
-- Compliance checklist items
create table if not exists compliance_items (
  id UUID primary key default uuid_generate_v4 (),
  organization_id UUID not null references organizations (id) on delete CASCADE,
  member_id UUID references organization_members (id) on delete CASCADE,
  item_type compliance_item_type not null,
  name TEXT not null,
  description TEXT,
  is_required BOOLEAN default true,
  status compliance_status not null default 'pending',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW()
);

-- Compliance alerts/notifications
create table if not exists compliance_alerts (
  id UUID primary key default uuid_generate_v4 (),
  organization_id UUID not null references organizations (id) on delete CASCADE,
  member_id UUID references organization_members (id) on delete CASCADE,
  compliance_item_id UUID references compliance_items (id) on delete set null,
  alert_type alert_type not null default 'info',
  title TEXT not null,
  message TEXT not null,
  action_url TEXT,
  is_read BOOLEAN default false,
  is_dismissed BOOLEAN default false,
  created_at TIMESTAMPTZ not null default NOW()
);

-- =============================================
-- 12. INVOICES TABLE
-- =============================================
create table if not exists invoices (
  id UUID primary key default uuid_generate_v4 (),
  organization_id UUID not null references organizations (id) on delete CASCADE,
  invoice_number TEXT not null,
  member_id UUID references organization_members (id) on delete set null,
  client_name TEXT,
  client_email TEXT,
  client_address TEXT,
  amount DECIMAL(14, 2) not null default 0,
  tax_amount DECIMAL(12, 2) default 0,
  total_amount DECIMAL(14, 2) GENERATED ALWAYS as (amount + COALESCE(tax_amount, 0)) STORED,
  currency TEXT default 'NPR',
  status invoice_status not null default 'draft',
  issue_date DATE not null default CURRENT_DATE,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  line_items JSONB default '[]'::jsonb,
  created_by UUID references profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW(),
  unique (organization_id, invoice_number)
);

-- =============================================
-- 13. DOCUMENTS TABLE
-- =============================================
create table if not exists documents (
  id UUID primary key default uuid_generate_v4 (),
  organization_id UUID not null references organizations (id) on delete CASCADE,
  member_id UUID references organization_members (id) on delete CASCADE,
  name TEXT not null,
  description TEXT,
  file_url TEXT not null,
  file_type TEXT,
  file_size INT,
  category document_category not null default 'other',
  is_sensitive BOOLEAN default false,
  uploaded_by UUID references profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW()
);

-- =============================================
-- 14. BENEFITS ENROLLMENTS TABLE
-- =============================================
create table if not exists benefits_plans (
  id UUID primary key default uuid_generate_v4 (),
  organization_id UUID not null references organizations (id) on delete CASCADE,
  name TEXT not null,
  description TEXT,
  plan_type TEXT not null,
  provider TEXT,
  monthly_cost DECIMAL(10, 2),
  employer_contribution DECIMAL(5, 2) default 0,
  is_active BOOLEAN default true,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW()
);

create table if not exists benefits_enrollments (
  id UUID primary key default uuid_generate_v4 (),
  member_id UUID not null references organization_members (id) on delete CASCADE,
  plan_id UUID not null references benefits_plans (id) on delete CASCADE,
  status benefits_status not null default 'pending',
  enrolled_at TIMESTAMPTZ,
  coverage_start_date DATE,
  coverage_end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW(),
  unique (member_id, plan_id)
);

-- =============================================
-- 15. ACTIVITY LOG TABLE (Audit Trail)
-- =============================================
create table if not exists activity_log (
  id UUID primary key default uuid_generate_v4 (),
  organization_id UUID references organizations (id) on delete set null,
  user_id UUID references profiles (id) on delete set null,
  action TEXT not null,
  entity_type TEXT not null,
  entity_id UUID,
  details JSONB default '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ not null default NOW()
);

-- =============================================
-- 16. INDEXES
-- =============================================
-- Existing indexes
create index IF not exists idx_profiles_email on profiles (email);

create index IF not exists idx_profiles_role on profiles (role);

create index IF not exists idx_profiles_organization on profiles (organization_id);

create index IF not exists idx_profiles_status on profiles (status);

create index IF not exists idx_organizations_owner on organizations (owner_id);

create index IF not exists idx_organizations_status on organizations (status);

create index IF not exists idx_organizations_industry on organizations (industry);

create index IF not exists idx_org_members_org on organization_members (organization_id);

create index IF not exists idx_org_members_profile on organization_members (profile_id);

create index IF not exists idx_org_members_status on organization_members (status);

-- New indexes for MVP tables
create index IF not exists idx_payroll_runs_org on payroll_runs (organization_id);

create index IF not exists idx_payroll_runs_status on payroll_runs (status);

create index IF not exists idx_payroll_runs_pay_date on payroll_runs (pay_date);

create index IF not exists idx_payroll_items_run on payroll_items (payroll_run_id);

create index IF not exists idx_payroll_items_member on payroll_items (member_id);

create index IF not exists idx_time_off_policies_org on time_off_policies (organization_id);

create index IF not exists idx_time_off_balances_member on time_off_balances (member_id);

create index IF not exists idx_time_off_requests_member on time_off_requests (member_id);

create index IF not exists idx_time_off_requests_status on time_off_requests (status);

create index IF not exists idx_holidays_org on holidays (organization_id);

create index IF not exists idx_holidays_date on holidays (date);

create index IF not exists idx_holidays_year on holidays (year);

create index IF not exists idx_announcements_org on announcements (organization_id);

create index IF not exists idx_announcements_published on announcements (is_published, published_at);

create index IF not exists idx_job_postings_org on job_postings (organization_id);

create index IF not exists idx_job_postings_status on job_postings (status);

create index IF not exists idx_applications_job on applications (job_posting_id);

create index IF not exists idx_applications_candidate on applications (candidate_id);

create index IF not exists idx_applications_stage on applications (stage);

create index IF not exists idx_compliance_items_org on compliance_items (organization_id);

create index IF not exists idx_compliance_items_member on compliance_items (member_id);

create index IF not exists idx_compliance_items_status on compliance_items (status);

create index IF not exists idx_compliance_alerts_org on compliance_alerts (organization_id);

create index IF not exists idx_compliance_alerts_read on compliance_alerts (is_read, is_dismissed);

create index IF not exists idx_invoices_org on invoices (organization_id);

create index IF not exists idx_invoices_status on invoices (status);

create index IF not exists idx_invoices_due_date on invoices (due_date);

create index IF not exists idx_documents_org on documents (organization_id);

create index IF not exists idx_documents_member on documents (member_id);

create index IF not exists idx_documents_category on documents (category);

create index IF not exists idx_benefits_plans_org on benefits_plans (organization_id);

create index IF not exists idx_benefits_enrollments_member on benefits_enrollments (member_id);

create index IF not exists idx_activity_log_org on activity_log (organization_id);

create index IF not exists idx_activity_log_user on activity_log (user_id);

create index IF not exists idx_activity_log_entity on activity_log (entity_type, entity_id);

create index IF not exists idx_activity_log_created on activity_log (created_at);

-- =============================================
-- 17. UPDATED_AT TRIGGER
-- =============================================
create or replace function update_updated_at_column () RETURNS TRIGGER as $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate triggers to avoid duplicates
drop trigger IF exists update_profiles_updated_at on profiles;

create trigger update_profiles_updated_at BEFORE
update on profiles for EACH row
execute FUNCTION update_updated_at_column ();

drop trigger IF exists update_organizations_updated_at on organizations;

create trigger update_organizations_updated_at BEFORE
update on organizations for EACH row
execute FUNCTION update_updated_at_column ();

drop trigger IF exists update_org_members_updated_at on organization_members;

create trigger update_org_members_updated_at BEFORE
update on organization_members for EACH row
execute FUNCTION update_updated_at_column ();

drop trigger IF exists update_payroll_runs_updated_at on payroll_runs;

create trigger update_payroll_runs_updated_at BEFORE
update on payroll_runs for EACH row
execute FUNCTION update_updated_at_column ();

drop trigger IF exists update_payroll_items_updated_at on payroll_items;

create trigger update_payroll_items_updated_at BEFORE
update on payroll_items for EACH row
execute FUNCTION update_updated_at_column ();

drop trigger IF exists update_time_off_policies_updated_at on time_off_policies;

create trigger update_time_off_policies_updated_at BEFORE
update on time_off_policies for EACH row
execute FUNCTION update_updated_at_column ();

drop trigger IF exists update_time_off_balances_updated_at on time_off_balances;

create trigger update_time_off_balances_updated_at BEFORE
update on time_off_balances for EACH row
execute FUNCTION update_updated_at_column ();

drop trigger IF exists update_time_off_requests_updated_at on time_off_requests;

create trigger update_time_off_requests_updated_at BEFORE
update on time_off_requests for EACH row
execute FUNCTION update_updated_at_column ();

drop trigger IF exists update_holidays_updated_at on holidays;

create trigger update_holidays_updated_at BEFORE
update on holidays for EACH row
execute FUNCTION update_updated_at_column ();

drop trigger IF exists update_announcements_updated_at on announcements;

create trigger update_announcements_updated_at BEFORE
update on announcements for EACH row
execute FUNCTION update_updated_at_column ();

drop trigger IF exists update_job_postings_updated_at on job_postings;

create trigger update_job_postings_updated_at BEFORE
update on job_postings for EACH row
execute FUNCTION update_updated_at_column ();

drop trigger IF exists update_applications_updated_at on applications;

create trigger update_applications_updated_at BEFORE
update on applications for EACH row
execute FUNCTION update_updated_at_column ();

drop trigger IF exists update_compliance_items_updated_at on compliance_items;

create trigger update_compliance_items_updated_at BEFORE
update on compliance_items for EACH row
execute FUNCTION update_updated_at_column ();

drop trigger IF exists update_invoices_updated_at on invoices;

create trigger update_invoices_updated_at BEFORE
update on invoices for EACH row
execute FUNCTION update_updated_at_column ();

drop trigger IF exists update_documents_updated_at on documents;

create trigger update_documents_updated_at BEFORE
update on documents for EACH row
execute FUNCTION update_updated_at_column ();

drop trigger IF exists update_benefits_plans_updated_at on benefits_plans;

create trigger update_benefits_plans_updated_at BEFORE
update on benefits_plans for EACH row
execute FUNCTION update_updated_at_column ();

drop trigger IF exists update_benefits_enrollments_updated_at on benefits_enrollments;

create trigger update_benefits_enrollments_updated_at BEFORE
update on benefits_enrollments for EACH row
execute FUNCTION update_updated_at_column ();

-- =============================================
-- 18. AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
create or replace function handle_new_user () RETURNS TRIGGER as $$
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
drop trigger IF exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after INSERT on auth.users for EACH row
execute FUNCTION handle_new_user ();

-- =============================================
-- 18b. DELETE AUTH.USERS WHEN PROFILE DELETED
-- =============================================
-- This trigger ensures that when a profile is deleted,
-- the corresponding auth.users entry is also deleted.
-- Without this, the email would still be "taken" in Supabase Auth.

create or replace function delete_auth_user () RETURNS TRIGGER as $$
BEGIN
    -- Delete the auth.users record (requires service role)
    DELETE FROM auth.users WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
drop trigger IF exists on_profile_deleted on profiles;

create trigger on_profile_deleted
BEFORE DELETE on profiles for EACH row
execute FUNCTION delete_auth_user ();

-- =============================================
-- 19. ROW LEVEL SECURITY
-- =============================================
-- Enable RLS on all tables
alter table profiles ENABLE row LEVEL SECURITY;

alter table organizations ENABLE row LEVEL SECURITY;

alter table organization_members ENABLE row LEVEL SECURITY;

alter table industries ENABLE row LEVEL SECURITY;

alter table payroll_runs ENABLE row LEVEL SECURITY;

alter table payroll_items ENABLE row LEVEL SECURITY;

alter table time_off_policies ENABLE row LEVEL SECURITY;

alter table time_off_balances ENABLE row LEVEL SECURITY;

alter table time_off_requests ENABLE row LEVEL SECURITY;

alter table holidays ENABLE row LEVEL SECURITY;

alter table announcements ENABLE row LEVEL SECURITY;

alter table job_postings ENABLE row LEVEL SECURITY;

alter table applications ENABLE row LEVEL SECURITY;

alter table application_activities ENABLE row LEVEL SECURITY;

alter table compliance_items ENABLE row LEVEL SECURITY;

alter table compliance_alerts ENABLE row LEVEL SECURITY;

alter table invoices ENABLE row LEVEL SECURITY;

alter table documents ENABLE row LEVEL SECURITY;

alter table benefits_plans ENABLE row LEVEL SECURITY;

alter table benefits_enrollments ENABLE row LEVEL SECURITY;

alter table activity_log ENABLE row LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - EXISTING TABLES
-- =============================================
-- Drop existing policies first (to allow re-run)
drop policy IF exists "Anyone can view industries" on industries;

drop policy IF exists "Users can view own profile" on profiles;

drop policy IF exists "Users can update own profile" on profiles;

drop policy IF exists "Employers can view org member profiles" on profiles;

drop policy IF exists "Members can view their organization" on organizations;

drop policy IF exists "Owners can update organization" on organizations;

drop policy IF exists "Employers can create organizations" on organizations;

drop policy IF exists "Users can view own membership" on organization_members;

drop policy IF exists "Org admins can view all members" on organization_members;

drop policy IF exists "Org owners can add members" on organization_members;

drop policy IF exists "Org owners can update members" on organization_members;

drop policy IF exists "Org owners can delete members" on organization_members;

-- Create policies for existing tables
create policy "Anyone can view industries" on industries for
select
  using (true);

create policy "Users can view own profile" on profiles for
select
  using (auth.uid () = id);

create policy "Users can update own profile" on profiles
for update
  using (auth.uid () = id)
with
  check (auth.uid () = id);

create policy "Employers can view org member profiles" on profiles for
select
  using (
    exists (
      select
        1
      from
        organization_members om
      where
        om.profile_id = profiles.id
        and om.organization_id in (
          select
            organization_id
          from
            profiles
          where
            id = auth.uid ()
        )
    )
  );

create policy "Members can view their organization" on organizations for
select
  using (
    owner_id = auth.uid ()
    or id in (
      select
        organization_id
      from
        organization_members
      where
        profile_id = auth.uid ()
    )
    or id in (
      select
        organization_id
      from
        profiles
      where
        id = auth.uid ()
    )
  );

create policy "Owners can update organization" on organizations
for update
  using (owner_id = auth.uid ())
with
  check (owner_id = auth.uid ());

create policy "Employers can create organizations" on organizations for INSERT
with
  check (auth.uid () is not null);

create policy "Users can view own membership" on organization_members for
select
  using (profile_id = auth.uid ());

create policy "Org admins can view all members" on organization_members for
select
  using (
    organization_id in (
      select
        organization_id
      from
        profiles
      where
        id = auth.uid ()
    )
    or organization_id in (
      select
        id
      from
        organizations
      where
        owner_id = auth.uid ()
    )
  );

create policy "Org owners can add members" on organization_members for INSERT
with
  check (
    organization_id in (
      select
        id
      from
        organizations
      where
        owner_id = auth.uid ()
    )
  );

create policy "Org owners can update members" on organization_members
for update
  using (
    organization_id in (
      select
        id
      from
        organizations
      where
        owner_id = auth.uid ()
    )
  );

create policy "Org owners can delete members" on organization_members for DELETE using (
  organization_id in (
    select
      id
    from
      organizations
    where
      owner_id = auth.uid ()
  )
);

-- =============================================
-- RLS POLICIES - PAYROLL
-- =============================================
drop policy IF exists "Org members can view payroll runs" on payroll_runs;

drop policy IF exists "Org admins can create payroll runs" on payroll_runs;

drop policy IF exists "Org admins can update payroll runs" on payroll_runs;

drop policy IF exists "Org owners can delete payroll runs" on payroll_runs;

create policy "Org members can view payroll runs" on payroll_runs for
select
  using (
    organization_id in (
      select
        organization_id
      from
        profiles
      where
        id = auth.uid ()
    )
    or organization_id in (
      select
        id
      from
        organizations
      where
        owner_id = auth.uid ()
    )
  );

create policy "Org admins can create payroll runs" on payroll_runs for INSERT
with
  check (
    organization_id in (
      select
        id
      from
        organizations
      where
        owner_id = auth.uid ()
    )
  );

create policy "Org admins can update payroll runs" on payroll_runs
for update
  using (
    organization_id in (
      select
        id
      from
        organizations
      where
        owner_id = auth.uid ()
    )
  );

create policy "Org owners can delete payroll runs" on payroll_runs for DELETE using (
  organization_id in (
    select
      id
    from
      organizations
    where
      owner_id = auth.uid ()
  )
);

drop policy IF exists "Employees can view own payroll items" on payroll_items;

drop policy IF exists "Org admins can view all payroll items" on payroll_items;

drop policy IF exists "Org admins can manage payroll items" on payroll_items;

create policy "Employees can view own payroll items" on payroll_items for
select
  using (
    member_id in (
      select
        id
      from
        organization_members
      where
        profile_id = auth.uid ()
    )
  );

create policy "Org admins can view all payroll items" on payroll_items for
select
  using (
    payroll_run_id in (
      select
        id
      from
        payroll_runs
      where
        organization_id in (
          select
            id
          from
            organizations
          where
            owner_id = auth.uid ()
        )
    )
  );

create policy "Org admins can manage payroll items" on payroll_items for all using (
  payroll_run_id in (
    select
      id
    from
      payroll_runs
    where
      organization_id in (
        select
          id
        from
          organizations
        where
          owner_id = auth.uid ()
      )
  )
);

-- =============================================
-- RLS POLICIES - TIME OFF
-- =============================================
drop policy IF exists "Org members can view time off policies" on time_off_policies;

drop policy IF exists "Org admins can manage time off policies" on time_off_policies;

create policy "Org members can view time off policies" on time_off_policies for
select
  using (
    organization_id in (
      select
        organization_id
      from
        profiles
      where
        id = auth.uid ()
    )
    or organization_id in (
      select
        id
      from
        organizations
      where
        owner_id = auth.uid ()
    )
  );

create policy "Org admins can manage time off policies" on time_off_policies for all using (
  organization_id in (
    select
      id
    from
      organizations
    where
      owner_id = auth.uid ()
  )
);

drop policy IF exists "Employees can view own time off balances" on time_off_balances;

drop policy IF exists "Org admins can view all time off balances" on time_off_balances;

drop policy IF exists "Org admins can manage time off balances" on time_off_balances;

create policy "Employees can view own time off balances" on time_off_balances for
select
  using (
    member_id in (
      select
        id
      from
        organization_members
      where
        profile_id = auth.uid ()
    )
  );

create policy "Org admins can view all time off balances" on time_off_balances for
select
  using (
    member_id in (
      select
        id
      from
        organization_members
      where
        organization_id in (
          select
            id
          from
            organizations
          where
            owner_id = auth.uid ()
        )
    )
  );

create policy "Org admins can manage time off balances" on time_off_balances for all using (
  member_id in (
    select
      id
    from
      organization_members
    where
      organization_id in (
        select
          id
        from
          organizations
        where
          owner_id = auth.uid ()
      )
  )
);

drop policy IF exists "Employees can view own time off requests" on time_off_requests;

drop policy IF exists "Employees can create time off requests" on time_off_requests;

drop policy IF exists "Employees can update own pending requests" on time_off_requests;

drop policy IF exists "Org admins can view all time off requests" on time_off_requests;

drop policy IF exists "Org admins can update time off requests" on time_off_requests;

create policy "Employees can view own time off requests" on time_off_requests for
select
  using (
    member_id in (
      select
        id
      from
        organization_members
      where
        profile_id = auth.uid ()
    )
  );

create policy "Employees can create time off requests" on time_off_requests for INSERT
with
  check (
    member_id in (
      select
        id
      from
        organization_members
      where
        profile_id = auth.uid ()
    )
  );

create policy "Employees can update own pending requests" on time_off_requests
for update
  using (
    member_id in (
      select
        id
      from
        organization_members
      where
        profile_id = auth.uid ()
    )
    and status = 'pending'
  );

create policy "Org admins can view all time off requests" on time_off_requests for
select
  using (
    member_id in (
      select
        id
      from
        organization_members
      where
        organization_id in (
          select
            id
          from
            organizations
          where
            owner_id = auth.uid ()
        )
    )
  );

create policy "Org admins can update time off requests" on time_off_requests
for update
  using (
    member_id in (
      select
        id
      from
        organization_members
      where
        organization_id in (
          select
            id
          from
            organizations
          where
            owner_id = auth.uid ()
        )
    )
  );

-- =============================================
-- RLS POLICIES - HOLIDAYS
-- =============================================
drop policy IF exists "Anyone can view global holidays" on holidays;

drop policy IF exists "Org members can view org holidays" on holidays;

drop policy IF exists "Org admins can manage org holidays" on holidays;

create policy "Anyone can view global holidays" on holidays for
select
  using (organization_id is null);

create policy "Org members can view org holidays" on holidays for
select
  using (
    organization_id in (
      select
        organization_id
      from
        profiles
      where
        id = auth.uid ()
    )
    or organization_id in (
      select
        id
      from
        organizations
      where
        owner_id = auth.uid ()
    )
  );

create policy "Org admins can manage org holidays" on holidays for all using (
  organization_id in (
    select
      id
    from
      organizations
    where
      owner_id = auth.uid ()
  )
);

-- =============================================
-- RLS POLICIES - ANNOUNCEMENTS
-- =============================================
drop policy IF exists "Org members can view published announcements" on announcements;

drop policy IF exists "Org admins can manage announcements" on announcements;

create policy "Org members can view published announcements" on announcements for
select
  using (
    is_published = true
    and (
      organization_id in (
        select
          organization_id
        from
          profiles
        where
          id = auth.uid ()
      )
      or organization_id in (
        select
          id
        from
          organizations
        where
          owner_id = auth.uid ()
      )
    )
  );

create policy "Org admins can manage announcements" on announcements for all using (
  organization_id in (
    select
      id
    from
      organizations
    where
      owner_id = auth.uid ()
  )
);

-- =============================================
-- RLS POLICIES - JOB POSTINGS & APPLICATIONS
-- =============================================
drop policy IF exists "Anyone can view open job postings" on job_postings;

drop policy IF exists "Org admins can manage job postings" on job_postings;

create policy "Anyone can view open job postings" on job_postings for
select
  using (status = 'open');

create policy "Org admins can manage job postings" on job_postings for all using (
  organization_id in (
    select
      id
    from
      organizations
    where
      owner_id = auth.uid ()
  )
);

drop policy IF exists "Candidates can view own applications" on applications;

drop policy IF exists "Candidates can create applications" on applications;

drop policy IF exists "Org admins can view applications" on applications;

drop policy IF exists "Org admins can update applications" on applications;

create policy "Candidates can view own applications" on applications for
select
  using (candidate_id = auth.uid ());

create policy "Candidates can create applications" on applications for INSERT
with
  check (candidate_id = auth.uid ());

create policy "Org admins can view applications" on applications for
select
  using (
    job_posting_id in (
      select
        id
      from
        job_postings
      where
        organization_id in (
          select
            id
          from
            organizations
          where
            owner_id = auth.uid ()
        )
    )
  );

create policy "Org admins can update applications" on applications
for update
  using (
    job_posting_id in (
      select
        id
      from
        job_postings
      where
        organization_id in (
          select
            id
          from
            organizations
          where
            owner_id = auth.uid ()
        )
    )
  );

drop policy IF exists "Org admins can view application activities" on application_activities;

drop policy IF exists "Org admins can create application activities" on application_activities;

create policy "Org admins can view application activities" on application_activities for
select
  using (
    application_id in (
      select
        a.id
      from
        applications a
        join job_postings jp on jp.id = a.job_posting_id
      where
        jp.organization_id in (
          select
            id
          from
            organizations
          where
            owner_id = auth.uid ()
        )
    )
  );

create policy "Org admins can create application activities" on application_activities for INSERT
with
  check (
    application_id in (
      select
        a.id
      from
        applications a
        join job_postings jp on jp.id = a.job_posting_id
      where
        jp.organization_id in (
          select
            id
          from
            organizations
          where
            owner_id = auth.uid ()
        )
    )
  );

-- =============================================
-- RLS POLICIES - COMPLIANCE
-- =============================================
drop policy IF exists "Employees can view own compliance items" on compliance_items;

drop policy IF exists "Org admins can view all compliance items" on compliance_items;

drop policy IF exists "Org admins can manage compliance items" on compliance_items;

create policy "Employees can view own compliance items" on compliance_items for
select
  using (
    member_id in (
      select
        id
      from
        organization_members
      where
        profile_id = auth.uid ()
    )
    or (
      member_id is null
      and organization_id in (
        select
          organization_id
        from
          profiles
        where
          id = auth.uid ()
      )
    )
  );

create policy "Org admins can view all compliance items" on compliance_items for
select
  using (
    organization_id in (
      select
        id
      from
        organizations
      where
        owner_id = auth.uid ()
    )
  );

create policy "Org admins can manage compliance items" on compliance_items for all using (
  organization_id in (
    select
      id
    from
      organizations
    where
      owner_id = auth.uid ()
  )
);

drop policy IF exists "Employees can view own compliance alerts" on compliance_alerts;

drop policy IF exists "Org admins can view all compliance alerts" on compliance_alerts;

drop policy IF exists "Org admins can manage compliance alerts" on compliance_alerts;

create policy "Employees can view own compliance alerts" on compliance_alerts for
select
  using (
    member_id in (
      select
        id
      from
        organization_members
      where
        profile_id = auth.uid ()
    )
    or (
      member_id is null
      and organization_id in (
        select
          organization_id
        from
          profiles
        where
          id = auth.uid ()
      )
    )
  );

create policy "Org admins can view all compliance alerts" on compliance_alerts for
select
  using (
    organization_id in (
      select
        id
      from
        organizations
      where
        owner_id = auth.uid ()
    )
  );

create policy "Org admins can manage compliance alerts" on compliance_alerts for all using (
  organization_id in (
    select
      id
    from
      organizations
    where
      owner_id = auth.uid ()
  )
);

-- =============================================
-- RLS POLICIES - INVOICES
-- =============================================
drop policy IF exists "Org members can view invoices" on invoices;

drop policy IF exists "Org admins can manage invoices" on invoices;

create policy "Org members can view invoices" on invoices for
select
  using (
    organization_id in (
      select
        organization_id
      from
        profiles
      where
        id = auth.uid ()
    )
    or organization_id in (
      select
        id
      from
        organizations
      where
        owner_id = auth.uid ()
    )
  );

create policy "Org admins can manage invoices" on invoices for all using (
  organization_id in (
    select
      id
    from
      organizations
    where
      owner_id = auth.uid ()
  )
);

-- =============================================
-- RLS POLICIES - DOCUMENTS
-- =============================================
drop policy IF exists "Employees can view own documents" on documents;

drop policy IF exists "Org admins can view all documents" on documents;

drop policy IF exists "Org admins can manage documents" on documents;

drop policy IF exists "Employees can upload own documents" on documents;

create policy "Employees can view own documents" on documents for
select
  using (
    member_id in (
      select
        id
      from
        organization_members
      where
        profile_id = auth.uid ()
    )
    or (
      member_id is null
      and organization_id in (
        select
          organization_id
        from
          profiles
        where
          id = auth.uid ()
      )
    )
  );

create policy "Org admins can view all documents" on documents for
select
  using (
    organization_id in (
      select
        id
      from
        organizations
      where
        owner_id = auth.uid ()
    )
  );

create policy "Org admins can manage documents" on documents for all using (
  organization_id in (
    select
      id
    from
      organizations
    where
      owner_id = auth.uid ()
  )
);

create policy "Employees can upload own documents" on documents for INSERT
with
  check (
    member_id in (
      select
        id
      from
        organization_members
      where
        profile_id = auth.uid ()
    )
    and uploaded_by = auth.uid ()
  );

-- =============================================
-- RLS POLICIES - BENEFITS
-- =============================================
drop policy IF exists "Org members can view benefits plans" on benefits_plans;

drop policy IF exists "Org admins can manage benefits plans" on benefits_plans;

create policy "Org members can view benefits plans" on benefits_plans for
select
  using (
    organization_id in (
      select
        organization_id
      from
        profiles
      where
        id = auth.uid ()
    )
    or organization_id in (
      select
        id
      from
        organizations
      where
        owner_id = auth.uid ()
    )
  );

create policy "Org admins can manage benefits plans" on benefits_plans for all using (
  organization_id in (
    select
      id
    from
      organizations
    where
      owner_id = auth.uid ()
  )
);

drop policy IF exists "Employees can view own benefits enrollments" on benefits_enrollments;

drop policy IF exists "Org admins can view all benefits enrollments" on benefits_enrollments;

drop policy IF exists "Org admins can manage benefits enrollments" on benefits_enrollments;

create policy "Employees can view own benefits enrollments" on benefits_enrollments for
select
  using (
    member_id in (
      select
        id
      from
        organization_members
      where
        profile_id = auth.uid ()
    )
  );

create policy "Org admins can view all benefits enrollments" on benefits_enrollments for
select
  using (
    member_id in (
      select
        id
      from
        organization_members
      where
        organization_id in (
          select
            id
          from
            organizations
          where
            owner_id = auth.uid ()
        )
    )
  );

create policy "Org admins can manage benefits enrollments" on benefits_enrollments for all using (
  member_id in (
    select
      id
    from
      organization_members
    where
      organization_id in (
        select
          id
        from
          organizations
        where
          owner_id = auth.uid ()
      )
  )
);

-- =============================================
-- RLS POLICIES - ACTIVITY LOG
-- =============================================
drop policy IF exists "Org admins can view activity log" on activity_log;

drop policy IF exists "System can insert activity log" on activity_log;

create policy "Org admins can view activity log" on activity_log for
select
  using (
    organization_id in (
      select
        id
      from
        organizations
      where
        owner_id = auth.uid ()
    )
  );

create policy "System can insert activity log" on activity_log for INSERT
with
  check (auth.uid () is not null);

-- =============================================
-- 20. HELPER FUNCTIONS
-- =============================================
-- Complete EMPLOYER signup
create or replace function complete_employer_signup (
  p_first_name TEXT,
  p_last_name TEXT,
  p_industry TEXT,
  p_industry_other TEXT default null
) RETURNS JSON as $$
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
create or replace function complete_candidate_signup (
  p_first_name TEXT,
  p_last_name TEXT,
  p_resume_url TEXT default null,
  p_resume_filename TEXT default null,
  p_linkedin_url TEXT default null
) RETURNS JSON as $$
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
create or replace function get_my_profile () RETURNS JSON as $$
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
create or replace function update_last_login () RETURNS JSON as $$
BEGIN
    UPDATE profiles SET last_login_at = NOW() WHERE id = auth.uid();
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if email exists
create or replace function check_email_exists (p_email TEXT) RETURNS JSON as $$
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
create or replace function get_employer_dashboard_stats (p_org_id UUID default null) RETURNS JSON as $$
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
create or replace function get_employee_dashboard_stats (p_member_id UUID default null) RETURNS JSON as $$
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
create or replace function get_pipeline_stats (p_org_id UUID default null) RETURNS JSON as $$
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
create or replace function get_compliance_details (p_org_id UUID default null) RETURNS JSON as $$
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
create or replace function create_payroll_run (
  p_org_id UUID,
  p_pay_period_start DATE,
  p_pay_period_end DATE,
  p_pay_date DATE
) RETURNS JSON as $$
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
create or replace function request_time_off (
  p_policy_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_reason TEXT default null
) RETURNS JSON as $$
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
create or replace function review_time_off_request (
  p_request_id UUID,
  p_approved BOOLEAN,
  p_notes TEXT default null
) RETURNS JSON as $$
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
create or replace function move_application_stage (
  p_application_id UUID,
  p_new_stage application_stage,
  p_notes TEXT default null
) RETURNS JSON as $$
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
create or replace function generate_invoice_number (p_org_id UUID) RETURNS TEXT as $$
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
insert into
  storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
  )
values
  (
    'resumes',
    'resumes',
    false,
    10485760,
    array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  )
on conflict (id) do nothing;

insert into
  storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
  )
values
  (
    'documents',
    'documents',
    false,
    52428800,
    array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif'
    ]
  )
on conflict (id) do nothing;

insert into
  storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
  )
values
  (
    'avatars',
    'avatars',
    true,
    5242880,
    array[
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]
  )
on conflict (id) do nothing;

insert into
  storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
  )
values
  (
    'logos',
    'logos',
    true,
    5242880,
    array[
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ]
  )
on conflict (id) do nothing;

-- Storage policies
drop policy IF exists "Users can upload own resume" on storage.objects;

drop policy IF exists "Users can view own resume" on storage.objects;

drop policy IF exists "Users can update own resume" on storage.objects;

drop policy IF exists "Users can delete own resume" on storage.objects;

drop policy IF exists "Employers can view candidate resumes" on storage.objects;

create policy "Users can upload own resume" on storage.objects for INSERT
with
  check (
    bucket_id = 'resumes'
    and auth.uid ()::text = (storage.foldername (name)) [1]
  );

create policy "Users can view own resume" on storage.objects for
select
  using (
    bucket_id = 'resumes'
    and auth.uid ()::text = (storage.foldername (name)) [1]
  );

create policy "Users can update own resume" on storage.objects
for update
  using (
    bucket_id = 'resumes'
    and auth.uid ()::text = (storage.foldername (name)) [1]
  );

create policy "Users can delete own resume" on storage.objects for DELETE using (
  bucket_id = 'resumes'
  and auth.uid ()::text = (storage.foldername (name)) [1]
);

create policy "Employers can view candidate resumes" on storage.objects for
select
  using (
    bucket_id = 'resumes'
    and exists (
      select
        1
      from
        profiles p
        join organization_members om on om.organization_id = p.organization_id
      where
        p.id = auth.uid ()
        and p.role = 'employer'
        and om.profile_id::text = (storage.foldername (name)) [1]
    )
  );

-- Document storage policies
drop policy IF exists "Org members can upload documents" on storage.objects;

drop policy IF exists "Org members can view documents" on storage.objects;

create policy "Org members can upload documents" on storage.objects for INSERT
with
  check (
    bucket_id = 'documents'
    and auth.uid () is not null
    and (storage.foldername (name)) [1] in (
      select
        id::text
      from
        organizations
      where
        owner_id = auth.uid ()
      union
      select
        organization_id::text
      from
        profiles
      where
        id = auth.uid ()
    )
  );

create policy "Org members can view documents" on storage.objects for
select
  using (
    bucket_id = 'documents'
    and (storage.foldername (name)) [1] in (
      select
        id::text
      from
        organizations
      where
        owner_id = auth.uid ()
      union
      select
        organization_id::text
      from
        profiles
      where
        id = auth.uid ()
    )
  );

-- Avatar storage policies (public read)
drop policy IF exists "Anyone can view avatars" on storage.objects;

drop policy IF exists "Users can upload own avatar" on storage.objects;

create policy "Anyone can view avatars" on storage.objects for
select
  using (bucket_id = 'avatars');

create policy "Users can upload own avatar" on storage.objects for INSERT
with
  check (
    bucket_id = 'avatars'
    and auth.uid ()::text = (storage.foldername (name)) [1]
  );

-- Logo storage policies (public read)
drop policy IF exists "Anyone can view logos" on storage.objects;

drop policy IF exists "Org owners can upload logos" on storage.objects;

create policy "Anyone can view logos" on storage.objects for
select
  using (bucket_id = 'logos');

create policy "Org owners can upload logos" on storage.objects for INSERT
with
  check (
    bucket_id = 'logos'
    and (storage.foldername (name)) [1] in (
      select
        id::text
      from
        organizations
      where
        owner_id = auth.uid ()
    )
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
drop trigger IF exists on_auth_user_created on auth.users;

-- Disable RLS on profiles table
alter table profiles DISABLE row LEVEL SECURITY;

-- Also disable on organizations if needed
alter table organizations DISABLE row LEVEL SECURITY;

-- And organization_members
alter table organization_members DISABLE row LEVEL SECURITY;

-- Add unique constraint to profiles.email
alter table profiles
add constraint uk_profiles_email unique (email);

-- Verify constraint
select
  constraint_name
from
  information_schema.table_constraints
where
  table_name = 'profiles'
  and constraint_type = 'UNIQUE';

-- Add holidays for your test organization
insert into
  holidays (organization_id, name, date, is_paid)
select
  id,
  'Independence Day',
  '2025-07-04',
  true
from
  organizations
limit
  1;

insert into
  holidays (organization_id, name, date, is_paid)
select
  id,
  'Labor Day',
  '2025-09-01',
  true
from
  organizations
limit
  1;

insert into
  holidays (organization_id, name, date, is_paid)
select
  id,
  'Thanksgiving',
  '2025-11-27',
  true
from
  organizations
limit
  1;

-- Add announcements (without created_by)
insert into
  announcements (organization_id, title, content, is_pinned)
select
  id,
  'Welcome to Talyn!',
  'We are excited to have you on board. Check out your dashboard for an overview of your workspace.',
  true
from
  organizations
limit
  1;

insert into
  announcements (organization_id, title, content, is_pinned)
select
  id,
  'New Benefits Portal',
  'We have launched a new benefits portal for easier access to healthcare and retirement options.',
  false
from
  organizations
limit
  1;

select
  column_name
from
  information_schema.columns
where
  table_name = 'announcements';

alter table organization_members
add column location TEXT,
add column start_date DATE;

select
  id,
  email,
  role,
  organization_id,
  status
from
  profiles
where
  email = 'akramwashim027@gmail.com';

-- 2. Check if an organization exists for you
select
  *
from
  organizations
where
  owner_id = 'b45b6cf3-bc32-43f5-acc6-2a5a41662227';

-- 3. If organization exists but not linked, link it:
update profiles
set
  organization_id = 'YOUR_ORG_ID'
where
  email = 'YOUR_EMPLOYER_EMAIL';

-- 4. If NO organization exists, create one:
insert into
  organizations (name, email, owner_id, status, industry)
values
  (
    'Your Company Name',
    'YOUR_EMAIL',
    'YOUR_PROFILE_ID',
    'active',
    'other'
  )
returning
  id;

-- Then link it to your profile:
update profiles
set
  organization_id = 'THE_NEW_ORG_ID',
  status = 'active',
  onboarding_completed = true
where
  id = 'YOUR_PROFILE_ID';

-- And create your owner membership:
insert into
  organization_members (
    organization_id,
    profile_id,
    member_role,
    status,
    joined_at
  )
values
  (
    'THE_NEW_ORG_ID',
    'YOUR_PROFILE_ID',
    'owner',
    'active',
    NOW()
  );

select
  *
from
  pg_policies
where
  tablename = 'documents';

-- If needed, add insert policy for authenticated users
create policy "Users can insert documents for their org" on documents for INSERT
with
  check (
    organization_id in (
      select
        organization_id
      from
        profiles
      where
        id = auth.uid ()
    )
  );

-- Migration: Add invitation tracking columns to organization_members
-- Run this in Supabase SQL Editor
-- Add invitation_email column (stores email for invitations before profile exists)
alter table organization_members
add column if not exists invitation_email TEXT;

-- Add invited_at column (if not exists - may already exist)
alter table organization_members
add column if not exists invited_at TIMESTAMPTZ;

-- Add joined_at column (if not exists - may already exist)
alter table organization_members
add column if not exists joined_at TIMESTAMPTZ;

-- Add offboarded_at column (if not exists - may already exist)
alter table organization_members
add column if not exists offboarded_at TIMESTAMPTZ;

-- Add created_at column
alter table organization_members
add column if not exists created_at TIMESTAMPTZ default NOW();

-- Add updated_at column
alter table organization_members
add column if not exists updated_at TIMESTAMPTZ default NOW();

-- Add created_by column (who invited this member)
-- Note: This might conflict with existing invited_by column - check first
do $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organization_members' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE organization_members ADD COLUMN created_by UUID REFERENCES profiles(id);
    END IF;
END $$;

-- Create index for email lookup (to match invitations with signups)
create index IF not exists idx_members_invitation_email on organization_members (invitation_email)
where
  invitation_email is not null;

-- Make profile_id nullable (allow invitations before user signs up)
alter table organization_members
alter column profile_id
drop not null;

-- Add comment explaining the invitation flow
COMMENT on column organization_members.invitation_email is 'Email used for invitation, used to match with profile when user signs up';

COMMENT on column organization_members.invited_at is 'Timestamp when the invitation was created';

COMMENT on column organization_members.joined_at is 'Timestamp when status changed to active';

-- Create a trigger to update updated_at timestamp
create or replace function update_updated_at_column () RETURNS TRIGGER as $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to organization_members
drop trigger IF exists update_organization_members_updated_at on organization_members;

create trigger update_organization_members_updated_at BEFORE
update on organization_members for EACH row
execute FUNCTION update_updated_at_column ();

--schema to create password reset table
create table password_reset_tokens (
  id UUID primary key default gen_random_uuid (),
  user_id UUID not null references profiles (id) on delete CASCADE,
  token_hash TEXT not null,
  expires_at TIMESTAMPTZ not null,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ default NOW()
);

create index idx_reset_tokens_hash on password_reset_tokens (token_hash);

-- Email Service Expansion Migration
-- Run this in Supabase SQL editor
-- Email verification tokens (similar pattern to password_reset_tokens)
create table if not exists email_verification_tokens (
  id UUID primary key default gen_random_uuid (),
  user_id UUID not null references profiles (id) on delete CASCADE,
  token_hash TEXT not null,
  expires_at TIMESTAMPTZ not null,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ default NOW()
);

create index IF not exists idx_verification_tokens_hash on email_verification_tokens (token_hash);

create index IF not exists idx_verification_tokens_user on email_verification_tokens (user_id);

-- Email logs for tracking sent emails
create table if not exists email_logs (
  id UUID primary key default gen_random_uuid (),
  recipient_email TEXT not null,
  email_type TEXT not null,
  subject TEXT not null,
  resend_message_id TEXT,
  status TEXT default 'sent',
  metadata JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ default NOW()
);

create index IF not exists idx_email_logs_recipient on email_logs (recipient_email);

create index IF not exists idx_email_logs_type on email_logs (email_type);

-- Add email_verified column to profiles if not exists
do $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Update existing verified users (those who signed up before this migration)
-- Set email_verified = true for users with status = 'active'
update profiles
set
  email_verified = true
where
  status = 'active'
  and email_verified is null;

-- Set email_verified = false for users with status = 'pending'
update profiles
set
  email_verified = false
where
  status = 'pending'
  and email_verified is null;