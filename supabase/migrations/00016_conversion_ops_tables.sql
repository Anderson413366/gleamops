-- =================================================================
-- Milestone G: Won Conversion + Operations (Service Plans, Tickets)
-- conversions, conversion_events, site_jobs, recurrence_rules,
-- work_tickets, ticket_assignments
-- =================================================================

-- =================================================================
-- SALES BID CONVERSIONS (idempotent — one conversion per bid version)
-- =================================================================
CREATE TABLE sales_bid_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  bid_version_id UUID NOT NULL REFERENCES sales_bid_versions(id),
  site_job_id UUID NULL, -- FK added after site_jobs is created
  conversion_mode TEXT NOT NULL DEFAULT 'FULL', -- FULL | DRY_RUN
  is_dry_run BOOLEAN NOT NULL DEFAULT false,
  converted_by UUID NOT NULL,
  converted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),

  -- Prevent double conversion
  UNIQUE (bid_version_id, conversion_mode)
);

CREATE INDEX idx_conversions_tenant ON sales_bid_conversions(tenant_id);
CREATE INDEX idx_conversions_bid_version ON sales_bid_conversions(bid_version_id);

CREATE TRIGGER trg_conversions_updated_at BEFORE UPDATE ON sales_bid_conversions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_conversions_etag BEFORE UPDATE ON sales_bid_conversions FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_bid_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY conv_select ON sales_bid_conversions FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY conv_insert ON sales_bid_conversions FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SALES']));
CREATE POLICY conv_update ON sales_bid_conversions FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- SALES CONVERSION EVENTS (audit stream)
-- =================================================================
CREATE TABLE sales_conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  conversion_id UUID NOT NULL REFERENCES sales_bid_conversions(id),
  step TEXT NOT NULL, -- VALIDATE | CREATE_JOB | CREATE_RECURRENCE | GENERATE_TICKETS | COMPLETE
  status TEXT NOT NULL DEFAULT 'SUCCESS', -- SUCCESS | FAILED
  entity_type TEXT,
  entity_id UUID,
  detail JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversion_events_conversion ON sales_conversion_events(conversion_id);

ALTER TABLE sales_conversion_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY ce_select ON sales_conversion_events FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY ce_insert ON sales_conversion_events FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

-- =================================================================
-- SITE JOBS (the recurring contract/service plan)
-- =================================================================
CREATE TABLE site_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  job_code TEXT UNIQUE NOT NULL CHECK (job_code ~ '^JOB-[0-9]{4,}$'),
  site_id UUID NOT NULL REFERENCES sites(id),
  source_bid_id UUID REFERENCES sales_bids(id),
  source_conversion_id UUID, -- FK added below
  billing_amount NUMERIC,
  frequency TEXT NOT NULL DEFAULT 'WEEKLY',
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_site_jobs_tenant_active ON site_jobs(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_site_jobs_site ON site_jobs(site_id);
CREATE INDEX idx_site_jobs_status ON site_jobs(tenant_id, status);
CREATE INDEX idx_site_jobs_code ON site_jobs(job_code);

CREATE TRIGGER trg_site_jobs_updated_at BEFORE UPDATE ON site_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_site_jobs_etag BEFORE UPDATE ON site_jobs FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE site_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY sj_select ON site_jobs FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY sj_insert ON site_jobs FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SALES']));
CREATE POLICY sj_update ON site_jobs FOR UPDATE USING (tenant_id = current_tenant_id());

-- Add FK from conversions to site_jobs
ALTER TABLE sales_bid_conversions ADD CONSTRAINT fk_conv_site_job FOREIGN KEY (site_job_id) REFERENCES site_jobs(id);
ALTER TABLE site_jobs ADD CONSTRAINT fk_sj_conversion FOREIGN KEY (source_conversion_id) REFERENCES sales_bid_conversions(id);

-- =================================================================
-- RECURRENCE RULES
-- =================================================================
CREATE TABLE recurrence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_job_id UUID NOT NULL REFERENCES site_jobs(id),
  days_of_week INT[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=Sun..6=Sat, default Mon-Fri
  start_time TIME,
  end_time TIME,
  start_date DATE NOT NULL,
  end_date DATE,
  exceptions TEXT[] NOT NULL DEFAULT '{}', -- dates to skip (ISO format)

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_recurrence_job ON recurrence_rules(site_job_id);

CREATE TRIGGER trg_recurrence_updated_at BEFORE UPDATE ON recurrence_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_recurrence_etag BEFORE UPDATE ON recurrence_rules FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE recurrence_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY rr_select ON recurrence_rules FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY rr_insert ON recurrence_rules FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY rr_update ON recurrence_rules FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- WORK TICKETS (the nucleus — schedule, execution, tracking)
-- =================================================================
CREATE TABLE work_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  ticket_code TEXT UNIQUE NOT NULL CHECK (ticket_code ~ '^TKT-[0-9]{4,}$'),
  job_id UUID NOT NULL REFERENCES site_jobs(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  scheduled_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status TEXT NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED | IN_PROGRESS | COMPLETED | VERIFIED | CANCELLED

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),

  -- Idempotent: one ticket per job per date
  UNIQUE (job_id, scheduled_date)
);

CREATE INDEX idx_tickets_tenant_active ON work_tickets(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_tickets_job ON work_tickets(job_id);
CREATE INDEX idx_tickets_site ON work_tickets(site_id);
CREATE INDEX idx_tickets_date ON work_tickets(scheduled_date);
CREATE INDEX idx_tickets_status ON work_tickets(tenant_id, status, scheduled_date);

CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON work_tickets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tickets_etag BEFORE UPDATE ON work_tickets FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE work_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY wt_select ON work_tickets FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY wt_insert ON work_tickets FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY wt_update ON work_tickets FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- TICKET ASSIGNMENTS (staff assigned to a ticket)
-- =================================================================
CREATE TABLE ticket_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  ticket_id UUID NOT NULL REFERENCES work_tickets(id),
  staff_id UUID NOT NULL REFERENCES staff(id),
  role TEXT, -- LEAD | CLEANER

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_ticket_assignments_ticket ON ticket_assignments(ticket_id);
CREATE INDEX idx_ticket_assignments_staff ON ticket_assignments(staff_id);

CREATE TRIGGER trg_ticket_assignments_updated_at BEFORE UPDATE ON ticket_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ticket_assignments_etag BEFORE UPDATE ON ticket_assignments FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE ticket_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY ta_select ON ticket_assignments FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY ta_insert ON ticket_assignments FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY ta_update ON ticket_assignments FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- SEED: Sequence prefixes for jobs and tickets
-- =================================================================
INSERT INTO system_sequences (tenant_id, prefix, current_value)
SELECT t.id, prefix, 0
FROM tenants t
CROSS JOIN (VALUES ('JOB'), ('TKT')) AS prefixes(prefix)
WHERE t.tenant_code = 'TNT-0001'
ON CONFLICT (tenant_id, prefix) DO NOTHING;
