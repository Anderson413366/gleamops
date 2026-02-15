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
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
