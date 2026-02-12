# Ops Hardening Sprint — Summary

## 1. SendGrid Signed Event Webhook (P0)

**Status:** Already correctly implemented.

- ECDSA P-256 / SHA-256 signature verification via `verifySendGridSignature()`
- Raw bytes used for verification (never re-serialized)
- Rejects 401 on missing or invalid signature
- Deduplication via `UNIQUE (provider_event_id)` constraint on `sales_email_events`
- `sg_message_id` mapped to `sales_proposal_sends.provider_message_id`
- Follow-up stop rules: bounce/spam → stop sequences, skip scheduled sends
- Status priority upgrade logic (never downgrades)
- Test replay script: `scripts/test-sendgrid-webhook.ts`

## 2. Server-side Asset Gating (P0)

**Enforced at DB level via Postgres RPC.**

Migration: `00029_set_ticket_status_rpc.sql`

### RPC: `set_ticket_status(p_ticket_id UUID, p_status TEXT)`

| Gate | Condition | Error Code |
|------|-----------|------------|
| ASSET_GATE | Cannot move to `IN_PROGRESS` if required `site_asset_requirements` are not checked out in `ticket_asset_checkouts` | P0001 |
| KEY_RETURN_GATE | Cannot move to `COMPLETED` if KEY-type assets are still checked out (admin/owner override) | P0002 |

- `SECURITY DEFINER` — runs with function owner privileges
- Reads JWT `app_metadata.role` to allow admin override on KEY_RETURN_GATE
- Web and mobile clients now call `supabase.rpc('set_ticket_status', ...)` instead of direct `work_tickets` update
- Client-side gating removed from web; mobile shows user-friendly Alert on server rejection

## 3. Staff Mapping Integrity (P1)

- Removed unsafe `staffRow?.id ?? user.id` fallback in web `ticket-detail.tsx` `handleAssetCheckout`
- Now returns early if no staff record is linked to the current user
- `staff.user_id` column already has `UNIQUE` constraint + index (`idx_staff_user`)
- Mobile already validates `staffId` from `useTicketDetail` hook (no fallback)

## 4. Repo Hygiene (P1)

- Fixed TS2869 in `apps/mobile/app/(tabs)/profile.tsx` line 83
  - Was: `user?.id?.slice(0, 8) + '...' ?? '—'` (operator precedence: `+` before `??`)
  - Fix: `user?.id ? user.id.slice(0, 8) + '...' : '—'`
- `turbo typecheck` and `turbo build` both pass
