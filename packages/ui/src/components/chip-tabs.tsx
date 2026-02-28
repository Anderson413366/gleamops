'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
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

const TAB_BUTTON_CLASS =
  'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const MORE_BUTTON_WIDTH = 90; // reserved space for the "More" button
const GAP = 8; // gap-2 = 0.5rem = 8px

export function ChipTabs({ tabs, active, onChange }: ChipTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [visibleCount, setVisibleCount] = useState(tabs.length);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const updateOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 2);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  // Calculate how many tabs fit on desktop
  const calculateVisibleTabs = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const small = containerWidth < 640;
    setIsSmallScreen(small);

    // On small screens, show all tabs with scroll
    if (small) {
      setVisibleCount(tabs.length);
      return;
    }

    // Measure tab widths from refs
    let usedWidth = 0;
    let count = 0;

    for (const tab of tabs) {
      const el = tabRefs.current.get(tab.key);
      const tabWidth = el ? el.offsetWidth : 100; // fallback estimate
      const nextWidth = usedWidth + tabWidth + (count > 0 ? GAP : 0);

      // If adding this tab would exceed available space (minus "More" button space),
      // and there are more tabs after this one, stop here
      if (count > 0 && nextWidth > containerWidth - MORE_BUTTON_WIDTH - GAP && count < tabs.length) {
        break;
      }

      usedWidth = nextWidth;
      count++;
    }

    // If all tabs fit, show them all
    if (count >= tabs.length) {
      setVisibleCount(tabs.length);
    } else {
      setVisibleCount(Math.max(1, count));
    }
  }, [tabs]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateOverflow();
    el.addEventListener('scroll', updateOverflow, { passive: true });
    const ro = new ResizeObserver(() => {
      updateOverflow();
      calculateVisibleTabs();
    });
    ro.observe(el);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      el.removeEventListener('scroll', updateOverflow);
      ro.disconnect();
    };
  }, [updateOverflow, calculateVisibleTabs, tabs.length]);

  // Initial calculation after mount
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM measurements are ready
    const raf = requestAnimationFrame(() => {
      calculateVisibleTabs();
    });
    return () => cancelAnimationFrame(raf);
  }, [calculateVisibleTabs]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!moreOpen) return;
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreOpen]);

  const hasOverflow = visibleCount < tabs.length && !isSmallScreen;
  const visibleTabs = hasOverflow ? tabs.slice(0, visibleCount) : tabs;
  const overflowTabs = hasOverflow ? tabs.slice(visibleCount) : [];

  // If active tab is in overflow, show its label on the "More" button
  const activeInOverflow = overflowTabs.some((t) => t.key === active);
  const activeOverflowTab = activeInOverflow ? overflowTabs.find((t) => t.key === active) : null;

  return (
    <div className="relative" ref={containerRef}>
      {isSmallScreen && showLeft && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent"
          aria-hidden="true"
        />
      )}
      <div
        ref={scrollRef}
        role="tablist"
        aria-label="Section tabs"
        className={cn(
          'flex gap-2 pb-1',
          isSmallScreen
            ? 'overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
            : 'flex-wrap'
        )}
      >
        {/* Render all tabs (hidden measure + visible) */}
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.key, el);
            }}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              TAB_BUTTON_CLASS,
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

        {/* Hidden measure refs for overflow tabs */}
        {overflowTabs.map((tab) => (
          <button
            key={`measure-${tab.key}`}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.key, el);
            }}
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className={cn(TAB_BUTTON_CLASS, 'sr-only pointer-events-none')}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}

        {/* "More" dropdown button */}
        {hasOverflow && overflowTabs.length > 0 && (
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                TAB_BUTTON_CLASS,
                activeInOverflow
                  ? 'bg-module-accent text-module-accent-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              )}
              aria-expanded={moreOpen}
              aria-haspopup="true"
            >
              {activeOverflowTab ? activeOverflowTab.label : 'More'}
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform duration-200',
                  moreOpen && 'rotate-180'
                )}
              />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-border bg-card p-1 shadow-lg">
                {overflowTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active === tab.key}
                    onClick={() => {
                      onChange(tab.key);
                      setMoreOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      active === tab.key
                        ? 'bg-module-accent/10 text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.count != null && (
                      <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {isSmallScreen && showRight && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
