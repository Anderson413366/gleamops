'use client';

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils';
import { Card } from './card';

interface CollapsibleCardProps {
  id: string;
  title: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  defaultCollapsed?: boolean;
  forceOpen?: boolean;
}

export function CollapsibleCard({
  id,
  title,
  description,
  icon,
  headerRight,
  children,
  className,
  defaultOpen = true,
  defaultCollapsed,
  forceOpen,
}: CollapsibleCardProps) {
  const storageKey = `collapse-${id}`;
  const initialOpen = defaultCollapsed != null ? !defaultCollapsed : defaultOpen;
  const [isOpen, setIsOpen] = useState(initialOpen);
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

  // External control: when forceOpen flips to true, open the card
  useEffect(() => {
    if (forceOpen) setIsOpen(true);
  }, [forceOpen]);

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
    <Card className={className}>
      {/* Header — keyboard accessible toggle */}
      <div
        data-card="header"
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-controls={`collapsible-content-${id}`}
        className="flex items-center justify-between px-6 py-4 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring rounded-lg transition-colors duration-200 ease-in-out"
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <span className="shrink-0 text-muted-foreground">{icon}</span>
          )}
          <div className="min-w-0">
            <span className="text-sm font-semibold text-foreground truncate block">
              {title}
            </span>
            {description && (
              <span className="text-xs text-muted-foreground truncate block">
                {description}
              </span>
            )}
          </div>
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
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              mounted && isOpen && 'rotate-0',
              mounted && !isOpen && '-rotate-90'
            )}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Content — simple show/hide, no janky max-h transitions */}
      {isOpen && (
        <div
          data-card="content"
          id={`collapsible-content-${id}`}
          role="region"
          aria-labelledby={`collapsible-content-${id}`}
          className="border-t border-border px-6 py-5"
        >
          {children}
        </div>
      )}
    </Card>
  );
}
