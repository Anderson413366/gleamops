/**
 * GleamOps Seed Data Script
 *
 * Populates the database with essential lookups, default tasks, and sample services.
 *
 * Usage:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-data.ts
 *
 * Environment variables:
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert CODE_LIKE_THIS to Title Case Label */
function codeToLabel(code: string): string {
  return code
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ---------------------------------------------------------------------------
// Lookup definitions (14 categories)
// ---------------------------------------------------------------------------

const LOOKUP_CATEGORIES: Record<string, string[]> = {
  prospect_status: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'DEAD', 'CONVERTED'],
  opportunity_stage: [
    'QUALIFIED',
    'WALKTHROUGH_SCHEDULED',
    'WALKTHROUGH_COMPLETE',
    'BID_IN_PROGRESS',
    'PROPOSAL_SENT',
    'NEGOTIATION',
    'WON',
    'LOST',
  ],
  bid_status: ['DRAFT', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'APPROVED', 'SENT', 'WON', 'LOST'],
  proposal_status: ['DRAFT', 'GENERATED', 'SENT', 'DELIVERED', 'OPENED', 'WON', 'LOST', 'EXPIRED'],
  ticket_status: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'CANCELED'],
  time_event_type: ['CHECK_IN', 'CHECK_OUT', 'BREAK_START', 'BREAK_END', 'MANUAL_ADJUSTMENT'],
  exception_type: [
    'OUT_OF_GEOFENCE',
    'LATE_ARRIVAL',
    'EARLY_DEPARTURE',
    'MISSING_CHECKOUT',
    'MANUAL_OVERRIDE',
  ],
  activity_type: ['CALL', 'EMAIL', 'MEETING', 'SITE_VISIT', 'NOTE'],
  frequency: ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
  difficulty: ['EASY', 'STANDARD', 'DIFFICULT'],
  floor_type: ['CARPET', 'VCT', 'HARDWOOD', 'CONCRETE', 'TILE', 'MARBLE', 'RUBBER'],
  building_type: ['OFFICE', 'MEDICAL', 'SCHOOL', 'RETAIL', 'WAREHOUSE', 'INDUSTRIAL', 'CHURCH', 'GYM'],
  task_category: ['RESTROOM', 'FLOOR_CARE', 'GENERAL', 'SPECIALTY', 'EXTERIOR'],
  task_unit: ['SQFT_1000', 'EACH', 'LINEAR_FT', 'HOUR'],
};

// ---------------------------------------------------------------------------
// Task definitions
// ---------------------------------------------------------------------------

interface TaskDef {
  task_code: string;
  name: string;
  category: string;
  unit_code: string;
  production_rate_sqft_per_hour: number;
}

const TASKS: TaskDef[] = [
  { task_code: 'TSK-001', name: 'Vacuum Carpeted Areas', category: 'FLOOR_CARE', unit_code: 'SQFT_1000', production_rate_sqft_per_hour: 5000 },
  { task_code: 'TSK-002', name: 'Mop Hard Floors', category: 'FLOOR_CARE', unit_code: 'SQFT_1000', production_rate_sqft_per_hour: 4000 },
  { task_code: 'TSK-003', name: 'Dust Mop Hard Floors', category: 'FLOOR_CARE', unit_code: 'SQFT_1000', production_rate_sqft_per_hour: 8000 },
  { task_code: 'TSK-004', name: 'Clean & Sanitize Restrooms', category: 'RESTROOM', unit_code: 'EACH', production_rate_sqft_per_hour: 8 },
  { task_code: 'TSK-005', name: 'Restock Restroom Supplies', category: 'RESTROOM', unit_code: 'EACH', production_rate_sqft_per_hour: 20 },
  { task_code: 'TSK-006', name: 'Empty Trash & Replace Liners', category: 'GENERAL', unit_code: 'EACH', production_rate_sqft_per_hour: 60 },
  { task_code: 'TSK-007', name: 'Dust Surfaces', category: 'GENERAL', unit_code: 'SQFT_1000', production_rate_sqft_per_hour: 8000 },
  { task_code: 'TSK-008', name: 'Wipe Desks & Tables', category: 'GENERAL', unit_code: 'SQFT_1000', production_rate_sqft_per_hour: 6000 },
  { task_code: 'TSK-009', name: 'Clean Glass & Mirrors', category: 'GENERAL', unit_code: 'SQFT_1000', production_rate_sqft_per_hour: 3000 },
  { task_code: 'TSK-010', name: 'Vacuum Entrance Mats', category: 'FLOOR_CARE', unit_code: 'EACH', production_rate_sqft_per_hour: 30 },
  { task_code: 'TSK-011', name: 'Spot Clean Carpet Stains', category: 'SPECIALTY', unit_code: 'EACH', production_rate_sqft_per_hour: 10 },
  { task_code: 'TSK-012', name: 'Strip & Wax Floors', category: 'SPECIALTY', unit_code: 'SQFT_1000', production_rate_sqft_per_hour: 800 },
  { task_code: 'TSK-013', name: 'Carpet Extraction', category: 'SPECIALTY', unit_code: 'SQFT_1000', production_rate_sqft_per_hour: 1200 },
  { task_code: 'TSK-014', name: 'Pressure Wash Exterior', category: 'EXTERIOR', unit_code: 'SQFT_1000', production_rate_sqft_per_hour: 2000 },
  { task_code: 'TSK-015', name: 'Clean Break Room / Kitchen', category: 'GENERAL', unit_code: 'EACH', production_rate_sqft_per_hour: 6 },
  { task_code: 'TSK-016', name: 'Sanitize High-Touch Points', category: 'GENERAL', unit_code: 'SQFT_1000', production_rate_sqft_per_hour: 10000 },
  { task_code: 'TSK-017', name: 'Window Cleaning (Interior)', category: 'SPECIALTY', unit_code: 'EACH', production_rate_sqft_per_hour: 15 },
  { task_code: 'TSK-018', name: 'Floor Burnishing', category: 'FLOOR_CARE', unit_code: 'SQFT_1000', production_rate_sqft_per_hour: 10000 },
];

