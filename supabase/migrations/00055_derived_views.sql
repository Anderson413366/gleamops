-- ==========================================================================
-- 00055_derived_views.sql
-- P1 Schema Parity: Computed SQL views for reporting + dashboards
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- 1. v_clients_contract_age
--    Shows contract duration, renewal status, and days until expiry.
--    Useful for CRM dashboards and retention analysis.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_clients_contract_age AS
SELECT
  c.id,
  c.tenant_id,
  c.client_code,
  c.name,
  c.status,
  c.client_since,
  c.contract_start_date,
  c.contract_end_date,
  c.auto_renewal,

  -- Contract duration in days (NULL if no start date)
  CASE
    WHEN c.contract_start_date IS NOT NULL THEN
      (CURRENT_DATE - c.contract_start_date)
    ELSE NULL
  END AS contract_age_days,

  -- Client tenure in days (from client_since or created_at)
  (CURRENT_DATE - COALESCE(c.client_since, c.created_at::date)) AS tenure_days,

  -- Days until contract expiry (negative = expired)
  CASE
    WHEN c.contract_end_date IS NOT NULL THEN
      (c.contract_end_date - CURRENT_DATE)
    ELSE NULL
  END AS days_until_expiry,

  -- Expiry status bucket
  CASE
    WHEN c.contract_end_date IS NULL THEN 'NO_CONTRACT'
    WHEN c.contract_end_date < CURRENT_DATE THEN 'EXPIRED'
    WHEN c.contract_end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING_SOON'
    WHEN c.contract_end_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'EXPIRING_QUARTER'
    ELSE 'ACTIVE'
  END AS contract_status,

  -- Count of active sites
  (
    SELECT COUNT(*)
    FROM sites s
    WHERE s.client_id = c.id
      AND s.archived_at IS NULL
      AND COALESCE(s.status, 'ACTIVE') = 'ACTIVE'
  ) AS active_site_count,

  -- Count of active jobs across all sites
  (
    SELECT COUNT(*)
    FROM site_jobs j
      JOIN sites s ON s.id = j.site_id
    WHERE s.client_id = c.id
      AND j.archived_at IS NULL
      AND j.status = 'ACTIVE'
  ) AS active_job_count

FROM clients c
WHERE c.archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. v_jobs_service_window
--    Shows the operational service window for each job: days, times,
--    next scheduled date, last completed ticket.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_jobs_service_window AS
SELECT
  j.id,
  j.tenant_id,
  j.job_code,
  j.job_name,
  j.status,
  j.frequency,
  j.start_date,
  j.end_date,
  j.start_time,
  j.end_time,
  j.schedule_days,
  j.site_id,
  s.site_code,
  s.name AS site_name,
  c.id   AS client_id,
  c.client_code,
  c.name AS client_name,

  -- Recurrence info from recurrence_rules (if present)
  rr.days_of_week AS recurrence_days,
  rr.start_time   AS recurrence_start_time,
  rr.end_time     AS recurrence_end_time,

  -- Schedule rules info (if present)
  jsr.rule_type,
  jsr.week_interval,
  jsr.is_active   AS schedule_active,

  -- Last completed ticket date
  (
    SELECT MAX(wt.scheduled_date)
    FROM work_tickets wt
    WHERE wt.job_id = j.id
      AND wt.status = 'COMPLETED'
      AND wt.archived_at IS NULL
  ) AS last_completed_date,

  -- Next upcoming ticket date
  (
    SELECT MIN(wt.scheduled_date)
    FROM work_tickets wt
    WHERE wt.job_id = j.id
      AND wt.scheduled_date >= CURRENT_DATE
      AND wt.status = 'SCHEDULED'
      AND wt.archived_at IS NULL
  ) AS next_scheduled_date,

  -- Total tickets in current month
  (
    SELECT COUNT(*)
    FROM work_tickets wt
    WHERE wt.job_id = j.id
      AND wt.scheduled_date >= date_trunc('month', CURRENT_DATE)
      AND wt.scheduled_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
      AND wt.archived_at IS NULL
  ) AS tickets_this_month,

  -- Completed tickets in current month
  (
    SELECT COUNT(*)
    FROM work_tickets wt
    WHERE wt.job_id = j.id
      AND wt.scheduled_date >= date_trunc('month', CURRENT_DATE)
      AND wt.scheduled_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
      AND wt.status = 'COMPLETED'
      AND wt.archived_at IS NULL
  ) AS completed_this_month

