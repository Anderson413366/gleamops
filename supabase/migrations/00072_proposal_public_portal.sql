-- Migration 00072: Add public_token to sales_proposal_sends for client portal access
-- Allows clients to view and sign proposals without authentication.

ALTER TABLE sales_proposal_sends
  ADD COLUMN IF NOT EXISTS public_token UUID DEFAULT gen_random_uuid() UNIQUE;

CREATE INDEX IF NOT EXISTS idx_proposal_sends_public_token
  ON sales_proposal_sends(public_token);
