-- Migration 007: Dashboard Onboarding Checklist
-- Adds organization profile enrichment fields, entity documents table, and entity verification status

-- 1. Add new columns to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS employee_types_needed TEXT[],
  ADD COLUMN IF NOT EXISTS entity_status TEXT DEFAULT 'not_started'
    CHECK (entity_status IN ('not_started', 'pending_review', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS entity_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entity_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entity_reviewed_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS setup_step_1_completed_at TIMESTAMPTZ;

-- 2. Create entity_documents table
CREATE TABLE IF NOT EXISTS entity_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('w9', 'articles_of_incorporation', 'bank_statement')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each org can only have one of each document type
  UNIQUE(organization_id, doc_type)
);

-- 3. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_entity_documents_org_id ON entity_documents(organization_id);

-- 4. Enable RLS on entity_documents
ALTER TABLE entity_documents ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for entity_documents
CREATE POLICY "Org owners can manage entity documents"
  ON entity_documents
  FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to entity documents"
  ON entity_documents
  FOR ALL
  USING (true)
  WITH CHECK (true);
