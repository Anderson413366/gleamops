'use client';

import { List, LayoutGrid } from 'lucide-react';
import { cn } from '../utils';

interface ViewToggleProps {
  view: 'list' | 'card';
  onChange: (view: 'list' | 'card') => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5">
      <button
        type="button"
        onClick={() => onChange('list')}
        className={cn(
          'inline-flex items-center justify-center rounded-md px-2 py-1.5 text-sm transition-colors',
          view === 'list'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label="List view"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('card')}
        className={cn(
          'inline-flex items-center justify-center rounded-md px-2 py-1.5 text-sm transition-colors',
          view === 'card'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label="Card view"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}
