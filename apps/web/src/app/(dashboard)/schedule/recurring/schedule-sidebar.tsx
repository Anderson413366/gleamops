'use client';

import { useState, useMemo, useEffect } from 'react';
import { PanelLeftClose, PanelLeft, ChevronLeft, ChevronRight, ChevronDown, RotateCcw } from 'lucide-react';
import { cn } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface SiteOption {
  id: string;
  name: string;
  site_code: string;
}

interface ScheduleSidebarProps {
  /** Current anchor date for the schedule range */
  anchorDate: Date;
  onDateSelect: (date: Date) => void;
  /** Show/hide availability overlay in grid */
  showAvailability: boolean;
  onShowAvailabilityChange: (show: boolean) => void;
  /** Show/hide leave overlay in grid */
  showLeave: boolean;
  onShowLeaveChange: (show: boolean) => void;
  /** Reset all filters */
  onResetFilters: () => void;
  /** Selected site codes for filtering */
  selectedSites: string[];
  onSelectedSitesChange: (sites: string[]) => void;
  /** Selected employee names for filtering */
  selectedEmployees: string[];
  onSelectedEmployeesChange: (employees: string[]) => void;
  /** Available employee names extracted from schedule rows */
  availableEmployees: string[];
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function MiniCalendar({ currentDate, onSelect }: { currentDate: Date; onSelect: (date: Date) => void }) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(currentDate));

  const weeks = useMemo(() => {
    const firstDay = startOfMonth(viewMonth);
    const startOffset = firstDay.getDay();
    const totalDays = daysInMonth(viewMonth);
    const cells: (Date | null)[] = [];

    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const weekRows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weekRows.push(cells.slice(i, i + 7));
    }
    return weekRows;
  }, [viewMonth]);

  const today = new Date();

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-medium text-foreground">
          {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="text-[10px] font-medium text-muted-foreground py-0.5">
            {label}
          </div>
        ))}
        {weeks.flat().map((date, idx) => (
          <button
            key={idx}
            type="button"
            disabled={!date}
            onClick={() => date && onSelect(date)}
            className={cn(
              'h-6 w-6 rounded text-[11px] transition-colors',
              !date && 'invisible',
              date && isSameDay(date, today) && 'bg-primary text-primary-foreground font-bold',
              date && isSameDay(date, currentDate) && !isSameDay(date, today) && 'ring-1 ring-primary',
              date && !isSameDay(date, today) && !isSameDay(date, currentDate) && 'text-foreground hover:bg-muted',
            )}
          >
            {date?.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterAccordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-border pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
      >
        {title}
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">{children}</div>}
    </div>
  );
}

export function ScheduleSidebar({
  anchorDate,
  onDateSelect,
  showAvailability,
  onShowAvailabilityChange,
  showLeave,
  onShowLeaveChange,
  onResetFilters,
  selectedSites,
  onSelectedSitesChange,
  selectedEmployees,
  onSelectedEmployeesChange,
  availableEmployees,
}: ScheduleSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [sites, setSites] = useState<SiteOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function fetchSites() {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('sites')
        .select('id, name, site_code')
        .is('archived_at', null)
        .order('name');
      if (!cancelled && data) setSites(data as SiteOption[]);
    }
    void fetchSites();
    return () => { cancelled = true; };
  }, []);

  const toggleSite = (siteCode: string) => {
    onSelectedSitesChange(
      selectedSites.includes(siteCode)
        ? selectedSites.filter((c) => c !== siteCode)
        : [...selectedSites, siteCode],
    );
  };

  const toggleEmployee = (name: string) => {
    onSelectedEmployeesChange(
      selectedEmployees.includes(name)
        ? selectedEmployees.filter((n) => n !== name)
        : [...selectedEmployees, name],
    );
  };

  if (collapsed) {
    return (
      <div className="shrink-0">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Expand sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="shrink-0 w-56 space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filters</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <MiniCalendar currentDate={anchorDate} onSelect={onDateSelect} />

      <div className="space-y-2 pt-2 border-t border-border">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showAvailability}
            onChange={(e) => onShowAvailabilityChange(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-foreground">Show Availability</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showLeave}
            onChange={(e) => onShowLeaveChange(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-foreground">Show Leave</span>
        </label>
      </div>

      <FilterAccordion title="Job Sites">
        {selectedSites.length > 0 && (
          <button
            type="button"
            onClick={() => onSelectedSitesChange([])}
            className="text-[11px] text-primary hover:underline mb-1"
          >
            Show All Sites
          </button>
        )}
        {sites.map((site) => (
          <label key={site.site_code} className="flex items-center gap-2 text-[12px] cursor-pointer">
            <input
              type="checkbox"
              checked={selectedSites.includes(site.site_code)}
              onChange={() => toggleSite(site.site_code)}
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-foreground truncate">{site.site_code} – {site.name}</span>
          </label>
        ))}
      </FilterAccordion>

      <FilterAccordion title="Employees">
        {selectedEmployees.length > 0 && (
          <button
            type="button"
            onClick={() => onSelectedEmployeesChange([])}
            className="text-[11px] text-primary hover:underline mb-1"
          >
            Show All Employees
          </button>
        )}
        {availableEmployees.map((name) => (
          <label key={name} className="flex items-center gap-2 text-[12px] cursor-pointer">
            <input
              type="checkbox"
              checked={selectedEmployees.includes(name)}
              onChange={() => toggleEmployee(name)}
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-foreground truncate">{name}</span>
          </label>
        ))}
      </FilterAccordion>

      <FilterAccordion title="Skills">
        <p className="text-[11px] text-muted-foreground italic">No skills configured yet.</p>
      </FilterAccordion>

      <FilterAccordion title="Shift Types">
        {['Day Shift', 'Evening Shift', 'Night Shift', 'Weekend'].map((type) => (
          <label key={type} className="flex items-center gap-2 text-[12px] cursor-pointer">
            <input type="checkbox" className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary" />
            <span className="text-foreground truncate">{type}</span>
          </label>
        ))}
      </FilterAccordion>

      <FilterAccordion title="Tags">
        <p className="text-[11px] text-muted-foreground italic">No shift tags configured yet.</p>
      </FilterAccordion>

      <div className="border-t border-border pt-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-foreground text-xs">Empty Shifts Only</span>
        </label>
      </div>

      <button
        type="button"
        onClick={onResetFilters}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <RotateCcw className="h-3 w-3" />
        Reset to Full Schedule
      </button>
    </aside>
  );
}
