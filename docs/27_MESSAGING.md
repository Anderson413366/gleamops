# Messaging (controlled 1:1 + escalation)

Messaging is not “Slack for cleaners.” It’s a controlled escalation tool tied to tickets.

## Goals
- Cleaner can escalate a problem from a ticket in seconds
- Supervisor receives the message with full context (site/job/ticket)
- Keep it simple: no channels, no GIF economy

## Model

### Threads
- Thread types:
  - TICKET_THREAD (default per ticket)
  - DIRECT (optional 1:1)
- Thread members:
  - always includes cleaner(s) assigned
  - supervisor for the site/job
  - managers/admins can be allowed read access

### Messages
- text
- optional attachments (photos/files)
- created_at, created_by

### Routing rules
- If cleaner messages a manager directly, system suggests “Send to Supervisor” unless role allows direct.
- In ticket thread, supervisor is auto-subscribed.

## Permissions
- Cleaner can only message in threads they are a member of.
- Cleaner cannot add arbitrary members.
- Supervisor can add a manager if escalation needed.

## Retention / compliance
- Messages are part of the operational record.
- Retain for 2 years (configurable).
- Hard delete disabled.

## UX
- Ticket detail has “Message Supervisor” button
- Keep messages lightweight and fast to load
