'use client';

import { useState, useCallback, useEffect } from 'react';
import { Award, BookOpen, CalendarCheck, Plus, ShieldAlert } from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent } from '@gleamops/ui';
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
  const [tab, setTab] = useSyncedTab({
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
  const [kpis, setKpis] = useState({
    certsExpiring30d: 0,
    certsExpired: 0,
    docsNeedReview: 0,
    completionsExpiring30d: 0,
  });
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

      const [expiringRes, expiredRes, docsReviewRes, completionRes] = await Promise.all([
        supabase
          .from('staff_certifications')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null)
          .gte('expiry_date', todayStr)
          .lte('expiry_date', in30DaysStr),
        supabase
          .from('staff_certifications')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null)
          .eq('status', 'EXPIRED'),
        supabase
          .from('safety_documents')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null)
          .in('status', ['UNDER_REVIEW', 'EXPIRED']),
        supabase
          .from('training_completions')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null)
          .gte('expiry_date', todayStr)
          .lte('expiry_date', in30DaysStr),
      ]);

      setKpis({
        certsExpiring30d: expiringRes.count ?? 0,
        certsExpired: expiredRes.count ?? 0,
        docsNeedReview: docsReviewRes.count ?? 0,
        completionsExpiring30d: completionRes.count ?? 0,
      });
    }
    fetchKpis();
  }, [refreshKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Safety & Compliance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Certifications, training, incidents, and compliance calendar
          </p>
        </div>
        {canAdd && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {addLabel[tab] ?? 'Add'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Certs Expiring (30d)</p><p className="text-lg font-semibold sm:text-xl leading-tight text-warning">{kpis.certsExpiring30d}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Expired Certifications</p><p className="text-lg font-semibold sm:text-xl leading-tight text-destructive">{kpis.certsExpired}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Docs Needing Review</p><p className="text-lg font-semibold sm:text-xl leading-tight text-warning">{kpis.docsNeedReview}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Completions Expiring (30d)</p><p className="text-lg font-semibold sm:text-xl leading-tight">{kpis.completionsExpiring30d}</p></CardContent></Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
        {tab !== 'calendar' && (
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${tab}...`}
            className="w-full sm:w-72 lg:w-80 lg:ml-auto"
          />
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
