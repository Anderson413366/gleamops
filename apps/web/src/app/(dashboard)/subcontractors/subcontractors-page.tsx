'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { HardHat, Briefcase, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button } from '@gleamops/ui';
import type { Subcontractor } from '@gleamops/shared';

import SubcontractorsTable from './directory/subcontractors-table';
import { SubcontractorDetail } from './directory/subcontractor-detail';
import { SubcontractorForm } from '@/components/forms/subcontractor-form';
import SubcontractorJobsTable from './jobs/subcontractor-jobs-table';

const TABS = [
  { key: 'directory', label: 'Directory', icon: <HardHat className="h-4 w-4" /> },
  { key: 'jobs', label: 'Job Details', icon: <Briefcase className="h-4 w-4" /> },
];

export default function SubcontractorsPageClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState(TABS.some(t => t.key === initialTab) ? initialTab! : TABS[0].key);
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<Subcontractor | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Subcontractor | null>(null);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subcontractors</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage external contractors and vendors</p>
        </div>
        <Button onClick={() => { setEditItem(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          New Subcontractor
        </Button>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder="Search subcontractors..." />

      {tab === 'directory' && (
        <SubcontractorsTable
          key={`sub-${refreshKey}`}
          search={search}
          onSelect={(s) => setSelected(s)}
        />
      )}

      {tab === 'jobs' && (
        <SubcontractorJobsTable search={search} />
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
