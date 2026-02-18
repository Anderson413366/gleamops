'use client';

import { useState } from 'react';
import { ChipTabs, SearchInput } from '@gleamops/ui';
import { ClipboardList, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import BoardsList from './boards/boards-list';

const TABS = [
  { key: 'boards', label: 'Boards', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'conflicts', label: 'Conflicts', icon: <AlertTriangle className="h-4 w-4" /> },
  { key: 'handoff', label: 'Handoff', icon: <ArrowRightLeft className="h-4 w-4" /> },
];

type TabKey = 'boards' | 'conflicts' | 'handoff';

export default function PlanningPageClient() {
  const [tab, setTab] = useState<TabKey>('boards');
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Planning</h1>
      <ChipTabs tabs={TABS} active={tab} onChange={(t) => setTab(t as TabKey)} />
      <SearchInput value={search} onChange={setSearch} placeholder="Search planning..." />

      {tab === 'boards' && <BoardsList search={search} />}
      {tab === 'conflicts' && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Conflicts view coming soon.
        </div>
      )}
      {tab === 'handoff' && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Handoff view coming soon.
        </div>
      )}
    </div>
  );
}
