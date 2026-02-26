# P0: Requirements Traceability Matrix

Maps documentation specs (docs 00–23 + appendices) to implementation status.

---

## Current Status Override (2026-02-26)

This file was originally created as a P0 baseline snapshot. The implementation status below supersedes the original baseline matrix for current execution decisions.

| Program Area | Current Status | Evidence |
|---|---|---|
| Monday replacement phases 1-8 | DONE | Migrations `00089`-`00099`, web modules/routes, mobile route flow, portal/dashboard features |
| PT-BR i18n completion | DONE | `packages/shared/src/i18n.ts` has EN/ES/PT-BR key parity (479 keys each for EN/ES/PT-BR) |
| Supabase rollout state | DONE | Linked project migration parity through `00099` |
| Web production rollout | DONE | `gleamops.vercel.app` deployed and smoke-validated |
| Mobile production rollout | PARTIAL | Android build requested; iOS release pending Apple Developer setup |

### Read Me First

- Use `docs/MONDAY_REPLACEMENT_PLAN.md` for phase-by-phase functional scope and implementation details.
- Use `docs/20_VERIFICATION_CHECKLIST.md` for current release gates and blockers.
- Use `docs/execution/one-shot-remaining-checklist.md` for sprint execution tracking.

### Historical Baseline

The matrices below remain as the original P0 baseline record and are intentionally preserved for historical comparison.

---

## Section 1: Doc-to-Feature Mapping

| Doc | Title | Status | Notes |
|-----|-------|--------|-------|
| 00 | Executive Summary | N/A | Reference doc, no features |
| 00 | Master Dev Plan | N/A | Reference doc, no features |
| 01 | Product Scope | PARTIAL | Core entities done; mobile, messaging, reporting gaps |
| 02 | UX Rules (ADHD) | DONE | Chip tabs, search, wizard forms, collapsible cards |
| 03 | Architecture | DONE | Monorepo, SSR, Supabase, RBAC, multi-tenant |
| 04 | Data Model | DONE | 103 tables, 49 migrations, StandardColumns pattern |
| 05 | Security & RLS | DONE | RLS on all tables, JWT roles, soft delete |
| 06 | API Contract | PARTIAL | Supabase SDK queries done; no REST API layer yet |
| 07 | Error Catalog | DONE | ProblemDetails (RFC 9457), error codes |
| 08 | Workflows | PARTIAL | Bid→conversion done; ticket lifecycle partial |
| 09 | CleanFlow Engine | DONE | Workload + pricing + production rates |
| 10 | Proposals & Email | DONE | SendGrid integration, templates, follow-up |
| 11 | Operations & Tickets | PARTIAL | Ticket CRUD done; assignment workflow partial |
| 12 | Timekeeping | PARTIAL | Tables + events done; geofence auto clock-in NOT_STARTED |
| 13 | Quality (Inspections) | PARTIAL | Templates + inspections tables done; mobile form NOT_STARTED |
| 14 | Inventory, Assets, Safety | DONE | Supply catalog, kits, equipment, vehicles, keys, certifications, training |
| 15 | Search & Performance | PARTIAL | Client-side search done; full-text search index NOT_STARTED |
| 16 | Testing & QA | NOT_STARTED | 1 test file; no test infrastructure — P0-C6 adds Vitest |
| 17 | Migration Strategy | DONE | 49 ordered migrations, no renames/drops |
| 18 | AI Developer Runbook | DONE | CLAUDE.md, dev guide |
| 18 | Operations Runbooks | PARTIAL | Hard delete procedure (P0); monitoring NOT_STARTED |
| 19 | AI Agent Prompts | DONE | Reference doc |
| 19 | JIRA Backlog | N/A | External tool, not tracked here |
| 20 | ADR Log | DONE | Decision records maintained |
| 20 | Verification Checklist | DONE | Build + typecheck passing |
| 21 | Claude Code God Prompt | DONE | Reference doc |
| 21 | Messaging | NOT_STARTED | `messaging_v1` feature flag created |
| 22 | Reporting & Dashboards | NOT_STARTED | `reports/` route exists but orphaned |
| 23 | Mobile & Offline | NOT_STARTED | `mobile_inspections` feature flag created |

### Summary

| Status | Count |
|--------|-------|
| DONE | 14 |
| PARTIAL | 8 |
| NOT_STARTED | 4 |
| N/A | 3 |

---

## Section 2: Entity Completeness Matrix

Status key: Y = exists, N = missing, P = partial, — = not applicable

