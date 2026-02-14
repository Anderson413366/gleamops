'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { EmptyState, Badge, Button, Skeleton } from '@gleamops/ui';
import { useAuth } from '@/hooks/use-auth';
import { formatRelative } from '@/lib/utils/date';
import { ThreadDetail } from './thread-detail';
import { ComposeMessage } from './compose-message';

interface ThreadRow {
  id: string;
  subject: string;
  thread_type: string;
  created_at: string;
  updated_at: string;
  last_message?: { body: string; sender_name: string; created_at: string } | null;
  member_count: number;
  is_unread: boolean;
}

interface MessagesTabProps {
  search: string;
}

export default function MessagesTab({ search }: MessagesTabProps) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  const fetchThreads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    // Get threads the current user is a member of
    const { data: memberships } = await supabase
      .from('message_thread_members')
      .select('thread_id, last_read_at')
      .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) {
      setThreads([]);
      setLoading(false);
      return;
    }

    const threadIds = memberships.map((m: { thread_id: string }) => m.thread_id);
    const readMap = new Map(
      memberships.map((m: { thread_id: string; last_read_at: string | null }) => [m.thread_id, m.last_read_at])
    );

    // Fetch the threads
    const { data: threadData } = await supabase
      .from('message_threads')
      .select('id, subject, thread_type, created_at, updated_at')
      .in('id', threadIds)
      .is('archived_at', null)
      .order('updated_at', { ascending: false });

    if (!threadData) {
      setThreads([]);
      setLoading(false);
      return;
    }

    // For each thread, get the latest message and member count
    const threadRows: ThreadRow[] = [];
    for (const t of threadData) {
      const [msgRes, memberRes] = await Promise.all([
        supabase
          .from('messages')
          .select('body, sender_id, created_at')
          .eq('thread_id', t.id)
          .is('archived_at', null)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('message_thread_members')
          .select('id', { count: 'exact', head: true })
          .eq('thread_id', t.id),
      ]);

      const lastMsg = msgRes.data?.[0] ?? null;
      const lastReadAt = readMap.get(t.id);
      const isUnread = lastMsg
        ? !lastReadAt || new Date(lastMsg.created_at) > new Date(lastReadAt)
        : false;

      threadRows.push({
        id: t.id,
        subject: t.subject,
        thread_type: t.thread_type,
        created_at: t.created_at,
        updated_at: t.updated_at,
        last_message: lastMsg
          ? { body: lastMsg.body, sender_name: '', created_at: lastMsg.created_at }
          : null,
        member_count: memberRes.count ?? 0,
        is_unread: isUnread,
      });
    }

    setThreads(threadRows);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  const filtered = useMemo(() => {
    if (!search) return threads;
    const q = search.toLowerCase();
    return threads.filter((t) =>
      t.subject.toLowerCase().includes(q) ||
      (t.last_message?.body ?? '').toLowerCase().includes(q)
    );
  }, [threads, search]);

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setComposeOpen(true)}>
          <Plus className="h-4 w-4" />
          New Message
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-12 w-12" />}
          title="No messages"
          description="Start a conversation with a team member."
        />
      ) : (
        <div className="space-y-1">
          {filtered.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setSelectedThreadId(thread.id)}
              className={`w-full text-left p-4 rounded-lg border transition-colors hover:bg-muted/50 ${
                thread.is_unread
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {thread.is_unread && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                    <p className={`text-sm truncate ${thread.is_unread ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                      {thread.subject}
                    </p>
                  </div>
                  {thread.last_message && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                      {thread.last_message.body}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge color={thread.thread_type === 'TICKET_CONTEXT' ? 'purple' : thread.thread_type === 'GROUP' ? 'blue' : 'gray'}>
                    {thread.thread_type === 'TICKET_CONTEXT' ? 'Ticket' : thread.thread_type === 'GROUP' ? 'Group' : 'Direct'}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {formatRelative(thread.last_message?.created_at ?? thread.updated_at)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <ThreadDetail
        threadId={selectedThreadId}
        open={!!selectedThreadId}
        onClose={() => { setSelectedThreadId(null); fetchThreads(); }}
      />

      <ComposeMessage
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onCreated={(threadId) => {
          setComposeOpen(false);
          setSelectedThreadId(threadId);
          fetchThreads();
        }}
      />
    </div>
  );
}
