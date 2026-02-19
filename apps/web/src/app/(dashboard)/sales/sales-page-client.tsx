'use client';

import { useState, useCallback } from 'react';
import { Users, Target, FileText, Send } from 'lucide-react';
import { ChipTabs, SearchInput } from '@gleamops/ui';
import { useSyncedTab } from '@/hooks/use-synced-tab';

import ProspectsTable from '../pipeline/prospects/prospects-table';
import OpportunitiesTable from '../pipeline/opportunities/opportunities-table';
import BidsTable from '../pipeline/bids/bids-table';
import ProposalsTable from '../pipeline/proposals/proposals-table';
import { BidWizard } from '../pipeline/bids/bid-wizard';
import { ProspectForm } from '@/components/forms/prospect-form';
import { OpportunityForm } from '@/components/forms/opportunity-form';

const TABS = [
  { key: 'prospects', label: 'Prospects', icon: <Users className="h-4 w-4" /> },
  { key: 'opportunities', label: 'Opportunities', icon: <Target className="h-4 w-4" /> },
  { key: 'bids', label: 'Bids', icon: <FileText className="h-4 w-4" /> },
  { key: 'proposals', label: 'Proposals', icon: <Send className="h-4 w-4" /> },
];

export default function SalesPageClient() {
  const [tab, setTab] = useSyncedTab({
    tabKeys: TABS.map((t) => t.key),
    defaultTab: 'prospects',
  });
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [prospectFormOpen, setProspectFormOpen] = useState(false);
  const [opportunityFormOpen, setOpportunityFormOpen] = useState(false);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sales</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Prospects, Opportunities, Bids, Proposals
        </p>
      </div>

      <ChipTabs tabs={TABS} active={tab} onChange={setTab} />
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />

      {tab === 'prospects' && <ProspectsTable key={`p-${refreshKey}`} search={search} />}
      {tab === 'opportunities' && <OpportunitiesTable key={`o-${refreshKey}`} search={search} />}
      {tab === 'bids' && (
        <BidsTable
          key={`b-${refreshKey}`}
          search={search}
          onCreateNew={() => setWizardOpen(true)}
        />
      )}
      {tab === 'proposals' && (
        <ProposalsTable
          key={`pr-${refreshKey}`}
          search={search}
          onGoToBids={() => setTab('bids')}
        />
      )}

      <BidWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={() => {
          setWizardOpen(false);
          refresh();
        }}
      />

      <ProspectForm
        open={prospectFormOpen}
        onClose={() => setProspectFormOpen(false)}
        onSuccess={() => {
          setProspectFormOpen(false);
          refresh();
        }}
      />

      <OpportunityForm
        open={opportunityFormOpen}
        onClose={() => setOpportunityFormOpen(false)}
        onSuccess={() => {
          setOpportunityFormOpen(false);
          refresh();
        }}
      />
    </div>
  );
}
