export interface NavV2Item {
  id: string;
  label: string;
  href: string;
  icon: string;
  group: 'core' | 'execution' | 'customers' | 'resources' | 'insights' | 'platform';
}

export const NAVIGATION_V2: NavV2Item[] = [
  { id: 'command', label: 'Command Center', href: '/command', icon: 'LayoutDashboard', group: 'core' },
  { id: 'schedule', label: 'Employee Schedule', href: '/schedule', icon: 'Calendar', group: 'execution' },
  { id: 'planning', label: 'Evening Planning', href: '/planning', icon: 'MoonStar', group: 'execution' },
  { id: 'work', label: 'Work Execution', href: '/work', icon: 'ClipboardList', group: 'execution' },
  { id: 'customers', label: 'Customers And Sites', href: '/customers', icon: 'Building2', group: 'customers' },
  { id: 'sales', label: 'Sales', href: '/sales', icon: 'TrendingUp', group: 'customers' },
  { id: 'people', label: 'People', href: '/people', icon: 'Users', group: 'resources' },
  { id: 'supplies', label: 'Supplies And Assets', href: '/supplies', icon: 'Package', group: 'resources' },
  { id: 'insights', label: 'Insights', href: '/insights', icon: 'BarChart3', group: 'insights' },
  { id: 'platform', label: 'Platform', href: '/platform', icon: 'Settings', group: 'platform' },
];
