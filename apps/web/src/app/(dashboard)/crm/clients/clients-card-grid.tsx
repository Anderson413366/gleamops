'use client';

import type { Client } from '@gleamops/shared';
import { EntityCard, getEntityInitials } from '@/components/directory/entity-card';

interface ClientsCardGridProps {
  rows: Client[];
  onSelect: (item: Client) => void;
  metaByClientId?: Record<string, ClientCardMeta>;
}

export interface ClientCardMeta {
  activeSites: number;
  monthlyRevenue: number;
  location: string | null;
  primaryContactName: string | null;
  activeJobs?: number;
  profilePercent?: number;
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

export function ClientsCardGrid({ rows, onSelect, metaByClientId }: ClientsCardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {rows.map((item) => (
        <EntityCard
          key={item.id}
          onClick={() => onSelect(item)}
          initials={getEntityInitials(item.name)}
          initialsSeed={item.client_code}
          name={item.name}
          subtitle={item.client_type ?? item.industry ?? 'Not Set'}
          statusLabel={statusVisual(item.status).label}
          statusTone={statusVisual(item.status).tone}
          metricsLine={`${metaByClientId?.[item.id]?.activeSites ?? 0} site${(metaByClientId?.[item.id]?.activeSites ?? 0) === 1 ? '' : 's'} · ${formatCurrencyPerMonth(metaByClientId?.[item.id]?.monthlyRevenue ?? 0)}`}
          code={item.client_code}
        />
      ))}
    </div>
  );
}
