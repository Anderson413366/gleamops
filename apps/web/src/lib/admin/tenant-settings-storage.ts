export function buildTenantStorageKey(tenantId: string | null | undefined, settingKey: string): string {
  const tenantSegment = tenantId?.trim() ? tenantId.trim() : 'anon';
  return `gleamops:${tenantSegment}:${settingKey}`;
}

export function loadTenantSetting<T>(
  tenantId: string | null | undefined,
  settingKey: string,
  fallback: T,
): T {
  if (typeof window === 'undefined') return fallback;

  const raw = window.localStorage.getItem(buildTenantStorageKey(tenantId, settingKey));
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveTenantSetting<T>(
  tenantId: string | null | undefined,
  settingKey: string,
  value: T,
): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(buildTenantStorageKey(tenantId, settingKey), JSON.stringify(value));
}
