'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import ProposalsTable from '../proposals/proposals-table';

interface ProposalsSectionProps {
  globalSearch?: string;
  onGoToBids?: () => void;
  onCountChange?: (count: number) => void;
  refreshToken?: number;
}

interface ProposalStatusStats {
  sent: number;
  opened: number;
  signed: number;
  expired: number;
}

export function ProposalsSection({
  globalSearch = '',
  onGoToBids,
  onCountChange,
  refreshToken = 0,
}: ProposalsSectionProps) {
  const [stats, setStats] = useState<ProposalStatusStats>({
    sent: 0,
    opened: 0,
    signed: 0,
    expired: 0,
  });

  const fetchStats = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const [totalRes, sentRes, openedRes, signedRes, expiredRes] = await Promise.all([
      supabase
        .from('sales_proposals')
        .select('id', { count: 'exact', head: true })
        .is('archived_at', null),
      supabase
        .from('sales_proposals')
        .select('id', { count: 'exact', head: true })
        .in('status', ['SENT', 'DELIVERED'])
        .is('archived_at', null),
      supabase
        .from('sales_proposals')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'OPENED')
        .is('archived_at', null),
      supabase
        .from('sales_proposals')
        .select('id', { count: 'exact', head: true })
        .in('status', ['SIGNED', 'WON'])
        .is('archived_at', null),
      supabase
        .from('sales_proposals')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'EXPIRED')
        .is('archived_at', null),
    ]);

    setStats({
      sent: sentRes.count ?? 0,
      opened: openedRes.count ?? 0,
      signed: signedRes.count ?? 0,
      expired: expiredRes.count ?? 0,
    });
    onCountChange?.(totalRes.count ?? 0);
  }, [onCountChange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshToken]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge color="blue">Sent {stats.sent}</Badge>
        <Badge color="yellow">Opened {stats.opened}</Badge>
        <Badge color="green">Signed {stats.signed}</Badge>
        <Badge color="red">Expired {stats.expired}</Badge>
      </div>

      <ProposalsTable
        key={`proposals-section-${refreshToken}`}
        search={globalSearch}
        onGoToBids={onGoToBids}
      />
    </div>
  );
}
