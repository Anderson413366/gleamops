'use client';

import { useEffect, useState } from 'react';
import {
  FileCheck, Send, Mail, Eye, DollarSign, AlertCircle, Trophy, Zap,
  CheckCircle2, XCircle, Loader2, Paperclip, FileText, Plus, Pencil, Save, Trash2, X,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SlideOver, Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton, Select, Input,
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
  const [attachments, setAttachments] = useState<{id:string; sort_order:number; one_page_confirmed:boolean}[]>([]);
  const [marketingInserts, setMarketingInserts] = useState<{id:string; insert_code:string; sort_order:number; insert?:{title:string}|null}[]>([]);
  const [loading, setLoading] = useState(false);

  // Pricing option editing
  const [editingOptions, setEditingOptions] = useState(false);
  const [editableOptions, setEditableOptions] = useState<SalesProposalPricingOption[]>([]);
  const [savingOptions, setSavingOptions] = useState(false);

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
      supabase
        .from('sales_proposal_attachments')
        .select('*')
        .eq('proposal_id', proposal.id)
        .order('sort_order'),
      supabase
        .from('sales_proposal_marketing_inserts')
        .select('*, insert:insert_code(title)')
        .eq('proposal_id', proposal.id)
        .order('sort_order'),
    ]).then(([optRes, sendRes, attRes, miRes]) => {
      if (optRes.data) setOptions(optRes.data as unknown as SalesProposalPricingOption[]);
      if (sendRes.data) setSends(sendRes.data as unknown as SalesProposalSend[]);
      if (attRes.data) setAttachments(attRes.data as unknown as typeof attachments);
      if (miRes.data) setMarketingInserts(miRes.data as unknown as typeof marketingInserts);
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
              ? 'bg-success/10 border-success/20'
              : 'bg-destructive/10 border-destructive/20'
          }`}>
            <div className="flex items-center gap-3">
              {conversionResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive shrink-0" />
              )}
              <div>
                {conversionResult.success ? (
                  <>
                    <p className="text-sm font-semibold text-success">
                      {conversionResult.idempotent ? 'Already Converted' : 'Conversion Successful'}
                    </p>
                    <p className="text-xs text-success">
                      Service Plan <span className="font-mono font-bold">{conversionResult.job_code}</span> created with {conversionResult.tickets_created} tickets
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-destructive">
                      Conversion Failed
                      {conversionResult.errorCode && (
                        <span className="ml-2 font-mono text-xs bg-destructive/10 px-1.5 py-0.5 rounded">
                          {conversionResult.errorCode}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-destructive">{conversionResult.error}</p>
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
                  <Zap className="h-4 w-4 text-warning" />
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
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    <span className="inline-flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      Pricing Options
                    </span>
                  </CardTitle>
                  {!editingOptions ? (
                    <Button variant="secondary" size="sm" onClick={() => {
                      setEditableOptions(options.map((o) => ({ ...o })));
                      setEditingOptions(true);
                    }}>
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="sm" disabled={savingOptions} onClick={async () => {
                        setSavingOptions(true);
                        const supabase = getSupabaseBrowserClient();

                        // Delete removed options
                        const editableIds = new Set(editableOptions.filter((o) => o.id).map((o) => o.id));
                        const removedOptions = options.filter((o) => !editableIds.has(o.id));
                        for (const removed of removedOptions) {
                          await supabase.from('sales_proposal_pricing_options').delete().eq('id', removed.id);
                        }

                        // Upsert all editable options
                        for (let i = 0; i < editableOptions.length; i++) {
                          const opt = editableOptions[i];
                          if (opt.id && options.find((o) => o.id === opt.id)) {
                            // Update existing
                            await supabase.from('sales_proposal_pricing_options').update({
                              label: opt.label,
                              monthly_price: opt.monthly_price,
                              description: opt.description,
                              is_recommended: opt.is_recommended,
                              sort_order: i,
                            }).eq('id', opt.id);
                          } else {
                            // Insert new
                            await supabase.from('sales_proposal_pricing_options').insert({
                              tenant_id: proposal.tenant_id,
                              proposal_id: proposal.id,
                              label: opt.label,
                              monthly_price: opt.monthly_price,
                              description: opt.description || null,
                              is_recommended: opt.is_recommended,
                              sort_order: i,
                            });
                          }
                        }

                        // Refresh options
                        const { data } = await supabase
                          .from('sales_proposal_pricing_options')
                          .select('*')
                          .eq('proposal_id', proposal.id)
                          .order('sort_order');
                        if (data) setOptions(data as unknown as SalesProposalPricingOption[]);

                        setSavingOptions(false);
                        setEditingOptions(false);
                      }}>
                        <Save className="h-3 w-3" />
                        Save
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setEditingOptions(false)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingOptions ? (
                  <div className="space-y-3">
                    {editableOptions.map((opt, i) => (
                      <div key={opt.id || `new-${i}`} className="p-3 rounded-lg border border-border space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            className="flex-1 text-sm font-medium border border-border rounded px-2 py-1 bg-background"
                            value={opt.label}
                            onChange={(e) => {
                              const updated = [...editableOptions];
                              updated[i] = { ...updated[i], label: e.target.value };
                              setEditableOptions(updated);
                            }}
                            placeholder="Option label"
                          />
                          <input
                            className="w-32 text-sm font-bold border border-border rounded px-2 py-1 bg-background text-right"
                            type="number"
                            value={opt.monthly_price}
                            onChange={(e) => {
                              const updated = [...editableOptions];
                              updated[i] = { ...updated[i], monthly_price: Number(e.target.value) };
                              setEditableOptions(updated);
                            }}
                          />
                          <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={opt.is_recommended}
                              onChange={(e) => {
                                const updated = editableOptions.map((o, j) => ({
                                  ...o,
                                  is_recommended: j === i ? e.target.checked : false,
                                }));
                                setEditableOptions(updated);
                              }}
                              className="rounded border-border"
                            />
                            Rec.
                          </label>
                          <button
                            onClick={() => setEditableOptions(editableOptions.filter((_, j) => j !== i))}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <input
                          className="w-full text-xs border border-border rounded px-2 py-1 bg-background"
                          value={opt.description || ''}
                          onChange={(e) => {
                            const updated = [...editableOptions];
                            updated[i] = { ...updated[i], description: e.target.value };
                            setEditableOptions(updated);
                          }}
                          placeholder="Description (optional)"
                        />
                      </div>
                    ))}
                    <Button variant="secondary" size="sm" onClick={() => {
                      setEditableOptions([...editableOptions, {
                        id: '',
                        tenant_id: proposal.tenant_id,
                        proposal_id: proposal.id,
                        label: 'Custom',
                        monthly_price: 0,
                        description: '',
                        is_recommended: false,
                        sort_order: editableOptions.length,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        archived_at: null,
                        archived_by: null,
                        archive_reason: null,
                        version_etag: '',
                      } as SalesProposalPricingOption]);
                    }}>
                      <Plus className="h-3 w-3" />
                      Add Option
                    </Button>
                  </div>
                ) : options.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pricing options.</p>
                ) : (
                  <div className="space-y-3">
                    {options.map((opt) => (
                      <div key={opt.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">{opt.label}</span>
                            {opt.is_recommended && (
                              <Badge color="green">Recommended</Badge>
                            )}
                          </div>
                          {opt.description && (
                            <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                          )}
                        </div>
                        <span className="text-lg font-bold">{fmt(opt.monthly_price)}/mo</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Proposal Attachments */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="inline-flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    Attachments
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No attachments.</p>
                ) : (
                  <ul className="space-y-2">
                    {attachments.map((a) => (
                      <li key={a.id} className="flex items-center justify-between text-sm">
                        <span className="font-medium">Attachment #{a.sort_order + 1}</span>
                        {a.one_page_confirmed && <Badge color="green">1-page</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Marketing Inserts */}
            {marketingInserts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    <span className="inline-flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Marketing Inserts
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {marketingInserts.map((mi) => (
                      <li key={mi.id} className="text-sm">
                        {mi.insert?.title ?? mi.insert_code}
                      </li>
                    ))}
                  </ul>
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
                            <Eye className="h-4 w-4 text-warning" />
                          ) : send.status === 'BOUNCED' || send.status === 'FAILED' ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
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
