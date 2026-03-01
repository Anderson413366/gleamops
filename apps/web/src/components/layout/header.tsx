'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  Check,
  Search,
  Building2,
  Calendar,
  MapPin,
  Briefcase,
  Users,
  TrendingUp,
  FileText,
  ClipboardCheck,
  Wrench,
  Settings,
  LogOut,
  Sun,
  Moon,
  AlertTriangle,
  Clock,
  X,
  Keyboard,
} from 'lucide-react';
import { CommandPalette, type CommandItem, DensityToggle } from '@gleamops/ui';
import { roleDisplayName } from '@gleamops/shared';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useDensity } from '@/hooks/use-density';
import { Breadcrumbs } from './breadcrumbs';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils/date';

// ---------------------------------------------------------------------------
// Unified feed item — merges notifications + alerts
// ---------------------------------------------------------------------------
interface FeedItem {
  id: string;
  source: 'notification' | 'alert';
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
  // Alert-specific
  alert_type?: string;
  severity?: string;
  entity_type?: string;
  entity_id?: string;
  dismissed_at?: string | null;
}

type FeedTone = 'info' | 'positive' | 'attention' | 'urgent';

function getAlertIcon(alertType: string | undefined) {
  switch (alertType) {
    case 'TIME_EXCEPTION':
      return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
    case 'MISSING_CHECKOUT':
      return <Clock className="h-3.5 w-3.5 text-destructive" />;
    default:
      return <Bell className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function getFeedTone(item: FeedItem): FeedTone {
  if (item.source === 'notification') {
    return item.read_at ? 'info' : 'positive';
  }

  const severity = item.severity?.toUpperCase();
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'urgent';
  if (severity === 'MEDIUM' || severity === 'WARNING') return 'attention';
  return 'info';
}

function getToneLabel(tone: FeedTone): string {
  switch (tone) {
    case 'positive':
      return 'Positive';
    case 'attention':
      return 'Attention';
    case 'urgent':
      return 'Action needed';
    default:
      return 'FYI';
  }
}

function getToneChipClass(tone: FeedTone): string {
  switch (tone) {
    case 'positive':
      return 'bg-success/15 text-success';
    case 'attention':
      return 'bg-warning/15 text-warning';
    case 'urgent':
      return 'bg-destructive/15 text-destructive';
    default:
      return 'bg-info/15 text-info';
  }
}

function getAlertLink(item: FeedItem): string | null {
  if (item.source === 'notification') return item.link;
  if (!item.entity_type) return null;

  switch (item.entity_type) {
    case 'time_exception':
      return '/jobs?tab=time';
    case 'work_ticket':
      // Legacy links used /schedule; operations now owns ticket details.
      return `/jobs?tab=tickets&ticket=${item.entity_id}`;
    case 'time_entry':
      return '/team?tab=timesheets';
    default:
      return null;
  }
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

type QuickCreateAction = 'create-client' | 'create-site' | 'create-job' | 'create-prospect';
type GoNavKey = 'h' | 's' | 'j' | 'c' | 't' | 'e';

const QUICK_CREATE_ROUTES: Record<QuickCreateAction, string> = {
  'create-client': '/clients?tab=clients&action=create-client',
  'create-site': '/clients?tab=sites&action=create-site',
  'create-job': '/jobs?tab=tickets&action=create-job',
  'create-prospect': '/pipeline?tab=prospects&action=create-prospect',
};

const GO_NAV_ROUTES: Record<GoNavKey, string> = {
  h: '/home',
  s: '/schedule',
  j: '/jobs',
  c: '/clients',
  t: '/team',
  e: '/equipment',
};

interface ShortcutRow {
  keys: string;
  description: string;
}

const SHORTCUT_ROWS: ShortcutRow[] = [
  { keys: 'Cmd/Ctrl + K', description: 'Open command palette' },
  { keys: '?', description: 'Open keyboard shortcuts help' },
  { keys: 'Cmd/Ctrl + Shift + C', description: 'New Client' },
  { keys: 'Cmd/Ctrl + Shift + S', description: 'New Site' },
  { keys: 'Cmd/Ctrl + Shift + J', description: 'New Service Plan' },
  { keys: 'Cmd/Ctrl + Shift + P', description: 'New Prospect' },
  { keys: 'G then H', description: 'Go to Home' },
  { keys: 'G then S', description: 'Go to Schedule' },
  { keys: 'G then J', description: 'Go to Jobs' },
  { keys: 'G then C', description: 'Go to Clients' },
  { keys: 'G then T', description: 'Go to Team' },
  { keys: 'G then E', description: 'Go to Equipment' },
  { keys: 'Esc', description: 'Close modal / drawer / palette' },
];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function Header() {
  const { user, role, signOut } = useAuth();
  const { resolvedTheme, trueBlack, setTheme, setTrueBlack, mounted } = useTheme();
  const { density, setDensity, mounted: densityMounted } = useDensity();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [items, setItems] = useState<CommandItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const goSequenceRef = useRef(false);
  const goSequenceTimerRef = useRef<number | null>(null);

  const unreadCount = feedItems.filter((n) => !n.read_at).length;
  const unreadUrgentCount = feedItems.filter((n) => !n.read_at && getFeedTone(n) === 'urgent').length;

  const clearGoSequence = useCallback(() => {
    goSequenceRef.current = false;
    if (goSequenceTimerRef.current != null) {
      window.clearTimeout(goSequenceTimerRef.current);
      goSequenceTimerRef.current = null;
    }
  }, []);

  const triggerQuickCreate = useCallback(
    (action: QuickCreateAction) => {
      window.dispatchEvent(new CustomEvent('gleamops:quick-create', { detail: { action } }));
      router.push(QUICK_CREATE_ROUTES[action]);
      setPaletteOpen(false);
      setShortcutsOpen(false);
    },
    [router]
  );

  const goToSection = useCallback(
    (key: GoNavKey) => {
      router.push(GO_NAV_ROUTES[key]);
      setPaletteOpen(false);
      setShortcutsOpen(false);
    },
    [router]
  );

  // Fetch notifications + alerts on mount + when dropdown opens
  const fetchFeed = useCallback(async () => {
    if (!user) return;
    setNotifLoading(true);
    const supabase = getSupabaseBrowserClient();

    const [notifRes, alertRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, title, body, link, read_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(15),
      supabase
        .from('alerts')
        .select('id, alert_type, severity, title, body, entity_type, entity_id, read_at, dismissed_at, created_at')
        .eq('target_user_id', user.id)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(15),
    ]);

    const items: FeedItem[] = [];

    if (notifRes.data) {
      for (const n of notifRes.data) {
        items.push({
          id: n.id,
          source: 'notification',
          title: n.title,
          body: n.body,
          link: n.link,
          read_at: n.read_at,
          created_at: n.created_at,
        });
      }
    }

    if (alertRes.data) {
      for (const a of alertRes.data as {
        id: string; alert_type: string; severity: string; title: string;
        body: string | null; entity_type: string | null; entity_id: string | null;
        read_at: string | null; dismissed_at: string | null; created_at: string;
      }[]) {
        items.push({
          id: a.id,
          source: 'alert',
          title: a.title,
          body: a.body ?? '',
          link: null,
          read_at: a.read_at,
          created_at: a.created_at,
          alert_type: a.alert_type,
          severity: a.severity,
          entity_type: a.entity_type ?? undefined,
          entity_id: a.entity_id ?? undefined,
          dismissed_at: a.dismissed_at,
        });
      }
    }

    // Sort merged feed by created_at DESC
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setFeedItems(items.slice(0, 20));
    setNotifLoading(false);
  }, [user]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  // Also refresh when dropdown opens
  useEffect(() => {
    if (notifOpen) fetchFeed();
  }, [notifOpen, fetchFeed]);

  const markAsRead = useCallback(async (item: FeedItem) => {
    const supabase = getSupabaseBrowserClient();
    const now = new Date().toISOString();

    if (item.source === 'notification') {
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', item.id);
    } else {
      await supabase
        .from('alerts')
        .update({ read_at: now })
        .eq('id', item.id);
    }

    setFeedItems((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read_at: now } : n))
    );
  }, []);

  const dismissAlert = useCallback(async (e: React.MouseEvent, item: FeedItem) => {
    e.stopPropagation();
    if (item.source !== 'alert') return;

    const supabase = getSupabaseBrowserClient();
    await supabase
      .from('alerts')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', item.id);

    setFeedItems((prev) => prev.filter((n) => n.id !== item.id));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const unread = feedItems.filter((n) => !n.read_at);
    if (unread.length === 0) return;

    const supabase = getSupabaseBrowserClient();
    const now = new Date().toISOString();

    // Mark all notifications read
    await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('user_id', user.id)
      .is('read_at', null);

    // Mark all alerts read
    await supabase
      .from('alerts')
      .update({ read_at: now })
      .eq('target_user_id', user.id)
      .is('read_at', null);

    setFeedItems((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || now }))
    );
  }, [user, feedItems]);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Global keyboard shortcuts: palette/help/create/navigation + close behavior.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const editable = isEditableTarget(e.target);
      const key = e.key.toLowerCase();
      const hasModifier = e.metaKey || e.ctrlKey;

      if (e.key === 'Escape') {
        setNotifOpen(false);
        setProfileOpen(false);
        setThemeOpen(false);
        setPaletteOpen(false);
        setShortcutsOpen(false);
        clearGoSequence();
        window.dispatchEvent(new CustomEvent('gleamops:close'));
        return;
      }

      if (hasModifier && key === 'k') {
        if (editable) return;
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
        setShortcutsOpen(false);
        clearGoSequence();
        return;
      }

      if (hasModifier && e.shiftKey && !editable) {
        if (key === 'c') {
          e.preventDefault();
          triggerQuickCreate('create-client');
          clearGoSequence();
          return;
        }
        if (key === 's') {
          e.preventDefault();
          triggerQuickCreate('create-site');
          clearGoSequence();
          return;
        }
        if (key === 'j') {
          e.preventDefault();
          triggerQuickCreate('create-job');
          clearGoSequence();
          return;
        }
        if (key === 'p') {
          e.preventDefault();
          triggerQuickCreate('create-prospect');
          clearGoSequence();
          return;
        }
      }

      if (!hasModifier && !e.altKey && !editable) {
        if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
          e.preventDefault();
          setShortcutsOpen((prev) => !prev);
          setPaletteOpen(false);
          clearGoSequence();
          return;
        }

        if (goSequenceRef.current) {
          if (key === 'h' || key === 's' || key === 'j' || key === 'c' || key === 't' || key === 'e') {
            e.preventDefault();
            goToSection(key as GoNavKey);
            clearGoSequence();
            return;
          }
          clearGoSequence();
        }

        if (key === 'g') {
          goSequenceRef.current = true;
          if (goSequenceTimerRef.current != null) {
            window.clearTimeout(goSequenceTimerRef.current);
          }
          goSequenceTimerRef.current = window.setTimeout(() => {
            clearGoSequence();
          }, 1000);
        }
      }
    }

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      clearGoSequence();
    };
  }, [clearGoSequence, goToSection, triggerQuickCreate]);

  // Allow non-header UI (for example sidebar search) to open the command palette.
  useEffect(() => {
    function handleOpen() {
      setPaletteOpen(true);
    }
    window.addEventListener('gleamops:open-command-palette', handleOpen);
    return () => window.removeEventListener('gleamops:open-command-palette', handleOpen);
  }, []);

  // Search across entities when palette opens
  const handleSearch = useCallback(async (query: string) => {
    const normalized = query.trim().toLowerCase();
    const staticItems: Array<CommandItem & { keywords: string[] }> = [
      {
        id: 'quick-create-client',
        label: 'New Client',
        sublabel: 'Create a new client record',
        category: 'Quick Actions',
        icon: <Building2 className="h-4 w-4" />,
        keywords: ['new client', 'create client', 'add client', 'client'],
        onSelect: () => triggerQuickCreate('create-client'),
      },
      {
        id: 'quick-create-site',
        label: 'New Site',
        sublabel: 'Create a new client site',
        category: 'Quick Actions',
        icon: <MapPin className="h-4 w-4" />,
        keywords: ['new site', 'create site', 'add site', 'site'],
        onSelect: () => triggerQuickCreate('create-site'),
      },
      {
        id: 'quick-create-job',
        label: 'New Service Plan',
        sublabel: 'Create a new service plan',
        category: 'Quick Actions',
        icon: <Briefcase className="h-4 w-4" />,
        keywords: ['new job', 'create job', 'add job', 'service plan'],
        onSelect: () => triggerQuickCreate('create-job'),
      },
      {
        id: 'quick-create-prospect',
        label: 'New Prospect',
        sublabel: 'Create a new pipeline prospect',
        category: 'Quick Actions',
        icon: <TrendingUp className="h-4 w-4" />,
        keywords: ['new prospect', 'create prospect', 'add prospect', 'lead'],
        onSelect: () => triggerQuickCreate('create-prospect'),
      },
      {
        id: 'goto-home',
        label: 'Go to Home',
        sublabel: 'Navigate to Home dashboard',
        category: 'Go To',
        icon: <Building2 className="h-4 w-4" />,
        keywords: ['go home', 'go to home', 'home'],
        onSelect: () => goToSection('h'),
      },
      {
        id: 'goto-schedule',
        label: 'Go to Schedule',
        sublabel: 'Navigate to Schedule module',
        category: 'Go To',
        icon: <Calendar className="h-4 w-4" />,
        keywords: ['go schedule', 'go to schedule', 'schedule', 'calendar', 'planning'],
        onSelect: () => goToSection('s'),
      },
      {
        id: 'goto-jobs',
        label: 'Go to Jobs',
        sublabel: 'Navigate to Jobs module',
        category: 'Go To',
        icon: <ClipboardCheck className="h-4 w-4" />,
        keywords: ['go jobs', 'go to jobs', 'jobs', 'tickets', 'operations'],
        onSelect: () => goToSection('j'),
      },
      {
        id: 'goto-clients',
        label: 'Go to Clients',
        sublabel: 'Navigate to Clients module',
        category: 'Go To',
        icon: <Building2 className="h-4 w-4" />,
        keywords: ['go clients', 'go to clients', 'clients', 'crm', 'customers'],
        onSelect: () => goToSection('c'),
      },
      {
        id: 'goto-team',
        label: 'Go to Team',
        sublabel: 'Navigate to Team module',
        category: 'Go To',
        icon: <Users className="h-4 w-4" />,
        keywords: ['go team', 'go to team', 'team', 'workforce', 'staff'],
        onSelect: () => goToSection('t'),
      },
      {
        id: 'goto-equipment',
        label: 'Go to Equipment',
        sublabel: 'Navigate to Equipment module',
        category: 'Go To',
        icon: <Wrench className="h-4 w-4" />,
        keywords: ['go equipment', 'go to equipment', 'equipment', 'assets'],
        onSelect: () => goToSection('e'),
      },
    ];

    const staticMatches = normalized
      ? staticItems.filter((item) => {
          const searchable = `${item.label} ${item.sublabel ?? ''} ${item.category} ${item.keywords.join(' ')}`.toLowerCase();
          return searchable.includes(normalized);
        })
      : staticItems;

    if (!normalized) {
      setItems(staticMatches);
      setLoading(false);
      return;
    }

    if (normalized.length < 2) {
      setItems(staticMatches);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const q = `%${query}%`;

    const [clients, sites, prospects, bids, staff] = await Promise.all([
      supabase
        .from('clients')
        .select('id, client_code, name')
        .or(`name.ilike.${q},client_code.ilike.${q}`)
        .limit(5),
      supabase
        .from('sites')
        .select('id, site_code, address')
        .or(`site_code.ilike.${q}`)
        .limit(5),
      supabase
        .from('sales_prospects')
        .select('id, prospect_code, company_name')
        .or(`company_name.ilike.${q},prospect_code.ilike.${q}`)
        .limit(5),
      supabase
        .from('sales_bids')
        .select('id, bid_code, status')
        .or(`bid_code.ilike.${q}`)
        .limit(5),
      supabase
        .from('staff')
        .select('id, staff_code, full_name')
        .or(`full_name.ilike.${q},staff_code.ilike.${q}`)
        .limit(5),
    ]);

    const results: CommandItem[] = [...staticMatches];

    if (clients.data) {
      for (const c of clients.data) {
        results.push({
          id: `client-${c.id}`,
          label: c.name,
          sublabel: c.client_code,
          category: 'Clients',
          icon: <Building2 className="h-4 w-4" />,
          href: `/clients/${c.client_code}`,
        });
      }
    }

    if (sites.data) {
      for (const s of sites.data) {
        results.push({
          id: `site-${s.id}`,
          label: s.site_code,
          sublabel: s.address?.street || '',
          category: 'Sites',
          icon: <MapPin className="h-4 w-4" />,
          href: `/clients/sites/${s.site_code}`,
        });
      }
    }

    if (prospects.data) {
      for (const p of prospects.data) {
        results.push({
          id: `prospect-${p.id}`,
          label: p.company_name,
          sublabel: p.prospect_code,
          category: 'Prospects',
          icon: <TrendingUp className="h-4 w-4" />,
          href: `/pipeline/prospects/${p.prospect_code}`,
        });
      }
    }

    if (bids.data) {
      for (const b of bids.data) {
        results.push({
          id: `bid-${b.id}`,
          label: b.bid_code,
          sublabel: b.status,
          category: 'Bids',
          icon: <FileText className="h-4 w-4" />,
          href: `/pipeline/bids/${b.bid_code}`,
        });
      }
    }

    if (staff.data) {
      for (const s of staff.data) {
        results.push({
          id: `staff-${s.id}`,
          label: s.full_name,
          sublabel: s.staff_code,
          category: 'Team',
          icon: <Users className="h-4 w-4" />,
          href: `/team/staff/${s.staff_code}`,
        });
      }
    }

    setItems(results);
    setLoading(false);
  }, [goToSection, triggerQuickCreate]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      if (item.onSelect) {
        item.onSelect();
        return;
      }
      if (item.href) {
        router.push(item.href);
      }
    },
    [router]
  );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: breadcrumbs */}
        <div className="flex-1 min-w-0">
          <Breadcrumbs />
        </div>

        {/* Right: search + theme toggle + notifications + avatar */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search trigger */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="rounded-lg p-2 sm:px-3 sm:py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 ease-in-out inline-flex items-center gap-2"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">Search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => {
              setShortcutsOpen(true);
              setPaletteOpen(false);
            }}
            className="hidden md:inline-flex rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 ease-in-out items-center gap-2"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="h-4 w-4" />
            <span className="hidden lg:inline text-sm">Shortcuts</span>
            <kbd className="hidden lg:inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              ?
            </kbd>
          </button>

          {/* Density toggle — hidden on mobile */}
          {densityMounted && (
            <span className="hidden lg:inline-flex">
              <DensityToggle density={density} onChange={setDensity} />
            </span>
          )}

          {/* Theme picker */}
          {mounted && (
            <div className="relative" ref={themeRef}>
              <button
                type="button"
                onClick={() => { setThemeOpen(!themeOpen); setNotifOpen(false); setProfileOpen(false); }}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 ease-in-out"
                aria-label="Theme"
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
              {themeOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-card rounded-xl shadow-xl border border-border z-50 animate-scale-in overflow-hidden">
                  <div className="p-1.5 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => { setTheme('light'); setThemeOpen(false); }}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 ease-in-out ${
                        resolvedTheme === 'light'
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <Sun className="h-4 w-4" />
                      Light
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTheme('dark'); setTrueBlack(false); setThemeOpen(false); }}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 ease-in-out ${
                        resolvedTheme === 'dark' && !trueBlack
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <Moon className="h-4 w-4" />
                      Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTheme('dark'); setTrueBlack(true); setThemeOpen(false); }}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 ease-in-out ${
                        resolvedTheme === 'dark' && trueBlack
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <span className="h-4 w-4 flex items-center justify-center">
                        <span className="h-3 w-3 rounded-full bg-current" />
                      </span>
                      True Black
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notifications & Alerts dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); setThemeOpen(false); }}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 ease-in-out relative"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span
                  className={`absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                    unreadUrgentCount > 0
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-info text-primary-foreground'
                  }`}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-[22rem] overflow-hidden rounded-xl border border-border bg-card shadow-xl animate-scale-in">
                <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">Updates</p>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {notifLoading && feedItems.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                ) : feedItems.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">You are all caught up.</p>
                    <p className="text-xs text-muted-foreground mt-1">When you are ready, new updates will appear here.</p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-border">
                    {feedItems.map((item) => {
                      const link = getAlertLink(item);
                      const tone = getFeedTone(item);
                      return (
                        <button
                          key={`${item.source}-${item.id}`}
                          type="button"
                          className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                            !item.read_at ? 'bg-module-accent/5' : ''
                          }`}
                          onClick={() => {
                            if (!item.read_at) markAsRead(item);
                            if (link) {
                              router.push(link);
                              setNotifOpen(false);
                            }
                          }}
                        >
                          <div className="flex items-start gap-2">
                            {/* Icon: source-specific */}
                            <div className="mt-1 shrink-0">
                              {item.source === 'alert' ? (
                                getAlertIcon(item.alert_type)
                              ) : !item.read_at ? (
                                <span className="mt-0.5 block h-2 w-2 rounded-full bg-module-accent" />
                              ) : (
                                <Check className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getToneChipClass(tone)}`}>
                                {getToneLabel(tone)}
                              </span>
                              <p className={`text-sm truncate ${!item.read_at ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {item.body}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {formatRelative(item.created_at)}
                              </p>
                            </div>
                            {/* Dismiss button for alerts */}
                            {item.source === 'alert' && (
                              <button
                                type="button"
                                onClick={(e) => dismissAlert(e, item)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                aria-label="Dismiss"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
              className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold hover:bg-primary/90 transition-all duration-200 ease-in-out cursor-pointer ring-2 ring-background shadow-sm"
            >
              {user ? getInitials(user.email) : '?'}
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-card rounded-xl shadow-xl border border-border z-50 animate-scale-in overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/50">
                  <p className="text-sm font-semibold text-foreground truncate">{user?.email}</p>
                  {role && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {roleDisplayName(role)}
                    </p>
                  )}
                </div>
                <div className="p-1.5">
                  <Link
                    href="/settings?view=profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-muted transition-all duration-200 ease-in-out"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setProfileOpen(false); signOut(); }}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-muted transition-all duration-200 ease-in-out w-full"
                  >
                    <LogOut className="h-4 w-4 text-muted-foreground" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </header>

      {shortcutsOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setShortcutsOpen(false)}
          />
          <div className="fixed left-1/2 top-[16%] w-full max-w-xl -translate-x-1/2 px-4 animate-scale-in">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-module-accent" />
                  <h2 className="text-base font-semibold text-foreground">Keyboard Shortcuts</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShortcutsOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Close keyboard shortcuts"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
                <div className="space-y-2">
                  {SHORTCUT_ROWS.map((row) => (
                    <div
                      key={row.keys}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
                    >
                      <span className="text-sm text-foreground">{row.description}</span>
                      <kbd className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                        {row.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={items}
        onSelect={handleSelect}
        onSearch={handleSearch}
        loading={loading}
        placeholder="Search records, type 'new client', or 'go to operations'..."
      />
    </>
  );
}
