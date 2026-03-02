# Security and RLS (non-negotiable)

Security is not “later.” In a Supabase/Postgres world, RLS is the product.

## 1) Tenancy model (single DB, many tenants)

### Required tables
- `tenants`
- `tenant_memberships`
- `user_site_assignments` (site-scoped visibility)

### Required JWT claim
Store `tenant_id` in JWT claims (or always resolve via `tenant_memberships`).

## 2) Role model (minimum)
- OWNER_ADMIN
- MANAGER
- SUPERVISOR
- CLEANER
- INSPECTOR
- SALES (optional)

RBAC decides **what you can do**.
Site scope decides **where you can do it**.

## 3) RLS policy patterns

### Pattern A: Tenant isolation (baseline)
Every table with `tenant_id` must have:

```sql
CREATE POLICY tenant_isolation_select ON some_table
FOR SELECT
USING (
  tenant_id = current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id'
);
```

In Supabase, you may instead join `tenant_memberships` with `auth.uid()` for more explicit control.

### Pattern B: Owner/team visibility (Pipeline objects)
Prospects/opportunities/bids/proposals generally follow:
- owner can see
- sales managers can see
- teammates in same team can see (optional)

### Pattern C: Site-scoped visibility (Ops objects)
Tickets/timekeeping/inspections follow:
- users see tickets for sites they are assigned to
- plus managers/admins

### Pattern D: Admin-only write operations
Lookups, status transitions, and system config: admin-only.

## 4) Example policies (important tables)

### Prospects (sales_prospects)

```sql
ALTER TABLE sales_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY sales_prospects_select ON sales_prospects
FOR SELECT
USING (
  tenant_id = current_tenant_id()
  AND (
    owner_user_id = auth.uid()
    OR has_role(auth.uid(), 'OWNER_ADMIN')
    OR has_role(auth.uid(), 'MANAGER')
  )
);

CREATE POLICY sales_prospects_insert ON sales_prospects
FOR INSERT
WITH CHECK (
  tenant_id = current_tenant_id()
  AND auth.uid() IS NOT NULL
);

CREATE POLICY sales_prospects_update ON sales_prospects
FOR UPDATE
USING (
  tenant_id = current_tenant_id()
  AND (
    owner_user_id = auth.uid()
    OR has_role(auth.uid(), 'OWNER_ADMIN')
    OR has_role(auth.uid(), 'MANAGER')
  )
);
```

### Work tickets (work_tickets)
Tickets are site-scoped.

```sql
ALTER TABLE work_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_tickets_select ON work_tickets
FOR SELECT
USING (
  tenant_id = current_tenant_id()
  AND (
    has_role(auth.uid(), 'OWNER_ADMIN')
    OR has_role(auth.uid(), 'MANAGER')
    OR EXISTS (
      SELECT 1
      FROM user_site_assignments usa
      WHERE usa.tenant_id = work_tickets.tenant_id
        AND usa.user_id = auth.uid()
        AND usa.site_id = work_tickets.site_id
    )
  )
);
```

### Messages
A user can only see threads they are a member of.

```sql
CREATE POLICY messages_select ON messages
FOR SELECT
USING (
  tenant_id = current_tenant_id()
  AND EXISTS (
    SELECT 1 FROM message_thread_members mtm
    WHERE mtm.thread_id = messages.thread_id
      AND mtm.user_id = auth.uid()
  )
);
```

### Files / Storage metadata
Files must be private by default. Return signed URLs from server endpoints.

## 5) Supporting helper functions (recommended)
- `current_tenant_id()`
- `has_role(user_id, role_code)`
- `user_can_access_site(user_id, site_id)`

## 6) Don’t allow hard deletes
Disable deletes at API layer and DB layer.
Use archived columns and partial indexes (`WHERE archived_at IS NULL`).

## 7) Security test checklist
- cross-tenant reads impossible
- supervisor cannot see unassigned sites
- cleaner cannot modify pricing
- admin-only config locked down
- webhook endpoints verify signatures and are idempotent
