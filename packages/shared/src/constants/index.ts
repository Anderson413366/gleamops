/**
 * GleamOps constants — lookup seeds, status maps, nav config.
 */
import type { LegacyUserRole, ModuleAccent, ModuleKey, NavItem, StatusColor, UserRole } from '../types/app';

// ---------------------------------------------------------------------------
// Navigation — Phase 2: Full rename (CRM→Clients, Workforce→Team, Assets→Equipment, Admin→Settings)
// ---------------------------------------------------------------------------
export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', href: '/home', icon: 'Home' },
  { id: 'schedule', label: 'Schedule', href: '/schedule', icon: 'Calendar' },
  { id: 'jobs', label: 'Jobs', href: '/jobs', icon: 'ClipboardCheck' },
  { id: 'clients', label: 'Clients', href: '/clients', icon: 'Building2' },
  { id: 'pipeline', label: 'Pipeline', href: '/pipeline', icon: 'TrendingUp' },
  { id: 'team', label: 'Team', href: '/team', icon: 'Users' },
  { id: 'inventory', label: 'Inventory', href: '/inventory', icon: 'Package' },
  { id: 'equipment', label: 'Equipment', href: '/equipment', icon: 'Wrench' },
  { id: 'safety', label: 'Safety', href: '/safety', icon: 'ShieldCheck' },
  { id: 'reports', label: 'Reports', href: '/reports', icon: 'BarChart3' },
  { id: 'settings', label: 'Settings', href: '/settings', icon: 'Settings' },
];

