'use client';

/* eslint-disable @next/next/no-img-element */

import { cn } from '@gleamops/ui';

type CardTone = 'green' | 'gray' | 'yellow' | 'red' | 'blue';

interface EntityCardProps {
  name: string;
  code: string;
  initials: string;
  initialsSeed: string;
  subtitle?: string | null;
  secondaryLine?: string | null;
  statusLabel: string;
  statusTone: CardTone;
  metricsLine: string;
  onClick: () => void;
  imageUrl?: string | null;
}

const INITIALS_BG_CLASSES = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200',
  'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-200',
  'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-200',
  'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200',
];

const STATUS_TONE_CLASSES: Record<CardTone, { dot: string; badge: string }> = {
  green: {
    dot: 'bg-green-500',
    badge: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300',
  },
  gray: {
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300',
  },
  yellow: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  },
  red: {
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  },
  blue: {
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  },
};

function hashIndex(seed: string, size: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % size;
}

export function getEntityInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  const single = words[0] ?? '';
  return single.slice(0, 2).toUpperCase();
}

export function EntityCard({
  name,
  code,
  initials,
  initialsSeed,
  subtitle,
  secondaryLine,
  statusLabel,
  statusTone,
  metricsLine,
  onClick,
  imageUrl,
}: EntityCardProps) {
  const initialsClass = INITIALS_BG_CLASSES[hashIndex(initialsSeed, INITIALS_BG_CLASSES.length)];
  const tone = STATUS_TONE_CLASSES[statusTone];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full cursor-pointer flex-col rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-module-accent/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <div className={cn('flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-semibold', initialsClass)}>
            {initials}
          </div>
        )}

        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', tone.badge)}>
          <span className={cn('h-2 w-2 rounded-full', tone.dot)} aria-hidden />
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 min-w-0">
        <p className="truncate text-base font-semibold text-foreground">{name}</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle || 'Not Set'}</p>
        {secondaryLine ? <p className="mt-0.5 truncate text-sm text-muted-foreground">{secondaryLine}</p> : null}
      </div>

      <p className="mt-4 text-[13px] text-muted-foreground">{metricsLine}</p>

      <div className="mt-4 border-t border-border pt-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{code}</p>
      </div>
    </button>
  );
}
