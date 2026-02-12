-- =================================================================
-- Lookup seed data (global lookups, tenant_id = NULL)
-- =================================================================

-- Prospect statuses
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'prospect_status', 'NEW', 'New', 1),
  (NULL, 'prospect_status', 'CONTACTED', 'Contacted', 2),
  (NULL, 'prospect_status', 'QUALIFIED', 'Qualified', 3),
  (NULL, 'prospect_status', 'UNQUALIFIED', 'Unqualified', 4),
  (NULL, 'prospect_status', 'DEAD', 'Dead', 5),
  (NULL, 'prospect_status', 'CONVERTED', 'Converted', 6);

-- Opportunity stages
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'opportunity_stage', 'QUALIFIED', 'Qualified', 1),
  (NULL, 'opportunity_stage', 'WALKTHROUGH_SCHEDULED', 'Walkthrough Scheduled', 2),
  (NULL, 'opportunity_stage', 'WALKTHROUGH_COMPLETE', 'Walkthrough Complete', 3),
  (NULL, 'opportunity_stage', 'BID_IN_PROGRESS', 'Bid in Progress', 4),
  (NULL, 'opportunity_stage', 'PROPOSAL_SENT', 'Proposal Sent', 5),
  (NULL, 'opportunity_stage', 'NEGOTIATION', 'Negotiation', 6),
  (NULL, 'opportunity_stage', 'WON', 'Won', 7),
  (NULL, 'opportunity_stage', 'LOST', 'Lost', 8);

-- Bid statuses
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'bid_status', 'DRAFT', 'Draft', 1),
  (NULL, 'bid_status', 'IN_PROGRESS', 'In Progress', 2),
  (NULL, 'bid_status', 'READY_FOR_REVIEW', 'Ready for Review', 3),
  (NULL, 'bid_status', 'APPROVED', 'Approved', 4),
  (NULL, 'bid_status', 'SENT', 'Sent', 5),
  (NULL, 'bid_status', 'WON', 'Won', 6),
  (NULL, 'bid_status', 'LOST', 'Lost', 7);

-- Proposal statuses
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'proposal_status', 'DRAFT', 'Draft', 1),
  (NULL, 'proposal_status', 'GENERATED', 'Generated', 2),
  (NULL, 'proposal_status', 'SENT', 'Sent', 3),
  (NULL, 'proposal_status', 'DELIVERED', 'Delivered', 4),
  (NULL, 'proposal_status', 'OPENED', 'Opened', 5),
  (NULL, 'proposal_status', 'WON', 'Won', 6),
  (NULL, 'proposal_status', 'LOST', 'Lost', 7),
  (NULL, 'proposal_status', 'EXPIRED', 'Expired', 8);

-- Ticket statuses
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'ticket_status', 'SCHEDULED', 'Scheduled', 1),
  (NULL, 'ticket_status', 'IN_PROGRESS', 'In Progress', 2),
  (NULL, 'ticket_status', 'COMPLETED', 'Completed', 3),
  (NULL, 'ticket_status', 'VERIFIED', 'Verified', 4),
  (NULL, 'ticket_status', 'CANCELLED', 'Cancelled', 5);

-- Time event types
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'time_event_type', 'CHECK_IN', 'Check In', 1),
  (NULL, 'time_event_type', 'CHECK_OUT', 'Check Out', 2),
  (NULL, 'time_event_type', 'BREAK_START', 'Break Start', 3),
  (NULL, 'time_event_type', 'BREAK_END', 'Break End', 4),
  (NULL, 'time_event_type', 'MANUAL_ADJUSTMENT', 'Manual Adjustment', 5);

-- Exception types
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'exception_type', 'OUT_OF_GEOFENCE', 'Out of Geofence', 1),
  (NULL, 'exception_type', 'LATE', 'Late', 2),
  (NULL, 'exception_type', 'EARLY_DEPARTURE', 'Early Departure', 3),
  (NULL, 'exception_type', 'MISSING_CHECKOUT', 'Missing Checkout', 4),
  (NULL, 'exception_type', 'MANUAL_OVERRIDE', 'Manual Override', 5);

-- Activity types
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'activity_type', 'CALL', 'Call', 1),
  (NULL, 'activity_type', 'EMAIL', 'Email', 2),
  (NULL, 'activity_type', 'MEETING', 'Meeting', 3),
  (NULL, 'activity_type', 'NOTE', 'Note', 4),
  (NULL, 'activity_type', 'TASK', 'Task', 5);

-- Frequencies
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'frequency', 'DAILY', 'Daily', 1),
  (NULL, 'frequency', 'WEEKLY', 'Weekly', 2),
  (NULL, 'frequency', 'BIWEEKLY', 'Biweekly', 3),
  (NULL, 'frequency', 'MONTHLY', 'Monthly', 4);

-- Difficulty
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'difficulty', 'EASY', 'Easy', 1),
  (NULL, 'difficulty', 'STANDARD', 'Standard', 2),
  (NULL, 'difficulty', 'DIFFICULT', 'Difficult', 3);

-- Task units
INSERT INTO lookups (tenant_id, category, code, label, sort_order) VALUES
  (NULL, 'task_unit', 'SQFT_1000', 'Per 1000 sqft', 1),
  (NULL, 'task_unit', 'EACH', 'Each', 2);