// ---------------------------------------------------------------------------
// Hierarchical navigation tree — v2 sidebar with collapsible children
// ---------------------------------------------------------------------------
export const NAV_TREE: NavItem[] = [
  // 1. Home
  { id: 'home', label: 'Home', href: '/home', icon: 'Home' },
  // 2. Staff Schedule
  {
    id: 'schedule', label: 'Staff Schedule', href: '/schedule', icon: 'Calendar',
    children: [
      { id: 'schedule', label: 'Employee Grid', href: '/schedule?tab=recurring', icon: 'RefreshCw' },
      { id: 'schedule', label: 'Calendar', href: '/schedule?tab=calendar', icon: 'CalendarDays' },
      { id: 'schedule', label: 'Leave & Availability', href: '/schedule?tab=leave', icon: 'CalendarDays' },
      { id: 'schedule', label: 'My Schedule', href: '/schedule?tab=my-schedule', icon: 'CalendarDays' },
    ],
  },
  // 3. Dispatch
  {
    id: 'schedule', label: 'Dispatch', href: '/schedule?tab=planning', icon: 'MapPin',
    children: [
      { id: 'schedule', label: 'Planning Board', href: '/schedule?tab=planning', icon: 'LayoutDashboard' },
      { id: 'schedule', label: 'Master Board', href: '/schedule?tab=master', icon: 'Columns3' },
      { id: 'schedule', label: 'My Route', href: '/schedule?tab=floater', icon: 'Route' },
      { id: 'schedule', label: 'Supervisor View', href: '/schedule?tab=supervisor', icon: 'Shield' },
      { id: 'shifts_time', label: 'Tonight Board', href: '/shifts-time', icon: 'Clock' },
    ],
  },
  // 4. Work Orders
  {
    id: 'jobs', label: 'Work Orders', href: '/schedule?tab=work-orders', icon: 'ClipboardList',
    children: [
      { id: 'schedule', label: 'Open Orders', href: '/schedule?tab=work-orders', icon: 'FileText' },
      { id: 'jobs', label: 'Job Log', href: '/jobs?tab=tickets', icon: 'ClipboardList' },
      { id: 'jobs', label: 'Service Plans', href: '/jobs?tab=service-plans', icon: 'Briefcase' },
      { id: 'jobs', label: 'Inspections', href: '/jobs?tab=inspections', icon: 'ClipboardCheck' },
      { id: 'jobs', label: 'Routes', href: '/jobs?tab=routes', icon: 'Route' },
    ],
  },
  // 5. Field Tools
  {
    id: 'jobs', label: 'Field Tools', href: '/schedule?tab=checklists', icon: 'Wrench',
    children: [
      { id: 'schedule', label: 'Shift Checklists', href: '/schedule?tab=checklists', icon: 'ClipboardCheck' },
      { id: 'schedule', label: 'Field Requests', href: '/schedule?tab=forms', icon: 'FileText' },
      { id: 'jobs', label: 'Time Alerts', href: '/jobs?tab=time', icon: 'AlertTriangle' },
    ],
  },
  // 6. Client Hub
  {
    id: 'clients', label: 'Client Hub', href: '/clients', icon: 'Building2',
    children: [
      { id: 'clients', label: 'Directory', href: '/clients?tab=clients', icon: 'Building2' },
      { id: 'clients', label: 'Sites', href: '/clients?tab=sites', icon: 'MapPin' },
      { id: 'clients', label: 'Contacts', href: '/clients?tab=contacts', icon: 'Contact' },
      { id: 'clients', label: 'Requests', href: '/clients?tab=requests', icon: 'Inbox' },
      { id: 'clients', label: 'Partners', href: '/clients?tab=partners', icon: 'Handshake' },
    ],
  },
  // 7. Sales Pipeline
  {
    id: 'pipeline', label: 'Sales Pipeline', href: '/pipeline', icon: 'TrendingUp',
    children: [
      { id: 'pipeline', label: 'Prospects', href: '/pipeline?tab=prospects', icon: 'UserSearch' },
      { id: 'pipeline', label: 'Opportunities', href: '/pipeline?tab=opportunities', icon: 'Target' },
      { id: 'pipeline', label: 'Bids', href: '/pipeline?tab=bids', icon: 'FileSpreadsheet' },
      { id: 'pipeline', label: 'Proposals', href: '/pipeline?tab=proposals', icon: 'FileCheck' },
      { id: 'pipeline', label: 'Funnel Analytics', href: '/pipeline?tab=analytics', icon: 'BarChart3' },
    ],
  },
  // 8. Estimating
  {
    id: 'pipeline', label: 'Estimating', href: '/pipeline/calculator', icon: 'Calculator',
    children: [
      { id: 'pipeline', label: 'Bid Calculator', href: '/pipeline/calculator', icon: 'Calculator' },
      { id: 'pipeline', label: 'Supply Calculator', href: '/pipeline/supply-calculator', icon: 'Beaker' },
      { id: 'pipeline', label: 'Sales Admin', href: '/pipeline/admin', icon: 'Settings' },
    ],
  },
  // 9. Workforce
  {
    id: 'team', label: 'Workforce', href: '/team', icon: 'Users',
    children: [
      { id: 'team', label: 'Staff Directory', href: '/team?tab=staff', icon: 'Users' },
      { id: 'team', label: 'Roles & Positions', href: '/team?tab=positions', icon: 'BriefcaseBusiness' },
      { id: 'team', label: 'Subcontractors', href: '/team?tab=subcontractors', icon: 'HardHat' },
      { id: 'team', label: 'HR & Reviews', href: '/team?tab=hr', icon: 'UserRoundCheck' },
      { id: 'team', label: 'Team Messages', href: '/team?tab=messages', icon: 'MessageSquare' },
    ],
  },
  // 10. Time & Pay
  {
    id: 'team', label: 'Time & Pay', href: '/team?tab=attendance', icon: 'Clock',
    children: [
      { id: 'team', label: 'Attendance', href: '/team?tab=attendance', icon: 'Clock' },
      { id: 'team', label: 'Timesheets', href: '/team?tab=timesheets', icon: 'FileText' },
      { id: 'team', label: 'Payroll', href: '/team?tab=payroll', icon: 'DollarSign' },
      { id: 'team', label: 'Microfiber Payouts', href: '/team?tab=microfiber', icon: 'Droplets' },
    ],
  },
  // 11. Shift Config
  {
    id: 'team', label: 'Shift Config', href: '/team?tab=break-rules', icon: 'Settings',
    children: [
      { id: 'team', label: 'Break Rules', href: '/team?tab=break-rules', icon: 'Coffee' },
      { id: 'team', label: 'Shift Tags', href: '/team?tab=shift-tags', icon: 'Tag' },
    ],
  },
  // 12. Inventory
  {
    id: 'inventory', label: 'Inventory', href: '/inventory', icon: 'Package',
    children: [
      { id: 'inventory', label: 'Supply Catalog', href: '/inventory?tab=supplies', icon: 'Package' },
      { id: 'inventory', label: 'Kits', href: '/inventory?tab=kits', icon: 'Box' },
      { id: 'inventory', label: 'Site Assignments', href: '/inventory?tab=site-assignments', icon: 'MapPin' },
      { id: 'inventory', label: 'Stock Counts', href: '/inventory?tab=counts', icon: 'ClipboardList' },
      { id: 'inventory', label: 'Warehouse', href: '/inventory?tab=warehouse', icon: 'Warehouse' },
    ],
  },
  // 13. Procurement
  {
    id: 'inventory', label: 'Procurement', href: '/inventory?tab=orders', icon: 'ShoppingCart',
    children: [
      { id: 'inventory', label: 'Purchase Orders', href: '/inventory?tab=orders', icon: 'ShoppingCart' },
      { id: 'inventory', label: 'Forecasting', href: '/inventory?tab=forecasting', icon: 'BrainCircuit' },
      { id: 'inventory', label: 'Vendor Directory', href: '/inventory?tab=vendors', icon: 'Store' },
    ],
  },
  // 14. Assets
  {
    id: 'equipment', label: 'Assets', href: '/equipment', icon: 'Wrench',
    children: [
      { id: 'equipment', label: 'Asset List', href: '/equipment?tab=equipment', icon: 'Wrench' },
      { id: 'equipment', label: 'Assigned Gear', href: '/equipment?tab=assignments', icon: 'Link2' },
      { id: 'equipment', label: 'Keys', href: '/equipment?tab=keys', icon: 'KeyRound' },
      { id: 'equipment', label: 'Fleet', href: '/equipment?tab=vehicles', icon: 'Truck' },
      { id: 'equipment', label: 'Maintenance', href: '/equipment?tab=maintenance', icon: 'Settings' },
    ],
  },
  // 15. Compliance
  {
    id: 'safety', label: 'Compliance', href: '/safety', icon: 'ShieldCheck',
    children: [
      { id: 'safety', label: 'Certifications', href: '/safety?tab=certifications', icon: 'Award' },
      { id: 'safety', label: 'Training', href: '/safety?tab=training', icon: 'GraduationCap' },
      { id: 'safety', label: 'Incidents', href: '/safety?tab=incidents', icon: 'AlertTriangle' },
      { id: 'safety', label: 'Expiration Tracker', href: '/safety?tab=calendar', icon: 'CalendarDays' },
    ],
  },
  // 16. Reports
  { id: 'reports', label: 'Reports', href: '/reports', icon: 'BarChart3' },
  // 17. Service Catalog
  {
    id: 'catalog', label: 'Service Catalog', href: '/catalog', icon: 'BookOpen',
    children: [
      { id: 'catalog', label: 'Task Library', href: '/catalog?tab=tasks', icon: 'ClipboardList' },
      { id: 'catalog', label: 'Service Definitions', href: '/catalog?tab=services', icon: 'Layers' },
      { id: 'catalog', label: 'Task Mapping', href: '/catalog?tab=mapping', icon: 'Link2' },
      { id: 'catalog', label: 'Scope Library', href: '/catalog?tab=scope-library', icon: 'BookOpen' },
    ],
  },
  // 18. Settings
  { id: 'settings', label: 'Settings', href: '/settings', icon: 'Settings' },
];

