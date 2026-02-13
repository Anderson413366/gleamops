/**
 * GleamOps Demo Data Seed Script
 *
 * Populates production DB with realistic demo data for Anderson Cleaning Services.
 * Uses service_role key to bypass RLS.
 *
 * Usage:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-demo-data.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const TENANT_ID = 'a0000000-0000-0000-0000-000000000001';

// ---------------------------------------------------------------------------
// Staff (link to existing auth users + additional crew)
// ---------------------------------------------------------------------------
const STAFF = [
  { staff_code: 'STF-0001', full_name: 'Anderson Gomes', role: 'OWNER_ADMIN', email: 'agomes@andersoncleaning.com', phone: '(508) 555-0100', pay_rate: 0, user_id_email: 'agomes@andersoncleaning.com' },
  { staff_code: 'STF-0002', full_name: "Deon'Jha Henry", role: 'MANAGER', email: 'dhenry@andersoncleaning.com', phone: '(508) 555-0101', pay_rate: 28.00, user_id_email: 'dhenry@andersoncleaning.com' },
  { staff_code: 'STF-0003', full_name: 'Paulette Jodoin', role: 'MANAGER', email: 'pjodoin@andersoncleaning.com', phone: '(508) 555-0102', pay_rate: 26.00, user_id_email: 'pjodoin@andersoncleaning.com' },
  { staff_code: 'STF-0004', full_name: 'Maria Santos', role: 'SUPERVISOR', email: 'msantos@andersoncleaning.com', phone: '(508) 555-0103', pay_rate: 22.00 },
  { staff_code: 'STF-0005', full_name: 'James Parker', role: 'CLEANER', email: 'jparker@andersoncleaning.com', phone: '(508) 555-0104', pay_rate: 18.00 },
  { staff_code: 'STF-0006', full_name: 'Ana Oliveira', role: 'CLEANER', email: 'aoliveira@andersoncleaning.com', phone: '(508) 555-0105', pay_rate: 18.00 },
  { staff_code: 'STF-0007', full_name: 'Carlos Mendez', role: 'CLEANER', email: 'cmendez@andersoncleaning.com', phone: '(508) 555-0106', pay_rate: 17.50 },
  { staff_code: 'STF-0008', full_name: 'Sophie Chen', role: 'INSPECTOR', email: 'schen@andersoncleaning.com', phone: '(508) 555-0107', pay_rate: 20.00 },
];

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
const CLIENTS = [
  { client_code: 'CLI-1001', name: 'TechVenture Labs', status: 'ACTIVE', billing_address: { street: '100 Innovation Way', city: 'Boston', state: 'MA', zip: '02110' } },
  { client_code: 'CLI-1002', name: 'Harbor Medical Center', status: 'ACTIVE', billing_address: { street: '250 Harborside Dr', city: 'New Bedford', state: 'MA', zip: '02740' } },
  { client_code: 'CLI-1003', name: 'Pilgrim Properties LLC', status: 'ACTIVE', billing_address: { street: '45 Court St', city: 'Plymouth', state: 'MA', zip: '02360' } },
  { client_code: 'CLI-1004', name: 'South Shore Academy', status: 'ACTIVE', billing_address: { street: '800 Education Blvd', city: 'Brockton', state: 'MA', zip: '02301' } },
  { client_code: 'CLI-1005', name: 'Cape Cod Fitness', status: 'ACTIVE', billing_address: { street: '55 Gym Rd', city: 'Hyannis', state: 'MA', zip: '02601' } },
  { client_code: 'CLI-1006', name: 'Baystate Office Park', status: 'PROSPECT', billing_address: { street: '300 Commerce Pkwy', city: 'Fall River', state: 'MA', zip: '02720' } },
  { client_code: 'CLI-1007', name: 'Grace Community Church', status: 'ACTIVE', billing_address: { street: '120 Faith Ave', city: 'Taunton', state: 'MA', zip: '02780' } },
  { client_code: 'CLI-1008', name: 'Atlantic Warehouse Co', status: 'ACTIVE', billing_address: { street: '900 Industrial Rd', city: 'Wareham', state: 'MA', zip: '02571' } },
];

// ---------------------------------------------------------------------------
// Sites (linked to clients by code — resolved at insert time)
// ---------------------------------------------------------------------------
const SITES = [
  { site_code: 'SIT-2001', client_code: 'CLI-1001', name: 'TechVenture - Main Office', address: { street: '100 Innovation Way, Fl 1-3', city: 'Boston', state: 'MA', zip: '02110' }, square_footage: 18000, alarm_code: '4521#', access_notes: 'Use badge reader at west entrance. After 6pm use loading dock door code 7788.' },
  { site_code: 'SIT-2002', client_code: 'CLI-1001', name: 'TechVenture - R&D Lab', address: { street: '102 Innovation Way', city: 'Boston', state: 'MA', zip: '02110' }, square_footage: 6000, alarm_code: '4522#', access_notes: 'Lab entrance requires escort. Contact security at front desk.' },
  { site_code: 'SIT-2003', client_code: 'CLI-1002', name: 'Harbor Medical - Main Building', address: { street: '250 Harborside Dr', city: 'New Bedford', state: 'MA', zip: '02740' }, square_footage: 32000, alarm_code: '9901#', access_notes: 'Medical facility — gloves and shoe covers required. Check in at main reception.' },
  { site_code: 'SIT-2004', client_code: 'CLI-1002', name: 'Harbor Medical - Annex', address: { street: '260 Harborside Dr', city: 'New Bedford', state: 'MA', zip: '02740' }, square_footage: 8500, alarm_code: '9902#', access_notes: 'Key pickup from security desk in main building.' },
  { site_code: 'SIT-2005', client_code: 'CLI-1003', name: 'Pilgrim Props - 45 Court St', address: { street: '45 Court St', city: 'Plymouth', state: 'MA', zip: '02360' }, square_footage: 12000, alarm_code: '1234#', access_notes: 'Enter through rear parking lot. Dumpster area behind building.' },
  { site_code: 'SIT-2006', client_code: 'CLI-1003', name: 'Pilgrim Props - 80 Main St', address: { street: '80 Main St', city: 'Plymouth', state: 'MA', zip: '02360' }, square_footage: 9000, access_notes: 'Retail ground floor. After-hours access via side door, code 5566.' },
  { site_code: 'SIT-2007', client_code: 'CLI-1004', name: 'South Shore Academy - Campus', address: { street: '800 Education Blvd', city: 'Brockton', state: 'MA', zip: '02301' }, square_footage: 45000, alarm_code: '7777#', access_notes: 'Custodian office room 101 for keys. No cleaning during class hours (8am-3pm).' },
  { site_code: 'SIT-2008', client_code: 'CLI-1005', name: 'Cape Cod Fitness - Main Gym', address: { street: '55 Gym Rd', city: 'Hyannis', state: 'MA', zip: '02601' }, square_footage: 15000, access_notes: 'Cleaning between 11pm-5am only. Locker rooms require extra sanitization.' },
  { site_code: 'SIT-2009', client_code: 'CLI-1007', name: 'Grace Church - Sanctuary & Halls', address: { street: '120 Faith Ave', city: 'Taunton', state: 'MA', zip: '02780' }, square_footage: 20000, alarm_code: '3333#', access_notes: 'Extra cleaning after Sunday services. Fellowship hall often has food events.' },
  { site_code: 'SIT-2010', client_code: 'CLI-1008', name: 'Atlantic Warehouse - Main Floor', address: { street: '900 Industrial Rd', city: 'Wareham', state: 'MA', zip: '02571' }, square_footage: 50000, access_notes: 'Hard hat area near loading docks. Office suite on 2nd floor, warehouse below.' },
];

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------
const CONTACTS = [
  { contact_code: 'CON-1001', client_code: 'CLI-1001', name: 'Sarah Mitchell', email: 'smitchell@techventure.com', phone: '(617) 555-1001', role: 'Facilities Manager', is_primary: true },
  { contact_code: 'CON-1002', client_code: 'CLI-1001', name: 'David Park', email: 'dpark@techventure.com', phone: '(617) 555-1002', role: 'Office Manager', is_primary: false },
  { contact_code: 'CON-1003', client_code: 'CLI-1002', name: 'Dr. Rachel Torres', email: 'rtorres@harbormed.org', phone: '(508) 555-2001', role: 'Director of Operations', is_primary: true },
  { contact_code: 'CON-1004', client_code: 'CLI-1003', name: 'Michael Reeves', email: 'mreeves@pilgrimprop.com', phone: '(508) 555-3001', role: 'Property Manager', is_primary: true },
  { contact_code: 'CON-1005', client_code: 'CLI-1004', name: 'Linda Huang', email: 'lhuang@southshoreacademy.edu', phone: '(508) 555-4001', role: 'Head of Custodial', is_primary: true },
  { contact_code: 'CON-1006', client_code: 'CLI-1005', name: 'Kevin O\'Brien', email: 'kobrien@capefitness.com', phone: '(508) 555-5001', role: 'Owner', is_primary: true },
  { contact_code: 'CON-1007', client_code: 'CLI-1006', name: 'Janet Lewis', email: 'jlewis@baystateoffice.com', phone: '(508) 555-6001', role: 'Leasing Director', is_primary: true },
  { contact_code: 'CON-1008', client_code: 'CLI-1007', name: 'Pastor Nathaniel Brooks', email: 'pastor@gracechurchtaunton.org', phone: '(508) 555-7001', role: 'Senior Pastor', is_primary: true },
  { contact_code: 'CON-1009', client_code: 'CLI-1008', name: 'Tom Gallagher', email: 'tgallagher@atlanticwarehouse.com', phone: '(508) 555-8001', role: 'Warehouse Manager', is_primary: true },
];

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------
const VEHICLES = [
  { vehicle_code: 'VEH-001', name: 'Van #1 — Main', make: 'Ford', model: 'Transit 250', year: 2023, license_plate: '4KL 981', vin: '1FTBR1C8XPKA12345', color: 'White', status: 'ACTIVE' },
  { vehicle_code: 'VEH-002', name: 'Van #2 — Route B', make: 'Ford', model: 'Transit 150', year: 2022, license_plate: '5MN 442', vin: '1FTBR1C8XPKA67890', color: 'White', status: 'ACTIVE' },
  { vehicle_code: 'VEH-003', name: 'Pickup — Equipment', make: 'Toyota', model: 'Tacoma', year: 2021, license_plate: '2AB 553', vin: '5TFAX5GN1MX123456', color: 'Silver', status: 'ACTIVE' },
  { vehicle_code: 'VEH-004', name: 'Van #3 — Spare', make: 'Chevrolet', model: 'Express 2500', year: 2019, license_plate: '7RS 110', vin: '1GCWGAFG5K1234567', color: 'White', status: 'IN_SHOP', notes: 'Transmission repair — expected back 02/20' },
];

// ---------------------------------------------------------------------------
// Supplies
// ---------------------------------------------------------------------------
const SUPPLIES = [
  { code: 'SUP-001', name: 'Multi-Surface Cleaner (1 gal)', category: 'GENERAL', unit: 'GAL' },
  { code: 'SUP-002', name: 'Glass & Mirror Cleaner (32 oz)', category: 'GENERAL', unit: 'BOTTLE' },
  { code: 'SUP-003', name: 'Disinfectant Spray (32 oz)', category: 'RESTROOM', unit: 'BOTTLE' },
  { code: 'SUP-004', name: 'Toilet Bowl Cleaner (32 oz)', category: 'RESTROOM', unit: 'BOTTLE' },
  { code: 'SUP-005', name: 'Trash Bags — 33 gal (case 100)', category: 'GENERAL', unit: 'CASE' },
  { code: 'SUP-006', name: 'Trash Bags — 55 gal (case 50)', category: 'GENERAL', unit: 'CASE' },
  { code: 'SUP-007', name: 'Paper Towels — Multi-fold (case)', category: 'RESTROOM', unit: 'CASE' },
  { code: 'SUP-008', name: 'Toilet Paper — 2-ply (case 80)', category: 'RESTROOM', unit: 'CASE' },
  { code: 'SUP-009', name: 'Floor Stripper Concentrate (5 gal)', category: 'FLOOR_CARE', unit: 'EA' },
  { code: 'SUP-010', name: 'Floor Finish / Wax (5 gal)', category: 'FLOOR_CARE', unit: 'EA' },
  { code: 'SUP-011', name: 'Microfiber Cloths — Blue (pack 12)', category: 'GENERAL', unit: 'EA' },
  { code: 'SUP-012', name: 'Microfiber Mop Pads (pack 6)', category: 'FLOOR_CARE', unit: 'EA' },
  { code: 'SUP-013', name: 'Hand Soap Refill (1 gal)', category: 'RESTROOM', unit: 'GAL' },
  { code: 'SUP-014', name: 'Carpet Spot Remover (32 oz)', category: 'FLOOR_CARE', unit: 'BOTTLE' },
  { code: 'SUP-015', name: 'Stainless Steel Polish (18 oz)', category: 'SPECIALTY', unit: 'EA' },
];

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

// (sites resolved at insert time)
const KEYS_DATA = [
  { key_code: 'KEY-001', site_code: 'SIT-2001', key_type: 'FOB', label: 'TechVenture Main — Badge Fob A', status: 'ASSIGNED' },
  { key_code: 'KEY-002', site_code: 'SIT-2001', key_type: 'FOB', label: 'TechVenture Main — Badge Fob B', status: 'AVAILABLE' },
  { key_code: 'KEY-003', site_code: 'SIT-2003', key_type: 'STANDARD', label: 'Harbor Medical Main — Master Key', status: 'ASSIGNED' },
  { key_code: 'KEY-004', site_code: 'SIT-2005', key_type: 'STANDARD', label: 'Pilgrim 45 Court — Front Door', status: 'ASSIGNED' },
  { key_code: 'KEY-005', site_code: 'SIT-2006', key_type: 'CODE', label: 'Pilgrim 80 Main — Side Door Code', status: 'AVAILABLE', notes: 'Code: 5566' },
  { key_code: 'KEY-006', site_code: 'SIT-2007', key_type: 'STANDARD', label: 'South Shore Academy — Master Key Set', status: 'ASSIGNED' },
  { key_code: 'KEY-007', site_code: 'SIT-2009', key_type: 'STANDARD', label: 'Grace Church — Sanctuary Key', status: 'ASSIGNED' },
  { key_code: 'KEY-008', site_code: 'SIT-2010', key_type: 'CARD', label: 'Atlantic Warehouse — Access Card', status: 'ASSIGNED' },
];

// ---------------------------------------------------------------------------
// Prospects (sample pipeline entries)
// ---------------------------------------------------------------------------
const PROSPECTS = [
  { prospect_code: 'PRO-0001', company_name: 'Baystate Office Park', source: 'REFERRAL', status: 'QUALIFIED', notes: 'Referred by Pilgrim Properties. 3-building office park, ~40,000 sqft total.' },
  { prospect_code: 'PRO-0002', company_name: 'Cranberry Cove Hotel', source: 'WEBSITE', status: 'CONTACTED', notes: 'Reached out via website form. Looking for nightly cleaning of lobby + conference rooms.' },
  { prospect_code: 'PRO-0003', company_name: 'Bristol County Courthouse', source: 'COLD_CALL', status: 'NEW', notes: 'Large government building. Would require specialized floor care.' },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function seed() {
  console.log('=== GleamOps Demo Data Seed ===\n');

  // -----------------------------------------------------------------------
  // Step 1: Resolve auth user IDs for staff linking
  // -----------------------------------------------------------------------
  console.log('Step 1: Resolving auth user IDs...');
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const userByEmail = new Map(authUsers?.users?.map(u => [u.email, u.id]) ?? []);
  console.log(`  Found ${userByEmail.size} auth users\n`);

  // -----------------------------------------------------------------------
  // Step 2: Insert staff
  // -----------------------------------------------------------------------
  console.log('Step 2: Seeding staff...');
  const staffRows = STAFF.map(s => ({
    tenant_id: TENANT_ID,
    staff_code: s.staff_code,
    full_name: s.full_name,
    role: s.role,
    email: s.email,
    phone: s.phone,
    pay_rate: s.pay_rate,
    user_id: s.user_id_email ? userByEmail.get(s.user_id_email) ?? null : null,
  }));

  const { error: staffErr } = await supabase.from('staff').upsert(staffRows, { onConflict: 'staff_code', ignoreDuplicates: false });
  if (staffErr) console.error('  ERROR staff:', staffErr.message);
  else console.log(`  Seeded ${staffRows.length} staff members`);

  // Fetch staff IDs for FK references
  const { data: staffRecords } = await supabase.from('staff').select('id, staff_code').eq('tenant_id', TENANT_ID);
  const staffIdByCode = new Map(staffRecords?.map(s => [s.staff_code, s.id]) ?? []);
  console.log(`  Resolved ${staffIdByCode.size} staff IDs\n`);

  // -----------------------------------------------------------------------
  // Step 3: Insert clients
  // -----------------------------------------------------------------------
  console.log('Step 3: Seeding clients...');
  const clientRows = CLIENTS.map(c => ({
    tenant_id: TENANT_ID,
    client_code: c.client_code,
    name: c.name,
    status: c.status,
    billing_address: c.billing_address,
  }));

  const { error: clientErr } = await supabase.from('clients').upsert(clientRows, { onConflict: 'client_code', ignoreDuplicates: false });
  if (clientErr) console.error('  ERROR clients:', clientErr.message);
  else console.log(`  Seeded ${clientRows.length} clients`);

  // Fetch client IDs
  const { data: clientRecords } = await supabase.from('clients').select('id, client_code').eq('tenant_id', TENANT_ID);
  const clientIdByCode = new Map(clientRecords?.map(c => [c.client_code, c.id]) ?? []);
  console.log(`  Resolved ${clientIdByCode.size} client IDs\n`);

  // -----------------------------------------------------------------------
  // Step 4: Insert sites
  // -----------------------------------------------------------------------
  console.log('Step 4: Seeding sites...');
  const siteRows = SITES.map(s => ({
    tenant_id: TENANT_ID,
    site_code: s.site_code,
    client_id: clientIdByCode.get(s.client_code)!,
    name: s.name,
    address: s.address,
    square_footage: s.square_footage ?? null,
    alarm_code: s.alarm_code ?? null,
    access_notes: s.access_notes ?? null,
  }));

  const { error: siteErr } = await supabase.from('sites').upsert(siteRows, { onConflict: 'site_code', ignoreDuplicates: false });
  if (siteErr) console.error('  ERROR sites:', siteErr.message);
  else console.log(`  Seeded ${siteRows.length} sites`);

  // Fetch site IDs
  const { data: siteRecords } = await supabase.from('sites').select('id, site_code').eq('tenant_id', TENANT_ID);
  const siteIdByCode = new Map(siteRecords?.map(s => [s.site_code, s.id]) ?? []);
  console.log(`  Resolved ${siteIdByCode.size} site IDs\n`);

  // -----------------------------------------------------------------------
  // Step 5: Insert contacts
  // -----------------------------------------------------------------------
  console.log('Step 5: Seeding contacts...');
  const contactRows = CONTACTS.map(c => ({
    tenant_id: TENANT_ID,
    contact_code: c.contact_code,
    client_id: clientIdByCode.get(c.client_code)!,
    name: c.name,
    email: c.email,
    phone: c.phone,
    role: c.role,
    is_primary: c.is_primary,
  }));

  const { error: contactErr } = await supabase.from('contacts').upsert(contactRows, { onConflict: 'contact_code', ignoreDuplicates: false });
  if (contactErr) console.error('  ERROR contacts:', contactErr.message);
  else console.log(`  Seeded ${contactRows.length} contacts\n`);

  // -----------------------------------------------------------------------
  // Step 6: Insert vehicles
  // -----------------------------------------------------------------------
  console.log('Step 6: Seeding vehicles...');
  const vehicleRows = VEHICLES.map(v => ({
    tenant_id: TENANT_ID,
    vehicle_code: v.vehicle_code,
    name: v.name,
    make: v.make,
    model: v.model,
    year: v.year,
    license_plate: v.license_plate,
    vin: v.vin,
    color: v.color,
    status: v.status,
    notes: v.notes ?? null,
  }));

  const { error: vehErr } = await supabase.from('vehicles').upsert(vehicleRows, { onConflict: 'vehicle_code', ignoreDuplicates: false });
  if (vehErr) console.error('  ERROR vehicles:', vehErr.message);
  else console.log(`  Seeded ${vehicleRows.length} vehicles\n`);

  // -----------------------------------------------------------------------
  // Step 7: Insert supplies
  // -----------------------------------------------------------------------
  console.log('Step 7: Seeding supplies...');
  const supplyRows = SUPPLIES.map(s => ({
    tenant_id: TENANT_ID,
    code: s.code,
    name: s.name,
    category: s.category,
    unit: s.unit,
  }));

  const { error: supErr } = await supabase.from('supply_catalog').upsert(supplyRows, { onConflict: 'code', ignoreDuplicates: false });
  if (supErr) console.error('  ERROR supplies:', supErr.message);
  else console.log(`  Seeded ${supplyRows.length} supplies\n`);

  // -----------------------------------------------------------------------
  // Step 8: Insert keys
  // -----------------------------------------------------------------------
  console.log('Step 8: Seeding keys...');
  const keyRows = KEYS_DATA.map(k => ({
    tenant_id: TENANT_ID,
    key_code: k.key_code,
    site_id: siteIdByCode.get(k.site_code) ?? null,
    key_type: k.key_type,
    label: k.label,
    status: k.status,
    notes: k.notes ?? null,
    // Assign keys marked ASSIGNED to Maria Santos (supervisor)
    assigned_to: k.status === 'ASSIGNED' ? staffIdByCode.get('STF-0004') ?? null : null,
  }));

  const { error: keyErr } = await supabase.from('key_inventory').upsert(keyRows, { onConflict: 'key_code', ignoreDuplicates: false });
  if (keyErr) console.error('  ERROR keys:', keyErr.message);
  else console.log(`  Seeded ${keyRows.length} keys\n`);

  // -----------------------------------------------------------------------
  // Step 9: Insert prospects
  // -----------------------------------------------------------------------
  console.log('Step 9: Seeding prospects...');
  const prospectRows = PROSPECTS.map(p => ({
    tenant_id: TENANT_ID,
    prospect_code: p.prospect_code,
    company_name: p.company_name,
    source: p.source,
    prospect_status_code: p.status,
    notes: p.notes,
  }));

  const { error: proErr } = await supabase.from('sales_prospects').upsert(prospectRows, { onConflict: 'prospect_code', ignoreDuplicates: false });
  if (proErr) console.error('  ERROR prospects:', proErr.message);
  else console.log(`  Seeded ${prospectRows.length} prospects\n`);

  // -----------------------------------------------------------------------
  // Step 10: Update sequence counters
  // -----------------------------------------------------------------------
  console.log('Step 10: Updating sequence counters...');
  const seqUpdates = [
    { prefix: 'CLI', current_value: 1008 },
    { prefix: 'SIT', current_value: 2010 },
    { prefix: 'CON', current_value: 1009 },
    { prefix: 'STF', current_value: 8 },  // STF-0008 was last
    { prefix: 'VEH', current_value: 4 },
    { prefix: 'SUP', current_value: 15 },
    { prefix: 'KEY', current_value: 8 },
    { prefix: 'PRO', current_value: 3 },
  ];

  for (const seq of seqUpdates) {
    const { error } = await supabase
      .from('system_sequences')
      .update({ current_value: seq.current_value })
      .eq('tenant_id', TENANT_ID)
      .eq('prefix', seq.prefix);
    if (error) console.error(`  ERROR updating ${seq.prefix} sequence:`, error.message);
  }
  console.log('  Sequences updated\n');

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log('=== Demo Data Seed Summary ===');
  console.log(`  Staff:     ${STAFF.length}`);
  console.log(`  Clients:   ${CLIENTS.length}`);
  console.log(`  Sites:     ${SITES.length}`);
  console.log(`  Contacts:  ${CONTACTS.length}`);
  console.log(`  Vehicles:  ${VEHICLES.length}`);
  console.log(`  Supplies:  ${SUPPLIES.length}`);
  console.log(`  Keys:      ${KEYS_DATA.length}`);
  console.log(`  Prospects: ${PROSPECTS.length}`);
  console.log('=== Done ===');
}

seed().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
