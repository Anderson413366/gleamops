-- =================================================================
-- Audit Event Helper
-- SECURITY DEFINER bypasses RLS to write audit records.
-- Called from app code for critical state changes.
-- =================================================================

CREATE OR REPLACE FUNCTION write_audit_event(
  p_tenant_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_code TEXT,
  p_action TEXT,
  p_before JSONB DEFAULT NULL,
  p_after JSONB DEFAULT NULL,
  p_actor_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_actor UUID;
BEGIN
  -- Use provided actor or fall back to auth.uid()
  v_actor := COALESCE(p_actor_user_id, auth.uid());

  INSERT INTO audit_events (
    tenant_id, entity_type, entity_id, entity_code,
    action, before, after, actor_user_id
  ) VALUES (
    p_tenant_id, p_entity_type, p_entity_id, p_entity_code,
    p_action, p_before, p_after, v_actor
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Grant to authenticated users (they can write audit events for their actions)
GRANT EXECUTE ON FUNCTION write_audit_event TO authenticated;

-- =================================================================
-- Generic status change trigger with audit
-- Attach to tables that need status change auditing.
-- =================================================================

CREATE OR REPLACE FUNCTION audit_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Only fire if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM write_audit_event(
      NEW.tenant_id,
      TG_TABLE_NAME,
      NEW.id,
      NULL,  -- entity_code filled by caller or NULL
      'STATUS_CHANGE',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;
