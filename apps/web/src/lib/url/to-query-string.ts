export type SearchParams = Record<string, string | string[] | undefined>;

export function toQueryString(searchParams?: SearchParams): string {
  if (!searchParams) return '';

  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const item of value) qs.append(key, item);
      continue;
    }
    qs.set(key, value);
  }

  const serialized = qs.toString();
  return serialized ? `?${serialized}` : '';
}
