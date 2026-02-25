import {
  createDb,
  findSiteByCode,
  insertFieldRequestAlert,
  type SiteRow,
} from './self-service.repository';

type FormTokenMode = 'universal' | 'site';
type RequestType = 'supply' | 'time-off' | 'equipment';
type RequestUrgency = 'normal' | 'high' | 'asap';

interface PublicFormPayload {
  requestType: string;
  urgency?: string | null;
  siteId?: string | null;
  title?: string | null;
  submittedBy?: string | null;
  details?: Record<string, unknown> | null;
}

type ContextResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string; status: number };

type SubmitResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string; status: number };

interface TokenConfig {
  mode: FormTokenMode;
  siteCode?: string;
}

function normalizeToken(token: string): string {
  return token.trim();
}

function parseTokenMap(): Record<string, TokenConfig> {
  const raw = process.env.PUBLIC_FORM_TOKEN_MAP;
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
  const cfg = map[token];
  if (!cfg) return null;
  if (cfg.mode !== 'site' && cfg.mode !== 'universal') return null;
  if (cfg.mode === 'site' && !cfg.siteCode) return null;
  return cfg;
}

function normalizeUrgency(value: string | null | undefined): RequestUrgency {
  if (value === 'asap' || value === 'high' || value === 'normal') return value;
  return 'normal';
}

function normalizeRequestType(value: string | null | undefined): RequestType | null {
  if (value === 'supply' || value === 'time-off' || value === 'equipment') return value;
  return null;
}

function urgencyToSeverity(urgency: RequestUrgency): 'INFO' | 'WARNING' | 'CRITICAL' {
  if (urgency === 'asap') return 'CRITICAL';
  if (urgency === 'high') return 'WARNING';
  return 'INFO';
}

function defaultTitle(type: RequestType): string {
  if (type === 'supply') return 'Supply Request';
  if (type === 'time-off') return 'Time Off Request';
  return 'Equipment Issue';
}

async function resolveSiteFromCode(siteCode: string | null | undefined): Promise<SiteRow | null> {
  if (!siteCode) return null;
  const db = createDb();
  const { data, error } = await findSiteByCode(db, siteCode.trim().toUpperCase());
  if (error || !data) return null;
  return data as SiteRow;
}

export async function getPublicFormContext(token: string): Promise<ContextResult> {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) {
    return { success: false, error: 'Token required', status: 400 };
  }

  const tokenCfg = resolveTokenConfig(normalizedToken);
  if (!tokenCfg) return { success: false, error: 'Invalid or expired token', status: 404 };

  if (tokenCfg.mode === 'universal') {
    return { success: false, error: 'Universal tokens are temporarily disabled', status: 403 };
  }

  const site = await resolveSiteFromCode(tokenCfg.siteCode);
  if (!site) return { success: false, error: 'Invalid or expired token', status: 404 };

  return {
    success: true,
    data: {
      mode: 'site',
      site: { id: site.id, name: site.name, site_code: site.site_code },
      sites: [{ id: site.id, name: site.name, site_code: site.site_code }],
    },
  };
}

export async function submitPublicForm(
  token: string,
  payload: PublicFormPayload,
  meta?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<SubmitResult> {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) {
    return { success: false, error: 'Token required', status: 400 };
  }

  const requestType = normalizeRequestType(payload.requestType);
  if (!requestType) {
    return { success: false, error: 'Unsupported request type', status: 400 };
  }

  const tokenCfg = resolveTokenConfig(normalizedToken);
  if (!tokenCfg) return { success: false, error: 'Invalid or expired token', status: 404 };

  if (tokenCfg.mode === 'universal') {
    return { success: false, error: 'Universal tokens are temporarily disabled', status: 403 };
  }

  const urgency = normalizeUrgency(payload.urgency);

  let targetSite: SiteRow | null = null;

  targetSite = await resolveSiteFromCode(tokenCfg.siteCode);
  if (!targetSite) {
    return { success: false, error: 'Invalid or expired token', status: 404 };
  }

  if (!targetSite) {
    return { success: false, error: 'Unable to resolve site context', status: 400 };
  }

  const details = payload.details && typeof payload.details === 'object' ? payload.details : {};
  const title = payload.title?.trim() || defaultTitle(requestType);
  const submittedBy = payload.submittedBy?.trim() || 'public-form';

  const requestBody = {
    request_type: requestType,
    urgency,
    site_id: targetSite.id,
    site_name: `${targetSite.site_code} - ${targetSite.name}`,
    submitted_by: submittedBy,
    submitted_at: new Date().toISOString(),
    source: 'public_site_qr',
    details,
    meta: {
      ip_address: meta?.ipAddress ?? null,
      user_agent: meta?.userAgent ?? null,
    },
  };

  const db = createDb();

  const { data: alertRecord, error } = await insertFieldRequestAlert(db, {
    tenant_id: targetSite.tenant_id,
    severity: urgencyToSeverity(urgency),
    title,
    body: JSON.stringify(requestBody),
    entity_id: targetSite.id,
  });

  if (error || !alertRecord) {
    return { success: false, error: error?.message ?? 'Unable to submit request', status: 500 };
  }

  return {
    success: true,
    data: {
      ok: true,
      requestId: (alertRecord as { id: string }).id,
      site: {
        id: targetSite.id,
        site_code: targetSite.site_code,
        name: targetSite.name,
      },
      mode: tokenCfg.mode,
    },
  };
}
