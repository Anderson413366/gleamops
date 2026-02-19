export interface NavV2Child {
  key: string;
  label: string;
}

export interface NavV2Item {
  id: string;
  label: string;
  href: string;
  icon: string;
  group: 'core' | 'execution' | 'customers' | 'resources' | 'insights' | 'platform';
  children?: NavV2Child[];
}

export const NAVIGATION_V2: NavV2Item[] = [
  {
    id: 'command', label: 'Command Center', href: '/command', icon: 'LayoutDashboard', group: 'core',
    children: [
      { key: 'my-queue', label: 'My Queue' },
      { key: 'team-queue', label: 'Team Queue' },
      { key: 'escalations', label: 'Escalations' },
      { key: 'done-today', label: 'Done Today' },
    ],
  },
  {
    id: 'schedule', label: 'Employee Schedule', href: '/schedule', icon: 'Calendar', group: 'execution',
    children: [
      { key: 'by-employee', label: 'By Employee' },
      { key: 'by-site', label: 'By Site' },
      { key: 'availability', label: 'Availability' },
      { key: 'trades', label: 'Trades' },
      { key: 'publish-lock', label: 'Publish And Lock' },
    ],
  },
  {
    id: 'planning', label: 'Evening Planning', href: '/planning', icon: 'MoonStar', group: 'execution',
    children: [
      { key: 'tonight-board', label: 'Tonight Board' },
      { key: 'conflict-lane', label: 'Conflict Lane' },
      { key: 'handoff-notes', label: 'Handoff Notes' },
      { key: 'publish-handoff', label: 'Publish Handoff' },
    ],
  },
  {
    id: 'work', label: 'Work Execution', href: '/work', icon: 'ClipboardList', group: 'execution',
    children: [
      { key: 'tickets', label: 'Tickets' },
      { key: 'jobs', label: 'Service Plans' },
      { key: 'inspections', label: 'Inspections' },
      { key: 'routes', label: 'Routes' },
      { key: 'messages', label: 'Messages' },
    ],
  },
  {
    id: 'customers', label: 'Customers And Sites', href: '/customers', icon: 'Building2', group: 'customers',
    children: [
      { key: 'clients', label: 'Clients' },
      { key: 'sites', label: 'Sites' },
      { key: 'contacts', label: 'Contacts' },
      { key: 'service-context', label: 'Service Context' },
    ],
  },
  {
    id: 'sales', label: 'Sales', href: '/sales', icon: 'TrendingUp', group: 'customers',
    children: [
      { key: 'prospects', label: 'Prospects' },
      { key: 'opportunities', label: 'Opportunities' },
      { key: 'bids', label: 'Bids' },
      { key: 'proposals', label: 'Proposals' },
    ],
  },
  {
    id: 'people', label: 'People', href: '/people', icon: 'Users', group: 'resources',
    children: [
      { key: 'staff', label: 'Staff' },
      { key: 'availability', label: 'Availability' },
      { key: 'time', label: 'Time' },
      { key: 'exceptions', label: 'Exceptions' },
      { key: 'timesheets', label: 'Timesheets' },
    ],
  },
  {
    id: 'supplies', label: 'Supplies And Assets', href: '/supplies', icon: 'Package', group: 'resources',
    children: [
      { key: 'supplies', label: 'Supplies' },
      { key: 'orders', label: 'Orders' },
      { key: 'kits', label: 'Kits' },
      { key: 'assets', label: 'Assets' },
      { key: 'vendors', label: 'Vendors' },
    ],
  },
  {
    id: 'safety', label: 'Safety', href: '/safety', icon: 'ShieldCheck', group: 'resources',
    children: [
      { key: 'certifications', label: 'Certifications' },
      { key: 'courses', label: 'Training Courses' },
      { key: 'completions', label: 'Completions' },
      { key: 'documents', label: 'Safety Docs' },
      { key: 'incidents', label: 'Incidents' },
    ],
  },
  {
    id: 'insights', label: 'Insights', href: '/insights', icon: 'BarChart3', group: 'insights',
    children: [
      { key: 'ops', label: 'Operations' },
      { key: 'financial', label: 'Financial' },
      { key: 'workforce', label: 'Workforce' },
      { key: 'quality', label: 'Quality' },
      { key: 'inventory', label: 'Inventory' },
    ],
  },
  {
    id: 'platform', label: 'Platform', href: '/platform', icon: 'Settings', group: 'platform',
    children: [
      { key: 'rules', label: 'Rules' },
      { key: 'lookups', label: 'Lookups' },
      { key: 'integrations', label: 'Integrations' },
      { key: 'data-controls', label: 'Data Controls' },
      { key: 'tenant-settings', label: 'Tenant Settings' },
    ],
  },
];
