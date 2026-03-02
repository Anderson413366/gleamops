# Navigation Cheatsheet

> Where everything lives. Print this page if you want a quick reference.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` / `Ctrl+K` | Open command palette (search anything) |
| `?` | Show keyboard shortcuts help |
| `Cmd+Shift+C` | Create new Client |
| `Cmd+Shift+S` | Create new Site |
| `Cmd+Shift+P` | Create new Prospect |
| `Cmd+Shift+J` | Create new Service Plan |
| `Cmd+Shift+T` | Log a Ticket |

---

## Sidebar Modules + Tabs

### 1. Home `/home`
Dashboard with KPI widgets. No sub-tabs.

### 2. Schedule `/schedule`
| Tab | URL | What It Shows |
|-----|-----|--------------|
| Employee Schedule | `/schedule?tab=recurring` | Weekly grid of shift blocks per employee |
| Work Schedule | `/schedule?tab=work-orders` | Work order list with status tracking |
| Calendar | `/schedule?tab=calendar` | Calendar view of all scheduled work |
| Planning Board | `/schedule?tab=planning` | Daily/weekly planning drag-and-drop |
| Master Board | `/schedule?tab=master` | Monday.com-style board (managers) |
| My Route | `/schedule?tab=floater` | Your personal route for today |
| Supervisor | `/schedule?tab=supervisor` | Supervisor dashboard |
| Forms | `/schedule?tab=forms` | Schedule-related form submissions |
| Checklists | `/schedule?tab=checklists` | Shift checklists (admin + field) |
| Leave | `/schedule?tab=leave` | Time-off requests |
| Availability | `/schedule?tab=availability` | Staff availability rules |
| My Schedule | `/schedule?tab=my-schedule` | Your personal schedule |

### 3. Jobs `/jobs`
| Tab | URL | What It Shows |
|-----|-----|--------------|
| Service Plans | `/jobs?tab=service-plans` | Active service plan list |
| Job Log | `/jobs?tab=tickets` | Work ticket log |
| Inspections | `/jobs?tab=inspections` | Quality inspections |
| Time | `/jobs?tab=time` | Time entries for jobs |
| Routes | `/jobs?tab=routes` | Route templates |
| Checklists | `/jobs?tab=checklists` | Job checklists |
| Forms | `/jobs?tab=forms` | Job-related forms |

### 4. Clients `/clients`
| Tab | URL | What It Shows |
|-----|-----|--------------|
| Clients | `/clients?tab=clients` | Client company list |
| Sites | `/clients?tab=sites` | All client sites |
| Contacts | `/clients?tab=contacts` | Client contact people |
| Requests | `/clients?tab=requests` | Change requests |

**Detail Pages:**
- Client detail: `/clients/[client_code]`
- Site detail: `/clients/sites/[site_code]`
- Contact detail: `/clients/contacts/[contact_code]`

### 5. Pipeline `/pipeline`
| Tab | URL | What It Shows |
|-----|-----|--------------|
| Prospects | `/pipeline?tab=prospects` | Sales prospects |
| Opportunities | `/pipeline?tab=opportunities` | Qualified opportunities |
| Bids | `/pipeline?tab=bids` | Bid proposals with CleanFlow math |
| Proposals | `/pipeline?tab=proposals` | Sent proposals and tracking |
| Admin | `/pipeline/admin` | Production rates, follow-up templates, marketing |

### 6. Catalog `/catalog`
| Tab | URL | What It Shows |
|-----|-----|--------------|
| Tasks | `/catalog?tab=tasks` | Task library (cleaning task definitions) |
| Services | `/catalog?tab=services` | Service type definitions |
| Mapping | `/catalog?tab=mapping` | Task-to-service mapping |
| Scope Library | `/catalog?tab=scope-library` | Reusable scope templates |

### 7. Team `/team`
| Tab | URL | What It Shows |
|-----|-----|--------------|
| Staff | `/team?tab=staff` | All staff members |
| Positions | `/team?tab=positions` | Position types and eligibility |
| Attendance | `/team?tab=attendance` | Attendance tracking |
| Timesheets | `/team?tab=timesheets` | Timesheet review and approval |
| Payroll | `/team?tab=payroll` | Payroll export |
| HR | `/team?tab=hr` | HR records (badges, goals, PTO) |
| Microfiber | `/team?tab=microfiber` | Microfiber tracking |
| Subcontractors | `/team?tab=subcontractors` | Subcontractor management |
| Messages | `/team?tab=messages` | Team messages (feature-flagged) |

**Detail Pages:**
- Staff detail: `/team/staff/[staff_code]`
- Position detail: `/team/positions/[position_code]`

### 8. Inventory `/inventory`
| Tab | URL | What It Shows |
|-----|-----|--------------|
| Supplies | `/inventory?tab=supplies` | Supply catalog |
| Kits | `/inventory?tab=kits` | Pre-built supply kits |
| Site Assignments | `/inventory?tab=site-assignments` | Supplies assigned to sites |
| Counts | `/inventory?tab=counts` | Inventory count submissions |
| Orders | `/inventory?tab=orders` | Supply orders |
| Vendors | `/inventory?tab=vendors` | Supply vendors |

### 9. Equipment `/equipment`
| Tab | URL | What It Shows |
|-----|-----|--------------|
| Equipment | `/equipment?tab=equipment` | Equipment inventory |
| Assignments | `/equipment?tab=assignments` | Equipment assigned to staff/sites |
| Keys | `/equipment?tab=keys` | Physical key tracking |
| Vehicles | `/equipment?tab=vehicles` | Vehicle fleet |
| Maintenance | `/equipment?tab=maintenance` | Maintenance schedules |

### 10. Safety `/safety`
| Tab | URL | What It Shows |
|-----|-----|--------------|
| Certifications | `/safety?tab=certifications` | Staff certifications |
| Training | `/safety?tab=training` | Training courses |
| Incidents | `/safety?tab=incidents` | Safety incident reports |
| Calendar | `/safety?tab=calendar` | Safety event calendar |

### 11. Reports `/reports`
| Tab | URL | What It Shows |
|-----|-----|--------------|
| Ops | `/reports?tab=ops` | Operations dashboard |
| Sales | `/reports?tab=sales` | Sales pipeline metrics |
| Financial | `/reports?tab=financial` | Financial overview |
| Quality | `/reports?tab=quality` | Quality inspection metrics |
| Workforce | `/reports?tab=workforce` | Workforce analytics |
| Inventory | `/reports?tab=inventory` | Inventory metrics |

### 12. Settings `/settings`
| Tab | URL | What It Shows |
|-----|-----|--------------|
| General | `/settings?tab=general` | Company profile |
| Lookups | `/settings?tab=lookups` | Dropdown value management |
| Geofences | `/settings?tab=geofences` | Geographic boundaries |
| Rules | `/settings?tab=rules` | Business rules |
| Data Hub | `/settings?tab=data-hub` | Data management |
| Sequences | `/settings?tab=sequences` | Auto-numbering sequences |
| Import | `/settings?tab=import` | Data import tools |
| Schedule | `/settings?tab=schedule-settings` | Schedule configuration |

### 13. Shifts & Time `/shifts-time`
Clock in/out, timesheets, shift management. Role-gated for field staff.

---

## Legacy Routes (Still Work)

These older URLs still function but aren't in the sidebar:

| Old URL | Redirects To / Hosts |
|---------|---------------------|
| `/crm` | Redirects to `/clients` |
| `/crm/clients/[id]` | Client detail (still renders) |
| `/crm/sites/[id]` | Site detail (still renders) |
| `/operations` | Complaints, periodic tasks, task catalog, alerts, night bridge |
| `/workforce` | Field reports |
| `/assets` | Same as `/equipment` |
| `/services` | Same as `/catalog` |
| `/admin` | Lookups, position types, schedule settings, portal |
| `/vendors` | Subcontractors, supply vendors, vendor directory |

---

## Detail Pages (30 Total)

Every detail page follows the same layout:
1. **Back link** ("← Back to [Module]")
2. **Breadcrumb** (Home > Module > Entity Code)
3. **Avatar circle** with name and code
4. **Status badges**
5. **Profile completeness card**
6. **Stat cards** (2-4 key metrics)
7. **Section cards** (key-value details)
8. **Activity history** (audit trail)
9. **Edit button** (opens form in slide-over)
10. **Deactivate/Archive button**

| Entity | URL Pattern |
|--------|------------|
| Client | `/clients/[client_code]` |
| Site | `/clients/sites/[site_code]` |
| Contact | `/clients/contacts/[contact_code]` |
| Prospect | `/pipeline/prospects/[prospect_code]` |
| Opportunity | `/pipeline/opportunities/[opportunity_code]` |
| Bid | `/pipeline/bids/[bid_code]` |
| Proposal | `/pipeline/proposals/[proposal_code]` |
| Service Plan | `/operations/jobs/[job_code]` |
| Ticket | `/operations/tickets/[ticket_code]` |
| Complaint | `/operations/complaints/[complaint_code]` |
| Periodic Task | `/operations/periodic/[periodic_code]` |
| Task Catalog | `/operations/task-catalog/[task_code]` |
| Staff | `/team/staff/[staff_code]` |
| Employee | `/team/employees/[staff_code]` |
| Position | `/team/positions/[position_code]` |
| Field Report | `/workforce/field-reports/[report_code]` |
| Supply | `/inventory/supplies/[supply_code]` |
| Inventory Count | `/inventory/counts/[count_code]` |
| Equipment | `/assets/equipment/[equipment_code]` |
| Vehicle | `/assets/vehicles/[vehicle_code]` |
| Key | `/assets/keys/[key_code]` |
| Task | `/services/tasks/[task_code]` |
| Subcontractor | `/vendors/subcontractors/[subcontractor_code]` |
| Supply Vendor | `/vendors/supply-vendors/[slug]` |
