'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@gleamops/ui';

interface EntityAvatarProps {
  name: string;
  seed?: string;
  imageUrl?: string | null;
  fallbackIcon?: ReactNode;
  size?: 'sm' | 'md' | 'xl';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<EntityAvatarProps['size']>, string> = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-sm',
  xl: 'h-20 w-20 text-2xl',
};

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

function hashIndex(seed: string, size: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % size;
}

function getInitials(name: string): string {
  const chunks = name
    .trim()
    .split(/\s+/)
    .map((chunk) => chunk.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);
  if (chunks.length >= 2) return `${chunks[0][0]}${chunks[1][0]}`.toUpperCase();
  return (chunks[0] ?? '?').slice(0, 2).toUpperCase();
}

export function EntityAvatar({
  name,
  seed,
  imageUrl,
  fallbackIcon,
  size = 'sm',
  className,
}: EntityAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarSizeClass = SIZE_CLASS[size];
  const colorSeed = seed ?? name;
  const bgColor = INITIALS_BG_COLORS[hashIndex(colorSeed, INITIALS_BG_COLORS.length)];

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  if (imageUrl && !imageFailed) {
    return (
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        onError={() => setImageFailed(true)}
        className={cn('shrink-0 rounded-full border border-border object-cover', avatarSizeClass, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border border-border font-semibold text-white',
        avatarSizeClass,
        className,
      )}
      style={{ backgroundColor: bgColor }}
      aria-label={name}
    >
      {fallbackIcon ?? getInitials(name)}
    </div>
  );
}
