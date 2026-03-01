'use client';
import type { Staff } from '@gleamops/shared';
import { EntityCard, getEntityInitials } from '@/components/directory/entity-card';

interface StaffCardGridProps {
  rows: Staff[];
  onSelect: (item: Staff) => void;
  activeJobsByStaff?: Record<string, number>;
}

function statusVisual(status: string | null | undefined): { tone: 'green' | 'gray' | 'yellow' | 'red' | 'blue'; label: string } {
  const normalized = (status ?? '').toUpperCase();
  if (normalized === 'ACTIVE') return { tone: 'green', label: 'Active' };
  if (normalized === 'ON_LEAVE') return { tone: 'yellow', label: 'On Leave' };
  if (normalized === 'TERMINATED') return { tone: 'red', label: 'Terminated' };
  if (normalized === 'INACTIVE') return { tone: 'gray', label: 'Inactive' };
  return { tone: 'gray', label: normalized || 'Unknown' };
}

export function StaffCardGrid({ rows, onSelect, activeJobsByStaff }: StaffCardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {rows.map((item) => (
        <EntityCard
          key={item.id}
          onClick={() => onSelect(item)}
          initials={getEntityInitials(item.full_name)}
          initialsSeed={item.staff_code}
          name={item.full_name}
          subtitle={item.role.replace(/_/g, ' ')}
          secondaryLine={item.employment_type ?? 'Not Set'}
          statusLabel={statusVisual(item.staff_status).label}
          statusTone={statusVisual(item.staff_status).tone}
          metricsLine={`${activeJobsByStaff?.[item.id] ?? 0} active job${(activeJobsByStaff?.[item.id] ?? 0) === 1 ? '' : 's'}`}
          code={item.staff_code}
          imageUrl={item.photo_thumbnail_url || item.photo_url}
        />
      ))}
    </div>
  );
}
