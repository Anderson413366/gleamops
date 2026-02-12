-- =================================================================
-- Milestone M: Timekeeping — Geofences, Time Events, Entries,
-- Exceptions, Alerts, Timesheets, Approvals
-- =================================================================

-- =================================================================
-- GEOFENCES (per-site)
-- =================================================================
CREATE TABLE geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  radius_meters INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),

  UNIQUE (site_id)
);

CREATE INDEX idx_geofences_site ON geofences(site_id) WHERE archived_at IS NULL;

CREATE TRIGGER trg_geofences_updated_at BEFORE UPDATE ON geofences FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_geofences_etag BEFORE UPDATE ON geofences FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
CREATE POLICY gf_select ON geofences FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY gf_insert ON geofences FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY gf_update ON geofences FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- TIME EVENTS (raw clock events)
-- CHECK_IN | CHECK_OUT | BREAK_START | BREAK_END | MANUAL_ADJUSTMENT
-- =================================================================
CREATE TABLE time_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  staff_id UUID NOT NULL REFERENCES staff(id),
  ticket_id UUID REFERENCES work_tickets(id),
  site_id UUID REFERENCES sites(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('CHECK_IN','CHECK_OUT','BREAK_START','BREAK_END','MANUAL_ADJUSTMENT')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  accuracy_meters DOUBLE PRECISION,
  is_within_geofence BOOLEAN,
  pin_used BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_time_events_staff ON time_events(staff_id, recorded_at DESC);
CREATE INDEX idx_time_events_ticket ON time_events(ticket_id) WHERE ticket_id IS NOT NULL;

CREATE TRIGGER trg_time_events_updated_at BEFORE UPDATE ON time_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_time_events_etag BEFORE UPDATE ON time_events FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE time_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY te_select ON time_events FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY te_insert ON time_events FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY te_update ON time_events FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- TIME ENTRIES (derived per-ticket records)
-- =================================================================
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  staff_id UUID NOT NULL REFERENCES staff(id),
  ticket_id UUID REFERENCES work_tickets(id),
  site_id UUID REFERENCES sites(id),
  check_in_event_id UUID REFERENCES time_events(id),
  check_out_event_id UUID REFERENCES time_events(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  break_minutes INT NOT NULL DEFAULT 0,
  duration_minutes INT, -- computed: end_at - start_at - break_minutes
  status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN | CLOSED | ADJUSTED
  approved_by UUID,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_time_entries_staff ON time_entries(staff_id, start_at DESC);
CREATE INDEX idx_time_entries_ticket ON time_entries(ticket_id) WHERE ticket_id IS NOT NULL;

CREATE TRIGGER trg_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_time_entries_etag BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY ten_select ON time_entries FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY ten_insert ON time_entries FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY ten_update ON time_entries FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- TIME EXCEPTIONS
-- =================================================================
CREATE TABLE time_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  time_entry_id UUID REFERENCES time_entries(id),
  time_event_id UUID REFERENCES time_events(id),
  staff_id UUID NOT NULL REFERENCES staff(id),
  exception_type TEXT NOT NULL CHECK (exception_type IN ('OUT_OF_GEOFENCE','LATE_ARRIVAL','EARLY_DEPARTURE','MISSING_CHECKOUT','MANUAL_OVERRIDE')),
  severity TEXT NOT NULL DEFAULT 'WARNING', -- INFO | WARNING | CRITICAL
  description TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_time_exceptions_staff ON time_exceptions(staff_id, created_at DESC);
CREATE INDEX idx_time_exceptions_unresolved ON time_exceptions(tenant_id) WHERE resolved_at IS NULL AND archived_at IS NULL;

CREATE TRIGGER trg_time_exceptions_updated_at BEFORE UPDATE ON time_exceptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_time_exceptions_etag BEFORE UPDATE ON time_exceptions FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE time_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tex_select ON time_exceptions FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY tex_insert ON time_exceptions FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY tex_update ON time_exceptions FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- ALERTS (supervisor notifications)
-- =================================================================
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  alert_type TEXT NOT NULL, -- TIME_EXCEPTION | MISSING_CHECKOUT | etc
  severity TEXT NOT NULL DEFAULT 'WARNING',
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT, -- time_exception | time_entry | work_ticket
  entity_id UUID,
  target_user_id UUID, -- supervisor to notify
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_user ON alerts(target_user_id, created_at DESC);
CREATE INDEX idx_alerts_unread ON alerts(target_user_id) WHERE read_at IS NULL;

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY al_select ON alerts FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY al_insert ON alerts FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY al_update ON alerts FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- TIMESHEETS (weekly per staff)
-- =================================================================
CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  staff_id UUID NOT NULL REFERENCES staff(id),
  week_start DATE NOT NULL, -- always Monday
  week_end DATE NOT NULL,   -- always Sunday
  total_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  regular_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  overtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  break_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  exception_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT | SUBMITTED | APPROVED | REJECTED
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),

  UNIQUE (staff_id, week_start)
);

CREATE INDEX idx_timesheets_staff ON timesheets(staff_id, week_start DESC);

CREATE TRIGGER trg_timesheets_updated_at BEFORE UPDATE ON timesheets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_timesheets_etag BEFORE UPDATE ON timesheets FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY ts_select ON timesheets FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY ts_insert ON timesheets FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY ts_update ON timesheets FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- TIMESHEET APPROVALS (approval workflow)
-- =================================================================
CREATE TABLE timesheet_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  timesheet_id UUID NOT NULL REFERENCES timesheets(id),
  action TEXT NOT NULL CHECK (action IN ('SUBMITTED','APPROVED','REJECTED','UNAPPROVED')),
  actor_user_id UUID NOT NULL,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_timesheet_approvals_ts ON timesheet_approvals(timesheet_id, created_at DESC);

ALTER TABLE timesheet_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY ta_select ON timesheet_approvals FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY ta_insert ON timesheet_approvals FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
