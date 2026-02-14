'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  Search,
  Building2,
  MapPin,
  Users,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { CommandPalette, type CommandItem } from '@gleamops/ui';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

function getInitials(email: string): string {
  const name = email.split('@')[0];
  if (!name) return '?';
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Header() {
  const { user, role, signOut } = useAuth();
  const { resolvedTheme, trueBlack, setTheme, setTrueBlack, mounted } = useTheme();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [items, setItems] = useState<CommandItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

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

  // Close dropdowns on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setProfileOpen(false);
        setThemeOpen(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Open palette with Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Search across entities when palette opens
  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setItems([]);
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

    const results: CommandItem[] = [];

    if (clients.data) {
      for (const c of clients.data) {
        results.push({
          id: `client-${c.id}`,
          label: c.name,
          sublabel: c.client_code,
          category: 'Clients',
          icon: <Building2 className="h-4 w-4" />,
          href: `/crm?client=${c.client_code}`,
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
          href: `/crm?site=${s.site_code}`,
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
          href: `/pipeline?prospect=${p.prospect_code}`,
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
          href: `/pipeline?bid=${b.bid_code}`,
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
          href: `/people?staff=${s.staff_code}`,
        });
      }
    }

    setItems(results);
    setLoading(false);
  }, []);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      if (item.href) {
        router.push(item.href);
      }
      item.onSelect?.();
    },
    [router]
  );

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-card border-b border-border shadow-sm flex items-center justify-between px-6">
        {/* Left: breadcrumb / page title area (filled by each page) */}
        <div className="flex-1" />

        {/* Right: search + theme toggle + notifications + avatar */}
        <div className="flex items-center gap-2">
          {/* Search trigger */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 ease-in-out inline-flex items-center gap-2"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">Search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          {/* Theme picker */}
          {mounted && (
            <div className="relative" ref={themeRef}>
              <button
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

          {/* Notifications dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 ease-in-out relative"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl shadow-xl border border-border z-50 animate-scale-in overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/50">
                  <p className="text-sm font-semibold text-foreground">Notifications</p>
                </div>
                <div className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">No new notifications</p>
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
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
                      {role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </p>
                  )}
                </div>
                <div className="p-1.5">
                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-muted transition-all duration-200 ease-in-out"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Settings
                  </Link>
                  <button
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
      </header>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={items}
        onSelect={handleSelect}
        onSearch={handleSearch}
        loading={loading}
        placeholder="Search clients, sites, prospects, bids, staff..."
      />
    </>
  );
}
