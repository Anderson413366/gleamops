'use client';

import { useEffect, useState } from 'react';
import { FileText, Building2, Clock, DollarSign, FileCheck } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SlideOver,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@gleamops/ui';
import { BID_STATUS_COLORS } from '@gleamops/shared';
import type { SalesBid, SalesBidWorkloadResult, SalesBidPricingResult } from '@gleamops/shared';

interface BidWithClient extends SalesBid {
  client?: { name: string; client_code: string } | null;
  service?: { name: string } | null;
}

interface BidDetailProps {
  bid: BidWithClient | null;
  open: boolean;
  onClose: () => void;
  onGenerateProposal?: (bidId: string, bidVersionId: string) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

export function BidDetail({ bid, open, onClose, onGenerateProposal }: BidDetailProps) {
  const [workload, setWorkload] = useState<SalesBidWorkloadResult | null>(null);
  const [pricing, setPricing] = useState<(SalesBidPricingResult & { explanation?: Record<string, unknown> }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [latestVersionId, setLatestVersionId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!bid || !open) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    // Get latest version and its results
    supabase
      .from('sales_bid_versions')
      .select('id')
      .eq('bid_id', bid.id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()
      .then(async ({ data: version }) => {
        if (!version) { setLoading(false); return; }
        setLatestVersionId(version.id);

        const [wRes, pRes] = await Promise.all([
          supabase
            .from('sales_bid_workload_results')
            .select('*')
            .eq('bid_version_id', version.id)
            .single(),
          supabase
            .from('sales_bid_pricing_results')
            .select('*')
            .eq('bid_version_id', version.id)
            .single(),
        ]);

        if (wRes.data) setWorkload(wRes.data as unknown as SalesBidWorkloadResult);
        if (pRes.data) setPricing(pRes.data as unknown as SalesBidPricingResult & { explanation?: Record<string, unknown> });
        setLoading(false);
      });
  }, [bid, open]);

  if (!bid) return null;

  return (
    <SlideOver open={open} onClose={onClose} title={bid.bid_code} subtitle={bid.client?.name} wide>
      <div className="space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between">
          <Badge color={BID_STATUS_COLORS[bid.status] ?? 'gray'}>{bid.status}</Badge>
          <div className="flex gap-2">
            {bid.status === 'DRAFT' && (
              <Button variant="secondary" size="sm">Mark Ready for Review</Button>
            )}
            {pricing && latestVersionId && onGenerateProposal && (
              <Button size="sm" disabled={generating} onClick={async () => {
                setGenerating(true);
                onGenerateProposal(bid.id, latestVersionId);
                setGenerating(false);
              }}>
                <FileCheck className="h-3 w-3" />
                Generate Proposal
              </Button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Client</p>
              </div>
              <p className="text-sm font-medium">{bid.client?.name ?? '—'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Service</p>
              </div>
              <p className="text-sm font-medium">{bid.service?.name ?? '—'}</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            {/* Workload */}
            {workload && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    <span className="inline-flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Workload
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Monthly Hours</p>
                      <p className="text-xl font-bold">{workload.monthly_hours.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cleaners</p>
                      <p className="text-xl font-bold">{workload.cleaners_needed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Lead</p>
                      <p className="text-xl font-bold">{workload.lead_needed ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Min/Visit</p>
                      <p className="font-medium">{workload.total_minutes_per_visit.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Weekly Min</p>
                      <p className="font-medium">{workload.weekly_minutes.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Hrs/Visit</p>
                      <p className="font-medium">{workload.hours_per_visit.toFixed(1)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing */}
            {pricing && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    <span className="inline-flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      Pricing
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Burdened Labor</span>
                    <span className="font-medium">{fmt(pricing.burdened_labor_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Supplies</span>
                    <span className="font-medium">{fmt(pricing.supplies_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Equipment</span>
                    <span className="font-medium">{fmt(pricing.equipment_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Overhead</span>
                    <span className="font-medium">{fmt(pricing.overhead_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
                    <span className="font-medium">Total Cost</span>
                    <span className="font-bold">{fmt(pricing.total_monthly_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border pt-2">
                    <span className="font-medium text-primary">Monthly Price</span>
                    <span className="font-bold text-xl text-primary">{fmt(pricing.recommended_price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Margin</span>
                    <Badge color={pricing.effective_margin_pct >= 20 ? 'green' : pricing.effective_margin_pct >= 10 ? 'yellow' : 'red'}>
                      {fmtPct(pricing.effective_margin_pct)}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Method</span>
                    <span className="font-medium">{pricing.pricing_method}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bid Price Override */}
            <Card>
              <CardHeader><CardTitle>Bid Price</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Sq Ft</p>
                    <p className="text-lg font-bold">{bid.total_sqft?.toLocaleString() ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Price</p>
                    <p className="text-lg font-bold">{bid.bid_monthly_price ? fmt(bid.bid_monthly_price) : '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Metadata */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
          <p>Created: {new Date(bid.created_at).toLocaleDateString()}</p>
          <p>Updated: {new Date(bid.updated_at).toLocaleDateString()}</p>
        </div>
      </div>
    </SlideOver>
  );
}
