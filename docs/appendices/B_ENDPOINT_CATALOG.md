# Appendix B: Endpoint catalog (minimum viable)

This mirrors the OpenAPI skeleton.

## Auth
- GET /me

## CRM
- GET/POST /clients
- GET/PATCH/DELETE /clients/{clientId}
- GET/POST /sites
- GET/PATCH/DELETE /sites/{siteId}
- GET/POST /contacts
- GET/PATCH/DELETE /contacts/{contactId}
- POST /files/signed-upload
- GET /files/{fileId}/signed-download

## Service DNA
- GET/POST /tasks
- GET/PATCH/DELETE /tasks/{taskId}
- GET/POST /services
- GET/PATCH/DELETE /services/{serviceId}
- PUT /services/{serviceId}/tasks

## Pipeline
- GET/POST /prospects
- GET/PATCH/DELETE /prospects/{prospectCode}
- GET/POST /opportunities
- PATCH /opportunities/{opportunityCode}/stage
- GET/POST /bids
- GET/PATCH/DELETE /bids/{bidCode}
- POST /bids/{bidCode}/versions
- POST /bid-versions/{bidVersionId}/calculate

## Proposals
- POST /proposals
- POST /proposals/{proposalId}/pdf
- POST /proposals/{proposalId}/send
- PATCH /proposals/{proposalId}/status

## Webhooks
- POST /webhooks/sendgrid

## Follow-ups
- POST /proposals/{proposalId}/followups/start
- POST /followups/sequences/{sequenceId}/stop

## Conversion
- POST /bid-versions/{bidVersionId}/convert

## Scheduling / Tickets
- GET/POST /tickets
- PATCH /tickets/{ticketId}
- POST /site-jobs/{jobId}/generate-tickets

## Timekeeping
- PUT /sites/{siteId}/geofence
- POST /checkins
- POST /checkouts
- GET/POST /timesheets
- POST /timesheets/{timesheetId}/approve

## Quality
- GET/POST /inspection-templates
- POST /inspections
- POST /sync/inspections

## Reporting
- GET /reports/ops-dashboard
- GET /reports/sales-dashboard
