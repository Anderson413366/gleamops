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
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(tab.key);
          }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            active === tab.key
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count != null && (
            <span
              className={cn(
                'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                active === tab.key
                  ? 'bg-background text-muted-foreground'
                  : 'bg-muted text-muted-foreground'
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
