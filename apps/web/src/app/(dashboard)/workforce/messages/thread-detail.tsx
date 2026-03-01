'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Send } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SlideOver, Badge, Skeleton } from '@gleamops/ui';
import { useAuth } from '@/hooks/use-auth';
import { useRealtime } from '@/hooks/use-realtime';
import { formatRelative } from '@/lib/utils/date';

interface MessageRow {
  id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
}

interface ThreadInfo {
  id: string;
  subject: string;
  thread_type: string;
  ticket_id: string | null;
}

interface ThreadDetailProps {
  threadId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ThreadDetail({ threadId, open, onClose }: ThreadDetailProps) {
  const { user } = useAuth();
  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchThread = useCallback(async () => {
    if (!threadId || !open) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    // Fetch thread info
    const { data: threadData } = await supabase
      .from('message_threads')
      .select('id, subject, thread_type, ticket_id')
      .eq('id', threadId)
      .single();

    if (threadData) setThread(threadData as ThreadInfo);

    // Fetch messages with sender info
    const { data: msgData } = await supabase
      .from('messages')
      .select('id, sender_id, body, created_at')
      .eq('thread_id', threadId)
      .is('archived_at', null)
      .order('created_at', { ascending: true });

    if (msgData) {
      // Resolve sender names
      const senderIds = [...new Set(msgData.map((m: { sender_id: string }) => m.sender_id))];
      const { data: staffData } = await supabase
        .from('staff')
        .select('user_id, full_name')
        .in('user_id', senderIds);

      const nameMap = new Map<string, string>();
      if (staffData) {
        for (const s of staffData) {
          if (s.user_id) nameMap.set(s.user_id, s.full_name);
        }
      }

      setMessages(
        msgData.map((m: { id: string; sender_id: string; body: string; created_at: string }) => ({
          id: m.id,
          sender_id: m.sender_id,
          sender_name: nameMap.get(m.sender_id) ?? 'Unknown',
          body: m.body,
          created_at: m.created_at,
        }))
      );
    }

    // Update last_read_at
    if (user) {
      await supabase
        .from('message_thread_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .eq('user_id', user.id);
    }

    setLoading(false);
  }, [threadId, open, user]);

  useEffect(() => { fetchThread(); }, [fetchThread]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Realtime subscription for new messages
  useRealtime({
    table: 'messages',
    event: 'INSERT',
    filter: threadId ? `thread_id=eq.${threadId}` : undefined,
    enabled: !!threadId && open,
    onData: (payload) => {
      const newMsg = payload.new as { id: string; sender_id: string; body: string; created_at: string };
      // Avoid duplicates
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, {
          id: newMsg.id,
          sender_id: newMsg.sender_id,
          sender_name: newMsg.sender_id === user?.id ? 'You' : 'Staff',
          body: newMsg.body,
          created_at: newMsg.created_at,
        }];
      });
    },
  });

  const handleSend = async () => {
    if (!newMessage.trim() || !threadId || !user) return;
    setSending(true);

    const supabase = getSupabaseBrowserClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const tenantId = authUser?.app_metadata?.tenant_id;

    const { error } = await supabase.from('messages').insert({
      tenant_id: tenantId,
      thread_id: threadId,
      sender_id: user.id,
      body: newMessage.trim(),
    });

    if (!error) {
      // Also bump thread updated_at
      await supabase
        .from('message_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', threadId);

      // Update own last_read_at
      await supabase
        .from('message_thread_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .eq('user_id', user.id);

      setNewMessage('');
    }

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!threadId) return null;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={thread?.subject ?? 'Conversation'}
      subtitle={thread?.thread_type === 'TICKET_CONTEXT' ? 'Ticket Context' : undefined}
      wide
    >
      <div className="flex flex-col h-full min-h-[400px]">
        {/* Thread type badge */}
        {thread && (
          <div className="mb-3">
            <Badge
              color={thread.thread_type === 'TICKET_CONTEXT' ? 'purple' : thread.thread_type === 'GROUP' ? 'blue' : 'gray'}
            >
              {thread.thread_type === 'TICKET_CONTEXT' ? 'Ticket' : thread.thread_type === 'GROUP' ? 'Group' : 'Direct'}
            </Badge>
          </div>
        )}

        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1"
          style={{ maxHeight: 'calc(100vh - 300px)' }}
        >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-3/4" />
              <Skeleton className="h-16 w-2/3 ml-auto" />
              <Skeleton className="h-16 w-3/4" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No messages yet. Start the conversation below.
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    {!isMe && (
                      <p className="text-[11px] font-semibold mb-0.5 opacity-70">
                        {msg.sender_name}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                    <p className={`text-[11px] mt-1 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {formatRelative(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-border pt-3">
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              rows={1}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="rounded-lg bg-primary text-primary-foreground p-2.5 hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </div>
    </SlideOver>
  );
}
