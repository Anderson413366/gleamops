import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

type EnvMap = Record<string, string>;

type Args = {
  tenantCode: string;
  applyRouteTemplateSkeleton: boolean;
  outputDir: string;
};

const WEEKDAY_ROWS = [
  { weekday: 'MON', label: 'Monday - TBD', template_code: 'RT-MON-001' },
  { weekday: 'TUE', label: 'Tuesday - TBD', template_code: 'RT-TUE-001' },
  { weekday: 'WED', label: 'Wednesday - TBD', template_code: 'RT-WED-001' },
  { weekday: 'THU', label: 'Thursday - TBD', template_code: 'RT-THU-001' },
  { weekday: 'FRI', label: 'Friday - TBD', template_code: 'RT-FRI-001' },
  { weekday: 'SAT', label: 'Saturday - TBD', template_code: 'RT-SAT-001' },
];

function parseArgs(argv: string[]): Args {
  const args: Args = {
    tenantCode: 'TNT-0001',
    applyRouteTemplateSkeleton: false,
    outputDir: path.join('reports', 'cutover'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--tenant-code' && argv[i + 1]) {
      args.tenantCode = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--output-dir' && argv[i + 1]) {
      args.outputDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--apply-route-template-skeleton') {
      args.applyRouteTemplateSkeleton = true;
    }
  }

  return args;
}

