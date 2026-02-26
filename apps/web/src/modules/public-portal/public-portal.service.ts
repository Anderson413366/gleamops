import crypto from 'crypto';
import type {
  CustomerFeedbackListItem,
  CustomerPortalComplaintListItem,
  CustomerPortalDashboard,
  CustomerPortalFeedbackCreateInput,
  CustomerPortalInspectionDetail,
  CustomerPortalInspectionListItem,
  CustomerPortalSessionListItem,
  CustomerPortalWorkTicketListItem,
} from '@gleamops/shared';
import {
  archiveCustomerPortalSession,
  createDb,
  findCustomerPortalSessionByHash,
  findPortalContextByToken,
  findProposalById,
  findBidVersionById,
  findBidById,
  findClientByIdAndTenant,
  findClientById,
  findClientSites,
  getPortalInspectionById,
  insertCustomerFeedback,
  findUpcomingTickets,
  findRecentInspections,
  findRecentCounts,
  findRecentOrders,
  findClientAgreements,
  findChemicalCatalog,
  insertCustomerPortalSession,
  insertPortalComplaintRecord,
  insertPortalChangeAlert,
  listCustomerPortalSessions,
  listPortalComplaintsByClient,
  listPortalInspectionIssues,
  listPortalInspectionItems,
  listPortalInspectionsBySites,
  listPortalWorkTicketsBySites,
  nextCustomerFeedbackCode,
  nextCustomerPortalSessionCode,
  touchCustomerPortalSession,
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

type CustomerPortalServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number };

interface CustomerPortalSessionRow {
  id: string;
  tenant_id: string;
  session_code: string;
  client_id: string;
  token_hash: string;
  expires_at: string;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version_etag: string;
  client: Relation<PortalClient>;
}

interface CustomerPortalSessionContext {
  session: CustomerPortalSessionRow;
  client: PortalClient;
  sites: PortalSite[];
  siteIds: string[];
}

function hashPortalToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function normalizeComplaintCategory(value: unknown): string {
  const normalized = String(value ?? 'OTHER').toUpperCase();
  const allowed = new Set([
    'CLEANING_QUALITY',
    'MISSED_SERVICE',
    'SUPPLY_ISSUE',
    'DAMAGE',
    'BEHAVIOR',
    'SAFETY',
    'OTHER',
  ]);
  return allowed.has(normalized) ? normalized : 'OTHER';
}

function normalizeComplaintPriority(value: unknown): string {
  const normalized = String(value ?? 'NORMAL').toUpperCase();
  const allowed = new Set(['LOW', 'NORMAL', 'HIGH', 'URGENT_SAME_NIGHT']);
  return allowed.has(normalized) ? normalized : 'NORMAL';
}

function mapInspectionListItem(row: Record<string, unknown>): CustomerPortalInspectionListItem {
  const site = relationOne(row.site as Relation<{ id?: string; site_code?: string | null; name?: string | null }>);
  const inspector = relationOne(row.inspector as Relation<{ full_name?: string | null; staff_code?: string | null }>);
  return {
    id: String(row.id ?? ''),
    inspection_code: String(row.inspection_code ?? ''),
    site_id: (row.site_id as string | null) ?? site?.id ?? null,
    site_name: site?.name ?? 'Unknown Site',
    site_code: site?.site_code ?? null,
    inspector_name: inspector?.full_name ?? inspector?.staff_code ?? null,
    status: String(row.status ?? 'DRAFT'),
    score_pct: typeof row.score_pct === 'number' ? row.score_pct : null,
    passed: typeof row.passed === 'boolean' ? row.passed : null,
    completed_at: (row.completed_at as string | null) ?? null,
  };
}

function mapComplaintListItem(row: Record<string, unknown>): CustomerPortalComplaintListItem {
  const site = relationOne(row.site as Relation<{ id?: string; site_code?: string | null; name?: string | null }>);
  return {
    id: String(row.id ?? ''),
    complaint_code: String(row.complaint_code ?? ''),
    site_id: (row.site_id as string | null) ?? site?.id ?? null,
    site_name: site?.name ?? 'Unknown Site',
    site_code: site?.site_code ?? null,
    category: normalizeComplaintCategory(row.category) as CustomerPortalComplaintListItem['category'],
    priority: normalizeComplaintPriority(row.priority) as CustomerPortalComplaintListItem['priority'],
    status: String(row.status ?? 'OPEN') as CustomerPortalComplaintListItem['status'],
    created_at: String(row.created_at ?? ''),
    resolution_description: (row.resolution_description as string | null) ?? null,
  };
}

