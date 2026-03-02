# Pipeline

> Track sales from first contact to signed contract.

**Route:** `/pipeline`
**Sidebar icon:** TrendingUp
**Accent color:** Pink (#ec4899)
**Default tab:** Prospects

---

## What This Module Is

The Pipeline module manages the full sales cycle.
It follows a clear path: Prospect → Opportunity → Bid → Proposal → Won.

A **prospect** is a potential customer who has shown interest.
An **opportunity** is a qualified lead with a specific need.
A **bid** is a detailed price quote built with CleanFlow math.
A **proposal** is a formatted document sent to the prospect for signing.

When a proposal is accepted, the prospect converts to a client with active jobs.

## When to Use It

- Add a new sales prospect
- Track an opportunity through the pipeline
- Build a bid using the CleanFlow calculator
- Generate and send a proposal PDF
- Track proposal opens, views, and signatures
- Convert a won deal into a client + site + job

---

## Quick Win

1. Click **Pipeline** in the sidebar.
2. You are on the **Prospects** tab.
3. See all prospects with status badges and last activity date.
4. Click any row to open the prospect detail page.
5. Click **+ New Prospect** to start the sales process.

---

## Common Tasks

### Add a New Prospect

1. Go to **Pipeline** > **Prospects** tab.
2. Click **+ New Prospect** (top right).
3. Enter the **Company Name** (required).
4. Add contact name, phone, email.
5. Set the **Source** (Referral, Website, Cold Call, etc.).
6. Click **Save**.

**Expected result:** Prospect appears in the list with code PRO-NNNN and status NEW.

> **Stop Point:** Prospect is created. Qualify them and create an opportunity when ready.

### Create an Opportunity

1. Go to **Pipeline** > **Opportunities** tab.
2. Click **+ New Opportunity**.
3. Select the **Prospect**.
4. Enter a description of the opportunity.
5. Set the estimated value and close date.
6. Click **Save**.

**Expected result:** Opportunity appears with code OPP-NNNN.

### Build a Bid

1. Go to **Pipeline** > **Bids** tab.
2. Click **+ New Bid**.
3. The **Bid Wizard** opens (multi-step form).
4. **Step 1:** Select the opportunity and site details.
5. **Step 2:** Define areas, tasks, and frequencies.
6. **Step 3:** CleanFlow calculates production rates, labor hours, and pricing.
7. **Step 4:** Review the bid summary.
8. Click **Create Bid**.

**Expected result:** Bid appears with code BID-NNNNNN and status DRAFT.

The CleanFlow math engine calculates:
- Workload from area + task + frequency
- Labor hours from production rates
- Pricing from labor cost + margin

### Generate a Proposal

1. Go to **Pipeline** > **Proposals** tab.
2. Click **+ New Proposal** or generate from a bid.
3. The proposal pulls data from the bid.
4. Review and customize the proposal content.
5. Click **Generate PDF**.
6. Click **Send** to email the proposal to the prospect.

**Expected result:** Proposal appears with code PRP-NNNNNN. PDF is generated. Email is sent.

### Track Proposal Activity

1. Open a proposal detail page.
2. See the activity timeline: sent, opened, viewed, signed.
3. Email tracking shows open and click events via SendGrid webhooks.

### Convert a Won Deal

1. When a proposal is accepted/signed, the status moves to WON.
2. The conversion process creates:
   - A new **Client** (from the prospect)
   - A new **Site** (from the bid site details)
   - A new **Job** (service plan from the bid)
3. This is handled by the `convert_bid` RPC.

**Expected result:** New client, site, and job appear in their respective modules.

---

## Screens & Views (5 Tabs)

### Prospects (`?tab=prospects`)

All sales prospects. Shows:
- Prospect code, company name, source, status, contact info, last activity
- **Status filter chips:** NEW, CONTACTED, QUALIFIED, UNQUALIFIED, CONVERTED, LOST, All
- **Card view** available

Click any row to open `/pipeline/prospects/[id]`.

### Opportunities (`?tab=opportunities`)

Qualified sales opportunities. Shows:
- Opportunity code, prospect, description, estimated value, close date, stage
- Pipeline stage tracking

Click any row to open `/pipeline/opportunities/[id]`.

### Bids & Pricing (`?tab=bids`)

Price quotes built with CleanFlow. Shows:
- Bid code, opportunity, site, total value, status
- **Status filter chips:** DRAFT, SUBMITTED, ACCEPTED, REJECTED, EXPIRED, All

Click any row to open `/pipeline/bids/[id]`.

### Proposals (`?tab=proposals`)

Formatted documents for sending. Shows:
- Proposal code, bid, prospect, sent date, status, signature status
- **Status filter chips:** DRAFT, SENT, VIEWED, ACCEPTED, REJECTED, EXPIRED, All
- Email tracking indicators (opens, clicks)

Click any row to open `/pipeline/proposals/[id]`.

### Admin (`?tab=admin`)

Pipeline administration. Includes:
- Follow-up email templates
- Marketing campaign tracking
- Rate card management

Visible to Owner/Admin and Manager roles.

---

## Detail Pages

### Prospect Detail (`/pipeline/prospects/[id]`)

- **Back link:** "Back to Pipeline"
- **Header:** Avatar circle + company name + PRO code badge + status badge
- **Stat cards:** Opportunities count, bids count, total estimated value
- **Sections:** Contact Info, Source, Notes, Activity Timeline
- **Actions:** Edit (opens prospect-form), Qualify, Mark Lost

### Opportunity Detail (`/pipeline/opportunities/[id]`)

- **Back link:** "Back to Pipeline"
- **Header:** OPP code badge + description + stage badge
- **Sections:** Opportunity Info, Prospect link, Estimated Value, Close Date
- **Actions:** Edit (opens opportunity-form), Create Bid

### Bid Detail (`/pipeline/bids/[id]`)

- **Back link:** "Back to Pipeline"
- **Header:** BID code badge + status badge + total value
- **Sections:** Bid Summary, CleanFlow Breakdown, Areas & Tasks, Labor Hours, Pricing
- **Actions:** Edit, Generate Proposal, Submit to Prospect

### Proposal Detail (`/pipeline/proposals/[id]`)

- **Back link:** "Back to Pipeline"
- **Header:** PRP code badge + status badge + sent date
- **Sections:** Proposal Content, Bid Reference, Email Tracking, Signature Status
- **Actions:** Generate PDF, Send Email, Mark Won, Mark Lost

---

## Buttons & Controls

| Button | Where | What It Does | Who Can Use |
|--------|-------|-------------|-------------|
| **+ New Prospect** | Prospects tab | Opens prospect-form | Owner, Manager, Sales |
| **+ New Opportunity** | Opportunities tab | Opens opportunity-form | Owner, Manager, Sales |
| **+ New Bid** | Bids tab | Opens bid wizard | Owner, Manager, Sales |
| **+ New Proposal** | Proposals tab | Creates proposal from bid | Owner, Manager, Sales |
| **Generate PDF** | Proposal detail | Generates PDF document | Owner, Manager, Sales |
| **Send** | Proposal detail | Sends proposal via email | Owner, Manager, Sales |
| **Convert** | Won proposal | Converts prospect to client + site + job | Owner, Manager |
| View toggle (List/Card) | Top right | Switches view mode | All |
| Status filter chips | Below tabs | Filters by status | All |
| **Export** | Top right area | Downloads CSV | All |

---

## Forms

### Prospect Form (`prospect-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Company Name | Text | Yes | Prospect company name |
| Contact Name | Text | No | Primary contact person |
| Phone | Text | No | Contact phone |
| Email | Text | No | Contact email |
| Source | Select | No | How they found you (Referral, Website, etc.) |
| Notes | Textarea | No | Initial notes |

### Opportunity Form (`opportunity-form`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Prospect | Select | Yes | Which prospect |
| Description | Textarea | Yes | What they need |
| Estimated Value | Number | No | Expected contract value |
| Close Date | Date | No | Expected close date |
| Stage | Select | No | Pipeline stage |

### Bid Wizard (multi-step)

| Step | What You Do |
|------|-------------|
| 1. Setup | Select opportunity, enter site details (area, type) |
| 2. Scope | Define areas, select tasks, set frequencies |
| 3. Calculate | CleanFlow runs: production rates → labor hours → pricing |
| 4. Review | Review totals, adjust margin, finalize |

---

## Empty/Loading/Error States

| State | What You See | What To Do |
|-------|-------------|------------|
| No prospects | Empty state: "No prospects yet" | Click **+ New Prospect** |
| No bids | Empty state: "No bids found" | Create a bid from an opportunity |
| No proposals | Empty state: "No proposals found" | Generate a proposal from a bid |
| Loading | Skeleton animation | Wait for data to load |
| PDF generation error | Toast: "Could not generate PDF" | Check bid data is complete, try again |

---

## Troubleshooting

> **If** the bid wizard shows $0 → Check that you have defined areas and tasks with square footage.

> **If** CleanFlow calculations seem wrong → Verify the production rates in the Catalog module.

> **If** the proposal PDF won't generate → Make sure the bid has all required fields filled.

> **If** email tracking shows no opens → The prospect's email client may block tracking pixels.

> **If** conversion fails → Check that all required fields exist on the bid (client name, site address).

> **If** you cannot access the Admin tab → Only Owner/Admin and Manager roles can see it.

---

## Related Modules

- [Clients](./clients.md) — Prospects convert into clients
- [Jobs](./jobs.md) — Won bids create service plans
- [Catalog](./catalog.md) — Tasks and services used in bid scoping
- [Reports](./reports.md) — Sales reports and pipeline analytics
