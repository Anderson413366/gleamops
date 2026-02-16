/**
 * GleamOps constants — lookup seeds, status maps, nav config.
 */
import type { ModuleAccent, ModuleKey, NavItem, StatusColor } from '../types/app';

// ---------------------------------------------------------------------------
// Navigation (6 consolidated modules)
// ---------------------------------------------------------------------------
export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', href: '/home', icon: 'Home' },
  { id: 'pipeline', label: 'Pipeline', href: '/pipeline', icon: 'TrendingUp' },
  { id: 'crm', label: 'CRM', href: '/crm', icon: 'Building2' },
  { id: 'operations', label: 'Operations', href: '/operations', icon: 'Calendar' },
  { id: 'workforce', label: 'Workforce', href: '/workforce', icon: 'Users' },
  { id: 'inventory', label: 'Inventory', href: '/inventory', icon: 'Package' },
  { id: 'assets', label: 'Assets', href: '/assets', icon: 'Wrench' },
  { id: 'vendors', label: 'Vendors', href: '/vendors', icon: 'Truck' },
  { id: 'safety', label: 'Safety', href: '/safety', icon: 'ShieldCheck' },
  { id: 'admin', label: 'Admin', href: '/admin', icon: 'Settings' },
];

// ---------------------------------------------------------------------------
// Module accent colors (single source of truth for module-level theming)
// ---------------------------------------------------------------------------
export const MODULE_ACCENTS: Record<ModuleKey, ModuleAccent> = {
  home: { name: 'Harbor Blue', hex: '#2563EB', hsl: '217 82% 54%' },
  pipeline: { name: 'Canyon Orange', hex: '#F97316', hsl: '24 95% 53%' },
  crm: { name: 'Evergreen', hex: '#10B981', hsl: '160 84% 39%' },
  operations: { name: 'Royal Indigo', hex: '#4F46E5', hsl: '244 75% 59%' },
  workforce: { name: 'Rosewood', hex: '#E11D48', hsl: '347 77% 50%' },
  inventory: { name: 'Goldenrod', hex: '#D97706', hsl: '35 91% 44%' },
  assets: { name: 'Slate Teal', hex: '#0F766E', hsl: '175 77% 26%' },
  vendors: { name: 'Grape', hex: '#7C3AED', hsl: '263 70% 56%' },
  safety: { name: 'Forest', hex: '#15803D', hsl: '142 72% 29%' },
  admin: { name: 'Charcoal', hex: '#334155', hsl: '215 25% 27%' },
  reports: { name: 'Cerulean', hex: '#0284C7', hsl: '199 98% 39%' },
  settings: { name: 'Steel Gray', hex: '#64748B', hsl: '215 16% 47%' },
};

export const DEFAULT_MODULE_KEY: ModuleKey = 'home';

export function getModuleFromPathname(pathname: string): ModuleKey {
  if (pathname.startsWith('/pipeline')) return 'pipeline';
  if (pathname.startsWith('/crm') || pathname.startsWith('/customers')) return 'crm';
  if (pathname.startsWith('/operations') || pathname.startsWith('/schedule')) return 'operations';
  if (pathname.startsWith('/workforce') || pathname.startsWith('/people') || pathname.startsWith('/team')) return 'workforce';
  if (pathname.startsWith('/inventory')) return 'inventory';
  if (pathname.startsWith('/assets')) return 'assets';
  if (pathname.startsWith('/vendors') || pathname.startsWith('/subcontractors')) return 'vendors';
  if (pathname.startsWith('/safety')) return 'safety';
  if (pathname.startsWith('/admin') || pathname.startsWith('/services')) return 'admin';
  if (pathname.startsWith('/financial-intelligence')) return 'reports';
  if (pathname.startsWith('/reports')) return 'reports';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'home';
}

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
  CANCELED: 'gray',
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
// Entity status colors (core entities)
// ---------------------------------------------------------------------------
export const CLIENT_STATUS_COLORS: Record<string, StatusColor> = {
  DRAFT: 'gray',
  PROSPECT: 'blue',
  ACTIVE: 'green',
  ON_HOLD: 'yellow',
  INACTIVE: 'gray',
  CANCELED: 'red',
  LOST: 'orange',
};

export const SITE_STATUS_COLORS: Record<string, StatusColor> = {
  DRAFT: 'gray',
  ACTIVE: 'green',
  ON_HOLD: 'yellow',
  INACTIVE: 'gray',
  CANCELED: 'red',
};

export const JOB_STATUS_COLORS: Record<string, StatusColor> = {
  DRAFT: 'gray',
  ACTIVE: 'green',
  ON_HOLD: 'yellow',
  CANCELED: 'red',
  COMPLETED: 'blue',
};

export const STAFF_STATUS_COLORS: Record<string, StatusColor> = {
  DRAFT: 'gray',
  ACTIVE: 'green',
  ON_LEAVE: 'yellow',
  INACTIVE: 'gray',
  TERMINATED: 'red',
};

