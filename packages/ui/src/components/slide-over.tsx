'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils';

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
  centered?: boolean;
}

/**
 * SlideOver — the "list -> detail drawer" pattern.
 * Slides in from the right, keeps list context visible.
 */
export function SlideOver({ open, onClose, title, subtitle, children, wide = false, centered = false }: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Allow app-level Escape handlers to close all drawers/modals consistently.
  useEffect(() => {
    function handleGlobalClose() {
      if (open) onClose();
    }
    window.addEventListener('gleamops:close', handleGlobalClose);
    return () => window.removeEventListener('gleamops:close', handleGlobalClose);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  if (centered) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh] backdrop-blur-sm animate-fade-in">
        <div
          ref={panelRef}
          className="relative w-full max-w-4xl rounded-xl border border-border bg-card shadow-xl animate-scale-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 ease-in-out"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {children}
          </div>
        </div>

        {/* Click outside to close */}
        <div className="fixed inset-0 -z-10" onClick={onClose} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed inset-y-0 right-0 bg-card rounded-l-xl shadow-2xl flex flex-col animate-slide-in-right',
          wide ? 'w-full max-w-2xl' : 'w-full max-w-lg'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 ease-in-out"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
