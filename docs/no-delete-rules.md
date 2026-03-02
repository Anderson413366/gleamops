# P0: No Hard Delete Checklist

## Why Hard Deletes Are Blocked

Migration `00050_prevent_hard_deletes.sql` installs a `BEFORE DELETE` trigger on **84 business tables** that raises an exception:

```
Hard deletes are not allowed on table <name>. Use soft delete (UPDATE archived_at) instead.
```

### Reasons

1. **Data continuity** — Historical records (bids, proposals, tickets) must persist for reporting
2. **Audit trail** — Regulatory and contractual requirements demand traceable data lifecycle
3. **Cascade safety** — A deleted client would orphan sites, jobs, tickets, and financial records
4. **Undo capability** — Soft-deleted records can be restored; hard deletes cannot

## How to Archive (Soft Delete)

All business tables have the `StandardColumns` pattern with three archive fields:

```sql
UPDATE clients
SET
  archived_at = NOW(),
  archived_by = auth.uid(),
  archive_reason = 'Client requested account closure — ticket #1234'
WHERE id = '<uuid>';
```

### Required Fields

| Column | Type | Purpose |
|--------|------|---------|
| `archived_at` | `TIMESTAMPTZ` | When the record was archived (NULL = active) |
| `archived_by` | `UUID` | Who archived it (FK to auth.users) |
| `archive_reason` | `TEXT` | Why it was archived (free text, required by policy) |

### UI Pattern

All list queries should filter out archived records:
```sql
SELECT * FROM clients WHERE archived_at IS NULL;
```

To show archived records (admin view):
```sql
SELECT * FROM clients WHERE archived_at IS NOT NULL ORDER BY archived_at DESC;
```

### Restoring an Archived Record

```sql
UPDATE clients
SET
  archived_at = NULL,
  archived_by = NULL,
  archive_reason = NULL
WHERE id = '<uuid>';
```

## Cascade Behavior

When archiving a parent entity, consider cascading the archive to children:

| Parent | Children to Archive |
|--------|-------------------|
| `clients` | `sites`, `contacts`, `sales_prospects`, `sales_opportunities` |
| `sites` | `site_jobs`, `site_supplies`, `site_asset_requirements`, `geofences` |
| `site_jobs` | `work_tickets`, `job_tasks`, `job_staff_assignments`, `recurrence_rules` |
| `work_tickets` | `ticket_assignments`, `ticket_checklists`, `ticket_photos`, `ticket_asset_checkouts` |
| `sales_bids` | `sales_bid_versions` (and all child config tables) |
| `staff` | `staff_certifications`, `training_completions`, `time_entries` |

Cascade is **not automatic** — the application layer must handle it. This is intentional to prevent accidental mass archival.

## Emergency Delete Procedure

In rare cases where a hard delete is required (e.g., GDPR right to erasure, test data cleanup):

### Prerequisites

1. Written justification (stored in `audit_events`)
2. Approval from OWNER_ADMIN role
3. `SUPABASE_SERVICE_ROLE_KEY` access

### Steps

```sql
-- 1. Log the intent
INSERT INTO audit_events (tenant_id, event_type, entity_type, entity_id, actor_id, metadata)
VALUES (
  '<tenant_id>',
  'EMERGENCY_DELETE',
  'client',
  '<entity_id>',
  '<actor_id>',
  '{"reason": "GDPR erasure request #5678", "approved_by": "<approver_id>"}'::jsonb
);

-- 2. Temporarily disable the trigger
ALTER TABLE clients DISABLE TRIGGER no_hard_delete;

-- 3. Delete the record (cascade children first)
DELETE FROM contacts WHERE client_id = '<entity_id>';
DELETE FROM sites WHERE client_id = '<entity_id>';
DELETE FROM clients WHERE id = '<entity_id>';

-- 4. Re-enable the trigger immediately
ALTER TABLE clients ENABLE TRIGGER no_hard_delete;
```

### Post-Delete

- Verify trigger is re-enabled: `SELECT tgname FROM pg_trigger WHERE tgrelid = 'clients'::regclass;`
- Confirm audit event was recorded
- Notify the requesting party of completion

## Protected Tables (84)

### CRM (3)
`clients`, `sites`, `contacts`

### Sales (34)
`sales_prospects`, `sales_prospect_contacts`, `sales_opportunities`, `sales_bids`, `sales_bid_versions`, `sales_bid_areas`, `sales_bid_area_tasks`, `sales_bid_schedule`, `sales_bid_labor_rates`, `sales_bid_burden`, `sales_bid_workload_results`, `sales_bid_pricing_results`, `sales_proposals`, `sales_proposal_pricing_options`, `sales_proposal_sends`, `sales_followup_sequences`, `sales_followup_sends`, `sales_bid_conversions`, `sales_conversion_events`, `sales_bid_sites`, `sales_bid_general_tasks`, `sales_production_rates`, `sales_bid_consumables`, `sales_bid_supply_allowances`, `sales_bid_supply_kits`, `sales_bid_equipment_plan_items`, `sales_bid_overhead`, `sales_bid_pricing_strategy`, `sales_proposal_attachments`, `sales_marketing_inserts`, `sales_proposal_marketing_inserts`, `sales_proposal_signatures`, `sales_followup_templates`

### Service DNA (4)
`tasks`, `task_production_rates`, `services`, `service_tasks`

### Operations (14)
`site_jobs`, `recurrence_rules`, `work_tickets`, `ticket_assignments`, `checklist_templates`, `checklist_template_items`, `ticket_checklists`, `ticket_checklist_items`, `ticket_photos`, `inspection_templates`, `inspection_template_items`, `inspections`, `inspection_items`, `inspection_issues`

### Workforce (7)
`staff`, `staff_positions`, `geofences`, `time_entries`, `time_exceptions`, `timesheets`, `timesheet_approvals`

### Inventory & Assets (11)
`supply_catalog`, `supply_kits`, `supply_kit_items`, `vehicles`, `key_inventory`, `equipment`, `equipment_assignments`, `vehicle_maintenance`, `supply_orders`, `inventory_counts`, `inventory_count_details`

### Vendors (1)
`subcontractors`

### Safety (4)
`staff_certifications`, `safety_documents`, `training_courses`, `training_completions`

### Site-level (3)
`site_supplies`, `site_asset_requirements`, `ticket_asset_checkouts`

### Job-level (3)
`job_logs`, `job_tasks`, `job_staff_assignments`

## Excluded Tables (Allow Deletes)

System/event tables where deletion is expected:

`tenants`, `tenant_memberships`, `lookups`, `status_transitions`, `system_sequences`, `audit_events`, `notifications`, `files`, `user_site_assignments`, `user_profiles`, `user_client_access`, `user_team_memberships`, `user_access_grants`, `sales_email_events`, `time_events`, `pay_rate_history`, `vehicle_checkouts`, `key_event_log`, `timeline_events`, `alerts`

## Testing Checklist

- [ ] Run migration `00050` on local Supabase
- [ ] Attempt `DELETE FROM clients WHERE id = '...'` — should raise exception
- [ ] Attempt `DELETE FROM lookups WHERE id = '...'` — should succeed (excluded)
- [ ] Verify `UPDATE clients SET archived_at = NOW() WHERE id = '...'` works
- [ ] Verify archived record is hidden from default queries
- [ ] Verify emergency delete procedure works with service_role
