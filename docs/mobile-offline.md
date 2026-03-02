# Mobile + offline strategy

Mobile is for field staff. It must be fast, simple, and tolerant of bad connectivity.

## Mobile scope (v1)
- Today’s tickets list
- Ticket detail:
  - checklist
  - photos
  - safety docs (SDS links)
  - check-in/out
  - message supervisor
- Inspections (Inspector role):
  - offline-first templates
  - offline completion + photos
  - sync when online

## Offline data stores
- SQLite for inspection sessions and checklist state
- File cache for photos until uploaded

## Sync approach (recommended)
- Client generates `local_id` and increments `version`
- Server upserts by `(tenant_id, local_id)`
- Server returns server ids + mapping

Conflict handling
- If server version newer: return conflict with server payload
- Client displays resolution UI (rare, but required)

## Photo upload
- Upload photos in background with retry
- Mark inspection “submitted” only after required photo uploads succeed, or allow submit and keep upload queue (recommended).