| Entity | Type | Schema | Migration | Table | Form | Detail | Card | Status |
|--------|------|--------|-----------|-------|------|--------|------|--------|
| Client | Y | Y | Y | Y | Y | Y | Y | DONE |
| Site | Y | Y | Y | Y | Y | Y | Y | DONE |
| Contact | Y | Y | Y | Y | Y | Y | N | DONE |
| Task | Y | Y | Y | Y | Y | Y | N | DONE |
| Service | Y | Y | Y | Y | Y | Y | N | DONE |
| Prospect | Y | Y | Y | Y | Y | Y | N | DONE |
| Opportunity | Y | Y | Y | Y | Y | Y | N | DONE |
| Bid | Y | Y | Y | Y | Y | Y | N | DONE |
| BidVersion | Y | N | Y | Y | N | P | N | PARTIAL |
| BidArea | Y | N | Y | Y | P | P | N | PARTIAL |
| BidAreaTask | Y | N | Y | Y | P | N | N | PARTIAL |
| BidSchedule | Y | N | Y | Y | P | N | N | PARTIAL |
| BidLaborRates | Y | N | Y | Y | P | N | N | PARTIAL |
| BidBurden | Y | N | Y | Y | P | N | N | PARTIAL |
| Proposal | Y | N | Y | Y | Y | Y | N | DONE |
| ProposalPricingOption | Y | N | Y | Y | P | N | N | PARTIAL |
| ProposalSend | Y | N | Y | Y | N | N | N | PARTIAL |
| FollowupSequence | Y | N | Y | Y | N | N | N | PARTIAL |
| Staff | Y | Y | Y | Y | Y | Y | Y | DONE |
| StaffPosition | Y | Y | Y | Y | Y | Y | N | DONE |
| SiteJob | Y | Y | Y | Y | Y | Y | N | DONE |
| WorkTicket | Y | N | Y | Y | Y | Y | Y | PARTIAL |
| TicketAssignment | Y | N | Y | Y | N | N | N | PARTIAL |
| ChecklistTemplate | Y | N | Y | Y | N | N | N | NOT_STARTED |
| Inspection | Y | N | Y | Y | N | N | N | NOT_STARTED |
| InspectionTemplate | Y | N | Y | Y | N | N | N | NOT_STARTED |
| Geofence | Y | N | Y | Y | N | N | N | NOT_STARTED |
| TimeEntry | Y | N | Y | Y | Y | N | N | PARTIAL |
| TimeException | Y | N | Y | Y | N | N | N | NOT_STARTED |
| Timesheet | Y | N | Y | Y | Y | N | N | PARTIAL |
| TimesheetApproval | Y | N | Y | Y | N | N | N | NOT_STARTED |
| SupplyCatalog | Y | Y | Y | Y | Y | Y | N | DONE |
| SupplyKit | Y | N | Y | Y | N | N | N | NOT_STARTED |
| Vehicle | Y | Y | Y | Y | Y | Y | N | DONE |
| KeyInventory | Y | Y | Y | Y | Y | Y | N | DONE |
| Equipment | Y | Y | Y | Y | Y | Y | N | DONE |
| EquipmentAssignment | Y | Y | Y | Y | Y | N | N | DONE |
| VehicleMaintenance | Y | Y | Y | Y | Y | N | N | DONE |
| SupplyOrder | Y | Y | Y | Y | Y | Y | N | DONE |
| InventoryCount | Y | Y | Y | Y | Y | Y | N | DONE |
| Subcontractor | Y | Y | Y | Y | Y | Y | N | DONE |
| StaffCertification | Y | Y | Y | Y | Y | Y | N | DONE |
| SafetyDocument | Y | Y | Y | Y | Y | Y | N | DONE |
| TrainingCourse | Y | Y | Y | Y | Y | Y | N | DONE |
| TrainingCompletion | Y | Y | Y | Y | N | N | N | PARTIAL |
| JobLog | Y | Y | Y | Y | Y | Y | N | DONE |
| JobTask | Y | N | Y | Y | P | N | N | PARTIAL |
| JobStaffAssignment | Y | Y | Y | Y | Y | N | N | DONE |
| BidSite | Y | Y | Y | Y | Y | N | N | DONE |
| BidGeneralTask | Y | Y | Y | Y | Y | N | N | DONE |
| ProductionRate | Y | Y | Y | Y | Y | N | N | DONE |
| BidConsumables | Y | Y | Y | Y | Y | N | N | DONE |
| BidOverhead | Y | Y | Y | Y | Y | N | N | DONE |
| BidPricingStrategy | Y | Y | Y | Y | Y | N | N | DONE |
| ProposalAttachment | Y | N | Y | Y | N | N | N | NOT_STARTED |
| ProposalSignature | Y | N | Y | Y | N | N | N | NOT_STARTED |
| FollowupTemplate | Y | N | Y | Y | N | N | N | NOT_STARTED |
| MarketingInsert | Y | N | Y | Y | N | N | N | NOT_STARTED |
| UserProfile | Y | N | Y | Y | Y | N | N | PARTIAL |
| VehicleCheckout | Y | N | Y | Y | N | N | N | NOT_STARTED |
| KeyEventLog | Y | N | Y | Y | N | N | N | NOT_STARTED |

### Summary

| Status | Count |
|--------|-------|
| DONE | 31 |
| PARTIAL | 16 |
| NOT_STARTED | 14 |

---

## Section 3: Feature Flag → Domain Mapping

| Feature Flag | Domain | Gates |
|-------------|--------|-------|
| `schema_parity` | Data Model | Remaining type/schema alignment, `as unknown as` reduction, Zod schema additions |
| `bid_specialization` | Sales | Bid engine v2 features: multi-site bids, specialized production rates, advanced labor modeling |
| `proposal_studio_v2` | Sales | Proposal editor redesign: WYSIWYG, template library, advanced pricing options |
| `ops_geofence_auto` | Operations | Automatic geofence-based clock-in/out via mobile GPS |
| `messaging_v1` | Communications | In-app messaging between staff, managers, and clients |
| `mobile_inspections` | Quality | Mobile-first inspection forms with photo capture, offline support |

### What Each Flag Protects

**`schema_parity`**
- New Zod schemas for 59 unvalidated types
- `as unknown as` cast elimination (where possible)
- Type-safe Supabase query helpers

**`bid_specialization`**
- Multi-site bid workflow
- Per-area task customization
- Advanced burden/overhead modeling
- Market-rate pricing adjustments

**`proposal_studio_v2`**
- Rich text proposal editor
- Template management UI
- PDF generation pipeline
- E-signature integration

**`ops_geofence_auto`**
- GPS-triggered clock-in/out
- Geofence management UI improvements
- Auto-assignment based on proximity
- Location history tracking

**`messaging_v1`**
- Staff-to-manager messaging
- Client communication portal
- Notification preferences
- Message threading and search

**`mobile_inspections`**
- Mobile inspection form renderer
- Photo capture and annotation
- Offline data sync
- Inspection scoring and reporting
