'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Award, BookOpen, FileText, CalendarCheck, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button, Card, CardContent } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import CertificationsTable from './certifications/certifications-table';
import CoursesTable from './training/courses-table';
import CompletionsTable from './training/completions-table';
import SafetyDocumentsTable from './documents/safety-documents-table';
import ComplianceCalendar from './calendar/compliance-calendar';

const TABS = [
  { key: 'certifications', label: 'Certifications', icon: <Award className="h-4 w-4" /> },
  { key: 'courses', label: 'Training Courses', icon: <BookOpen className="h-4 w-4" /> },
  { key: 'completions', label: 'Completions', icon: <CalendarCheck className="h-4 w-4" /> },
  { key: 'documents', label: 'Safety Docs', icon: <FileText className="h-4 w-4" /> },
  { key: 'calendar', label: 'Compliance Calendar', icon: <CalendarCheck className="h-4 w-4" /> },
];

export default function SafetyPageClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState(TABS.some(t => t.key === initialTab) ? initialTab! : TABS[0].key);
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

  const canAdd = ['certifications', 'courses', 'completions', 'documents'].includes(tab);

  const handleAdd = () => {
    if (tab === 'courses') {
      setFormOpen(true);
    } else {
      setAutoCreate(true);
    }
  };

  const addLabel: Record<string, string> = {
    certifications: 'New Certification',
    courses: 'New Course',
    completions: 'Record Completion',
    documents: 'New Document',
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
            Certifications, Training, Safety Documents, Compliance Calendar
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
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Certs Expiring (30d)</p><p className="text-xl font-semibold text-warning">{kpis.certsExpiring30d}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Expired Certifications</p><p className="text-xl font-semibold text-destructive">{kpis.certsExpired}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Docs Needing Review</p><p className="text-xl font-semibold text-warning">{kpis.docsNeedReview}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Completions Expiring (30d)</p><p className="text-xl font-semibold">{kpis.completionsExpiring30d}</p></CardContent></Card>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab !== 'calendar' && (
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />
      )}

      {tab === 'certifications' && (
        <CertificationsTable
          key={`certs-${refreshKey}`}
          search={search}
          autoCreate={autoCreate}
          onAutoCreateHandled={() => setAutoCreate(false)}
        />
      )}
      {tab === 'courses' && (
        <CoursesTable
          key={`courses-${refreshKey}`}
          search={search}
          formOpen={formOpen}
          onFormClose={() => setFormOpen(false)}
          onRefresh={refresh}
        />
      )}
      {tab === 'completions' && (
        <CompletionsTable
          key={`comp-${refreshKey}`}
          search={search}
          autoCreate={autoCreate}
          onAutoCreateHandled={() => setAutoCreate(false)}
        />
      )}
      {tab === 'documents' && (
        <SafetyDocumentsTable
          key={`docs-${refreshKey}`}
          search={search}
          autoCreate={autoCreate}
          onAutoCreateHandled={() => setAutoCreate(false)}
        />
      )}
      {tab === 'calendar' && <ComplianceCalendar key={`cal-${refreshKey}`} />}
    </div>
  );
}
