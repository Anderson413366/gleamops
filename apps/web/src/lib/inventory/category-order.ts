const CATEGORY_DISPLAY_ORDER = [
  'GENERAL',
  'RESTROOM',
  'FLOOR_CARE',
  'SPECIALTY',
  'UNCATEGORIZED',
] as const;

const categoryRank = new Map<string, number>(
  CATEGORY_DISPLAY_ORDER.map((value, index) => [value, index]),
);

export function normalizeSupplyCategory(value: string | null | undefined): string {
  const cleaned = (value ?? '').trim();
  if (!cleaned) return 'UNCATEGORIZED';

  return cleaned
    .replace(/[-\s]+/g, '_')
    .replace(/[^A-Za-z0-9_]/g, '')
    .toUpperCase();
}

export function formatSupplyCategoryLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function compareSupplyCategories(a: string, b: string): number {
  const normalizedA = normalizeSupplyCategory(a);
  const normalizedB = normalizeSupplyCategory(b);
  const rankA = categoryRank.get(normalizedA) ?? Number.MAX_SAFE_INTEGER;
  const rankB = categoryRank.get(normalizedB) ?? Number.MAX_SAFE_INTEGER;

  if (rankA !== rankB) return rankA - rankB;

  return formatSupplyCategoryLabel(normalizedA).localeCompare(formatSupplyCategoryLabel(normalizedB));
}
