# Form Field Reference — Every Form, Every Field

> Complete tree-branch listing of all 38 form components and their fields.
> Located at `apps/web/src/components/forms/`.

---

## CRM Forms

```
client-form.tsx (wizard + flat edit → clients table)
├── Client Code                  Input, readOnly
├── Name                         Input, required
├── Status                       LookupSelect
├── Client Type                  Select
│   └── Client Type Other        Input (conditional)
├── Industry                     Select
│   └── Industry Other           Input (conditional)
├── Website                      Input
├── Bill To Name                 Input
├── Street                       Input
├── City                         Input
├── State                        Input
├── ZIP                          Input
├── Payment Terms                LookupSelect
├── Invoice Frequency            LookupSelect
├── Credit Limit                 Input, number
├── Tax ID                       Input
├── PO Required                  Checkbox
├── Contract Start               Input, date
├── Contract End                 Input, date
├── Auto-renewal                 Checkbox
├── Insurance Required           Checkbox
├── Insurance Expiry             Input, date
└── Notes                        Textarea
```

```
site-form.tsx (wizard + flat edit → sites table)
├── Site Code                    Input, readOnly
├── Name                         Input, required
├── Client                       Select, required
├── Status                       LookupSelect
├── Site Photo                   FileDropzone
├── Street                       Input
├── City                         Input
├── State                        Input
├── ZIP                          Input
├── Square Footage               Input, number
├── Floors                       Input, number
├── Employees On Site            Input, number
├── Alarm Code                   Input
├── Alarm System                 Input
├── Security Protocol            Input
├── Entry Instructions           Textarea
├── Parking Instructions         Textarea
├── Access Notes                 Textarea
├── Access Window Start          Input, time
├── Access Window End            Input, time
├── Earliest Start Time          Input, time
├── Latest Start Time            Input, time
├── Weekend Access               Checkbox
├── OSHA Compliance Required     Checkbox
├── Background Check Required    Checkbox
├── Janitorial Closet            Input
├── Supply Storage               Input
├── Water Source                  Input
├── Dumpster Location            Input
├── Risk Level                   LookupSelect
├── Priority Level               LookupSelect
└── Notes                        Textarea
```

```
contact-form.tsx (→ contacts table)
├── Contact Code                 Input, required
├── First Name                   Input, required
├── Last Name                    Input, required
├── Contact Type                 Select
├── Role                         Select
├── Company Name                 Input
├── Role/Title                   Input
├── Email                        Input, email
├── Phone                        Input
├── Mobile                       Input
├── Work Phone                   Input
├── Preferred Contact            Select
├── Preferred Language           Select
├── Client                       Select
├── Site                         Select
├── Primary Contact              Checkbox
└── Notes                        Textarea
```

---

## Sales Pipeline Forms

```
prospect-form.tsx (3 sections → sales_prospects + sales_prospect_contacts)
├── Section 1: Company
│   ├── Prospect Code            Input, readOnly (create only)
│   ├── Company Name             Input, required
│   ├── Status                   Select
│   ├── Industry                 Select
│   │   └── Industry Other       Input (conditional)
│   ├── Type of Facility         Select
│   │   └── Facility Type Other  Input (conditional)
│   ├── Estimated Sq Ft          Input, number
│   ├── Source                   Select
│   └── Website                  Input
├── Section 2: Primary Contact
│   ├── Contact Name             Input, required
│   ├── Role / Title             Input
│   ├── Phone                    Input
│   ├── Email                    Input, email
│   ├── Best Time to Call        Input
│   └── Preferred Contact Method Select
└── Section 3: Opportunity
    ├── Estimated Monthly Value  Input, number
    ├── Target Follow-up Date    Input, date
    ├── Priority                 Select
    └── Notes                    Textarea
```

```
opportunity-form.tsx (→ sales_opportunities table)
├── Opportunity Code             Input, readOnly (create only)
├── Name                         Input, required
├── Prospect                     Select, required
├── Stage                        Select
├── Estimated Monthly Value      Input, number
├── Probability (%)              Input, number
├── Target Close Date            Input, date
├── Competitor Notes             Textarea
└── Notes                        Textarea
```

```
production-rate-form.tsx (→ sales_production_rates table)
├── Rate Code                    Input, required
├── Unit                         Select
├── Task Name                    Input, required
├── Base Minutes                 Input, number, required
├── ML Adjustment                Input, number
├── Floor Type                   Select
├── Building Type                Select
├── Active                       Checkbox
└── Notes                        Textarea
```

---

## Operations Forms