// ---------------------------------------------------------------------------
// Service definitions
// ---------------------------------------------------------------------------

interface ServiceDef {
  service_code: string;
  name: string;
  description: string;
  tasks: Array<{ task_code: string; frequency: string }>;
}

const SERVICES: ServiceDef[] = [
  {
    service_code: 'SER-001',
    name: 'Nightly Janitorial',
    description: 'Standard nightly cleaning service including vacuuming, mopping, restrooms, trash, dusting, and sanitization.',
    tasks: [
      { task_code: 'TSK-001', frequency: 'DAILY' },
      { task_code: 'TSK-002', frequency: 'DAILY' },
      { task_code: 'TSK-004', frequency: 'DAILY' },
      { task_code: 'TSK-005', frequency: 'DAILY' },
      { task_code: 'TSK-006', frequency: 'DAILY' },
      { task_code: 'TSK-007', frequency: 'DAILY' },
      { task_code: 'TSK-008', frequency: 'WEEKLY' },
      { task_code: 'TSK-009', frequency: 'WEEKLY' },
      { task_code: 'TSK-016', frequency: 'DAILY' },
    ],
  },
  {
    service_code: 'SER-002',
    name: 'Day Porter Service',
    description: 'Daytime porter service for restrooms, trash, break rooms, and high-touch sanitization.',
    tasks: [
      { task_code: 'TSK-004', frequency: 'DAILY' },
      { task_code: 'TSK-005', frequency: 'DAILY' },
      { task_code: 'TSK-006', frequency: 'DAILY' },
      { task_code: 'TSK-015', frequency: 'DAILY' },
      { task_code: 'TSK-016', frequency: 'DAILY' },
    ],
  },
  {
    service_code: 'SER-003',
    name: 'Deep Clean Package',
    description: 'Monthly deep cleaning including carpet extraction, floor stripping/waxing, restrooms, glass, and windows.',
    tasks: [
      { task_code: 'TSK-001', frequency: 'MONTHLY' },
      { task_code: 'TSK-012', frequency: 'MONTHLY' },
      { task_code: 'TSK-013', frequency: 'MONTHLY' },
      { task_code: 'TSK-004', frequency: 'MONTHLY' },
      { task_code: 'TSK-009', frequency: 'MONTHLY' },
      { task_code: 'TSK-017', frequency: 'MONTHLY' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log('=== GleamOps Seed Data ===\n');

  // ------------------------------------------------------------------
  // Step 1: Find the default tenant
  // ------------------------------------------------------------------
  console.log('Step 1: Finding default tenant (TNT-0001)...');

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, tenant_code, name')
    .eq('tenant_code', 'TNT-0001')
    .single();

  if (tenantError || !tenant) {
    console.error('ERROR: Could not find tenant TNT-0001:', tenantError?.message ?? 'not found');
    console.error('Make sure the foundation migration has been applied.');
    process.exit(1);
  }

  const tenantId = tenant.id;
  console.log(`  Found tenant: ${tenant.name} (${tenant.tenant_code}, id=${tenantId})\n`);

  // ------------------------------------------------------------------
  // Step 2: Upsert lookups
  // ------------------------------------------------------------------
  console.log('Step 2: Seeding lookups...');

  let lookupCount = 0;

  for (const [category, codes] of Object.entries(LOOKUP_CATEGORIES)) {
    const rows = codes.map((code, index) => ({
      tenant_id: tenantId,
      category,
      code,
      label: codeToLabel(code),
      sort_order: index + 1,
      is_active: true,
    }));

    const { error } = await supabase.from('lookups').upsert(rows, {
      onConflict: 'tenant_id,category,code',
      ignoreDuplicates: true,
    });

    if (error) {
      console.error(`  ERROR seeding lookups for category "${category}":`, error.message);
    } else {
      lookupCount += rows.length;
      console.log(`  ${category}: ${rows.length} values`);
    }
  }

  console.log(`  Total: ${lookupCount} lookup values\n`);

  // ------------------------------------------------------------------
  // Step 3: Upsert tasks
  // ------------------------------------------------------------------
  console.log('Step 3: Seeding tasks...');

  const taskRows = TASKS.map((t) => ({
    tenant_id: tenantId,
    task_code: t.task_code,
    name: t.name,
    category: t.category,
    unit_code: t.unit_code,
    production_rate_sqft_per_hour: t.production_rate_sqft_per_hour,
  }));

  const { error: taskError } = await supabase.from('tasks').upsert(taskRows, {
    onConflict: 'task_code',
    ignoreDuplicates: true,
  });

  if (taskError) {
    console.error('  ERROR seeding tasks:', taskError.message);
  } else {
    console.log(`  Seeded ${taskRows.length} tasks`);
  }

  // Fetch task IDs for service_tasks linking
  const { data: taskRecords, error: taskFetchError } = await supabase
    .from('tasks')
    .select('id, task_code')
    .eq('tenant_id', tenantId);

  if (taskFetchError || !taskRecords) {
    console.error('  ERROR fetching task records:', taskFetchError?.message ?? 'no data');
    console.log('\nSkipping services due to missing task data.');
    printSummary(lookupCount, taskRows.length, 0);
    return;
  }

  const taskIdByCode = new Map(taskRecords.map((t) => [t.task_code, t.id]));
  console.log(`  Fetched ${taskRecords.length} task IDs for linking\n`);

  // ------------------------------------------------------------------
  // Step 4: Upsert services
  // ------------------------------------------------------------------
  console.log('Step 4: Seeding services...');

  const serviceRows = SERVICES.map((s) => ({
    tenant_id: tenantId,
    service_code: s.service_code,
    name: s.name,
    description: s.description,
  }));

  const { error: serviceError } = await supabase.from('services').upsert(serviceRows, {
    onConflict: 'service_code',
    ignoreDuplicates: true,
  });

  if (serviceError) {
    console.error('  ERROR seeding services:', serviceError.message);
  } else {
    console.log(`  Seeded ${serviceRows.length} services`);
  }

  // Fetch service IDs for service_tasks linking
  const { data: serviceRecords, error: serviceFetchError } = await supabase
    .from('services')
    .select('id, service_code')
    .eq('tenant_id', tenantId);

  if (serviceFetchError || !serviceRecords) {
    console.error('  ERROR fetching service records:', serviceFetchError?.message ?? 'no data');
    printSummary(lookupCount, taskRows.length, serviceRows.length);
    return;
  }

  const serviceIdByCode = new Map(serviceRecords.map((s) => [s.service_code, s.id]));

  // ------------------------------------------------------------------
  // Step 5: Upsert service_tasks
  // ------------------------------------------------------------------
  console.log('\nStep 5: Seeding service_tasks...');

  let serviceTaskCount = 0;

  for (const service of SERVICES) {
    const serviceId = serviceIdByCode.get(service.service_code);
    if (!serviceId) {
      console.error(`  WARNING: Service ${service.service_code} not found in DB, skipping tasks`);
      continue;
    }

    const stRows = service.tasks
      .map((st) => {
        const taskId = taskIdByCode.get(st.task_code);
        if (!taskId) {
          console.error(`  WARNING: Task ${st.task_code} not found for service ${service.service_code}`);
          return null;
        }
        return {
          tenant_id: tenantId,
          service_id: serviceId,
          task_id: taskId,
          frequency_default: st.frequency,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (stRows.length === 0) continue;

    const { error: stError } = await supabase.from('service_tasks').upsert(stRows, {
      onConflict: 'tenant_id,service_id,task_id',
      ignoreDuplicates: true,
    });

    if (stError) {
      console.error(`  ERROR seeding service_tasks for ${service.service_code}:`, stError.message);
    } else {
      serviceTaskCount += stRows.length;
      console.log(`  ${service.service_code} (${service.name}): ${stRows.length} tasks linked`);
    }
  }

  console.log(`  Total: ${serviceTaskCount} service_task links\n`);

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  printSummary(lookupCount, taskRows.length, serviceRows.length, serviceTaskCount);
}

function printSummary(lookups: number, tasks: number, services: number, serviceTaskLinks?: number) {
  console.log('=== Seed Summary ===');
  console.log(`  Lookups:       ${lookups} values across ${Object.keys(LOOKUP_CATEGORIES).length} categories`);
  console.log(`  Tasks:         ${tasks}`);
  console.log(`  Services:      ${services}`);
  if (serviceTaskLinks !== undefined) {
    console.log(`  Service Tasks: ${serviceTaskLinks} links`);
  }
  console.log('=== Done ===');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

seed().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