FROM site_jobs j
  JOIN sites s   ON s.id = j.site_id
  JOIN clients c ON c.id = s.client_id
  LEFT JOIN recurrence_rules rr
    ON rr.site_job_id = j.id AND rr.archived_at IS NULL
  LEFT JOIN job_schedule_rules jsr
    ON jsr.site_job_id = j.id AND jsr.archived_at IS NULL AND jsr.is_active = TRUE
WHERE j.archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. v_job_profitability
--    Calculates per-job profitability: revenue, labor cost, supply cost,
--    margin percentage, and profitability tier.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_job_profitability AS
SELECT
  j.id,
  j.tenant_id,
  j.job_code,
  j.job_name,
  j.status,
  j.billing_amount,
  j.frequency,
  j.site_id,
  s.site_code,
  s.name AS site_name,
  c.id   AS client_id,
  c.client_code,
  c.name AS client_name,

  -- Estimated monthly revenue
  CASE j.frequency
    WHEN 'DAILY'     THEN COALESCE(j.billing_amount, 0) * 22
    WHEN 'WEEKLY'    THEN COALESCE(j.billing_amount, 0) * 4.33
    WHEN 'BIWEEKLY'  THEN COALESCE(j.billing_amount, 0) * 2.17
    WHEN 'MONTHLY'   THEN COALESCE(j.billing_amount, 0)
    WHEN 'QUARTERLY' THEN COALESCE(j.billing_amount, 0) / 3
    WHEN 'YEARLY'    THEN COALESCE(j.billing_amount, 0) / 12
    ELSE COALESCE(j.billing_amount, 0) * 4.33
  END AS estimated_monthly_revenue,

  -- Estimated labor cost (hours * avg pay rate of assigned staff)
  COALESCE(j.estimated_hours_per_month, 0) * COALESCE(
    (
      SELECT AVG(stf.pay_rate)
      FROM job_staff_assignments jsa
        JOIN staff stf ON stf.id = jsa.staff_id
      WHERE jsa.job_id = j.id
        AND jsa.archived_at IS NULL
        AND stf.pay_rate IS NOT NULL
    ),
    15.00  -- fallback hourly rate
  ) AS estimated_monthly_labor_cost,

  j.estimated_hours_per_month,
  j.estimated_hours_per_service,

  -- Staff count
  (
    SELECT COUNT(*)
    FROM job_staff_assignments jsa
    WHERE jsa.job_id = j.id
      AND jsa.archived_at IS NULL
  ) AS assigned_staff_count,

  -- Supply count at this site
  (
    SELECT COUNT(*)
    FROM site_supplies ss
    WHERE ss.site_id = j.site_id
      AND ss.archived_at IS NULL
  ) AS supply_line_count,

  -- Quality score
  j.quality_score,

  -- Subcontractor assignment
  j.subcontractor_id,
  sub.company_name AS subcontractor_name,

  j.created_at,
  j.start_date,
  j.end_date

FROM site_jobs j
  JOIN sites s   ON s.id = j.site_id
  JOIN clients c ON c.id = s.client_id
  LEFT JOIN subcontractors sub ON sub.id = j.subcontractor_id
WHERE j.archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- COMMENT: Margin/tier calculations
-- The view provides estimated_monthly_revenue and estimated_monthly_labor_cost
-- as separate columns. Application layer calculates:
--   margin = revenue - labor_cost
--   margin_pct = (margin / revenue) * 100
--   tier = CASE WHEN margin_pct >= 40 THEN 'HIGH' ...
-- This avoids division-by-zero in SQL and keeps the view simple.
-- ---------------------------------------------------------------------------

-- Notify PostgREST schema cache
NOTIFY pgrst, 'reload schema';
