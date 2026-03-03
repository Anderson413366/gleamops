'use client';

import { useState, useCallback, useEffect } from 'react';
import { Award, BookOpen, CalendarCheck, Plus, ShieldAlert } from 'lucide-react';
import { SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import CertificationsTable from './certifications/certifications-table';
import CoursesTable from './training/courses-table';
import CompletionsTable from './training/completions-table';
import SafetyDocumentsTable from './documents/safety-documents-table';
import ComplianceCalendar from './calendar/compliance-calendar';
import IncidentsTable from './incidents/incidents-table';

const TABS = [
  { key: 'certifications', label: 'Certifications', icon: <Award className="h-4 w-4" /> },
  { key: 'training', label: 'Training', icon: <BookOpen className="h-4 w-4" /> },
  { key: 'incidents', label: 'Incidents', icon: <ShieldAlert className="h-4 w-4" /> },
  { key: 'calendar', label: 'Calendar', icon: <CalendarCheck className="h-4 w-4" /> },
];

export default function SafetyPageClient() {
  const [tab] = useSyncedTab({
    tabKeys: TABS.map((entry) => entry.key),
    defaultTab: 'certifications',
    aliases: {
      courses: 'training',
      completions: 'training',
      documents: 'training',
      'training-courses': 'training',
      'training-completions': 'training',
      'safety-documents': 'training',
      'audit-center': 'calendar',
      'compliance-calendar': 'calendar',
    },
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoCreate, setAutoCreate] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [tabKpis, setTabKpis] = useState<{ label: string; value: number | string; warn?: boolean }[]>([
    { label: 'Certs Expiring (30d)', value: 0 },
    { label: 'Expired Certifications', value: 0 },
    { label: 'Docs Needing Review', value: 0 },
    { label: 'Completions Expiring', value: 0 },
  ]);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const canAdd = ['certifications', 'training'].includes(tab);

  const handleAdd = () => {
    if (tab === 'training') {
      setFormOpen(true);
    } else {
      setAutoCreate(true);
    }
  };

  const addLabel: Record<string, string> = {
    certifications: 'New Certification',
    training: 'New Course',
  };

  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const today = new Date();
      const in30Days = new Date(today);
      in30Days.setDate(in30Days.getDate() + 30);
      const todayStr = today.toISOString().slice(0, 10);
      const in30DaysStr = in30Days.toISOString().slice(0, 10);

      if (tab === 'incidents') {
        const [openRes, totalRes, highPriorityRes] = await Promise.all([
          supabase.from('issues').select('id').is('archived_at', null).in('issue_type', ['SAFETY_ISSUE', 'MAINTENANCE_REPAIR', 'ACCESS_PROBLEM', 'OTHER']).in('status', ['OPEN', 'IN_PROGRESS']),
          supabase.from('issues').select('id').is('archived_at', null).in('issue_type', ['SAFETY_ISSUE', 'MAINTENANCE_REPAIR', 'ACCESS_PROBLEM', 'OTHER']),
          supabase.from('issues').select('id').is('archived_at', null).in('issue_type', ['SAFETY_ISSUE', 'MAINTENANCE_REPAIR', 'ACCESS_PROBLEM', 'OTHER']).in('priority', ['HIGH', 'CRITICAL']),
        ]);
        setTabKpis([
          { label: 'Open Incidents', value: openRes.data?.length ?? 0, warn: (openRes.data?.length ?? 0) > 0 },
          { label: 'High/Critical', value: highPriorityRes.data?.length ?? 0, warn: (highPriorityRes.data?.length ?? 0) > 0 },
          { label: 'Total Incidents', value: totalRes.data?.length ?? 0 },
          { label: 'Resolved', value: Math.max((totalRes.data?.length ?? 0) - (openRes.data?.length ?? 0), 0) },
        ]);
      } else {
        const [expiringRes, expiredRes, docsReviewRes, completionRes] = await Promise.all([
          supabase.from('staff_certifications').select('id').is('archived_at', null).gte('expiry_date', todayStr).lte('expiry_date', in30DaysStr),
          supabase.from('staff_certifications').select('id').is('archived_at', null).eq('status', 'EXPIRED'),
          supabase.from('safety_documents').select('id').is('archived_at', null).in('status', ['UNDER_REVIEW', 'EXPIRED']),
          supabase.from('training_completions').select('id').is('archived_at', null).gte('expiry_date', todayStr).lte('expiry_date', in30DaysStr),
        ]);
        setTabKpis([
          { label: 'Certs Expiring (30d)', value: expiringRes.data?.length ?? 0, warn: (expiringRes.data?.length ?? 0) > 0 },
          { label: 'Expired Certifications', value: expiredRes.data?.length ?? 0, warn: (expiredRes.data?.length ?? 0) > 0 },
          { label: 'Docs Needing Review', value: docsReviewRes.data?.length ?? 0, warn: (docsReviewRes.data?.length ?? 0) > 0 },
          { label: 'Completions Expiring', value: completionRes.data?.length ?? 0 },
        ]);
      }
    }
    fetchKpis();
  }, [tab, refreshKey]);

  return (
    <div className="space-y-6">
      <div className="pt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tabKpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={`text-lg font-semibold sm:text-xl leading-tight${kpi.warn ? ' text-warning' : ''}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
        {tab !== 'calendar' && (
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${tab}...`}
            className="w-56 sm:w-72 lg:w-80"
          />
        )}
        {canAdd && (
          <Button className="shrink-0" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {addLabel[tab] ?? 'Add'}
          </Button>
        )}
      </div>

      {tab === 'certifications' && (
        <CertificationsTable
          key={`certs-${refreshKey}`}
          search={search}
          autoCreate={autoCreate}
          onAutoCreateHandled={() => setAutoCreate(false)}
        />
      )}
      {tab === 'training' && (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Courses</h2>
            <CoursesTable
              key={`courses-${refreshKey}`}
              search={search}
              formOpen={formOpen}
              onFormClose={() => setFormOpen(false)}
              onRefresh={refresh}
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Completions</h2>
            <CompletionsTable
              key={`comp-${refreshKey}`}
              search={search}
              autoCreate={autoCreate}
              onAutoCreateHandled={() => setAutoCreate(false)}
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Safety Docs</h2>
            <SafetyDocumentsTable
              key={`docs-${refreshKey}`}
              search={search}
              autoCreate={false}
            />
          </section>
        </div>
      )}
      {tab === 'incidents' && <IncidentsTable key={`inc-${refreshKey}`} search={search} />}
      {tab === 'calendar' && <ComplianceCalendar key={`cal-${refreshKey}`} />}
    </div>
  );
}
