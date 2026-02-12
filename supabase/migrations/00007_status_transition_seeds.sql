-- =================================================================
-- Status transition seeds (global, tenant_id = NULL)
-- Enforces legal state changes.
-- =================================================================

-- Bid transitions
INSERT INTO status_transitions (tenant_id, entity_type, from_status, to_status, allowed_roles) VALUES
  (NULL, 'bid', 'DRAFT', 'IN_PROGRESS', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'bid', 'IN_PROGRESS', 'READY_FOR_REVIEW', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'bid', 'IN_PROGRESS', 'DRAFT', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'bid', 'READY_FOR_REVIEW', 'APPROVED', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'bid', 'READY_FOR_REVIEW', 'IN_PROGRESS', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'bid', 'APPROVED', 'SENT', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'bid', 'SENT', 'WON', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'bid', 'SENT', 'LOST', '{OWNER_ADMIN,MANAGER}');

-- Proposal transitions
INSERT INTO status_transitions (tenant_id, entity_type, from_status, to_status, allowed_roles) VALUES
  (NULL, 'proposal', 'DRAFT', 'GENERATED', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'proposal', 'GENERATED', 'SENT', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'proposal', 'SENT', 'DELIVERED', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'proposal', 'SENT', 'OPENED', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'proposal', 'SENT', 'WON', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'proposal', 'SENT', 'LOST', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'proposal', 'SENT', 'EXPIRED', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'proposal', 'DELIVERED', 'OPENED', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'proposal', 'DELIVERED', 'WON', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'proposal', 'DELIVERED', 'LOST', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'proposal', 'DELIVERED', 'EXPIRED', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'proposal', 'OPENED', 'WON', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'proposal', 'OPENED', 'LOST', '{OWNER_ADMIN,MANAGER}'),
  (NULL, 'proposal', 'OPENED', 'EXPIRED', '{OWNER_ADMIN,MANAGER}');

-- Ticket transitions
INSERT INTO status_transitions (tenant_id, entity_type, from_status, to_status, allowed_roles) VALUES
  (NULL, 'ticket', 'SCHEDULED', 'IN_PROGRESS', '{OWNER_ADMIN,MANAGER,SUPERVISOR,CLEANER}'),
  (NULL, 'ticket', 'SCHEDULED', 'CANCELLED', '{OWNER_ADMIN,MANAGER,SUPERVISOR}'),
  (NULL, 'ticket', 'IN_PROGRESS', 'COMPLETED', '{OWNER_ADMIN,MANAGER,SUPERVISOR,CLEANER}'),
  (NULL, 'ticket', 'IN_PROGRESS', 'CANCELLED', '{OWNER_ADMIN,MANAGER,SUPERVISOR}'),
  (NULL, 'ticket', 'COMPLETED', 'VERIFIED', '{OWNER_ADMIN,MANAGER,SUPERVISOR,INSPECTOR}');

-- Prospect transitions
INSERT INTO status_transitions (tenant_id, entity_type, from_status, to_status, allowed_roles) VALUES
  (NULL, 'prospect', 'NEW', 'CONTACTED', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'prospect', 'NEW', 'QUALIFIED', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'prospect', 'NEW', 'UNQUALIFIED', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'prospect', 'CONTACTED', 'QUALIFIED', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'prospect', 'CONTACTED', 'UNQUALIFIED', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'prospect', 'CONTACTED', 'DEAD', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'prospect', 'QUALIFIED', 'CONVERTED', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'prospect', 'QUALIFIED', 'DEAD', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'prospect', 'UNQUALIFIED', 'CONTACTED', '{OWNER_ADMIN,MANAGER,SALES}'),
  (NULL, 'prospect', 'UNQUALIFIED', 'DEAD', '{OWNER_ADMIN,MANAGER,SALES}');
