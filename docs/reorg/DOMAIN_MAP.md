# Domain Map (Round 2)

**Date:** 2026-02-19

---

## Business Spine

**Service DNA -> Bids -> Proposals -> Won -> Contracts -> Tickets -> Time/QA/Inventory/Assets/Safety**

---

## Domain Table

| Domain | Route Files | Total LOC | Module Status | Priority |
|--------|-------------|-----------|---------------|----------|
| **Inventory (approvals)** | 1 | 31 | ✅ COMPLETE (round 1) | — |
| **Webhooks (SendGrid)** | 1 | 56 | ✅ COMPLETE (round 1) | — |
| **Proposals (send)** | 1 | 37 | ✅ COMPLETE (round 1) | — |
| **Counts (submit)** | 1 | 27 | ✅ COMPLETE (round 1) | — |
| **Fleet (DVIR)** | 1 | 31 | ✅ COMPLETE (round 1) | — |
| **Messages** | 1 | 37 | ✅ COMPLETE (round 1) | — |
| **Timekeeping** | 1 | 36 | ✅ COMPLETE (round 1) | — |
| **Schedule (permissions)** | 0 | 0 | ⚠️ STUB (permissions only) | — |
| **Proposals (PDF gen)** | 1 | 443 | ❌ MISSING | P0 |
| **Cron (reminders)** | 1 | 300 | ❌ MISSING | P0 |
| **Public Counts (read + save)** | 2 | 317 | ❌ MISSING | P1 |
| **Public Proposals (read + sign)** | 2 | 241 | ❌ MISSING | P1 |
| **Schedule (periods + trades + availability)** | 13 | 881 | ❌ MISSING | P1 |
| **Inventory (orders/POD)** | 1 | 174 | ❌ MISSING | P2 |
| **Workforce HR** | 1 | 157 | ❌ MISSING | P2 |
| **Inventory (warehouse)** | 1 | 105 | ❌ MISSING | P2 |
| **Proposals (signature)** | 1 | 105 | ❌ MISSING | P2 |
| **Sites (PIN)** | 1 | 104 | ❌ MISSING | P2 |
| **Contracts** | 1 | 77 | ❌ DEFERRED | P3 |
| **Finance (invoices)** | 1 | 81 | ❌ DEFERRED | P3 |
| **Payroll (runs)** | 1 | 77 | ❌ DEFERRED | P3 |
| **Integrations** | 1 | 77 | ❌ DEFERRED | P3 |
| **Issues** | 1 | 86 | ❌ DEFERRED | P3 |

---

## Summary

| Status | Domains | Routes | LOC |
|--------|---------|--------|-----|
| ✅ Extracted (thin delegate) | 7 | 7 | ~255 (thinned) |
| ⚠️ Stub | 1 | 0 | 0 |
| ❌ Needs extraction | 12 | 24 | ~2,827 |
| ❌ Deferred (thin CRUD) | 5 | 5 | ~398 |

**29 of 36 routes** (81%) still have inline business logic.
The largest remaining file is `generate-pdf/route.ts` at **443 LOC**.
