'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Home,
  TrendingUp,
  Building2,
  Calendar,
  CalendarDays,
  Users,
  BarChart3,
  Package,
  Truck,
  Wrench,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  Search,
  Plus,
  UserPlus,
  MapPin,
  Briefcase,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Clock3,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  FileText,
  LayoutDashboard,
  Columns3,
  Route,
  Contact,
  Inbox,
  UserSearch,
  Target,
  FileSpreadsheet,
  FileCheck,
  BookOpen,
  Layers,
  Link2,
  BriefcaseBusiness,
  DollarSign,
  UserRoundCheck,
  Box,
  ShoppingCart,
  Store,
  KeyRound,
  Award,
  GraduationCap,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { getModuleFromPathname, NAV_TREE, normalizeRoleCode, roleDisplayName, type NavItem } from '@gleamops/shared';
import { useAuth } from '@/hooks/use-auth';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useLocale } from '@/hooks/use-locale';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { NavigationTooltipTour } from './navigation-tooltip-tour';

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  TrendingUp,
  Building2,
  Calendar,
  CalendarDays,
  Users,
  BarChart3,
  Package,
  Truck,
  Wrench,
  Settings,
  ShieldCheck,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Briefcase,
  Route,
  Contact,
  Inbox,
  UserSearch,
  Target,
  FileSpreadsheet,
  FileCheck,
  BookOpen,
  Layers,
  Link2,
  BriefcaseBusiness,
  DollarSign,
  UserRoundCheck,
  FileText,
  Box,
  MapPin,
  ShoppingCart,
  Store,
  KeyRound,
  Award,
  GraduationCap,
  AlertTriangle,
  RefreshCw,
  LayoutDashboard,
  Columns3,
};

const QUICK_ACTION_ITEMS = [
  { id: 'new-client', label: 'New Client', icon: UserPlus, href: '/clients?action=create-client' },
  { id: 'new-site', label: 'New Site', icon: MapPin, href: '/clients?action=create-site' },
  { id: 'new-prospect', label: 'New Prospect', icon: TrendingUp, href: '/pipeline?action=create-prospect' },
  { id: 'new-job', label: 'New Service Plan', icon: Briefcase, href: '/jobs?tab=tickets&action=create-job' },
  { id: 'new-inspection', label: 'New Inspection', icon: ClipboardCheck, href: '/jobs?tab=inspections&action=create-inspection' },
  { id: 'log-ticket', label: 'Log Ticket', icon: AlertTriangle, href: '/jobs?tab=tickets&action=create-ticket' },
];

const LEGACY_NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', href: '/home', icon: 'Home' },
  { id: 'jobs', label: 'Operations', href: '/operations', icon: 'ClipboardCheck' },
  { id: 'clients', label: 'CRM', href: '/crm', icon: 'Building2' },
  { id: 'pipeline', label: 'Pipeline', href: '/pipeline', icon: 'TrendingUp' },
  { id: 'team', label: 'Workforce', href: '/workforce', icon: 'Users' },
  { id: 'inventory', label: 'Inventory', href: '/inventory', icon: 'Package' },
  { id: 'equipment', label: 'Assets', href: '/assets', icon: 'Wrench' },
  { id: 'safety', label: 'Safety', href: '/safety', icon: 'ShieldCheck' },
  { id: 'reports', label: 'Reports', href: '/reports', icon: 'BarChart3' },
  { id: 'settings', label: 'Admin', href: '/admin', icon: 'Settings' },
];

const SHIFTS_TIME_SIDEBAR_ROLES = new Set([
  'OWNER_ADMIN',
  'MANAGER',
  'SUPERVISOR',
  'CLEANER',
  'INSPECTOR',
]);

const EXPANDED_STORAGE_KEY = 'gleamops-nav-expanded';
const COLLAPSED_STORAGE_KEY = 'gleamops-sidebar-collapsed';

function loadCollapsedState(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true';
  } catch { return false; }
}

function saveCollapsedState(collapsed: boolean) {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed));
  } catch { /* ignore */ }
}

