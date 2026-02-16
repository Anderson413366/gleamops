'use client';

import type React from 'react';
import { cn } from '../utils';

export interface FormSectionProps {
  title: string;
  icon?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /**
   * Optional header action (e.g., "Edit" link/button) rendered on the right.
   * Keep this small to avoid competing with the section title.
   */
  action?: React.ReactNode;
}

/**
 * Standard section wrapper for long forms:
 * - Icon + title header for quick scanning
 * - Subtle background card to chunk content
 * - Thin divider between header and fields
 */
export function FormSection({
  title,
  icon,
  description,
  action,
  children,
  className,
  contentClassName,
}: FormSectionProps) {
  return (
    <section className={cn('rounded-2xl border border-border bg-muted/20 px-5 py-4 shadow-sm', className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background/70 text-muted-foreground">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="mt-4 h-px w-full bg-border" />
      <div className={cn('mt-4 space-y-6', contentClassName)}>{children}</div>
    </section>
  );
}
