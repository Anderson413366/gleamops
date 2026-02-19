'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Home,
  TrendingUp,
  Building2,
  Calendar,
  Users,
  BarChart3,
  Package,
  Truck,
  Wrench,
  ShieldCheck,
  Settings,
  LayoutDashboard,
  MoonStar,
  ClipboardList,
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
  AlertTriangle,
  LineChart,
  ChevronRight,
} from 'lucide-react';
import { getModuleFromPathname, NAVIGATION_V2, roleDisplayName } from '@gleamops/shared';
import { useAuth } from '@/hooks/use-auth';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  TrendingUp,
  Building2,
  Calendar,
  Users,
  BarChart3,
  Package,
  Truck,
  Wrench,
  Settings,
  ShieldCheck,
  LayoutDashboard,
  MoonStar,
  ClipboardList,
};

const QUICK_ACTION_ITEMS = [
  { id: 'new-client', label: 'New Client', icon: UserPlus, href: '/customers?action=create-client' },
  { id: 'new-site', label: 'New Site', icon: MapPin, href: '/customers?action=create-site' },
  { id: 'new-prospect', label: 'New Prospect', icon: TrendingUp, href: '/sales?action=create-prospect' },
  { id: 'new-job', label: 'New Service Plan', icon: Briefcase, href: '/work?tab=jobs&action=create-job' },
  { id: 'new-inspection', label: 'New Inspection', icon: ClipboardCheck, href: '/work?tab=inspections&action=create-inspection' },
  { id: 'log-ticket', label: 'Log Ticket', icon: AlertTriangle, href: '/work?tab=tickets&action=create-ticket' },
];

function getInitials(email: string): string {
  const name = email.split('@')[0];
  if (!name) return '?';
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab');
  const activeModule = getModuleFromPathname(pathname);
  const financialIntelEnabled = useFeatureFlag('financial_intel_v1');
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  const quickRef = useRef<HTMLDivElement>(null);
  const { user, role, signOut } = useAuth();

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
          work: ticketsRes.count || 0,
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

      {/* Sidebar — dark bg with sidebar tokens */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-bg border-r border-white/10 flex flex-col transition-transform duration-300 ease-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-white/10">
          <Link href="/command" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">GleamOps</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden rounded-lg p-1.5 text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-all duration-200 ease-in-out"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search trigger */}
        <div className="px-3 pt-3 pb-1">
          <button
            type="button"
            onClick={() => {
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

        {/* Nav items with collapsible sub-items */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {NAVIGATION_V2.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? Building2;
            const isActive = activeModule === item.id || pathname.startsWith(item.href);
            const badgeCount = badgeCounts[item.id] ?? 0;
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.id}>
                {/* Parent nav item */}
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ease-in-out group ${
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
                  <span className="truncate">{item.label}</span>
                  {hasChildren && (
                    <ChevronRight
                      className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                        isActive ? 'rotate-90 text-module-accent/60' : 'text-sidebar-text/40'
                      }`}
                    />
                  )}
                  {!hasChildren && isActive && badgeCount === 0 && (
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

                {/* Collapsible children — shown when active */}
                {isActive && hasChildren && (
                  <div className="ml-5 mt-0.5 mb-1 pl-4 border-l border-white/10 space-y-0.5">
                    {item.children!.map((child) => {
                      const isChildActive = activeTab === child.key ||
                        (!activeTab && child === item.children![0]);
                      return (
                        <Link
                          key={child.key}
                          href={`${item.href}?tab=${child.key}`}
                          onClick={() => setMobileOpen(false)}
                          className={`block rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            isChildActive
                              ? 'text-module-accent bg-module-accent/10'
                              : 'text-sidebar-text/70 hover:text-white hover:bg-sidebar-hover'
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {financialIntelEnabled && (
            <Link
              href="/financial-intelligence"
              onClick={() => setMobileOpen(false)}
              aria-current={pathname.startsWith('/financial-intelligence') ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ease-in-out group ${
                pathname.startsWith('/financial-intelligence')
                  ? 'border-module-accent/30 bg-module-accent/15 text-module-accent'
                  : 'border-transparent text-sidebar-text hover:bg-sidebar-hover hover:text-white'
              }`}
            >
              <LineChart
                className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
                  pathname.startsWith('/financial-intelligence')
                    ? 'text-module-accent'
                    : 'text-sidebar-text group-hover:text-white'
                }`}
              />
              Financial Intel
            </Link>
          )}
        </nav>

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
