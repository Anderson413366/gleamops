-- ==========================================================================
-- 00057_ops_messaging_geofence.sql
-- P1/P2: Site PIN codes, messaging tables, geofence auto-evaluation
-- ==========================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ===========================================================================
-- 1. site_pin_codes — per-site PIN for kiosk/tablet check-in
-- ===========================================================================
CREATE TABLE site_pin_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  site_id       UUID NOT NULL REFERENCES sites(id),
  pin_hash      TEXT NOT NULL,           -- bcrypt hash of 4-6 digit PIN
  label         TEXT DEFAULT 'Main',     -- e.g. "Front Entrance", "Back Door"
  is_active     BOOLEAN NOT NULL DEFAULT true,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at   TIMESTAMPTZ,
  archived_by   UUID,
  archive_reason TEXT,
  version_etag  UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_site_pin_codes_site   ON site_pin_codes(site_id) WHERE archived_at IS NULL AND is_active = true;
CREATE INDEX idx_site_pin_codes_tenant ON site_pin_codes(tenant_id) WHERE archived_at IS NULL;

CREATE TRIGGER trg_site_pin_codes_updated_at BEFORE UPDATE ON site_pin_codes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_site_pin_codes_etag       BEFORE UPDATE ON site_pin_codes FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE site_pin_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY spc_select ON site_pin_codes FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY spc_insert ON site_pin_codes FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY spc_update ON site_pin_codes FOR UPDATE USING (tenant_id = current_tenant_id());

-- ===========================================================================
-- 2. message_threads — conversation threads
-- ===========================================================================
CREATE TABLE message_threads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  subject       TEXT NOT NULL,
  thread_type   TEXT NOT NULL DEFAULT 'DIRECT'
                CHECK (thread_type IN ('DIRECT','GROUP','TICKET_CONTEXT')),
  ticket_id     UUID REFERENCES work_tickets(id),
  created_by    UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at   TIMESTAMPTZ
);

CREATE INDEX idx_message_threads_tenant  ON message_threads(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_message_threads_ticket  ON message_threads(ticket_id) WHERE ticket_id IS NOT NULL;

CREATE TRIGGER trg_message_threads_updated_at BEFORE UPDATE ON message_threads FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY mt_select ON message_threads FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY mt_insert ON message_threads FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY mt_update ON message_threads FOR UPDATE USING (tenant_id = current_tenant_id());

-- ===========================================================================
-- 3. message_thread_members — who's in the thread
-- ===========================================================================
CREATE TABLE message_thread_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  thread_id     UUID NOT NULL REFERENCES message_threads(id),
  user_id       UUID NOT NULL,
  role          TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('MEMBER','ADMIN')),
  last_read_at  TIMESTAMPTZ,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (thread_id, user_id)
);

CREATE INDEX idx_mtm_thread ON message_thread_members(thread_id);
CREATE INDEX idx_mtm_user   ON message_thread_members(user_id);

ALTER TABLE message_thread_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY mtm_select ON message_thread_members FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY mtm_insert ON message_thread_members FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY mtm_update ON message_thread_members FOR UPDATE USING (tenant_id = current_tenant_id());

-- ===========================================================================
-- 4. messages — individual messages
-- ===========================================================================
CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  thread_id     UUID NOT NULL REFERENCES message_threads(id),
  sender_id     UUID NOT NULL,
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at     TIMESTAMPTZ,
  archived_at   TIMESTAMPTZ
);

