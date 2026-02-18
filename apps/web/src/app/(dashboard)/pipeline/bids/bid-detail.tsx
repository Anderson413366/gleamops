'use client';

import { useEffect, useState } from 'react';
import { FileText, Building2, Clock, DollarSign, FileCheck, Layers, GitBranch, Pencil, CheckCircle, Send, GitCompare } from 'lucide-react';
import { VersionDiffPanel } from './version-diff-panel';
import { toast } from 'sonner';
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
  ChipTabs,
} from '@gleamops/ui';
import { BID_STATUS_COLORS } from '@gleamops/shared';
import type {
  SalesBid,
  SalesBidWorkloadResult,
  SalesBidPricingResult,
  SalesBidArea,
  SalesBidVersion,
  SalesBidLaborRate,
  SalesBidBurden,
} from '@gleamops/shared';
import { useRole } from '@/hooks/use-role';

interface BidWithClient extends SalesBid {
  client?: { name: string; client_code: string } | null;
  service?: { name: string } | null;
}

interface BidDetailProps {
  bid: BidWithClient | null;
  open: boolean;
  onClose: () => void;
  onGenerateProposal?: (bidId: string, bidVersionId: string) => void;
  onEdit?: (bidId: string) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

const DETAIL_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'areas', label: 'Areas' },
  { key: 'costs', label: 'Costs' },
  { key: 'versions', label: 'Versions' },
];

