# Appendix D: SQL migration plan (Supabase)

This is the recommended migration order to avoid FK dependency pain and to ship usable vertical slices early.

## Sprint 0 (foundation)
1. tenants + memberships + roles + helper functions
2. lookups seed
3. status_transitions seed
4. system_sequences + `next_code(prefix)` function
5. audit_events + notifications + files
6. shared triggers:
   - update timestamps
   - update version_etag
   - audit trigger

## Sprint 1 (CRM + Service DNA)
7. clients, sites, contacts
8. tasks, task_production_rates
9. services, service_tasks

## Sprint 2–3 (Pipeline)
10. sales_prospects + sales_prospect_contacts
11. sales_opportunities + competitor tables
12. sales_bids + sales_bid_versions
13. sales_bid_sites + sales_bid_areas + task tables
14. costing tables + workload/pricing results

## Sprint 4–5 (Proposals + send/track)
15. sales_proposals + pricing options + signatures
16. proposal sends + email events
17. follow-up templates/sequences/sends
18. rate_limits table

## Sprint 6 (Conversion)
19. sales_bid_conversions + conversion_events
20. convert function/edge endpoint

## Sprint 7–10 (Ops, schedule, execution)
21. site_jobs + recurrence_rules
22. work_tickets + assignments + history
23. checklist templates + instances + photos

## Sprint 11–14 (Timekeeping, quality, messaging)
24. geofences + time_events + exceptions
25. timesheets + approvals
26. inspections + offline sync tables
27. messaging tables

---

## Table template (recommended)

```sql
CREATE TABLE some_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  some_code TEXT UNIQUE NOT NULL CHECK (some_code ~ '^ABC-[0-9]{4,}$'),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL REFERENCES users(id),
  archive_reason TEXT NULL,

  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

ALTER TABLE some_table ENABLE ROW LEVEL SECURITY;

-- indexes
CREATE INDEX idx_some_table_active ON some_table(tenant_id, some_code) WHERE archived_at IS NULL;

-- triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON some_table
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_version_etag BEFORE UPDATE ON some_table
FOR EACH ROW EXECUTE FUNCTION set_version_etag();
```

## next_code(prefix) function (core)
- uses `system_sequences` table
- transaction-safe
- returns formatted codes (padding)

## Status transition validation (core)
- `validate_status_transition(entity_type, old_status, new_status)`
- used by triggers on status columns
