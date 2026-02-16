'use client';

import type { Client } from '@gleamops/shared';
import { UserRound } from 'lucide-react';

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
}

function getClientInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const INITIALS_BG_CLASSES = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200',
  'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200',
  'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-200',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200',
];

function statusVisual(status: string | null | undefined): { stripe: string; dot: string; label: string } {
  const normalized = (status ?? '').toUpperCase();
  if (normalized === 'ACTIVE') return { stripe: 'border-t-green-500', dot: 'bg-green-500', label: 'Active' };
  if (normalized === 'ON_HOLD') return { stripe: 'border-t-yellow-500', dot: 'bg-yellow-500', label: 'On Hold' };
  if (normalized === 'CANCELED' || normalized === 'CANCELLED') return { stripe: 'border-t-red-500', dot: 'bg-red-500', label: 'Canceled' };
  if (normalized === 'INACTIVE') return { stripe: 'border-t-slate-400', dot: 'bg-slate-400', label: 'Inactive' };
  if (normalized === 'PROSPECT') return { stripe: 'border-t-blue-500', dot: 'bg-blue-500', label: 'Prospect' };
  return { stripe: 'border-t-slate-300', dot: 'bg-slate-300', label: normalized || 'Unknown' };
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rows.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          type="button"
          className={`group relative flex w-full cursor-pointer flex-col rounded-2xl border border-border border-t-4 bg-card p-4 text-left shadow-sm transition-all duration-150 hover:border-module-accent/40 hover:shadow-md ${statusVisual(item.status).stripe}`}
        >
          <span className="absolute right-3 top-3 inline-flex items-center gap-1">
            <span className={`h-2.5 w-2.5 rounded-full ${statusVisual(item.status).dot}`} aria-hidden />
            <span className="sr-only">{statusVisual(item.status).label}</span>
          </span>

          <div className="flex items-start gap-3 pr-6">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${INITIALS_BG_CLASSES[item.name.length % INITIALS_BG_CLASSES.length]}`}>
              {getClientInitials(item.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">{item.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.client_code}</p>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <p className="text-xs text-muted-foreground">
              {metaByClientId?.[item.id]?.location ??
                ([item.billing_address?.city, item.billing_address?.state].filter(Boolean).join(', ') || 'Location not set')}
            </p>
            <p className="text-base font-semibold tabular-nums text-foreground">
              {formatCurrencyPerMonth(metaByClientId?.[item.id]?.monthlyRevenue ?? 0)}
            </p>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserRound className="h-3.5 w-3.5" />
            <span className="truncate">
              {metaByClientId?.[item.id]?.primaryContactName ?? 'Primary contact not set'}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-1 text-[11px] font-medium text-foreground">
              {metaByClientId?.[item.id]?.activeSites ?? 0} Sites
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-1 text-[11px] font-medium text-foreground tabular-nums">
              {formatCurrencyPerMonth(metaByClientId?.[item.id]?.monthlyRevenue ?? 0)}
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-1 text-[11px] font-medium text-foreground">
              Since {item.client_since ? new Date(item.client_since).getFullYear() : new Date(item.created_at).getFullYear()}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.client_type && (
              <span className="inline-flex items-center rounded-full bg-module-accent/12 px-2.5 py-1 text-[11px] font-medium text-module-accent">
                {item.client_type}
              </span>
            )}
            {item.industry && (
              <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
                {item.industry}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
