#!/usr/bin/env python3
"""
Import data from Anderson_Cleaning_Database_UPDATED_Feb2026.xlsx into GleamOps Supabase.
Steps:
  1. Delete all existing test/sample data (respecting FK order)
  2. Import real data from Excel (respecting FK order)
"""

import openpyxl
import json
import urllib.request
import urllib.error
import uuid
import sys
import os
from datetime import datetime, date

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
TENANT_ID = os.environ.get('TENANT_ID', 'a0000000-0000-0000-0000-000000000001')
EXCEL_PATH = os.environ.get('EXCEL_PATH', './spreadsheets/Anderson_Cleaning_Database_UPDATED_Feb2026.xlsx')

if not SUPABASE_URL or not SERVICE_KEY:
    print('ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
    print('  export SUPABASE_URL="https://your-project.supabase.co"')
    print('  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"')
    sys.exit(1)

HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
}

# ── Helpers ───────────────────────────────────────────────────────────────────
def api(method, table, data=None, params=''):
    url = f'{SUPABASE_URL}/rest/v1/{table}{params}'
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    try:
        resp = urllib.request.urlopen(req)
        if resp.status in (200, 201):
            body_text = resp.read().decode()
            return json.loads(body_text) if body_text.strip() else None
        return None
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f'  ERROR {method} {table}: {e.code} - {error_body[:300]}')
        return None

def delete_all(table):
    """Delete all rows from a table using service role (bypasses RLS)."""
    url = f'{SUPABASE_URL}/rest/v1/{table}?id=not.is.null'
    req = urllib.request.Request(url, headers=HEADERS, method='DELETE')
    try:
        resp = urllib.request.urlopen(req)
        print(f'  Deleted from {table}')
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        if '404' in str(e.code):
            print(f'  {table}: table not found, skipping')
        else:
            print(f'  ERROR deleting {table}: {e.code} - {error_body[:200]}')

def batch_insert(table, rows, batch_size=100):
    """Insert rows in batches."""
    if not rows:
        print(f'  {table}: 0 rows, skipping')
        return 0
    total = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        url = f'{SUPABASE_URL}/rest/v1/{table}'
        body = json.dumps(batch).encode()
        h = dict(HEADERS)
        h['Prefer'] = 'return=minimal,resolution=ignore-duplicates'
        req = urllib.request.Request(url, data=body, headers=h, method='POST')
        try:
            urllib.request.urlopen(req)
            total += len(batch)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode()
            print(f'  ERROR inserting {table} batch {i//batch_size}: {error_body[:400]}')
            # Try one by one
            for row in batch:
                try:
                    req2 = urllib.request.Request(url, data=json.dumps(row).encode(), headers=h, method='POST')
                    urllib.request.urlopen(req2)
                    total += 1
                except urllib.error.HTTPError as e2:
                    err = e2.read().decode()
                    code_val = row.get(next((k for k in row if 'code' in k.lower()), 'id'), '?')
                    print(f'    SKIP {table} row {code_val}: {err[:200]}')
    print(f'  {table}: {total}/{len(rows)} rows inserted')
    return total

def read_sheet(wb, sheet_name):
    """Read sheet into list of dicts using header row."""
    if sheet_name not in wb.sheetnames:
        return []
    ws = wb[sheet_name]
    headers = []
    for c in range(1, ws.max_column + 1):
        v = ws.cell(1, c).value
        if v:
            headers.append(str(v).strip())
        else:
            headers.append(f'_col{c}')

    rows = []
    for r in range(2, ws.max_row + 1):
        row = {}
        has_data = False
        for c, h in enumerate(headers, 1):
            v = ws.cell(r, c).value
            if v is not None:
                has_data = True
            row[h] = v
        if has_data:
            rows.append(row)
    return rows

def clean_str(v):
    """Clean string value."""
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None

