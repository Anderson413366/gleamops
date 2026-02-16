'use client';

import { Badge } from '@gleamops/ui';
import { ArrowRight } from 'lucide-react';

const FLOW_STEPS = ['Prospect', 'Opportunity', 'Bid', 'Proposal', 'Won'] as const;

export function PipelineFlowHint() {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Pipeline Flow
      </p>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {FLOW_STEPS.map((step, index) => (
          <div key={step} className="flex items-center gap-2">
            <Badge color={step === 'Won' ? 'green' : 'blue'} dot={false} className="shrink-0">
              {step}
            </Badge>
            {index < FLOW_STEPS.length - 1 && (
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
