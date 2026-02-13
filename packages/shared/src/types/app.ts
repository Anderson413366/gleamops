/**
 * Application-level types (not database rows).
 */

// User roles (RBAC)
export type UserRole =
  | 'OWNER_ADMIN'
  | 'MANAGER'
  | 'SUPERVISOR'
  | 'CLEANER'
  | 'INSPECTOR'
  | 'SALES';

// Navigation spaces
export type NavSpace =
  | 'home'
  | 'pipeline'
  | 'crm'
  | 'operations'
  | 'workforce'
  | 'inventory'
  | 'assets'
  | 'vendors'
  | 'safety'
  | 'admin';

export interface NavItem {
  id: NavSpace;
  label: string;
  href: string;
  icon: string; // lucide icon name
}

// Status pill colors
export type StatusColor = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'orange' | 'purple';

// Problem Details (RFC 9457)
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  errors?: Array<{ field: string; message: string }>;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  next_cursor: string | null;
  total_count?: number;
}

// Entity code prefixes
export const ENTITY_PREFIXES = {
  client: 'CLI',
  site: 'SIT',
  contact: 'CON',
  task: 'TSK',
  service: 'SER',
  prospect: 'PRO',
  opportunity: 'OPP',
  bid: 'BID',
  proposal: 'PRP',
  job: 'JOB',
  ticket: 'TKT',
  staff: 'STF',
  file: 'FIL',
  equipment: 'EQP',
  subcontractor: 'SUB',
  position: 'POS',
  vehicle: 'VEH',
  supply_order: 'ORD',
  inventory_count: 'CNT',
} as const;

export type EntityPrefix = typeof ENTITY_PREFIXES[keyof typeof ENTITY_PREFIXES];
