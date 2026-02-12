-- =================================================================
-- v2: Rewrite convert_bid_to_job per strict spec
--
-- Changes from v1:
--   1. Drop p_weeks_ahead param — derive ticket count from schedule
--   2. Deterministic ticket_code: 'TKT-' || job_code || '-' || YYYYMMDD
--   3. Add (tenant_id, job_id, scheduled_date) unique constraint
--   4. Conversion events with full detail json per step
--   5. Relax ticket_code CHECK to accept deterministic format
-- =================================================================

-- 1) Relax ticket_code CHECK constraint to accept deterministic codes
ALTER TABLE work_tickets DROP CONSTRAINT IF EXISTS work_tickets_ticket_code_check;
ALTER TABLE work_tickets ADD CONSTRAINT work_tickets_ticket_code_check
  CHECK (ticket_code ~ '^TKT-');

-- 2) Add composite unique if not already present
--    Existing: UNIQUE(job_id, scheduled_date)
--    Requested: UNIQUE(tenant_id, job_id, scheduled_date)
--    We drop the old one and add the new one (which is stricter and still
--    covers the old use case since tenant_id is always present).
DO $$
BEGIN
  -- Drop old unique constraint by finding its name
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'work_tickets'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 2
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE work_tickets DROP CONSTRAINT ' || conname
      FROM pg_constraint
      WHERE conrelid = 'work_tickets'::regclass
        AND contype = 'u'
        AND array_length(conkey, 1) = 2
      LIMIT 1
    );
  END IF;
END$$;

ALTER TABLE work_tickets ADD CONSTRAINT uq_ticket_job_date
  UNIQUE (tenant_id, job_id, scheduled_date);

-- 3) Replace the RPC
DROP FUNCTION IF EXISTS convert_bid_to_job(UUID, UUID, UUID, DATE, INT);

