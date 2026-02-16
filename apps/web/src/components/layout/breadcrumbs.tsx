'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

const SEGMENT_LABELS: Record<string, string> = {
  home: 'Home',
  crm: 'CRM',
  clients: 'Clients',
  sites: 'Sites',
  contacts: 'Contacts',
  pipeline: 'Pipeline',
  bids: 'Bids',
  prospects: 'Prospects',
  opportunities: 'Opportunities',
  operations: 'Operations',
  schedule: 'Schedule',
  workforce: 'Workforce',
  staff: 'Staff',
  people: 'People',
  inventory: 'Inventory',
  supplies: 'Supplies',
  equipment: 'Equipment',
  assets: 'Assets',
  reports: 'Reports',
  settings: 'Settings',
  admin: 'Admin',
  team: 'Team',
  vendors: 'Vendors',
  subcontractors: 'Subcontractors',
  services: 'Services',
  mapping: 'Mapping',
  jobs: 'Service Plans',
  payroll: 'Payroll',
  positions: 'Positions',
  safety: 'Safety & Compliance',
  customers: 'Customers',
};

function humanize(segment: string): string {
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

  if (!pathname || pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);
  const normalized = segments[0] === 'home' ? segments.slice(1) : segments;
  if (segments.length === 0) return null;

  const crumbs = [
    { label: 'Home', href: '/' },
    ...normalized.map((seg, i) => ({
      label: humanize(seg),
      href: '/' + normalized.slice(0, i + 1).join('/'),
    })),
  ];

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
              <span className="text-foreground font-medium truncate max-w-[160px]">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[160px]"
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
