'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Search, X, Filter, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@gleamops/ui';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export interface ViewOption {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface SecondaryAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export interface DateNavConfig {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  rangePills?: { key: string; label: string }[];
  activeRange?: string;
  onRangeChange?: (key: string) => void;
}

export interface PageToolbarProps {
  /** Search */
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  /** Filters popover — render your own filter UI inside */
  filterContent?: ReactNode;
  activeFilterCount?: number;

  /** View mode dropdown */
  viewOptions?: ViewOption[];
  activeView?: string;
  onViewChange?: (id: string) => void;

  /** Date navigation (schedule pages) */
  dateNav?: DateNavConfig;

  /** Inline pills rendered between search and actions (e.g. type filters) */
  inlinePills?: ReactNode;

  /** Secondary action buttons (Export, Print, etc.) */
  secondaryActions?: SecondaryAction[];

  /** Primary CTA (rightmost, blue button) */
  primaryAction?: {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    disabled?: boolean;
  };

  /** Additional children rendered at the end */
  children?: ReactNode;
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function ToolbarSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { setLocal(value); }, [value]);

  const handleChange = (v: string) => {
    setLocal(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), 300);
  };

  return (
    <div className="relative min-w-[180px] max-w-sm flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <input
        type="text"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      {local && (
        <button
          onClick={() => { setLocal(''); onChange(''); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function FilterDropdown({ content, activeCount }: { content: ReactNode; activeCount: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-3 h-9 text-sm font-medium transition-colors',
          open || activeCount > 0
            ? 'border-primary/30 bg-primary/5 text-primary'
            : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted',
        )}
      >
        <Filter className="h-3.5 w-3.5" />
        Filters
        {activeCount > 0 && (
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
            {activeCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
          {content}
        </div>
      )}
    </div>
  );
}

function ViewDropdown({
  options,
  active,
  onChange,
}: {
  options: ViewOption[];
  active: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeOption = options.find((o) => o.id === active);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        {activeOption?.icon}
        <span className="hidden sm:inline">{activeOption?.label ?? 'View'}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[140px] rounded-xl border border-border bg-card p-1 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => { onChange(opt.id); setOpen(false); }}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                active === opt.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-muted',
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DateNav({ config }: { config: DateNavConfig }) {
  return (
    <div className="flex items-center gap-1.5">
      {config.rangePills && config.rangePills.length > 0 && (
        <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5">
          {config.rangePills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => config.onRangeChange?.(pill.key)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                config.activeRange === pill.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>
      )}
      <div className="inline-flex items-center rounded-lg border border-border bg-card">
        <button type="button" onClick={config.onPrev} className="rounded-l-md px-2 py-1.5 text-muted-foreground hover:text-foreground" aria-label="Previous">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={config.onToday} className="border-x border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
          Today
        </button>
        <button type="button" onClick={config.onNext} className="rounded-r-md px-2 py-1.5 text-muted-foreground hover:text-foreground" aria-label="Next">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <span className="text-xs text-muted-foreground hidden sm:inline">{config.label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PageToolbar                                                          */
/* ------------------------------------------------------------------ */

export function PageToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterContent,
  activeFilterCount = 0,
  viewOptions,
  activeView,
  onViewChange,
  dateNav,
  inlinePills,
  secondaryActions,
  primaryAction,
  children,
}: PageToolbarProps) {
  const hasContent =
    onSearchChange || filterContent || viewOptions || dateNav || inlinePills || secondaryActions || primaryAction || children;

  if (!hasContent) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
      {onSearchChange && (
        <ToolbarSearch value={search ?? ''} onChange={onSearchChange} placeholder={searchPlaceholder} />
      )}

      {filterContent && (
        <FilterDropdown content={filterContent} activeCount={activeFilterCount} />
      )}

      {viewOptions && activeView && onViewChange && (
        <ViewDropdown options={viewOptions} active={activeView} onChange={onViewChange} />
      )}

      {dateNav && <DateNav config={dateNav} />}

      {inlinePills}

      {secondaryActions && secondaryActions.length > 0 && (
        <div className="flex items-center gap-1">
          {secondaryActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              title={action.label}
            >
              {action.icon}
              <span className="hidden sm:inline">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {children}

      {primaryAction && (
        <button
          type="button"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 h-9 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
        >
          {primaryAction.icon}
          {primaryAction.label}
        </button>
      )}
    </div>
  );
}
