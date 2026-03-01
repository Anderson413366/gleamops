'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/** Maps "moduleSegment:tabKey" → sidebar label for breadcrumb display */
const TAB_LABELS: Record<string, string> = {
  // Schedule
  'schedule:recurring': 'Employee Schedule',
  'schedule:work-orders': 'Work Schedule',
  'schedule:calendar': 'Calendar',
  'schedule:planning': 'Planning Board',
  'schedule:master': 'Master Board',
  'schedule:floater': 'My Route',
  'schedule:supervisor': 'Supervisor',
  'schedule:forms': 'Forms',
  'schedule:checklists': 'Checklists',
  'schedule:leave': 'Leave',
  'schedule:availability': 'Availability',
  'schedule:my-schedule': 'My Schedule',
  // Jobs
  'jobs:service-plans': 'Service Plans',
  'jobs:tickets': 'Job Log',
  'jobs:inspections': 'Inspections',
  'jobs:time': 'Time',
  'jobs:routes': 'Routes',
  'jobs:checklists': 'Checklists',
  'jobs:forms': 'Forms',
  // Clients
  'clients:clients': 'Clients',
  'clients:sites': 'Sites',
  'clients:contacts': 'Contacts',
  'clients:requests': 'Requests',
  'clients:partners': 'Partners',
  // Pipeline
  'pipeline:prospects': 'Prospects',
  'pipeline:opportunities': 'Opportunities',
  'pipeline:bids': 'Bids & Pricing',
  'pipeline:proposals': 'Proposals',
  'pipeline:analytics': 'Analytics',
  // Catalog
  'catalog:tasks': 'Tasks',
  'catalog:services': 'Services',
  'catalog:mapping': 'Mapping',
  'catalog:scope-library': 'Scope Library',
  // Team
  'team:staff': 'Staff',
  'team:positions': 'Positions',
  'team:attendance': 'Attendance',
  'team:timesheets': 'Timesheets',
  'team:payroll': 'Payroll',
  'team:hr': 'HR',
  'team:microfiber': 'Microfiber',
  'team:subcontractors': 'Subcontractors',
  'team:break-rules': 'Break Rules',
  'team:shift-tags': 'Shift Tags',
  'team:messages': 'Messages',
  // Inventory
  'inventory:supplies': 'Supplies',
  'inventory:kits': 'Kits',
  'inventory:site-assignments': 'Site Assignments',
  'inventory:counts': 'Counts',
  'inventory:orders': 'Orders',
  'inventory:forecasting': 'Forecasting',
  'inventory:warehouse': 'Warehouse',
  'inventory:vendors': 'Vendors',
  // Equipment
  'equipment:equipment': 'Equipment',
  'equipment:assignments': 'Assignments',
  'equipment:keys': 'Keys',
  'equipment:vehicles': 'Vehicles',
  'equipment:maintenance': 'Maintenance',
  // Safety
  'safety:certifications': 'Certifications',
  'safety:training': 'Training',
  'safety:incidents': 'Incidents',
  'safety:calendar': 'Calendar',
};

const SEGMENT_LABELS: Record<string, string> = {
  home: 'Home',
  crm: 'Clients',
  clients: 'Clients',
  sites: 'Sites',
  contacts: 'Contacts',
  pipeline: 'Pipeline',
  bids: 'Bids',
  prospects: 'Prospects',
  opportunities: 'Opportunities',
  operations: 'Jobs',
  schedule: 'Schedule',
  workforce: 'Team',
  staff: 'Staff',
  people: 'People',
  inventory: 'Inventory',
  supplies: 'Supplies',
  equipment: 'Equipment',
  assets: 'Equipment',
  reports: 'Reports',
  money: 'Financial',
  financial: 'Financial',
  settings: 'Settings',
  admin: 'Settings',
  team: 'Team',
  vendors: 'Partners',
  subcontractors: 'Subcontractors',
  services: 'Services',
  mapping: 'Mapping',
  jobs: 'Jobs',
  payroll: 'Payroll',
  positions: 'Positions',
  safety: 'Safety',
  customers: 'Clients',
  'shifts-time': 'Shifts & Time',
};

// Context-aware overrides for segments that differ based on parent path
const PATH_OVERRIDES: Record<string, Record<string, string>> = {
  'pipeline/admin': { admin: 'Sales Admin' },
};

function humanize(segment: string, parentPath?: string): string {
  if (parentPath) {
    const override = PATH_OVERRIDES[parentPath]?.[segment];
    if (override) return override;
  }
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  // If it looks like a code (e.g. CLI-1001, BID-0042), show it uppercase
  if (/^[A-Z]{2,4}-\d+$/i.test(segment)) return segment.toUpperCase();
  // Fallback: capitalize first letter of each word, replace hyphens with spaces
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!pathname || pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);
  const normalized = segments[0] === 'home' ? segments.slice(1) : segments;
  if (segments.length === 0) return null;

  const rawCrumbs = [
    { label: 'Home', href: '/' },
    ...normalized.map((seg, i) => ({
      label: humanize(seg, i > 0 ? normalized.slice(0, i).join('/') : undefined),
      href: '/' + normalized.slice(0, i + 1).join('/'),
    })),
  ];

  // Deduplicate consecutive crumbs with the same label (e.g. "Jobs > Jobs")
  const crumbs = rawCrumbs.filter(
    (crumb, i) => i === 0 || crumb.label !== rawCrumbs[i - 1].label,
  );

  // Append active tab as a non-linked final crumb (e.g. Home > Schedule > Employee Schedule)
  const tabParam = searchParams.get('tab');
  if (tabParam && normalized.length > 0) {
    const moduleSegment = normalized[normalized.length - 1];
    const tabLabel = TAB_LABELS[`${moduleSegment}:${tabParam}`];
    if (tabLabel && tabLabel !== crumbs[crumbs.length - 1]?.label) {
      crumbs.push({ label: tabLabel, href: '' });
    }
  }

  // Truncate middle crumbs if path is very deep (more than 5 crumbs)
  const MAX_CRUMBS = 5;
  let displayCrumbs = crumbs;
  if (crumbs.length > MAX_CRUMBS) {
    displayCrumbs = [
      crumbs[0],
      { label: '...', href: '' },
      ...crumbs.slice(crumbs.length - (MAX_CRUMBS - 2)),
    ];
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="inline-flex min-w-0 items-center gap-1 rounded-xl border border-border/60 bg-background/80 px-2 py-1 text-sm shadow-sm"
    >
      {displayCrumbs.map((crumb, i) => {
        const isLast = i === displayCrumbs.length - 1;
        return (
          <span key={crumb.href || i} className="flex items-center gap-1 min-w-0">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            {isLast || !crumb.href ? (
              <span className="text-foreground font-medium truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px]">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px]"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
