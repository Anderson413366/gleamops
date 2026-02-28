# Backend Lock
- Treat Supabase as read-only contract.
- Do not edit SQL migrations, RLS policies, stored procedures, auth configuration.
- UI-only changes: components, styles, layout, client-side behavior, accessibility, performance.

## Exception: Humanity Scheduling Parity Initiative
- New SQL migrations ARE authorized for scheduling parity features.
- Must follow existing patterns: RLS, tenant_id, version_etag, soft delete, standard triggers.
- Applies to: position_types, staff_eligible_positions, schedule_templates, schedule_period_types, tenant_schedule_settings, work_ticket_note migrations.
