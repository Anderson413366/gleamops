'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Globe, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchJsonWithSupabaseAuth } from '@/lib/supabase/authenticated-fetch';
import {
  Badge, Button, Card, CardContent, Select, Skeleton, EmptyState,
} from '@gleamops/ui';
import type { SchedulePolicy, EnforcementMode } from '@gleamops/shared';
import { SchedulePolicyForm } from '@/components/forms/schedule-policy-form';

interface SiteOption { value: string; label: string }

const ENFORCEMENT_BADGE: Record<EnforcementMode, { color: 'yellow' | 'red' | 'orange'; label: string }> = {
  warn: { color: 'yellow', label: 'Warn' },
  block: { color: 'red', label: 'Block' },
  override_required: { color: 'orange', label: 'Override Required' },
};

function PolicyCard({ policy, onEdit }: { policy: SchedulePolicy; onEdit: () => void }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Min Rest Hours</dt>
            <dd className="font-medium tabular-nums">{policy.min_rest_hours}h</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Max Weekly Hours</dt>
            <dd className="font-medium tabular-nums">{policy.max_weekly_hours}h</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Overtime Warning At</dt>
            <dd className="font-medium tabular-nums">{policy.overtime_warning_at_hours}h</dd>
          </div>
        </dl>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enforcement Rules</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['Rest', policy.rest_enforcement],
              ['Weekly Hours', policy.weekly_hours_enforcement],
              ['Subcontractor Capacity', policy.subcontractor_capacity_enforcement],
              ['Availability', policy.availability_enforcement],
            ] as const).map(([label, mode]) => {
              const badge = ENFORCEMENT_BADGE[mode];
              return (
                <div key={label} className="flex items-center justify-between p-2 rounded-lg border border-border text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <Badge color={badge.color}>{badge.label}</Badge>
                </div>
              );
            })}
          </div>
        </div>

        <Button size="sm" variant="secondary" onClick={onEdit}>Edit Policy</Button>
      </CardContent>
    </Card>
  );
}

export default function PoliciesClient() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [globalPolicy, setGlobalPolicy] = useState<SchedulePolicy | null>(null);
  const [sitePolicy, setSitePolicy] = useState<SchedulePolicy | null>(null);
  const [loading, setLoading] = useState(true);

  const [sites, setSites] = useState<SiteOption[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SchedulePolicy | null>(null);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);

  // Load sites
  useEffect(() => {
    supabase
      .from('sites')
      .select('id, name, site_code')
      .is('archived_at', null)
      .order('name')
      .then(({ data }) => {
        if (data) {
          setSites(data.map((s) => ({ value: s.id, label: `${s.name} (${s.site_code})` })));
        }
      });
  }, [supabase]);

  // Load global policy
  const fetchGlobal = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchJsonWithSupabaseAuth<{ success: boolean; data: SchedulePolicy[] }>(
        supabase,
        '/api/schedule/policies',
      );
      const global = res.data.find((p) => !p.site_id) ?? null;
      setGlobalPolicy(global);
    } catch {
      // no-op
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchGlobal(); }, [fetchGlobal]);

  // Load site-specific policy
  const fetchSitePolicy = useCallback(async () => {
    if (!selectedSiteId) {
      setSitePolicy(null);
      return;
    }
    try {
      const res = await fetchJsonWithSupabaseAuth<{ success: boolean; data: SchedulePolicy[] }>(
        supabase,
        `/api/schedule/policies?siteId=${encodeURIComponent(selectedSiteId)}`,
      );
      setSitePolicy(res.data[0] ?? null);
    } catch {
      setSitePolicy(null);
    }
  }, [selectedSiteId, supabase]);

  useEffect(() => { fetchSitePolicy(); }, [fetchSitePolicy]);

  const handleEditGlobal = () => {
    setEditingPolicy(globalPolicy);
    setEditingSiteId(null);
    setFormOpen(true);
  };

  const handleEditSite = () => {
    setEditingPolicy(sitePolicy);
    setEditingSiteId(selectedSiteId);
    setFormOpen(true);
  };

  const handleCreateSite = () => {
    setEditingPolicy(null);
    setEditingSiteId(selectedSiteId);
    setFormOpen(true);
  };

  const handleSuccess = () => {
    fetchGlobal();
    fetchSitePolicy();
    setFormOpen(false);
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push('/schedule')}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Schedule
      </button>

      <header>
        <h1 className="text-2xl font-semibold text-foreground">Schedule Policies</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure enforcement rules for rest periods, weekly hours, and availability.
        </p>
      </header>

      {/* Global Policy */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Global Policy</h2>
        </div>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : globalPolicy ? (
          <PolicyCard policy={globalPolicy} onEdit={handleEditGlobal} />
        ) : (
          <Card>
            <CardContent className="py-8">
              <EmptyState
                title="No global policy"
                description="Create a tenant-wide default policy."
                actionLabel="Create Global Policy"
                onAction={handleEditGlobal}
              />
            </CardContent>
          </Card>
        )}
      </section>

      {/* Site-Specific */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Site-Specific Policy</h2>
        </div>
        <div className="max-w-sm">
          <Select
            label="Site"
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            options={[{ value: '', label: 'Select a site...' }, ...sites]}
          />
        </div>
        {selectedSiteId && (
          sitePolicy ? (
            <PolicyCard policy={sitePolicy} onEdit={handleEditSite} />
          ) : (
            <Card>
              <CardContent className="py-8">
                <EmptyState
                  title="No site policy"
                  description="This site uses the global policy. Create a site-specific override."
                  actionLabel="Create Site Policy"
                  onAction={handleCreateSite}
                />
              </CardContent>
            </Card>
          )
        )}
      </section>

      <SchedulePolicyForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={editingPolicy}
        siteId={editingSiteId}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
