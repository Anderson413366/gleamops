 'use client';

import { Suspense, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { OfflineBanner } from './offline-banner';
import { ErrorBoundary } from './error-boundary';
import { Button } from '@gleamops/ui';
import { DEFAULT_MODULE_KEY, getModuleFromPathname, MODULE_ACCENTS } from '@gleamops/shared';
import { useUiPreferences } from '@/hooks/use-ui-preferences';
import { useOfflineMutationSync } from '@/hooks/use-offline-mutation-sync';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const moduleKey = useMemo(() => getModuleFromPathname(pathname), [pathname]);
  const accent = MODULE_ACCENTS[moduleKey] ?? MODULE_ACCENTS[DEFAULT_MODULE_KEY];
  const { preferences, togglePreference, mounted: prefMounted } = useUiPreferences();
  const focusMode = prefMounted && preferences.focus_mode;
  useOfflineMutationSync();

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

      <OfflineBanner />

      {/* When focus mode is enabled, we hide these in two layers:
         1) Pre-hydration CSS via html[data-focus-mode="true"] (see globals.css)
         2) After preferences mount, React stops rendering the chrome entirely */}
      {!focusMode && (
        <div className="app-shell-sidebar">
          <Suspense>
            <Sidebar />
          </Suspense>
        </div>
      )}

      <div className={`app-shell-content ${focusMode ? '' : 'md:ml-64'}`}>
        {!focusMode && (
          <div className="app-shell-header">
            <Suspense>
              <Header />
            </Suspense>
          </div>
        )}
        <main id="main-content" tabIndex={-1} className="app-shell-main w-full max-w-none px-4 pt-14 pb-6 md:pt-6 sm:px-6 lg:px-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      {prefMounted && focusMode && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => togglePreference('focus_mode')}
          className="app-shell-focus-fab fixed bottom-4 right-4 z-[90] shadow-lg"
        >
          <X className="h-4 w-4" />
          Exit Focus
        </Button>
      )}
    </div>
  );
}
