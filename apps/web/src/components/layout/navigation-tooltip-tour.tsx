'use client';

import { useEffect, useState } from 'react';
import { Button } from '@gleamops/ui';

const STORAGE_KEY = 'gleamops_v2_nav_tour_dismissed';
const TOUR_VERSION = '2.0';

type TourStep = {
  id: string;
  title: string;
  description: string;
};

const STEPS: TourStep[] = [
  {
    id: 'schedule',
    title: 'Schedule is now first',
    description: 'Scheduling and planning moved out of Operations into Schedule.',
  },
  {
    id: 'jobs',
    title: 'Operations is now Jobs',
    description: 'Tickets, inspections, time, and routes now live in Jobs.',
  },
  {
    id: 'clients',
    title: 'CRM is now Clients',
    description: 'Clients, sites, contacts, and partners are grouped in one place.',
  },
  {
    id: 'team',
    title: 'Workforce is now Team',
    description: 'Staff, timesheets, payroll, and HR moved under Team.',
  },
  {
    id: 'equipment',
    title: 'Assets is now Equipment',
    description: 'Equipment, vehicles, keys, and maintenance are now together.',
  },
  {
    id: 'settings',
    title: 'Admin is now Settings',
    description: 'Services, rules, imports, and system setup live in Settings.',
  },
];

function dismissTour() {
  try {
    localStorage.setItem(STORAGE_KEY, TOUR_VERSION);
  } catch {
    // Ignore storage errors.
  }
}

export function NavigationTooltipTour() {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const dismissedVersion = localStorage.getItem(STORAGE_KEY);
        const desktop = window.matchMedia('(min-width: 1024px)').matches;
        if (dismissedVersion !== TOUR_VERSION && desktop) {
          setVisible(true);
        }
      } catch {
        // Ignore storage and media query issues.
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, []);

  const step = STEPS[stepIndex];

  useEffect(() => {
    if (!visible || !step) {
      setAnchor(null);
      return;
    }
    setAnchor(document.querySelector(`[data-nav-id="${step.id}"]`) as HTMLElement | null);
  }, [step, visible]);

  if (!visible || !step || !anchor) {
    return null;
  }

  const rect = anchor.getBoundingClientRect();
  const isLastStep = stepIndex === STEPS.length - 1;

  const closeTour = () => {
    dismissTour();
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Navigation tour"
      className="pointer-events-none fixed inset-0 z-[70]"
    >
      <div
        className="pointer-events-auto absolute w-80 rounded-xl border border-white/10 bg-sidebar-hover p-4 text-sidebar-text shadow-2xl"
        style={{
          top: Math.max(16, rect.top + rect.height / 2 - 88),
          left: rect.right + 12,
        }}
      >
        <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-l border-t border-white/10 bg-sidebar-hover" />
        <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-text/80">
          Navigation Tour {stepIndex + 1}/{STEPS.length}
        </p>
        <h3 className="mt-2 text-sm font-semibold text-white">{step.title}</h3>
        <p className="mt-1 text-sm text-sidebar-text">{step.description}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={closeTour}
            className="min-h-[44px] text-sidebar-text hover:text-white"
          >
            Skip
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (isLastStep) {
                closeTour();
                return;
              }
              setStepIndex((prev) => prev + 1);
            }}
            className="min-h-[44px]"
          >
            {isLastStep ? 'Done' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
