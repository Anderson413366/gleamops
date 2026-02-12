'use client';

import { cn } from '../utils';

export interface ChipTab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface ChipTabsProps {
  tabs: ChipTab[];
  active: string;
  onChange: (key: string) => void;
}

export function ChipTabs({ tabs, active, onChange }: ChipTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            active === tab.key
              ? 'bg-gleam-600 text-white shadow-sm'
              : 'bg-gray-100 text-muted hover:bg-gray-200 hover:text-foreground'
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count != null && (
            <span
              className={cn(
                'ml-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
                active === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-200 text-muted'
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