```
job-form.tsx (wizard + flat edit → site_jobs + job_tasks)
├── Assignment Section
│   ├── Job Code                 Input, readOnly
│   ├── Job Name                 Input, required
│   ├── Client                   Select, required (wizard only)
│   ├── Site                     Select, required
│   ├── Job Type                 Select
│   ├── Priority                 Select
│   ├── Assigned Team/Supervisor Select
│   ├── Status                   Select
│   └── Service Template         Select
├── Schedule & Billing Section
│   ├── Frequency                Select, required (wizard)
│   ├── Schedule Days            Day-picker buttons
│   ├── Earliest Start Time      Input, time
│   ├── Latest Start Time        Input, time
│   ├── Billing Amount           Input, number
│   ├── Billing Period           Select
│   └── Invoice Description      Textarea
└── Site Blueprint Section
    ├── Security Protocol        Input
    ├── Janitorial Closet        Input
    ├── Supply Storage           Input
    ├── Water Source              Input
    ├── Dumpster Location        Input
    ├── Entry Instructions       Textarea
    ├── Parking Instructions     Textarea
    ├── Access Notes             Textarea
    ├── Special Requirements     Textarea
    ├── Specifications           Textarea
    └── Notes                    Textarea
```

```
work-order-form.tsx (4-step wizard → work_tickets + ticket_assignments)
├── Step 1: Site & Service
│   ├── Site                     Select, required
│   ├── Service Plan             Select, required
│   ├── Priority                 Select
│   ├── Requested By             Input, required
│   └── Scope Details            Textarea, required
├── Step 2: Schedule & Crew
│   ├── Scheduled Date           Input, date, required
│   ├── Start Time               Input, time, required
│   ├── End Time                 Input, time, required
│   ├── Crew Lead                Select, required
│   ├── Crew Size                Input, number, required
│   └── Equipment/Access Notes   Textarea
├── Step 3: Financial & Completion
│   ├── Estimated Hours          Input, number, required
│   ├── Labor Budget             Input, number, required
│   ├── Materials Budget         Input, number, required
│   ├── Completion Template      Select
│   ├── Photo Proof Required     Select
│   └── Completion Notes         Textarea
└── Step 4: Review (display only)
```

```
complaint-form.tsx (→ complaints API)
├── Site                         Select, required
├── Source                       Select
├── Priority                     Select
├── Category                     Select
├── Reported By                  Select
├── Assign To                    Select
├── Reported Staff               Select
├── Reporter Name                Input
├── Customer Message             Textarea
└── (Before/After photos uploaded separately)
```

```
periodic-task-form.tsx (→ /api/operations/periodic-tasks)
├── Site Job                     Select, required
├── Task Type                    Select
├── Description Override         Textarea
├── Frequency                    Select
├── Next Due Date                Input, date, required
├── Custom Interval (days)       Input, number (when frequency=CUSTOM)
├── Preferred Staff              Select
├── Auto-add to Route            Select
├── Evidence Required            Select
├── Status                       Select
└── Notes                        Textarea
```

```
completion-template-form.tsx (→ checklist_templates table)
├── Template Name                Input, required
├── Template Notes               Textarea
├── Require Before/After Photos  Checkbox
├── Require Supervisor Sign-off  Checkbox
└── Require Client Sign-off      Checkbox
```

---

## Route Forms

```
route-template-form.tsx (→ /api/operations/route-templates)
├── Label                        Input, required
├── Weekday                      Select, required
├── Status                       Select
├── Assigned Staff               Select
├── Default Vehicle              Select
├── Default Key Box              Input
└── Notes                        Textarea
```

```
route-template-stop-form.tsx (→ /api/operations/route-templates/{id}/stops)
├── Service Plan                 Select, required
├── Stop Order                   Input, number, required
├── Access Window Start          Input, time
├── Access Window End            Input, time
└── Notes                        Textarea
```

```
route-template-task-form.tsx (→ /api/operations/route-templates/stops/{id}/tasks)
├── Task Type                    Select, required
├── Task Order                   Input, number, required
├── Description Key              Input
├── Evidence Required            Select
├── Description Override         Textarea
└── Delivery Items JSON          Textarea
```

---

## Workforce Forms

```
staff-form.tsx (wizard + flat edit → staff table)
├── Personal Info
│   ├── Staff Code               Input, readOnly
│   ├── Full Name                Input, required
│   ├── First Name               Input
│   ├── Last Name                Input
│   ├── Preferred Name           Input
│   ├── Date of Birth            Input, date
│   ├── Role                     Select, required
│   ├── Status                   Select
│   └── Photo                    FileDropzone
├── Employment
│   ├── Employment Type          Select
│   ├── Hire Date                Input, date
│   ├── Pay Rate                 Input, number
│   ├── Pay Type                 Select
│   ├── Schedule Type            Select
│   ├── Supervisor               Select
│   └── Subcontractor            Checkbox
├── Contact
│   ├── Email                    Input, email
│   ├── Phone                    Input
│   ├── Mobile                   Input
│   ├── Street                   Input
│   ├── City                     Input
│   ├── State                    Input
│   └── ZIP                      Input
└── Emergency & HR
    ├── Emergency Name           Input
    ├── Emergency Phone          Input
    ├── Relationship             Input
    ├── Certifications           Input
    ├── Background Check Date    Input, date
    └── Notes                    Textarea
```

