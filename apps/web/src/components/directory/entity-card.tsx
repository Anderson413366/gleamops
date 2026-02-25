'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
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

const INITIALS_BG_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#84cc16',
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
  const stopWords = new Set(['&', 'and', 'of', 'the', 'for', 'to', 'at', 'a', 'an']);
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z0-9]/g, ''))
    .filter((word) => word.length > 0 && !stopWords.has(word.toLowerCase()));
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
  const [imageFailed, setImageFailed] = useState(false);
  const initialsColor = INITIALS_BG_COLORS[hashIndex(initialsSeed, INITIALS_BG_COLORS.length)];
  const tone = STATUS_TONE_CLASSES[statusTone];

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full cursor-pointer flex-col rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all duration-200 hover:scale-[1.02] hover:border-module-accent/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-20 w-20 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
            style={{ backgroundColor: initialsColor }}
          >
            {initials}
          </div>
        )}

        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', tone.badge)}>
          <span className={cn('h-2 w-2 rounded-full', tone.dot)} aria-hidden />
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 min-w-0">
        <p className="line-clamp-2 text-base font-semibold leading-tight text-foreground">{name}</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle || 'Not Set'}</p>
        {secondaryLine ? <p className="mt-0.5 truncate text-sm text-muted-foreground">{secondaryLine}</p> : null}
      </div>

      <p className="mt-4 text-[13px] text-muted-foreground">{metricsLine}</p>

      <div className="mt-4 border-t border-border pt-3">
        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">{code}</p>
      </div>
    </button>
  );
}
