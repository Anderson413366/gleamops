import {
  createDb,
  createTicketChecklist,
  findPublicSignoffItem,
  findTicketByCode,
  findTicketChecklist,
  insertPublicSignoffItem,
  updatePublicSignoffItem,
  updateTicketChecklist,
  updateWorkTicketStatus,
} from './public-work-orders.repository';

type TokenMode = 'ticket' | 'universal';

interface TokenConfig {
  mode: TokenMode;
  ticketCode?: string;
}

interface CompletePayload {
  signerName?: string | null;
  signerEmail?: string | null;
  notes?: string | null;
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
  supervisorSignOff?: boolean;
  clientSignOff?: boolean;
}

type GetWorkOrderResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string; status: number };

type CompleteWorkOrderResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string; status: number };

interface TicketRow {
  id: string;
  tenant_id: string;
  ticket_code: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  site:
    | { name: string; site_code: string | null }
    | Array<{ name: string; site_code: string | null }>
    | null;
  job:
    | { job_code: string | null; job_name: string | null }
    | Array<{ job_code: string | null; job_name: string | null }>
    | null;
}

function normalizeToken(token: string): string {
  return token.trim();
}

function parseTokenMap(): Record<string, TokenConfig> {
  const raw = process.env.PUBLIC_WORK_ORDER_TOKEN_MAP;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, TokenConfig>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function resolveTokenConfig(token: string): TokenConfig | null {
  const map = parseTokenMap();
  const config = map[token];
  if (!config) return null;
  if (config.mode !== 'ticket' && config.mode !== 'universal') return null;
  if (config.mode === 'ticket' && !config.ticketCode) return null;
  return config;
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizePayload(value: CompletePayload) {
  return {
    signerName: value.signerName?.trim() ?? '',
    signerEmail: value.signerEmail?.trim() ?? '',
    notes: value.notes?.trim() || null,
    beforePhotoUrl: value.beforePhotoUrl?.trim() || null,
    afterPhotoUrl: value.afterPhotoUrl?.trim() || null,
    supervisorSignOff: Boolean(value.supervisorSignOff),
    clientSignOff: Boolean(value.clientSignOff),
  };
}

async function resolveTicketFromToken(token: string): Promise<
  | { success: true; ticket: TicketRow; mode: TokenMode }
  | { success: false; error: string; status: number }
> {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) {
    return { success: false, error: 'Token required', status: 400 };
  }

  const config = resolveTokenConfig(normalizedToken);
  if (!config) return { success: false, error: 'Invalid or expired token', status: 404 };
  if (config.mode === 'universal') {
    return { success: false, error: 'Universal tokens are temporarily disabled', status: 403 };
  }

  const db = createDb();
  const { data, error } = await findTicketByCode(db, config.ticketCode ?? '');
  if (error) return { success: false, error: error.message, status: 500 };
  if (!data) return { success: false, error: 'Work order not found', status: 404 };

  return {
    success: true,
    ticket: data as TicketRow,
    mode: config.mode,
  };
}

export async function getPublicWorkOrder(token: string): Promise<GetWorkOrderResult> {
  const resolved = await resolveTicketFromToken(token);
  if (!resolved.success) return resolved;

  const db = createDb();
  const { data: checklistRow } = await findTicketChecklist(db, resolved.ticket.id);

  const site = relationOne(resolved.ticket.site);
  const job = relationOne(resolved.ticket.job);

  return {
    success: true,
    data: {
      ticket: {
        id: resolved.ticket.id,
        ticketCode: resolved.ticket.ticket_code,
        scheduledDate: resolved.ticket.scheduled_date,
        startTime: resolved.ticket.start_time,
        endTime: resolved.ticket.end_time,
        status: resolved.ticket.status,
        siteName: site?.name ?? 'Unknown Site',
        siteCode: site?.site_code ?? null,
        jobCode: job?.job_code ?? null,
        jobName: job?.job_name ?? null,
      },
      checklist: checklistRow
        ? {
            id: (checklistRow as { id: string }).id,
            status: (checklistRow as { status: string }).status,
          }
        : null,
      mode: resolved.mode,
    },
  };
}

export async function completePublicWorkOrder(
  token: string,
  payload: CompletePayload,
  meta?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<CompleteWorkOrderResult> {
  const resolved = await resolveTicketFromToken(token);
  if (!resolved.success) return resolved;

  const normalized = normalizePayload(payload);
  if (!normalized.signerName || !normalized.signerEmail) {
    return { success: false, error: 'Signer name and email are required', status: 400 };
  }

  if (resolved.ticket.status === 'CANCELED') {
    return { success: false, error: 'Canceled work orders cannot be completed.', status: 409 };
  }

  const db = createDb();
  const now = new Date().toISOString();

  const { data: checklistRow, error: checklistError } = await findTicketChecklist(db, resolved.ticket.id);
  if (checklistError) return { success: false, error: checklistError.message, status: 500 };

  const checklist = checklistRow as { id: string; status: string } | null;
  const checklistId = checklist?.id;
  let effectiveChecklistId = checklistId;

  if (!effectiveChecklistId) {
    const { data: createdChecklist, error: createChecklistError } = await createTicketChecklist(db, {
      tenant_id: resolved.ticket.tenant_id,
      ticket_id: resolved.ticket.id,
      status: 'COMPLETED',
      completed_at: now,
      completed_by: null,
    });

    if (createChecklistError || !createdChecklist) {
      return { success: false, error: createChecklistError?.message ?? 'Unable to create completion record', status: 500 };
    }

    effectiveChecklistId = (createdChecklist as { id: string }).id;
  } else {
    const { error: checklistUpdateError } = await updateTicketChecklist(db, effectiveChecklistId, {
      status: 'COMPLETED',
      completed_at: now,
      completed_by: null,
    });

    if (checklistUpdateError) {
      return { success: false, error: checklistUpdateError.message, status: 500 };
    }
  }

  const signoffData = {
    signer_name: normalized.signerName,
    signer_email: normalized.signerEmail,
    notes: normalized.notes,
    before_photo_url: normalized.beforePhotoUrl,
    after_photo_url: normalized.afterPhotoUrl,
    supervisor_sign_off: normalized.supervisorSignOff,
    client_sign_off: normalized.clientSignOff,
    completed_at: now,
    source: 'public_work_order_completion',
    ip_address: meta?.ipAddress ?? null,
    user_agent: meta?.userAgent ?? null,
  };

  const { data: signoffItemRow, error: signoffLookupError } = await findPublicSignoffItem(db, effectiveChecklistId);
  if (signoffLookupError) {
    return { success: false, error: signoffLookupError.message, status: 500 };
  }

  const existingSignoffItemId = (signoffItemRow as { id: string } | null)?.id;
  if (existingSignoffItemId) {
    const { error: signoffUpdateError } = await updatePublicSignoffItem(db, existingSignoffItemId, {
      notes: JSON.stringify(signoffData),
      checked_at: now,
      checked_by: null,
    });

    if (signoffUpdateError) {
      return { success: false, error: signoffUpdateError.message, status: 500 };
    }
  } else {
    const { error: signoffInsertError } = await insertPublicSignoffItem(db, {
      tenant_id: resolved.ticket.tenant_id,
      checklist_id: effectiveChecklistId,
      notes: JSON.stringify(signoffData),
      checked_at: now,
      checked_by: null,
    });

    if (signoffInsertError) {
      return { success: false, error: signoffInsertError.message, status: 500 };
    }
  }

  const { error: ticketUpdateError } = await updateWorkTicketStatus(db, resolved.ticket.id, 'COMPLETED');
  if (ticketUpdateError) {
    return { success: false, error: ticketUpdateError.message, status: 500 };
  }

  return {
    success: true,
    data: {
      ok: true,
      ticketCode: resolved.ticket.ticket_code,
      status: 'COMPLETED',
      checklistId: effectiveChecklistId,
    },
  };
}