// ---------------------------------------------------------------------------
// Module accent colors (single source of truth for module-level theming)
// ---------------------------------------------------------------------------
export const MODULE_ACCENTS: Record<ModuleKey, ModuleAccent> = {
  home: { name: 'Harbor Blue', hex: '#2563EB', hsl: '217 82% 54%' },
  schedule: { name: 'Sunset Orange', hex: '#F97316', hsl: '24 95% 53%' },
  jobs: { name: 'Signal Red', hex: '#EF4444', hsl: '0 84% 60%' },
  shifts_time: { name: 'Ocean Teal', hex: '#0891B2', hsl: '190 90% 37%' },
  pipeline: { name: 'Canyon Orange', hex: '#F97316', hsl: '24 95% 53%' },
  crm: { name: 'Evergreen', hex: '#10B981', hsl: '160 84% 39%' },
  clients: { name: 'Evergreen', hex: '#10B981', hsl: '160 84% 39%' },
  operations: { name: 'Royal Indigo', hex: '#4F46E5', hsl: '244 75% 59%' },
  workforce: { name: 'Rosewood', hex: '#E11D48', hsl: '347 77% 50%' },
  team: { name: 'Amethyst', hex: '#A855F7', hsl: '271 81% 65%' },
  inventory: { name: 'Goldenrod', hex: '#D97706', hsl: '35 91% 44%' },
  assets: { name: 'Slate Teal', hex: '#0F766E', hsl: '175 77% 26%' },
  equipment: { name: 'Hot Pink', hex: '#EC4899', hsl: '330 81% 60%' },
  vendors: { name: 'Grape', hex: '#7C3AED', hsl: '263 70% 56%' },
  safety: { name: 'Forest', hex: '#15803D', hsl: '142 72% 29%' },
  admin: { name: 'Charcoal', hex: '#334155', hsl: '215 25% 27%' },
  reports: { name: 'Cerulean', hex: '#0284C7', hsl: '199 98% 39%' },
  settings: { name: 'Steel Gray', hex: '#64748B', hsl: '215 16% 47%' },
  catalog: { name: 'Teal', hex: '#0D9488', hsl: '173 82% 32%' },
};

