# Scheduling RLS Policy Matrix

## schedule_periods
- `SELECT`: tenant-wide read
- `INSERT/UPDATE`: `OWNER_ADMIN` or `MANAGER`
- `DELETE`: disallow, archive only

## staff_availability_rules
- `SELECT`: tenant-wide read
- `INSERT/UPDATE`: own staff record OR manager/admin/supervisor
- `DELETE`: disallow, archive only

## shift_trade_requests
- `SELECT`: tenant-wide read
- `INSERT`: initiator must match current staff record
- `UPDATE`: initiator for cancel, target for accept, manager/admin for approve/apply/deny

## schedule_conflicts
- `SELECT`: tenant-wide read
- `INSERT/UPDATE`: manager/admin only (primarily via RPC)

## work_tickets and ticket_assignments
- keep baseline tenant policies for read
- enforce publish/lock/trade transitions through RPC role checks