export function BidDetail({ bid, open, onClose, onGenerateProposal, onEdit }: BidDetailProps) {
  const [tab, setTab] = useState('overview');
  const [workload, setWorkload] = useState<SalesBidWorkloadResult | null>(null);
  const [pricing, setPricing] = useState<(SalesBidPricingResult & { explanation?: Record<string, unknown> }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [latestVersionId, setLatestVersionId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const { can } = useRole();

  const effectiveStatus = localStatus ?? bid?.status ?? 'DRAFT';

  // Areas tab data
  const [areas, setAreas] = useState<SalesBidArea[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);

  // Costs tab data
  const [laborRates, setLaborRates] = useState<SalesBidLaborRate | null>(null);
  const [burden, setBurden] = useState<SalesBidBurden | null>(null);
  const [costsLoading, setCostsLoading] = useState(false);

  // Versions tab data
  const [versions, setVersions] = useState<SalesBidVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showDiff, setShowDiff] = useState(false);

  const supabase = getSupabaseBrowserClient();

  // Reset tab and local status when opening
  useEffect(() => {
    if (open) {
      setTab('overview');
      setLocalStatus(null);
    }
  }, [open]);

  // Load overview data (workload + pricing)
  useEffect(() => {
    if (!bid || !open) return;
    setLoading(true);

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
  }, [bid, open, supabase]);

  // Load areas when tab is selected
  useEffect(() => {
    if (tab !== 'areas' || !latestVersionId) return;
    setAreasLoading(true);
    supabase
      .from('sales_bid_areas')
      .select('*')
      .eq('bid_version_id', latestVersionId)
      .is('archived_at', null)
      .order('name')
      .then(({ data }) => {
        if (data) setAreas(data as unknown as SalesBidArea[]);
        setAreasLoading(false);
      });
  }, [tab, latestVersionId, supabase]);

  // Load costs when tab is selected
  useEffect(() => {
    if (tab !== 'costs' || !latestVersionId) return;
    setCostsLoading(true);
    Promise.all([
      supabase.from('sales_bid_labor_rates').select('*').eq('bid_version_id', latestVersionId).single(),
      supabase.from('sales_bid_burden').select('*').eq('bid_version_id', latestVersionId).single(),
    ]).then(([lrRes, bRes]) => {
      if (lrRes.data) setLaborRates(lrRes.data as unknown as SalesBidLaborRate);
      if (bRes.data) setBurden(bRes.data as unknown as SalesBidBurden);
      setCostsLoading(false);
    });
  }, [tab, latestVersionId, supabase]);

  // Load versions when tab is selected
  useEffect(() => {
    if (tab !== 'versions' || !bid) return;
    setVersionsLoading(true);
    supabase
      .from('sales_bid_versions')
      .select('*')
      .eq('bid_id', bid.id)
      .order('version_number', { ascending: false })
      .then(({ data }) => {
        if (data) setVersions(data as unknown as SalesBidVersion[]);
        setVersionsLoading(false);
      });
  }, [tab, bid, supabase]);

  if (!bid) return null;

  return (
    <SlideOver open={open} onClose={onClose} title={bid.bid_code} subtitle={bid.client?.name} wide>
      <div className="space-y-6">
        {/* Status + Actions */}
        <div className="flex items-center justify-between">
          <Badge color={BID_STATUS_COLORS[effectiveStatus] ?? 'gray'}>{effectiveStatus.replace(/_/g, ' ')}</Badge>
          <div className="flex gap-2">
            {onEdit && (effectiveStatus === 'DRAFT' || effectiveStatus === 'IN_PROGRESS') && (
              <Button variant="secondary" size="sm" onClick={() => onEdit(bid.id)}>
                <Pencil className="h-3 w-3" />
                Edit Bid
              </Button>
            )}
            {(effectiveStatus === 'DRAFT' || effectiveStatus === 'IN_PROGRESS') && (
              <Button
                variant="secondary"
                size="sm"
                loading={statusUpdating}
                onClick={async () => {
                  setStatusUpdating(true);
                  const { error } = await supabase
                    .from('sales_bids')
                    .update({ status: 'READY_FOR_REVIEW' })
                    .eq('id', bid.id);
                  if (error) {
                    toast.error(error.message);
                  } else {
                    setLocalStatus('READY_FOR_REVIEW');
                    toast.success('Bid marked as Ready for Review');
                  }
                  setStatusUpdating(false);
                }}
              >
                <Send className="h-3 w-3" />
                Mark Ready for Review
              </Button>
            )}
            {effectiveStatus === 'READY_FOR_REVIEW' && can('bid:approve') && (
              <Button
                size="sm"
                loading={statusUpdating}
                onClick={async () => {
                  setStatusUpdating(true);
                  const { error } = await supabase
                    .from('sales_bids')
                    .update({ status: 'APPROVED' })
                    .eq('id', bid.id);
                  if (error) {
                    toast.error(error.message);
                  } else {
                    setLocalStatus('APPROVED');
                    toast.success('Bid approved');
                  }
                  setStatusUpdating(false);
                }}
              >
                <CheckCircle className="h-3 w-3" />
                Approve
              </Button>
            )}
            {effectiveStatus === 'APPROVED' && pricing && latestVersionId && onGenerateProposal && (
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
              <p className="text-sm font-medium">{bid.client?.name ?? '---'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Service</p>
              </div>
              <p className="text-sm font-medium">{bid.service?.name ?? '---'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <ChipTabs tabs={DETAIL_TABS} active={tab} onChange={setTab} />

        {/* Overview Tab */}
        {tab === 'overview' && (
          <>
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
                        <p className="text-lg font-bold">{bid.total_sqft?.toLocaleString() ?? '---'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Monthly Price</p>
                        <p className="text-lg font-bold">{bid.bid_monthly_price ? fmt(bid.bid_monthly_price) : '---'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}

        {/* Areas Tab */}
        {tab === 'areas' && (
          <>
            {areasLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : areas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No areas found for this bid version.</p>
            ) : (
              <div className="space-y-3">
                {areas.map((area) => (
                  <Card key={area.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium">{area.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {area.square_footage.toLocaleString()} sq ft
                            {area.quantity > 1 ? ` x ${area.quantity}` : ''}
                          </p>
                        </div>
                        <Badge color="gray">{area.difficulty_code}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Floor Type</p>
                          <p className="font-medium">{area.floor_type_code ?? '---'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Building Type</p>
                          <p className="font-medium">{area.building_type_code ?? '---'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Costs Tab */}
        {tab === 'costs' && (
          <>
            {costsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Labor Rates */}
                {laborRates && (
                  <Card>
                    <CardHeader><CardTitle>Labor Rates ($/hr)</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Cleaner</p>
                          <p className="text-lg font-bold">{fmt(laborRates.cleaner_rate)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Lead</p>
                          <p className="text-lg font-bold">{fmt(laborRates.lead_rate)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Supervisor</p>
                          <p className="text-lg font-bold">{fmt(laborRates.supervisor_rate)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Burden */}
                {burden && (
                  <Card>
                    <CardHeader><CardTitle>Burden (%)</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Employer Tax</p>
                          <p className="text-sm font-medium">{fmtPct(burden.employer_tax_pct)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Workers Comp</p>
                          <p className="text-sm font-medium">{fmtPct(burden.workers_comp_pct)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Insurance</p>
                          <p className="text-sm font-medium">{fmtPct(burden.insurance_pct)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Other</p>
                          <p className="text-sm font-medium">{fmtPct(burden.other_pct)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Supply + Overhead from pricing */}
                {pricing && (
                  <Card>
                    <CardHeader><CardTitle>Supply & Overhead</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Supply Allowance</p>
                          <p className="text-sm font-medium">{fmt(pricing.supplies_cost)}/mo</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Overhead</p>
                          <p className="text-sm font-medium">{fmt(pricing.overhead_cost)}/mo</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!laborRates && !burden && (
                  <p className="text-sm text-muted-foreground py-8 text-center">No cost data found for this bid version.</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Versions Tab */}
        {tab === 'versions' && (
          <>
            {versionsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : versions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No versions found.</p>
            ) : (
              <div className="space-y-3">
                {/* Compare button */}
                {compareIds.length === 2 && !showDiff && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowDiff(true)}
                  >
                    <GitCompare className="h-3 w-3" />
                    Compare Selected
                  </Button>
                )}
                {compareIds.length > 0 && compareIds.length < 2 && (
                  <p className="text-xs text-muted-foreground">Select one more version to compare.</p>
                )}

                {/* Diff panel */}
                {showDiff && compareIds.length === 2 && (() => {
                  const vA = versions.find((v) => v.id === compareIds[0]);
                  const vB = versions.find((v) => v.id === compareIds[1]);
                  if (!vA || !vB) return null;
                  return (
                    <VersionDiffPanel
                      versionIdA={vA.id}
                      versionIdB={vB.id}
                      versionNumberA={vA.version_number}
                      versionNumberB={vB.version_number}
                      onClose={() => { setShowDiff(false); setCompareIds([]); }}
                    />
                  );
                })()}

                {versions.map((v) => (
                  <Card key={v.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={compareIds.includes(v.id)}
                            onChange={() => {
                              setShowDiff(false);
                              setCompareIds((prev) =>
                                prev.includes(v.id)
                                  ? prev.filter((id) => id !== v.id)
                                  : prev.length >= 2
                                    ? [prev[1], v.id]
                                    : [...prev, v.id]
                              );
                            }}
                            className="h-4 w-4 rounded border-border"
                          />
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">Version {v.version_number}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {v.is_sent_snapshot && (
                            <Badge color="blue">Sent</Badge>
                          )}
                          {v.id === latestVersionId && (
                            <Badge color="green">Latest</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-8">
                        Created: {new Date(v.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
