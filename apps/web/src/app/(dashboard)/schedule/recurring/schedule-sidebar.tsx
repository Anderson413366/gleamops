'use client';

import { useState, useMemo, useEffect } from 'react';
import { PanelLeftClose, PanelLeft, ChevronLeft, ChevronRight, ChevronDown, RotateCcw } from 'lucide-react';
import { cn } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface SiteOption {
  id: string;
  name: string;
  site_code: string;
  client_id: string | null;
}

interface ClientOption {
  id: string;
  name: string;
  client_code: string;
}

export interface ScheduleSidebarProps {
  anchorDate: Date;
  onDateSelect: (date: Date) => void;
  showAvailability: boolean;
  onShowAvailabilityChange: (show: boolean) => void;
  showLeave: boolean;
  onShowLeaveChange: (show: boolean) => void;
  onResetFilters: () => void;
  /** Selected client IDs */
  selectedClients: string[];
  onSelectedClientsChange: (clients: string[]) => void;
  /** Selected site codes */
  selectedSites: string[];
  onSelectedSitesChange: (sites: string[]) => void;
  /** Selected position types */
  selectedPositions: string[];
  onSelectedPositionsChange: (positions: string[]) => void;
  /** Selected employee names */
  selectedEmployees: string[];
  onSelectedEmployeesChange: (employees: string[]) => void;
  /** Available employee names from schedule rows */
  availableEmployees: string[];
  /** Available position types from schedule rows */
  availablePositions: string[];
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

const SHIFT_TYPES = ['Day Shift', 'Evening Shift', 'Night Shift', 'Weekend'] as const;

export function ScheduleSidebar({
  anchorDate,
  onDateSelect,
  showAvailability,
  onShowAvailabilityChange,
  showLeave,
  onShowLeaveChange,
  onResetFilters,
  selectedClients,
  onSelectedClientsChange,
  selectedSites,
  onSelectedSitesChange,
  selectedPositions,
  onSelectedPositionsChange,
  selectedEmployees,
  onSelectedEmployeesChange,
  availableEmployees,
  availablePositions,
}: ScheduleSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [allStaff, setAllStaff] = useState<string[]>([]);
  const [selectedShiftTypes, setSelectedShiftTypes] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      const supabase = getSupabaseBrowserClient();
      const [sitesRes, clientsRes, staffRes] = await Promise.all([
        supabase.from('sites').select('id, name, site_code, client_id').is('archived_at', null).order('name'),
        supabase.from('clients').select('id, name, client_code').is('archived_at', null).order('name'),
        supabase.from('staff').select('full_name').is('archived_at', null).eq('staff_status', 'ACTIVE').order('full_name'),
      ]);
      if (!cancelled) {
        if (sitesRes.data) setSites(sitesRes.data as SiteOption[]);
        if (clientsRes.data) setClients(clientsRes.data as ClientOption[]);
        if (staffRes.data) {
          const names = (staffRes.data as Array<{ full_name: string }>)
            .map((s) => s.full_name)
            .filter(Boolean);
          setAllStaff(names);
        }
      }
    }
    void fetchData();
    return () => { cancelled = true; };
  }, []);

  // Use DB staff list, falling back to schedule-derived list
  const employeeList = allStaff.length > 0 ? allStaff : availableEmployees;

  // Sites filtered by selected clients (if any clients are selected, only show their sites)
  const visibleSites = useMemo(() => {
    if (selectedClients.length === 0) return sites;
    const clientIdSet = new Set(selectedClients);
    return sites.filter((s) => s.client_id && clientIdSet.has(s.client_id));
  }, [sites, selectedClients]);

  // "All" checked = no filter applied = empty array
  const clientsAllChecked = selectedClients.length === 0;
  const sitesAllChecked = selectedSites.length === 0;
  const positionsAllChecked = selectedPositions.length === 0;
  const employeesAllChecked = selectedEmployees.length === 0;
  const shiftTypesAllChecked = selectedShiftTypes.length === 0;
  const skillsAllChecked = selectedSkills.length === 0;
  const tagsAllChecked = selectedTags.length === 0;

  function handleToggleItem(
    item: string,
    selected: string[],
    allItems: string[],
    onChange: (items: string[]) => void,
  ) {
    let next: string[];
    if (selected.includes(item)) {
      next = selected.filter((v) => v !== item);
    } else {
      next = [...selected, item];
    }
    if (next.length === allItems.length) {
      onChange([]);
    } else {
      onChange(next);
    }
  }

  const handleResetAll = () => {
    setSelectedShiftTypes([]);
    setSelectedSkills([]);
    setSelectedTags([]);
    onResetFilters();
  };

  // When client selection changes, clear sites that no longer belong to selected clients
  const handleClientsChange = (nextClients: string[]) => {
    onSelectedClientsChange(nextClients);
    if (nextClients.length > 0 && selectedSites.length > 0) {
      const clientIdSet = new Set(nextClients);
      const validSiteCodes = new Set(
        sites.filter((s) => s.client_id && clientIdSet.has(s.client_id)).map((s) => s.site_code),
      );
      const filtered = selectedSites.filter((code) => validSiteCodes.has(code));
      if (filtered.length !== selectedSites.length) {
        onSelectedSitesChange(filtered);
      }
    }
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

      {/* Client */}
      <FilterAccordion title="Client">
        <label className="flex items-center gap-2 text-[12px] cursor-pointer mb-0.5">
          <input
            type="checkbox"
            checked={clientsAllChecked}
            onChange={() => { onSelectedClientsChange([]); onSelectedSitesChange([]); }}
            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-foreground font-medium">All</span>
        </label>
        {clients.map((c) => (
          <label key={c.id} className="flex items-center gap-2 text-[12px] cursor-pointer">
            <input
              type="checkbox"
              checked={selectedClients.includes(c.id)}
              onChange={() =>
                handleToggleItem(c.id, selectedClients, clients.map((x) => x.id), handleClientsChange)
              }
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-foreground truncate">{c.name}</span>
          </label>
        ))}
      </FilterAccordion>

      {/* Sites */}
      <FilterAccordion title="Sites">
        <label className="flex items-center gap-2 text-[12px] cursor-pointer mb-0.5">
          <input
            type="checkbox"
            checked={sitesAllChecked}
            onChange={() => onSelectedSitesChange([])}
            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-foreground font-medium">All</span>
        </label>
        {visibleSites.map((site) => (
          <label key={site.site_code} className="flex items-center gap-2 text-[12px] cursor-pointer">
            <input
              type="checkbox"
              checked={selectedSites.includes(site.site_code)}
              onChange={() =>
                handleToggleItem(
                  site.site_code,
                  selectedSites,
                  visibleSites.map((s) => s.site_code),
                  onSelectedSitesChange,
                )
              }
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-foreground truncate">{site.site_code} – {site.name}</span>
          </label>
        ))}
      </FilterAccordion>

      {/* Employees */}
      <FilterAccordion title="Employees">
        <label className="flex items-center gap-2 text-[12px] cursor-pointer mb-0.5">
          <input
            type="checkbox"
            checked={employeesAllChecked}
            onChange={() => onSelectedEmployeesChange([])}
            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-foreground font-medium">All</span>
        </label>
        {employeeList.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic pl-5">No active employees found.</p>
        )}
        {employeeList.map((name) => (
          <label key={name} className="flex items-center gap-2 text-[12px] cursor-pointer">
            <input
              type="checkbox"
              checked={selectedEmployees.includes(name)}
              onChange={() =>
                handleToggleItem(name, selectedEmployees, employeeList, onSelectedEmployeesChange)
              }
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-foreground truncate">{name}</span>
          </label>
        ))}
      </FilterAccordion>

      {/* Position */}
      <FilterAccordion title="Position">
        <label className="flex items-center gap-2 text-[12px] cursor-pointer mb-0.5">
          <input
            type="checkbox"
            checked={positionsAllChecked}
            onChange={() => onSelectedPositionsChange([])}
            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-foreground font-medium">All</span>
        </label>
        {availablePositions.map((pos) => (
          <label key={pos} className="flex items-center gap-2 text-[12px] cursor-pointer">
            <input
              type="checkbox"
              checked={selectedPositions.includes(pos)}
              onChange={() =>
                handleToggleItem(pos, selectedPositions, availablePositions, onSelectedPositionsChange)
              }
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-foreground truncate">
              {pos.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </label>
        ))}
      </FilterAccordion>

      {/* Skills */}
      <FilterAccordion title="Skills">
        <label className="flex items-center gap-2 text-[12px] cursor-pointer mb-0.5">
          <input type="checkbox" checked={skillsAllChecked} onChange={() => setSelectedSkills([])}
            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary" />
          <span className="text-foreground font-medium">All</span>
        </label>
        <p className="text-[11px] text-muted-foreground italic pl-5">No skills configured yet.</p>
      </FilterAccordion>

      {/* Shift Types */}
      <FilterAccordion title="Shift Types">
        <label className="flex items-center gap-2 text-[12px] cursor-pointer mb-0.5">
          <input type="checkbox" checked={shiftTypesAllChecked} onChange={() => setSelectedShiftTypes([])}
            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary" />
          <span className="text-foreground font-medium">All</span>
        </label>
        {SHIFT_TYPES.map((type) => (
          <label key={type} className="flex items-center gap-2 text-[12px] cursor-pointer">
            <input
              type="checkbox"
              checked={selectedShiftTypes.includes(type)}
              onChange={() => handleToggleItem(type, selectedShiftTypes, [...SHIFT_TYPES], setSelectedShiftTypes)}
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-foreground truncate">{type}</span>
          </label>
        ))}
      </FilterAccordion>

      {/* Tags */}
      <FilterAccordion title="Tags">
        <label className="flex items-center gap-2 text-[12px] cursor-pointer mb-0.5">
          <input type="checkbox" checked={tagsAllChecked} onChange={() => setSelectedTags([])}
            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary" />
          <span className="text-foreground font-medium">All</span>
        </label>
        <p className="text-[11px] text-muted-foreground italic pl-5">No shift tags configured yet.</p>
      </FilterAccordion>

      <div className="border-t border-border pt-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
          <span className="text-foreground text-xs">Empty Shifts Only</span>
        </label>
      </div>

      <button
        type="button"
        onClick={handleResetAll}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <RotateCcw className="h-3 w-3" />
        Reset to Full Schedule
      </button>
    </aside>
  );
}
