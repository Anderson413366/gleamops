/**
 * Inventory count submission service.
 * Next due date calculation, alert status, count finalization.
 * Extracted verbatim from api/public/counts/[token]/submit/route.ts
 */
import {
  createDb,
  findCountByToken,
  findCountByCode,
  findCountDetails,
  updateCountDetail,
  updateCountStatus,
  getSiteFrequency,
  updateSiteCountSchedule,
} from './counts.repository';

interface SubmitPayload {
  countedByName?: string | null;
  notes?: string | null;
  items?: Array<{
    id: string;
    quantity: number | string | null;
    notes?: string | null;
    photoUrls?: string[] | null;
  }>;
}

type ServiceResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string; status: number; extra?: Record<string, unknown> };

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function sanitizePhotoUrls(
  value: unknown,
  options?: { countId?: string; itemId?: string },
): string[] {
  const urls = toStringArray(value);
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
  const allowedPrefix = base ? `${base}/storage/v1/object/public/documents/` : null;
  const documentsPathPrefix = '/storage/v1/object/public/documents/';
  const itemPathSegment = options?.countId && options?.itemId
    ? `/inventory-count-photos/${options.countId}/${options.itemId}/`
    : '/inventory-count-photos/';

  return urls.filter((url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return false;
      if (!parsed.pathname.startsWith(documentsPathPrefix)) return false;
      if (!parsed.pathname.includes(itemPathSegment)) return false;

      if (allowedPrefix) {
        return url.startsWith(allowedPrefix);
      }

      return parsed.hostname.endsWith('.supabase.co');
    } catch {
      return false;
    }
  });
}

export function nextDueDate(fromDate: string, frequency: string | null): string {
  const base = new Date(`${fromDate}T00:00:00`);
  const freq = (frequency ?? 'MONTHLY').toUpperCase();
  switch (freq) {
    case 'WEEKLY':
      base.setDate(base.getDate() + 7);
      break;
    case 'BIWEEKLY':
      base.setDate(base.getDate() + 14);
      break;
    case 'QUARTERLY':
      base.setMonth(base.getMonth() + 3);
      break;
    case 'MONTHLY':
    default:
      base.setMonth(base.getMonth() + 1);
      break;
  }
  return base.toISOString().slice(0, 10);
}

export function buildAlert(nextDue: string): string {
  const now = new Date();
  const due = new Date(`${nextDue}T00:00:00`);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return 'OVERDUE';
  if (diffDays <= 7) return 'DUE_SOON';
  return 'ON_TRACK';
}

