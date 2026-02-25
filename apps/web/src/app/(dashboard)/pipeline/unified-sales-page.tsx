'use client';

import type { ReactNode } from 'react';
import { CollapsibleCard, cn } from '@gleamops/ui';

type SalesSectionTone = 'blue' | 'green' | 'pink' | 'neutral';

interface SalesSectionSlot {
  id: string;
  title: string;
  description: string;
  tone: SalesSectionTone;
  count?: number;
  content: ReactNode;
}

interface UnifiedSalesPageProps {
  actions?: ReactNode;
  kpiBar: ReactNode;
  sections: [SalesSectionSlot, SalesSectionSlot, SalesSectionSlot, SalesSectionSlot, SalesSectionSlot];
}

const SECTION_TONE_STYLES: Record<SalesSectionTone, string> = {
  blue: 'border-blue-200/80 [&_[data-card=header]]:bg-blue-50/70',
  green: 'border-green-200/80 [&_[data-card=header]]:bg-green-50/70',
  pink: 'border-pink-200/80 [&_[data-card=header]]:bg-pink-50/70',
  neutral: 'border-border [&_[data-card=header]]:bg-muted/35',
};

function SectionCountBadge({ count }: { count?: number }) {
  if (count == null) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-semibold text-foreground">
      {count}
    </span>
  );
}

export function UnifiedSalesPage({ actions, kpiBar, sections }: UnifiedSalesPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales & Pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track prospects, opportunities, bids, proposals, and performance in one workflow.
          </p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {kpiBar}

      <div className="space-y-4">
        {sections.map((section) => (
          <CollapsibleCard
            key={section.id}
            id={`pipeline-section-${section.id}`}
            title={section.title}
            description={section.description}
            headerRight={<SectionCountBadge count={section.count} />}
            className={cn(
              'overflow-hidden border shadow-sm transition-all duration-150',
              SECTION_TONE_STYLES[section.tone],
            )}
          >
            {section.content}
          </CollapsibleCard>
        ))}
      </div>
    </div>
  );
}
