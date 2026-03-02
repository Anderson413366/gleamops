# Pipeline Module Reference

## Field Dictionary

### Prospect

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique prospect identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| company_name | string | Yes | 1-200 chars | Prospect company or individual name |
| contact_name | string | Yes | 1-150 chars | Primary contact person |
| contact_email | string | No | Valid email format | Contact email |
| contact_phone | string | No | Valid phone format | Contact phone |
| status | Enum | Yes | Valid PROSPECT_STATUS | Current prospect stage |
| source | string | No | 1-100 chars | Lead source (referral, web, etc.) |
| estimated_value | decimal | No | >= 0 | Estimated monthly contract value |
| assigned_to | UUID | No | Valid staff ID | Sales rep or account manager |
| next_follow_up | date | No | Valid date | Next scheduled follow-up date |
| notes | text | No | Max 2000 chars | Internal prospect notes |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

### Bid

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique bid identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| prospect_id | UUID | Yes | Valid prospect | Associated prospect |
| bid_number | string | Auto | System-generated | Human-readable bid number |
| status | Enum | Yes | Valid BID_STATUS | Current bid status |
| title | string | Yes | 1-200 chars | Bid title or description |
| total_amount | decimal | Yes | >= 0 | Total bid amount |
| valid_until | date | No | >= today | Bid expiration date |
| scope_of_work | text | No | Max 5000 chars | Detailed scope of work |
| line_items | JSON | No | Valid line items array | Itemized bid breakdown |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

### Proposal

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique proposal identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| prospect_id | UUID | Yes | Valid prospect | Associated prospect |
| bid_id | UUID | No | Valid bid | Associated bid (if derived from bid) |
| proposal_number | string | Auto | System-generated | Human-readable proposal number |
| status | Enum | Yes | Valid PROPOSAL_STATUS | Current proposal status |
| title | string | Yes | 1-200 chars | Proposal title |
| sent_at | timestamp | No | Auto on send | When proposal was sent to prospect |
| viewed_at | timestamp | No | Auto on view | When prospect first viewed |
| signed_at | timestamp | No | Auto on sign | When prospect signed |
| expires_at | date | No | Valid date | Proposal expiration date |
| content | text | No | Max 10000 chars | Proposal body content |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

## Statuses / Enums

### PROSPECT_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| NEW | blue | Newly captured lead, not yet contacted | CONTACTED, LOST |
| CONTACTED | yellow | Initial outreach has been made | QUALIFIED, LOST |
| QUALIFIED | green | Prospect confirmed as a valid opportunity | PROPOSAL_SENT, LOST |
| PROPOSAL_SENT | purple | Proposal has been delivered to prospect | WON, LOST |
| WON | green | Prospect converted to a client | -- |
| LOST | red | Prospect declined or disqualified | -- |

### BID_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| DRAFT | gray | Bid is being prepared | ACTIVE, CANCELED |
| ACTIVE | green | Bid is finalized and ready to submit | SUBMITTED, CANCELED |
| SUBMITTED | blue | Bid has been sent to the prospect | WON, LOST |
| WON | green | Bid was accepted by the prospect | -- |
| LOST | red | Bid was rejected by the prospect | -- |

### PROPOSAL_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| DRAFT | gray | Proposal is being prepared | SENT |
| SENT | blue | Proposal has been sent to the prospect | VIEWED, EXPIRED, REJECTED |
| VIEWED | yellow | Prospect has opened/viewed the proposal | SIGNED, EXPIRED, REJECTED |
| SIGNED | green | Prospect has signed the proposal | -- |
| EXPIRED | red | Proposal passed its expiration date without action | -- |
| REJECTED | red | Prospect explicitly rejected the proposal | -- |

## Button Inventory

| Button Label | Location | Action | Role Required |
|--------------|----------|--------|---------------|
| + New Prospect | Pipeline list toolbar | Open prospect creation form | Manager, Admin, Owner |
| Edit Prospect | Prospect detail toolbar | Open prospect edit form | Manager, Admin, Owner |
| Mark Contacted | Prospect detail toolbar | Transition NEW -> CONTACTED | Manager, Admin, Owner |
| Qualify | Prospect detail toolbar | Transition CONTACTED -> QUALIFIED | Manager, Admin, Owner |
| Mark Won | Prospect detail toolbar | Transition PROPOSAL_SENT -> WON | Manager, Admin, Owner |
| Mark Lost | Prospect detail action menu | Transition -> LOST with reason | Manager, Admin, Owner |
| Convert to Client | Prospect detail (WON) | Create client record from prospect data | Manager, Admin, Owner |
| + New Bid | Prospect detail / Bids tab | Open bid creation form | Manager, Admin, Owner |
| Edit Bid | Bid detail toolbar | Open bid edit form | Manager, Admin, Owner |
| Submit Bid | Bid detail toolbar | Transition ACTIVE -> SUBMITTED | Manager, Admin, Owner |
| Mark Bid Won | Bid detail toolbar | Transition SUBMITTED -> WON | Manager, Admin, Owner |
| Mark Bid Lost | Bid detail action menu | Transition SUBMITTED -> LOST | Manager, Admin, Owner |
| + New Proposal | Prospect detail / Proposals tab | Open proposal creation form | Manager, Admin, Owner |
| Edit Proposal | Proposal detail toolbar | Open proposal edit form | Manager, Admin, Owner |
| Send Proposal | Proposal detail toolbar | Transition DRAFT -> SENT | Manager, Admin, Owner |
| Mark Signed | Proposal detail toolbar | Transition VIEWED -> SIGNED | Manager, Admin, Owner |
| Mark Rejected | Proposal detail action menu | Transition -> REJECTED | Manager, Admin, Owner |
| Back to Pipeline | Prospect detail breadcrumb | Navigate to `/pipeline` | Any |
| Back to Prospect | Bid/Proposal detail breadcrumb | Navigate to parent prospect detail | Any |
| Filter by Stage | Pipeline filter bar | Filter prospects by status stage | Any |
| Filter by Source | Pipeline filter bar | Filter prospects by lead source | Any |
| View Kanban | Pipeline toolbar | Switch to Kanban board view | Any |
| View List | Pipeline toolbar | Switch to list/table view | Any |