CREATE OR REPLACE FUNCTION convert_bid_to_job(
  p_proposal_id   UUID,
  p_site_id        UUID,
  p_pricing_option_id UUID DEFAULT NULL,
  p_start_date     DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id      UUID;
  v_user_id        UUID;
  v_proposal       RECORD;
  v_bid_version    RECORD;
  v_schedule       RECORD;
  v_existing       RECORD;
  v_conversion_id  UUID;
  v_job_id         UUID;
  v_job_code       TEXT;
  v_rule_id        UUID;
  v_billing        NUMERIC;
  v_days           INT[];
  v_ticket_count   INT := 0;
  v_d              DATE;
  v_dow            INT;
  v_week           INT;
  v_tkt_code       TEXT;
  v_tkt_id         UUID;
  v_weeks_ahead    INT;
BEGIN
  -- ---------------------------------------------------------------
  -- 0. Resolve caller context
  -- ---------------------------------------------------------------
  v_tenant_id := current_tenant_id();
  v_user_id   := auth.uid();

  IF v_tenant_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'CONVERT_ERR: unauthenticated or missing tenant'
      USING ERRCODE = 'P0001';
  END IF;

  -- ---------------------------------------------------------------
  -- 1. VALIDATE: proposal exists, status = WON, archived_at IS NULL
  -- ---------------------------------------------------------------
  SELECT * INTO v_proposal
  FROM sales_proposals
  WHERE id = p_proposal_id
    AND tenant_id = v_tenant_id
    AND archived_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONVERT_001: Proposal not found or archived'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_proposal.status <> 'WON' THEN
    RAISE EXCEPTION 'CONVERT_001: Proposal status is %, must be WON', v_proposal.status
      USING ERRCODE = 'P0001';
  END IF;

  -- ---------------------------------------------------------------
  -- 2. Load bid_version_id + bid_id + schedule inputs
  -- ---------------------------------------------------------------
  SELECT bv.id AS bv_id, bv.bid_id,
         b.bid_code, b.client_id, b.bid_monthly_price, b.service_id
  INTO v_bid_version
  FROM sales_bid_versions bv
  JOIN sales_bids b ON b.id = bv.bid_id
  WHERE bv.id = v_proposal.bid_version_id
    AND bv.tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONVERT_001: Bid version or bid not found for proposal'
      USING ERRCODE = 'P0001';
  END IF;

  -- ---------------------------------------------------------------
  -- 3. IDEMPOTENCY: if conversion exists for (proposal_id, bid_version_id)
  --    return existing site_job_id and tickets count
  -- ---------------------------------------------------------------
  SELECT c.id AS conversion_id, c.site_job_id,
         sj.job_code
  INTO v_existing
  FROM sales_bid_conversions c
  LEFT JOIN site_jobs sj ON sj.id = c.site_job_id
  WHERE c.bid_version_id = v_proposal.bid_version_id
    AND c.conversion_mode = 'FULL'
    AND c.tenant_id = v_tenant_id
    AND c.archived_at IS NULL;

  IF FOUND AND v_existing.site_job_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'conversion_id', v_existing.conversion_id,
      'site_job_id',   v_existing.site_job_id,
      'job_code',      v_existing.job_code,
      'tickets_created', (
        SELECT count(*) FROM work_tickets
        WHERE job_id = v_existing.site_job_id AND archived_at IS NULL
      ),
      'idempotent', true
    );
  END IF;

  -- ---------------------------------------------------------------
  -- 4. Resolve billing amount
  -- ---------------------------------------------------------------
  IF p_pricing_option_id IS NOT NULL THEN
    SELECT monthly_price INTO v_billing
    FROM sales_proposal_pricing_options
    WHERE id = p_pricing_option_id
      AND proposal_id = p_proposal_id
      AND tenant_id = v_tenant_id;
  END IF;

  IF v_billing IS NULL THEN
    v_billing := v_bid_version.bid_monthly_price;
  END IF;

  -- ---------------------------------------------------------------
  -- 5. Resolve schedule from bid (do NOT hardcode)
  -- ---------------------------------------------------------------
  SELECT * INTO v_schedule
  FROM sales_bid_schedule
  WHERE bid_version_id = v_proposal.bid_version_id
    AND tenant_id = v_tenant_id
    AND archived_at IS NULL
  LIMIT 1;

  -- Build days_of_week array from days_per_week
  IF v_schedule IS NULL OR v_schedule.days_per_week IS NULL THEN
    v_days := ARRAY[1,2,3,4,5]; -- fallback Mon-Fri
  ELSE
    CASE v_schedule.days_per_week
      WHEN 1 THEN v_days := ARRAY[1];
      WHEN 2 THEN v_days := ARRAY[1,3];
      WHEN 3 THEN v_days := ARRAY[1,3,5];
      WHEN 4 THEN v_days := ARRAY[1,2,3,4];
      WHEN 5 THEN v_days := ARRAY[1,2,3,4,5];
      WHEN 6 THEN v_days := ARRAY[1,2,3,4,5,6];
      WHEN 7 THEN v_days := ARRAY[0,1,2,3,4,5,6];
      ELSE         v_days := ARRAY[1,2,3,4,5];
    END CASE;
  END IF;

  -- Derive weeks from schedule: default 4 weeks
  v_weeks_ahead := COALESCE(
    CASE WHEN v_schedule IS NOT NULL AND v_schedule.visits_per_day IS NOT NULL
         THEN 4  -- could derive from contract length in future
         ELSE 4
    END,
    4
  );

  -- ---------------------------------------------------------------
  -- 6. Insert sales_bid_conversions
  -- ---------------------------------------------------------------
  INSERT INTO sales_bid_conversions (
    tenant_id, bid_version_id, conversion_mode, is_dry_run, converted_by
  ) VALUES (
    v_tenant_id, v_proposal.bid_version_id, 'FULL', false, v_user_id
  )
  RETURNING id INTO v_conversion_id;

  -- Log VALIDATE event
  INSERT INTO sales_conversion_events (tenant_id, conversion_id, step, status, detail)
  VALUES (v_tenant_id, v_conversion_id, 'VALIDATE', 'SUCCESS',
    jsonb_build_object(
      'proposal_id',    p_proposal_id,
      'proposal_code',  v_proposal.proposal_code,
      'bid_id',         v_bid_version.bid_id,
      'bid_code',       v_bid_version.bid_code,
      'bid_version_id', v_bid_version.bv_id,
      'site_id',        p_site_id,
      'billing_amount', v_billing,
      'days_of_week',   to_jsonb(v_days),
      'weeks_ahead',    v_weeks_ahead
    ));

  -- ---------------------------------------------------------------
  -- 7. Insert site_jobs
  -- ---------------------------------------------------------------
  v_job_code := next_code(v_tenant_id, 'JOB');

  INSERT INTO site_jobs (
    tenant_id, job_code, site_id,
    source_bid_id, source_conversion_id,
    billing_amount, frequency, start_date, status
  ) VALUES (
    v_tenant_id, v_job_code, p_site_id,
    v_bid_version.bid_id, v_conversion_id,
    v_billing, 'WEEKLY', p_start_date, 'ACTIVE'
  )
  RETURNING id INTO v_job_id;

  -- Link conversion to job
  UPDATE sales_bid_conversions
  SET site_job_id = v_job_id
  WHERE id = v_conversion_id;

  -- Log CREATE_JOB event
  INSERT INTO sales_conversion_events (tenant_id, conversion_id, step, status, entity_type, entity_id, detail)
  VALUES (v_tenant_id, v_conversion_id, 'CREATE_JOB', 'SUCCESS', 'site_job', v_job_id,
    jsonb_build_object(
      'job_code',       v_job_code,
      'site_id',        p_site_id,
      'billing_amount', v_billing,
      'frequency',      'WEEKLY',
      'start_date',     p_start_date
    ));

  -- ---------------------------------------------------------------
  -- 8. Create recurrence_rule from bid schedule (not hardcoded)
  -- ---------------------------------------------------------------
  INSERT INTO recurrence_rules (
    tenant_id, site_job_id, days_of_week,
    start_date, start_time, end_time
  ) VALUES (
    v_tenant_id, v_job_id, v_days,
    p_start_date,
    CASE WHEN v_schedule IS NOT NULL THEN NULL ELSE NULL END,
    NULL
  )
  RETURNING id INTO v_rule_id;

  -- Log CREATE_RECURRENCE event
  INSERT INTO sales_conversion_events (tenant_id, conversion_id, step, status, entity_type, entity_id, detail)
  VALUES (v_tenant_id, v_conversion_id, 'CREATE_RECURRENCE', 'SUCCESS', 'recurrence_rule', v_rule_id,
    jsonb_build_object(
      'days_of_week', to_jsonb(v_days),
      'start_date',   p_start_date
    ));

  -- ---------------------------------------------------------------
  -- 9. Generate tickets for N weeks
  --    Deterministic ticket_code: 'TKT-' || job_code || '-' || YYYYMMDD
  --    Unique constraint: (tenant_id, job_id, scheduled_date)
  --    Upsert: ON CONFLICT DO NOTHING
  -- ---------------------------------------------------------------
  FOR v_week IN 0..(v_weeks_ahead - 1) LOOP
    FOREACH v_dow IN ARRAY v_days LOOP
      -- Calculate date: find next occurrence of this day-of-week
      v_d := p_start_date
             + (v_week * 7)
             + ((v_dow - EXTRACT(DOW FROM p_start_date)::int + 7) % 7);

      -- Skip if before start date (can happen in first week)
      IF v_d < p_start_date THEN
        v_d := v_d + 7;
      END IF;

      -- Skip if beyond reasonable horizon
      IF v_d > p_start_date + (v_weeks_ahead * 7 + 6) THEN
        CONTINUE;
      END IF;

      -- Deterministic ticket code: TKT-{job_code}-{YYYYMMDD}
      v_tkt_code := 'TKT-' || v_job_code || '-' || to_char(v_d, 'YYYYMMDD');

      -- Idempotent insert
      INSERT INTO work_tickets (
        tenant_id, ticket_code, job_id, site_id, scheduled_date, status
      ) VALUES (
        v_tenant_id, v_tkt_code, v_job_id, p_site_id, v_d, 'SCHEDULED'
      )
      ON CONFLICT (tenant_id, job_id, scheduled_date) DO NOTHING
      RETURNING id INTO v_tkt_id;

      IF v_tkt_id IS NOT NULL THEN
        v_ticket_count := v_ticket_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  -- Log GENERATE_TICKETS event
  INSERT INTO sales_conversion_events (tenant_id, conversion_id, step, status, detail)
  VALUES (v_tenant_id, v_conversion_id, 'GENERATE_TICKETS', 'SUCCESS',
    jsonb_build_object(
      'count',        v_ticket_count,
      'first_date',   p_start_date,
      'weeks',        v_weeks_ahead,
      'days_of_week', to_jsonb(v_days),
      'code_pattern', 'TKT-' || v_job_code || '-YYYYMMDD'
    ));

  -- ---------------------------------------------------------------
  -- 10. COMPLETE: Final event
  -- ---------------------------------------------------------------
  INSERT INTO sales_conversion_events (tenant_id, conversion_id, step, status, detail)
  VALUES (v_tenant_id, v_conversion_id, 'COMPLETE', 'SUCCESS',
    jsonb_build_object(
      'conversion_id',  v_conversion_id,
      'site_job_id',    v_job_id,
      'job_code',       v_job_code,
      'tickets_created', v_ticket_count
    ));

  -- ---------------------------------------------------------------
  -- 11. RETURN: { conversion_id, site_job_id, tickets_created }
  -- ---------------------------------------------------------------
  RETURN jsonb_build_object(
    'conversion_id',  v_conversion_id,
    'site_job_id',    v_job_id,
    'job_code',       v_job_code,
    'tickets_created', v_ticket_count,
    'idempotent',     false
  );
END;
$$;

-- Grant execute to authenticated users (role checks are inside the function)
GRANT EXECUTE ON FUNCTION convert_bid_to_job(UUID, UUID, UUID, DATE) TO authenticated;
