'use client';

import Link from 'next/link';

type EntityType =
  | 'client'
  | 'site'
  | 'job'
  | 'staff'
  | 'equipment'
  | 'vehicle'
  | 'subcontractor'
  | 'supply'
  | 'position'
  | 'prospect'
  | 'opportunity';

interface EntityLinkProps {
  entityType?: EntityType;
  type?: EntityType;
  code?: string | null;
  name?: string | null;
  showCode?: boolean;
  className?: string;
  stopPropagation?: boolean;
}

const ROUTE_PREFIX: Record<EntityType, string> = {
  client: '/clients',
  site: '/clients/sites',
  job: '/operations/jobs',
  staff: '/team/staff',
  equipment: '/assets/equipment',
  vehicle: '/equipment/vehicles',
  subcontractor: '/vendors/subcontractors',
  supply: '/inventory/supplies',
  position: '/team/positions',
  prospect: '/pipeline/prospects',
  opportunity: '/pipeline/opportunities',
};

export function EntityLink({
  entityType,
  type,
  code,
  name,
  showCode = true,
  className,
  stopPropagation = false,
}: EntityLinkProps) {
  const resolvedType = entityType ?? type;
  const normalizedCode = code?.trim() ?? '';
  const normalizedName = name?.trim() ?? '';
  const display = showCode && normalizedName && normalizedCode
    ? `${normalizedName} (${normalizedCode})`
    : (normalizedName || normalizedCode || 'Not Set');

  if (!normalizedCode) {
    return <span className="italic text-muted-foreground">{display}</span>;
  }

  if (!resolvedType) {
    return <span className="italic text-muted-foreground">{display}</span>;
  }

  const href = `${ROUTE_PREFIX[resolvedType]}/${encodeURIComponent(normalizedCode)}`;
  const baseClass = 'text-blue-600 hover:text-blue-800 hover:underline cursor-pointer';

  return (
    <Link
      href={href}
      className={className ? `${baseClass} ${className}` : baseClass}
      onClick={(event) => {
        if (stopPropagation) {
          event.stopPropagation();
        }
      }}
    >
      {display}
    </Link>
  );
}