def clean_date(v):
    """Convert Excel date to ISO string."""
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.strftime('%Y-%m-%d')
    if isinstance(v, date):
        return v.strftime('%Y-%m-%d')
    s = str(v).strip()
    if not s or s in ('N/A', 'n/a', 'None', ''):
        return None
    # Try common formats
    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%m/%d/%y', '%Y-%m-%dT%H:%M:%S'):
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None

def clean_num(v, default=None):
    """Convert to number."""
    if v is None:
        return default
    if isinstance(v, (int, float)):
        return v
    s = str(v).strip().replace(',', '').replace('$', '')
    if not s or s in ('N/A', 'n/a', 'None', '-', ''):
        return default
    try:
        return float(s)
    except ValueError:
        return default

def clean_bool(v, default=True):
    """Convert to boolean."""
    if v is None:
        return default
    if isinstance(v, bool):
        return v
    s = str(v).strip().upper()
    if s in ('TRUE', 'YES', '1', 'Y', 'ACTIVE'):
        return True
    if s in ('FALSE', 'NO', '0', 'N', 'INACTIVE'):
        return False
    return default

def gen_uuid():
    return str(uuid.uuid4())


# ── Step 1: Delete all existing data ─────────────────────────────────────────
def delete_all_data():
    print('\n=== STEP 1: Deleting all existing test data ===\n')

    # Delete in reverse FK order (children first, parents last)
    delete_order = [
        # Sales pipeline children
        'sales_followup_sends', 'sales_followup_sequences',
        'sales_email_events', 'sales_proposal_sends',
        'sales_proposal_marketing_inserts', 'sales_proposal_attachments',
        'sales_proposal_signatures', 'sales_proposal_pricing_options',
        'sales_proposals',
        'sales_bid_pricing_results', 'sales_bid_workload_results',
        'sales_bid_burden', 'sales_bid_labor_rates', 'sales_bid_schedule',
        'sales_bid_area_tasks', 'sales_bid_areas',
        'sales_bid_sites', 'sales_bid_general_tasks',
        'sales_bid_consumables', 'sales_bid_supply_allowances',
        'sales_bid_supply_kits', 'sales_bid_equipment_plan_items',
        'sales_bid_overhead', 'sales_bid_pricing_strategy',
        'sales_bid_versions', 'sales_bids',
        'sales_opportunities', 'sales_prospect_contacts', 'sales_prospects',
        'sales_marketing_inserts', 'sales_followup_templates',
        'sales_production_rates',
        # Conversion / Operations
        'sales_conversion_events', 'sales_bid_conversions',
        'ticket_asset_checkouts', 'site_asset_requirements',
        'ticket_photos', 'ticket_checklist_items', 'ticket_checklists',
        'checklist_template_items', 'checklist_templates',
        'ticket_assignments', 'work_tickets', 'recurrence_rules',
        # Inspections
        'inspection_issues', 'inspection_items', 'inspections',
        'inspection_template_items', 'inspection_templates',
        # Timekeeping
        'timesheet_approvals', 'timesheets',
        'time_exceptions', 'time_entries', 'time_events',
        'alerts', 'geofences',
        # Training / Safety
        'training_completions', 'training_courses',
        'safety_documents', 'key_event_log',
        'vehicle_checkouts', 'pay_rate_history', 'staff_certifications',
        'user_access_grants', 'user_team_memberships',
        # Inventory / Assets
        'inventory_count_details', 'inventory_counts',
        'supply_kit_items', 'supply_kits',
        'supply_orders', 'vehicle_maintenance',
        'equipment_assignments', 'equipment',
        'key_inventory', 'vehicles',
        'site_supplies', 'supply_catalog',
        # Staff / Jobs
        'job_staff_assignments', 'job_tasks', 'job_logs', 'site_jobs',
        'subcontractors', 'staff_positions',
        # CRM
        'timeline_events', 'contacts',
        'service_tasks', 'task_production_rates', 'tasks', 'services',
        'sites', 'clients', 'staff',
        # User/RBAC
        'user_profiles', 'user_client_access',
        # System (keep tenants, tenant_memberships, system_sequences, lookups, status_transitions)
        'audit_events', 'notifications', 'files',
    ]

    for table in delete_order:
        delete_all(table)

    # Also clear lookups and status_transitions (will re-seed)
    delete_all('lookups')
    delete_all('status_transitions')

    print('\n  All existing data deleted.')


