-- =============================================================================
-- Migration 00129: Sprint 13 — Scheduling Chain Integrity
-- =============================================================================
-- S13-T1: CHECK constraints on job_schedule_rules
-- S13-T2: Create fn_generate_tickets_for_period(p_period_id) RPC
-- S13-T3: Add position_code column to ticket_assignments + CHECK
-- =============================================================================

SET search_path TO 'public';

BEGIN;

-- ---------------------------------------------------------------------------
-- S13-T1: CHECK constraints on job_schedule_rules
-- Existing CHECK on rule_type is already in place from 00051.
-- Add additional constraints for time/date ranges and week_interval.
-- ---------------------------------------------------------------------------
ALTER TABLE job_schedule_rules
  ADD CONSTRAINT chk_jsr_time_range
  CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time);

ALTER TABLE job_schedule_rules
  ADD CONSTRAINT chk_jsr_date_range
  CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until >= effective_from);

ALTER TABLE job_schedule_rules
  ADD CONSTRAINT chk_jsr_week_interval
  CHECK (week_interval IS NULL OR week_interval BETWEEN 1 AND 12);

-- ---------------------------------------------------------------------------
-- S13-T2: fn_generate_tickets_for_period(p_period_id)
-- Generates work tickets for all active jobs in a schedule period's date range.
-- Uses job_schedule_rules to determine which dates get tickets.
-- Returns the number of tickets created.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_generate_tickets_for_period(p_period_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_period RECORD;
  v_rule RECORD;
  v_date DATE;
  v_dow INTEGER;
  v_count INTEGER := 0;
  v_ticket_code TEXT;
BEGIN
  -- Get period details
  SELECT * INTO v_period
  FROM schedule_periods
  WHERE id = p_period_id;

  IF v_period IS NULL THEN
    RAISE EXCEPTION 'Schedule period not found: %', p_period_id;
  END IF;

  -- Iterate over each active job schedule rule
  FOR v_rule IN
    SELECT jsr.*, sj.site_id, sj.tenant_id
    FROM job_schedule_rules jsr
    JOIN site_jobs sj ON sj.id = jsr.site_job_id
    WHERE jsr.is_active = true
      AND jsr.archived_at IS NULL
      AND sj.status = 'ACTIVE'
      AND sj.archived_at IS NULL
      AND sj.tenant_id = v_period.tenant_id
      AND (jsr.effective_from IS NULL OR jsr.effective_from <= v_period.period_end)
      AND (jsr.effective_until IS NULL OR jsr.effective_until >= v_period.period_start)
  LOOP
    -- Iterate over each date in the period
    v_date := GREATEST(v_period.period_start, COALESCE(v_rule.effective_from, v_period.period_start));

    WHILE v_date <= LEAST(v_period.period_end, COALESCE(v_rule.effective_until, v_period.period_end)) LOOP
      v_dow := EXTRACT(DOW FROM v_date)::INTEGER; -- 0=Sun, 6=Sat

      -- Check if this date matches the rule
      IF (v_rule.rule_type = 'DAILY')
         OR (v_rule.rule_type = 'WEEKLY' AND v_rule.days_of_week IS NOT NULL AND v_dow = ANY(v_rule.days_of_week))
         OR (v_rule.rule_type = 'MONTHLY' AND v_rule.month_day IS NOT NULL AND EXTRACT(DAY FROM v_date)::INTEGER = v_rule.month_day)
      THEN
        -- Generate ticket code
        v_ticket_code := 'TKT-' || LPAD(nextval('work_tickets_id_seq'::TEXT)::TEXT, 4, '0');

        -- Insert ticket (skip if already exists for this job+date)
        INSERT INTO work_tickets (
          tenant_id, ticket_code, job_id, site_id, scheduled_date,
          start_time, end_time, status
        )
        VALUES (
          v_rule.tenant_id,
          v_ticket_code,
          v_rule.site_job_id,
          v_rule.site_id,
          v_date,
          v_rule.start_time,
          v_rule.end_time,
          'SCHEDULED'
        )
        ON CONFLICT (job_id, scheduled_date) DO NOTHING;

        IF FOUND THEN
          v_count := v_count + 1;
        END IF;
      END IF;

      v_date := v_date + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public';

-- ---------------------------------------------------------------------------
-- S13-T3: Add position_code to ticket_assignments
-- Tracks which position role the staff member fills for this assignment.
-- ---------------------------------------------------------------------------
ALTER TABLE ticket_assignments
  ADD COLUMN IF NOT EXISTS position_code TEXT;

ALTER TABLE ticket_assignments
  ADD CONSTRAINT chk_ta_position_code
  CHECK (position_code IS NULL OR position_code ~ '^POS-[0-9]{3,}$');

COMMIT;
