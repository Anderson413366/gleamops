# Proposals, PDFs, Email, Tracking, Follow-ups

This is where most systems embarrass themselves. GleamOps won’t.

## 1) Storage strategy (Supabase Storage)

Buckets:
- `proposals` (private)
  - `{proposal_code}/proposal-v{version}.pdf`
  - `{proposal_code}/attachments/{uuid}-{original_filename}`
- `surveys` (private)
  - `{bid_code}/photos/{area_id}-{timestamp}.jpg`
  - `{bid_code}/documents/{uuid}-{original_filename}`
- `marketing` (public-read)
  - `inserts/{insert_code}.pdf`

Retention:
- Won proposals: forever
- Lost proposals: 2 years
- Survey photos: 1 year after bid closes
- Marketing inserts: until manually deleted

Access:
- never expose raw private file URLs
- server returns **signed URLs** for time-limited access

## 2) PDF generation

Library: `@react-pdf/renderer` (Node runtime)

Why Node runtime:
- Edge functions are Deno-based and not suited to complex Node toolchains.

Flow:
1. Validate proposal is complete (pricing calculated, options present)
2. Render PDF from a template config
3. Append marketing inserts and attachments (if needed)
4. Upload to storage
5. Save `pdf_file_id`, `pdf_generated_at`, `page_count`

Idempotency:
- if PDF exists and `regenerate=false`, return existing file
- use `pdf_generation_job_id` to prevent dupe jobs

## 3) Proposal send

Provider: SendGrid (or Postmark/Mailgun) must support webhooks.

Flow:
1. Check PDF exists
2. Rate limit
3. Create `sales_proposal_sends` record (status=SENDING)
4. Send email (store provider_message_id)
5. Update send record status
6. Start follow-up sequence (optional)
7. Lock bid version snapshot (`is_sent_snapshot = true`)

### Rate limiting rules
- max 10 sends/hour/user
- max 3 sends/24h to the same email
Return `PROPOSAL_002` (429) if exceeded.

## 4) Email tracking webhooks (critical security note)

Webhooks must be:
- signature verified
- idempotent
- tolerant of retries and duplicates

Store:
- `provider_message_id`
- map event → proposal_send_id
- insert into `sales_email_events`

Bounce rule:
- Bounce should stop follow-ups by default (avoid sending to dead inboxes).

## 5) Follow-up sequences

State machine:

Sequence states:
- ACTIVE → STOPPED (won/lost/manual/bounce)
- ACTIVE → COMPLETED (all steps sent)

Send states:
- SCHEDULED → SENDING → SENT
- SCHEDULED → FAILED
- SCHEDULED → SKIPPED (sequence stopped)
- SCHEDULED → SKIPPED (proposal opened, optional rule)

Timezone:
- Use contact timezone if set
- Else tenant default timezone
- Else UTC

Business hours:
- schedule sends only 8am–6pm local by default
- if outside window: push to next business window

Stop conditions:
- proposal WON/LOST
- bounce
- manual stop


---

## Webhook security (Signed Event Webhook) [REQUIRED]

Do **not** accept “open/bounce” events from the public internet without verification.
Attackers will absolutely mark every proposal as “opened” just to mess with you.

### Requirements
- Enable provider signature verification (SendGrid Signed Event Webhook).
- Verify signature using the provider public key.
- Verify against the **raw request body bytes** (not the parsed JSON).
- Reject invalid signatures with 401.

### Implementation notes
- Store provider `message_id` (or event `sg_message_id`) on `proposal_sends`.
- Webhook ingestion must be **idempotent**:
  - unique constraint on (provider_event_id) OR (provider_message_id, event_type, timestamp)
  - if the provider retries, you must not duplicate event rows
- Webhook handler must be fast: write to DB, enqueue downstream processing if needed.

---

## Rate limiting (email send) [REQUIRED]

Guardrails:
- Max **10 proposal sends per hour per user**
- Max **3 sends per recipient per 24 hours**
- On violation: return Problem Details with status **429** and error code `PROPOSAL_SEND_RATE_LIMITED`

This is both a security control and a “save your domain reputation” control.

---

## Follow-up stop conditions (strict)
Stop all follow-up jobs when any of these are true:
- proposal is WON or LOST
- hard bounce or spam report occurs
- manual stop flag is set
- recipient unsubscribed

Never “keep trying.” That is how you get blocked by every client and provider.
