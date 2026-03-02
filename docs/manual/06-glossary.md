# Glossary

> Plain-language definitions. Alphabetical. No jargon.

---

| Term | What It Means |
|------|--------------|
| **Archive** | Soft-delete. The record is hidden but not destroyed. Can be restored by an admin. |
| **Assignment** | A link between a staff member and a work ticket. "Maria is assigned to this shift." |
| **Bid** | A price quote for cleaning services, calculated using CleanFlow math. Part of the sales pipeline. |
| **Card View** | A grid of cards showing entity info (name, status, avatar). Alternative to the list/table view. |
| **Catalog** | The library of tasks and services your company offers. |
| **ChipTabs** | The pill-shaped tab buttons at the top of module pages. Click to switch between views. |
| **Client** | A company you clean for. Each client has one or more sites. |
| **CleanFlow** | The built-in math engine that calculates bid pricing from production rates and square footage. |
| **Command Palette** | The search box that opens with `Cmd+K`. Find anything in the app. |
| **Contact** | A person at a client company. Has name, phone, email. |
| **Coverage** | How many staff are assigned vs. how many are required for a shift. |
| **Detail Page** | The full-screen page for a single record (client, staff, ticket, etc.). Shows all info + edit options. |
| **Density Toggle** | Switch between comfortable (more spacing) and compact (more rows) table layouts. |
| **Employment Type** | How a staff member is employed: FULL_TIME, PART_TIME, CONTRACTOR, etc. |
| **Entity Code** | A human-readable ID like CLI-1001, STF-1042, TKT-0847. Shown in the UI. |
| **Feature Flag** | A toggle that enables/disables a feature. Some features are gated behind flags. |
| **Geofence** | A geographic boundary around a site. Used to verify staff are at the correct location. |
| **Job (Service Plan)** | A recurring cleaning contract for a site. Defines what work happens and how often. |
| **KPI** | Key Performance Indicator. The numbers on the dashboard (tickets today, coverage gaps, etc.). |
| **List View** | A table showing records in rows with sortable columns. The default view. |
| **Lookup** | A configurable dropdown value. Managed in Settings > Lookups. |
| **Module** | A major section of the app (Schedule, Clients, Team, etc.). Each has its own sidebar icon. |
| **Optimistic Locking** | The system checks that nobody else edited the record while you were editing it. Prevents overwriting changes. |
| **Open Shift** | A work ticket with no staff assigned. Shows in the schedule grid as "Empty Shifts." |
| **Position** | A job role type (Floor Specialist, Restroom Specialist, etc.). Staff have position eligibility. |
| **Proposal** | A formal sales document sent to a prospect. Generated as PDF and tracked via email. |
| **Prospect** | A potential client in the sales pipeline. Not yet converted to a Client. |
| **RLS (Row-Level Security)** | Database rules that ensure each tenant only sees their own data. |
| **Recurring Shift** | A shift that repeats on selected days of the week. Created via the shift form. |
| **Schedule Period** | A date range (usually a week) for scheduling. Can be DRAFT, PUBLISHED, or LOCKED. |
| **Service** | A type of cleaning service (Daily Janitorial, Deep Clean, Floor Care, etc.). |
| **Site** | A physical location belonging to a client. Has address, access info, compliance details. |
| **SlideOver** | A panel that slides in from the right side. Used for forms (create/edit). |
| **Soft Delete** | Instead of permanently removing a record, it's marked with `archived_at`. Can be restored. |
| **Status Chips** | The colored filter buttons above tables (ACTIVE, INACTIVE, etc.). Click to filter. |
| **Status Transition** | Moving a record from one status to another (e.g., SCHEDULED → IN_PROGRESS). Some transitions are restricted by role. |
| **Task** | A specific cleaning activity (vacuum carpets, clean restrooms, etc.). Defined in the Catalog. |
| **Tenant** | Your company. All data belongs to a tenant. Each user belongs to exactly one tenant. |
| **Ticket** | See Work Ticket. |
| **Time Entry** | A record of hours worked. Created when staff clock in and out. |
| **UUID** | A unique identifier (like `a0000000-0000-0000-0000-000000000001`). Used internally, not shown to users. |
| **Version Etag** | A unique stamp on every record that changes with each edit. Used for optimistic locking. |
| **View Toggle** | Buttons to switch between List (table) and Card (grid) views. |
| **Work Order** | A one-time or scheduled work request. Managed in Schedule > Work Schedule. |
| **Work Ticket** | A single instance of scheduled work. One ticket = one date + one site + one time slot. |
