'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, Send, MessageSquare, Users } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SlideOver, Badge, Button, Card, CardContent, Skeleton } from '@gleamops/ui';
import type { BadgeColor } from '@gleamops/ui';
import type { Message, MessageThread } from '@gleamops/shared';
import { formatDateTime, formatRelative } from '@/lib/utils/date';

interface MessageWithSender extends Message {
  sender?: { full_name: string; staff_code: string } | null;
}

interface ThreadMemberInfo {
  id: string;
  user_id: string;
  role: string;
  staff?: { full_name: string; staff_code: string } | null;
}

const THREAD_TYPE_COLORS: Record<string, BadgeColor> = {
  DIRECT: 'blue',
  GROUP: 'purple',
  TICKET_CONTEXT: 'orange',
};

interface ThreadDetailProps {
  threadId: string;
  threadSubject: string;
  threadType: string;
  open: boolean;
  onClose: () => void;
}

export function ThreadDetail({ threadId, threadSubject, threadType, open, onClose }: ThreadDetailProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [members, setMembers] = useState<ThreadMemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!threadId || !open) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    // Fetch messages and members in parallel
    const [messagesRes, membersRes] = await Promise.all([
      supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .is('archived_at', null)
        .order('created_at', { ascending: true }),
      supabase
        .from('message_thread_members')
        .select('id, user_id, role')
        .eq('thread_id', threadId),
    ]);

    // Get all unique sender IDs from messages
    const senderIds = new Set<string>();
    if (messagesRes.data) {
      for (const msg of messagesRes.data) {
        senderIds.add(msg.sender_id);
      }
    }
    // Also add member user_ids
    if (membersRes.data) {
      for (const mem of membersRes.data) {
        senderIds.add(mem.user_id);
      }
    }

    // Fetch staff info for all users
    let staffMap = new Map<string, { full_name: string; staff_code: string }>();
    if (senderIds.size > 0) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('user_id, full_name, staff_code')
        .in('user_id', Array.from(senderIds))
        .is('archived_at', null);
      if (staffData) {
        for (const s of staffData) {
          if (s.user_id) {
            staffMap.set(s.user_id, { full_name: s.full_name, staff_code: s.staff_code });
          }
        }
      }
    }

    // Enrich messages with sender info
    const enrichedMessages: MessageWithSender[] = (messagesRes.data ?? []).map((msg) => ({
      ...msg,
      sender: staffMap.get(msg.sender_id) ?? null,
    }));

    // Enrich members with staff info
    const enrichedMembers: ThreadMemberInfo[] = (membersRes.data ?? []).map((mem) => ({
      ...mem,
      staff: staffMap.get(mem.user_id) ?? null,
    }));

    setMessages(enrichedMessages);
    setMembers(enrichedMembers);
    setLoading(false);

    // Update last_read_at for the current user
    if (user) {
      await supabase
        .from('message_thread_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .eq('user_id', user.id);
    }
  }, [threadId, open]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { if (!loading) scrollToBottom(); }, [loading, messages.length, scrollToBottom]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);

    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to send messages.', { duration: Infinity });
      setSending(false);
      return;
    }

    const tenantId = user.app_metadata?.tenant_id;
    const { error } = await supabase
      .from('messages')
      .insert({
        tenant_id: tenantId,
        thread_id: threadId,
        sender_id: user.id,
        body: newMessage.trim(),
      });

    if (error) {
      toast.error(`Failed to send message: ${error.message}`, { duration: Infinity });
      setSending(false);
      return;
    }

    // Update thread updated_at
    await supabase
      .from('message_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId);

    setNewMessage('');
    setSending(false);
    await fetchMessages();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  function getInitials(name: string): string {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return (
    <SlideOver open={open} onClose={onClose} title={threadSubject} wide>
      <div className="flex flex-col h-full -mt-2">
        {/* Header with back button + thread info */}
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              aria-label="Back to threads"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h3 className="text-sm font-semibold">{threadSubject}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge color={THREAD_TYPE_COLORS[threadType] ?? 'gray'} className="text-[10px]">
                  {threadType}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Members strip */}
        {members.length > 0 && (
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {members.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full text-[11px] text-muted-foreground"
                title={m.staff?.full_name ?? m.user_id}
              >
                {m.staff?.full_name ?? 'Unknown'}
                {m.role === 'ADMIN' && (
                  <span className="text-[9px] font-bold text-primary">ADMIN</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Message list */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-[200px] max-h-[calc(100vh-380px)]">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-3/4" />
              <Skeleton className="h-16 w-2/3 ml-auto" />
              <Skeleton className="h-16 w-3/4" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_id === currentUserId;
              const senderName = msg.sender?.full_name ?? 'Unknown User';
              const initials = getInitials(senderName);

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                    title={senderName}
                  >
                    {initials}
                  </div>

                  {/* Message bubble */}
                  <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className={`text-xs font-medium ${isOwn ? 'text-right w-full' : ''}`}>
                        {isOwn ? 'You' : senderName}
                      </span>
                    </div>
                    <div
                      className={`rounded-lg px-3 py-2 text-sm ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    </div>
                    <p className={`text-[10px] text-muted-foreground mt-0.5 ${isOwn ? 'text-right' : ''}`}>
                      {formatRelative(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Compose area */}
        <div className="border-t border-border pt-3 mt-auto">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
              rows={2}
              className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              loading={sending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </SlideOver>
  );
}
