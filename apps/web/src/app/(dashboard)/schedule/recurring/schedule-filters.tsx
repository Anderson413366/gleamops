'use client';

import { useEffect, useMemo, useState } from 'react';
import { Select } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface ScheduleFilterState {
  site: string;
  position: string;
  staff: string;
}

interface ScheduleFiltersProps {
  filters: ScheduleFilterState;
  onChange: (filters: ScheduleFilterState) => void;
  /** Pass current recurring rows to extract distinct filter options */
  rows: Array<{
    siteName: string;
    siteCode?: string | null;
    positionType: string;
    staffName: string;
  }>;
}

export function ScheduleFilters({ filters, onChange, rows }: ScheduleFiltersProps) {
  const [sites, setSites] = useState<Array<{ value: string; label: string }>>([]);
  const [sitesLoading, setSitesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchSites() {
      setSitesLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('sites')
        .select('id, name, site_code')
        .is('archived_at', null)
        .order('name', { ascending: true });

      if (!cancelled && data) {
        setSites(
          data.map((s: { id: string; name: string; site_code: string }) => ({
            value: s.name,
            label: `${s.name} (${s.site_code})`,
          })),
        );
      }
      if (!cancelled) setSitesLoading(false);
    }

    void fetchSites();
    return () => { cancelled = true; };
  }, []);

  const positionOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.positionType))).sort();
    return unique.map((p) => ({ value: p, label: p.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) }));
  }, [rows]);

  const staffOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.staffName).filter((n) => n !== 'Open Shift'))).sort();
    return unique.map((s) => ({ value: s, label: s }));
  }, [rows]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[180px]">
        <Select
          label="Site"
          value={filters.site}
          onChange={(e) => onChange({ ...filters, site: e.target.value })}
          options={[
            { value: '', label: sitesLoading ? 'Loading sites...' : 'All Sites' },
            ...sites,
          ]}
        />
      </div>
      <div className="min-w-[180px]">
        <Select
          label="Position"
          value={filters.position}
          onChange={(e) => onChange({ ...filters, position: e.target.value })}
          options={[
            { value: '', label: 'All Positions' },
            ...positionOptions,
          ]}
        />
      </div>
      <div className="min-w-[180px]">
        <Select
          label="Staff"
          value={filters.staff}
          onChange={(e) => onChange({ ...filters, staff: e.target.value })}
          options={[
            { value: '', label: 'All Staff' },
            ...staffOptions,
          ]}
        />
      </div>
    </div>
  );
}

export function applyScheduleFilters<T extends { siteName: string; positionType: string; staffName: string }>(
  rows: T[],
  filters: ScheduleFilterState,
): T[] {
  return rows.filter((row) => {
    if (filters.site && row.siteName !== filters.site) return false;
    if (filters.position && row.positionType !== filters.position) return false;
    if (filters.staff && row.staffName !== filters.staff) return false;
    return true;
  });
}
