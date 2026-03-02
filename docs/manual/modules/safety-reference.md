# Safety Module Reference

## Field Dictionary

### Certification

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique certification identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| staff_id | UUID | Yes | Valid staff | Staff member holding the certification |
| cert_type | string | Yes | 1-200 chars | Certification type (e.g. "OSHA 10", "Bloodborne Pathogens") |
| status | Enum | Yes | Valid CERT_STATUS | Current certification status |
| issued_date | date | Yes | Valid date | Date certification was issued |
| expiry_date | date | No | >= issued_date | Date certification expires |
| issuing_body | string | No | 1-200 chars | Organization that issued the certification |
| certificate_number | string | No | 1-100 chars | Certificate ID or number |
| document_url | string | No | Valid URL | Link to uploaded certificate document |
| notes | text | No | Max 1000 chars | Certification notes |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

### Safety Issue

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique issue identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| title | string | Yes | 1-200 chars | Issue title or summary |
| description | text | Yes | 1-5000 chars | Detailed description of the safety issue |
| priority | Enum | Yes | Valid ISSUE_PRIORITY | Severity level |
| status | Enum | Yes | Valid ISSUE_STATUS | Current issue status |
| site_id | UUID | No | Valid site | Site where issue occurred |
| reported_by | UUID | Yes | Valid staff ID | Staff member who reported the issue |
| reported_date | date | Yes | Valid date | Date issue was reported |
| assigned_to | UUID | No | Valid staff ID | Staff member responsible for resolution |
| resolved_date | date | No | Valid date | Date issue was resolved |
| resolution_notes | text | No | Max 2000 chars | Description of how issue was resolved |
| photos | string[] | No | Valid URLs | Uploaded photos documenting the issue |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

### Incident Report

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | UUID | Auto | System-generated | Unique incident identifier |
| tenant_id | UUID | Auto | Valid tenant | Owning tenant |
| title | string | Yes | 1-200 chars | Incident title |
| description | text | Yes | 1-5000 chars | Full incident description |
| incident_date | date | Yes | Valid date | Date of the incident |
| incident_time | time | No | Valid time | Time of the incident |
| site_id | UUID | No | Valid site | Site where incident occurred |
| involved_staff | UUID[] | No | Valid staff IDs | Staff involved in the incident |
| injury_occurred | boolean | Yes | true/false | Whether an injury resulted |
| injury_description | text | No | Max 2000 chars | Description of injuries if any |
| corrective_action | text | No | Max 2000 chars | Actions taken to prevent recurrence |
| reported_by | UUID | Yes | Valid staff ID | Person filing the report |
| created_at | timestamp | Auto | System-generated | Record creation time |
| updated_at | timestamp | Auto | System-generated | Last modification time |

## Statuses / Enums

### CERT_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| PENDING | yellow | Certification is in progress or awaiting verification | ACTIVE, REVOKED |
| ACTIVE | green | Certification is current and valid | EXPIRED, REVOKED |
| EXPIRED | red | Certification has passed its expiry date | ACTIVE (via renewal) |
| REVOKED | orange | Certification has been revoked or invalidated | -- |

### ISSUE_PRIORITY

| Priority | Color | Description | Transitions To |
|----------|-------|-------------|----------------|
| LOW | gray | Minor issue, no immediate risk | Any |
| MEDIUM | yellow | Moderate concern, should be addressed soon | Any |
| HIGH | orange | Significant safety risk, requires prompt action | Any |
| CRITICAL | red | Immediate danger, requires emergency response | Any |

### ISSUE_STATUS

| Status | Color | Description | Transitions To |
|--------|-------|-------------|----------------|
| OPEN | red | Issue has been reported and needs attention | IN_PROGRESS, AWAITING_CLIENT, RESOLVED |
| IN_PROGRESS | yellow | Issue is actively being worked on | AWAITING_CLIENT, RESOLVED, CLOSED |
| AWAITING_CLIENT | blue | Resolution depends on client action or response | IN_PROGRESS, RESOLVED, CLOSED |
| RESOLVED | green | Issue has been resolved | CLOSED |
| CLOSED | gray | Issue has been closed (resolved or not actionable) | -- |

## Button Inventory

| Button Label | Location | Action | Role Required |
|--------------|----------|--------|---------------|
| + New Certification | Certifications tab toolbar | Open certification creation form | Manager, Admin, Owner |
| Edit Certification | Cert detail toolbar | Open certification edit form | Manager, Admin, Owner |
| Renew | Cert detail toolbar (EXPIRED) | Create renewal with new dates | Manager, Admin, Owner |
| Revoke | Cert detail action menu | Transition -> REVOKED | Admin, Owner |
| + Report Issue | Issues tab toolbar | Open safety issue creation form | Any |
| Edit Issue | Issue detail toolbar | Open issue edit form | Manager, Admin, Owner |
| Assign | Issue detail toolbar | Assign staff to investigate/resolve | Manager, Admin, Owner |
| Start Work | Issue detail toolbar | Transition OPEN -> IN_PROGRESS | Manager, Admin, Owner |
| Awaiting Client | Issue detail toolbar | Transition -> AWAITING_CLIENT | Manager, Admin, Owner |
| Resolve | Issue detail toolbar | Transition -> RESOLVED | Manager, Admin, Owner |
| Close | Issue detail toolbar | Transition RESOLVED -> CLOSED | Manager, Admin, Owner |
| + New Incident | Incidents tab toolbar | Open incident report form | Any |
| Edit Incident | Incident detail toolbar | Open incident edit form | Manager, Admin, Owner |
| View Staff | Cert/Incident staff link | Navigate to staff detail page | Any |
| View Site | Issue/Incident site link | Navigate to site detail page | Any |
| Back to Safety | Detail page breadcrumb | Navigate to `/safety` | Any |
| Filter by Priority | Issues list filter bar | Filter issues by priority | Any |
| Filter by Status | Issues list filter bar | Filter issues by status | Any |
| Expiring Soon | Certifications filter | Show certs expiring within 30 days | Any |
| Export Report | Safety dashboard toolbar | Download safety report as PDF | Manager, Admin, Owner |
