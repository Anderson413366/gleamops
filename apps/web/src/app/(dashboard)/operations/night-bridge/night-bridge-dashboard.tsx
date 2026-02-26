'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SearchX } from 'lucide-react';
import { Button, EmptyState, TableSkeleton, cn } from '@gleamops/ui';
import { toast } from 'sonner';
import type {
  NightBridgeDetail,
  NightBridgeReviewInput,
  NightBridgeReviewStatus,
  NightBridgeSummaryItem,
} from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ShiftSummaryCard } from './shift-summary-card';
import { ShiftDetailDrawer } from './shift-detail-drawer';

interface NightBridgeDashboardProps {
  search: string;
}

const STATUS_FILTERS: Array<{ key: 'all' | NightBridgeReviewStatus; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'REVIEWED', label: 'Reviewed' },
  { key: 'NEEDS_FOLLOWUP', label: 'Needs Follow-up' },
];

function defaultDate() {
  const day = new Date();
  day.setDate(day.getDate() - 1);
  return day.toISOString().slice(0, 10);
}

async function authHeaders() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export default function NightBridgeDashboard({ search }: NightBridgeDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<NightBridgeSummaryItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [statusFilter, setStatusFilter] = useState<'all' | NightBridgeReviewStatus>('PENDING');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<NightBridgeDetail | null>(null);
  const [savingReview, setSavingReview] = useState(false);

  const [reviewNotes, setReviewNotes] = useState('');
  const [addToTomorrowEnabled, setAddToTomorrowEnabled] = useState(false);
  const [addToTomorrowSiteId, setAddToTomorrowSiteId] = useState('');
  const [addToTomorrowDescription, setAddToTomorrowDescription] = useState('');

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const headers = await authHeaders();
      const params = new URLSearchParams();
      params.set('date', selectedDate);
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/operations/night-bridge?${params.toString()}`, {
        headers,
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.data) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to load Night Bridge shifts.');
      }

      setRows((body.data ?? []) as NightBridgeSummaryItem[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load Night Bridge shifts.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) => {
      return (row.floater_name ?? '').toLowerCase().includes(query)
        || (row.floater_code ?? '').toLowerCase().includes(query)
        || (row.vehicle_name ?? '').toLowerCase().includes(query)
        || (row.vehicle_code ?? '').toLowerCase().includes(query);
    });
  }, [rows, search]);

  const issueCount = useMemo(() => rows.reduce((sum, row) => sum + row.issues_count, 0), [rows]);

  const openDetail = useCallback(async (routeId: string) => {
    setDrawerOpen(true);
    setDetailLoading(true);
    setDetail(null);
    setReviewNotes('');
    setAddToTomorrowEnabled(false);
    setAddToTomorrowSiteId('');
    setAddToTomorrowDescription('');

    try {
      const headers = await authHeaders();
      const response = await fetch(`/api/operations/night-bridge/${routeId}`, {
        headers,
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.data) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to load shift detail.');
      }

      const nextDetail = body.data as NightBridgeDetail;
      setDetail(nextDetail);
      setReviewNotes(nextDetail.summary.reviewer_notes ?? '');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load shift detail.');
      setDrawerOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const submitReview = useCallback(async (status: 'REVIEWED' | 'NEEDS_FOLLOWUP') => {
    if (!detail) return;
    if (addToTomorrowEnabled && (!addToTomorrowSiteId || !addToTomorrowDescription.trim())) {
      toast.error('Select a site and enter a task description to add work to tomorrow\'s route.');
      return;
    }

    setSavingReview(true);
    try {
      const headers = await authHeaders();
      headers['Content-Type'] = 'application/json';

      const payload: NightBridgeReviewInput = {
        shift_review_status: status,
        reviewer_notes: reviewNotes.trim() || null,
        add_to_tomorrow: addToTomorrowEnabled
          ? {
            site_id: addToTomorrowSiteId,
            description: addToTomorrowDescription.trim(),
            evidence_required: false,
          }
          : null,
      };

      const response = await fetch(`/api/operations/night-bridge/${detail.summary.route_id}/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.detail ?? body?.title ?? 'Failed to update review status.');
      }

      toast.success(status === 'REVIEWED' ? 'Shift marked as reviewed.' : 'Shift marked as needs follow-up.');
      setDrawerOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update review status.');
    } finally {
      setSavingReview(false);
    }
  }, [
    addToTomorrowDescription,
    addToTomorrowEnabled,
    addToTomorrowSiteId,
    detail,
    load,
    reviewNotes,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Night Bridge</h2>
          <p className="text-sm text-muted-foreground">
            {issueCount > 0
              ? `${issueCount} issues need your attention.`
              : 'Everything looks good.'}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setStatusFilter(filter.key)}
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-in-out',
              statusFilter === filter.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          icon={<SearchX className="h-12 w-12" />}
          title="No completed shifts to review"
          description="Try another date or status filter."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRows.map((item) => (
            <ShiftSummaryCard key={item.route_id} item={item} onSelect={openDetail} />
          ))}
        </div>
      )}

      <ShiftDetailDrawer
        open={drawerOpen}
        loading={detailLoading}
        saving={savingReview}
        detail={detail}
        reviewNotes={reviewNotes}
        addToTomorrowEnabled={addToTomorrowEnabled}
        addToTomorrowSiteId={addToTomorrowSiteId}
        addToTomorrowDescription={addToTomorrowDescription}
        onClose={() => setDrawerOpen(false)}
        onReviewNotesChange={setReviewNotes}
        onAddToTomorrowEnabledChange={setAddToTomorrowEnabled}
        onAddToTomorrowSiteChange={setAddToTomorrowSiteId}
        onAddToTomorrowDescriptionChange={setAddToTomorrowDescription}
        onMarkReviewed={() => void submitReview('REVIEWED')}
        onNeedsFollowup={() => void submitReview('NEEDS_FOLLOWUP')}
      />
    </div>
  );
}
