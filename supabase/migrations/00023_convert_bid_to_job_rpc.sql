-- =================================================================
-- convert_bid_to_job: Atomic transactional RPC for Won Proposal → Job
-- Replaces the multi-step client-side conversion with a single
-- server-side transaction. Idempotent, deterministic, auditable.
-- =================================================================

CREATE OR REPLACE FUNCTION convert_bid_to_job(
  p_proposal_id UUID,
  p_site_id UUID,
  p_pricing_option_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_weeks_ahead INT DEFAULT 4
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id     UUID;
  v_user_id       UUID;
  v_proposal       RECORD;
  v_bid_version    RECORD;
  v_bid            RECORD;
  v_schedule       RECORD;
  v_pricing_opt    RECORD;
  v_existing       RECORD;
  v_conversion_id  UUID;
  v_job_id         UUID;
  v_job_code       TEXT;
  v_rule_id        UUID;
  v_ticket_ids     UUID[] := '{}';
  v_ticket_codes   TEXT[] := '{}';
  v_ticket_count   INT := 0;
  v_days           INT[];
  v_billing        NUMERIC;
  v_d              DATE;
  v_dow            INT;
  v_week           INT;
  v_tkt_code       TEXT;
  v_tkt_id         UUID;
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
  -- 1. VALIDATE: Proposal must be WON and not archived
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
  -- 2. VALIDATE: Proposal must have bid_version → bid
  -- ---------------------------------------------------------------
  SELECT bv.*, b.id AS bid_id, b.bid_code, b.client_id, b.bid_monthly_price, b.service_id
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
  -- 3. IDEMPOTENCY: If conversion already exists, return existing data
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
    -- Return existing conversion + tickets
    RETURN jsonb_build_object(
      'conversion_id', v_existing.conversion_id,
      'site_job_id', v_existing.site_job_id,
      'job_code', v_existing.job_code,
      'tickets_created', (
        SELECT count(*) FROM work_tickets
        WHERE job_id = v_existing.site_job_id AND archived_at IS NULL
      ),
      'idempotent', true
    );
  END IF;

  -- ---------------------------------------------------------------
  -- 4. Resolve billing amount (from pricing option or bid)
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
  -- 5. Resolve schedule from bid (do NOT hardcode Mon-Fri)
  -- ---------------------------------------------------------------
  SELECT * INTO v_schedule
  FROM sales_bid_schedule
  WHERE bid_version_id = v_proposal.bid_version_id
    AND tenant_id = v_tenant_id
    AND archived_at IS NULL
  LIMIT 1;

  -- Build days_of_week array from days_per_week
  -- Default: spread days_per_week starting from Monday
  IF v_schedule IS NULL OR v_schedule.days_per_week IS NULL THEN
    v_days := ARRAY[1,2,3,4,5]; -- fallback Mon-Fri
  ELSE
    -- Map days_per_week count to actual days (Mon=1..Fri=5, Sat=6, Sun=0)
    CASE v_schedule.days_per_week
      WHEN 1 THEN v_days := ARRAY[1];
      WHEN 2 THEN v_days := ARRAY[1,3];
      WHEN 3 THEN v_days := ARRAY[1,3,5];
      WHEN 4 THEN v_days := ARRAY[1,2,3,4];
      WHEN 5 THEN v_days := ARRAY[1,2,3,4,5];
      WHEN 6 THEN v_days := ARRAY[1,2,3,4,5,6];
      WHEN 7 THEN v_days := ARRAY[0,1,2,3,4,5,6];
      ELSE v_days := ARRAY[1,2,3,4,5];
    END CASE;
  END IF;

  -- ---------------------------------------------------------------
  -- 6. CREATE: sales_bid_conversions record
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
    jsonb_build_object('proposal_id', p_proposal_id, 'bid_id', v_bid_version.bid_id));

  -- ---------------------------------------------------------------
  -- 7. CREATE: site_job
  -- ---------------------------------------------------------------
  v_job_code := next_code(v_tenant_id, 'JOB');

  INSERT INTO site_jobs (
    tenant_id, job_code, site_id, source_bid_id, source_conversion_id,
    billing_amount, frequency, start_date, status
  ) VALUES (
    v_tenant_id, v_job_code, p_site_id, v_bid_version.bid_id, v_conversion_id,
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
    jsonb_build_object('job_code', v_job_code, 'billing_amount', v_billing));

  -- ---------------------------------------------------------------
  -- 8. CREATE: recurrence_rule (uses bid schedule, NOT hardcoded)
  -- ---------------------------------------------------------------
  INSERT INTO recurrence_rules (
    tenant_id, site_job_id, days_of_week, start_date,
    start_time, end_time
  ) VALUES (
    v_tenant_id, v_job_id, v_days, p_start_date,
    CASE WHEN v_schedule IS NOT NULL THEN NULL ELSE NULL END, -- no time from schedule table
    NULL
  )
  RETURNING id INTO v_rule_id;

  -- Log CREATE_RECURRENCE event
  INSERT INTO sales_conversion_events (tenant_id, conversion_id, step, status, entity_type, entity_id, detail)
  VALUES (v_tenant_id, v_conversion_id, 'CREATE_RECURRENCE', 'SUCCESS', 'recurrence_rule', v_rule_id,
    jsonb_build_object('days_of_week', to_jsonb(v_days)));

  -- ---------------------------------------------------------------
  -- 9. GENERATE: work_tickets for N weeks (deterministic codes)
  -- ---------------------------------------------------------------
  FOR v_week IN 0..(p_weeks_ahead - 1) LOOP
    FOREACH v_dow IN ARRAY v_days LOOP
      -- Calculate date: find next occurrence of this day-of-week
      v_d := p_start_date + (v_week * 7) + ((v_dow - EXTRACT(DOW FROM p_start_date)::int + 7) % 7);

      -- Skip if before start date (can happen in first week)
      IF v_d < p_start_date THEN
        v_d := v_d + 7;
      END IF;

      -- Skip if beyond reasonable horizon
      IF v_d > p_start_date + (p_weeks_ahead * 7 + 6) THEN
        CONTINUE;
      END IF;

      -- Idempotent insert (unique constraint: job_id + scheduled_date)
      v_tkt_code := next_code(v_tenant_id, 'TKT');

      INSERT INTO work_tickets (
        tenant_id, ticket_code, job_id, site_id, scheduled_date, status
      ) VALUES (
        v_tenant_id, v_tkt_code, v_job_id, p_site_id, v_d, 'SCHEDULED'
      )
      ON CONFLICT (job_id, scheduled_date) DO NOTHING
      RETURNING id, ticket_code INTO v_tkt_id, v_tkt_code;

      IF v_tkt_id IS NOT NULL THEN
        v_ticket_ids   := v_ticket_ids || v_tkt_id;
        v_ticket_codes := v_ticket_codes || v_tkt_code;
        v_ticket_count := v_ticket_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  -- Log GENERATE_TICKETS event
  INSERT INTO sales_conversion_events (tenant_id, conversion_id, step, status, detail)
  VALUES (v_tenant_id, v_conversion_id, 'GENERATE_TICKETS', 'SUCCESS',
    jsonb_build_object('count', v_ticket_count, 'first_date', p_start_date,
      'weeks', p_weeks_ahead, 'days_of_week', to_jsonb(v_days)));

  -- ---------------------------------------------------------------
  -- 10. COMPLETE: Final event
  -- ---------------------------------------------------------------
  INSERT INTO sales_conversion_events (tenant_id, conversion_id, step, status, detail)
  VALUES (v_tenant_id, v_conversion_id, 'COMPLETE', 'SUCCESS',
    jsonb_build_object('conversion_id', v_conversion_id, 'site_job_id', v_job_id, 'tickets_created', v_ticket_count));

  -- ---------------------------------------------------------------
  -- 11. RETURN result
  -- ---------------------------------------------------------------
  RETURN jsonb_build_object(
    'conversion_id', v_conversion_id,
    'site_job_id', v_job_id,
    'job_code', v_job_code,
    'tickets_created', v_ticket_count,
    'ticket_codes', to_jsonb(v_ticket_codes),
    'days_of_week', to_jsonb(v_days),
    'billing_amount', v_billing,
    'start_date', p_start_date,
    'idempotent', false
  );
END;
$$;

-- Grant execute to authenticated users (RLS + role checks inside function)
GRANT EXECUTE ON FUNCTION convert_bid_to_job TO authenticated;
