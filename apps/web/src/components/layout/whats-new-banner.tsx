'use client';

import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@gleamops/ui';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const STORAGE_KEY = 'gleamops_v2_nav_dismissed';
const BANNER_VERSION = '2.0'; // bump to re-show after future updates

/**
 * Shows a one-time "What's New" banner after the v2 navigation upgrade.
 * Dismissed state is persisted in localStorage.
 */
export function WhatsNewBanner() {
  const v2NavigationEnabled = useFeatureFlag('v2_navigation');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!v2NavigationEnabled) {
      setVisible(false);
      return;
    }
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed !== BANNER_VERSION) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable — don't show
    }
  }, [v2NavigationEnabled]);

  if (!v2NavigationEnabled) return null;

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, BANNER_VERSION);
    } catch {
      // best-effort
    }
  }

  if (!visible) return null;

  return (
    <div
      role="status"
      className="relative flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground"
    >
      <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="font-semibold">Fresh look, same power</p>
        <p className="text-muted-foreground mt-0.5">
          We&apos;ve reorganized the sidebar for faster navigation.{' '}
          <strong>Schedule</strong> and <strong>Jobs</strong> now have their own modules.{' '}
          <strong>Clients</strong>, <strong>Team</strong>, and <strong>Equipment</strong>{' '}
          replace the old names. All your bookmarks still work.
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 -mt-1"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