function mapWorkTicketListItem(row: Record<string, unknown>): CustomerPortalWorkTicketListItem {
  const site = relationOne(row.site as Relation<{ id?: string; site_code?: string | null; name?: string | null }>);
  return {
    id: String(row.id ?? ''),
    ticket_code: String(row.ticket_code ?? ''),
    site_id: (row.site_id as string) || String(site?.id ?? ''),
    site_name: site?.name ?? 'Unknown Site',
    site_code: site?.site_code ?? null,
    scheduled_date: String(row.scheduled_date ?? ''),
    status: String(row.status ?? 'SCHEDULED'),
    type: (row.type as string | null) ?? null,
    title: (row.title as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    priority: (row.priority as string | null) ?? null,
  };
}

async function resolveCustomerPortalSession(
  token: string,
  options?: { touch?: boolean },
): Promise<CustomerPortalServiceResult<CustomerPortalSessionContext>> {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) return { success: false, error: 'Token required', status: 400 };
  if (normalizedToken.length < 12) return { success: false, error: 'Invalid or expired access code', status: 404 };

  const db = createDb();
  const { data, error } = await findCustomerPortalSessionByHash(db, hashPortalToken(normalizedToken));
  if (error) return { success: false, error: error.message, status: 500 };
  if (!data) return { success: false, error: 'Invalid or expired access code', status: 404 };

  const session = data as unknown as CustomerPortalSessionRow;
  const client = relationOne(session.client);
  if (!client) return { success: false, error: 'Client not found for this access code', status: 404 };
  if (!session.is_active || session.archived_at) {
    return { success: false, error: 'Access code is inactive', status: 403 };
  }
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    return { success: false, error: 'Access code has expired', status: 403 };
  }

  const sites = await safeQuery<PortalSite>(findClientSites(db, client.id));
  const siteIds = sites.map((site) => site.id);

  if (options?.touch !== false) {
    await touchCustomerPortalSession(db, session.id);
  }

  return {
    success: true,
    data: {
      session,
      client,
      sites,
      siteIds,
    },
  };
}

export async function authCustomerPortal(
  token: string,
): Promise<CustomerPortalServiceResult<{ token: string; expires_at: string; client: PortalClient }>> {
  const resolved = await resolveCustomerPortalSession(token);
  if (!resolved.success) return resolved;

  return {
    success: true,
    data: {
      token: normalizeToken(token),
      expires_at: resolved.data.session.expires_at,
      client: resolved.data.client,
    },
  };
}

export async function getCustomerPortalDashboard(
  token: string,
): Promise<CustomerPortalServiceResult<CustomerPortalDashboard>> {
  const resolved = await resolveCustomerPortalSession(token);
  if (!resolved.success) return resolved;

  const db = createDb();
  const { session, client, sites, siteIds } = resolved.data;
  const [inspectionRes, complaintRes, workTicketRes] = await Promise.all([
    siteIds.length ? listPortalInspectionsBySites(db, siteIds) : Promise.resolve({ data: [], error: null }),
    listPortalComplaintsByClient(db, client.id),
    siteIds.length ? listPortalWorkTicketsBySites(db, siteIds) : Promise.resolve({ data: [], error: null }),
  ]);

  if (inspectionRes.error) return { success: false, error: inspectionRes.error.message, status: 500 };
  if (complaintRes.error) return { success: false, error: complaintRes.error.message, status: 500 };
  if (workTicketRes.error) return { success: false, error: workTicketRes.error.message, status: 500 };

  const inspectionRows = ((inspectionRes.data ?? []) as Record<string, unknown>[]).map(mapInspectionListItem);
  const complaintRows = ((complaintRes.data ?? []) as Record<string, unknown>[]).map(mapComplaintListItem);
  const workTicketRows = ((workTicketRes.data ?? []) as Record<string, unknown>[]).map(mapWorkTicketListItem);

  return {
    success: true,
    data: {
      token: normalizeToken(token),
      expires_at: session.expires_at,
      client: {
        id: client.id,
        name: client.name,
        client_code: client.client_code,
      },
      sites: sites.map((site) => ({
        id: site.id,
        site_code: site.site_code ?? '',
        name: site.name,
      })),
      stats: {
        openComplaints: complaintRows.filter((row) => !['RESOLVED', 'CLOSED'].includes(row.status)).length,
        recentInspections: inspectionRows.length,
        openWorkTickets: workTicketRows.filter((row) => !['COMPLETED', 'VERIFIED', 'CANCELED', 'CANCELLED'].includes(row.status)).length,
      },
      recentInspections: inspectionRows.slice(0, 3),
    },
  };
}

