'use client';

import { Download } from 'lucide-react';
import { cn } from '../utils';

interface ExportColumn<T> {
  key: keyof T;
  label: string;
}

interface ExportButtonProps<T extends Record<string, unknown>> {
  data: T[];
  filename: string;
  columns?: ExportColumn<T>[];
  label?: string;
  className?: string;
  onExported?: (count: number, filename: string) => void;
  onError?: (error: unknown) => void;
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Wrap in quotes if it contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: ExportColumn<T>[]
): void {
  if (data.length === 0) return;

  const headers = columns
    ? columns.map((col) => col.label)
    : Object.keys(data[0]!);

  const keys = columns
    ? columns.map((col) => col.key)
    : (Object.keys(data[0]!) as (keyof T)[]);

  const rows = data.map((row) =>
    keys.map((key) => escapeCsvValue(row[key])).join(',')
  );

  // BOM for Excel UTF-8 compatibility
  const bom = '\uFEFF';
  const csvContent = bom + [headers.map(escapeCsvValue).join(','), ...rows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportButton<T extends Record<string, unknown>>({
  data,
  filename,
  columns,
  label = 'Export CSV',
  className,
  onExported,
  onError,
}: ExportButtonProps<T>) {
  if (data.length === 0) return null;

  const handleExport = () => {
    try {
      exportToCSV(data, filename, columns);
      const finalName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
      onExported?.(data.length, finalName);
    } catch (err) {
      onError?.(err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        className
      )}
      aria-label={`Export ${data.length} records as CSV`}
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}
