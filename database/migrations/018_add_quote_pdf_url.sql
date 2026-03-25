-- ============================================================
-- Migration 018: Add pdf_url to eor_quotes
-- Stores the Supabase Storage URL for cached Anvil-generated PDFs
-- ============================================================

ALTER TABLE eor_quotes ADD COLUMN IF NOT EXISTS pdf_url text;