export async function getCustomerPortalInspections(
  token: string,
): Promise<CustomerPortalServiceResult<CustomerPortalInspectionListItem[]>> {
  const resolved = await resolveCustomerPortalSession(token);
  if (!resolved.success) return resolved;
  if (resolved.data.siteIds.length === 0) {
    return { success: true, data: [] };
  }

  const db = createDb();
  const { data, error } = await listPortalInspectionsBySites(db, resolved.data.siteIds);
  if (error) return { success: false, error: error.message, status: 500 };
  return {
    success: true,
    data: ((data ?? []) as Record<string, unknown>[]).map(mapInspectionListItem),
  };
}

export async function getCustomerPortalInspection(
  token: string,
  inspectionId: string,
): Promise<CustomerPortalServiceResult<CustomerPortalInspectionDetail>> {
  const resolved = await resolveCustomerPortalSession(token);
  if (!resolved.success) return resolved;
  if (!inspectionId) return { success: false, error: 'Inspection id is required', status: 400 };

  const db = createDb();
  const inspectionRes = await getPortalInspectionById(db, inspectionId);
  if (inspectionRes.error) return { success: false, error: inspectionRes.error.message, status: 500 };
  if (!inspectionRes.data) return { success: false, error: 'Inspection not found', status: 404 };

  const base = mapInspectionListItem(inspectionRes.data as Record<string, unknown>);
  if (!base.site_id || !resolved.data.siteIds.includes(base.site_id)) {
    return { success: false, error: 'Inspection not found', status: 404 };
  }

  const [itemRes, issueRes] = await Promise.all([
    listPortalInspectionItems(db, inspectionId),
    listPortalInspectionIssues(db, inspectionId),
  ]);

  if (itemRes.error) return { success: false, error: itemRes.error.message, status: 500 };
  if (issueRes.error) return { success: false, error: issueRes.error.message, status: 500 };

  const inspectionRow = inspectionRes.data as Record<string, unknown>;
  const items = ((itemRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id ?? ''),
    section: (row.section as string | null) ?? null,
    label: String(row.label ?? ''),
    score: typeof row.score === 'number' ? row.score : null,
    score_value: typeof row.score_value === 'number' ? row.score_value : null,
    notes: (row.notes as string | null) ?? null,
    photos: normalizeStringArray(row.photos),
  }));
  const issues = ((issueRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id ?? ''),
    severity: String(row.severity ?? 'MINOR') as 'MINOR' | 'MAJOR' | 'CRITICAL',
    description: String(row.description ?? ''),
    resolved_at: (row.resolved_at as string | null) ?? null,
  }));

  return {
    success: true,
    data: {
      ...base,
      started_at: (inspectionRow.started_at as string | null) ?? null,
      notes: (inspectionRow.notes as string | null) ?? null,
      summary_notes: (inspectionRow.summary_notes as string | null) ?? null,
      photos: normalizeStringArray(inspectionRow.photos),
      items,
      issues,
    },
  };
}

export async function getCustomerPortalComplaints(
  token: string,
): Promise<CustomerPortalServiceResult<CustomerPortalComplaintListItem[]>> {
  const resolved = await resolveCustomerPortalSession(token);
  if (!resolved.success) return resolved;

  const db = createDb();
  const { data, error } = await listPortalComplaintsByClient(db, resolved.data.client.id);
  if (error) return { success: false, error: error.message, status: 500 };

  return {
    success: true,
    data: ((data ?? []) as Record<string, unknown>[]).map(mapComplaintListItem),
  };
}

