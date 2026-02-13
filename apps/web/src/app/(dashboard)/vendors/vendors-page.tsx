'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { HardHat, Briefcase, Store, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button } from '@gleamops/ui';
import type { Subcontractor } from '@gleamops/shared';

import SubcontractorsTable from '../subcontractors/directory/subcontractors-table';
import { SubcontractorDetail } from '../subcontractors/directory/subcontractor-detail';
import { SubcontractorForm } from '@/components/forms/subcontractor-form';
import SubcontractorJobsTable from '../subcontractors/jobs/subcontractor-jobs-table';
import VendorsTable from './vendor-directory/vendors-table';

const TABS = [
  { key: 'subcontractors', label: 'Subcontractors', icon: <HardHat className="h-4 w-4" /> },
  { key: 'jobs', label: 'Job Details', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'vendors', label: 'Supply Vendors', icon: <Store className="h-4 w-4" /> },
];

const ADD_LABELS: Record<string, string> = {
  subcontractors: 'New Subcontractor',
};

export default function VendorsPageClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState(TABS.some(t => t.key === initialTab) ? initialTab! : TABS[0].key);
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<Subcontractor | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Subcontractor | null>(null);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const addLabel = ADD_LABELS[tab];

  const handleAdd = () => {
    if (tab === 'subcontractors') {
      setEditItem(null);
      setFormOpen(true);
    }
  };

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

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />

      {tab === 'subcontractors' && (
        <SubcontractorsTable
          key={`sub-${refreshKey}`}
          search={search}
          onSelect={(s) => setSelected(s)}
        />
      )}

      {tab === 'jobs' && (
        <SubcontractorJobsTable search={search} />
      )}

      {tab === 'vendors' && (
        <VendorsTable key={`vendors-${refreshKey}`} search={search} />
      )}

      <SubcontractorDetail
        subcontractor={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onEdit={(s) => {
          setSelected(null);
          setEditItem(s);
          setFormOpen(true);
        }}
      />

      <SubcontractorForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        initialData={editItem}
        onSuccess={refresh}
      />
    </div>
  );
}
