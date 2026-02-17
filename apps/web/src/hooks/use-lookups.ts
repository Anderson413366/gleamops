'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface LookupRecord {
  id: string;
  tenant_id: string | null;
  category: string;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface LookupOption {
  value: string;
  label: string;
  code: string;
  raw: LookupRecord;
}

function toSnakeUpper(input: string): string {
  return input.trim().replace(/[\s-]+/g, '_').toUpperCase();
}

function toSnakeLower(input: string): string {
  return input.trim().replace(/[\s-]+/g, '_').toLowerCase();
}

function categoryCandidates(input: string): string[] {
  const trimmed = input.trim();
  const set = new Set<string>([
    trimmed,
    trimmed.toUpperCase(),
    trimmed.toLowerCase(),
    toSnakeUpper(trimmed),
    toSnakeLower(trimmed),
  ]);
  return Array.from(set).filter(Boolean);
}

function normalizeCategoryInput(category: string | string[]): string[] {
  const list = Array.isArray(category) ? category : [category];
  const candidates = new Set<string>();
  for (const entry of list) {
    for (const c of categoryCandidates(entry)) {
      candidates.add(c);
    }
  }
  return Array.from(candidates);
}

interface UseLookupsOptions {
  includeInactive?: boolean;
  enabled?: boolean;
  valueMode?: 'code' | 'label';
}

export function useLookups(category: string | string[], options: UseLookupsOptions = {}) {
  const { includeInactive = false, enabled = true, valueMode = 'code' } = options;
  const supabase = getSupabaseBrowserClient();
  const categories = useMemo(() => normalizeCategoryInput(category), [category]);

  const [data, setData] = useState<LookupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || categories.length === 0) {
      setData([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    let query = supabase
      .from('lookups')
      .select('id, tenant_id, category, code, label, sort_order, is_active')
      .in('category', categories)
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    query.then(({ data: rows, error: queryError }) => {
      if (cancelled) return;
      if (queryError) {
        setData([]);
        setError(queryError.message);
      } else {
        setData((rows ?? []) as LookupRecord[]);
        setError(null);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [supabase, enabled, includeInactive, categories]);

  const optionsList = useMemo<LookupOption[]>(
    () =>
      data.map((row) => ({
        value: valueMode === 'label' ? row.label : row.code,
        label: row.label,
        code: row.code,
        raw: row,
      })),
    [data, valueMode]
  );

  return {
    data,
    options: optionsList,
    isLoading,
    error,
  };
}

export const useClientStatuses = () => useLookups(['Client Status', 'CLIENT_STATUS']);
export const useClientTypes = () => useLookups(['Client Type', 'CLIENT_TYPE'], { valueMode: 'label' });
export const useIndustries = () => useLookups(['Industry', 'INDUSTRY'], { valueMode: 'label' });
export const usePaymentTerms = () => useLookups(['Payment Terms', 'PAYMENT_TERMS']);
export const useInvoiceFrequencies = () => useLookups(['Invoice Frequency', 'INVOICE_FREQUENCY']);
export const useSiteStatuses = () => useLookups(['Site Status', 'SITE_STATUS']);
export const useRiskLevels = () => useLookups(['Risk Level', 'RISK_LEVEL']);
export const usePriorityLevels = () => useLookups(['Priority Level', 'PRIORITY_LEVEL']);
