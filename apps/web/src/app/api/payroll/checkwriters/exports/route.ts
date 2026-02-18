import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_002, createProblemDetails, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';
import { hasAnyRole } from '@/lib/api/role-guard';
import {
  buildCheckwritersLines,
  buildCodeMapIndex,
  defaultCheckwritersFileName,
} from '@/modules/payroll/checkwriters';

const API_PATH = '/api/payroll/checkwriters/exports';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

const exportSchema = z.object({
  integration_connection_id: z.string().uuid(),
  pay_period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pay_period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payroll_run_id: z.string().uuid().optional(),
  import_profile_id: z.string().uuid().optional(),
  file_name: z.string().optional(),
});

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

function canExportPayroll(roles: string[]): boolean {
  return hasAnyRole(roles, ['OWNER_ADMIN', 'MANAGER', 'ADMIN', 'FINANCE']);
}

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!canExportPayroll(auth.roles)) return problemResponse(AUTH_002(API_PATH));

  const db = getUserClient(request);
  const { data, error } = await db
    .from('payroll_exports')
    .select('id, file_name, pay_period_start, pay_period_end, status, line_count, total_hours, total_amount, created_at')
    .eq('tenant_id', auth.tenantId)
    .eq('provider', 'CHECKWRITERS')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return problemResponse(SYS_002(error.message, API_PATH));
  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!canExportPayroll(auth.roles)) return problemResponse(AUTH_002(API_PATH));

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, 'Invalid JSON body', API_PATH));
  }

  const parsed = exportSchema.safeParse(body);
  if (!parsed.success) {
    return problemResponse(createProblemDetails('VALIDATION_001', 'Validation failed', 400, parsed.error.issues[0]?.message ?? 'Invalid payload', API_PATH));
  }

  const payload = parsed.data;
  const db = getUserClient(request);
  const serviceDb = getServiceClient();

  const { data: codeMapRows, error: codeMapError } = await db
    .from('checkwriters_code_map')
    .select('internal_pay_code, det, det_code, default_rate')
    .eq('tenant_id', auth.tenantId)
    .eq('integration_connection_id', payload.integration_connection_id)
    .is('archived_at', null);

  if (codeMapError) return problemResponse(SYS_002(codeMapError.message, API_PATH));

  const { data: employeeRows, error: employeeError } = await db
    .from('payroll_employee_external_ids')
    .select('staff_id, external_employee_id')
    .eq('tenant_id', auth.tenantId)
    .eq('integration_connection_id', payload.integration_connection_id)
    .is('archived_at', null);

  if (employeeError) return problemResponse(SYS_002(employeeError.message, API_PATH));

  const employeeMap = (employeeRows ?? []).reduce<Record<string, string>>((acc, row) => {
    acc[row.staff_id] = row.external_employee_id;
    return acc;
  }, {});

  let runIds: string[] = [];
  if (payload.payroll_run_id) {
    runIds = [payload.payroll_run_id];
  } else {
    const { data: periods, error: periodError } = await db
      .from('pay_periods')
      .select('id')
      .eq('tenant_id', auth.tenantId)
      .is('archived_at', null)
      .gte('period_start', payload.pay_period_start)
      .lte('period_end', payload.pay_period_end)
      .limit(200);

    if (periodError) return problemResponse(SYS_002(periodError.message, API_PATH));

    const periodIds = (periods ?? []).map((row) => row.id);
    if (periodIds.length === 0) {
      return problemResponse(createProblemDetails('PAY_CW_002', 'No pay periods found', 404, 'No pay periods found in selected date range', API_PATH));
    }

    const { data: runs, error: runError } = await db
      .from('payroll_runs')
      .select('id')
      .eq('tenant_id', auth.tenantId)
      .in('pay_period_id', periodIds)
      .in('status', ['APPROVED', 'EXPORTED'])
      .is('archived_at', null)
      .limit(500);

    if (runError) return problemResponse(SYS_002(runError.message, API_PATH));
    runIds = (runs ?? []).map((row) => row.id);
  }

  if (runIds.length === 0) {
    return problemResponse(createProblemDetails('PAY_CW_003', 'No payroll runs found', 404, 'No approved payroll runs found for selected range', API_PATH));
  }

  const { data: lineItems, error: lineItemsError } = await db
    .from('payroll_line_items')
    .select('id, payroll_run_id, staff_id, hours, rate, amount, earning_code:earning_code_id(code)')
    .eq('tenant_id', auth.tenantId)
    .in('payroll_run_id', runIds)
    .is('archived_at', null)
    .limit(5000);

  if (lineItemsError) return problemResponse(SYS_002(lineItemsError.message, API_PATH));

  const missingStaff = new Set<string>();
  const normalizedLineItems = (lineItems ?? []).map((row: Record<string, unknown>) => {
    const staffId = (row.staff_id as string) ?? '';
    if (!employeeMap[staffId]) missingStaff.add(staffId);
    const earningCode = ((row.earning_code as { code?: string } | null)?.code ?? 'REG').toUpperCase();

    return {
      source_line_item_id: row.id as string,
      staff_id: staffId,
      earning_code: earningCode,
      hours: Number(row.hours ?? 0),
      rate: row.rate == null ? null : Number(row.rate),
      amount: Number(row.amount ?? 0),
    };
  });

  if (missingStaff.size > 0) {
    return problemResponse(createProblemDetails(
      'PAY_CW_004',
      'Missing employee mapping',
      400,
      `Missing external employee mapping for ${missingStaff.size} staff member(s)`,
      API_PATH,
      Array.from(missingStaff).slice(0, 20).map((id) => ({ field: 'staff_id', message: id })),
    ));
  }

  const buildResult = buildCheckwritersLines({
    lines: normalizedLineItems,
    employeeMap,
    codeMap: buildCodeMapIndex((codeMapRows ?? []) as never),
  });

  const fileName = payload.file_name
    ?? defaultCheckwritersFileName({
      pay_period_start: payload.pay_period_start,
      pay_period_end: payload.pay_period_end,
    });

  if (fileName.length >= 15) {
    return problemResponse(createProblemDetails('PAY_CW_005', 'Invalid filename', 400, 'File name must be under 15 characters', API_PATH));
  }

  const { data: exportRow, error: exportError } = await db
    .from('payroll_exports')
    .insert({
      tenant_id: auth.tenantId,
      provider: 'CHECKWRITERS',
      pay_period_start: payload.pay_period_start,
      pay_period_end: payload.pay_period_end,
      import_profile_id: payload.import_profile_id ?? null,
      payroll_run_id: payload.payroll_run_id ?? null,
      file_name: fileName,
      status: 'GENERATED',
      line_count: buildResult.lines.length,
      total_hours: buildResult.totals.hours,
      total_amount: buildResult.totals.amount,
      created_by: auth.userId,
    })
    .select('*')
    .single();

  if (exportError || !exportRow) {
    return problemResponse(SYS_002(exportError?.message ?? 'Failed to create export', API_PATH));
  }

  const exportLinesPayload = buildResult.lines.map((line, index) => ({
    tenant_id: auth.tenantId,
    export_id: exportRow.id,
    employee_id: line.employee_id,
    det: line.det,
    det_code: line.det_code,
    hours: line.hours === '' ? null : Number(line.hours),
    rate: line.rate === '' ? null : Number(line.rate),
    amount: Number(line.amount || 0),
    cost_center_code: line.cost_center_code ?? null,
    job_code: line.job_code ?? null,
    line_number: index + 1,
    source_line_item_id: normalizedLineItems[index]?.source_line_item_id ?? null,
  }));

  const { error: linesError } = await db
    .from('payroll_export_lines')
    .insert(exportLinesPayload);

  if (linesError) return problemResponse(SYS_002(linesError.message, API_PATH));

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'payroll_exports',
    entityId: exportRow.id,
    action: 'CREATE',
    before: null,
    after: {
      file_name: fileName,
      line_count: buildResult.lines.length,
      total_hours: buildResult.totals.hours,
      total_amount: buildResult.totals.amount,
      provider: 'CHECKWRITERS',
    },
    context: extractAuditContext(request, 'checkwriters_export_create'),
  });

  return NextResponse.json({
    success: true,
    data: {
      id: exportRow.id,
      file_name: fileName,
      line_count: buildResult.lines.length,
      totals: buildResult.totals,
    },
  }, { status: 201 });
}
