import {
  createDb,
  findPortalContextByToken,
  findProposalById,
  findBidVersionById,
  findBidById,
  findClientById,
  findClientSites,
  findUpcomingTickets,
  findRecentInspections,
  findRecentCounts,
  findRecentOrders,
  findClientAgreements,
  findChemicalCatalog,
  insertPortalChangeAlert,
} from './public-portal.repository';

interface PortalClient {
  id: string;
  name: string;
  client_code: string | null;
}

interface PortalContext {
  id: string;
  tenant_id: string;
  public_token: string | null;
  proposal_id: string;
  recipient_name: string | null;
  recipient_email: string;
  status: string;
  sent_at: string | null;
}

interface PortalProposal {
  id: string;
  proposal_code: string;
  status: string;
  updated_at: string;
  bid_version_id: string;
}

interface PortalSite {
  id: string;
  name: string;
  site_code: string | null;
}

interface ChangeRequestPayload {
  requestType?: string | null;
  priority?: string | null;
  title?: string | null;
  details?: string | null;
  requestedDate?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
}

type PublicPortalResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string; status: number };

type SubmitChangeRequestResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string; status: number };

type Relation<T> = T | T[] | null | undefined;

function relationOne<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function safeQuery<T>(query: Promise<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  try {
    const { data, error } = await query;
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

function normalizeToken(token: string): string {
  return token.trim();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function classifySeverity(priority: string | null | undefined): 'INFO' | 'WARNING' | 'CRITICAL' {
  const normalized = (priority ?? '').toUpperCase();
  if (normalized === 'HIGH' || normalized === 'URGENT' || normalized === 'CRITICAL') return 'CRITICAL';
  if (normalized === 'MEDIUM') return 'WARNING';
  return 'INFO';
}

async function resolvePortalContext(token: string): Promise<
  | { success: true; context: PortalContext; client: PortalClient; proposal: PortalProposal }
  | { success: false; error: string; status: number }
> {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) return { success: false, error: 'Token required', status: 400 };
  if (!isUuid(normalizedToken)) return { success: false, error: 'Invalid or expired portal link', status: 404 };

  const db = createDb();
  const { data, error } = await findPortalContextByToken(db, normalizedToken);
  if (error) return { success: false, error: error.message, status: 500 };
  if (!data) return { success: false, error: 'Invalid or expired portal link', status: 404 };

  const context = data as unknown as PortalContext;
  const status = (context.status ?? '').toUpperCase();
  if (['REVOKED', 'CANCELED', 'CANCELLED', 'FAILED', 'EXPIRED', 'VOID'].includes(status)) {
    return { success: false, error: 'Invalid or expired portal link', status: 404 };
  }

  const { data: proposalData, error: proposalError } = await findProposalById(db, context.proposal_id);
  if (proposalError) return { success: false, error: proposalError.message, status: 500 };
  if (!proposalData) return { success: false, error: 'Proposal not found for this portal token', status: 404 };
  const proposal = proposalData as PortalProposal;

  const { data: bidVersionData, error: bidVersionError } = await findBidVersionById(db, proposal.bid_version_id);
  if (bidVersionError) return { success: false, error: bidVersionError.message, status: 500 };
  if (!bidVersionData) return { success: false, error: 'Bid version not found for this portal token', status: 404 };

  const bidVersion = bidVersionData as { id: string; bid_id: string };
  const { data: bidData, error: bidError } = await findBidById(db, bidVersion.bid_id);
  if (bidError) return { success: false, error: bidError.message, status: 500 };
  if (!bidData) return { success: false, error: 'Bid not found for this portal token', status: 404 };

  const bid = bidData as { id: string; client_id: string };
  const { data: clientData, error: clientError } = await findClientById(db, bid.client_id);
  if (clientError) return { success: false, error: clientError.message, status: 500 };
  const client = (clientData ?? null) as PortalClient | null;
  if (!client) {
    return { success: false, error: 'Client context not found for this portal token', status: 404 };
  }

  return { success: true, context, client, proposal };
}

export async function getPublicPortal(token: string): Promise<PublicPortalResult> {
  const resolved = await resolvePortalContext(token);
  if (!resolved.success) return resolved;

  const { context, client, proposal } = resolved;
  const db = createDb();

  const siteRows = await safeQuery<PortalSite>(findClientSites(db, client.id));
  const siteIds = siteRows.map((site) => site.id);

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const from = startDate.toISOString().slice(0, 10);
  const to = endDate.toISOString().slice(0, 10);

  const [tickets, inspections, counts, orders, agreements, chemicals] = await Promise.all([
    siteIds.length ? safeQuery<Record<string, unknown>>(findUpcomingTickets(db, siteIds, from, to)) : Promise.resolve([]),
    siteIds.length ? safeQuery<Record<string, unknown>>(findRecentInspections(db, siteIds)) : Promise.resolve([]),
    siteIds.length ? safeQuery<Record<string, unknown>>(findRecentCounts(db, siteIds)) : Promise.resolve([]),
    siteIds.length ? safeQuery<Record<string, unknown>>(findRecentOrders(db, siteIds)) : Promise.resolve([]),
    safeQuery<Record<string, unknown>>(findClientAgreements(db, client.id)),
    safeQuery<Record<string, unknown>>(findChemicalCatalog(db, context.tenant_id)),
  ]);

  const schedule = tickets.map((row) => {
    const site = relationOne(row.site as Relation<{ name?: string | null; site_code?: string | null }>);
    return {
      id: String(row.id ?? ''),
      ticketCode: String(row.ticket_code ?? ''),
      date: String(row.scheduled_date ?? ''),
      startTime: row.start_time ?? null,
      endTime: row.end_time ?? null,
      status: String(row.status ?? 'SCHEDULED'),
      siteName: site?.name ?? 'Unknown Site',
      siteCode: site?.site_code ?? null,
    };
  });

  const inspectionRows = inspections.map((row) => {
    const site = relationOne(row.site as Relation<{ name?: string | null; site_code?: string | null }>);
    return {
      id: String(row.id ?? ''),
      code: String(row.inspection_code ?? ''),
      inspectedAt: row.inspected_at ?? null,
      status: String(row.status ?? 'DRAFT'),
      scorePct: typeof row.score_pct === 'number' ? row.score_pct : null,
      summary: row.summary ?? null,
      siteName: site?.name ?? 'Unknown Site',
      siteCode: site?.site_code ?? null,
    };
  });

  const countRows = counts.map((row) => {
    const site = relationOne(row.site as Relation<{ name?: string | null; site_code?: string | null }>);
    return {
      id: String(row.id ?? ''),
      countCode: String(row.count_code ?? ''),
      countDate: String(row.count_date ?? ''),
      status: String(row.status ?? 'DRAFT'),
      countedByName: row.counted_by_name ?? null,
      submittedAt: row.submitted_at ?? null,
      siteName: site?.name ?? 'Unknown Site',
      siteCode: site?.site_code ?? null,
    };
  });

  const orderRows = orders.map((row) => {
    const site = relationOne(row.site as Relation<{ name?: string | null; site_code?: string | null }>);
    return {
      id: String(row.id ?? ''),
      orderCode: String(row.order_code ?? ''),
      orderDate: row.order_date ?? null,
      status: String(row.status ?? 'DRAFT'),
      totalAmount: typeof row.total_amount === 'number' ? row.total_amount : null,
      siteName: site?.name ?? 'Unknown Site',
      siteCode: site?.site_code ?? null,
    };
  });

  const agreementRows = agreements.map((row) => ({
    id: String(row.id ?? ''),
    contractNumber: String(row.contract_number ?? ''),
    contractName: String(row.contract_name ?? 'Agreement'),
    status: String(row.status ?? 'ACTIVE'),
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
  }));

  const chemicalRows = chemicals.map((row) => ({
    id: String(row.id ?? ''),
    code: String(row.code ?? ''),
    name: String(row.name ?? 'Chemical Item'),
    category: row.category ?? null,
    imageUrl: row.image_url ?? null,
    sdsUrl: row.sds_url ?? null,
  }));

  return {
    success: true,
    data: {
      portal: {
        token: normalizeToken(token),
        clientName: client.name,
        clientCode: client.client_code,
        recipientName: context.recipient_name,
        recipientEmail: context.recipient_email,
        proposalCode: proposal.proposal_code,
        proposalStatus: proposal.status,
        sendStatus: context.status,
        sentAt: context.sent_at,
      },
      sites: siteRows,
      sections: {
        schedule,
        inspections: inspectionRows,
        counts: countRows,
        orders: orderRows,
        agreements: agreementRows,
        chemicals: chemicalRows,
      },
    },
  };
}

export async function submitPublicPortalChangeRequest(
  token: string,
  payload: ChangeRequestPayload,
  meta?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<SubmitChangeRequestResult> {
  const resolved = await resolvePortalContext(token);
  if (!resolved.success) return resolved;

  const { context, client } = resolved;
  const title = payload.title?.trim() ?? '';
  const details = payload.details?.trim() ?? '';

  if (!title || !details) {
    return { success: false, error: 'Title and details are required', status: 400 };
  }

  const db = createDb();
  const sites = await safeQuery<PortalSite>(findClientSites(db, client.id));
  const firstSiteId = sites[0]?.id ?? null;

  const body = JSON.stringify({
    request_type: payload.requestType?.trim() || 'GENERAL_CHANGE',
    priority: payload.priority?.trim() || 'MEDIUM',
    details,
    requested_date: payload.requestedDate?.trim() || null,
    contact_name: payload.contactName?.trim() || context.recipient_name || null,
    contact_email: payload.contactEmail?.trim() || context.recipient_email || null,
    portal_token: normalizeToken(token),
    client_id: client.id,
    client_code: client.client_code,
    site_id: firstSiteId,
    source: 'public_portal',
    ip_address: meta?.ipAddress ?? null,
    user_agent: meta?.userAgent ?? null,
  });

  const { data, error } = await insertPortalChangeAlert(db, {
    tenant_id: context.tenant_id,
    alert_type: 'CLIENT_CHANGE_REQUEST',
    severity: classifySeverity(payload.priority),
    title,
    body,
    entity_type: 'client',
    entity_id: client.id,
  });

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Unable to submit request', status: 500 };
  }

  return {
    success: true,
    data: {
      ok: true,
      requestId: (data as { id: string }).id,
      createdAt: (data as { created_at: string | null }).created_at,
    },
  };
}