CREATE INDEX idx_messages_thread ON messages(thread_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY msg_select ON messages FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY msg_insert ON messages FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY msg_update ON messages FOR UPDATE USING (tenant_id = current_tenant_id());

-- ===========================================================================
-- 5. fn_verify_site_pin — RPC for PIN verification (server-side hash compare)
-- Uses pgcrypto crypt() to compare plaintext PIN against bcrypt hash.
-- ===========================================================================
CREATE OR REPLACE FUNCTION fn_verify_site_pin(p_site_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM site_pin_codes
    WHERE site_id = p_site_id
      AND is_active = true
      AND archived_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
      AND pin_hash = extensions.crypt(p_pin, pin_hash)
  );
$$;

-- ===========================================================================
-- 6. fn_evaluate_geofence — trigger function
-- Haversine formula to compute distance from nearest geofence.
-- Updates is_within_geofence on the new time_event.
-- If outside geofence on CHECK_IN/CHECK_OUT: creates time_exception + alert.
-- ===========================================================================
CREATE OR REPLACE FUNCTION fn_evaluate_geofence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_geofence      RECORD;
  v_site_id       UUID;
  v_distance_m    DOUBLE PRECISION;
  v_within        BOOLEAN;
  v_staff_name    TEXT;
  v_site_name     TEXT;
  v_supervisor_id UUID;
BEGIN
  -- Skip if no coordinates provided (manual adjustments, etc.)
  IF NEW.lat IS NULL OR NEW.lng IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine site_id: use event's site_id, or look it up from the ticket
  v_site_id := NEW.site_id;
  IF v_site_id IS NULL AND NEW.ticket_id IS NOT NULL THEN
    SELECT wt.site_id INTO v_site_id
    FROM work_tickets wt
    WHERE wt.id = NEW.ticket_id;
  END IF;

  -- No site → cannot evaluate geofence
  IF v_site_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the active geofence for this site
  SELECT * INTO v_geofence
  FROM geofences
  WHERE site_id = v_site_id
    AND is_active = true
    AND archived_at IS NULL
  LIMIT 1;

  -- No geofence configured → skip
  IF v_geofence IS NULL THEN
    RETURN NEW;
  END IF;

  -- Haversine distance in meters
  -- R = 6371000 (Earth radius in meters)
  v_distance_m := 2 * 6371000 * asin(sqrt(
    sin(radians(NEW.lat - v_geofence.center_lat) / 2) ^ 2 +
    cos(radians(v_geofence.center_lat)) * cos(radians(NEW.lat)) *
    sin(radians(NEW.lng - v_geofence.center_lng) / 2) ^ 2
  ));

  v_within := (v_distance_m <= v_geofence.radius_meters);

  -- Update the event row
  NEW.is_within_geofence := v_within;

  -- If outside geofence on CHECK_IN or CHECK_OUT, create exception + alert
  IF NOT v_within AND NEW.event_type IN ('CHECK_IN', 'CHECK_OUT') THEN
    -- Look up staff name
    SELECT full_name INTO v_staff_name
    FROM staff WHERE id = NEW.staff_id;

    -- Look up site name + supervisor
    SELECT s.name, s.supervisor_id INTO v_site_name, v_supervisor_id
    FROM sites s WHERE s.id = v_site_id;

    -- Create time_exception
    INSERT INTO time_exceptions (
      tenant_id, time_event_id, staff_id, exception_type, severity, description
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      NEW.staff_id,
      'OUT_OF_GEOFENCE',
      'WARNING',
      format('%s %s %.0fm outside geofence at %s',
        coalesce(v_staff_name, 'Unknown staff'),
        NEW.event_type,
        v_distance_m,
        coalesce(v_site_name, 'Unknown site')
      )
    );

    -- Create alert for site supervisor (if one exists)
    IF v_supervisor_id IS NOT NULL THEN
      INSERT INTO alerts (
        tenant_id, alert_type, severity, title, body,
        entity_type, entity_id, target_user_id
      ) VALUES (
        NEW.tenant_id,
        'TIME_EXCEPTION',
        'WARNING',
        format('Geofence violation: %s', coalesce(v_staff_name, 'Unknown')),
        format('%s recorded a %s %.0fm outside the geofence at %s.',
          coalesce(v_staff_name, 'Unknown staff'),
          lower(replace(NEW.event_type, '_', ' ')),
          v_distance_m,
          coalesce(v_site_name, 'Unknown site')
        ),
        'time_exception',
        NEW.id,
        v_supervisor_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Use BEFORE INSERT so we can modify NEW.is_within_geofence
CREATE TRIGGER trg_time_event_geofence
  BEFORE INSERT ON time_events
  FOR EACH ROW EXECUTE FUNCTION fn_evaluate_geofence();

-- ===========================================================================
-- Notify PostgREST schema cache
-- ===========================================================================
NOTIFY pgrst, 'reload schema';
