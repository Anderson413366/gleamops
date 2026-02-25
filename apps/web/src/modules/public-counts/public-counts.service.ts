/**
 * Public counts service.
 * Business logic extracted verbatim from api/public/counts/[token]/route.ts and save/route.ts
 */
import {
  createDb,
  findCountByToken,
  findCountByTokenFallback,
  findCountByTokenMinimal,
  findCountByTokenMinimalFallback,
  findCountDetails,
  findSupplies,
  findPreviousCount,
  findPreviousCountDetails,
  findDetailIds,
  findDetailById,
  updateDetail,
  updateCountHeader,
  updateCountHeaderFallback,
  findRefreshedDetails,
  uploadCountPhoto,
  getCountPhotoPublicUrl,
} from './public-counts.repository';

type GetCountResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string; status: number };

type SaveCountResult =
  | { success: true; data: { ok: true; progress: { completed: number; total: number } } }
  | { success: false; error: string; status: number };

type UploadCountPhotoResult =
  | { success: true; data: { url: string } }
  | { success: false; error: string; status: number };

interface SavePayload {
  countedByName?: string | null;
  notes?: string | null;
  items?: Array<{
    id: string;
    quantity: number | string | null;
    notes?: string | null;
    photoUrls?: string[] | null;
  }>;
}

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

function sanitizePhotoUrls(value: unknown): string[] {
  const urls = toStringArray(value);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const allowedPrefix = base
    ? `${base.replace(/\/$/, '')}/storage/v1/object/public/documents/`
    : '';

  if (!allowedPrefix) return [];
  return urls.filter((url) => url.startsWith(allowedPrefix));
}

export async function getPublicCount(token: string): Promise<GetCountResult> {
  const db = createDb();

  const { data: tokenCountRow, error: tokenCountError } = await findCountByToken(db, token);
  let countRow = tokenCountRow as (Record<string, unknown> | null);
  let countError = tokenCountError as ({ message: string } | null);

  // Backward compatibility for environments where the migration is not applied yet.
  if (countError?.message?.toLowerCase().includes('public_token')
    || countError?.message?.toLowerCase().includes('counted_by_name')
    || countError?.message?.toLowerCase().includes('submitted_at')) {
    const { data: fallbackCountRow, error: fallbackError } = await findCountByTokenFallback(db, token);
    countRow = fallbackCountRow as Record<string, unknown> | null;
    countError = fallbackError as { message: string } | null;
  }

  if (countError) return { success: false, error: countError.message, status: 500 };
  if (!countRow) return { success: false, error: 'Count form not found.', status: 404 };

  // Fetch count details
  const { data: detailRows, error: detailError } = await findCountDetails(db, String(countRow.id));
  if (detailError) return { success: false, error: detailError.message, status: 500 };

  const details = (detailRows ?? []) as Array<{
    id: string;
    supply_id: string;
    expected_qty: number | null;
    actual_qty: number | null;
    notes: string | null;
    photo_urls: string[] | null;
  }>;

  // Fetch supply catalog entries
  const supplyIds = Array.from(new Set(details.map((row) => row.supply_id).filter(Boolean)));
  const { data: supplyRows, error: supplyError } = await findSupplies(db, supplyIds);
  if (supplyError) return { success: false, error: supplyError.message, status: 500 };

  const supplyById: Record<string, {
    id: string;
    code: string;
    name: string;
    category: string | null;
    unit: string | null;
    brand: string | null;
    preferred_vendor: string | null;
    image_url: string | null;
    unit_cost: number | null;
  }> = {};
  for (const supply of ((supplyRows ?? []) as Array<{
    id: string;
    code: string;
    name: string;
    category: string | null;
    unit: string | null;
    brand: string | null;
    preferred_vendor: string | null;
    image_url: string | null;
    unit_cost: number | null;
  }>)) {
    supplyById[supply.id] = supply;
  }

  // Fetch previous count for comparison
  let previousBySupplyId: Record<string, { qty: number | null; countDate: string }> = {};
  if (countRow.site_id) {
    const { data: prevCountRow } = await findPreviousCount(db, String(countRow.site_id), String(countRow.id));

    if (prevCountRow?.id) {
      const { data: prevDetails } = await findPreviousCountDetails(db, prevCountRow.id);

      previousBySupplyId = {};
      for (const row of ((prevDetails ?? []) as Array<{ supply_id: string; actual_qty: number | null }>)) {
        previousBySupplyId[row.supply_id] = { qty: row.actual_qty, countDate: prevCountRow.count_date };
      }
    }
  }

  const countedByName = (countRow.counted_by_name as string | null | undefined)
    || ((countRow.counter as { full_name?: string | null } | null)?.full_name ?? null);

  const items = details.map((row) => {
    const supply = supplyById[row.supply_id];
    const previous = previousBySupplyId[row.supply_id];
    return {
      id: row.id,
      supplyId: row.supply_id,
      expectedQty: row.expected_qty,
      actualQty: row.actual_qty,
      notes: row.notes,
      photoUrls: toStringArray(row.photo_urls),
      supply: supply ?? null,
      previousCountQty: previous?.qty ?? null,
      previousCountDate: previous?.countDate ?? null,
    };
  });

  return {
    success: true,
    data: {
      count: {
        id: String(countRow.id),
        code: String(countRow.count_code),
        date: String(countRow.count_date),
        status: String(countRow.status),
        notes: (countRow.notes as string | null | undefined) ?? null,
        countedByName,
        submittedAt: (countRow.submitted_at as string | null | undefined) ?? null,
        site: (countRow.site as unknown),
      },
      items,
    },
  };
}

