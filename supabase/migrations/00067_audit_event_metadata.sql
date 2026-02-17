-- =================================================================
-- Audit metadata expansion for one-shot Anderson release
-- Adds request/device context while keeping compatibility.
-- =================================================================

ALTER TABLE audit_events
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS request_path TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS geo_lat NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS geo_long NUMERIC(10, 6);

CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_path_created ON audit_events(tenant_id, request_path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_actor_created ON audit_events(tenant_id, actor_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION write_audit_event(
  p_tenant_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_code TEXT,
  p_action TEXT,
  p_before JSONB DEFAULT NULL,
  p_after JSONB DEFAULT NULL,
  p_actor_user_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_request_path TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_id TEXT DEFAULT NULL,
  p_geo_lat NUMERIC DEFAULT NULL,
  p_geo_long NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_actor UUID;
BEGIN
  v_actor := COALESCE(p_actor_user_id, auth.uid());

  INSERT INTO audit_events (
    tenant_id,
    entity_type,
    entity_id,
    entity_code,
    action,
    before,
    after,
    actor_user_id,
    reason,
    request_path,
    ip_address,
    user_agent,
    device_id,
    geo_lat,
    geo_long
  ) VALUES (
    p_tenant_id,
    p_entity_type,
    p_entity_id,
    p_entity_code,
    p_action,
    p_before,
    p_after,
    v_actor,
    p_reason,
    p_request_path,
    p_ip_address,
    p_user_agent,
    p_device_id,
    p_geo_lat,
    p_geo_long
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION write_audit_event TO authenticated;
GRANT EXECUTE ON FUNCTION write_audit_event TO service_role;

CREATE OR REPLACE VIEW audit_log AS
SELECT
  ae.id AS audit_id,
  ae.tenant_id AS org_id,
  ae.actor_user_id,
  ae.action,
  ae.entity_type,
  ae.entity_id,
  ae.before AS before_json,
  ae.after AS after_json,
  ae.ip_address,
  ae.request_path,
  ae.reason,
  ae.user_agent,
  ae.device_id,
  ae.geo_lat,
  ae.geo_long,
  ae.created_at
FROM audit_events ae;
