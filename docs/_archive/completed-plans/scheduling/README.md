# Scheduling Developer Pack

This folder is the execution blueprint for Humanity-style scheduling integration on the current GleamOps baseline.

## Start here
1. `01_current_state_analysis.md`
2. `02_supabase_gap_matrix.md`
3. `03_schema_migrations_plan.md`
4. `04_rls_policy_matrix.md`
5. `05_rpc_contract.md`
6. `06_frontend_file_map.md`
7. `07_conflict_rules.md`
8. `08_test_strategy.md`
9. `09_rollout_plan.md`
10. `10_risks_and_backout.md`

## Migration stubs
- `supabase/migrations/00075_schedule_periods.sql`
- `supabase/migrations/00076_staff_availability_rules.sql`
- `supabase/migrations/00077_shift_trade_requests.sql`
- `supabase/migrations/00078_schedule_conflicts.sql`
- `supabase/migrations/00079_schedule_core_alterations.sql`
- `supabase/migrations/00080_schedule_rls.sql`
- `supabase/migrations/00081_schedule_functions.sql`
- `supabase/migrations/00082_schedule_notifications.sql`
- `supabase/migrations/00083_schedule_lock_enforcement.sql`
- `supabase/migrations/00084_schedule_trade_cancel_permissions.sql`
