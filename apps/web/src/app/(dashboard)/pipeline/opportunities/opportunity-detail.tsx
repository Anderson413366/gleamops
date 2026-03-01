'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Clock, FileText, Pencil } from 'lucide-react';
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
import { OPPORTUNITY_STAGE_COLORS, BID_STATUS_COLORS } from '@gleamops/shared';
import type { SalesOpportunity } from '@gleamops/shared';

interface OpportunityWithProspect extends SalesOpportunity {
  prospect?: { company_name: string; prospect_code: string } | null;
}

interface BidRow {
  id: string;
  bid_code: string;
  status: string;
  bid_monthly_price: number | null;
  total_sqft: number | null;
  created_at: string;
  client?: { name: string } | null;
}

function formatCurrency(n: number | null) {
  if (n == null) return '\u2014';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysBetween(dateStr: string) {
  const created = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

interface OpportunityDetailProps {
  opportunity: OpportunityWithProspect | null;
  open: boolean;
  onClose: () => void;
  onEdit: (opportunity: OpportunityWithProspect) => void;
}

export function OpportunityDetail({ opportunity, open, onClose, onEdit }: OpportunityDetailProps) {
  const [bids, setBids] = useState<BidRow[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);

  useEffect(() => {
    if (!opportunity || !open) return;
    setLoadingBids(true);
    const supabase = getSupabaseBrowserClient();

    supabase
      .from('sales_bids')
      .select('id, bid_code, status, bid_monthly_price, total_sqft, created_at, client:clients!sales_bids_client_id_fkey(name)')
      .eq('opportunity_id', opportunity.id)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setBids(data as unknown as BidRow[]);
        setLoadingBids(false);
      });
  }, [opportunity, open]);

  if (!opportunity) return null;

  const daysOpen = daysBetween(opportunity.created_at);
  const isWon = opportunity.stage_code === 'WON';
  const isLost = opportunity.stage_code === 'LOST';

  return (
    <SlideOver open={open} onClose={onClose} title={opportunity.name} subtitle={opportunity.opportunity_code} wide>
      <div className="space-y-4">
        {/* Status + Actions */}
        <div className="flex items-center justify-between">
          <Badge color={OPPORTUNITY_STAGE_COLORS[opportunity.stage_code] ?? 'gray'}>
            {opportunity.stage_code.replace(/_/g, ' ')}
          </Badge>
          <Button variant="secondary" size="sm" onClick={() => onEdit(opportunity)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Est. Monthly Value</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(opportunity.estimated_monthly_value)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Probability</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{'\u2014'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Days Open</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {isWon || isLost ? '\u2014' : daysOpen}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {opportunity.prospect && (
                <div>
                  <dt className="text-muted-foreground">Prospect</dt>
                  <dd className="font-medium">
                    {opportunity.prospect.company_name}
                    <span className="text-xs text-muted-foreground ml-1">({opportunity.prospect.prospect_code})</span>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Stage</dt>
                <dd className="font-medium">
                  <Badge color={OPPORTUNITY_STAGE_COLORS[opportunity.stage_code] ?? 'gray'}>
                    {opportunity.stage_code.replace(/_/g, ' ')}
                  </Badge>
                </dd>
              </div>
              {opportunity.expected_close_date && (
                <div>
                  <dt className="text-muted-foreground">Target Close Date</dt>
                  <dd className="font-medium">{formatDate(opportunity.expected_close_date)}</dd>
                </div>
              )}
              {opportunity.estimated_monthly_value != null && (
                <div>
                  <dt className="text-muted-foreground">Estimated Monthly Value</dt>
                  <dd className="font-medium">{formatCurrency(opportunity.estimated_monthly_value)}</dd>
                </div>
              )}
              {opportunity.estimated_monthly_value != null && (
                <div>
                  <dt className="text-muted-foreground">Estimated Annual Value</dt>
                  <dd className="font-medium">{formatCurrency(opportunity.estimated_monthly_value * 12)}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Related Bids */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Bids <Badge color="blue">{bids.length}</Badge>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingBids ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : bids.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bids linked to this opportunity yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {bids.map((bid) => (
                  <li key={bid.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{bid.bid_code}</p>
                        <p className="text-xs text-muted-foreground">
                          {bid.client?.name ?? '\u2014'}
                          {bid.total_sqft ? ` \u2022 ${bid.total_sqft.toLocaleString()} sq ft` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatCurrency(bid.bid_monthly_price)}</span>
                        <Badge color={BID_STATUS_COLORS[bid.status] ?? 'gray'}>{bid.status}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(bid.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Competitor Notes */}
        <Card>
          <CardHeader><CardTitle>Competitor Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              No competitor notes recorded.
            </p>
          </CardContent>
        </Card>

        {/* Metadata */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
          <p>Created: {new Date(opportunity.created_at).toLocaleDateString()}</p>
          <p>Updated: {new Date(opportunity.updated_at).toLocaleDateString()}</p>
        </div>
      </div>
    </SlideOver>
  );
}
