'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ClipboardCheck, Package2, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button, Card, CardContent, Skeleton } from '@gleamops/ui';
import { toast } from 'sonner';

interface CountItem {
  id: string;
  supplyId: string;
  expectedQty: number | null;
  actualQty: number | null;
  notes: string | null;
  supply: {
    id: string;
    code: string;
    name: string;
    category: string | null;
    unit: string | null;
    brand: string | null;
    preferred_vendor: string | null;
    image_url: string | null;
    unit_cost: number | null;
  } | null;
  previousCountQty: number | null;
  previousCountDate: string | null;
}

interface CountPayload {
  count: {
    id: string;
    code: string;
    date: string;
    status: string;
    notes: string | null;
    countedByName: string | null;
    submittedAt: string | null;
    site: {
      name: string;
      site_code: string;
      address: {
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
      } | null;
    } | null;
  };
  items: CountItem[];
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not Set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not Set';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function unitLabel(unit: string | null | undefined) {
  if (!unit) return 'units';
  return unit.toLowerCase();
}

export default function PublicInventoryCountPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<CountPayload | null>(null);
  const [countedByName, setCountedByName] = useState('');
  const [notes, setNotes] = useState('');
  const [qtyByItemId, setQtyByItemId] = useState<Record<string, string>>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [touchedSubmit, setTouchedSubmit] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/public/counts/${encodeURIComponent(token)}`);
      const payload = (await response.json()) as CountPayload | { error?: string };
      if (!response.ok || !('count' in payload)) {
        throw new Error((payload as { error?: string }).error ?? 'Unable to load count form.');
      }

      setData(payload);
      setCountedByName(payload.count.countedByName ?? '');
      setNotes(payload.count.notes ?? '');
      setQtyByItemId(Object.fromEntries(payload.items.map((item) => [item.id, item.actualQty != null ? String(item.actualQty) : ''])));
      const categories = Array.from(new Set(payload.items.map((item) => item.supply?.category ?? 'Uncategorized')));
      setExpandedCategories(categories.slice(0, 1));
      setSubmitted(['SUBMITTED', 'COMPLETED'].includes(payload.count.status.toUpperCase()));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load count form.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    if (!data) return [];
    const map: Record<string, CountItem[]> = {};
    for (const item of data.items) {
      const key = item.supply?.category ?? 'Uncategorized';
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const completedCount = useMemo(() => {
    if (!data) return 0;
    return data.items.filter((item) => qtyByItemId[item.id] !== '').length;
  }, [data, qtyByItemId]);

  const totalCount = data?.items.length ?? 0;
  const missingIds = useMemo(
    () => (data?.items ?? []).filter((item) => qtyByItemId[item.id] === '').map((item) => item.id),
    [data, qtyByItemId]
  );

  const isLocked = submitted || !data || ['SUBMITTED', 'COMPLETED'].includes(data.count.status.toUpperCase());

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => (
      prev.includes(category)
        ? prev.filter((name) => name !== category)
        : [...prev, category]
    ));
  };

  const payloadItems = () => (data?.items ?? []).map((item) => ({
    id: item.id,
    quantity: qtyByItemId[item.id] === '' ? null : Number(qtyByItemId[item.id]),
    notes: item.notes ?? null,
  }));

  const handleSaveDraft = async () => {
    if (!data || isLocked) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/public/counts/${encodeURIComponent(token)}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countedByName: countedByName.trim() || null,
          notes: notes.trim() || null,
          items: payloadItems(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Unable to save draft.');
      toast.success('Draft saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!data || isLocked) return;
    setTouchedSubmit(true);
    if (missingIds.length > 0) {
      toast.error(`Please complete all quantities. ${missingIds.length} item(s) still missing.`);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/public/counts/${encodeURIComponent(token)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countedByName: countedByName.trim() || null,
          notes: notes.trim() || null,
          items: payloadItems(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Unable to submit count.');
      setSubmitted(true);
      toast.success('Count submitted successfully');
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit count.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold text-foreground">Count form unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This link may be expired or invalid. Request a new count URL from your site manager.
        </p>
      </div>
    );
  }

  const addressLine = [
    data.count.site?.address?.street,
    [data.count.site?.address?.city, data.count.site?.address?.state].filter(Boolean).join(', '),
    data.count.site?.address?.zip,
  ].filter(Boolean).join(' · ');

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">Count submitted successfully</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Thank you. Inventory Count {data.count.code} has been submitted for {data.count.site?.name ?? 'this site'}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-module-accent/15 p-2 text-module-accent">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-foreground">Inventory Count — {data.count.site?.name ?? 'Site'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{data.count.code}</p>
            <p className="mt-2 text-sm text-muted-foreground">Date: {formatDate(data.count.date)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Site: {data.count.site?.name ?? 'Not Set'} {data.count.site?.site_code ? `(${data.count.site.site_code})` : ''}
            </p>
            {addressLine ? <p className="mt-1 text-sm text-muted-foreground">{addressLine}</p> : null}
            <p className="mt-2 text-xs text-muted-foreground">Enter the quantity for every item. `0` means out of stock.</p>
          </div>
        </div>
      </header>

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Counted By</span>
            <input
              type="text"
              value={countedByName}
              onChange={(event) => setCountedByName(event.target.value)}
              disabled={isLocked}
              placeholder="Enter name"
              className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
            />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isLocked}
              rows={3}
              placeholder="Optional notes for this count..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {grouped.map(([category, items]) => {
          const expanded = expandedCategories.includes(category);
          return (
            <Card key={category}>
              <CardContent className="p-0">
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-foreground">{category} ({items.length})</span>
                  {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
                {expanded && (
                  <div className="space-y-3 border-t border-border px-4 py-4">
                    {items.map((item) => {
                      const qtyValue = qtyByItemId[item.id] ?? '';
                      const showError = touchedSubmit && qtyValue === '';
                      return (
                        <div key={item.id} className={`rounded-xl border bg-card p-4 ${showError ? 'border-red-400' : 'border-border'}`}>
                          <div className="flex items-start gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
                              {item.supply?.image_url ? (
                                <img src={item.supply.image_url} alt={item.supply.name} className="h-full w-full object-cover" />
                              ) : (
                                <Package2 className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground">{item.supply?.name ?? 'Unknown Supply'}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Unit: {unitLabel(item.supply?.unit)}
                                {' · '}
                                Brand: {item.supply?.brand ?? 'Not Set'}
                                {' · '}
                                Vendor: {item.supply?.preferred_vendor ?? 'Not Set'}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Last Count: {item.previousCountQty != null ? `${item.previousCountQty} ${unitLabel(item.supply?.unit)}` : 'Not available'}
                                {item.previousCountDate ? ` (${formatDate(item.previousCountDate)})` : ''}
                              </p>
                              <label className="mt-3 block">
                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantity</span>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={qtyValue}
                                  onChange={(event) => setQtyByItemId((prev) => ({ ...prev, [item.id]: event.target.value }))}
                                  disabled={isLocked}
                                  className={`h-12 w-full rounded-lg border bg-background px-3 text-lg ${showError ? 'border-red-500' : 'border-border'}`}
                                  required
                                />
                              </label>
                              {showError ? (
                                <p className="mt-1 text-xs text-red-600">⚠ This field is required</p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="sticky bottom-3 border-module-accent/30 shadow-lg">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="font-medium text-foreground">Progress: {completedCount} of {totalCount} items entered</p>
            <p className="text-xs text-muted-foreground">{Math.round((completedCount / Math.max(totalCount, 1)) * 100)}%</p>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-module-accent transition-all"
              style={{ width: `${Math.round((completedCount / Math.max(totalCount, 1)) * 100)}%` }}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={handleSaveDraft} loading={saving} disabled={isLocked || submitting}>
              Save Draft
            </Button>
            <Button onClick={handleSubmit} loading={submitting} disabled={isLocked || saving}>
              Submit Count
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