export const DEFAULT_MODULE_KEY: ModuleKey = 'home';

export function getModuleFromPathname(pathname: string): ModuleKey {
  // Primary routes (Phase 2)
  if (pathname.startsWith('/schedule')) return 'schedule';
  if (pathname.startsWith('/jobs')) return 'jobs';
  if (pathname.startsWith('/shifts-time')) return 'shifts_time';
  if (pathname.startsWith('/clients')) return 'clients';
  if (pathname.startsWith('/pipeline')) return 'pipeline';
  if (pathname.startsWith('/team')) return 'team';
  if (pathname.startsWith('/inventory')) return 'inventory';
  if (pathname.startsWith('/equipment')) return 'equipment';
  if (pathname.startsWith('/safety')) return 'safety';
  if (pathname.startsWith('/reports')) return 'reports';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/catalog')) return 'catalog';
  // Legacy routes → map to new module keys
  if (pathname.startsWith('/crm') || pathname.startsWith('/customers')) return 'clients';
  if (pathname.startsWith('/operations')) return 'jobs';
  if (pathname.startsWith('/workforce') || pathname.startsWith('/people')) return 'team';
  if (pathname.startsWith('/assets')) return 'equipment';
  if (pathname.startsWith('/vendors') || pathname.startsWith('/subcontractors')) return 'clients';
  if (pathname.startsWith('/admin')) return 'settings';
  if (pathname.startsWith('/services')) return 'catalog';
  if (pathname.startsWith('/financial-intelligence')) return 'reports';
  if (pathname.startsWith('/financial')) return 'reports';
  if (pathname.startsWith('/money')) return 'reports';
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
export const FREQUENCIES = ['DAILY', '2X_WEEK', '3X_WEEK', 'WEEKLY', '5X_WEEK', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL', 'AS_NEEDED'] as const;
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
  QUARTERLY: 0.077, // ~1x per 13 weeks
  SEMIANNUAL: 0.038, // ~1x per 26 weeks
  ANNUAL: 0.019, // ~1x per 52 weeks
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

export const ANDERSON_ROLES = [
  'ADMIN',
  'OPERATIONS',
  'SUPERVISOR',
  'TECHNICIAN',
  'WAREHOUSE',
  'FINANCE',
] as const;

export const ROLE_ALIAS_TO_LEGACY: Record<string, LegacyUserRole> = {
  OWNER_ADMIN: 'OWNER_ADMIN',
  MANAGER: 'MANAGER',
  SUPERVISOR: 'SUPERVISOR',
  CLEANER: 'CLEANER',
  INSPECTOR: 'INSPECTOR',
  SALES: 'SALES',
  ADMIN: 'OWNER_ADMIN',
  OPERATIONS: 'MANAGER',
  TECHNICIAN: 'CLEANER',
  WAREHOUSE: 'SUPERVISOR',
  FINANCE: 'MANAGER',
};

const ROLE_DISPLAY_LABELS: Record<string, string> = {
  OWNER_ADMIN: 'Admin',
  MANAGER: 'Operations',
  SUPERVISOR: 'Supervisor',
  CLEANER: 'Technician',
  INSPECTOR: 'Supervisor',
  SALES: 'Sales',
  ADMIN: 'Admin',
  OPERATIONS: 'Operations',
  TECHNICIAN: 'Technician',
  WAREHOUSE: 'Warehouse',
  FINANCE: 'Finance',
};

export function normalizeRoleCode(role: string | null | undefined): LegacyUserRole | null {
  if (!role) return null;
  const normalized = role.trim().toUpperCase();
  return ROLE_ALIAS_TO_LEGACY[normalized] ?? null;
}

export function roleDisplayName(role: string | null | undefined): string {
  if (!role) return 'Not Set';
  const normalized = role.trim().toUpperCase();
  return ROLE_DISPLAY_LABELS[normalized] ?? normalized.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isSupportedRole(role: string | null | undefined): role is UserRole {
  if (!role) return false;
  return Boolean(ROLE_ALIAS_TO_LEGACY[role.trim().toUpperCase()]);
}

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

// ---------------------------------------------------------------------------
// Days of Week (Schedule Day Picker)
// ---------------------------------------------------------------------------
export const DAYS_OF_WEEK = [
  { code: 'MON', label: 'M', full: 'Monday' },
  { code: 'TUE', label: 'T', full: 'Tuesday' },
  { code: 'WED', label: 'W', full: 'Wednesday' },
  { code: 'THU', label: 'Th', full: 'Thursday' },
  { code: 'FRI', label: 'F', full: 'Friday' },
  { code: 'SAT', label: 'Sa', full: 'Saturday' },
  { code: 'SUN', label: 'Su', full: 'Sunday' },
] as const;

export type DayOfWeekCode = typeof DAYS_OF_WEEK[number]['code'];

export const WEEKEND_DAYS: DayOfWeekCode[] = ['SAT', 'SUN'];

// ---------------------------------------------------------------------------
// Service Window — time options and defaults
// ---------------------------------------------------------------------------
export const TIME_OPTIONS = [
  { value: '05:00', label: '5:00 AM' },
  { value: '05:30', label: '5:30 AM' },
  { value: '06:00', label: '6:00 AM' },
  { value: '06:30', label: '6:30 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '07:30', label: '7:30 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '08:30', label: '8:30 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '17:30', label: '5:30 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '18:30', label: '6:30 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '19:30', label: '7:30 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '20:30', label: '8:30 PM' },
  { value: '21:00', label: '9:00 PM' },
  { value: '21:30', label: '9:30 PM' },
  { value: '22:00', label: '10:00 PM' },
  { value: '22:30', label: '10:30 PM' },
  { value: '23:00', label: '11:00 PM' },
] as const;

export const BREAK_OPTIONS = [
  { value: 0, label: 'No break' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
] as const;

export const TRAVEL_OPTIONS = [
  { value: 0, label: 'No travel' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
] as const;

export const SERVICE_WINDOW_DEFAULTS = {
  start_time: '18:00',
  break_minutes: 0,
  travel_minutes: 0,
} as const;

// ---------------------------------------------------------------------------
// Contract Terms
// ---------------------------------------------------------------------------
export const CONTRACT_LENGTH_OPTIONS = [
  { value: 6, label: '6 months' },
  { value: 12, label: '12 months' },
  { value: 18, label: '18 months' },
  { value: 24, label: '24 months' },
  { value: 36, label: '36 months' },
] as const;

export const CONTRACT_DEFAULTS = {
  length_months: 12,
  annual_escalation_pct: 3.0,
  start_date: '',
  include_deep_clean: false,
  deep_clean_price: 0,
} as const;

// ---------------------------------------------------------------------------
// Shift Differentials
// ---------------------------------------------------------------------------
export const SHIFT_DIFFERENTIAL_DEFAULTS = {
  enabled: false,
  night_pct: 10,
  weekend_pct: 0,
  overtime_threshold_hours: 40,
} as const;

// ---------------------------------------------------------------------------
// Equipment Suggestions — trigger-based recommendations
// ---------------------------------------------------------------------------
export const EQUIPMENT_SUGGESTIONS = [
  { name: 'Backpack Vacuum', monthly_depreciation: 25, trigger: 'sqft_gte_3000' },
  { name: 'Microfiber Mop System', monthly_depreciation: 15, trigger: 'sqft_gte_3000' },
  { name: 'Floor Buffer', monthly_depreciation: 50, trigger: 'floor_vct_tile' },
  { name: 'Auto Scrubber (walk-behind)', monthly_depreciation: 150, trigger: 'sqft_gte_10000' },
  { name: 'Auto Scrubber (ride-on)', monthly_depreciation: 350, trigger: 'sqft_gte_50000' },
  { name: 'Carpet Extractor', monthly_depreciation: 75, trigger: 'floor_carpet' },
  { name: 'Pressure Washer', monthly_depreciation: 40, trigger: 'building_industrial_restaurant' },
  { name: 'Biohazard Cleanup Kit', monthly_depreciation: 10, trigger: 'building_medical' },
] as const;

export type EquipmentSuggestionTrigger = typeof EQUIPMENT_SUGGESTIONS[number]['trigger'];

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

// ---------------------------------------------------------------------------
// Burden rate defaults — 10 itemized payroll burden categories
// ---------------------------------------------------------------------------
export const BURDEN_DEFAULTS = {
  FICA_SS: 6.2,
  FICA_MEDICARE: 1.45,
  FUTA: 0.42,
  SUTA: 2.7,
  WORKERS_COMP: 5.0,
  GL_INSURANCE: 2.5,
  HEALTH_BENEFITS: 0,
  PTO_ACCRUAL: 0,
  RETIREMENT: 0,
  OTHER_BURDEN: 0,
} as const;

export const BURDEN_LABELS: Record<keyof typeof BURDEN_DEFAULTS, string> = {
  FICA_SS: 'Social Security (FICA)',
  FICA_MEDICARE: 'Medicare (FICA)',
  FUTA: 'Federal Unemployment',
  SUTA: 'State Unemployment',
  WORKERS_COMP: 'Workers Comp',
  GL_INSURANCE: 'General Liability',
  HEALTH_BENEFITS: 'Health Benefits',
  PTO_ACCRUAL: 'PTO Accrual',
  RETIREMENT: 'Retirement (401k)',
  OTHER_BURDEN: 'Other Burden',
};

// ---------------------------------------------------------------------------
// Overhead categories — standard business overhead breakdown
// ---------------------------------------------------------------------------
export const OVERHEAD_CATEGORIES = [
  { code: 'RENT_FACILITY', label: 'Rent / Facility' },
  { code: 'UTILITIES', label: 'Utilities' },
  { code: 'VEHICLE_EXPENSE', label: 'Vehicle Expense' },
  { code: 'OFFICE_SUPPLIES', label: 'Office Supplies' },
  { code: 'SOFTWARE_TECH', label: 'Software / Tech' },
  { code: 'MARKETING', label: 'Marketing' },
  { code: 'MANAGEMENT_SALARY', label: 'Management Salary' },
  { code: 'INSURANCE_GENERAL', label: 'Insurance (General)' },
  { code: 'OTHER_OVERHEAD', label: 'Other Overhead' },
] as const;

export type OverheadCategoryCode = typeof OVERHEAD_CATEGORIES[number]['code'];

// ---------------------------------------------------------------------------
// Industry Benchmark Rates — $/sqft/month by building type
// ---------------------------------------------------------------------------
export const INDUSTRY_BENCHMARK_RATES: Record<string, { low: number; mid: number; high: number }> = {
  OFFICE:       { low: 0.04, mid: 0.07, high: 0.12 },
  MEDICAL:      { low: 0.08, mid: 0.14, high: 0.22 },
  INDUSTRIAL:   { low: 0.02, mid: 0.04, high: 0.07 },
  RETAIL:       { low: 0.03, mid: 0.06, high: 0.10 },
  EDUCATION:    { low: 0.04, mid: 0.07, high: 0.11 },
  GOVERNMENT:   { low: 0.05, mid: 0.08, high: 0.13 },
  HOSPITALITY:  { low: 0.06, mid: 0.10, high: 0.18 },
  RELIGIOUS:    { low: 0.03, mid: 0.05, high: 0.09 },
};
