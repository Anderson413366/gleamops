# Ops runbooks (backup, monitoring, alerting)

GleamOps is for running a business, so it can’t randomly combust.

## Backups
- daily automated DB backups (retain 30 days)
- weekly “gold” backups (retain 6–12 months)
- monthly export of critical objects (clients, jobs, tickets)

## Monitoring
- error tracking (Sentry)
- logs aggregated (structured JSON)
- uptime checks for:
  - web app
  - API endpoints (health/readiness)
  - webhook endpoint

## Alerts (minimum)
- webhook error rate spike
- email send failures spike
- job queue backlog > threshold
- conversion failures
- database CPU/connection saturation

## Incident runbooks (minimum)

### Email webhooks failing
- verify signature verification not broken
- verify provider retries are being accepted (200 OK)
- confirm idempotency key constraints aren’t rejecting valid retries

### PDF generation failing
- inspect job payload (missing data?)
- regenerate with `regenerate=true`
- fallback: generate HTML preview and send link (last resort)

### Ticket generation duplicates
- verify idempotency constraints (job_id, date unique)
- rerun generator in dry-run mode

## Rate limiting
Enforce DB-backed rate limiting for:
- proposal sends
- pdf generation
- heavy calculations
