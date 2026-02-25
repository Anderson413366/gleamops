'use client';

import { ShoppingCart, SquarePen, Store } from 'lucide-react';
import { Badge, Button } from '@gleamops/ui';
import { EntityAvatar } from '@/components/directory/entity-avatar';
import type { SupplyVendorProfile } from '@/lib/vendors/supply-vendor-profiles';

export interface SupplyVendorDirectoryRow {
  id: string;
  name: string;
  supplyCount: number;
  categories: string[];
  lastOrder: string | null;
  accountStatus: 'ACTIVE' | 'INACTIVE';
  profile: SupplyVendorProfile | null;
}

interface VendorsCardGridProps {
  rows: SupplyVendorDirectoryRow[];
  onSelect: (row: SupplyVendorDirectoryRow) => void;
  onPlaceOrder: (row: SupplyVendorDirectoryRow) => void;
  onEdit: (row: SupplyVendorDirectoryRow) => void;
}

function statusColor(status: 'ACTIVE' | 'INACTIVE'): 'green' | 'gray' {
  return status === 'ACTIVE' ? 'green' : 'gray';
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function VendorsCardGrid({ rows, onSelect, onPlaceOrder, onEdit }: VendorsCardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((row) => (
        <div
          key={row.id}
          onClick={() => onSelect(row)}
          className="cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-150 hover:border-module-accent/40 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <EntityAvatar
                name={row.name}
                seed={row.id}
                fallbackIcon={<Store className="h-4 w-4 text-white" />}
                size="md"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
                <p className="text-xs text-muted-foreground">{row.supplyCount} supplies</p>
              </div>
            </div>
            <Badge color={statusColor(row.accountStatus)}>
              {row.accountStatus === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Last Order:</span>{' '}
              {formatDate(row.lastOrder)}
            </p>
            <p className="line-clamp-2">
              <span className="font-medium text-foreground">Categories:</span>{' '}
              {row.categories.length ? row.categories.join(', ') : '—'}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-8"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onPlaceOrder(row);
              }}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Place Order
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onEdit(row);
              }}
            >
              <SquarePen className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
