# Search, indexing, and performance

Performance is a feature. Especially for schedule views.

## 1) Indexing principles
- Always include `tenant_id` in composite indexes
- Always use partial indexes for live rows:
  - `WHERE archived_at IS NULL`

## 2) Pipeline indexes (minimum)

```sql
-- Prospects
CREATE INDEX idx_prospects_status ON sales_prospects(tenant_id, prospect_status_code)
  WHERE archived_at IS NULL;

CREATE INDEX idx_prospects_owner ON sales_prospects(tenant_id, owner_user_id)
  WHERE archived_at IS NULL;

-- Opportunities
CREATE INDEX idx_opportunities_stage ON sales_opportunities(tenant_id, stage_code)
  WHERE archived_at IS NULL;

CREATE INDEX idx_opportunities_close_date ON sales_opportunities(tenant_id, close_date_target)
  WHERE archived_at IS NULL AND stage_code NOT IN ('WON','LOST');
```

## 3) Bid wizard performance indexes

```sql
CREATE INDEX idx_bid_versions_bid ON sales_bid_versions(tenant_id, bid_code);
CREATE INDEX idx_bid_areas_version ON sales_bid_areas(tenant_id, bid_version_id);
CREATE INDEX idx_bid_area_tasks_area ON sales_bid_area_tasks(tenant_id, bid_area_id);
```

## 4) Schedule performance (tickets)

```sql
CREATE INDEX idx_tickets_range ON work_tickets(tenant_id, scheduled_start_at);
CREATE INDEX idx_tickets_assignee_range ON work_tickets(tenant_id, primary_assignee_id, scheduled_start_at);
CREATE INDEX idx_tickets_site_range ON work_tickets(tenant_id, site_id, scheduled_start_at);
```

Design rule:
- list endpoints return only what schedule needs (id/code/site/time/status/assignee)
- detail drawer loads checklist/photos/time entries on demand

## 5) High-write tables
Email events and time events can get large:
- keep indexes minimal and targeted
- consider partitioning later if volume demands

```sql
CREATE INDEX idx_email_events_provider_id ON sales_email_events(provider_message_id);
CREATE INDEX idx_email_events_ts ON sales_email_events(event_timestamp DESC);
```

## 6) Full-text search (tsvector)

Prospects:
- company_name + notes

Clients:
- name + billing fields

```sql
ALTER TABLE sales_prospects ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(company_name,'')), 'A') ||
  setweight(to_tsvector('english', coalesce(notes,'')), 'B')
) STORED;

CREATE INDEX idx_prospects_search ON sales_prospects USING gin(search_vector);
```

## 7) Duplicate detection (pg_trgm)
Use trigram similarity for company_name:
- return warnings, don’t hard-block creation.

## 8) Caching
Start without caching.
Add caching only for:
- dashboard aggregations
- heavy reports
Use Postgres materialized views or a simple cache table first.
