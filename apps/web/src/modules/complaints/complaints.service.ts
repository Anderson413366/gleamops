import sgMail from '@sendgrid/mail';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AUTH_002,
  SYS_002,
  createProblemDetails,
  type ComplaintDetail,
  type ComplaintRecord,
} from '@gleamops/shared';
import { hasAnyRole } from '@/lib/api/role-guard';
import type { AuthContext } from '@/lib/api/auth-guard';
import {
  currentStaffId,
  findRouteStopForSiteJobs,
  getComplaintByCode,
  getComplaintById,
  getPrimaryContactEmail,
  getSiteClient,
  insertComplaint,
  insertRouteTask,
  listComplaintTimeline,
  listComplaints,
  listRoutesForDate,
  listSiteJobsForSite,
  nextComplaintCode,
  nextTaskOrder,
  updateComplaintById,
} from './complaints.repository';

type ServiceResult<T = unknown> =
  | { success: true; data: T; status?: number }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

const COMPLAINT_VIEW_ROLES = ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'CLEANER', 'INSPECTOR'] as const;
const COMPLAINT_CREATE_ROLES = ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'SALES'] as const;
const COMPLAINT_EDIT_ROLES = ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'CLEANER', 'INSPECTOR'] as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function canViewComplaints(roles: string[]) {
  return hasAnyRole(roles, COMPLAINT_VIEW_ROLES);
}

function canCreateComplaints(roles: string[]) {
  return hasAnyRole(roles, COMPLAINT_CREATE_ROLES);
}

function canEditComplaints(roles: string[]) {
  return hasAnyRole(roles, COMPLAINT_EDIT_ROLES);
}

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizePhotos(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry)).filter(Boolean);
}

function appBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL
    ?? process.env.NEXT_PUBLIC_SITE_URL
    ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
    ?? 'https://gleamops.vercel.app';
  const prefixed = raw.startsWith('http') ? raw : `https://${raw}`;
  return prefixed.replace(/\/$/, '');
}

async function fetchComplaint(
  userDb: SupabaseClient,
  codeOrId: string,
) {
  if (UUID_PATTERN.test(codeOrId)) {
    return getComplaintById(userDb, codeOrId);
  }
  return getComplaintByCode(userDb, codeOrId.toUpperCase());
}

function missingComplaint(apiPath: string) {
  return createProblemDetails('CMP_001', 'Complaint not found', 404, 'Complaint was not found', apiPath);
}

