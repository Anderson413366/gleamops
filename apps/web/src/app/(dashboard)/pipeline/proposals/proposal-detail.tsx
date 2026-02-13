'use client';

import { useEffect, useState } from 'react';
import {
  FileCheck, Send, Mail, Eye, DollarSign, AlertCircle, Trophy, Zap,
  CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SlideOver, Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton, Select,
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
      client_id?: string;
    } | null;
  } | null;
}

interface SiteOption { id: string; name: string; site_code: string }

interface ConversionResult {
  success: boolean;
  job_code?: string;
  tickets_created?: number;
  error?: string;
  errorCode?: string;
  idempotent?: boolean;
}

interface ProposalDetailProps {
  proposal: ProposalWithRelations | null;
  open: boolean;
  onClose: () => void;
  onSend?: (proposal: ProposalWithRelations) => void;
  onMarkWon?: (proposal: ProposalWithRelations) => void;
  onConvert?: (proposal: ProposalWithRelations, siteId: string, pricingOptionId?: string) => void;
  converting?: boolean;
  conversionResult?: ConversionResult | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export function ProposalDetail({
  proposal, open, onClose, onSend, onMarkWon, onConvert,
  converting, conversionResult,
}: ProposalDetailProps) {
  const [options, setOptions] = useState<SalesProposalPricingOption[]>([]);
  const [sends, setSends] = useState<SalesProposalSend[]>([]);
  const [loading, setLoading] = useState(false);

  // Conversion form state
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedPricingId, setSelectedPricingId] = useState('');
  const [showConvertForm, setShowConvertForm] = useState(false);

  useEffect(() => {
    if (!proposal || !open) return;
    setLoading(true);
    setShowConvertForm(false);
    setSelectedSiteId('');
    setSelectedPricingId('');
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

  // Fetch sites when convert form opens
  useEffect(() => {
    if (!showConvertForm || !proposal) return;
    const supabase = getSupabaseBrowserClient();

    // Get client_id from the bid chain
    const clientId = proposal.bid_version?.bid?.client_id;
    if (!clientId) {
      // Fallback: get all sites
      supabase
        .from('sites')
        .select('id, name, site_code')
        .is('archived_at', null)
        .order('name')
        .then(({ data }) => {
          if (data) setSites(data as unknown as SiteOption[]);
          if (data && data.length > 0 && !selectedSiteId) {
            setSelectedSiteId((data[0] as unknown as SiteOption).id);
          }
        });
    } else {
      supabase
        .from('sites')
        .select('id, name, site_code')
        .eq('client_id', clientId)
        .is('archived_at', null)
        .order('name')
        .then(({ data }) => {
          if (data) setSites(data as unknown as SiteOption[]);
          if (data && data.length > 0 && !selectedSiteId) {
            setSelectedSiteId((data[0] as unknown as SiteOption).id);
          }
        });
    }
  }, [showConvertForm, proposal]);

  if (!proposal) return null;

  const bid = proposal.bid_version?.bid;
  const canSend = proposal.status === 'GENERATED' || proposal.status === 'DRAFT';
  const canMarkWon = proposal.status === 'SENT' || proposal.status === 'DELIVERED' || proposal.status === 'OPENED';
  const canConvert = proposal.status === 'WON';

  return (
    <SlideOver open={open} onClose={onClose} title={proposal.proposal_code} subtitle={bid?.client?.name} wide>
      <div className="space-y-6">
        {/* Conversion Result Banner */}
        {conversionResult && (
          <div className={`p-4 rounded-lg border ${
            conversionResult.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3">
              {conversionResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 shrink-0" />
              )}
              <div>
                {conversionResult.success ? (
                  <>
                    <p className="text-sm font-semibold text-green-800">
                      {conversionResult.idempotent ? 'Already Converted' : 'Conversion Successful'}
                    </p>
                    <p className="text-xs text-green-700">
                      Service Plan <span className="font-mono font-bold">{conversionResult.job_code}</span> created with {conversionResult.tickets_created} tickets
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-red-800">
                      Conversion Failed
                      {conversionResult.errorCode && (
                        <span className="ml-2 font-mono text-xs bg-red-100 px-1.5 py-0.5 rounded">
                          {conversionResult.errorCode}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-red-700">{conversionResult.error}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

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
            {canConvert && onConvert && !showConvertForm && !conversionResult?.success && (
              <Button size="sm" onClick={() => setShowConvertForm(true)}>
                <Zap className="h-3 w-3" />
                Convert to Service Plan
              </Button>
            )}
          </div>
        </div>

        {/* Convert Form */}
        {showConvertForm && canConvert && !conversionResult?.success && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Convert to Service Plan
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Site *</label>
                  <Select
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                    placeholder="Select a site..."
                    options={sites.map((s) => ({ value: s.id, label: `${s.name} (${s.site_code})` }))}
                  />
                </div>
                {options.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Pricing Tier</label>
                    <Select
                      value={selectedPricingId}
                      onChange={(e) => setSelectedPricingId(e.target.value)}
                      placeholder="Use bid default price..."
                      options={options.map((o) => ({
                        value: o.id,
                        label: `${o.label} — ${fmt(o.monthly_price)}/mo${o.is_recommended ? ' (Recommended)' : ''}`,
                      }))}
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onConvert?.(proposal, selectedSiteId, selectedPricingId || undefined)}
                    disabled={!selectedSiteId || converting}
                  >
                    {converting ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Converting...
                      </>
                    ) : (
                      <>
                        <Zap className="h-3 w-3" />
                        Convert Now
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setShowConvertForm(false)} disabled={converting}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bid Reference */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Bid</p>
                <p className="text-sm font-mono">{bid?.bid_code ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Service</p>
                <p className="text-sm font-medium">{bid?.service?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Sq Ft</p>
                <p className="text-sm font-medium">{bid?.total_sqft?.toLocaleString() ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bid Price</p>
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
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
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
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Send History
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sends.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sends yet.</p>
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
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{send.recipient_email}</span>
                          {send.recipient_name && (
                            <span className="text-muted-foreground">({send.recipient_name})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge color={
                            send.status === 'SENT' || send.status === 'DELIVERED' ? 'blue' :
                            send.status === 'OPENED' ? 'yellow' :
                            send.status === 'BOUNCED' || send.status === 'FAILED' ? 'red' :
                            'gray'
                          }>{send.status}</Badge>
                          <span className="text-muted-foreground">
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
                    <p className="text-xs text-muted-foreground">PDF Generated</p>
                    <p className="text-sm font-medium">
                      {proposal.pdf_generated_at
                        ? new Date(proposal.pdf_generated_at).toLocaleDateString()
                        : 'Not yet'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valid Until</p>
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
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
          <p>Created: {new Date(proposal.created_at).toLocaleDateString()}</p>
          <p>Updated: {new Date(proposal.updated_at).toLocaleDateString()}</p>
        </div>
      </div>
    </SlideOver>
  );
}
