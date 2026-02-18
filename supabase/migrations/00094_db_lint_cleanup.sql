-- =================================================================
-- 00094_db_lint_cleanup.sql
-- Lint cleanup for legacy functions without rewriting historical migrations.
-- =================================================================

-- -----------------------------------------------------------------
-- 1) Fix ambiguous variable reference in auth token hook
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  claims JSONB;
  v_user_id UUID;
  membership RECORD;
BEGIN
  claims := event -> 'claims';
  v_user_id := (claims ->> 'sub')::UUID;

  SELECT tm.tenant_id, tm.role_code
  INTO membership
  FROM tenant_memberships tm
  WHERE tm.user_id = v_user_id
    AND tm.archived_at IS NULL
  ORDER BY tm.created_at ASC
  LIMIT 1;

  IF membership IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(membership.tenant_id::text));
    claims := jsonb_set(claims, '{role}', to_jsonb(membership.role_code));
  ELSE
    claims := jsonb_set(claims, '{tenant_id}', 'null'::jsonb);
    claims := jsonb_set(claims, '{role}', '"NONE"'::jsonb);
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON TABLE public.tenant_memberships TO supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;

-- -----------------------------------------------------------------
-- 2) Remove unused variable in job code helper
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_job_code(
  p_tenant_id UUID,
  p_site_code TEXT,
  p_service_code TEXT
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_site_suffix TEXT;
  v_svc_prefix  TEXT;
BEGIN
  IF p_site_code IS NOT NULL AND length(p_site_code) >= 4 THEN
    v_site_suffix := right(p_site_code, 4);
  ELSE
    RETURN next_code(p_tenant_id, 'JOB');
  END IF;

  IF p_service_code IS NOT NULL THEN
    SELECT left(upper(s.name), 3) INTO v_svc_prefix
    FROM services s
    WHERE s.service_code = p_service_code
      AND (s.tenant_id = p_tenant_id OR s.tenant_id IS NULL)
    LIMIT 1;
  END IF;

  IF v_svc_prefix IS NULL OR v_svc_prefix = '' THEN
    RETURN next_code(p_tenant_id, 'JOB');
  END IF;

  RETURN 'JOB-' || v_site_suffix || '-' || v_svc_prefix;
END;
$$;

-- -----------------------------------------------------------------
-- 3) Remove shadowed variable warning in conversion function
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION convert_bid_to_job(
  p_proposal_id       UUID,
  p_site_id           UUID,
  p_pricing_option_id UUID    DEFAULT NULL,
  p_start_date        DATE    DEFAULT CURRENT_DATE,
  p_conversion_mode   TEXT    DEFAULT 'FULL'  -- 'FULL' or 'DRY_RUN'
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
  -- 1. VALIDATE: proposal exists and is not archived
  --    Accept WON or SENT status (allows converting directly from SENT)
  -- ---------------------------------------------------------------
  SELECT * INTO v_proposal
  FROM sales_proposals
  WHERE id = p_proposal_id
    AND tenant_id = v_tenant_id
    AND archived_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONVERT_NOT_FOUND: Proposal not found or archived'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_proposal.status NOT IN ('WON', 'SENT', 'GENERATED') THEN
    RAISE EXCEPTION 'CONVERT_001: Proposal status is %, must be WON, SENT, or GENERATED', v_proposal.status
      USING ERRCODE = 'P0001';
  END IF;

  -- ---------------------------------------------------------------
  -- 2. Load bid_version → bid
  -- ---------------------------------------------------------------
  SELECT bv.id AS bv_id, bv.bid_id,
         b.bid_code, b.client_id, b.bid_monthly_price, b.service_id, b.total_sqft
  INTO v_bid_version
  FROM sales_bid_versions bv
  JOIN sales_bids b ON b.id = bv.bid_id
  WHERE bv.id = v_proposal.bid_version_id
    AND bv.tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONVERT_NOT_FOUND: Bid version or bid not found for proposal'
      USING ERRCODE = 'P0001';
  END IF;

  -- ---------------------------------------------------------------
  -- 3. IDEMPOTENCY: if conversion already exists, return existing data
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
  -- 4. Resolve billing amount (pricing option overrides bid price)
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

  -- Derive weeks: default 4 weeks
  v_weeks_ahead := 4;

  -- ---------------------------------------------------------------
  -- 6. DRY_RUN mode — return preview without creating anything
  -- ---------------------------------------------------------------
  IF p_conversion_mode = 'DRY_RUN' THEN
    RETURN jsonb_build_object(
      'mode', 'DRY_RUN',
      'would_create', jsonb_build_object(
        'site_job', true,
        'monthly_price', v_billing,
        'total_sqft', v_bid_version.total_sqft,
        'from_bid', v_bid_version.bid_code,
        'for_site', p_site_id,
        'days_of_week', to_jsonb(v_days),
        'weeks_ahead', v_weeks_ahead,
        'estimated_tickets', v_weeks_ahead * array_length(v_days, 1)
      )
    );
  END IF;

  -- ---------------------------------------------------------------
  -- 7. Insert sales_bid_conversions
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
  -- 8. Create site_job
  -- ---------------------------------------------------------------
  v_job_code := next_code(v_tenant_id, 'JOB');

  INSERT INTO site_jobs (
    tenant_id, job_code, site_id, service_id,
    source_bid_id, source_conversion_id,
    billing_amount, frequency, start_date, status,
    notes
  ) VALUES (
    v_tenant_id, v_job_code, p_site_id, v_bid_version.service_id,
    v_bid_version.bid_id, v_conversion_id,
    v_billing, 'WEEKLY', p_start_date, 'ACTIVE',
    'Auto-converted from bid ' || v_bid_version.bid_code || ' via proposal ' || v_proposal.proposal_code
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
      'service_id',     v_bid_version.service_id,
      'billing_amount', v_billing,
      'frequency',      'WEEKLY',
      'start_date',     p_start_date
    ));

  -- ---------------------------------------------------------------
  -- 9. Create recurrence_rule from bid schedule
  -- ---------------------------------------------------------------
  INSERT INTO recurrence_rules (
    tenant_id, site_job_id, days_of_week,
    start_date, start_time, end_time
  ) VALUES (
    v_tenant_id, v_job_id, v_days,
    p_start_date, NULL, NULL
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
  -- 10. Generate work_tickets for N weeks
  --     Deterministic ticket_code: 'TKT-' || job_code || '-' || YYYYMMDD
  --     Unique constraint: (tenant_id, job_id, scheduled_date)
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

      -- Deterministic ticket code
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
  -- 11. Update proposal status to WON if not already
  -- ---------------------------------------------------------------
  UPDATE sales_proposals
  SET status = 'WON'
  WHERE id = p_proposal_id
    AND status != 'WON';

  -- ---------------------------------------------------------------
  -- 12. Update bid status to WON
  -- ---------------------------------------------------------------
  UPDATE sales_bids
  SET status = 'WON'
  WHERE id = v_bid_version.bid_id
    AND status != 'WON';

  -- ---------------------------------------------------------------
  -- 13. Stop any active follow-up sequences for this proposal
  -- ---------------------------------------------------------------
  UPDATE sales_followup_sequences
  SET status = 'STOPPED', stop_reason = 'WON'
  WHERE proposal_id = p_proposal_id
    AND status = 'ACTIVE';

  -- ---------------------------------------------------------------
  -- 14. COMPLETE: Final event
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
  -- 15. RETURN result
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

GRANT EXECUTE ON FUNCTION convert_bid_to_job(UUID, UUID, UUID, DATE, TEXT) TO authenticated;
