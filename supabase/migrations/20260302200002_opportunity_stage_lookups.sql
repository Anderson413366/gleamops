-- ============================================================================
-- Seed opportunity_stage lookups
-- The Opportunity form queries lookups WHERE category='opportunity_stage'.
-- Without these records, the Stage dropdown falls back to a single
-- hardcoded "Qualified" option, making pipeline tracking unusable.
-- ============================================================================
SET search_path TO 'public';

INSERT INTO lookups (tenant_id, category, code, label, sort_order, is_active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'opportunity_stage', 'QUALIFIED', 'Qualified', 1, true),
  ('a0000000-0000-0000-0000-000000000001', 'opportunity_stage', 'WALKTHROUGH_SCHEDULED', 'Walkthrough Scheduled', 2, true),
  ('a0000000-0000-0000-0000-000000000001', 'opportunity_stage', 'WALKTHROUGH_COMPLETE', 'Walkthrough Complete', 3, true),
  ('a0000000-0000-0000-0000-000000000001', 'opportunity_stage', 'BID_IN_PROGRESS', 'Bid in Progress', 4, true),
  ('a0000000-0000-0000-0000-000000000001', 'opportunity_stage', 'PROPOSAL_SENT', 'Proposal Sent', 5, true),
  ('a0000000-0000-0000-0000-000000000001', 'opportunity_stage', 'NEGOTIATION', 'Negotiation', 6, true),
  ('a0000000-0000-0000-0000-000000000001', 'opportunity_stage', 'WON', 'Won', 7, true),
  ('a0000000-0000-0000-0000-000000000001', 'opportunity_stage', 'LOST', 'Lost', 8, true)
ON CONFLICT DO NOTHING;
