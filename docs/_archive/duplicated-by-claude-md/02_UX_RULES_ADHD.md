# UX rules: Apple-clean and ADHD-friendly

The app must feel like it was designed by someone who has actually been interrupted mid-thought by… literally anything.

## Global rules

### Rule 1: Always show “What’s next?”
Every object screen (bid/ticket/inspection/etc.) shows:
- **Primary action** (big button)
- Secondary action (icon/button)
- Everything else under **More**

Examples:
- Bid: **Generate Proposal**
- Proposal: **Send**
- Ticket: **Start / Check in**
- Timesheet: **Approve**
- Inspection: **Complete**

### Rule 2: Progressive disclosure
Default view: **Simple**
Toggle: **Advanced**
- Remember user preference per account
- “Advanced” must never block basic workflows

### Rule 3: List → Detail Drawer
Avoid page navigations for common review flows.
- Left: list with filters
- Right: slide-over detail
- Keep scroll position

### Rule 4: Fast capture, slow organization
Every major object has:
- Quick Note (timestamped)
- Attach photo/file
- Assign later

### Rule 5: Status pills everywhere
Humans should be able to understand state in a half-second.

Examples:
- Proposal: Draft / Sent / Delivered / Opened / Failed / Won / Lost
- Ticket: Scheduled / In Progress / Completed / Verified
- Timesheet: Needs review / Approved / Exception

### Rule 6: Don’t punish users for being offline
Inspections **must** work offline.
Checklists should work offline if feasible (recommended).

## Visual semantics (consistency beats creativity)

- Primary: “action blue”
- Success: green (Won / Delivered / Approved)
- Warning: orange (Needs review / Pending / Late)
- Error: red (Failed / Bounced / Out-of-geofence)
- Neutral: gray (Archived / Cancelled)

### Empty states
Every empty state must have:
- One sentence explaining what it is
- One button to create/import the thing

## Form & wizard rules (bids especially)

### Bid wizard = 5 steps
1. Info (client/site/service)
2. Measurements (Express or Manual)
3. Scope (tasks and frequencies)
4. Price (recommendation + adjustments)
5. Proposal (PDF config, options, signature, attachments)

Always show:
- Save & Exit
- Preview proposal
- Send

### Auto-save
- Auto-save every 2–5 seconds after changes
- Show saved indicator (subtle)
- Use optimistic locking (`version_etag`) to prevent overwrite

## Power features without clutter
Power users get:
- keyboard shortcuts (/, cmd+k command palette)
- bulk actions in lists
- advanced filters saved as views

Everybody else gets:
- calm defaults
- minimal UI

This is how you satisfy both camps without building two apps.
