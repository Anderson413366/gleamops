'use client';

import { useCallback } from 'react';
import { ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@gleamops/ui';
import {
  PROPOSAL_SECTION_LABELS,
  DEFAULT_PROPOSAL_LAYOUT,
} from '@gleamops/shared';
import type { ProposalLayoutConfig, ProposalLayoutSection } from '@gleamops/shared';

interface LayoutEditorProps {
  config: ProposalLayoutConfig;
  onChange: (config: ProposalLayoutConfig) => void;
}

export function LayoutEditor({ config, onChange }: LayoutEditorProps) {
  const sorted = [...config.sections].sort((a, b) => a.order - b.order);

  const toggleSection = useCallback(
    (id: ProposalLayoutSection['id']) => {
      const sections = config.sections.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s,
      );
      onChange({ ...config, sections });
    },
    [config, onChange],
  );

  const togglePageBreak = useCallback(
    (id: ProposalLayoutSection['id']) => {
      const sections = config.sections.map((s) =>
        s.id === id ? { ...s, pageBreakBefore: !s.pageBreakBefore } : s,
      );
      onChange({ ...config, sections });
    },
    [config, onChange],
  );

  const moveSection = useCallback(
    (id: ProposalLayoutSection['id'], direction: 'up' | 'down') => {
      const idx = sorted.findIndex((s) => s.id === id);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;

      const reordered = [...sorted];
      [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

      const sections = reordered.map((s, i) => ({ ...s, order: i }));
      onChange({ ...config, sections });
    },
    [config, sorted, onChange],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>PDF Layout</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...DEFAULT_PROPOSAL_LAYOUT })}
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Section list */}
          <div className="space-y-1.5">
            {sorted.map((section, i) => (
              <div
                key={section.id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
              >
                {/* Toggle */}
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    onChange={() => toggleSection(section.id)}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
                </label>

                {/* Label */}
                <span className="flex-1 text-sm font-medium">
                  {PROPOSAL_SECTION_LABELS[section.id]}
                </span>

                {/* Page break */}
                <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={section.pageBreakBefore}
                    onChange={() => togglePageBreak(section.id)}
                    className="rounded border-border"
                  />
                  Break
                </label>

                {/* Reorder */}
                <button
                  type="button"
                  onClick={() => moveSection(section.id, 'up')}
                  disabled={i === 0}
                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(section.id, 'down')}
                  disabled={i === sorted.length - 1}
                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Signature placement */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Signature Placement
            </label>
            <select
              value={config.signaturePlacement}
              onChange={(e) =>
                onChange({
                  ...config,
                  signaturePlacement: e.target.value as ProposalLayoutConfig['signaturePlacement'],
                })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="cover">Cover Page</option>
              <option value="agreement">Agreement Section</option>
              <option value="disclaimer">After Disclaimer</option>
            </select>
          </div>

          {/* Attachment mode */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Attachment Mode
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="attachmentMode"
                  value="list_only"
                  checked={config.attachmentMode === 'list_only'}
                  onChange={() =>
                    onChange({ ...config, attachmentMode: 'list_only' })
                  }
                  className="border-border"
                />
                List filenames only
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="attachmentMode"
                  value="append"
                  checked={config.attachmentMode === 'append'}
                  onChange={() =>
                    onChange({ ...config, attachmentMode: 'append' })
                  }
                  className="border-border"
                />
                Append attachment PDFs
              </label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
