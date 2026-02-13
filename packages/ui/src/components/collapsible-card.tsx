'use client';

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils';

interface CollapsibleCardProps {
  id: string;
  title: React.ReactNode;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

export function CollapsibleCard({
  id,
  title,
  icon,
  headerRight,
  children,
  className,
  defaultOpen = true,
}: CollapsibleCardProps) {
  const storageKey = `collapse-${id}`;
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(false);

  // Restore persisted state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        setIsOpen(stored === 'true');
      }
    } catch {
      // localStorage unavailable — keep default
    }
    setMounted(true);
  }, [storageKey]);

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch {
      // localStorage unavailable — ignore
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card shadow-sm',
        className
      )}
    >
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-controls={`collapsible-content-${id}`}
        className="flex items-center justify-between px-6 py-4 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary rounded-xl"
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <span className="shrink-0 text-muted-foreground">{icon}</span>
          )}
          <span className="text-base font-semibold text-foreground truncate">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {headerRight && (
            <span
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {headerRight}
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-5 w-5 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Content */}
      <div
        id={`collapsible-content-${id}`}
        role="region"
        aria-labelledby={`collapsible-content-${id}`}
        className={cn(
          'overflow-hidden transition-all duration-200',
          mounted
            ? isOpen
              ? 'max-h-[2000px] opacity-100'
              : 'max-h-0 opacity-0'
            : isOpen
              ? 'max-h-[2000px] opacity-100'
              : 'max-h-0 opacity-0'
        )}
      >
        <div className="border-t border-border px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
