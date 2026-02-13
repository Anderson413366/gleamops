'use client';

import { useState } from 'react';
import { ChipTabs, SearchInput } from '@gleamops/ui';
import ProductionRatesTable from './production-rates-table';
import FollowupTemplatesTable from './followup-templates-table';
import MarketingInsertsTable from './marketing-inserts-table';

const TABS = [
  { key: 'rates', label: 'Production Rates' },
  { key: 'followups', label: 'Follow-up Templates' },
  { key: 'inserts', label: 'Marketing Inserts' },
];

export default function SalesAdminPage() {
  const [tab, setTab] = useState(TABS[0].key);
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Sales Admin</h1>
      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />
      {tab === 'rates' && <ProductionRatesTable search={search} />}
      {tab === 'followups' && <FollowupTemplatesTable search={search} />}
      {tab === 'inserts' && <MarketingInsertsTable search={search} />}
    </div>
  );
}
