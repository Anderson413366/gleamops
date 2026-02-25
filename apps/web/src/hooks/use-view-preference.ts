'use client';

import { useState, useEffect } from 'react';

type BaseViewMode = 'list' | 'card';
type CalendarViewMode = BaseViewMode | 'calendar';

interface BaseViewPreferenceOptions {
  allowCalendar?: false;
  defaultView?: BaseViewMode;
}

interface CalendarViewPreferenceOptions {
  allowCalendar: true;
  defaultView?: CalendarViewMode;
}

type UseViewPreferenceOptions = BaseViewPreferenceOptions | CalendarViewPreferenceOptions;

interface UseViewPreferenceResult<TView extends CalendarViewMode> {
  view: TView;
  setView: (view: TView) => void;
  mounted: boolean;
  isMobile: boolean;
}

export function useViewPreference(entityKey: string): UseViewPreferenceResult<BaseViewMode>;
export function useViewPreference(
  entityKey: string,
  options: BaseViewPreferenceOptions,
): UseViewPreferenceResult<BaseViewMode>;
export function useViewPreference(
  entityKey: string,
  options: CalendarViewPreferenceOptions,
): UseViewPreferenceResult<CalendarViewMode>;
export function useViewPreference(entityKey: string, options?: UseViewPreferenceOptions) {
  const allowCalendar = options?.allowCalendar === true;
  const defaultView = options?.defaultView ?? 'list';
  const initialView: CalendarViewMode = (allowCalendar || defaultView !== 'calendar') ? defaultView : 'list';

  const storageKey = `gleamops-view-${entityKey}`;
  const [view, setViewState] = useState<CalendarViewMode>(initialView);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');

    const apply = () => {
      const mobile = media.matches;
      setIsMobile(mobile);

      if (mobile) {
        setViewState('list');
        setMounted(true);
        return;
      }

      const stored = localStorage.getItem(storageKey);
      const supportsStored = (
        stored === 'list'
        || stored === 'card'
        || (allowCalendar && stored === 'calendar')
      );

      if (supportsStored) {
        setViewState(stored);
      } else {
        setViewState(initialView);
      }
      setMounted(true);
    };

    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [allowCalendar, initialView, storageKey]);

  const setView = (nextView: CalendarViewMode) => {
    if (isMobile) {
      setViewState('list');
      return;
    }

    if (!allowCalendar && nextView === 'calendar') {
      setViewState('list');
      localStorage.setItem(storageKey, 'list');
      return;
    }

    setViewState(nextView);
    localStorage.setItem(storageKey, nextView);
  };

  const activeView = isMobile ? 'list' : view;
  const clampedView = (!allowCalendar && activeView === 'calendar') ? 'list' : activeView;

  if (allowCalendar) {
    return {
      view: clampedView,
      setView: setView as (value: CalendarViewMode) => void,
      mounted,
      isMobile,
    };
  }

  return {
    view: clampedView as BaseViewMode,
    setView: setView as (value: BaseViewMode) => void,
    mounted,
    isMobile,
  };
}
