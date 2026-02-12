-- =================================================================
-- Add QUEUED status + worker polling index for proposal sends
-- =================================================================

-- Index for worker poll: status=QUEUED, oldest first, skip locked
CREATE INDEX IF NOT EXISTS idx_proposal_sends_queue
  ON sales_proposal_sends(status, created_at)
  WHERE status = 'QUEUED';

-- Index for rate limiting: per-tenant hourly count
CREATE INDEX IF NOT EXISTS idx_proposal_sends_tenant_recent
  ON sales_proposal_sends(tenant_id, created_at)
  WHERE status IN ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'OPENED');

-- Change default status from SENDING to QUEUED so the API inserts QUEUED rows
-- The worker picks them up and transitions QUEUED → SENDING → SENT/FAILED
ALTER TABLE sales_proposal_sends ALTER COLUMN status SET DEFAULT 'QUEUED';

-- =================================================================
-- RPC: poll_queued_sends — atomic select + lock + transition
-- Uses FOR UPDATE SKIP LOCKED so multiple workers don't clash
-- =================================================================
CREATE OR REPLACE FUNCTION poll_queued_sends(p_batch_size INT DEFAULT 5)
RETURNS SETOF sales_proposal_sends
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids UUID[];
BEGIN
  -- Select + lock QUEUED rows, skip any already locked by another worker
  SELECT array_agg(id) INTO v_ids
  FROM (
    SELECT id
    FROM sales_proposal_sends
    WHERE status = 'QUEUED'
    ORDER BY created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  ) sub;

  IF v_ids IS NULL OR array_length(v_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Atomically transition to SENDING
  UPDATE sales_proposal_sends
  SET status = 'SENDING'
  WHERE id = ANY(v_ids);

  -- Return the rows
  RETURN QUERY
    SELECT *
    FROM sales_proposal_sends
    WHERE id = ANY(v_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION poll_queued_sends TO service_role;
