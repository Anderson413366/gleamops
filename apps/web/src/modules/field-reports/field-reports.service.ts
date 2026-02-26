import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AUTH_002,
  SYS_002,
  createProblemDetails,
  type FieldReportListItem,
} from '@gleamops/shared';
import { hasAnyRole } from '@/lib/api/role-guard';
import type { AuthContext } from '@/lib/api/auth-guard';
import {
  currentStaffId,
  getFieldReportByCode,
  insertFieldReport,
  insertNotifications,
  listFieldReportRecipients,
  listFieldReports,
  listMyFieldReports,
  nextFieldReportCode,
  updateFieldReportById,
} from './field-reports.repository';
import { getServiceClient } from '@/lib/api/service-client';

type ServiceResult<T = unknown> =
  | { success: true; data: T; status?: number }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

const FIELD_REPORT_VIEW_ROLES = ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'] as const;
const FIELD_REPORT_CREATE_ROLES = ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'CLEANER', 'INSPECTOR'] as const;
const FIELD_REPORT_UPDATE_ROLES = ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'] as const;

function toFieldReportListItems(rows: unknown): FieldReportListItem[] {
  return rows as FieldReportListItem[];
}

function toFieldReportListItem(row: unknown): FieldReportListItem {
  return row as FieldReportListItem;
}

function canViewFieldReports(roles: string[]) {
  return hasAnyRole(roles, FIELD_REPORT_VIEW_ROLES);
}

function canCreateFieldReports(roles: string[]) {
  return hasAnyRole(roles, FIELD_REPORT_CREATE_ROLES);
}

function canUpdateFieldReports(roles: string[]) {
  return hasAnyRole(roles, FIELD_REPORT_UPDATE_ROLES);
}

function missingFieldReport(apiPath: string) {
  return createProblemDetails('FIELD_001', 'Field report not found', 404, 'Field report was not found', apiPath);
}

export async function getFieldReports(
  userDb: SupabaseClient,
  auth: AuthContext,
  filters: {
    report_type?: string | null;
    status?: string | null;
    site_id?: string | null;
  },
  apiPath: string,
): Promise<ServiceResult<FieldReportListItem[]>> {
  if (!canViewFieldReports(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await listFieldReports(userDb, filters);
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data: toFieldReportListItems(data ?? []) };
}

export async function getMyReports(
  userDb: SupabaseClient,
  auth: AuthContext,
  apiPath: string,
): Promise<ServiceResult<FieldReportListItem[]>> {
  const staffId = await currentStaffId(userDb, auth.userId);
  if (!staffId) {
    return { success: true, data: [] };
  }

  const { data, error } = await listMyFieldReports(userDb, staffId);
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data: toFieldReportListItems(data ?? []) };
}

export async function createFieldReport(
  userDb: SupabaseClient,
  auth: AuthContext,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult<FieldReportListItem>> {
  if (!canCreateFieldReports(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const staffId = await currentStaffId(userDb, auth.userId);
  if (!staffId) {
    return {
      success: false,
      error: createProblemDetails('FIELD_002', 'Staff profile missing', 409, 'User has no active staff profile.', apiPath),
    };
  }

  const codeResult = await nextFieldReportCode(userDb, auth.tenantId);
  if (codeResult.error || typeof codeResult.data !== 'string') {
    return {
      success: false,
      error: SYS_002(codeResult.error?.message ?? 'Failed to generate field report code', apiPath),
    };
  }

  const insertPayload = {
    tenant_id: auth.tenantId,
    report_code: codeResult.data,
    report_type: payload.report_type,
    reported_by: staffId,
    site_id: payload.site_id ?? null,
    description: payload.description,
    priority: payload.priority ?? 'NORMAL',
    photos: payload.photos ?? null,
    requested_items: payload.requested_items ?? null,
    requested_date: payload.requested_date ?? null,
    status: 'OPEN',
    acknowledged_by: null,
    acknowledged_at: null,
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
  };

  const { data, error } = await insertFieldReport(userDb, insertPayload);
  if (error || !data) {
    return {
      success: false,
      error: SYS_002(error?.message ?? 'Failed to create field report', apiPath),
    };
  }

  const created = toFieldReportListItem(data);
  try {
    const serviceDb = getServiceClient();
    const recipientsResult = await listFieldReportRecipients(serviceDb, auth.tenantId);
    if (!recipientsResult.error) {
      const recipientIds = Array.from(
        new Set(
          (recipientsResult.data ?? [])
            .map((row) => (row as { user_id?: string }).user_id)
            .filter((value): value is string => typeof value === 'string' && value.length > 0),
        ),
      ).filter((userId) => userId !== auth.userId);

      if (recipientIds.length > 0) {
        await insertNotifications(
          serviceDb,
          recipientIds.map((userId) => ({
            tenant_id: auth.tenantId,
            user_id: userId,
            title: 'New field report',
            body: `${created.report_code} (${created.report_type}) was submitted.`,
            link: '/workforce?tab=field-reports',
          })),
        );
      }
    }
  } catch {
    // Notification delivery is best effort.
  }

  return { success: true, data: created, status: 201 };
}

export async function getFieldReport(
  userDb: SupabaseClient,
  auth: AuthContext,
  code: string,
  apiPath: string,
): Promise<ServiceResult<FieldReportListItem>> {
  const reportResult = await getFieldReportByCode(userDb, code.toUpperCase());
  if (reportResult.error) {
    return { success: false, error: SYS_002(reportResult.error.message, apiPath) };
  }
  if (!reportResult.data) {
    return { success: false, error: missingFieldReport(apiPath) };
  }

  const row = toFieldReportListItem(reportResult.data);
  const isOwner = row.reported_by === (await currentStaffId(userDb, auth.userId));
  if (!canViewFieldReports(auth.roles) && !isOwner) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  return { success: true, data: row };
}

export async function patchFieldReport(
  userDb: SupabaseClient,
  auth: AuthContext,
  code: string,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult<FieldReportListItem>> {
  if (!canUpdateFieldReports(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const reportResult = await getFieldReportByCode(userDb, code.toUpperCase());
  if (reportResult.error) {
    return { success: false, error: SYS_002(reportResult.error.message, apiPath) };
  }
  if (!reportResult.data) {
    return { success: false, error: missingFieldReport(apiPath) };
  }

  const report = toFieldReportListItem(reportResult.data);
  const { version_etag, ...changes } = payload;
  const staffId = await currentStaffId(userDb, auth.userId);
  const nextStatus = String(changes.status ?? report.status);
  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    ...changes,
    version_etag: crypto.randomUUID(),
  };

  if (nextStatus === 'ACKNOWLEDGED' || nextStatus === 'IN_PROGRESS') {
    updatePayload.acknowledged_by = report.acknowledged_by ?? staffId;
    updatePayload.acknowledged_at = report.acknowledged_at ?? now;
  }

  if (nextStatus === 'RESOLVED' || nextStatus === 'DISMISSED') {
    updatePayload.resolved_by = staffId;
    updatePayload.resolved_at = now;
    if (!('resolution_notes' in updatePayload)) {
      updatePayload.resolution_notes = report.resolution_notes ?? null;
    }
  }

  const updated = await updateFieldReportById(userDb, report.id, updatePayload, String(version_etag));
  if (updated.error) {
    return { success: false, error: SYS_002(updated.error.message, apiPath) };
  }
  if (!updated.data) {
    return {
      success: false,
      error: createProblemDetails(
        'SYS_003',
        'Conflict',
        409,
        'Field report was modified by another user. Refresh and retry.',
        apiPath,
      ),
    };
  }

  return { success: true, data: toFieldReportListItem(updated.data) };
}
