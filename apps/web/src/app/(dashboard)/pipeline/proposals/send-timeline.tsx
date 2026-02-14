'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Mail, Eye, CheckCircle, AlertTriangle, Send as SendIcon, Clock,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Card, CardHeader, CardTitle, CardContent, Skeleton } from '@gleamops/ui';
import type { SalesProposalSend } from '@gleamops/shared';
import { SendEventDrawer } from './send-event-drawer';

interface SendTimelineProps {
  proposalId: string;
}

const STATUS_ICON: Record<string, { icon: typeof Mail; color: string }> = {
  QUEUED: { icon: Clock, color: 'text-muted-foreground' },
  SENDING: { icon: SendIcon, color: 'text-blue-500' },
  SENT: { icon: Mail, color: 'text-blue-500' },
  DELIVERED: { icon: CheckCircle, color: 'text-green-500' },
  OPENED: { icon: Eye, color: 'text-yellow-500' },
  BOUNCED: { icon: AlertTriangle, color: 'text-red-500' },
  FAILED: { icon: AlertTriangle, color: 'text-red-500' },
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

export function SendTimeline({ proposalId }: SendTimelineProps) {
  const [sends, setSends] = useState<SalesProposalSend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSendId, setSelectedSendId] = useState<string | null>(null);

  const fetchSends = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('sales_proposal_sends')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSends(data as unknown as SalesProposalSend[]);
    }
    setLoading(false);
  }, [proposalId]);

  useEffect(() => {
    fetchSends();
  }, [fetchSends]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Send History
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Send History
              {sends.length > 0 && (
                <Badge color="gray">{sends.length}</Badge>
              )}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sends.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sends yet.</p>
          ) : (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

              <div className="space-y-4">
                {sends.map((send) => {
                  const { icon: Icon, color } =
                    STATUS_ICON[send.status] ?? STATUS_ICON.SENT;

                  return (
                    <button
                      key={send.id}
                      type="button"
                      onClick={() => setSelectedSendId(send.id)}
                      className="flex items-start gap-4 w-full text-left pl-0 hover:bg-muted/50 rounded-lg p-2 transition-colors"
                    >
                      {/* Icon */}
                      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card border border-border">
                        <Icon className={`h-3.5 w-3.5 ${color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">
                            {send.recipient_email}
                          </span>
                          {send.recipient_name && (
                            <span className="text-xs text-muted-foreground">
                              ({send.recipient_name})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge color={STATUS_BADGE_COLOR[send.status] ?? 'gray'}>
                            {send.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {send.sent_at
                              ? new Date(send.sent_at).toLocaleString()
                              : new Date(send.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SendEventDrawer
        sendId={selectedSendId}
        open={selectedSendId !== null}
        onClose={() => setSelectedSendId(null)}
      />
    </>
  );
}