```
position-form.tsx (→ staff_positions table)
├── Position Code                Input, required
├── Title                        Input, required
├── Department                   Input
├── Pay Grade                    Input
├── Status                       Select
├── Color                        Select
└── Notes                        Textarea
```

```
subcontractor-form.tsx (→ subcontractors table)
├── Subcontractor Code           Input, readOnly
├── Company Name                 Input, required
├── Status                       Select
├── Contact Name                 Input
├── Email                        Input, email
├── Phone                        Input
├── Services Provided            Textarea
├── Insurance Expiry             Input, date
├── License Number               Input
└── Notes                        Textarea
```

```
time-off-request-form.tsx (lightweight props-driven)
├── Start Date                   Input, date
├── End Date                     Input, date
├── Type                         Select
└── Reason                       Textarea
```

---

## Inventory & Supply Forms

```
supply-form.tsx (→ supply_catalog table)
├── Code                         Input, required
├── Name                         Input, required
├── Category                     Input
├── Unit                         Input, required
├── Unit Cost ($)                Input, number
├── SDS URL                      Input
└── Notes                        Textarea
```

```
supply-order-form.tsx (multi-step → supply_orders + supply_order_items)
├── Create Mode — Step 1: Setup
│   ├── Order Code               Input, required
│   ├── Site                     Select, required
│   ├── Order Date               Input, date, required
│   └── Estimated Delivery       Input, date
├── Create Mode — Step 2: Build Order
│   ├── Per-line: Order Quantity Input, number (per supply item)
│   ├── Supplier                 Input
│   ├── Vendor ID                Input
│   ├── Delivery Instructions    Textarea
│   └── Notes                    Textarea
└── Edit Mode (flat)
    ├── Order Code               Input, required
    ├── Site                     Select
    ├── Supplier                 Input
    ├── Status                   Select
    ├── Order Date               Input, date, required
    ├── Delivery Date            Input, date
    ├── Total Amount ($)         Input, number
    ├── Delivery Instructions    Textarea
    └── Notes                    Textarea
```

```
supply-request-form.tsx (lightweight props-driven)
├── Item Needed                  Input
├── Quantity                     Input, number
└── Notes                        Textarea
```

```
supply-usage-form.tsx (→ ticket_supply_usage table)
├── Supply                       Select
├── Quantity                     Input, number
├── Unit                         Select
└── Notes                        Input
```

```
supply-vendor-form.tsx (→ subcontractors table as vendor profile)
├── Vendor Profile
│   ├── Company Name             Input, required
│   ├── Account Number           Input
│   ├── Contact Person           Input
│   ├── Phone                    Input
│   ├── Email                    Input, email
│   └── Website                  Input
├── Ordering
│   ├── Payment Terms            Input
│   ├── Order Minimum ($)        Input, number
│   ├── Delivery Schedule        Input
│   └── Account Status           Select
└── Supply Scope
    ├── Categories Supplied      Input (comma-separated)
    └── Notes                    Textarea
```

```
inventory-count-form.tsx (multi-step → inventory_counts + inventory_count_details)
├── Count Code                   Input, required
├── Site                         Select, required
├── Count Date                   Input, date, required
├── Counted By (User)            Select
├── Counted By Name              Input
├── Status                       Select (edit mode only)
└── Notes                        Textarea
```

---

## Equipment & Asset Forms

```
equipment-form.tsx (→ equipment table)
├── Equipment Code               Input, required
├── Name                         Input, required
├── Equipment Type               Input
├── Category                     Input
├── Condition                    Select
├── Manufacturer                 Input
├── Brand                        Input
├── Model Number                 Input
├── Serial Number                Input
├── Purchase Date                Input, date
├── Purchase Price               Input, number
├── Maintenance Schedule         Input
├── Last Maintenance Date        Input, date
├── Next Maintenance Date        Input, date
├── Maintenance Specs            Textarea
└── Notes                        Textarea
```

```
equipment-assignment-form.tsx (→ equipment_assignments table)
├── Equipment                    Select, required
├── Staff                        Select
├── Site                         Select
├── Assigned Date                Input, date, required
├── Returned Date                Input, date
└── Notes                        Textarea
```

