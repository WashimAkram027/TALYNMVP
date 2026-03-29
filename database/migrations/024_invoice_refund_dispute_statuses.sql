-- Add 'refunded' and 'disputed' to invoice_status enum
-- These are needed for webhook handlers that process charge.refunded
-- and charge.dispute.created/closed events on invoice payments.
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'disputed';
