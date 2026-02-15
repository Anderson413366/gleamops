 'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { DEFAULT_MODULE_KEY, getModuleFromPathname, MODULE_ACCENTS } from '@gleamops/shared';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const moduleKey = useMemo(() => getModuleFromPathname(pathname), [pathname]);
  const accent = MODULE_ACCENTS[moduleKey] ?? MODULE_ACCENTS[DEFAULT_MODULE_KEY];

  return (
    <div
      className="min-h-screen bg-background"
      data-module={moduleKey}
      style={{ ['--module-accent' as string]: accent.hsl }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <Sidebar />
      <div className="md:ml-64">
        <Header />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
