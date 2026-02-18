export const CANONICAL_ROUTES = {
  command: '/command',
  schedule: '/schedule',
  planning: '/planning',
  work: '/work',
  customers: '/customers',
  sales: '/sales',
  people: '/people',
  supplies: '/supplies',
  insights: '/insights',
  platform: '/platform',
} as const;

export type CanonicalRouteKey = keyof typeof CANONICAL_ROUTES;
