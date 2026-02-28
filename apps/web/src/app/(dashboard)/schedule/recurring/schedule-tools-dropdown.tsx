'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Wrench, Save, Upload, Wand2, ChevronDown, Printer, DollarSign } from 'lucide-react';
import { Button } from '@gleamops/ui';

interface ScheduleToolsDropdownProps {
  onSaveTemplate: () => void;
  onLoadTemplate: () => void;
  onAutoFill: () => void;
  onPrint: () => void;
  onToggleBudget: () => void;
  budgetMode?: boolean;
  autoFillLoading?: boolean;
}

export function ScheduleToolsDropdown({
  onSaveTemplate,
  onLoadTemplate,
  onAutoFill,
  onPrint,
  onToggleBudget,
  budgetMode = false,
  autoFillLoading = false,
}: ScheduleToolsDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItem = useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="secondary"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Wrench className="h-4 w-4" />
        Tools
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-card p-1 shadow-xl">
          <button
            type="button"
            onClick={() => handleItem(onSaveTemplate)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Save className="h-4 w-4 text-muted-foreground" />
            Save as Template
          </button>
          <button
            type="button"
            onClick={() => handleItem(onLoadTemplate)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Upload className="h-4 w-4 text-muted-foreground" />
            Load Template
          </button>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            onClick={() => handleItem(onAutoFill)}
            disabled={autoFillLoading}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Wand2 className="h-4 w-4 text-muted-foreground" />
            {autoFillLoading ? 'Auto-Filling...' : 'Auto-Fill Open Shifts'}
          </button>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            onClick={() => handleItem(onPrint)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Printer className="h-4 w-4 text-muted-foreground" />
            Print / PDF
          </button>
          <button
            type="button"
            onClick={() => handleItem(onToggleBudget)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            {budgetMode ? 'Hide Budget' : 'Show Budget'}
          </button>
        </div>
      )}
    </div>
  );
}
