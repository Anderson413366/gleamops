-- =================================================================
-- RPC: set_ticket_status — server-side enforcement of asset gating
-- =================================================================

CREATE OR REPLACE FUNCTION set_ticket_status(
  p_ticket_id UUID,
  p_status    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket    RECORD;
  v_missing   INT;
  v_unreturned_keys INT;
  v_role      TEXT;
BEGIN
  -- Fetch ticket
  SELECT id, site_id, status INTO STRICT v_ticket
    FROM work_tickets
   WHERE id = p_ticket_id;

  -- Caller role (from JWT app_metadata)
  v_role := coalesce(
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
    'staff'
  );

  -- GATE 1: cannot move to IN_PROGRESS if required assets not checked out
  IF p_status = 'IN_PROGRESS' THEN
    SELECT count(*) INTO v_missing
      FROM site_asset_requirements sar
     WHERE sar.site_id = v_ticket.site_id
       AND sar.is_required = true
       AND sar.archived_at IS NULL
       AND NOT EXISTS (
         SELECT 1
           FROM ticket_asset_checkouts tac
          WHERE tac.ticket_id = p_ticket_id
            AND tac.requirement_id = sar.id
            AND tac.returned_at IS NULL
       );

    IF v_missing > 0 THEN
      RAISE EXCEPTION 'ASSET_GATE: % required asset(s) not checked out', v_missing
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- GATE 2: cannot move to COMPLETED if KEY assets still checked out (admin overrides)
  IF p_status = 'COMPLETED' AND v_role NOT IN ('owner', 'OWNER_ADMIN') THEN
    SELECT count(*) INTO v_unreturned_keys
      FROM site_asset_requirements sar
      JOIN ticket_asset_checkouts tac
        ON tac.requirement_id = sar.id
       AND tac.ticket_id = p_ticket_id
       AND tac.returned_at IS NULL
     WHERE sar.site_id = v_ticket.site_id
       AND sar.asset_type = 'KEY'
       AND sar.archived_at IS NULL;

    IF v_unreturned_keys > 0 THEN
      RAISE EXCEPTION 'KEY_RETURN_GATE: % key(s) not returned', v_unreturned_keys
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- Apply the status change
  UPDATE work_tickets
     SET status = p_status
   WHERE id = p_ticket_id;
END;
$$;

-- Grant to authenticated users (RLS on underlying tables still applies)
GRANT EXECUTE ON FUNCTION set_ticket_status(UUID, TEXT) TO authenticated;
