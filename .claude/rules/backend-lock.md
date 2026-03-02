# Backend Lock
- Treat Supabase as read-only contract.
- Do not edit SQL migrations, RLS policies, stored procedures, auth configuration.
- UI-only changes: components, styles, layout, client-side behavior, accessibility, performance.

## Exception: Humanity Scheduling Parity Initiative
- New SQL migrations ARE authorized for scheduling parity features.
- Must follow existing patterns: RLS, tenant_id, version_etag, soft delete, standard triggers.
- Applies to: position_types, staff_eligible_positions, schedule_templates, schedule_period_types, tenant_schedule_settings, work_ticket_note migrations.

## Exception: Data Quality & Automation Initiative (Sprints 1–14)
- SQL migrations 00117–00130 ARE authorized for the data quality migration plan.
- Covers: data hygiene, schema constraints, column consolidation, FK linkage, automation triggers, status enforcement, indexes, decomposition, cascade archive, financials extraction, scheduling chain, operational views.
- Must follow existing patterns: RLS, tenant_id, version_etag, soft delete, standard triggers.
- search_path must always be 'public' — NEVER empty string.