# ── Step 2: Import Excel data ────────────────────────────────────────────────
def import_data():
    print('\n=== STEP 2: Importing Excel data ===\n')

    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)

    # ID maps: Excel code → Supabase UUID
    client_ids = {}   # client_code → uuid
    site_ids = {}     # site_code → uuid
    staff_ids = {}    # staff_code → uuid
    service_ids = {}  # service_code → uuid
    task_ids = {}     # task_code → uuid
    job_ids = {}      # job_code → uuid
    supply_ids = {}   # supply_code → uuid
    position_ids = {} # position_code → uuid

    # ── 2a. Lookups ──────────────────────────────────────────────────────
    print('Importing lookups...')
    lookup_rows = read_sheet(wb, 'Lookups')
    lookups = []
    for r in lookup_rows:
        cat = clean_str(r.get('Category'))
        code = clean_str(r.get('Code'))
        label = clean_str(r.get('Value'))
        if not cat or not code or not label:
            continue
        lookups.append({
            'id': gen_uuid(),
            'tenant_id': None,  # Global lookups
            'category': cat,
            'code': code,
            'label': label,
            'sort_order': int(clean_num(r.get('Sort'), 0)),
            'is_active': clean_bool(r.get('Active')),
        })
    batch_insert('lookups', lookups)

    # ── 2b. Status Rules → status_transitions ────────────────────────────
    print('Importing status transitions...')
    status_rows = read_sheet(wb, 'Status Rules')
    transitions = []
    for r in status_rows:
        entity = clean_str(r.get('Entity'))
        code = clean_str(r.get('Status Code'))
        label = clean_str(r.get('Status Label'))
        if not entity or not code:
            continue
        # Add as lookups too
        cat = f'{entity.lower()}_status'
        lookups.append({
            'id': gen_uuid(),
            'tenant_id': None,
            'category': cat,
            'code': code,
            'label': label or code,
            'sort_order': int(clean_num(r.get('Sort'), 0)),
            'is_active': clean_bool(r.get('Active')),
        })
    # Re-insert lookups with status rules added
    # (skip — the lookups are already inserted; status rules as lookups would duplicate)

    # ── 2c. Staff Positions ──────────────────────────────────────────────
    print('Importing staff positions...')
    pos_rows = read_sheet(wb, 'Staff Position')
    positions = []
    for r in pos_rows:
        code = clean_str(r.get('Position Code'))
        title = clean_str(r.get('Position Name'))
        if not code or not title:
            continue
        pid = gen_uuid()
        position_ids[code] = pid
        positions.append({
            'id': pid,
            'tenant_id': TENANT_ID,
            'position_code': code,
            'title': title,
            'pay_grade': clean_str(r.get('Skill Level')),
            'notes': clean_str(r.get('Notes')),
            'is_active': clean_bool(r.get('Is Active')),
        })
    batch_insert('staff_positions', positions)

    # ── 2d. Services ─────────────────────────────────────────────────────
    print('Importing services...')
    svc_rows = read_sheet(wb, 'Service')
    services = []
    for r in svc_rows:
        code = clean_str(r.get('Service Code'))
        name = clean_str(r.get('Service Name'))
        if not code or not name:
            continue
        sid = gen_uuid()
        service_ids[code] = sid
        services.append({
            'id': sid,
            'tenant_id': TENANT_ID,
            'service_code': code,
            'name': name,
            'description': clean_str(r.get('Description')),
        })
    batch_insert('services', services)

    # ── 2e. Tasks ────────────────────────────────────────────────────────
    print('Importing tasks...')
    task_rows = read_sheet(wb, 'Task')
    tasks = []
    for r in task_rows:
        code = clean_str(r.get('Task Code'))
        name = clean_str(r.get('Task Name'))
        if not code or not name:
            continue
        tid = gen_uuid()
        task_ids[code] = tid
        prod_rate = clean_num(r.get('Production Rate'))
        tasks.append({
            'id': tid,
            'tenant_id': TENANT_ID,
            'task_code': code,
            'name': name,
            'category': clean_str(r.get('Category')),
            'unit_code': clean_str(r.get('Default UOM')) or 'SQFT_1000',
            'production_rate_sqft_per_hour': prod_rate,
        })
    batch_insert('tasks', tasks)

    # ── 2f. Service Tasks ────────────────────────────────────────────────
    print('Importing service tasks...')
    st_rows = read_sheet(wb, 'Service Task')
    service_tasks = []
    for r in st_rows:
        svc_code = clean_str(r.get('Service Code'))
        tsk_code = clean_str(r.get('Task Code'))
        if not svc_code or not tsk_code:
            continue
        sid = service_ids.get(svc_code)
        tid = task_ids.get(tsk_code)
        if not sid or not tid:
            continue
        freq = clean_str(r.get('Typical Frequency')) or 'DAILY'
        # Normalize frequency
        freq_map = {
            'Daily': 'DAILY', 'Weekly': 'WEEKLY', 'Monthly': 'MONTHLY',
            'Bi-Weekly': 'BIWEEKLY', 'As Needed': 'AS_NEEDED',
            '2x Weekly': '2X_WEEK', '3x Weekly': '3X_WEEK', '5x Weekly': '5X_WEEK',
        }
        freq = freq_map.get(freq, freq.upper().replace(' ', '_').replace('-', '_'))
        service_tasks.append({
            'id': gen_uuid(),
            'tenant_id': TENANT_ID,
            'service_id': sid,
            'task_id': tid,
            'frequency_default': freq,
        })
    batch_insert('service_tasks', service_tasks)

    # ── 2g. Clients ──────────────────────────────────────────────────────
    print('Importing clients...')
    cli_rows = read_sheet(wb, 'Client')
    clients = []
    for r in cli_rows:
        code = clean_str(r.get('Client Code'))
        name = clean_str(r.get('Client Name'))
        if not code or not name:
            continue
        cid = gen_uuid()
        client_ids[code] = cid

        status = clean_str(r.get('Client Status')) or 'ACTIVE'
        status_map = {'Active': 'ACTIVE', 'Inactive': 'INACTIVE', 'On Hold': 'ON_HOLD',
                       'Prospect': 'PROSPECT', 'Cancelled': 'CANCELED', 'Canceled': 'CANCELED'}
        status = status_map.get(status, status.upper().replace(' ', '_'))

        billing_addr = {}
        if clean_str(r.get('Billing Address')):
            billing_addr = {
                'street': clean_str(r.get('Billing Address')),
                'suite': clean_str(r.get('Suite/Unit')),
                'city': clean_str(r.get('Billing City')),
                'state': clean_str(r.get('Billing State')),
                'zip': clean_str(r.get('Billing Zip')),
            }

        clients.append({
            'id': cid,
            'tenant_id': TENANT_ID,
            'client_code': code,
            'name': name,
            'status': status,
            'billing_address': billing_addr if billing_addr else None,
            'notes': clean_str(r.get('Notes')),
        })
    batch_insert('clients', clients)

    # ── 2h. Sites ────────────────────────────────────────────────────────
    print('Importing sites...')
    site_rows = read_sheet(wb, 'Site')
    sites = []
    for r in site_rows:
        code = clean_str(r.get('Site Code'))
        name = clean_str(r.get('Site Name'))
        if not code or not name:
            continue

        client_code = clean_str(r.get('Client Code'))
        client_id = client_ids.get(client_code)
        if not client_id:
            continue  # Skip orphaned sites

        sid = gen_uuid()
        site_ids[code] = sid

        status = clean_str(r.get('Site Status')) or 'ACTIVE'
        status_map = {'Active': 'ACTIVE', 'Inactive': 'INACTIVE', 'On Hold': 'ON_HOLD',
                       'Canceled': 'CANCELED', 'Cancelled': 'CANCELED'}
        status = status_map.get(status, status.upper().replace(' ', '_'))

        address = {}
        street = clean_str(r.get('Street Address'))
        if street:
            address = {
                'street': street,
                'suite': clean_str(r.get('Suite/Unit')),
                'city': clean_str(r.get('City')),
                'state': clean_str(r.get('State')),
                'zip': clean_str(r.get('ZIP Code')),
            }

        sqft = clean_num(r.get('Total Cleanable SqFt'))

        sites.append({
            'id': sid,
            'tenant_id': TENANT_ID,
            'client_id': client_id,
            'site_code': code,
            'name': name,
            'status': status,
            'address': address if address else None,
            'alarm_code': clean_str(r.get('Alarm Code')),
            'access_notes': clean_str(r.get('Entry Instructions')),
            'square_footage': sqft,
        })
    batch_insert('sites', sites)

    # ── 2i. Staff ────────────────────────────────────────────────────────
    print('Importing staff...')
    stf_rows = read_sheet(wb, 'Staff')
    staff_list = []
    for r in stf_rows:
        code = clean_str(r.get('Staff Code'))
        first = clean_str(r.get('First Name'))
        last = clean_str(r.get('Last Name'))
        if not first and not last:
            continue
        if not code:
            continue

        sid = gen_uuid()
        staff_ids[code] = sid

        full_name = f'{first or ""} {last or ""}'.strip()
        raw_role = clean_str(r.get('Staff Role')) or 'CLEANER'
        # Remove emoji prefixes (e.g., "🟢 Cleaner • Level 1" → "Cleaner")
        import re
        role_clean = re.sub(r'^[^\w]+', '', raw_role).strip()  # Remove leading non-word chars
        role_clean = role_clean.split('•')[0].strip()  # Remove "• Level X" suffix
        role_clean = role_clean.split('·')[0].strip()  # Alternative bullet
        role_map = {'Owner': 'OWNER_ADMIN', 'Manager': 'MANAGER', 'Supervisor': 'SUPERVISOR',
                     'Cleaner': 'CLEANER', 'Inspector': 'INSPECTOR', 'Sales': 'SALES',
                     'Admin': 'OWNER_ADMIN', 'Lead': 'SUPERVISOR', 'Account Manager': 'MANAGER',
                     'Operations Manager': 'MANAGER', 'Project Manager': 'MANAGER'}
        role = role_map.get(role_clean, 'CLEANER')

        status = clean_str(r.get('Staff Status')) or 'ACTIVE'
        status_map = {'Active': 'ACTIVE', 'Inactive': 'INACTIVE', 'On Leave': 'ON_LEAVE',
                       'Terminated': 'TERMINATED'}
        status = status_map.get(status, status.upper().replace(' ', '_'))

        pay_rate = clean_num(r.get('Pay Rate'))

        staff_list.append({
            'id': sid,
            'tenant_id': TENANT_ID,
            'staff_code': code,
            'full_name': full_name,
            'role': role,
            'staff_status': status,
            'pay_rate': pay_rate,
            'email': clean_str(r.get('Email')),
            'phone': clean_str(r.get('Mobile Phone')),
        })
    batch_insert('staff', staff_list)

    # ── 2j. Site Jobs ────────────────────────────────────────────────────
    print('Importing site jobs...')
    job_rows = read_sheet(wb, 'Site Job')
    jobs = []
    for r in job_rows:
        code = clean_str(r.get('Job Code'))
        name = clean_str(r.get('Job Name'))
        site_code = clean_str(r.get('Site Code'))
        if not code or not name:
            continue

        site_id = site_ids.get(site_code)
        if not site_id:
            continue

        jid = gen_uuid()
        job_ids[code] = jid

        svc_code = clean_str(r.get('Service Code'))
        svc_id = service_ids.get(svc_code)

        status = clean_str(r.get('Job Status')) or 'ACTIVE'
        status_map = {'Active': 'ACTIVE', 'Inactive': 'INACTIVE', 'On Hold': 'ON_HOLD',
                       'Canceled': 'CANCELED', 'Cancelled': 'CANCELED', 'Completed': 'COMPLETED'}
        status = status_map.get(status, status.upper().replace(' ', '_'))

        freq = clean_str(r.get('Frequency')) or 'WEEKLY'
        freq_map = {
            'Daily': 'DAILY', 'Weekly': 'WEEKLY', 'Monthly': 'MONTHLY',
            'Bi-Weekly': 'BIWEEKLY', 'Biweekly': 'BIWEEKLY',
            '2x Weekly': '2X_WEEK', '3x Weekly': '3X_WEEK', '5x Weekly': '5X_WEEK',
            'As Needed': 'AS_NEEDED', 'One-Time': 'AS_NEEDED',
        }
        freq = freq_map.get(freq, freq.upper().replace(' ', '_').replace('-', '_'))

        billing = clean_num(r.get('Billing Amount'))

        jobs.append({
            'id': jid,
            'tenant_id': TENANT_ID,
            'site_id': site_id,
            'job_code': code,
            'job_name': name,
            'status': status,
            'frequency': freq,
            'billing_amount': billing,
            'billing_uom': clean_str(r.get('Billing UOM')) or 'MONTHLY',
            'service_id': svc_id,
        })
    batch_insert('site_jobs', jobs)

    # ── 2k. Job Tasks ────────────────────────────────────────────────────
    print('Importing job tasks...')
    jt_rows = read_sheet(wb, 'Job Task')
    job_tasks = []
    for r in jt_rows:
        job_code = clean_str(r.get('Job Code'))
        task_code = clean_str(r.get('Task Code'))
        if not job_code or not task_code:
            continue
        job_id = job_ids.get(job_code)
        task_id = task_ids.get(task_code)
        if not job_id or not task_id:
            continue

        job_tasks.append({
            'id': gen_uuid(),
            'tenant_id': TENANT_ID,
            'job_id': job_id,
            'task_id': task_id,
            'task_code': task_code,
            'planned_minutes': int(round(clean_num(r.get('Planned Minutes'), 0))),
            'qc_weight': int(round(clean_num(r.get('Qc Weight'), 0))),
            'is_required': clean_bool(r.get('Is Required')),
            'status': clean_str(r.get('Status')) or 'ACTIVE',
            'notes': clean_str(r.get('Notes')),
        })
    batch_insert('job_tasks', job_tasks)

    # ── 2l. Supply Catalog ───────────────────────────────────────────────
    print('Importing supplies...')
    sup_rows = read_sheet(wb, 'Supply')
    supplies = []
    for r in sup_rows:
        # Headers have emoji prefixes
        code = clean_str(r.get('🏷️ Supply_Code'))
        name = clean_str(r.get('🇺🇸 Supply_Name_EN'))
        if not code or not name:
            continue
        supid = gen_uuid()
        supply_ids[code] = supid
        supplies.append({
            'id': supid,
            'tenant_id': TENANT_ID,
            'code': code,
            'name': name,
            'category': clean_str(r.get('📁 Supply_Category')),
            'unit': clean_str(r.get('Unit_Of_Measure')),
            'notes': clean_str(r.get('📝 Description_EN')),
        })
    batch_insert('supply_catalog', supplies)

    # ── 2m. Equipment ────────────────────────────────────────────────────
    print('Importing equipment...')
    eq_rows = read_sheet(wb, 'Equipment')
    equip_list = []
    for r in eq_rows:
        code = clean_str(r.get('Equipment Code'))
        name = clean_str(r.get('Equipment Name'))
        if not code or not name:
            continue

        condition = clean_str(r.get('Condition')) or 'GOOD'
        condition_map = {'Good': 'GOOD', 'Fair': 'FAIR', 'Poor': 'POOR',
                          'Out of Service': 'OUT_OF_SERVICE', 'New': 'GOOD'}
        condition = condition_map.get(condition, condition.upper().replace(' ', '_'))

        equip_list.append({
            'id': gen_uuid(),
            'tenant_id': TENANT_ID,
            'equipment_code': code,
            'name': name,
            'equipment_type': clean_str(r.get('Equipment Type')),
            'condition': condition,
            'serial_number': clean_str(r.get('Serial Number')),
            'purchase_date': clean_date(r.get('Purchase Date')),
            'notes': clean_str(r.get('Notes')),
        })
    batch_insert('equipment', equip_list)

    # ── 2n. Subcontractors ───────────────────────────────────────────────
    print('Importing subcontractors...')
    sub_rows = read_sheet(wb, 'Subcontractor')
    subs = []
    for r in sub_rows:
        code = clean_str(r.get('Subcontractor Code'))
        name = clean_str(r.get('Subcontractor Name'))
        if not code or not name:
            continue
        subs.append({
            'id': gen_uuid(),
            'tenant_id': TENANT_ID,
            'subcontractor_code': code,
            'company_name': name,
            'contact_name': clean_str(r.get('Contact Name')),
            'email': clean_str(r.get('Email')),
            'phone': clean_str(r.get('Business Phone')),
            'status': 'ACTIVE',
            'services_provided': clean_str(r.get('Services Provided')),
            'license_number': clean_str(r.get('License Number')),
            'insurance_expiry': clean_date(r.get('Insurance Expiry')),
            'notes': clean_str(r.get('Notes')),
        })
    batch_insert('subcontractors', subs)

    # ── 2o. Inventory Counts ─────────────────────────────────────────────
    print('Importing inventory counts...')
    ic_rows = read_sheet(wb, 'Inventory Count')
    counts = []
    count_ids = {}  # count_code → uuid
    for r in ic_rows:
        code = clean_str(r.get('🔖 Count Code'))
        site_code = clean_str(r.get('🏢 Site Code'))
        if not code or not site_code:
            continue
        site_id = site_ids.get(site_code)
        if not site_id:
            continue
        cid = gen_uuid()
        count_ids[code] = cid
        counts.append({
            'id': cid,
            'tenant_id': TENANT_ID,
            'count_code': code,
            'site_id': site_id,
            'count_date': clean_date(r.get('📅 Count Date')) or datetime.now().strftime('%Y-%m-%d'),
            'status': clean_str(r.get('Status')) or 'COMPLETED',
            'notes': clean_str(r.get('Notes')),
        })
    batch_insert('inventory_counts', counts)

    # ── 2p. Inventory Count Details ──────────────────────────────────────
    print('Importing inventory count details...')
    icd_rows = read_sheet(wb, 'Inventory Count Detail')
    details = []
    for r in icd_rows:
        count_code = clean_str(r.get('🔖 Count Code'))
        supply_code = clean_str(r.get('🏷️ Supply Code'))
        if not count_code or not supply_code:
            continue
        count_id = count_ids.get(count_code)
        supply_id = supply_ids.get(supply_code)
        if not count_id or not supply_id:
            continue
        details.append({
            'id': gen_uuid(),
            'tenant_id': TENANT_ID,
            'count_id': count_id,
            'supply_id': supply_id,
            'expected_qty': clean_num(r.get('⚠️ Minimum Stock Level')),
            'actual_qty': clean_num(r.get('📊 Quantity Counted')),
            'notes': clean_str(r.get('Condition Notes')),
        })
    batch_insert('inventory_count_details', details)

    # ── 2q. Update system_sequences with actual max codes ────────────────
    print('Updating system_sequences...')
    prefix_maxes = {}
    for code in client_ids.keys():
        num = int(code.split('-')[1]) if '-' in code else 0
        prefix_maxes['CLI'] = max(prefix_maxes.get('CLI', 0), num)
    for code in site_ids.keys():
        num = int(code.split('-')[1]) if '-' in code else 0
        prefix_maxes['SIT'] = max(prefix_maxes.get('SIT', 0), num)
    for code in staff_ids.keys():
        parts = code.split('-')
        if len(parts) >= 2:
            try:
                num = int(parts[1].split('-')[0].rstrip('A'))
            except ValueError:
                num = 0
            prefix_maxes['STF'] = max(prefix_maxes.get('STF', 0), num)
    for code in job_ids.keys():
        parts = code.split('-')
        if len(parts) >= 2:
            try:
                num = int(parts[1])
            except ValueError:
                num = 0
            prefix_maxes['JOB'] = max(prefix_maxes.get('JOB', 0), num)
    for code in task_ids.keys():
        parts = code.split('-')
        if len(parts) >= 2:
            try:
                num = int(parts[1])
            except ValueError:
                num = 0
            prefix_maxes['TSK'] = max(prefix_maxes.get('TSK', 0), num)
    for code in service_ids.keys():
        parts = code.split('-')
        if len(parts) >= 2:
            try:
                num = int(parts[1])
            except ValueError:
                num = 0
            prefix_maxes['SER'] = max(prefix_maxes.get('SER', 0), num)
    for code in supply_ids.keys():
        parts = code.split('-')
        if len(parts) >= 2:
            try:
                num = int(parts[1])
            except ValueError:
                num = 0
            prefix_maxes['SUP'] = max(prefix_maxes.get('SUP', 0), num)

    for prefix, max_val in prefix_maxes.items():
        url = f'{SUPABASE_URL}/rest/v1/system_sequences?tenant_id=eq.{TENANT_ID}&prefix=eq.{prefix}'
        req = urllib.request.Request(url,
            data=json.dumps({'current_value': max_val}).encode(),
            headers={**HEADERS, 'Prefer': 'return=minimal'},
            method='PATCH')
        try:
            urllib.request.urlopen(req)
            print(f'  {prefix}: set to {max_val}')
        except urllib.error.HTTPError as e:
            print(f'  {prefix}: ERROR updating - {e.read().decode()[:100]}')

    print(f'\n=== IMPORT COMPLETE ===')
    print(f'Clients: {len(client_ids)}')
    print(f'Sites: {len(site_ids)}')
    print(f'Staff: {len(staff_ids)}')
    print(f'Services: {len(service_ids)}')
    print(f'Tasks: {len(task_ids)}')
    print(f'Site Jobs: {len(job_ids)}')
    print(f'Job Tasks: {len(job_tasks)}')
    print(f'Supplies: {len(supply_ids)}')
    print(f'Positions: {len(position_ids)}')
    print(f'Equipment: {len(equip_list)}')
    print(f'Subcontractors: {len(subs)}')
    print(f'Inventory Counts: {len(counts)}')
    print(f'Inventory Details: {len(details)}')
    print(f'Lookups: {len(lookups)}')

    return {
        'client_ids': client_ids,
        'site_ids': site_ids,
        'staff_ids': staff_ids,
        'service_ids': service_ids,
        'task_ids': task_ids,
        'job_ids': job_ids,
        'supply_ids': supply_ids,
    }


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    delete_all_data()
    import_data()
    print('\nDone!')
