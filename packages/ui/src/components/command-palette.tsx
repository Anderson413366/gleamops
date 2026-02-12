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
      // Focus input after animation frame
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
      <div className="fixed inset-0 bg-black/40 animate-fade-in" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-lg animate-fade-in">
        <div
          className="bg-white rounded-xl shadow-2xl border border-border overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <Search className="h-5 w-5 text-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 py-3 text-sm text-foreground placeholder:text-muted bg-transparent outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-muted hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
            {loading && (
              <div className="py-8 text-center text-sm text-muted">Searching...</div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-muted">
                {query ? 'No results found.' : 'Start typing to search...'}
              </div>
            )}

            {!loading &&
              Object.entries(grouped).map(([category, categoryItems]) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted uppercase tracking-wider">
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
                          'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                          isActive
                            ? 'bg-gleam-50 text-foreground'
                            : 'text-foreground hover:bg-gray-50'
                        )}
                      >
                        {item.icon && (
                          <span className="shrink-0 text-muted">{item.icon}</span>
                        )}
                        <span className="flex-1 truncate">
                          <span className="font-medium">{item.label}</span>
                          {item.sublabel && (
                            <span className="ml-2 text-muted">{item.sublabel}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
          </div>

          {/* Footer hint */}
          <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border px-1 py-0.5 font-medium">↑↓</kbd>
              Navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border px-1 py-0.5 font-medium">↵</kbd>
              Select
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border px-1 py-0.5 font-medium">esc</kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