export async function getCustomerPortalWorkTickets(
  token: string,
): Promise<CustomerPortalServiceResult<CustomerPortalWorkTicketListItem[]>> {
  const resolved = await resolveCustomerPortalSession(token);
  if (!resolved.success) return resolved;
  if (resolved.data.siteIds.length === 0) {
    return { success: true, data: [] };
  }

  const db = createDb();
  const { data, error } = await listPortalWorkTicketsBySites(db, resolved.data.siteIds);
  if (error) return { success: false, error: error.message, status: 500 };

  return {
    success: true,
    data: ((data ?? []) as Record<string, unknown>[]).map(mapWorkTicketListItem),
  };
}

export async function createCustomerPortalFeedback(
  token: string,
  payload: CustomerPortalFeedbackCreateInput,
  meta?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<CustomerPortalServiceResult<CustomerFeedbackListItem>> {
  const resolved = await resolveCustomerPortalSession(token);
  if (!resolved.success) return resolved;

  const db = createDb();
  const { session, client, siteIds } = resolved.data;
  const message = payload.message?.trim() ?? '';
  if (!message) return { success: false, error: 'Message is required', status: 400 };

  const feedbackType = String(payload.feedback_type ?? '').toUpperCase();
  const siteId = payload.site_id ?? null;
  if (siteId && !siteIds.includes(siteId)) {
    return { success: false, error: 'Selected site is not available for this client', status: 403 };
  }
  if (feedbackType === 'COMPLAINT' && !siteId) {
    return { success: false, error: 'A site is required for complaint submissions', status: 400 };
  }

  const feedbackCodeRes = await nextCustomerFeedbackCode(db, session.tenant_id);
  if (feedbackCodeRes.error || typeof feedbackCodeRes.data !== 'string') {
    return { success: false, error: feedbackCodeRes.error?.message ?? 'Failed to generate feedback code', status: 500 };
  }

  let linkedComplaintId: string | null = null;
  let complaintCode: string | null = null;
  if (feedbackType === 'COMPLAINT' && siteId) {
    const complaintCodeRes = await db.rpc('next_code', {
      p_tenant_id: session.tenant_id,
      p_prefix: 'CMP',
      p_padding: 4,
    });
    if (complaintCodeRes.error || typeof complaintCodeRes.data !== 'string') {
      return { success: false, error: complaintCodeRes.error?.message ?? 'Failed to generate complaint code', status: 500 };
    }

    complaintCode = complaintCodeRes.data;
    const complaintInsertRes = await insertPortalComplaintRecord(db, {
      tenant_id: session.tenant_id,
      complaint_code: complaintCode,
      site_id: siteId,
      client_id: client.id,
      reported_by_type: 'CUSTOMER',
      reported_by_staff_id: null,
      reported_by_name: payload.contact_name ?? client.name,
      source: 'PORTAL',
      customer_original_message: message,
      category: normalizeComplaintCategory(payload.category),
      priority: normalizeComplaintPriority(payload.priority),
      status: 'OPEN',
      assigned_to_staff_id: null,
      linked_route_task_id: null,
      photos_before: null,
      photos_after: null,
      resolution_description: null,
      resolution_email_sent: false,
      resolution_email_sent_at: null,
      resolved_at: null,
      resolved_by: null,
    });

    if (complaintInsertRes.error || !complaintInsertRes.data) {
      return { success: false, error: complaintInsertRes.error?.message ?? 'Failed to create complaint record', status: 500 };
    }
    linkedComplaintId = (complaintInsertRes.data as { id: string }).id;
  }

  const feedbackInsertRes = await insertCustomerFeedback(db, {
    tenant_id: session.tenant_id,
    feedback_code: feedbackCodeRes.data,
    client_id: client.id,
    site_id: siteId,
    feedback_type: feedbackType,
    submitted_via: 'PORTAL',
    category: feedbackType === 'COMPLAINT' ? normalizeComplaintCategory(payload.category) : null,
    contact_name: payload.contact_name ?? null,
    contact_email: payload.contact_email ?? null,
    message,
    photos: normalizeStringArray(payload.photos),
    linked_complaint_id: linkedComplaintId,
    status: 'NEW',
  });

  if (feedbackInsertRes.error || !feedbackInsertRes.data) {
    return { success: false, error: feedbackInsertRes.error?.message ?? 'Failed to submit feedback', status: 500 };
  }

  const alertTitle = feedbackType === 'COMPLAINT'
    ? `Portal complaint received (${complaintCode ?? feedbackCodeRes.data})`
    : feedbackType === 'KUDOS'
      ? 'Customer kudos received'
      : 'Customer feedback received';
  const alertSeverity = feedbackType === 'COMPLAINT'
    ? classifySeverity(normalizeComplaintPriority(payload.priority))
    : feedbackType === 'KUDOS'
      ? 'INFO'
      : 'WARNING';
  await insertPortalChangeAlert(db, {
    tenant_id: session.tenant_id,
    alert_type: feedbackType === 'COMPLAINT' ? 'PORTAL_COMPLAINT' : 'PORTAL_FEEDBACK',
    severity: alertSeverity,
    title: alertTitle,
    body: JSON.stringify({
      feedback_code: feedbackCodeRes.data,
      complaint_code: complaintCode,
      feedback_type: feedbackType,
      category: payload.category ?? null,
      message,
      site_id: siteId,
      client_id: client.id,
      source: 'customer_portal',
      ip_address: meta?.ipAddress ?? null,
      user_agent: meta?.userAgent ?? null,
    }),
    entity_type: feedbackType === 'COMPLAINT' ? 'complaint_records' : 'customer_feedback',
    entity_id: linkedComplaintId ?? (feedbackInsertRes.data as { id?: string } | null)?.id ?? null,
  }).catch(() => null);

  return {
    success: true,
    data: feedbackInsertRes.data as unknown as CustomerFeedbackListItem,
  };
}

export async function createCustomerPortalSession(
  tenantId: string,
  payload: { client_id: string; expires_in_days?: number },
): Promise<CustomerPortalServiceResult<{ token: string; session: CustomerPortalSessionListItem }>> {
  if (!tenantId) return { success: false, error: 'Tenant id is required', status: 400 };
  if (!payload.client_id) return { success: false, error: 'Client id is required', status: 400 };

  const db = createDb();
  const clientRes = await findClientByIdAndTenant(db, tenantId, payload.client_id);
  if (clientRes.error) return { success: false, error: clientRes.error.message, status: 500 };
  if (!clientRes.data) return { success: false, error: 'Client not found', status: 404 };

  const codeRes = await nextCustomerPortalSessionCode(db, tenantId);
  if (codeRes.error || typeof codeRes.data !== 'string') {
    return { success: false, error: codeRes.error?.message ?? 'Failed to generate session code', status: 500 };
  }

  const expiresInDays = Math.max(1, Math.min(90, Number(payload.expires_in_days ?? 30)));
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  const rawToken = crypto.randomBytes(32).toString('hex');
  const insertRes = await insertCustomerPortalSession(db, {
    tenant_id: tenantId,
    session_code: codeRes.data,
    client_id: payload.client_id,
    token_hash: hashPortalToken(rawToken),
    expires_at: expiresAt.toISOString(),
    is_active: true,
  });

  if (insertRes.error || !insertRes.data) {
    return { success: false, error: insertRes.error?.message ?? 'Failed to create customer portal session', status: 500 };
  }

  return {
    success: true,
    data: {
      token: rawToken,
      session: insertRes.data as unknown as CustomerPortalSessionListItem,
    },
  };
}

export async function getCustomerPortalSessions(
  tenantId: string,
  filters?: { client_id?: string; include_inactive?: boolean },
): Promise<CustomerPortalServiceResult<CustomerPortalSessionListItem[]>> {
  if (!tenantId) return { success: false, error: 'Tenant id is required', status: 400 };
  const db = createDb();
  const { data, error } = await listCustomerPortalSessions(db, tenantId, filters);
  if (error) return { success: false, error: error.message, status: 500 };
  return {
    success: true,
    data: (data ?? []) as unknown as CustomerPortalSessionListItem[],
  };
}

export async function deactivateCustomerPortalSession(
  tenantId: string,
  sessionId: string,
  archiveReason?: string | null,
): Promise<CustomerPortalServiceResult<{ ok: true }>> {
  if (!tenantId) return { success: false, error: 'Tenant id is required', status: 400 };
  if (!sessionId) return { success: false, error: 'Session id is required', status: 400 };

  const db = createDb();
  const { error } = await archiveCustomerPortalSession(db, tenantId, sessionId, archiveReason ?? null);
  if (error) return { success: false, error: error.message, status: 500 };
  return { success: true, data: { ok: true } };
}
