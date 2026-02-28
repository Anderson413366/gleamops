'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, AlertTriangle, Package2, Printer } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Button, Skeleton } from '@gleamops/ui';

interface CountWithRelations {
  id: string;
  count_code: string;
  count_date: string;
  status: string;
  notes: string | null;
  counted_by_name: string | null;
  created_at: string;
  updated_at: string;
  site?: { name: string; site_code: string } | null;
  counter?: { full_name: string; staff_code: string | null } | null;
}

interface CountDetailRow {
  id: string;
  supply_id: string;
  expected_qty: number | null;
  actual_qty: number | null;
  variance: number | null;
  notes: string | null;
  photo_urls: string[] | null;
}

interface SupplyLookup {
  id: string;
  code: string;
  name: string;
  category: string | null;
  unit: string;
  unit_cost: number | null;
  image_url: string | null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

export default function InventoryCountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [count, setCount] = useState<CountWithRelations | null>(null);
  const [details, setDetails] = useState<CountDetailRow[]>([]);
  const [supplyById, setSupplyById] = useState<Record<string, SupplyLookup>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data: countRow } = await supabase
        .from('inventory_counts')
        .select('*, site:site_id(name, site_code), counter:counted_by(full_name, staff_code)')
        .eq('count_code', id)
        .is('archived_at', null)
        .maybeSingle();

      if (!countRow || cancelled) {
        setCount(null);
        setDetails([]);
        setSupplyById({});
        setLoading(false);
        return;
      }

      const typedCount = countRow as unknown as CountWithRelations;
      setCount(typedCount);

      const { data: detailRows } = await supabase
        .from('inventory_count_details')
        .select('id, supply_id, expected_qty, actual_qty, variance, notes, photo_urls')
        .eq('count_id', typedCount.id)
        .is('archived_at', null)
        .order('created_at');

      const typedDetails = (detailRows as unknown as CountDetailRow[]) ?? [];
      setDetails(typedDetails);

      const supplyIds = Array.from(new Set(typedDetails.map((row) => row.supply_id).filter(Boolean)));
      if (supplyIds.length > 0) {
        const { data: supplyRows } = await supabase
          .from('supply_catalog')
          .select('id, code, name, category, unit, unit_cost, image_url')
          .in('id', supplyIds);

        const lookup: Record<string, SupplyLookup> = {};
        for (const supply of ((supplyRows ?? []) as unknown as SupplyLookup[])) {
          lookup[supply.id] = supply;
        }
        setSupplyById(lookup);
      } else {
        setSupplyById({});
      }

      if (!cancelled) setLoading(false);
    }
    void fetchData();
    return () => { cancelled = true; };
  }, [id]);

  const summary = useMemo(() => {
    const itemsCount = details.length;
    const totalValue = details.reduce((sum, row) => {
      const unitCost = supplyById[row.supply_id]?.unit_cost ?? 0;
      const qty = Number(row.actual_qty ?? 0);
      return sum + (qty * Number(unitCost));
    }, 0);
    return { itemsCount, totalValue };
  }, [details, supplyById]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (!count) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Inventory count not found.</p>
        <Link
          href="/inventory?tab=counts"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Inventory Counts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/inventory?tab=counts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Inventory
      </Link>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inventory Count</h1>
            <p className="mt-1 text-sm text-muted-foreground font-mono">{count.count_code}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Site: {count.site?.name ?? 'Not Set'} {count.site?.site_code ? `(${count.site.site_code})` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Badge color={
              count.status === 'COMPLETED' ? 'green'
                : count.status === 'SUBMITTED' ? 'blue'
                  : count.status === 'IN_PROGRESS' ? 'yellow'
                    : count.status === 'CANCELLED' ? 'red'
                      : 'gray'
            }>
              {count.status}
            </Badge>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Count Date</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{formatDate(count.count_date)}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Counted By</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{count.counted_by_name || count.counter?.full_name || 'Not Set'}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Items Counted</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{summary.itemsCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Total Estimated Value</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(summary.totalValue)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          <span className="inline-flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            Count Line Items
          </span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Img</th>
                <th className="py-2 pr-3 font-medium">Supply</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Unit</th>
                <th className="py-2 pr-3 font-medium">Qty Counted</th>
                <th className="py-2 pr-3 font-medium">Estimated Value</th>
                <th className="py-2 font-medium">Notes</th>
                <th className="py-2 font-medium">Photo Proof</th>
              </tr>
            </thead>
            <tbody>
              {details.map((row) => {
                const supply = supplyById[row.supply_id];
                const qty = Number(row.actual_qty ?? 0);
                const estValue = qty * Number(supply?.unit_cost ?? 0);
                const photoUrls = Array.isArray(row.photo_urls) ? row.photo_urls : [];
                return (
                  <tr key={row.id} className="border-b border-border/50">
                    <td className="py-2 pr-3">
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30">
                        {supply?.image_url ? (
                          <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${supply.image_url})` }} />
                        ) : (
                          <Package2 className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-3 font-medium">
                      {supply?.code ? (
                        <Link
                          href={`/inventory/supplies/${supply.code}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {supply.name}
                        </Link>
                      ) : (
                        supply?.name ?? 'Not Set'
                      )}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{supply?.category ?? 'Not Set'}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{supply?.unit ?? 'Not Set'}</td>
                    <td className="py-2 pr-3 tabular-nums">{qty}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatCurrency(estValue)}</td>
                    <td className="py-2 text-muted-foreground">{row.notes ?? 'Not Set'}</td>
                    <td className="py-2 text-muted-foreground">
                      {photoUrls.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {photoUrls.map((photoUrl, index) => (
                            <Link
                              key={`${photoUrl}-${index}`}
                              href={photoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                              Photo {index + 1}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        'Not Set'
                      )}
                    </td>
                  </tr>
                );
              })}
              {details.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                    No line items found for this count.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Created: {formatDate(count.created_at)}</p>
        <p>Updated: {formatDate(count.updated_at)}</p>
        {count.notes && <p className="pt-1">Notes: {count.notes}</p>}
      </div>
    </div>
  );
}
