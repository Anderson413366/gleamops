-- =============================================================================
-- Migration 00130: Sprint 14 — Operational Views
-- =============================================================================
-- S14-T1: Create views: v_active_sites, v_staff_roster, v_upcoming_tickets
-- S14-T2: TypeScript types regenerated separately (supabase gen types)
-- =============================================================================

SET search_path TO 'public';

BEGIN;

-- ---------------------------------------------------------------------------
-- v_active_sites — Active sites with client name and job count
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_active_sites AS
SELECT
  s.id,
  s.tenant_id,
  s.site_code,
  s.name AS site_name,
  s.status,
  s.address,
  s.square_footage,
  c.name AS client_name,
  c.client_code,
  c.status AS client_status,
  st.name AS site_type_name,
  s.supervisor_id,
  sup.full_name AS supervisor_name,
  (SELECT COUNT(*) FROM site_jobs sj
   WHERE sj.site_id = s.id AND sj.status = 'ACTIVE' AND sj.archived_at IS NULL
  ) AS active_job_count,
  (SELECT COUNT(*) FROM work_tickets wt
   WHERE wt.site_id = s.id AND wt.status = 'SCHEDULED' AND wt.archived_at IS NULL
     AND wt.scheduled_date >= CURRENT_DATE
  ) AS upcoming_ticket_count,
  s.created_at,
  s.updated_at
FROM sites s
JOIN clients c ON c.id = s.client_id
LEFT JOIN site_types st ON st.id = s.site_type_id
LEFT JOIN staff sup ON sup.id = s.supervisor_id
WHERE s.archived_at IS NULL
  AND COALESCE(s.status, 'ACTIVE') IN ('ACTIVE', 'ON_HOLD');

-- ---------------------------------------------------------------------------
-- v_staff_roster — Active staff with position and assignment info
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_staff_roster AS
SELECT
  s.id,
  s.tenant_id,
  s.staff_code,
  s.full_name,
  s.first_name,
  s.last_name,
  s.status,
  s.role,
  s.employment_type,
  s.pay_type,
  s.pay_rate,
  s.schedule_type,
  s.hire_date,
  s.email,
  s.phone,
  s.mobile_phone,
  s.photo_url,
  sup.full_name AS supervisor_name,
  (SELECT COUNT(*) FROM ticket_assignments ta
   JOIN work_tickets wt ON wt.id = ta.ticket_id
   WHERE ta.staff_id = s.id AND ta.archived_at IS NULL
     AND wt.scheduled_date >= CURRENT_DATE
     AND wt.status IN ('SCHEDULED', 'IN_PROGRESS')
  ) AS upcoming_assignments,
  s.created_at,
  s.updated_at
FROM staff s
LEFT JOIN staff sup ON sup.id = s.supervisor_id
WHERE s.archived_at IS NULL
  AND s.status IN ('ACTIVE', 'ON_LEAVE');

-- ---------------------------------------------------------------------------
-- v_upcoming_tickets — Tickets for the next 14 days with context
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_upcoming_tickets AS
SELECT
  wt.id,
  wt.tenant_id,
  wt.ticket_code,
  wt.scheduled_date,
  wt.start_time,
  wt.end_time,
  wt.status,
  wt.priority,
  wt.type AS ticket_type,
  s.name AS site_name,
  s.site_code,
  c.name AS client_name,
  c.client_code,
  sj.job_code,
  sj.frequency,
  (SELECT string_agg(st.full_name, ', ' ORDER BY st.full_name)
   FROM ticket_assignments ta
   JOIN staff st ON st.id = ta.staff_id
   WHERE ta.ticket_id = wt.id AND ta.archived_at IS NULL
  ) AS assigned_staff,
  (SELECT COUNT(*)
   FROM ticket_assignments ta
   WHERE ta.ticket_id = wt.id AND ta.archived_at IS NULL
  ) AS staff_count,
  wt.created_at
FROM work_tickets wt
JOIN site_jobs sj ON sj.id = wt.job_id
JOIN sites s ON s.id = wt.site_id
JOIN clients c ON c.id = s.client_id
WHERE wt.archived_at IS NULL
  AND wt.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
  AND wt.status IN ('SCHEDULED', 'IN_PROGRESS');

COMMIT;
