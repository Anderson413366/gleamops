'use client';

import { useEffect } from 'react';

/**
 * Registers global keyboard shortcuts for the application.
 *
 * Shortcuts:
 *  - Cmd+N / Ctrl+N  -> dispatches custom event `gleamops:create`
 *  - Escape          -> dispatches custom event `gleamops:close`
 *
 * Shortcuts are suppressed when focus is inside an input, textarea, or select
 * to avoid interfering with normal text editing.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function isInsideFormField(e: KeyboardEvent): boolean {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      // Also check for contentEditable elements
      if (target.isContentEditable) return true;
      return false;
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+N / Ctrl+N -> create
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        if (isInsideFormField(e)) return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('gleamops:create'));
        return;
      }

      // Escape -> close
      if (e.key === 'Escape') {
        if (isInsideFormField(e)) return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('gleamops:close'));
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
