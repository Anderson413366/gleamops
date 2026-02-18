import { NextRequest, NextResponse } from 'next/server';
import { AUTH_002, createProblemDetails, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { getUserClient } from '@/lib/api/user-client';
import { hasAnyRole } from '@/lib/api/role-guard';
import { toCheckwritersCsv } from '@/modules/payroll/checkwriters';

const API_PATH = '/api/payroll/checkwriters/exports/[id]/download';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

function canDownloadPayroll(roles: string[]): boolean {
  return hasAnyRole(roles, ['OWNER_ADMIN', 'MANAGER', 'ADMIN', 'FINANCE']);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;
  if (!canDownloadPayroll(auth.roles)) return problemResponse(AUTH_002(API_PATH));

  const { id } = await params;
  const db = getUserClient(request);
  const serviceDb = getServiceClient();

  const { data: exportRow, error: exportError } = await db
    .from('payroll_exports')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('archived_at', null)
    .single();

  if (exportError || !exportRow) {
    return problemResponse(SYS_002(exportError?.message ?? 'Payroll export not found', API_PATH));
  }

  const { data: lines, error: linesError } = await db
    .from('payroll_export_lines')
    .select('employee_id, det, det_code, hours, rate, amount, line_number')
    .eq('export_id', id)
    .eq('tenant_id', auth.tenantId)
    .is('archived_at', null)
    .order('line_number', { ascending: true });

  if (linesError) return problemResponse(SYS_002(linesError.message, API_PATH));

  const csv = toCheckwritersCsv((lines ?? []).map((row) => ({
    employee_id: row.employee_id,
    det: row.det,
    det_code: row.det_code,
    hours: row.hours == null ? '' : Number(row.hours).toFixed(2),
    rate: row.rate == null ? '' : Number(row.rate).toFixed(2),
    amount: Number(row.amount ?? 0).toFixed(2),
  })));

  await db
    .from('payroll_exports')
    .update({ status: 'DOWNLOADED' })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId);

  await writeAuditMutation({
    db: serviceDb,
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: 'payroll_exports',
    entityId: id,
    action: 'DOWNLOAD',
    before: null,
    after: { file_name: exportRow.file_name, line_count: lines?.length ?? 0 },
    context: extractAuditContext(request, 'checkwriters_export_download'),
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportRow.file_name}"`,
      'Cache-Control': 'no-store',
    },
  });
}
