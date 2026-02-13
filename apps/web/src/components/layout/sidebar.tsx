'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { NAV_ITEMS } from '@gleamops/shared';
import { useAuth } from '@/hooks/use-auth';

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
};

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, role, signOut } = useAuth();

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden rounded-lg bg-card p-2 shadow-md border border-border"
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-bg flex flex-col transition-transform duration-300 ease-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-white/10">
          <Link href="/home" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gleam-600 flex items-center justify-center shadow-lg shadow-gleam-600/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">GleamOps</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden rounded-lg p-1.5 text-sidebar-text hover:bg-sidebar-hover transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? Building2;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-sidebar-active/10 text-sidebar-active border-l-[3px] border-sidebar-active ml-0 pl-[9px]'
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white border-l-[3px] border-transparent ml-0 pl-[9px]'
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 transition-colors ${
                    isActive ? 'text-sidebar-active' : 'text-sidebar-text group-hover:text-white'
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer — profile + settings + sign out */}
        <div className="border-t border-white/10 p-3 space-y-1">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
              <div className="h-8 w-8 rounded-full bg-gleam-600 text-white flex items-center justify-center text-xs font-bold shrink-0 ring-2 ring-gleam-400/30">
                {getInitials(user.email)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.email}</p>
                {role && (
                  <p className="text-xs text-sidebar-text">
                    {role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </p>
                )}
              </div>
            </div>
          )}
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-colors"
          >
            <Settings className="h-5 w-5 shrink-0" />
            Settings
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-colors w-full"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
