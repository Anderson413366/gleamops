'use client';

import Link from 'next/link';

type EntityType = 'client' | 'site' | 'job' | 'staff' | 'equipment' | 'subcontractor' | 'supply';

interface EntityLinkProps {
  entityType: EntityType;
  code?: string | null;
  name?: string | null;
  showCode?: boolean;
  className?: string;
  stopPropagation?: boolean;
}

const ROUTE_PREFIX: Record<EntityType, string> = {
  client: '/crm/clients',
  site: '/crm/sites',
  job: '/operations/jobs',
  staff: '/workforce/staff',
  equipment: '/assets/equipment',
  subcontractor: '/vendors/subcontractors',
  supply: '/inventory/supplies',
};

export function EntityLink({
  entityType,
  code,
  name,
  showCode = true,
  className,
  stopPropagation = false,
}: EntityLinkProps) {
  const normalizedCode = code?.trim() ?? '';
  const normalizedName = name?.trim() ?? '';
  const display = showCode && normalizedName && normalizedCode
    ? `${normalizedName} (${normalizedCode})`
    : (normalizedName || normalizedCode || 'Not Set');

  if (!normalizedCode) {
    return <span className="italic text-muted-foreground">{display}</span>;
  }

  const href = `${ROUTE_PREFIX[entityType]}/${encodeURIComponent(normalizedCode)}`;
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

