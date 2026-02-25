'use client';

import { useState, useCallback, useEffect } from 'react';
import { HardHat, Briefcase, Store, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import type { Subcontractor } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import SubcontractorsTable from './subcontractors/subcontractors-table';
import { SubcontractorForm } from '@/components/forms/subcontractor-form';
import SubcontractorJobsTable from './jobs/subcontractor-jobs-table';
import VendorsTable from './vendor-directory/vendors-table';

const TABS = [
  { key: 'subcontractors', label: 'Subcontractors', icon: <HardHat className="h-4 w-4" /> },
  { key: 'jobs', label: 'Job Details', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'vendors', label: 'Supply Vendors', icon: <Store className="h-4 w-4" /> },
];

const ADD_LABELS: Record<string, string> = {
  subcontractors: 'New Subcontractor',
  vendors: 'New Supply Vendor',
};

export default function VendorsPageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'subcontractors',
    aliases: {
      'job-details': 'jobs',
      'supply-vendors': 'vendors',
    },
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [vendorFormOpen, setVendorFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Subcontractor | null>(null);
  const [kpis, setKpis] = useState({
    activeSubs: 0,
    pendingSubs: 0,
    missingW9: 0,
    supplyVendors: 0,
  });
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const addLabel = ADD_LABELS[tab];

  const handleAdd = () => {
    if (tab === 'subcontractors') {
      setEditItem(null);
      setFormOpen(true);
    } else if (tab === 'vendors') {
      setVendorFormOpen(true);
    }
  };

  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const [activeRes, pendingRes, missingW9Res, vendorsRes] = await Promise.all([
        supabase.from('subcontractors').select('id', { count: 'exact', head: true }).is('archived_at', null).not('subcontractor_code', 'like', 'VEN-%').eq('status', 'ACTIVE'),
        supabase.from('subcontractors').select('id', { count: 'exact', head: true }).is('archived_at', null).not('subcontractor_code', 'like', 'VEN-%').eq('status', 'PENDING'),
        supabase.from('subcontractors').select('id', { count: 'exact', head: true }).is('archived_at', null).not('subcontractor_code', 'like', 'VEN-%').eq('w9_on_file', false),
        supabase.from('supply_catalog').select('preferred_vendor').is('archived_at', null).not('preferred_vendor', 'is', null),
      ]);

      const uniqueVendors = new Set(
        (vendorsRes.data ?? [])
          .map((row) => String(row.preferred_vendor ?? '').trim())
          .filter(Boolean)
      );

      setKpis({
        activeSubs: activeRes.count ?? 0,
        pendingSubs: pendingRes.count ?? 0,
        missingW9: missingW9Res.count ?? 0,
        supplyVendors: uniqueVendors.size,
      });
    }
    fetchKpis();
  }, [refreshKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
          <p className="text-sm text-muted-foreground mt-1">Subcontractors, job details, and supply vendors</p>
        </div>
        {addLabel && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Subcontractors</p><p className="text-xl font-semibold">{kpis.activeSubs}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pending Approvals</p><p className="text-xl font-semibold text-warning">{kpis.pendingSubs}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Missing W-9</p><p className="text-xl font-semibold text-warning">{kpis.missingW9}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Supply Vendors</p><p className="text-xl font-semibold">{kpis.supplyVendors}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search ${tab}...`}
          className="w-full sm:w-72 lg:w-80"
        />
      </div>

      {tab === 'subcontractors' && (
        <SubcontractorsTable
          key={`sub-${refreshKey}`}
          search={search}
        />
      )}

      {tab === 'jobs' && (
        <SubcontractorJobsTable search={search} />
      )}

      {tab === 'vendors' && (
        <VendorsTable
          key={`vendors-${refreshKey}`}
          search={search}
          formOpen={vendorFormOpen}
          onFormClose={() => setVendorFormOpen(false)}
          onRefresh={refresh}
        />
      )}

      <SubcontractorForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        initialData={editItem}
        onSuccess={refresh}
      />
    </div>
  );
}
