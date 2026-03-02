# Scheduling Test Strategy

## DB/RLS tests
- tenant isolation across all new scheduling tables
- self-service restrictions for availability/trade initiation
- manager-only publish/lock and trade approval/apply

## Function tests
- publish fails on blocking conflicts
- publish succeeds after conflicts resolved
- lock blocks schedule mutations
- trade apply is atomic and idempotent

## UI tests
- planning tab renders and filters period/ticket datasets
- conflict panel reflects backend conflict records
- PTO approvals surface schedule impacts

## Integration tests
- end-to-end: create draft period -> assign staff -> validate -> publish -> lock
- end-to-end: create swap -> accept -> approve -> apply
