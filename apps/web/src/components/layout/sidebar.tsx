'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  TrendingUp,
  Building2,
  Calendar,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NAV_ITEMS } from '@gleamops/shared';
import { useAuth } from '@/hooks/use-auth';

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp,
  Building2,
  Calendar,
  Users,
  BarChart3,
};

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, role, signOut } = useAuth();

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden rounded-md bg-white p-2 shadow-md"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border flex flex-col transition-transform md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <Link href="/pipeline" className="text-xl font-bold text-gleam-600">
            GleamOps
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden rounded-md p-1 hover:bg-gray-100"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? Building2;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gleam-50 text-gleam-700'
                    : 'text-muted hover:bg-gray-50 hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-3 space-y-1">
          {user && (
            <div className="px-3 py-2 mb-1">
              <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
              {role && (
                <p className="text-xs text-muted">{role.replace('_', ' ')}</p>
              )}
            </div>
          )}
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:bg-gray-50 hover:text-foreground transition-colors"
          >
            <Settings className="h-5 w-5 shrink-0" />
            Settings
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:bg-gray-50 hover:text-foreground transition-colors w-full"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
