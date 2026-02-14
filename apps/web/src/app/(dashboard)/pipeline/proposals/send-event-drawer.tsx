'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle, Eye, Link2, AlertTriangle, ShieldAlert, Mail, ChevronDown, ChevronRight,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SlideOver, Badge, Skeleton } from '@gleamops/ui';
import type { SalesProposalSend, SalesEmailEvent } from '@gleamops/shared';

interface SendEventDrawerProps {
  sendId: string | null;
  open: boolean;
  onClose: () => void;
}

const EVENT_CONFIG: Record<string, { icon: typeof Mail; color: string; badgeColor: 'green' | 'yellow' | 'blue' | 'red' | 'gray' }> = {
  delivered: { icon: CheckCircle, color: 'text-green-500', badgeColor: 'green' },
  open: { icon: Eye, color: 'text-yellow-500', badgeColor: 'yellow' },
  click: { icon: Link2, color: 'text-blue-500', badgeColor: 'blue' },
  bounce: { icon: AlertTriangle, color: 'text-red-500', badgeColor: 'red' },
  spam: { icon: ShieldAlert, color: 'text-red-500', badgeColor: 'red' },
};

const STATUS_BADGE_COLOR: Record<string, 'blue' | 'green' | 'yellow' | 'red' | 'gray'> = {
  QUEUED: 'gray',
  SENDING: 'blue',
  SENT: 'blue',
  DELIVERED: 'green',
  OPENED: 'yellow',
  BOUNCED: 'red',
  FAILED: 'red',
};

export function SendEventDrawer({ sendId, open, onClose }: SendEventDrawerProps) {
  const [send, setSend] = useState<SalesProposalSend | null>(null);
  const [events, setEvents] = useState<SalesEmailEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPayloads, setExpandedPayloads] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!sendId) return;
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const [sendRes, eventsRes] = await Promise.all([
      supabase
        .from('sales_proposal_sends')
        .select('*')
        .eq('id', sendId)
        .single(),
      supabase
        .from('sales_email_events')
        .select('*')
        .eq('proposal_send_id', sendId)
        .order('created_at', { ascending: true }),
    ]);

    if (sendRes.data) setSend(sendRes.data as unknown as SalesProposalSend);
    if (eventsRes.data) setEvents(eventsRes.data as unknown as SalesEmailEvent[]);
    setLoading(false);
  }, [sendId]);

  useEffect(() => {
    if (open && sendId) {
      fetchData();
      setExpandedPayloads(new Set());
    }
  }, [open, sendId, fetchData]);

  const togglePayload = useCallback((eventId: string) => {
    setExpandedPayloads((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }, []);

  return (
    <SlideOver open={open} onClose={onClose} title="Send Details" wide>
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !send ? (
        <p className="text-sm text-muted-foreground">Send record not found.</p>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{send.recipient_email}</span>
              {send.recipient_name && (
                <span className="text-sm text-muted-foreground">
                  ({send.recipient_name})
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge color={STATUS_BADGE_COLOR[send.status] ?? 'gray'}>
                {send.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {send.sent_at
                  ? `Sent ${new Date(send.sent_at).toLocaleString()}`
                  : `Created ${new Date(send.created_at).toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Events timeline */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Email Events
            </h3>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No delivery events recorded yet.
              </p>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

                <div className="space-y-3">
                  {events.map((event) => {
                    const cfg = EVENT_CONFIG[event.event_type] ?? {
                      icon: Mail,
                      color: 'text-muted-foreground',
                      badgeColor: 'gray' as const,
                    };
                    const Icon = cfg.icon;
                    const isExpanded = expandedPayloads.has(event.id);

                    return (
                      <div key={event.id} className="flex items-start gap-4 pl-0">
                        {/* Icon */}
                        <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card border border-border">
                          <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge color={cfg.badgeColor}>
                              {event.event_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.created_at).toLocaleString()}
                            </span>
                          </div>

                          {/* Raw Payload */}
                          {event.raw_payload && Object.keys(event.raw_payload).length > 0 && (
                            <button
                              type="button"
                              onClick={() => togglePayload(event.id)}
                              className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              Raw Payload
                            </button>
                          )}

                          {isExpanded && event.raw_payload && (
                            <pre className="mt-2 rounded-lg bg-muted p-3 text-xs overflow-x-auto max-h-48">
                              {JSON.stringify(event.raw_payload, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </SlideOver>
  );
}
