import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_002, createProblemDetails, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';
import { hasAnyRole } from '@/lib/api/role-guard';

const API_PATH = '/api/payroll/checkwriters/config';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

const configSchema = z.object({
  integration_connection_id: z.string().uuid(),
  profile_name: z.string().min(1),
  column_schema_json: z.array(z.object({
    key: z.string(),
    label: z.string(),
    enabled: z.boolean(),
    order_index: z.number().int().nonnegative(),
  })),
  code_map: z.array(z.object({
    internal_pay_code: z.string().min(1),
    det: z.enum(['E', 'D', 'T']),
    det_code: z.string().min(1),
    default_rate: z.string().nullable().optional(),
  })).default([]),
  employee_map: z.array(z.object({
    staff_id: z.string().uuid(),
    external_employee_id: z.string().min(1),
  })).default([]),
});

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

function canManagePayroll(roles: string[]): boolean {
  return hasAnyRole(roles, ['OWNER_ADMIN', 'MANAGER', 'ADMIN', 'FINANCE']);
}

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!canManagePayroll(auth.roles)) return problemResponse(AUTH_002(API_PATH));

  const connectionId = request.nextUrl.searchParams.get('integration_connection_id');
  if (!connectionId) {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, 'integration_connection_id is required', API_PATH));
  }

  const db = getUserClient(request);

  const [profileRes, codeMapRes, employeeRes] = await Promise.all([
    db
      .from('checkwriters_import_profiles')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('integration_connection_id', connectionId)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(1),
    db
      .from('checkwriters_code_map')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('integration_connection_id', connectionId)
      .is('archived_at', null)
      .order('internal_pay_code', { ascending: true }),
    db
      .from('payroll_employee_external_ids')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('integration_connection_id', connectionId)
      .is('archived_at', null)
      .order('updated_at', { ascending: false }),
  ]);

  if (profileRes.error) return problemResponse(SYS_002(profileRes.error.message, API_PATH));
  if (codeMapRes.error) return problemResponse(SYS_002(codeMapRes.error.message, API_PATH));
  if (employeeRes.error) return problemResponse(SYS_002(employeeRes.error.message, API_PATH));

  return NextResponse.json({
    success: true,
    data: {
      profile: profileRes.data?.[0] ?? null,
      code_map: codeMapRes.data ?? [],
      employee_map: employeeRes.data ?? [],
    },
  });
}

export async function PUT(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!canManagePayroll(auth.roles)) return problemResponse(AUTH_002(API_PATH));

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, 'Invalid JSON body', API_PATH));
  }

  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, parsed.error.issues[0]?.message ?? 'Invalid payload', API_PATH));
  }

  const payload = parsed.data;
  const db = getUserClient(request);
  const serviceDb = getServiceClient();

  const { data: connection, error: connectionError } = await db
    .from('integration_connections')
    .select('id, integration_type, provider_name')
    .eq('id', payload.integration_connection_id)
    .eq('tenant_id', auth.tenantId)
    .is('archived_at', null)
    .single();

  if (connectionError || !connection) {
    return problemResponse(SYS_002(connectionError?.message ?? 'Integration connection not found', API_PATH));
  }

  if ((connection.integration_type ?? '').toUpperCase() !== 'PAYROLL') {
    return problemResponse(createProblemDetails('PAY_CW_001', 'Invalid integration type', 400, 'Integration connection must be PAYROLL type', API_PATH));
  }

  const { data: profile, error: profileError } = await db
    .from('checkwriters_import_profiles')
    .upsert({
      tenant_id: auth.tenantId,
      integration_connection_id: payload.integration_connection_id,
      profile_name: payload.profile_name,
      column_schema_json: payload.column_schema_json,
      is_active: true,
    }, { onConflict: 'tenant_id,integration_connection_id,profile_name' })
    .select('*')
    .single();

  if (profileError) return problemResponse(SYS_002(profileError.message, API_PATH));

  if (payload.code_map.length > 0) {
    const { error } = await db
      .from('checkwriters_code_map')
      .upsert(payload.code_map.map((row) => ({
        tenant_id: auth.tenantId,
        integration_connection_id: payload.integration_connection_id,
        internal_pay_code: row.internal_pay_code,
        det: row.det,
        det_code: row.det_code,
        default_rate: row.default_rate ?? null,
      })), { onConflict: 'tenant_id,integration_connection_id,internal_pay_code' });

    if (error) return problemResponse(SYS_002(error.message, API_PATH));
  }

  if (payload.employee_map.length > 0) {
    const { error } = await db
      .from('payroll_employee_external_ids')
      .upsert(payload.employee_map.map((row) => ({
        tenant_id: auth.tenantId,
        integration_connection_id: payload.integration_connection_id,
        staff_id: row.staff_id,
        external_employee_id: row.external_employee_id,
      })), { onConflict: 'tenant_id,integration_connection_id,staff_id' });

    if (error) return problemResponse(SYS_002(error.message, API_PATH));
  }

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'checkwriters_import_profiles',
    entityId: profile?.id ?? null,
    action: 'UPSERT',
    before: null,
    after: {
      profile,
      code_map_count: payload.code_map.length,
      employee_map_count: payload.employee_map.length,
    },
    context: extractAuditContext(request, 'checkwriters_config_upsert'),
  });

  return NextResponse.json({
    success: true,
    data: {
      profile,
      code_map_count: payload.code_map.length,
      employee_map_count: payload.employee_map.length,
    },
  });
}