function getInitials(email: string): string {
  const name = email.split('@')[0];
  if (!name) return '?';
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function loadExpandedState(): Set<string> {
  try {
    const stored = localStorage.getItem(EXPANDED_STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch { /* ignore */ }
  return new Set<string>();
}

function saveExpandedState(expanded: Set<string>) {
  try {
    localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...expanded]));
  } catch { /* ignore */ }
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeModule = getModuleFromPathname(pathname);
  const v2NavigationEnabled = useFeatureFlag('v2_navigation');
  const shiftsTimeV1Enabled = useFeatureFlag('shifts_time_v1');
  const shiftsTimeRouteExecutionEnabled = useFeatureFlag('shifts_time_route_execution');
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const collapsedInitialized = useRef(false);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set<string>());
  const expandedInitialized = useRef(false);
  const quickRef = useRef<HTMLDivElement>(null);
  const { user, role, signOut } = useAuth();
  const { t } = useLocale();
  const roleCode = normalizeRoleCode(role ?? '') ?? (role ?? '').toUpperCase();
  const showShiftsTimeNav = SHIFTS_TIME_SIDEBAR_ROLES.has(roleCode)
    && (
      shiftsTimeV1Enabled
      || shiftsTimeRouteExecutionEnabled
      || roleCode === 'OWNER_ADMIN'
      || roleCode === 'MANAGER'
    );
  const shiftsTimeActive = pathname.startsWith('/shifts-time');

  // Hydrate expanded state from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    if (expandedInitialized.current) return;
    expandedInitialized.current = true;
    const stored = loadExpandedState();
    if (stored.size > 0) setExpanded(stored);
  }, []);

  // Hydrate collapsed state from localStorage after mount
  useEffect(() => {
    if (collapsedInitialized.current) return;
    collapsedInitialized.current = true;
    setSidebarCollapsed(loadCollapsedState());
  }, []);

  // Auto-expand the active module's parent on mount
  useEffect(() => {
    if (!v2NavigationEnabled) return;
    const active = NAV_TREE.find((item) => item.children && item.id === activeModule);
    if (active) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(active.id);
        saveExpandedState(next);
        return next;
      });
    }
  }, [activeModule, v2NavigationEnabled]);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      saveCollapsedState(next);
      window.dispatchEvent(new CustomEvent('gleamops:sidebar-toggle'));
      return next;
    });
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveExpandedState(next);
      return next;
    });
  }, []);

  // Fetch badge counts
  useEffect(() => {
    async function fetchBadges() {
      try {
        const supabase = getSupabaseBrowserClient();
        const [ticketsRes] = await Promise.all([
          supabase
            .from('work_tickets')
            .select('id', { count: 'exact', head: true })
            .in('status', ['SCHEDULED', 'IN_PROGRESS']),
        ]);
        setBadgeCounts({
          jobs: ticketsRes.count || 0,
        });
      } catch {
        // Badge counts are non-critical
      }
    }
    fetchBadges();
  }, []);

  // Close quick actions on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) {
        setQuickOpen(false);
      }
    }
    if (quickOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [quickOpen]);

  // Close quick actions on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setQuickOpen(false);
    }
    if (quickOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [quickOpen]);

  // Flat nav rendering (legacy + v2 flat fallback)
  const renderFlatNav = (items: NavItem[]) =>
    items.map((item) => {
      const Icon = ICON_MAP[item.icon] ?? Building2;
      const isJobsNavItem = item.id === 'jobs' || item.href === '/jobs';
      const suppressJobsActive = showShiftsTimeNav && shiftsTimeActive && isJobsNavItem;
      const isActive = (activeModule === item.id || pathname.startsWith(item.href)) && !suppressJobsActive;
      const badgeCount = badgeCounts[item.id] ?? 0;

      return (
        <Link
          key={`${item.id}-${item.href}`}
          href={item.href}
          data-nav-id={item.id}
          onClick={() => setMobileOpen(false)}
          aria-current={isActive ? 'page' : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ease-in-out group ${
            isActive
              ? 'border-module-accent/30 bg-module-accent/15 text-module-accent'
              : 'border-transparent text-sidebar-text hover:bg-sidebar-hover hover:text-white'
          }`}
        >
          <Icon
            className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
              isActive ? 'text-module-accent' : 'text-sidebar-text group-hover:text-white'
            }`}
          />
          {item.label}
          {isActive && badgeCount === 0 && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-module-accent" />
          )}
          {badgeCount > 0 && (
            <span className={`ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
              isActive
                ? 'bg-module-accent/20 text-module-accent'
                : 'bg-destructive/20 text-destructive'
            }`}>
              {badgeCount}
            </span>
          )}
        </Link>
      );
    });

  // Hierarchical nav rendering (v2 with accordion)
  const renderTreeNav = (items: NavItem[]) =>
    items.map((item) => {
      const Icon = ICON_MAP[item.icon] ?? Building2;
      const hasChildren = item.children && item.children.length > 0;
      const isJobsNavItem = item.id === 'jobs' || item.href === '/jobs';
      const suppressJobsActive = showShiftsTimeNav && shiftsTimeActive && isJobsNavItem;
      const isParentActive = (activeModule === item.id || pathname.startsWith(item.href)) && !suppressJobsActive;
      const isExpanded = expanded.has(item.id);
      const badgeCount = badgeCounts[item.id] ?? 0;

      if (!hasChildren) {
        // Leaf node — same rendering as flat nav
        return (
          <Link
            key={`${item.id}-${item.href}`}
            href={item.href}
            data-nav-id={item.id}
            onClick={() => setMobileOpen(false)}
            aria-current={isParentActive ? 'page' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ease-in-out group ${
              isParentActive
                ? 'border-module-accent/30 bg-module-accent/15 text-module-accent'
                : 'border-transparent text-sidebar-text hover:bg-sidebar-hover hover:text-white'
            }`}
          >
            <Icon
              className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
                isParentActive ? 'text-module-accent' : 'text-sidebar-text group-hover:text-white'
              }`}
            />
            {item.label}
            {isParentActive && badgeCount === 0 && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-module-accent" />
            )}
            {badgeCount > 0 && (
              <span className={`ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
                isParentActive
                  ? 'bg-module-accent/20 text-module-accent'
                  : 'bg-destructive/20 text-destructive'
              }`}>
                {badgeCount}
              </span>
            )}
          </Link>
        );
      }

      // Parent with children — accordion
      return (
        <div key={`${item.id}-${item.href}`}>
          <button
            type="button"
            data-nav-id={item.id}
            onClick={() => toggleExpanded(item.id)}
            className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ease-in-out group ${
              isParentActive
                ? 'border-module-accent/30 bg-module-accent/15 text-module-accent'
                : 'border-transparent text-sidebar-text hover:bg-sidebar-hover hover:text-white'
            }`}
          >
            <Icon
              className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
                isParentActive ? 'text-module-accent' : 'text-sidebar-text group-hover:text-white'
              }`}
            />
            {item.label}
            {badgeCount > 0 && (
              <span className={`ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
                isParentActive
                  ? 'bg-module-accent/20 text-module-accent'
                  : 'bg-destructive/20 text-destructive'
              }`}>
                {badgeCount}
              </span>
            )}
            <ChevronDown
              className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              } ${isParentActive ? 'text-module-accent' : 'text-sidebar-text group-hover:text-white'}`}
            />
          </button>
          {isExpanded && (
            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/5 pl-3">
              {item.children!.map((child, idx) => {
                const ChildIcon = ICON_MAP[child.icon] ?? Building2;
                // Check if the child's tab matches the current URL
                const childTabParam = new URL(child.href, 'http://localhost').searchParams.get('tab');
                const currentTab = searchParams.get('tab');
                const isChildActive = isParentActive && (
                  childTabParam ? currentTab === childTabParam : !currentTab
                );

                return (
                  <Link
                    key={`${child.id}-child-${idx}`}
                    href={child.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-all duration-200 ease-in-out group ${
                      isChildActive
                        ? 'text-module-accent font-medium'
                        : 'text-sidebar-text hover:text-white hover:bg-sidebar-hover'
                    }`}
                  >
                    <ChildIcon
                      className={`h-3.5 w-3.5 shrink-0 transition-colors duration-200 ${
                        isChildActive ? 'text-module-accent' : 'text-sidebar-text group-hover:text-white'
                      }`}
                    />
                    {child.label}
                    {isChildActive && (
                      <span className="ml-auto h-1 w-1 rounded-full bg-module-accent" />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    });

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden rounded-lg bg-card p-2 shadow-md border border-border transition-all duration-200 ease-in-out"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Overlay — backdrop blur for depth */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop collapse toggle — visible when sidebar is collapsed */}
      {sidebarCollapsed && (
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          className="fixed top-4 left-4 z-50 hidden md:flex rounded-lg bg-card p-2 shadow-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 ease-in-out"
          aria-label="Expand navigation"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      )}

      {/* Sidebar — dark bg with sidebar tokens */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-bg border-r border-white/10 flex flex-col transition-transform duration-300 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'md:-translate-x-full' : 'md:translate-x-0'}`}
      >
        {/* Header / Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-white/10">
          <Link href="/home" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">GleamOps</span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="hidden md:flex rounded-lg p-1.5 text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-all duration-200 ease-in-out"
              aria-label="Collapse navigation"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="md:hidden rounded-lg p-1.5 text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-all duration-200 ease-in-out"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search trigger */}
        <div className="px-3 pt-3 pb-1">
          <button
            type="button"
            onClick={() => {
              // Header owns the CommandPalette open state.
              window.dispatchEvent(new CustomEvent('gleamops:open-command-palette'));
              setMobileOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-colors"
          >
            <Search className="h-4 w-4" />
            <span>Search...</span>
            <kbd className="ml-auto rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-sidebar-text">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {v2NavigationEnabled
            ? renderTreeNav(NAV_TREE)
            : renderFlatNav(LEGACY_NAV_ITEMS)
          }
          {showShiftsTimeNav && (
            <Link
              href="/shifts-time"
              onClick={() => setMobileOpen(false)}
              aria-current={shiftsTimeActive ? 'page' : undefined}
              className={`mt-1 flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ease-in-out group ${
                shiftsTimeActive
                  ? 'border-module-accent/30 bg-module-accent/15 text-module-accent'
                  : 'border-transparent text-sidebar-text hover:bg-sidebar-hover hover:text-white'
              }`}
            >
              <Clock3
                className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
                  shiftsTimeActive ? 'text-module-accent' : 'text-sidebar-text group-hover:text-white'
                }`}
              />
              {t('shiftsTime.tab')}
              {shiftsTimeActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-module-accent" />}
            </Link>
          )}
        </nav>
        {v2NavigationEnabled && <NavigationTooltipTour />}

        {/* Quick Action FAB + Popover */}
        <div className="relative px-3 py-2" ref={quickRef}>
          {quickOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-white/10 bg-sidebar-hover shadow-2xl shadow-black/40 overflow-hidden animate-scale-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-text">
                  Quick Actions
                </span>
                <button
                  type="button"
                  onClick={() => setQuickOpen(false)}
                  className="rounded-md p-1 text-sidebar-text hover:text-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="p-2">
                {QUICK_ACTION_ITEMS.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => {
                        setQuickOpen(false);
                        setMobileOpen(false);
                        router.push(action.href);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-text hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <ActionIcon className="h-4 w-4" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setQuickOpen(!quickOpen)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-colors ${
              quickOpen
                ? 'bg-primary/90 ring-2 ring-primary/30'
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            <Plus className={`h-4 w-4 transition-transform ${quickOpen ? 'rotate-45' : ''}`} />
            Quick Action
          </button>
        </div>

        {/* Footer — profile + settings + sign out */}
        <div className="border-t border-white/10 p-3 space-y-1">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
              <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                {getInitials(user.email)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.email}</p>
                {role && (
                  <p className="text-xs text-sidebar-text capitalize">
                    {roleDisplayName(role)}
                  </p>
                )}
              </div>
            </div>
          )}
          <Link
            href="/settings?view=profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-all duration-200 ease-in-out"
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            Settings
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-text hover:text-destructive hover:bg-sidebar-hover transition-all duration-200 ease-in-out w-full"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
