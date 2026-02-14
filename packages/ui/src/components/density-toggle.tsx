'use client';

import { AlignJustify, List } from 'lucide-react';
import { cn } from '../utils';

interface DensityToggleProps {
  density: 'comfortable' | 'compact';
  onChange: (density: 'comfortable' | 'compact') => void;
}

export function DensityToggle({ density, onChange }: DensityToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5">
      <button
        type="button"
        onClick={() => onChange('comfortable')}
        className={cn(
          'rounded-md p-1.5 transition-all duration-200 ease-in-out',
          density === 'comfortable'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label="Comfortable density"
        title="Comfortable"
      >
        <AlignJustify className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onChange('compact')}
        className={cn(
          'rounded-md p-1.5 transition-all duration-200 ease-in-out',
          density === 'compact'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label="Compact density"
        title="Compact"
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
