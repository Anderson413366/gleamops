'use client';

import { useEffect, useState } from 'react';
import { FileCheck, Send, Mail, Eye, DollarSign, AlertCircle, Trophy, Zap } from 'lucide-react';
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
import { PROPOSAL_STATUS_COLORS } from '@gleamops/shared';
import type { SalesProposal, SalesProposalPricingOption, SalesProposalSend } from '@gleamops/shared';

interface ProposalWithRelations extends SalesProposal {
  bid_version?: {
    bid?: {
      bid_code: string;
      client?: { name: string } | null;
      service?: { name: string } | null;
      total_sqft?: number | null;
      bid_monthly_price?: number | null;
    } | null;
  } | null;
}

interface ProposalDetailProps {
  proposal: ProposalWithRelations | null;
  open: boolean;
  onClose: () => void;
  onSend?: (proposal: ProposalWithRelations) => void;
  onMarkWon?: (proposal: ProposalWithRelations) => void;
  onConvert?: (proposal: ProposalWithRelations) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export function ProposalDetail({ proposal, open, onClose, onSend, onMarkWon, onConvert }: ProposalDetailProps) {
  const [options, setOptions] = useState<SalesProposalPricingOption[]>([]);
  const [sends, setSends] = useState<SalesProposalSend[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!proposal || !open) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    Promise.all([
      supabase
        .from('sales_proposal_pricing_options')
        .select('*')
        .eq('proposal_id', proposal.id)
        .order('sort_order'),
      supabase
        .from('sales_proposal_sends')
        .select('*')
        .eq('proposal_id', proposal.id)
        .order('created_at', { ascending: false }),
    ]).then(([optRes, sendRes]) => {
      if (optRes.data) setOptions(optRes.data as unknown as SalesProposalPricingOption[]);
      if (sendRes.data) setSends(sendRes.data as unknown as SalesProposalSend[]);
      setLoading(false);
    });
  }, [proposal, open]);

  if (!proposal) return null;

  const bid = proposal.bid_version?.bid;
  const canSend = proposal.status === 'GENERATED' || proposal.status === 'DRAFT';
  const canMarkWon = proposal.status === 'SENT' || proposal.status === 'DELIVERED' || proposal.status === 'OPENED';
  const canConvert = proposal.status === 'WON';

  return (
    <SlideOver open={open} onClose={onClose} title={proposal.proposal_code} subtitle={bid?.client?.name} wide>
      <div className="space-y-6">
        {/* Status + Actions */}
        <div className="flex items-center justify-between">
          <Badge color={PROPOSAL_STATUS_COLORS[proposal.status] ?? 'gray'}>{proposal.status}</Badge>
          <div className="flex gap-2">
            {canSend && onSend && (
              <Button size="sm" onClick={() => onSend(proposal)}>
                <Send className="h-3 w-3" />
                Send
              </Button>
            )}
            {canMarkWon && onMarkWon && (
              <Button size="sm" onClick={() => onMarkWon(proposal)}>
                <Trophy className="h-3 w-3" />
                Mark Won
              </Button>
            )}
            {canConvert && onConvert && (
              <Button size="sm" onClick={() => onConvert(proposal)}>
                <Zap className="h-3 w-3" />
                Convert to Service Plan
              </Button>
            )}
          </div>
        </div>

        {/* Bid Reference */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted">Bid</p>
                <p className="text-sm font-mono">{bid?.bid_code ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Service</p>
                <p className="text-sm font-medium">{bid?.service?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Total Sq Ft</p>
                <p className="text-sm font-medium">{bid?.total_sqft?.toLocaleString() ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Bid Price</p>
                <p className="text-sm font-bold">{bid?.bid_monthly_price ? fmt(bid.bid_monthly_price) : '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            {/* Pricing Options */}
            {options.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    <span className="inline-flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted" />
                      Pricing Options
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {options.map((opt) => (
                      <div key={opt.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{opt.label}</span>
                          {opt.is_recommended && (
                            <Badge color="green">Recommended</Badge>
                          )}
                        </div>
                        <span className="text-lg font-bold">{fmt(opt.monthly_price)}/mo</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Send History */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted" />
                    Send History
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sends.length === 0 ? (
                  <p className="text-sm text-muted">No sends yet.</p>
                ) : (
                  <div className="space-y-3">
                    {sends.map((send) => (
                      <div key={send.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {send.status === 'OPENED' ? (
                            <Eye className="h-4 w-4 text-yellow-500" />
                          ) : send.status === 'BOUNCED' || send.status === 'FAILED' ? (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <Mail className="h-4 w-4 text-muted" />
                          )}
                          <span>{send.recipient_email}</span>
                          {send.recipient_name && (
                            <span className="text-muted">({send.recipient_name})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge color={
                            send.status === 'SENT' || send.status === 'DELIVERED' ? 'blue' :
                            send.status === 'OPENED' ? 'yellow' :
                            send.status === 'BOUNCED' || send.status === 'FAILED' ? 'red' :
                            'gray'
                          }>{send.status}</Badge>
                          <span className="text-muted">
                            {send.sent_at ? new Date(send.sent_at).toLocaleDateString() : '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PDF Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted">PDF Generated</p>
                    <p className="text-sm font-medium">
                      {proposal.pdf_generated_at
                        ? new Date(proposal.pdf_generated_at).toLocaleDateString()
                        : 'Not yet'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Valid Until</p>
                    <p className="text-sm font-medium">
                      {proposal.valid_until
                        ? new Date(proposal.valid_until).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Metadata */}
        <div className="text-xs text-muted space-y-1 pt-4 border-t border-border">
          <p>Created: {new Date(proposal.created_at).toLocaleDateString()}</p>
          <p>Updated: {new Date(proposal.updated_at).toLocaleDateString()}</p>
        </div>
      </div>
    </SlideOver>
  );
}
