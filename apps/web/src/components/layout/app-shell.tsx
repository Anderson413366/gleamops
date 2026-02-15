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
      <Sidebar />
      <div className="md:ml-64">
        <Header />
        <main className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