export const LOG_STATUS_COLORS: Record<string, StatusColor> = {
  OPEN: 'red',
  IN_PROGRESS: 'yellow',
  RESOLVED: 'green',
  CLOSED: 'gray',
};

// ---------------------------------------------------------------------------
// Badge color CSS classes — single source of truth for all badge/pill styling.
// Each semantic color maps to Tailwind classes for bg, text, border, and dot.
// ---------------------------------------------------------------------------
export const BADGE_COLOR_CLASSES: Record<StatusColor, {
  bg: string;
  text: string;
  border: string;
  dot: string;
}> = {
  green:  { bg: 'bg-green-50 dark:bg-green-950',   text: 'text-green-700 dark:text-green-300',   border: 'border-green-200 dark:border-green-800',   dot: 'bg-green-500' },
  red:    { bg: 'bg-red-50 dark:bg-red-950',       text: 'text-red-700 dark:text-red-300',       border: 'border-red-200 dark:border-red-800',       dot: 'bg-red-500' },
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-950',  text: 'text-yellow-700 dark:text-yellow-300',  border: 'border-yellow-200 dark:border-yellow-800',  dot: 'bg-yellow-500' },
  blue:   { bg: 'bg-blue-50 dark:bg-blue-950',     text: 'text-blue-700 dark:text-blue-300',     border: 'border-blue-200 dark:border-blue-800',     dot: 'bg-blue-500' },
  gray:   { bg: 'bg-gray-50 dark:bg-gray-900',     text: 'text-gray-600 dark:text-gray-400',     border: 'border-gray-200 dark:border-gray-700',     dot: 'bg-gray-400' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500' },
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
  'area_type',
  'traffic',
  'service_time',
  'qc_frequency',
  'task_category',
  'task_unit',
  'client_status',
  'site_status',
  'job_status',
  'staff_status',
  'equipment_condition',
  'equipment_condition_bid',
  'supply_status',
  'vehicle_status',
  'key_status',
  'subcontractor_status',
  'log_event_type',
  'severity_level',
  'log_status',
  'pricing_method',
  'bid_type',
  'general_task_category',
  'signature_type',
  'email_event_type',
  'price_elasticity',
] as const;

export type LookupCategory = typeof LOOKUP_CATEGORIES[number];

// ---------------------------------------------------------------------------
// Frequency options
// ---------------------------------------------------------------------------
export const FREQUENCIES = ['DAILY', '2X_WEEK', '3X_WEEK', 'WEEKLY', '5X_WEEK', 'BIWEEKLY', 'MONTHLY', 'AS_NEEDED'] as const;
export type Frequency = typeof FREQUENCIES[number];

/**
 * How many times per week a frequency code translates to.
 * Used by CleanFlow workload calculation to properly weight tasks
 * that don't run every visit.
 */
export const FREQUENCY_VISITS_PER_WEEK: Record<string, number> = {
  DAILY: 5,
  '5X_WEEK': 5,
  '4X_WEEK': 4,
  '3X_WEEK': 3,
  '2X_WEEK': 2,
  WEEKLY: 1,
  BIWEEKLY: 0.5,
  MONTHLY: 0.23, // ~1x per 4.33 weeks
  AS_NEEDED: 0,
};

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

export const EQUIPMENT_CONDITION_COLORS: Record<string, StatusColor> = {
  GOOD: 'green',
  FAIR: 'yellow',
  POOR: 'orange',
  OUT_OF_SERVICE: 'red',
};

export const SUBCONTRACTOR_STATUS_COLORS: Record<string, StatusColor> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  PENDING: 'yellow',
};

export const SUPPLY_ORDER_STATUS_COLORS: Record<string, StatusColor> = {
  DRAFT: 'gray',
  ORDERED: 'blue',
  SHIPPED: 'yellow',
  RECEIVED: 'green',
  CANCELED: 'red',
};

export const INVENTORY_COUNT_STATUS_COLORS: Record<string, StatusColor> = {
  DRAFT: 'gray',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'green',
};

export const CERTIFICATION_STATUS_COLORS: Record<string, StatusColor> = {
  ACTIVE: 'green',
  EXPIRED: 'red',
  REVOKED: 'gray',
  PENDING: 'yellow',
};

export const SAFETY_DOCUMENT_STATUS_COLORS: Record<string, StatusColor> = {
  ACTIVE: 'green',
  UNDER_REVIEW: 'yellow',
  EXPIRED: 'red',
  SUPERSEDED: 'gray',
  DRAFT: 'gray',
};

export const GENERAL_TASK_CATEGORY_COLORS: Record<string, StatusColor> = {
  QUALITY: 'blue',
  CLOSING: 'gray',
  SETUP: 'yellow',
  TRAVEL: 'orange',
  BREAK: 'green',
  MANAGEMENT: 'purple',
  OTHER: 'gray',
};
