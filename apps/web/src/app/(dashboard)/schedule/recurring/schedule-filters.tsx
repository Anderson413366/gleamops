'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Select } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface ScheduleFilterState {
  client: string;
  site: string;
  position: string;
  staff: string;
}

interface SiteRecord {
  id: string;
  name: string;
  site_code: string;
  client_id: string | null;
}

interface ClientRecord {
  id: string;
  name: string;
  client_code: string;
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
    clientName?: string | null;
  }>;
}

export function ScheduleFilters({ filters, onChange, rows }: ScheduleFiltersProps) {
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchSitesAndClients() {
      setSitesLoading(true);
      setClientsLoading(true);
      const supabase = getSupabaseBrowserClient();

      const [sitesRes, clientsRes] = await Promise.all([
        supabase
          .from('sites')
          .select('id, name, site_code, client_id')
          .is('archived_at', null)
          .order('name', { ascending: true }),
        supabase
          .from('clients')
          .select('id, name, client_code')
          .is('archived_at', null)
          .order('name', { ascending: true }),
      ]);

      if (!cancelled) {
        if (sitesRes.data) setSites(sitesRes.data as SiteRecord[]);
        if (clientsRes.data) setClients(clientsRes.data as ClientRecord[]);
        setSitesLoading(false);
        setClientsLoading(false);
      }
    }

    void fetchSitesAndClients();
    return () => { cancelled = true; };
  }, []);

  // Filter sites by selected client
  const filteredSiteOptions = useMemo(() => {
    let filtered = sites;
    if (filters.client) {
      filtered = sites.filter((s) => s.client_id === filters.client);
    }
    return filtered.map((s) => ({
      value: s.name,
      label: `${s.name} (${s.site_code})`,
    }));
  }, [sites, filters.client]);

  const clientOptions = useMemo(() => {
    return clients.map((c) => ({
      value: c.id,
      label: `${c.name} (${c.client_code})`,
    }));
  }, [clients]);

  const positionOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.positionType))).sort();
    return unique.map((p) => ({ value: p, label: p.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) }));
  }, [rows]);

  const staffOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.staffName).filter((n) => n !== 'Open Shift'))).sort();
    return unique.map((s) => ({ value: s, label: s }));
  }, [rows]);

  const handleClientChange = useCallback((clientId: string) => {
    // When client changes, reset site filter since it may no longer be valid
    onChange({ ...filters, client: clientId, site: '' });
  }, [filters, onChange]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[180px]">
        <Select
          label="Client"
          value={filters.client}
          onChange={(e) => handleClientChange(e.target.value)}
          options={[
            { value: '', label: clientsLoading ? 'Loading clients...' : 'All Clients' },
            ...clientOptions,
          ]}
        />
      </div>
      <div className="min-w-[180px]">
        <Select
          label="Site"
          value={filters.site}
          onChange={(e) => onChange({ ...filters, site: e.target.value })}
          options={[
            { value: '', label: sitesLoading ? 'Loading sites...' : 'All Sites' },
            ...filteredSiteOptions,
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

export function applyScheduleFilters<T extends { siteName: string; positionType: string; staffName: string; clientName?: string | null; clientId?: string | null }>(
  rows: T[],
  filters: ScheduleFilterState,
): T[] {
  return rows.filter((row) => {
    if (filters.client && row.clientId !== filters.client) return false;
    if (filters.site && row.siteName !== filters.site) return false;
    if (filters.position && row.positionType !== filters.position) return false;
    if (filters.staff && row.staffName !== filters.staff) return false;
    return true;
  });
}
