'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, Building2, MapPin, Users, TrendingUp, FileText } from 'lucide-react';
import { CommandPalette, type CommandItem } from '@gleamops/ui';
import { useAuth } from '@/hooks/use-auth';
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
  const { user } = useAuth();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [items, setItems] = useState<CommandItem[]>([]);
  const [loading, setLoading] = useState(false);

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
          href: `/customers?client=${c.client_code}`,
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
          href: `/customers?site=${s.site_code}`,
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
          href: `/team?staff=${s.staff_code}`,
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
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-border flex items-center justify-between px-6">
        {/* Left: breadcrumb / page title area (filled by each page) */}
        <div className="flex-1" />

        {/* Right: search + notifications + avatar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPaletteOpen(true)}
            className="rounded-lg p-2 text-muted hover:bg-gray-50 hover:text-foreground transition-colors inline-flex items-center gap-2"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted">
              ⌘K
            </kbd>
          </button>
          <button
            className="rounded-lg p-2 text-muted hover:bg-gray-50 hover:text-foreground transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
          <div className="h-8 w-8 rounded-full bg-gleam-500 text-white flex items-center justify-center text-sm font-medium">
            {user ? getInitials(user.email) : '?'}
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
