'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowRightLeft, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { CollapsibleCard, Badge, Button, EmptyState } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRole } from '@/hooks/use-role';
import { normalizeRoleCode } from '@gleamops/shared';

interface ShiftTrade {
  id: string;
  ticket_id: string;
  period_id: string | null;
  request_type: string;
  status: string;
  initiator_note: string | null;
  manager_note: string | null;
  requested_at: string | null;
  accepted_at: string | null;
  approved_at: string | null;
  applied_at: string | null;
  initiator_staff: { full_name: string | null; staff_code: string } | null;
  target_staff: { full_name: string | null; staff_code: string } | null;
  ticket: { ticket_code: string; scheduled_date: string; start_time: string | null; end_time: string | null } | null;
}

const STATUS_BADGE: Record<string, 'yellow' | 'blue' | 'green' | 'red' | 'gray'> = {
  PENDING: 'yellow',
  ACCEPTED: 'blue',
  APPROVED: 'green',
  APPLIED: 'green',
  CANCELED: 'gray',
  DENIED: 'red',
};

export function ShiftTradesPanel() {
  const { role } = useRole();
  const normalizedRole = normalizeRoleCode(role);
  const isManager = normalizedRole === 'OWNER_ADMIN' || normalizedRole === 'MANAGER' || normalizedRole === 'SUPERVISOR';
  const [trades, setTrades] = useState<ShiftTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('shift_trade_requests')
        .select(`
          id, ticket_id, period_id, request_type, status,
          initiator_note, manager_note,
          requested_at, accepted_at, approved_at, applied_at,
          initiator_staff:initiator_staff_id!shift_trade_requests_initiator_staff_id_fkey(full_name, staff_code),
          target_staff:target_staff_id!shift_trade_requests_target_staff_id_fkey(full_name, staff_code),
          ticket:ticket_id!shift_trade_requests_ticket_id_fkey(ticket_code, scheduled_date, start_time, end_time)
        `)
        .is('archived_at', null)
        .order('requested_at', { ascending: false })
        .limit(50);
      setTrades((data as unknown as ShiftTrade[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchTrades(); }, [fetchTrades]);

  const tradeAction = useCallback(async (tradeId: string, action: string) => {
    setActionLoading(tradeId);
    try {
      const resp = await fetch(`/api/operations/schedule/trades/${tradeId}/${action}`, { method: 'POST' });
      if (resp.ok) await fetchTrades();
    } finally {
      setActionLoading(null);
    }
  }, [fetchTrades]);

  const activeTrades = trades.filter((t) => !['APPLIED', 'CANCELED', 'DENIED'].includes(t.status));
  const pastTrades = trades.filter((t) => ['APPLIED', 'CANCELED', 'DENIED'].includes(t.status));

  return (
    <CollapsibleCard
      id="shift-trades"
      title={
        <span className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-primary" aria-hidden />
          Shift Trades
          {activeTrades.length > 0 && (
            <Badge color="yellow">{activeTrades.length} active</Badge>
          )}
        </span>
      }
      defaultOpen={activeTrades.length > 0}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading trades...</p>
      ) : trades.length === 0 ? (
        <EmptyState
          icon={<ArrowRightLeft className="h-10 w-10" />}
          title="No shift trades"
          description="Shift trade requests will appear here when staff request swaps."
        />
      ) : (
        <div className="space-y-3">
          {activeTrades.map((trade) => (
            <div key={trade.id} className="rounded-lg border border-border p-3 text-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge color={STATUS_BADGE[trade.status] ?? 'gray'}>{trade.status}</Badge>
                  <span className="text-xs text-muted-foreground truncate">
                    {trade.ticket?.ticket_code} · {trade.ticket?.scheduled_date}
                  </span>
                </div>
                <Badge color="blue" className="text-[10px]">{trade.request_type}</Badge>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-foreground">
                  {trade.initiator_staff?.full_name ?? trade.initiator_staff?.staff_code ?? 'Unknown'}
                </span>
                <ArrowRightLeft className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground">
                  {trade.target_staff?.full_name ?? trade.target_staff?.staff_code ?? 'Unassigned'}
                </span>
              </div>
              {trade.initiator_note && (
                <p className="text-xs text-muted-foreground italic">&ldquo;{trade.initiator_note}&rdquo;</p>
              )}
              <div className="flex items-center gap-2 pt-1">
                {trade.status === 'PENDING' && (
                  <>
                    <Button size="sm" variant="secondary" className="h-7 text-xs gap-1"
                      disabled={actionLoading === trade.id}
                      onClick={() => tradeAction(trade.id, 'accept')}>
                      <CheckCircle2 className="h-3 w-3" /> Accept
                    </Button>
                    <Button size="sm" variant="secondary" className="h-7 text-xs gap-1"
                      disabled={actionLoading === trade.id}
                      onClick={() => tradeAction(trade.id, 'cancel')}>
                      <XCircle className="h-3 w-3" /> Cancel
                    </Button>
                  </>
                )}
                {trade.status === 'ACCEPTED' && isManager && (
                  <>
                    <Button size="sm" className="h-7 text-xs gap-1"
                      disabled={actionLoading === trade.id}
                      onClick={() => tradeAction(trade.id, 'approve')}>
                      <CheckCircle2 className="h-3 w-3" /> Approve
                    </Button>
                    <Button size="sm" variant="secondary" className="h-7 text-xs gap-1"
                      disabled={actionLoading === trade.id}
                      onClick={() => tradeAction(trade.id, 'deny')}>
                      <XCircle className="h-3 w-3" /> Deny
                    </Button>
                  </>
                )}
                {trade.status === 'APPROVED' && isManager && (
                  <Button size="sm" className="h-7 text-xs gap-1"
                    disabled={actionLoading === trade.id}
                    onClick={() => tradeAction(trade.id, 'apply')}>
                    <CheckCircle2 className="h-3 w-3" /> Apply Trade
                  </Button>
                )}
                {actionLoading === trade.id && (
                  <Clock className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                )}
              </div>
            </div>
          ))}
          {pastTrades.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground py-1">
                {pastTrades.length} resolved trade{pastTrades.length !== 1 ? 's' : ''}
              </summary>
              <div className="space-y-2 mt-2">
                {pastTrades.map((trade) => (
                  <div key={trade.id} className="rounded-lg border border-border/60 p-2 text-xs text-muted-foreground flex items-center gap-2">
                    <Badge color={STATUS_BADGE[trade.status] ?? 'gray'} className="text-[10px]">{trade.status}</Badge>
                    <span>{trade.initiator_staff?.full_name ?? 'Unknown'}</span>
                    <ArrowRightLeft className="h-3 w-3 shrink-0" />
                    <span>{trade.target_staff?.full_name ?? 'Unknown'}</span>
                    <span className="ml-auto">{trade.ticket?.ticket_code}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </CollapsibleCard>
  );
}
