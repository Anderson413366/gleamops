'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge, Button } from '@gleamops/ui';

export interface CompletenessItem {
  key: string;
  label: string;
  isComplete: boolean;
  section?: string;
}

interface ProfileCompletenessCardProps {
  title: string;
  items: CompletenessItem[];
  onNavigateToMissing?: (item: CompletenessItem) => void;
}

function ringTone(percent: number): 'red' | 'orange' | 'green' {
  if (percent < 40) return 'red';
  if (percent < 80) return 'orange';
  return 'green';
}

function toneClasses(tone: 'red' | 'orange' | 'green') {
  if (tone === 'red') {
    return {
      bar: 'bg-red-500',
      ring: 'stroke-red-500',
      text: 'text-red-700 dark:text-red-300',
      track: 'bg-red-100 dark:bg-red-900/30',
      badgeColor: 'red' as const,
    };
  }
  if (tone === 'orange') {
    return {
      bar: 'bg-orange-500',
      ring: 'stroke-orange-500',
      text: 'text-orange-700 dark:text-orange-300',
      track: 'bg-orange-100 dark:bg-orange-900/30',
      badgeColor: 'orange' as const,
    };
  }
  return {
    bar: 'bg-green-500',
    ring: 'stroke-green-500',
    text: 'text-green-700 dark:text-green-300',
    track: 'bg-green-100 dark:bg-green-900/30',
    badgeColor: 'green' as const,
  };
}

export function isFieldComplete(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    const nested = Object.values(value as Record<string, unknown>);
    return nested.some((entry) => isFieldComplete(entry));
  }
  return Boolean(value);
}

export function ProfileCompletenessCard({ title, items, onNavigateToMissing }: ProfileCompletenessCardProps) {
  const [expanded, setExpanded] = useState(false);

  const summary = useMemo(() => {
    const total = items.length;
    const completed = items.filter((item) => item.isComplete).length;
    const missing = items.filter((item) => !item.isComplete);
    const percent = total > 0 ? Math.round((completed / total) * 100) : 100;
    return { total, completed, missing, percent };
  }, [items]);

  const tone = ringTone(summary.percent);
  const styles = toneClasses(tone);
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - summary.percent / 100);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.completed} of {summary.total} tracked fields completed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12">
            <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
              <circle
                cx="22"
                cy="22"
                r={radius}
                className="fill-none stroke-border"
                strokeWidth="4"
              />
              <circle
                cx="22"
                cy="22"
                r={radius}
                className={`fill-none ${styles.ring}`}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-foreground">
              {summary.percent}%
            </span>
          </div>
          <Badge color={styles.badgeColor} className="whitespace-nowrap">
            {summary.percent}% Complete
          </Badge>
        </div>
      </div>

      <div className={`mt-3 h-2 w-full overflow-hidden rounded-full ${styles.track}`}>
        <div className={`h-full ${styles.bar}`} style={{ width: `${summary.percent}%` }} />
      </div>

      {summary.missing.length > 0 ? (
        <div className="mt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setExpanded((prev) => !prev)}
            className="w-full justify-between"
          >
            <span className="text-xs">
              Missing information ({summary.missing.length})
            </span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {expanded && (
            <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              {summary.missing.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onNavigateToMissing?.(item)}
                  className={`block w-full rounded-md border border-transparent px-2 py-1.5 text-left text-xs ${styles.text} hover:border-border hover:bg-background`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-green-700 dark:text-green-300">All tracked profile fields are complete.</p>
      )}
    </div>
  );
}