export async function submitCount(
  token: string,
  payload: SubmitPayload,
): Promise<ServiceResult> {
  const db = createDb();

  // Find count row by token or code (fallback)
  type CountRow = { id: string; site_id: string | null; count_date: string; status: string; tenant_id: string };

  const { data: tokenCountRow, error: tokenCountError } = await findCountByToken(db, token);
  let countRow = tokenCountRow as unknown as CountRow | null;
  let countError = tokenCountError as { message: string } | null;

  if (countError?.message?.toLowerCase().includes('public_token')) {
    const { data: fallbackRow, error: fallbackError } = await findCountByCode(db, token);
    countRow = fallbackRow as unknown as CountRow | null;
    countError = fallbackError as { message: string } | null;
  }

  if (countError) return { success: false, error: countError.message, status: 500 };
  if (!countRow) return { success: false, error: 'Count form not found.', status: 404 };
  if (['SUBMITTED', 'COMPLETED', 'CANCELLED'].includes(String(countRow.status).toUpperCase())) {
    return { success: false, error: 'This count is already closed.', status: 409 };
  }

  // Load detail rows
  const { data: detailRows, error: detailError } = await findCountDetails(db, countRow.id);
  if (detailError) return { success: false, error: detailError.message, status: 500 };

  const detailList = (detailRows ?? []) as Array<{ id: string; actual_qty: number | null; photo_urls: string[] | null }>;
  const validIds = new Set(detailList.map((row) => row.id));

  // Update detail quantities
  const updates = (payload.items ?? [])
    .filter((item) => validIds.has(item.id))
    .map((item) => updateCountDetail(
      db,
      item.id,
      countRow!.id,
      toNullableNumber(item.quantity),
      item.notes ?? null,
      sanitizePhotoUrls(item.photoUrls, {
        countId: countRow!.id,
        itemId: item.id,
      }),
    ));

  if (updates.length > 0) {
    const updateResults = await Promise.all(updates);
    const failed = updateResults.find((result) => result.error);
    if (failed?.error) return { success: false, error: failed.error.message, status: 500 };
  }

  // Check all quantities are filled
  const { data: finalRows, error: finalError } = await findCountDetails(db, countRow.id);
  if (finalError) return { success: false, error: finalError.message, status: 500 };

  const normalizedFinalRows = (finalRows ?? []) as Array<{ id: string; actual_qty: number | null; photo_urls: string[] | null }>;
  const missing = normalizedFinalRows.filter((row) => row.actual_qty == null);
  const missingPhotos = normalizedFinalRows.filter((row) => sanitizePhotoUrls(row.photo_urls, {
    countId: countRow.id,
    itemId: row.id,
  }).length === 0);
  if (missing.length > 0 || missingPhotos.length > 0) {
    return {
      success: false,
      error: 'All quantities and photo proof are required.',
      status: 422,
      extra: {
        missingItemIds: missing.map((row) => row.id),
        missingPhotoItemIds: missingPhotos.map((row) => row.id),
      },
    };
  }

  // Finalize count status
  const nowIso = new Date().toISOString();
  let finalStatus: 'SUBMITTED' | 'COMPLETED' = 'SUBMITTED';

  let { error: countUpdateError } = await updateCountStatus(db, countRow.id, {
    counted_by_name: payload.countedByName?.trim() || null,
    notes: payload.notes ?? null,
    status: finalStatus,
    submitted_at: nowIso,
  });

  if (
    countUpdateError?.message?.toLowerCase().includes('counted_by_name')
    || countUpdateError?.message?.toLowerCase().includes('submitted_at')
  ) {
    ({ error: countUpdateError } = await updateCountStatus(db, countRow.id, {
      notes: payload.notes ?? null,
      status: finalStatus,
    }));
  }

  if (
    countUpdateError?.message?.toLowerCase().includes('chk_inventory_counts_status')
    || countUpdateError?.message?.toLowerCase().includes('violates check constraint')
  ) {
    finalStatus = 'COMPLETED';
    ({ error: countUpdateError } = await updateCountStatus(db, countRow.id, {
      notes: payload.notes ?? null,
      status: finalStatus,
    }));
  }

  if (countUpdateError) return { success: false, error: countUpdateError.message, status: 500 };

  // Update site schedule
  if (countRow.site_id) {
    const { data: siteRow } = await getSiteFrequency(db, countRow.site_id);
    const frequency = (siteRow as { inventory_frequency?: string | null } | null)?.inventory_frequency ?? 'MONTHLY';
    const nextDue = nextDueDate(countRow.count_date, frequency);
    const statusAlert = buildAlert(nextDue);

    const { error: siteUpdateError } = await updateSiteCountSchedule(
      db, countRow.site_id, countRow.count_date, nextDue, statusAlert,
    );

    // Backward compatibility before schedule columns exist
    if (siteUpdateError
      && !siteUpdateError.message.toLowerCase().includes('last_count_date')
      && !siteUpdateError.message.toLowerCase().includes('next_count_due')
      && !siteUpdateError.message.toLowerCase().includes('count_status_alert')
    ) {
      return { success: false, error: siteUpdateError.message, status: 500 };
    }
  }

  return {
    success: true,
    data: { ok: true, submittedAt: nowIso, status: finalStatus },
  };
}
