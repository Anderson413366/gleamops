'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Award, BookOpen, FileText, CalendarCheck, Plus } from 'lucide-react';
import { ChipTabs, SearchInput, Button } from '@gleamops/ui';

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
