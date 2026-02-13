'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../utils';

export interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  category: string;
  icon?: React.ReactNode;
  href?: string;
  onSelect?: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
  onSelect: (item: CommandItem) => void;
  placeholder?: string;
  loading?: boolean;
  onSearch?: (query: string) => void;
}

export function CommandPalette({
  open,
  onClose,
  items,
  onSelect,
  placeholder = 'Search...',
  loading = false,
  onSearch,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter items by query
  const filtered = query.trim()
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.sublabel?.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  // Group by category
  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Notify parent of search changes
  useEffect(() => {
    onSearch?.(query);
  }, [query, onSearch]);

  // Reset active index when filtered results change
  useEffect(() => {
    setActiveIndex(0);
  }, [filtered.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % filtered.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[activeIndex]) {
            onSelect(filtered[activeIndex]);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filtered, activeIndex, onSelect, onClose]
  );

  // Scroll active item into view
  useEffect(() => {
    const active = listRef.current?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) {
          onClose();
        }
      }
    }
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, [open, onClose]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-[18%] -translate-x-1/2 w-full max-w-lg px-4 animate-scale-in">
        <div
          className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 py-3.5 text-sm text-foreground placeholder:text-muted-foreground bg-transparent outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
            {loading && (
              <div className="py-10 text-center text-sm text-muted-foreground">Searching...</div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {query ? 'No results found.' : 'Start typing to search...'}
              </div>
            )}

            {!loading &&
              Object.entries(grouped).map(([category, categoryItems]) => (
                <div key={category}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {category}
                  </div>
                  {categoryItems.map((item) => {
                    flatIndex++;
                    const isActive = flatIndex === activeIndex;
                    const idx = flatIndex;

                    return (
                      <button
                        key={item.id}
                        data-active={isActive}
                        onClick={() => {
                          onSelect(item);
                          onClose();
                        }}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-150',
                          isActive
                            ? 'bg-gleam-50 dark:bg-gleam-950 text-foreground'
                            : 'text-foreground hover:bg-muted'
                        )}
                      >
                        {item.icon && (
                          <span className={cn(
                            'shrink-0',
                            isActive ? 'text-gleam-600 dark:text-gleam-400' : 'text-muted-foreground'
                          )}>
                            {item.icon}
                          </span>
                        )}
                        <span className="flex-1 truncate">
                          <span className="font-medium">{item.label}</span>
                          {item.sublabel && (
                            <span className="ml-2 text-muted-foreground text-xs">{item.sublabel}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
          </div>

          {/* Footer hint */}
          <div className="border-t border-border px-4 py-2.5 flex items-center gap-4 text-[11px] text-muted-foreground bg-muted/50">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded-md border border-border bg-card px-1 py-0.5 font-medium shadow-sm">↑↓</kbd>
              Navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded-md border border-border bg-card px-1 py-0.5 font-medium shadow-sm">↵</kbd>
              Select
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded-md border border-border bg-card px-1 py-0.5 font-medium shadow-sm">esc</kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
