'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const updateOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 2);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateOverflow();
    el.addEventListener('scroll', updateOverflow, { passive: true });
    const ro = new ResizeObserver(updateOverflow);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateOverflow);
      ro.disconnect();
    };
  }, [updateOverflow, tabs.length]);

  return (
    <div className="relative">
      {showLeft && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-background to-transparent"
          aria-hidden="true"
        />
      )}
      <div
        ref={scrollRef}
        role="tablist"
        aria-label="Section tabs"
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              active === tab.key
                ? 'bg-module-accent text-module-accent-foreground shadow-sm'
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
      {showRight && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-background to-transparent"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
