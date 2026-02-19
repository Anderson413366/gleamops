'use client';

import { useState, useEffect } from 'react';
import { HardHat, Briefcase, Store, Plus } from 'lucide-react';
import { Button, Card, CardContent, cn } from '@gleamops/ui';
import type { Subcontractor } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import SubcontractorsTable from '../vendors/subcontractors/subcontractors-table';
import SubcontractorJobsTable from '../vendors/jobs/subcontractor-jobs-table';
import VendorsTable from '../vendors/vendor-directory/vendors-table';
import { SubcontractorForm } from '@/components/forms/subcontractor-form';

const SUBTABS = [
  { key: 'subcontractors', label: 'Subcontractors', icon: <HardHat className="h-3.5 w-3.5" /> },
  { key: 'jobs', label: 'Job Details', icon: <Briefcase className="h-3.5 w-3.5" /> },
  { key: 'supply-vendors', label: 'Supply Vendors', icon: <Store className="h-3.5 w-3.5" /> },
];

const ADD_LABELS: Record<string, string> = {
  subcontractors: 'New Subcontractor',
  'supply-vendors': 'New Supply Vendor',
};

interface VendorsPanelProps {
  search: string;
  refreshKey: number;
  onRefresh: () => void;
}

export default function VendorsPanel({ search, refreshKey, onRefresh }: VendorsPanelProps) {
  const [subTab, setSubTab] = useState('subcontractors');
  const [subFormOpen, setSubFormOpen] = useState(false);
  const [vendorFormOpen, setVendorFormOpen] = useState(false);
  const [editSub, setEditSub] = useState<Subcontractor | null>(null);
  const [kpis, setKpis] = useState({
    activeSubs: 0,
    pendingSubs: 0,
    missingW9: 0,
    supplyVendors: 0,
  });

  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const [activeRes, pendingRes, w9Res, vendorsRes] = await Promise.all([
        supabase.from('subcontractors').select('id', { count: 'exact', head: true }).is('archived_at', null).not('subcontractor_code', 'like', 'VEN-%').eq('status', 'ACTIVE'),
        supabase.from('subcontractors').select('id', { count: 'exact', head: true }).is('archived_at', null).not('subcontractor_code', 'like', 'VEN-%').eq('status', 'PENDING'),
        supabase.from('subcontractors').select('id', { count: 'exact', head: true }).is('archived_at', null).not('subcontractor_code', 'like', 'VEN-%').eq('w9_on_file', false),
        supabase.from('supply_catalog').select('preferred_vendor').is('archived_at', null).not('preferred_vendor', 'is', null),
      ]);

      const uniqueVendors = new Set(
        (vendorsRes.data ?? []).map((row) => String(row.preferred_vendor ?? '').trim()).filter(Boolean)
      );

      setKpis({
        activeSubs: activeRes.count ?? 0,
        pendingSubs: pendingRes.count ?? 0,
        missingW9: w9Res.count ?? 0,
        supplyVendors: uniqueVendors.size,
      });
    }
    fetchKpis();
  }, [refreshKey]);

  const addLabel = ADD_LABELS[subTab];

  const handleAdd = () => {
    if (subTab === 'subcontractors') {
      setEditSub(null);
      setSubFormOpen(true);
    } else if (subTab === 'supply-vendors') {
      setVendorFormOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {SUBTABS.map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => setSubTab(st.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                subTab === st.key
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {st.icon}
              {st.label}
            </button>
          ))}
        </div>
        {addLabel && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Active Subcontractors</p><p className="text-lg font-semibold">{kpis.activeSubs}</p></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Pending Approvals</p><p className="text-lg font-semibold text-warning">{kpis.pendingSubs}</p></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Missing W-9</p><p className="text-lg font-semibold text-warning">{kpis.missingW9}</p></CardContent></Card>
        <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Supply Vendors</p><p className="text-lg font-semibold">{kpis.supplyVendors}</p></CardContent></Card>
      </div>

      {subTab === 'subcontractors' && <SubcontractorsTable key={`sub-${refreshKey}`} search={search} />}
      {subTab === 'jobs' && <SubcontractorJobsTable search={search} />}
      {subTab === 'supply-vendors' && (
        <VendorsTable key={`sv-${refreshKey}`} search={search} formOpen={vendorFormOpen} onFormClose={() => setVendorFormOpen(false)} onRefresh={onRefresh} />
      )}

      <SubcontractorForm
        open={subFormOpen}
        onClose={() => { setSubFormOpen(false); setEditSub(null); }}
        initialData={editSub}
        onSuccess={onRefresh}
      />
    </div>
  );
}
