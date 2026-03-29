-- Migration 023: Add terms_accepted_at column to eor_quotes
-- Tracks when the employer accepted Terms of Service and Employment Policies before accepting a quote

ALTER TABLE eor_quotes ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN eor_quotes.terms_accepted_at IS 'Timestamp when Terms of Service and Employment Policies were accepted';