export async function savePublicCount(token: string, payload: SavePayload): Promise<SaveCountResult> {
  const db = createDb();

  const { data: tokenCountRow, error: tokenCountError } = await findCountByTokenMinimal(db, token);
  let countRow = tokenCountRow as { id: string; status: string; tenant_id?: string | null } | null;
  let countError = tokenCountError as { message: string } | null;

  if (countError?.message?.toLowerCase().includes('public_token')) {
    const { data: fallbackRow, error: fallbackError } = await findCountByTokenMinimalFallback(db, token);
    countRow = fallbackRow as { id: string; status: string; tenant_id?: string | null } | null;
    countError = fallbackError as { message: string } | null;
  }

  if (countError) return { success: false, error: countError.message, status: 500 };
  if (!countRow) return { success: false, error: 'Count form not found.', status: 404 };
  if (['SUBMITTED', 'COMPLETED', 'CANCELLED'].includes(String(countRow.status).toUpperCase())) {
    return { success: false, error: 'This count is already closed.', status: 409 };
  }

  // Validate detail IDs
  const { data: detailRows, error: detailError } = await findDetailIds(db, countRow.id);
  if (detailError) return { success: false, error: detailError.message, status: 500 };
  const validIds = new Set(((detailRows ?? []) as Array<{ id: string }>).map((row) => row.id));

  // Update detail rows
  const updates = (payload.items ?? [])
    .filter((item) => validIds.has(item.id))
    .map((item) => updateDetail(
      db,
      item.id,
      countRow.id,
      toNullableNumber(item.quantity),
      item.notes ?? null,
      sanitizePhotoUrls(item.photoUrls),
    ));

  if (updates.length > 0) {
    const updateResults = await Promise.all(updates);
    const failed = updateResults.find((result) => result.error);
    if (failed?.error) return { success: false, error: failed.error.message, status: 500 };
  }

  // Update count header
  let { error: countUpdateError } = await updateCountHeader(
    db, countRow.id, payload.countedByName?.trim() || null, payload.notes ?? null,
  );

  if (countUpdateError?.message?.toLowerCase().includes('counted_by_name')) {
    ({ error: countUpdateError } = await updateCountHeaderFallback(
      db, countRow.id, payload.notes ?? null,
    ));
  }

  if (countUpdateError) return { success: false, error: countUpdateError.message, status: 500 };

  // Calculate progress
  const { data: refreshedDetails, error: refreshError } = await findRefreshedDetails(db, countRow.id);
  if (refreshError) return { success: false, error: refreshError.message, status: 500 };

  const total = (refreshedDetails ?? []).length;
  const completed = (refreshedDetails ?? []).filter((row) => (row as { actual_qty: number | null }).actual_qty != null).length;

  return {
    success: true,
    data: { ok: true, progress: { completed, total } },
  };
}

export async function uploadPublicCountPhoto(
  token: string,
  itemId: string,
  file: File,
): Promise<UploadCountPhotoResult> {
  const db = createDb();

  const { data: tokenCountRow, error: tokenCountError } = await findCountByTokenMinimal(db, token);
  let countRow = tokenCountRow as { id: string; status: string; tenant_id?: string | null } | null;
  let countError = tokenCountError as { message: string } | null;

  if (countError?.message?.toLowerCase().includes('public_token')) {
    const { data: fallbackRow, error: fallbackError } = await findCountByTokenMinimalFallback(db, token);
    countRow = fallbackRow as { id: string; status: string; tenant_id?: string | null } | null;
    countError = fallbackError as { message: string } | null;
  }

  if (countError) return { success: false, error: countError.message, status: 500 };
  if (!countRow) return { success: false, error: 'Count form not found.', status: 404 };
  if (['SUBMITTED', 'COMPLETED', 'CANCELLED'].includes(String(countRow.status).toUpperCase())) {
    return { success: false, error: 'This count is already closed.', status: 409 };
  }

  const { data: detailRow, error: detailError } = await findDetailById(db, countRow.id, itemId);
  if (detailError) return { success: false, error: detailError.message, status: 500 };
  if (!detailRow) return { success: false, error: 'Count item not found.', status: 404 };

  const tenantId = countRow.tenant_id ?? 'public';
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeExtension = extension.replace(/[^a-z0-9]/g, '') || 'jpg';
  const storagePath = `${tenantId}/inventory-count-photos/${countRow.id}/${itemId}/${crypto.randomUUID()}.${safeExtension}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await uploadCountPhoto(db, storagePath, buffer, file.type || 'application/octet-stream');
  if (uploadError) return { success: false, error: uploadError.message, status: 500 };

  const { data: urlData } = getCountPhotoPublicUrl(db, storagePath);
  const url = urlData?.publicUrl ?? storagePath;

  return { success: true, data: { url } };
}