function findRepoRoot(startDir: string): string {
  let current = path.resolve(startDir);

  while (true) {
    const hasWorkspace = fs.existsSync(path.join(current, 'pnpm-workspace.yaml'));
    const hasGit = fs.existsSync(path.join(current, '.git'));
    if (hasWorkspace || hasGit) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}

function readEnvFile(filePath: string): EnvMap {
  const content = fs.readFileSync(filePath, 'utf8');
  const env: EnvMap = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq < 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }

  return env;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function writeCsv(filePath: string, headers: string[], rows: Array<Record<string, unknown>>): void {
  const lines: string[] = [];
  lines.push(headers.join(','));
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }
  fs.writeFileSync(filePath, lines.join('\n'));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = findRepoRoot(process.cwd());
  const resolvedOutputDir = path.isAbsolute(args.outputDir)
    ? args.outputDir
    : path.join(repoRoot, args.outputDir);

  const envCandidates = [
    path.join(repoRoot, 'apps', 'web', '.env.local'),
    path.join(process.cwd(), '.env.local'),
  ];
  const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));
  if (!envPath) {
    throw new Error(`Missing env file. Tried: ${envCandidates.join(', ')}`);
  }

  const env = readEnvFile(envPath);
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id,tenant_code,name')
    .eq('tenant_code', args.tenantCode)
    .single();

  if (tenantError || !tenant) {
    throw new Error(`Failed to resolve tenant ${args.tenantCode}: ${tenantError?.message ?? 'not found'}`);
  }

  const tenantId = tenant.id as string;
  const timestamp = new Date().toISOString().replaceAll(':', '-');
  const runDir = path.join(resolvedOutputDir, `${args.tenantCode}-${timestamp}`);
  fs.mkdirSync(runDir, { recursive: true });

  const { data: existingTemplates, error: templateError } = await supabase
    .from('route_templates')
    .select('id,template_code,weekday,label')
    .eq('tenant_id', tenantId)
    .is('archived_at', null);

  if (templateError) {
    throw new Error(`Failed to read route_templates: ${templateError.message}`);
  }

  if (args.applyRouteTemplateSkeleton && (existingTemplates?.length ?? 0) === 0) {
    const payload = WEEKDAY_ROWS.map((row) => ({
      tenant_id: tenantId,
      template_code: row.template_code,
      label: row.label,
      weekday: row.weekday,
      is_active: true,
      notes: 'Auto-created by cutover bootstrap script; fill stops/tasks from Monday.com cutover workbook.',
    }));

    const { error: insertTemplateError } = await supabase
      .from('route_templates')
      .insert(payload);

    if (insertTemplateError) {
      throw new Error(`Failed to create weekday route template skeleton: ${insertTemplateError.message}`);
    }
  }

  const { data: routeTemplates, error: finalTemplateError } = await supabase
    .from('route_templates')
    .select('template_code,weekday,label,assigned_staff_id,default_vehicle_id,default_key_box,notes')
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .order('weekday', { ascending: true });

  if (finalTemplateError) {
    throw new Error(`Failed to fetch final route_templates: ${finalTemplateError.message}`);
  }

  const { data: sites, error: siteError } = await supabase
    .from('sites')
    .select(
      'id,site_code,name,address,access_notes,cleaning_procedures,access_window_start,access_window_end'
    )
    .eq('tenant_id', tenantId)
    .order('site_code', { ascending: true });

  if (siteError) {
    throw new Error(`Failed to fetch sites: ${siteError.message}`);
  }

  const { data: siteJobs, error: siteJobError } = await supabase
    .from('site_jobs')
    .select('id,job_code,site_id,status')
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .order('job_code', { ascending: true });

  if (siteJobError) {
    throw new Error(`Failed to fetch site_jobs: ${siteJobError.message}`);
  }

  let supplySource = 'site_supplies';
  let supplies: Array<{ site_id: string }> = [];
  {
    const primary = await supabase
      .from('site_supplies')
      .select('site_id')
      .eq('tenant_id', tenantId)
      .is('archived_at', null);

    if (!primary.error && primary.data) {
      supplies = primary.data as Array<{ site_id: string }>;
    } else {
      const fallback = await supabase
        .from('v_site_supply_assignments')
        .select('site_id')
        .eq('tenant_id', tenantId);

      if (fallback.error) {
        throw new Error(
          `Failed to fetch supply assignments from site_supplies/v_site_supply_assignments: ${fallback.error.message}`
        );
      }

      supplySource = 'v_site_supply_assignments';
      supplies = (fallback.data ?? []) as Array<{ site_id: string }>;
    }
  }

  const { data: staffRows, error: staffError } = await supabase
    .from('staff')
    .select('staff_code,full_name,role,microfiber_enrolled,microfiber_enrolled_at,microfiber_rate_per_set')
    .eq('tenant_id', tenantId)
    .in('role', ['CLEANER', 'SUPERVISOR'])
    .is('archived_at', null)
    .order('staff_code', { ascending: true });

  if (staffError) {
    throw new Error(`Failed to fetch staff for microfiber enrollment sheet: ${staffError.message}`);
  }

  const siteById = new Map<string, { site_code: string; name: string }>();
  for (const site of sites ?? []) {
    siteById.set(site.id as string, {
      site_code: (site.site_code as string) ?? '',
      name: (site.name as string) ?? '',
    });
  }

  const supplyCountBySiteId = new Map<string, number>();
  for (const row of supplies ?? []) {
    const siteId = row.site_id as string;
    supplyCountBySiteId.set(siteId, (supplyCountBySiteId.get(siteId) ?? 0) + 1);
  }

  const siteSheetRows =
    sites?.map((site) => ({
      site_code: site.site_code ?? '',
      site_name: site.name ?? '',
      address: site.address ? JSON.stringify(site.address) : '',
      access_notes: site.access_notes ?? '',
      cleaning_procedures: site.cleaning_procedures ?? '',
      access_window_start: site.access_window_start ?? '',
      access_window_end: site.access_window_end ?? '',
      cutover_status:
        site.cleaning_procedures && site.access_window_start && site.access_window_end ? 'READY' : 'PENDING_ENTRY',
      cutover_notes: '',
    })) ?? [];

  const periodicSheetRows =
    siteJobs?.map((job) => {
      const site = siteById.get(job.site_id as string);
      return {
        periodic_code: '',
        site_job_code: job.job_code ?? '',
        site_code: site?.site_code ?? '',
        site_name: site?.name ?? '',
        task_type: '',
        frequency: '',
        next_due_date: '',
        description_override: '',
        evidence_required: 'false',
        auto_add_to_route: 'true',
        notes: '',
      };
    }) ?? [];

  const supplyVerificationRows =
    sites?.map((site) => {
      const siteId = site.id as string;
      const count = supplyCountBySiteId.get(siteId) ?? 0;
      return {
        site_code: site.site_code ?? '',
        site_name: site.name ?? '',
        assignment_count: count,
        verification_status: count > 0 ? 'HAS_ASSIGNMENTS' : 'MISSING_ASSIGNMENTS',
        verification_notes: '',
      };
    }) ?? [];

  const microfiberRows =
    staffRows?.map((staff) => ({
      staff_code: staff.staff_code ?? '',
      full_name: staff.full_name ?? '',
      role: staff.role ?? '',
      microfiber_enrolled: staff.microfiber_enrolled ? 'true' : 'false',
      microfiber_enrolled_at: staff.microfiber_enrolled_at ?? '',
      microfiber_rate_per_set: staff.microfiber_rate_per_set ?? '',
      set_enroll_to_true: '',
      new_rate_per_set: '',
      notes: '',
    })) ?? [];

  writeCsv(
    path.join(runDir, 'sites_procedures_access_windows.csv'),
    [
      'site_code',
      'site_name',
      'address',
      'access_notes',
      'cleaning_procedures',
      'access_window_start',
      'access_window_end',
      'cutover_status',
      'cutover_notes',
    ],
    siteSheetRows
  );

  writeCsv(
    path.join(runDir, 'route_templates_weekday.csv'),
    [
      'template_code',
      'weekday',
      'label',
      'assigned_staff_id',
      'default_vehicle_id',
      'default_key_box',
      'notes',
    ],
    routeTemplates ?? []
  );

  writeCsv(
    path.join(runDir, 'route_template_stops.csv'),
    ['template_code', 'stop_order', 'site_job_code', 'access_window_start', 'access_window_end', 'notes'],
    []
  );

  writeCsv(
    path.join(runDir, 'route_template_tasks.csv'),
    [
      'template_code',
      'stop_order',
      'task_order',
      'task_type',
      'description_key',
      'description_override',
      'evidence_required',
      'delivery_items_json',
    ],
    []
  );

  writeCsv(
    path.join(runDir, 'periodic_tasks.csv'),
    [
      'periodic_code',
      'site_job_code',
      'site_code',
      'site_name',
      'task_type',
      'frequency',
      'next_due_date',
      'description_override',
      'evidence_required',
      'auto_add_to_route',
      'notes',
    ],
    periodicSheetRows
  );

  writeCsv(
    path.join(runDir, 'supply_assignments_verification.csv'),
    ['site_code', 'site_name', 'assignment_count', 'verification_status', 'verification_notes'],
    supplyVerificationRows
  );

  writeCsv(
    path.join(runDir, 'microfiber_enrollments.csv'),
    [
      'staff_code',
      'full_name',
      'role',
      'microfiber_enrolled',
      'microfiber_enrolled_at',
      'microfiber_rate_per_set',
      'set_enroll_to_true',
      'new_rate_per_set',
      'notes',
    ],
    microfiberRows
  );

  const summary = {
    tenant_code: tenant.tenant_code,
    tenant_name: tenant.name,
    tenant_id: tenantId,
    route_templates_count: routeTemplates?.length ?? 0,
    sites_count: sites?.length ?? 0,
    sites_missing_procedures_or_windows: siteSheetRows.filter((row) => row.cutover_status === 'PENDING_ENTRY')
      .length,
    site_jobs_count: siteJobs?.length ?? 0,
    periodic_tasks_seed_rows: periodicSheetRows.length,
    supply_verification_rows: supplyVerificationRows.length,
    supply_source: supplySource,
    microfiber_rows: microfiberRows.length,
    output_dir: runDir,
  };

  fs.writeFileSync(path.join(runDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
