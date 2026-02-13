/**
 * GleamOps constants — lookup seeds, status maps, nav config.
 */
import type { NavItem, StatusColor } from '../types/app';

// ---------------------------------------------------------------------------
// Navigation (5 spaces only)
// ---------------------------------------------------------------------------
export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', href: '/home', icon: 'Home' },
  { id: 'pipeline', label: 'Pipeline', href: '/pipeline', icon: 'TrendingUp' },
  { id: 'customers', label: 'Customers', href: '/customers', icon: 'Building2' },
  { id: 'schedule', label: 'Schedule', href: '/schedule', icon: 'Calendar' },
  { id: 'team', label: 'Team', href: '/team', icon: 'Users' },
  { id: 'inventory', label: 'Inventory', href: '/inventory', icon: 'Package' },
  { id: 'assets', label: 'Assets', href: '/assets', icon: 'Truck' },
  { id: 'reports', label: 'Reports', href: '/reports', icon: 'BarChart3' },
  { id: 'admin', label: 'Admin', href: '/admin/services', icon: 'Wrench' },
];

// ---------------------------------------------------------------------------
// Status → Color mappings
// ---------------------------------------------------------------------------
export const PROSPECT_STATUS_COLORS: Record<string, StatusColor> = {
  NEW: 'blue',
  CONTACTED: 'yellow',
  QUALIFIED: 'green',
  UNQUALIFIED: 'gray',
  DEAD: 'gray',
  CONVERTED: 'purple',
};

export const BID_STATUS_COLORS: Record<string, StatusColor> = {
  DRAFT: 'gray',
  IN_PROGRESS: 'blue',
  READY_FOR_REVIEW: 'yellow',
  APPROVED: 'green',
  SENT: 'purple',
  WON: 'green',
  LOST: 'red',
};

export const PROPOSAL_STATUS_COLORS: Record<string, StatusColor> = {
  DRAFT: 'gray',
  GENERATED: 'blue',
  SENT: 'purple',
  DELIVERED: 'blue',
  OPENED: 'yellow',
  WON: 'green',
  LOST: 'red',
  EXPIRED: 'gray',
};

export const TICKET_STATUS_COLORS: Record<string, StatusColor> = {
  SCHEDULED: 'blue',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'green',
  VERIFIED: 'green',
  CANCELLED: 'gray',
};

export const OPPORTUNITY_STAGE_COLORS: Record<string, StatusColor> = {
  QUALIFIED: 'blue',
  WALKTHROUGH_SCHEDULED: 'yellow',
  WALKTHROUGH_COMPLETE: 'yellow',
  BID_IN_PROGRESS: 'orange',
  PROPOSAL_SENT: 'purple',
  NEGOTIATION: 'orange',
  WON: 'green',
  LOST: 'red',
};

export const TIMESHEET_STATUS_COLORS: Record<string, StatusColor> = {
  DRAFT: 'gray',
  SUBMITTED: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
};

export const EXCEPTION_SEVERITY_COLORS: Record<string, StatusColor> = {
  INFO: 'blue',
  WARNING: 'yellow',
  CRITICAL: 'red',
};

export const INSPECTION_STATUS_COLORS: Record<string, StatusColor> = {
  DRAFT: 'gray',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'blue',
  SUBMITTED: 'green',
};

export const ISSUE_SEVERITY_COLORS: Record<string, StatusColor> = {
  MINOR: 'yellow',
  MAJOR: 'orange',
  CRITICAL: 'red',
};

export const TIME_ENTRY_STATUS_COLORS: Record<string, StatusColor> = {
  OPEN: 'yellow',
  CLOSED: 'green',
  ADJUSTED: 'orange',
};

// ---------------------------------------------------------------------------
// Lookup categories (seed data keys)
// ---------------------------------------------------------------------------
export const LOOKUP_CATEGORIES = [
  'prospect_status',
  'opportunity_stage',
  'bid_status',
  'proposal_status',
  'ticket_status',
  'time_event_type',
  'exception_type',
  'activity_type',
  'frequency',
  'difficulty',
  'floor_type',
  'building_type',
  'task_category',
  'task_unit',
] as const;

export type LookupCategory = typeof LOOKUP_CATEGORIES[number];

// ---------------------------------------------------------------------------
// Frequency options
// ---------------------------------------------------------------------------
export const FREQUENCIES = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const;
export type Frequency = typeof FREQUENCIES[number];

// ---------------------------------------------------------------------------
// Difficulty multipliers (CleanFlow)
// ---------------------------------------------------------------------------
export const DIFFICULTY_MULTIPLIERS: Record<string, number> = {
  EASY: 0.85,
  STANDARD: 1.0,
  DIFFICULT: 1.25,
};

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------
export const ROLES = [
  'OWNER_ADMIN',
  'MANAGER',
  'SUPERVISOR',
  'CLEANER',
  'INSPECTOR',
  'SALES',
] as const;

export type RoleCode = typeof ROLES[number];

// ---------------------------------------------------------------------------
// Weeks per month (standard constant)
// ---------------------------------------------------------------------------
export const WEEKS_PER_MONTH = 4.33;

// ---------------------------------------------------------------------------
// Vehicle & Key status colors
// ---------------------------------------------------------------------------
export const VEHICLE_STATUS_COLORS: Record<string, StatusColor> = {
  ACTIVE: 'green',
  IN_SHOP: 'yellow',
  RETIRED: 'gray',
};

export const KEY_STATUS_COLORS: Record<string, StatusColor> = {
  AVAILABLE: 'green',
  ASSIGNED: 'blue',
  LOST: 'red',
  RETURNED: 'gray',
};
