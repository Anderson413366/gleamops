'use client';

import { useEffect, useState } from 'react';
import { ChipTabs, SearchInput, Card, CardContent } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSyncedTab } from '@/hooks/use-synced-tab';
import ProductionRatesTable from './production-rates-table';
import FollowupTemplatesTable from './followup-templates-table';
import MarketingInsertsTable from './marketing-inserts-table';

const TABS = [
  { key: 'rates', label: 'Production Rates' },
  { key: 'followups', label: 'Follow-up Templates' },
  { key: 'inserts', label: 'Marketing Inserts' },
];

export default function SalesAdminPageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((item) => item.key),
    defaultTab: TABS[0].key,
  });
  const [search, setSearch] = useState('');
  const [kpis, setKpis] = useState({
    productionRates: 0,
    followupTemplates: 0,
    marketingInserts: 0,
    activeFollowups: 0,
  });

  useEffect(() => {
    async function fetchKpis() {
      const supabase = getSupabaseBrowserClient();
      const [ratesRes, templatesRes, insertsRes, activeFollowupsRes] = await Promise.all([
        supabase.from('sales_production_rates').select('id', { count: 'exact', head: true }),
        supabase.from('sales_followup_templates').select('id', { count: 'exact', head: true }),
        supabase.from('sales_marketing_inserts').select('id', { count: 'exact', head: true }),
        supabase.from('sales_followup_templates').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      setKpis({
        productionRates: ratesRes.count ?? 0,
        followupTemplates: templatesRes.count ?? 0,
        marketingInserts: insertsRes.count ?? 0,
        activeFollowups: activeFollowupsRes.count ?? 0,
      });
    }

    fetchKpis();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sales Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Control pricing models, follow-up templates, and proposal inserts.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Production Rates</p><p className="text-xl font-bold">{kpis.productionRates}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Follow-up Templates</p><p className="text-xl font-bold">{kpis.followupTemplates}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Follow-ups</p><p className="text-xl font-bold text-success">{kpis.activeFollowups}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Marketing Inserts</p><p className="text-xl font-bold">{kpis.marketingInserts}</p></CardContent></Card>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search ${tab}...`}
          className="w-full lg:w-80"
        />
      </div>
      {tab === 'rates' && <ProductionRatesTable search={search} />}
      {tab === 'followups' && <FollowupTemplatesTable search={search} />}
      {tab === 'inserts' && <MarketingInsertsTable search={search} />}
    </div>
  );
}
