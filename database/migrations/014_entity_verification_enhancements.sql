-- Migration 014: Entity Verification Enhancements
-- Adds certificate_of_registration to entity_documents allowed doc types

-- 1. Drop existing CHECK constraint on doc_type
ALTER TABLE entity_documents DROP CONSTRAINT entity_documents_doc_type_check;

-- 2. Add updated CHECK constraint with certificate_of_registration
ALTER TABLE entity_documents ADD CONSTRAINT entity_documents_doc_type_check
  CHECK (doc_type IN ('w9', 'articles_of_incorporation', 'bank_statement', 'certificate_of_registration'));
