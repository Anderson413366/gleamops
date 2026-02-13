-- =================================================================
-- RPC: poll_scheduled_followups — atomic claim for follow-up sends
--
-- Selects up to p_batch_size rows from sales_followup_sends
-- WHERE status = 'SCHEDULED' AND scheduled_at <= now(),
-- locks them with FOR UPDATE SKIP LOCKED to prevent duplicate
-- pickup by multiple workers, then transitions them to 'SENDING'.
-- =================================================================

CREATE OR REPLACE FUNCTION poll_scheduled_followups(p_batch_size INT DEFAULT 5)
RETURNS SETOF sales_followup_sends
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids UUID[];
BEGIN
  -- Select + lock SCHEDULED rows whose scheduled_at has passed,
  -- skip any already locked by another worker
  SELECT array_agg(id) INTO v_ids
  FROM (
    SELECT id
    FROM sales_followup_sends
    WHERE status = 'SCHEDULED'
      AND scheduled_at <= now()
    ORDER BY scheduled_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  ) sub;

  IF v_ids IS NULL OR array_length(v_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Atomically transition to SENDING
  UPDATE sales_followup_sends
  SET status = 'SENDING',
      updated_at = now()
  WHERE id = ANY(v_ids);

  -- Return the claimed rows (now in SENDING state)
  RETURN QUERY
    SELECT *
    FROM sales_followup_sends
    WHERE id = ANY(v_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION poll_scheduled_followups TO authenticated;
GRANT EXECUTE ON FUNCTION poll_scheduled_followups TO service_role;