```
key-form.tsx (→ key_inventory table)
├── Key Code                     Input, required
├── Label                        Input, required
├── Site                         Select
├── Key Type                     Select
├── Total Count                  Input, number
├── Status                       Select
└── Notes                        Textarea
```

```
vehicle-form.tsx (→ vehicles table)
├── Vehicle Code                 Input, required
├── Name                         Input, required
├── Status                       Select
├── Make                         Input
├── Model                        Input
├── Year                         Input, number
├── Color                        Input
├── License Plate                Input
├── VIN                          Input
└── Notes                        Textarea
```

```
maintenance-form.tsx (→ vehicle_maintenance table)
├── Service Date                 Input, date, required
├── Service Type                 Input, required
├── Description                  Textarea
├── Cost ($)                     Input, number
├── Odometer                     Input, number
├── Performed By                 Input
├── Next Service Date            Input, date
└── Notes                        Textarea
```

---

## Safety & Training Forms

```
training-course-form.tsx (→ training_courses table)
├── Course Code                  Input, required
├── Course Name                  Input, required
├── Description                  Textarea
├── Category                     Input
├── Provider                     Input
├── Duration (hours)             Input, number
├── Recurrence (months)          Input, number
├── Required for all staff       Checkbox
├── Active                       Checkbox
└── Notes                        Textarea
```

---

## Catalog Forms

```
task-form.tsx (→ tasks table)
├── Basic Info
│   ├── Task Code                Input, readOnly
│   ├── Unit                     Select
│   ├── Name                     Input, required
│   ├── Category                 Input
│   └── Subcategory              Input
├── Classification
│   ├── Area Type                Input
│   ├── Floor Type               Input
│   └── Priority                 Select
├── Production & Time
│   ├── Production Rate (sq ft/hr) Input, number
│   ├── Production Rate Text     Input
│   └── Default Minutes          Input, number
├── Descriptions
│   ├── Description              Textarea
│   ├── Step-by-Step Instructions Textarea
│   ├── Spec Description         Textarea
│   ├── Work Description         Textarea
│   └── Tools & Materials        Input
└── Status & Notes
    ├── Active                   Checkbox
    └── Notes                    Textarea
```

---

## Settings Forms

```
lookup-form.tsx (→ lookups table)
├── Category                     Input, required
├── Code                         Input, required
├── Label                        Input, required
├── Sort Order                   Input, number
└── Status                       Select
```

```
geofence-form.tsx (→ geofences table)
├── Site                         Select, required
├── Center Latitude              Input, number, required
├── Center Longitude             Input, number, required
├── Radius (meters)              Input, number, required
└── Status                       Select
```

---

## Lightweight / Inline Forms (props-driven, no Supabase)

```
biohazard-report-form.tsx
├── Location                     Input
├── Hazard Type                  Select
├── Exposure Risk                Select
├── Immediate Actions Taken      Textarea
└── Photo URL                    Input

equipment-issue-form.tsx
├── Equipment                    Input
├── Issue Severity               Select
└── Description                  Textarea

site-issue-form.tsx
├── Location in Building         Input
├── Issue Severity               Select
├── Issue Description            Textarea
└── Photo URL                    Input

resolution-email-preview.tsx
├── Subject                      Input
└── Message                      Textarea
```

---

## Utility Component (not a standalone form)

```
lookup-select.tsx
└── Renders a single Select with database-driven options from the lookups table.
    Used inside client-form, site-form, and other forms as LookupSelect.
    Props: label, required, error, hint, disabled, placeholder, category, value, onChange
```

---

## Summary

| Category | Forms | Total Fields |
|----------|-------|-------------|
| CRM | 3 (client, site, contact) | ~70 |
| Sales Pipeline | 3 (prospect, opportunity, production-rate) | ~28 |
| Operations | 6 (job, work-order, complaint, periodic-task, completion-template, resolution-email) | ~65 |
| Routes | 3 (route-template, stop, task) | ~17 |
| Workforce | 4 (staff, position, subcontractor, time-off-request) | ~38 |
| Inventory & Supply | 6 (supply, supply-order, supply-request, supply-usage, supply-vendor, inventory-count) | ~40 |
| Equipment & Assets | 5 (equipment, equipment-assignment, key, vehicle, maintenance) | ~38 |
| Safety & Training | 1 (training-course) | ~10 |
| Catalog | 1 (task) | ~16 |
| Settings | 2 (lookup, geofence) | ~10 |
| Lightweight/Inline | 4 (biohazard, equipment-issue, site-issue, supply-request) | ~12 |
| Utility | 1 (lookup-select) | — |
| **Total** | **38 files** | **~344 fields** |
