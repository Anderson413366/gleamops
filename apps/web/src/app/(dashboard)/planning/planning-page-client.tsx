'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChipTabs, SearchInput, EmptyState, Badge, Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableSkeleton } from '@gleamops/ui';
import { ClipboardList, AlertTriangle, FileText, Send } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';
import BoardsList from './boards/boards-list';

const TABS = [
  { key: 'tonight-board', label: 'Tonight Board', icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'conflict-lane', label: 'Conflict Lane', icon: <AlertTriangle className="h-4 w-4" /> },
  { key: 'handoff-notes', label: 'Handoff Notes', icon: <FileText className="h-4 w-4" /> },
  { key: 'publish-handoff', label: 'Publish Handoff', icon: <Send className="h-4 w-4" /> },
];

type TabKey = 'tonight-board' | 'conflict-lane' | 'handoff-notes' | 'publish-handoff';

interface ConflictRow {
  id: string;
  board_item_id: string;
  conflict_type: string;
  severity: string;
  description: string;
  resolved: boolean;
  created_at: string;
  board_item?: { title: string; board?: { title: string } | null } | null;
}

export default function PlanningPageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((t) => t.key),
    defaultTab: 'tonight-board',
    aliases: { boards: 'tonight-board', conflicts: 'conflict-lane', handoff: 'handoff-notes' },
  });
  const [search, setSearch] = useState('');
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);
  const [conflictsLoading, setConflictsLoading] = useState(false);

  // Load conflicts when conflict-lane tab is active
  useEffect(() => {
    if (tab !== 'conflict-lane') return;
    let cancelled = false;
    async function load() {
      setConflictsLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('planning_board_conflicts')
        .select('*, board_item:planning_board_items(title, board:planning_boards(title))')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!cancelled) {
        setConflicts((data ?? []) as ConflictRow[]);
        setConflictsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tab]);

  const filteredConflicts = useMemo(() => {
    if (!search) return conflicts;
    const s = search.toLowerCase();
    return conflicts.filter(
      (c) =>
        c.conflict_type?.toLowerCase().includes(s) ||
        c.description?.toLowerCase().includes(s) ||
        c.board_item?.title?.toLowerCase().includes(s)
    );
  }, [conflicts, search]);

  const SEVERITY_COLORS: Record<string, 'red' | 'yellow' | 'orange' | 'gray'> = {
    blocking: 'red',
    warning: 'yellow',
    info: 'gray',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Evening Planning</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tonight Board, Conflict Lane, Handoff Notes, Publish Handoff
        </p>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={(t) => setTab(t as TabKey)} />
      <SearchInput value={search} onChange={setSearch} placeholder="Search planning..." />

      {tab === 'tonight-board' && <BoardsList search={search} />}

      {tab === 'conflict-lane' && (
        conflictsLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : filteredConflicts.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="h-10 w-10" />}
            title="No Active Conflicts"
            description="All planning items are clear of scheduling conflicts."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Board Item</TableHead>
                <TableHead>Board</TableHead>
                <TableHead>Conflict Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConflicts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.board_item?.title ?? '-'}</TableCell>
                  <TableCell>{c.board_item?.board?.title ?? '-'}</TableCell>
                  <TableCell>{c.conflict_type?.replace(/_/g, ' ')}</TableCell>
                  <TableCell>
                    <Badge color={SEVERITY_COLORS[c.severity] ?? 'gray'}>
                      {c.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{c.description}</TableCell>
                  <TableCell>
                    <Badge color={c.resolved ? 'green' : 'red'}>
                      {c.resolved ? 'Resolved' : 'Active'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      )}

      {tab === 'handoff-notes' && (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="Handoff Notes"
          description="Document important information for the next shift or day crew."
          bullets={[
            'Create notes tied to specific boards or tickets',
            'Tag notes by priority and category',
            'Notes persist until acknowledged by next crew',
          ]}
        />
      )}

      {tab === 'publish-handoff' && (
        <EmptyState
          icon={<Send className="h-10 w-10" />}
          title="Publish Handoff"
          description="Finalize and publish evening planning decisions to the schedule."
          bullets={[
            'Review all applied proposals for the night',
            'Attach handoff notes to published changes',
            'Notify affected staff and supervisors',
          ]}
        />
      )}
    </div>
  );
}
