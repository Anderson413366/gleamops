'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ClipboardCheck, Package2, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Camera, Upload, X } from 'lucide-react';
import { LOCALE_LABELS, SUPPORTED_LOCALES } from '@gleamops/shared';
import { Button, Card, CardContent, Skeleton } from '@gleamops/ui';
import { toast } from 'sonner';
import {
  compareSupplyCategories,
  formatSupplyCategoryLabel,
  normalizeSupplyCategory,
} from '@/lib/inventory/category-order';
import { useLocale } from '@/hooks/use-locale';
import { getIntlLocale } from '@/lib/locale';

interface CountItem {
  id: string;
  supplyId: string;
  expectedQty: number | null;
  actualQty: number | null;
  notes: string | null;
  photoUrls?: string[];
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

interface GroupedCountItems {
  key: string;
  label: string;
  items: CountItem[];
}

export default function PublicInventoryCountPage() {
  const { token } = useParams<{ token: string }>();
  const { locale, setLocale, t } = useLocale();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<CountPayload | null>(null);
  const [countedByName, setCountedByName] = useState('');
  const [notes, setNotes] = useState('');
  const [qtyByItemId, setQtyByItemId] = useState<Record<string, string>>({});
  const [photoUrlsByItemId, setPhotoUrlsByItemId] = useState<Record<string, string[]>>({});
  const [uploadingPhotoByItemId, setUploadingPhotoByItemId] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [touchedSubmit, setTouchedSubmit] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const formatDate = useCallback((value: string | null | undefined) => {
    const notSet = t('count.value.notSet');
    if (!value) return notSet;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return notSet;

    return new Intl.DateTimeFormat(getIntlLocale(locale), {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }, [locale, t]);

  const unitLabel = useCallback((unit: string | null | undefined) => {
    if (!unit) return t('count.value.units');
    return unit.toLowerCase();
  }, [t]);

  const fetchData = async () => {
    if (!token) return;

    const loadErrorMessage = t('count.toast.loadError');

    setLoading(true);
    try {
      const response = await fetch(`/api/public/counts/${encodeURIComponent(token)}`);
      const payload = (await response.json()) as CountPayload | { error?: string };
      if (!response.ok || !('count' in payload)) {
        throw new Error((payload as { error?: string }).error ?? loadErrorMessage);
      }

      setData(payload);
      setCountedByName(payload.count.countedByName ?? '');
      setNotes(payload.count.notes ?? '');
      setQtyByItemId(Object.fromEntries(payload.items.map((item) => [item.id, item.actualQty != null ? String(item.actualQty) : ''])));
      setPhotoUrlsByItemId(Object.fromEntries(payload.items.map((item) => [item.id, item.photoUrls ?? []])));
      setUploadingPhotoByItemId({});
      const categories = Array.from(new Set(payload.items.map((item) => normalizeSupplyCategory(item.supply?.category))));
      categories.sort(compareSupplyCategories);
      setExpandedCategories(categories.slice(0, 1));
      setSubmitted(['SUBMITTED', 'COMPLETED'].includes(payload.count.status.toUpperCase()));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : loadErrorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    if (!data) return [] as GroupedCountItems[];

    const map: Record<string, CountItem[]> = {};
    for (const item of data.items) {
      const key = normalizeSupplyCategory(item.supply?.category);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }

    return Object.entries(map)
      .sort(([a], [b]) => compareSupplyCategories(a, b))
      .map(([key, items]) => ({
        key,
        label: formatSupplyCategoryLabel(key),
        items: [...items].sort((left, right) => {
          const leftName = left.supply?.name ?? '';
          const rightName = right.supply?.name ?? '';
          return leftName.localeCompare(rightName);
        }),
      }));
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
  const missingPhotoIds = useMemo(
    () => (data?.items ?? []).filter((item) => (photoUrlsByItemId[item.id] ?? []).length === 0).map((item) => item.id),
    [data, photoUrlsByItemId],
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
    photoUrls: photoUrlsByItemId[item.id] ?? [],
  }));

  const removePhoto = (itemId: string, index: number) => {
    setPhotoUrlsByItemId((prev) => {
      const next = [...(prev[itemId] ?? [])];
      next.splice(index, 1);
      return { ...prev, [itemId]: next };
    });
  };

  const uploadPhoto = async (itemId: string, file: File) => {
    if (!token || isLocked) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('count.toast.photoTypeError'));
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error(t('count.toast.photoSizeError'));
      return;
    }

    setUploadingPhotoByItemId((prev) => ({ ...prev, [itemId]: true }));
    try {
      const formData = new FormData();
      formData.append('itemId', itemId);
      formData.append('file', file);

      const response = await fetch(`/api/public/counts/${encodeURIComponent(token)}/photos`, {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? t('count.toast.photoUploadError'));
      }
      const uploadedUrl = payload.url;

      setPhotoUrlsByItemId((prev) => ({
        ...prev,
        [itemId]: [...(prev[itemId] ?? []), uploadedUrl],
      }));
      toast.success(t('count.toast.photoUploaded'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('count.toast.photoUploadError'));
    } finally {
      setUploadingPhotoByItemId((prev) => ({ ...prev, [itemId]: false }));
    }
  };

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
      if (!response.ok) throw new Error(payload.error ?? t('count.toast.saveError'));
      toast.success(t('count.toast.saved'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('count.toast.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!data || isLocked) return;
    setTouchedSubmit(true);
    if (missingIds.length > 0) {
      toast.error(t('count.toast.submitMissing', { missing: missingIds.length }));
      return;
    }
    if (missingPhotoIds.length > 0) {
      toast.error(t('count.toast.submitMissingPhoto', { missing: missingPhotoIds.length }));
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
      if (!response.ok) throw new Error(payload.error ?? t('count.toast.submitError'));
      setSubmitted(true);
      toast.success(t('count.toast.submitted'));
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('count.toast.submitError'));
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
        <h1 className="mt-4 text-xl font-semibold text-foreground">{t('count.status.unavailableTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('count.status.unavailableDescription')}
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
            <h1 className="mt-4 text-2xl font-bold text-foreground">{t('count.status.submittedTitle')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('count.status.submittedDescription', {
                code: data.count.code,
                site: data.count.site?.name ?? t('count.value.siteDefault'),
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-module-accent/15 p-2 text-module-accent">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                {t('count.title', { site: data.count.site?.name ?? t('count.value.siteDefault') })}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{t('count.code')}: {data.count.code}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('count.date', { date: formatDate(data.count.date) })}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('count.site', {
                  site: data.count.site?.name ?? t('count.value.notSet'),
                })} {data.count.site?.site_code ? `(${data.count.site.site_code})` : ''}
              </p>
              {addressLine ? <p className="mt-1 text-sm text-muted-foreground">{addressLine}</p> : null}
              <p className="mt-2 text-xs text-muted-foreground">{t('count.instructions.enterAll')}</p>
            </div>
          </div>
          <label className="w-full space-y-1.5 sm:w-52">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('count.locale.label')}
            </span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as typeof locale)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              {SUPPORTED_LOCALES.map((supportedLocale) => (
                <option key={supportedLocale} value={supportedLocale}>
                  {LOCALE_LABELS[supportedLocale]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('count.field.countedBy')}</span>
            <input
              type="text"
              value={countedByName}
              onChange={(event) => setCountedByName(event.target.value)}
              disabled={isLocked}
              placeholder={t('count.field.countedByPlaceholder')}
              className="h-12 w-full rounded-lg border border-border bg-background px-3 text-base"
            />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('count.field.notes')}</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isLocked}
              rows={3}
              placeholder={t('count.field.notesPlaceholder')}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {grouped.map(({ key, label, items }) => {
          const expanded = expandedCategories.includes(key);
          return (
            <Card key={key}>
              <CardContent className="p-0">
                <button
                  type="button"
                  onClick={() => toggleCategory(key)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-foreground">{label} ({items.length})</span>
                  {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
                {expanded && (
                  <div className="space-y-3 border-t border-border px-4 py-4">
                    {items.map((item) => {
                      const qtyValue = qtyByItemId[item.id] ?? '';
                      const showError = touchedSubmit && qtyValue === '';
                      const photoUrls = photoUrlsByItemId[item.id] ?? [];
                      const showPhotoError = touchedSubmit && photoUrls.length === 0;
                      const isUploadingPhoto = uploadingPhotoByItemId[item.id] === true;
                      return (
                        <div key={item.id} className={`rounded-xl border bg-card p-4 ${showError || showPhotoError ? 'border-red-400' : 'border-border'}`}>
                          <div className="flex items-start gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
                              {item.supply?.image_url ? (
                                <img src={item.supply.image_url} alt={item.supply.name} className="h-full w-full object-cover" />
                              ) : (
                                <Package2 className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground">{item.supply?.name ?? t('count.item.unknownSupply')}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {t('count.item.unit')}: {unitLabel(item.supply?.unit)}
                                {' · '}
                                {t('count.item.brand')}: {item.supply?.brand ?? t('count.value.notSet')}
                                {' · '}
                                {t('count.item.vendor')}: {item.supply?.preferred_vendor ?? t('count.value.notSet')}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {t('count.item.lastCount')}: {item.previousCountQty != null ? `${item.previousCountQty} ${unitLabel(item.supply?.unit)}` : t('count.item.lastCountUnavailable')}
                                {item.previousCountDate ? ` (${formatDate(item.previousCountDate)})` : ''}
                              </p>
                              <label className="mt-3 block">
                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('count.item.quantity')}</span>
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
                                <p className="mt-1 text-xs text-red-600">⚠ {t('count.item.required')}</p>
                              ) : null}
                              <div className="mt-3 rounded-lg border border-border/80 bg-muted/20 p-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <Camera className="h-3.5 w-3.5" />
                                    {t('count.photo.label')}
                                  </span>
                                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted">
                                    <Upload className="h-3.5 w-3.5" />
                                    {isUploadingPhoto ? t('count.photo.uploading') : t('count.photo.upload')}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      disabled={isLocked || isUploadingPhoto}
                                      className="hidden"
                                      onChange={async (event) => {
                                        const files = Array.from(event.target.files ?? []);
                                        for (const file of files) {
                                          await uploadPhoto(item.id, file);
                                        }
                                        event.target.value = '';
                                      }}
                                    />
                                  </label>
                                </div>
                                <p className="text-[11px] text-muted-foreground">{t('count.photo.hint')}</p>
                                {photoUrls.length > 0 ? (
                                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                                    {photoUrls.map((photoUrl, index) => (
                                      <div key={`${photoUrl}-${index}`} className="relative overflow-hidden rounded-md border border-border bg-card">
                                        <img src={photoUrl} alt={t('count.photo.previewAlt')} className="h-20 w-full object-cover" />
                                        {!isLocked ? (
                                          <button
                                            type="button"
                                            onClick={() => removePhoto(item.id, index)}
                                            className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                                            aria-label={t('count.photo.remove')}
                                          >
                                            <X className="h-3.5 w-3.5" />
                                          </button>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                {showPhotoError ? (
                                  <p className="mt-2 text-xs text-red-600">⚠ {t('count.photo.required')}</p>
                                ) : null}
                              </div>
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
            <p className="font-medium text-foreground">
              {t('count.progress', { completed: completedCount, total: totalCount })}
            </p>
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
              {t('count.button.saveDraft')}
            </Button>
            <Button onClick={handleSubmit} loading={submitting} disabled={isLocked || saving}>
              {t('count.button.submit')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
