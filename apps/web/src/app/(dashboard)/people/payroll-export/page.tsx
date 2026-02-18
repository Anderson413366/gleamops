'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchJsonWithSupabaseAuth, getSupabaseAuthHeader } from '@/lib/supabase/authenticated-fetch';
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Input, Badge, Skeleton,
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  Pagination,
} from '@gleamops/ui';
import { useTableSort } from '@/hooks/use-table-sort';
import { usePagination } from '@/hooks/use-pagination';

interface ExportRow {
  id: string;
  file_name: string;
  pay_period_start: string;
  pay_period_end: string;
  status: string;
  line_count: number;
  total_hours: number;
  total_amount: number;
  created_at: string;
}

interface GenerateResponse {
  success: boolean;
  data: {
    id: string;
    file_name: string;
    line_count: number;
    totals: { hours: number; amount: number };
  };
}

const STATUS_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'gray'> = {
  GENERATED: 'blue',
  DOWNLOADED: 'green',
  PENDING: 'yellow',
};

export default function PayrollExportPage() {
  const supabase = getSupabaseBrowserClient();
  const [connectionId, setConnectionId] = useState('');
  const [periodStart, setPeriodStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [generating, setGenerating] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Preview after generation
  const [lastGenerated, setLastGenerated] = useState<GenerateResponse['data'] | null>(null);

  // History table
  const [exports, setExports] = useState<ExportRow[]>([]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetchJsonWithSupabaseAuth<{ success: boolean; data: ExportRow[] }>(
        supabase,
        '/api/payroll/checkwriters/exports',
      );
      setExports(res.data);
    } catch {
      // Silently fail on initial load
    } finally {
      setLoadingHistory(false);
    }
  }, [supabase]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleGenerate = async () => {
    if (!connectionId.trim()) {
      toast.error('Integration Connection ID is required.');
      return;
    }
    setGenerating(true);
    setLastGenerated(null);
    try {
      const res = await fetchJsonWithSupabaseAuth<GenerateResponse>(supabase, '/api/payroll/checkwriters/exports', {
        method: 'POST',
        body: JSON.stringify({
          integration_connection_id: connectionId,
          pay_period_start: periodStart,
          pay_period_end: periodEnd,
        }),
      });
      setLastGenerated(res.data);
      toast.success(`Export generated: ${res.data.file_name}`);
      await fetchHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (exportId: string, fileName: string) => {
    try {
      const authHeader = await getSupabaseAuthHeader(supabase);
      const res = await fetch(`/api/payroll/checkwriters/exports/${exportId}/download`, {
        headers: authHeader,
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${fileName}`);
      await fetchHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const { sorted, sortKey, sortDir, onSort } = useTableSort(exports as unknown as Record<string, unknown>[], 'created_at', 'desc');
  const pag = usePagination(sorted as unknown as ExportRow[]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Payroll Export (Checkwriters)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate Checkwriters Basic Import files from approved payroll runs.
        </p>
      </header>

      {/* Generate */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Export</CardTitle>
          <CardDescription>Select period and generate a Checkwriters import file.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              label="Integration Connection ID"
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
              placeholder="UUID"
            />
            <Input
              label="Pay Period Start"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
            <Input
              label="Pay Period End"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
          <Button onClick={handleGenerate} disabled={generating || !connectionId.trim()}>
            {generating ? 'Generating...' : 'Generate Export'}
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      {lastGenerated && (
        <Card>
          <CardHeader>
            <CardTitle>Export Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">File Name</p>
                <p className="text-sm font-medium font-mono">{lastGenerated.file_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lines</p>
                <p className="text-sm font-medium tabular-nums">{lastGenerated.line_count}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Hours</p>
                <p className="text-sm font-medium tabular-nums">{lastGenerated.totals.hours.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-sm font-medium tabular-nums">${lastGenerated.totals.amount.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-4">
              <Button size="sm" onClick={() => handleDownload(lastGenerated.id, lastGenerated.file_name)}>
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
          <CardDescription>Previously generated export files.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <Skeleton className="h-32 w-full" />
          ) : exports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No exports yet.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => onSort('file_name')} className="cursor-pointer">
                      File Name {sortKey === 'file_name' && (sortDir === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead onClick={() => onSort('pay_period_start')} className="cursor-pointer">
                      Period {sortKey === 'pay_period_start' && (sortDir === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Lines</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead onClick={() => onSort('created_at')} className="cursor-pointer">
                      Created {sortKey === 'created_at' && (sortDir === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pag.page.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-sm">{row.file_name}</TableCell>
                      <TableCell className="text-sm">
                        {row.pay_period_start} — {row.pay_period_end}
                      </TableCell>
                      <TableCell>
                        <Badge color={STATUS_COLORS[row.status] ?? 'gray'}>{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.line_count}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(row.total_hours ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right tabular-nums">${Number(row.total_amount ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(row.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDownload(row.id, row.file_name)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                currentPage={pag.currentPage}
                totalPages={pag.totalPages}
                totalItems={pag.totalItems}
                pageSize={pag.pageSize}
                hasNext={pag.hasNext}
                hasPrev={pag.hasPrev}
                onNext={pag.nextPage}
                onPrev={pag.prevPage}
                onGoTo={pag.goToPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
