'use client';

import { useState } from 'react';
import { Palette } from 'lucide-react';
import { cn } from '@gleamops/ui';
import { usePositionTypes, COLOR_TOKEN_MAP } from '@/hooks/use-position-types';

/** Extract the first bg-* class from a block string to use as a swatch background. */
function extractBgClass(block: string): string {
  const match = block.match(/bg-\S+/);
  return match ? match[0] : 'bg-slate-50';
}

/** Extract the first border-* class from a block string for swatch border. */
function extractBorderClass(block: string): string {
  const match = block.match(/border-\S+/);
  return match ? match[0] : 'border-slate-300/70';
}

export function PositionColorLegend() {
  const { positionTypes, loading } = usePositionTypes();
  const [open, setOpen] = useState(false);

  if (loading || positionTypes.size === 0) return null;

  const entries = Array.from(positionTypes.values());

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
      >
        <Palette className="h-3.5 w-3.5" />
        {open ? 'Hide Legend' : 'Color Legend'}
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-2">
          {entries.map((pt) => {
            const theme = COLOR_TOKEN_MAP[pt.colorToken] ?? COLOR_TOKEN_MAP.slate;
            return (
              <span
                key={pt.positionCode}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1',
                  extractBorderClass(theme.block),
                  extractBgClass(theme.block),
                )}
              >
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full border',
                    extractBorderClass(theme.block),
                    extractBgClass(theme.block),
                  )}
                />
                <span className="text-foreground">{pt.label}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