export async function getComplaints(
  userDb: SupabaseClient,
  auth: AuthContext,
  filters: {
    status?: string | null;
    priority?: string | null;
    site_id?: string | null;
    date_from?: string | null;
    date_to?: string | null;
  },
  apiPath: string,
): Promise<ServiceResult> {
  if (!canViewComplaints(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const { data, error } = await listComplaints(userDb, filters);
  if (error) {
    return { success: false, error: SYS_002(error.message, apiPath) };
  }

  return { success: true, data: data ?? [] };
}

export async function createComplaint(
  userDb: SupabaseClient,
  auth: AuthContext,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canCreateComplaints(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const siteResult = await getSiteClient(userDb, String(payload.site_id));
  if (siteResult.error) {
    return { success: false, error: SYS_002(siteResult.error.message, apiPath) };
  }
  if (!siteResult.data) {
    return {
      success: false,
      error: createProblemDetails('CMP_002', 'Site not found', 404, 'Site was not found', apiPath),
    };
  }

  const codeResult = await nextComplaintCode(userDb, auth.tenantId);
  if (codeResult.error || typeof codeResult.data !== 'string') {
    return {
      success: false,
      error: SYS_002(codeResult.error?.message ?? 'Failed to generate complaint code', apiPath),
    };
  }

  const insertPayload = {
    tenant_id: auth.tenantId,
    complaint_code: codeResult.data,
    site_id: payload.site_id,
    client_id: siteResult.data.client_id ?? null,
    reported_by_type: payload.reported_by_type,
    reported_by_staff_id: payload.reported_by_staff_id ?? null,
    reported_by_name: payload.reported_by_name ?? null,
    source: payload.source,
    customer_original_message: payload.customer_original_message ?? null,
    category: payload.category,
    priority: payload.priority,
    status: payload.assigned_to_staff_id ? 'ASSIGNED' : 'OPEN',
    assigned_to_staff_id: payload.assigned_to_staff_id ?? null,
    linked_route_task_id: null,
    photos_before: null,
    photos_after: null,
    resolution_description: null,
    resolution_email_sent: false,
    resolution_email_sent_at: null,
    resolved_at: null,
    resolved_by: null,
  };

  const { data, error } = await insertComplaint(userDb, insertPayload);
  if (error || !data) {
    return {
      success: false,
      error: SYS_002(error?.message ?? 'Failed to create complaint', apiPath),
    };
  }

  return { success: true, data, status: 201 };
}

export async function getComplaint(
  userDb: SupabaseClient,
  auth: AuthContext,
  codeOrId: string,
  apiPath: string,
): Promise<ServiceResult<ComplaintDetail>> {
  if (!canViewComplaints(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const complaintResult = await fetchComplaint(userDb, codeOrId);
  if (complaintResult.error) {
    return { success: false, error: SYS_002(complaintResult.error.message, apiPath) };
  }
  if (!complaintResult.data) {
    return { success: false, error: missingComplaint(apiPath) };
  }

  const complaint = complaintResult.data as ComplaintRecord & Record<string, unknown>;
  const timelineResult = await listComplaintTimeline(userDb, complaint.id);
  if (timelineResult.error) {
    return { success: false, error: SYS_002(timelineResult.error.message, apiPath) };
  }

  return {
    success: true,
    data: {
      ...(complaint as unknown as ComplaintDetail),
      photos_before: normalizePhotos(complaint.photos_before),
      photos_after: normalizePhotos(complaint.photos_after),
      timeline: (timelineResult.data ?? []) as ComplaintDetail['timeline'],
    },
  };
}

export async function patchComplaint(
  userDb: SupabaseClient,
  auth: AuthContext,
  codeOrId: string,
  payload: Record<string, unknown>,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canEditComplaints(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const complaintResult = await fetchComplaint(userDb, codeOrId);
  if (complaintResult.error) {
    return { success: false, error: SYS_002(complaintResult.error.message, apiPath) };
  }
  if (!complaintResult.data) {
    return { success: false, error: missingComplaint(apiPath) };
  }

  const complaint = complaintResult.data as ComplaintRecord;
  const { version_etag, ...changes } = payload;
  const updated = await updateComplaintById(
    userDb,
    complaint.id,
    {
      ...changes,
      version_etag: crypto.randomUUID(),
    },
    String(version_etag),
  );

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
        'Complaint was modified by another user. Refresh and try again.',
        apiPath,
      ),
    };
  }

  return { success: true, data: updated.data };
}

export async function resolveComplaint(
  userDb: SupabaseClient,
  auth: AuthContext,
  codeOrId: string,
  payload: { resolution_description: string },
  apiPath: string,
): Promise<ServiceResult> {
  if (!canEditComplaints(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const complaintResult = await fetchComplaint(userDb, codeOrId);
  if (complaintResult.error) {
    return { success: false, error: SYS_002(complaintResult.error.message, apiPath) };
  }
  if (!complaintResult.data) {
    return { success: false, error: missingComplaint(apiPath) };
  }

  const complaint = complaintResult.data as ComplaintRecord;
  const staffId = await currentStaffId(userDb, auth.userId);
  const updateResult = await updateComplaintById(
    userDb,
    complaint.id,
    {
      status: 'RESOLVED',
      resolution_description: payload.resolution_description,
      resolved_at: new Date().toISOString(),
      resolved_by: staffId,
      version_etag: crypto.randomUUID(),
    },
    null,
  );

  if (updateResult.error || !updateResult.data) {
    return {
      success: false,
      error: SYS_002(updateResult.error?.message ?? 'Failed to resolve complaint', apiPath),
    };
  }

  return { success: true, data: updateResult.data };
}

export async function injectComplaintToRoute(
  userDb: SupabaseClient,
  auth: AuthContext,
  codeOrId: string,
  payload: { description: string; evidence_required?: boolean },
  apiPath: string,
): Promise<ServiceResult> {
  if (!canEditComplaints(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const complaintResult = await fetchComplaint(userDb, codeOrId);
  if (complaintResult.error) {
    return { success: false, error: SYS_002(complaintResult.error.message, apiPath) };
  }
  if (!complaintResult.data) {
    return { success: false, error: missingComplaint(apiPath) };
  }

  const complaint = complaintResult.data as ComplaintRecord;
  const siteJobsResult = await listSiteJobsForSite(userDb, complaint.site_id);
  if (siteJobsResult.error) {
    return { success: false, error: SYS_002(siteJobsResult.error.message, apiPath) };
  }

  const siteJobIds = ((siteJobsResult.data ?? []) as Array<{ id: string }>).map((row) => row.id);
  if (siteJobIds.length === 0) {
    return {
      success: false,
      error: createProblemDetails('CMP_003', 'No job for site', 404, 'No active job found for this site', apiPath),
    };
  }

  const routesResult = await listRoutesForDate(userDb, auth.tenantId, todayDateKey());
  if (routesResult.error) {
    return { success: false, error: SYS_002(routesResult.error.message, apiPath) };
  }

  const routeIds = ((routesResult.data ?? []) as Array<{ id: string }>).map((row) => row.id);
  if (routeIds.length === 0) {
    return {
      success: false,
      error: createProblemDetails(
        'CMP_004',
        'No route tonight',
        409,
        'No route exists for tonight. Generate or publish routes first.',
        apiPath,
      ),
    };
  }

  const stopResult = await findRouteStopForSiteJobs(userDb, routeIds, siteJobIds);
  if (stopResult.error) {
    return { success: false, error: SYS_002(stopResult.error.message, apiPath) };
  }
  if (!stopResult.data) {
    return {
      success: false,
      error: createProblemDetails(
        'CMP_005',
        'Site not on route',
        404,
        'No stop for this site was found on tonight\'s routes.',
        apiPath,
      ),
    };
  }

  const stop = stopResult.data as { id: string; route_id: string };
  const order = await nextTaskOrder(userDb, stop.id);
  const taskInsert = await insertRouteTask(userDb, {
    tenant_id: auth.tenantId,
    route_stop_id: stop.id,
    task_type: 'CUSTOM',
    description: payload.description,
    task_order: order,
    is_completed: false,
    evidence_required: payload.evidence_required ?? true,
    evidence_photos: null,
    notes: null,
    delivery_items: null,
    is_from_template: false,
    source_complaint_id: complaint.id,
  });

  if (taskInsert.error || !taskInsert.data) {
    return {
      success: false,
      error: SYS_002(taskInsert.error?.message ?? 'Failed to inject route task', apiPath),
    };
  }

  const complaintUpdate = await updateComplaintById(
    userDb,
    complaint.id,
    {
      linked_route_task_id: (taskInsert.data as { id: string }).id,
      status: 'IN_PROGRESS',
      version_etag: crypto.randomUUID(),
    },
    null,
  );
  if (complaintUpdate.error || !complaintUpdate.data) {
    return {
      success: false,
      error: SYS_002(complaintUpdate.error?.message ?? 'Task injected but complaint update failed', apiPath),
    };
  }

  return {
    success: true,
    data: {
      complaint: complaintUpdate.data,
      route_task: taskInsert.data,
    },
  };
}

async function appendPhoto(
  userDb: SupabaseClient,
  codeOrId: string,
  photoUrl: string,
  kind: 'before' | 'after',
  apiPath: string,
): Promise<ServiceResult> {
  const complaintResult = await fetchComplaint(userDb, codeOrId);
  if (complaintResult.error) {
    return { success: false, error: SYS_002(complaintResult.error.message, apiPath) };
  }
  if (!complaintResult.data) {
    return { success: false, error: missingComplaint(apiPath) };
  }

  const complaint = complaintResult.data as ComplaintRecord & Record<string, unknown>;
  const column = kind === 'before' ? 'photos_before' : 'photos_after';
  const existingPhotos = normalizePhotos(complaint[column]);
  const nextPhotos = Array.from(new Set([...existingPhotos, photoUrl]));

  const updated = await updateComplaintById(
    userDb,
    complaint.id,
    {
      [column]: nextPhotos,
      version_etag: crypto.randomUUID(),
    },
    null,
  );

  if (updated.error || !updated.data) {
    return {
      success: false,
      error: SYS_002(updated.error?.message ?? 'Failed to save complaint photo', apiPath),
    };
  }

  return { success: true, data: updated.data };
}

export async function addComplaintPhotoBefore(
  userDb: SupabaseClient,
  auth: AuthContext,
  codeOrId: string,
  photoUrl: string,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canEditComplaints(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }
  return appendPhoto(userDb, codeOrId, photoUrl, 'before', apiPath);
}

export async function addComplaintPhotoAfter(
  userDb: SupabaseClient,
  auth: AuthContext,
  codeOrId: string,
  photoUrl: string,
  apiPath: string,
): Promise<ServiceResult> {
  if (!canEditComplaints(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }
  return appendPhoto(userDb, codeOrId, photoUrl, 'after', apiPath);
}

export async function sendComplaintResolutionEmail(
  userDb: SupabaseClient,
  auth: AuthContext,
  codeOrId: string,
  payload: { subject?: string | null; message?: string | null },
  apiPath: string,
): Promise<ServiceResult> {
  if (!canEditComplaints(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const complaintResult = await fetchComplaint(userDb, codeOrId);
  if (complaintResult.error) {
    return { success: false, error: SYS_002(complaintResult.error.message, apiPath) };
  }
  if (!complaintResult.data) {
    return { success: false, error: missingComplaint(apiPath) };
  }

  const complaint = complaintResult.data as ComplaintRecord & {
    site?: { name?: string | null } | null;
  };

  if (!complaint.resolution_description?.trim()) {
    return {
      success: false,
      error: createProblemDetails(
        'CMP_006',
        'Complaint not resolved',
        409,
        'Add a resolution description before sending the resolution email.',
        apiPath,
      ),
    };
  }

  const contact = await getPrimaryContactEmail(userDb, complaint.site_id, complaint.client_id);
  if (contact.error) {
    return { success: false, error: SYS_002(contact.error.message, apiPath) };
  }
  if (!contact.data?.email) {
    return {
      success: false,
      error: createProblemDetails(
        'CMP_007',
        'No contact email',
        404,
        'No customer contact email was found for this complaint site/client.',
        apiPath,
      ),
    };
  }

  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  if (!sendgridApiKey) {
    return {
      success: false,
      error: createProblemDetails('CMP_008', 'Email provider unavailable', 503, 'SendGrid is not configured.', apiPath),
    };
  }

  sgMail.setApiKey(sendgridApiKey);

  const siteName = complaint.site?.name ?? 'Site';
  const dateLabel = new Date().toLocaleDateString('en-US');
  const defaultSubject = `Cleaning Service Update - ${siteName} - ${dateLabel}`;
  const subject = payload.subject?.trim() || defaultSubject;

  const contactName = contact.data.name?.trim() || 'Customer';
  const senderName = auth.userId;
  const beforePhotos = normalizePhotos(complaint.photos_before);
  const afterPhotos = normalizePhotos(complaint.photos_after);
  const photoLines = [...beforePhotos.map((url) => `Before: ${url}`), ...afterPhotos.map((url) => `After: ${url}`)];

  const defaultBody = [
    `Dear ${contactName},`,
    '',
    `Thank you for your feedback about ${siteName}.`,
    '',
    `We took the following action on ${dateLabel}:`,
    complaint.resolution_description,
    '',
    'Please see the attached photos showing the before and after results.',
    ...photoLines,
    '',
    'If you have any further concerns, please reach out.',
    '',
    'Best regards,',
    senderName,
    'Anderson Cleaning',
  ].join('\n');

  const textBody = payload.message?.trim() || defaultBody;
  const htmlBody = textBody
    .split('\n')
    .map((line) => `<p style="margin:0 0 10px;">${line}</p>`)
    .join('');

  try {
    await sgMail.send({
      to: contact.data.email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL ?? 'notifications@gleamops.com',
        name: process.env.SENDGRID_FROM_NAME ?? 'GleamOps',
      },
      subject,
      text: textBody,
      html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:640px;margin:0 auto;color:#1f2937;">${htmlBody}</div>`,
    }, false);
  } catch (error) {
    return {
      success: false,
      error: SYS_002(error instanceof Error ? error.message : 'Failed to send resolution email', apiPath),
    };
  }

  const updated = await updateComplaintById(
    userDb,
    complaint.id,
    {
      resolution_email_sent: true,
      resolution_email_sent_at: new Date().toISOString(),
      version_etag: crypto.randomUUID(),
    },
    null,
  );
  if (updated.error || !updated.data) {
    return {
      success: false,
      error: SYS_002(updated.error?.message ?? 'Email sent but complaint update failed', apiPath),
    };
  }

  return {
    success: true,
    data: {
      complaint: updated.data,
      sent_to: contact.data.email,
      subject,
      preview_url: `${appBaseUrl()}/operations/complaints/${encodeURIComponent(complaint.complaint_code)}`,
    },
  };
}
