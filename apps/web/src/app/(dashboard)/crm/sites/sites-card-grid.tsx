'use client';
import type { Site } from '@gleamops/shared';
import { EntityCard, getEntityInitials } from '@/components/directory/entity-card';

interface SiteWithClient extends Site {
  client?: { name: string; client_code: string } | null;
}

interface SitesCardGridProps {
  rows: SiteWithClient[];
  onSelect: (item: SiteWithClient) => void;
  metaBySiteId?: Record<string, SiteCardMeta>;
}

export interface SiteCardMeta {
  activeJobs: number;
  monthlyRevenue: number;
  clientName: string | null;
}

function statusVisual(status: string | null | undefined): { tone: 'green' | 'gray' | 'yellow' | 'red' | 'blue'; label: string } {
  const normalized = (status ?? '').toUpperCase();
  if (normalized === 'ACTIVE') return { tone: 'green', label: 'Active' };
  if (normalized === 'ON_HOLD') return { tone: 'yellow', label: 'On Hold' };
  if (normalized === 'CANCELED' || normalized === 'CANCELLED') return { tone: 'red', label: 'Cancelled' };
  if (normalized === 'INACTIVE') return { tone: 'gray', label: 'Inactive' };
  if (normalized === 'PROSPECT') return { tone: 'blue', label: 'Prospect' };
  return { tone: 'gray', label: normalized || 'Unknown' };
}

function formatCurrencyPerMonth(n: number): string {
  return `${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)}/mo`;
}

export function SitesCardGrid({ rows, onSelect, metaBySiteId }: SitesCardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {rows.map((item) => (
        <EntityCard
          key={item.id}
          onClick={() => onSelect(item)}
          initials={getEntityInitials(item.name)}
          initialsSeed={item.site_code}
          name={item.name}
          subtitle={metaBySiteId?.[item.id]?.clientName ?? item.client?.name ?? 'Client not set'}
          statusLabel={statusVisual(item.status).label}
          statusTone={statusVisual(item.status).tone}
          metricsLine={`${metaBySiteId?.[item.id]?.activeJobs ?? 0} active job${(metaBySiteId?.[item.id]?.activeJobs ?? 0) === 1 ? '' : 's'} · ${formatCurrencyPerMonth(metaBySiteId?.[item.id]?.monthlyRevenue ?? 0)}`}
          code={item.site_code}
          imageUrl={item.photo_url}
        />
      ))}
    </div>
  );
}
