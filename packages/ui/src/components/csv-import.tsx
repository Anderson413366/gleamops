'use client';

import React, { useState, useCallback, useEffect } from 'react';

interface ColumnMapping {
  csvHeader: string;
  dbColumn: string;
}

interface CsvImportProps {
  /** Available target columns the user can map to */
  targetColumns: { key: string; label: string; required?: boolean }[];
  /** Called with the validated, mapped rows */
  onImport: (rows: Record<string, string>[]) => Promise<void>;
  /** Called when the dialog is closed */
  onClose: () => void;
  /** Whether the import dialog is open */
  open: boolean;
}

/**
 * CSV Import component with file upload, preview, column mapping, and validation.
 * Uses Papa Parse-style parsing (simple CSV for now).
 */
export function CsvImport({ targetColumns, onImport, onClose, open }: CsvImportProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const parseCSV = useCallback((text: string) => {
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      setError('CSV must have a header row and at least one data row');
      return;
    }

    const parseLine = (line: string) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const csvHeaders = parseLine(lines[0]);
    const csvRows = lines.slice(1).map(parseLine);

    setHeaders(csvHeaders);
    setRows(csvRows);
    setError(null);

    // Auto-map headers that match target columns
    const autoMappings: ColumnMapping[] = csvHeaders.map((h) => {
      const match = targetColumns.find(
        (tc) => tc.key.toLowerCase() === h.toLowerCase() || tc.label.toLowerCase() === h.toLowerCase()
      );
      return { csvHeader: h, dbColumn: match?.key ?? '' };
    });
    setMappings(autoMappings);
  }, [targetColumns]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        parseCSV(text);
      };
      reader.readAsText(file);
    },
    [parseCSV]
  );

  const handleMappingChange = (csvHeader: string, dbColumn: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.csvHeader === csvHeader ? { ...m, dbColumn } : m))
    );
  };

  const handleImport = async () => {
    // Validate required columns are mapped
    const missingRequired = targetColumns
      .filter((tc) => tc.required)
      .filter((tc) => !mappings.some((m) => m.dbColumn === tc.key));
    if (missingRequired.length > 0) {
      setError(`Missing required columns: ${missingRequired.map((m) => m.label).join(', ')}`);
      return;
    }

    setImporting(true);
    setProgress(0);

    const mappedRows = rows.map((row) => {
      const obj: Record<string, string> = {};
      mappings.forEach((m, i) => {
        if (m.dbColumn && row[i] !== undefined) {
          obj[m.dbColumn] = row[i];
        }
      });
      return obj;
    });

    try {
      setProgress(50);
      await onImport(mappedRows);
      setProgress(100);
      // Reset state
      setHeaders([]);
      setRows([]);
      setMappings([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-foreground">Import CSV</h2>

        {/* File Input */}
        <div className="mt-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block text-sm text-muted-foreground file:mr-2 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium"
          />
        </div>

        {error && (
          <div className="mt-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Column Mapping */}
        {headers.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-foreground mb-2">Column Mapping</h3>
            <div className="space-y-2">
              {headers.map((h) => {
                const mapping = mappings.find((m) => m.csvHeader === h);
                return (
                  <div key={h} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-40 truncate">{h}</span>
                    <span className="text-xs text-muted-foreground">&rarr;</span>
                    <select
                      value={mapping?.dbColumn ?? ''}
                      onChange={(e) => handleMappingChange(h, e.target.value)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-sm flex-1"
                    >
                      <option value="">-- Skip --</option>
                      {targetColumns.map((tc) => (
                        <option key={tc.key} value={tc.key}>
                          {tc.label} {tc.required ? '*' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-foreground mb-2">
              Preview ({rows.length} rows)
            </h3>
            <div className="overflow-x-auto border border-border rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="px-2 py-1 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      {row.map((cell, j) => (
                        <td key={j} className="px-2 py-1 text-foreground truncate max-w-[150px]">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 5 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">...and {rows.length - 5} more rows</p>
              )}
            </div>
          </div>
        )}

        {/* Progress */}
        {importing && (
          <div className="mt-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Importing... {progress}%</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || rows.length === 0}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {importing ? 'Importing...' : `Import ${rows.length} rows`}
          </button>
        </div>
      </div>
    </div>
  );
}
