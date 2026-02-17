'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, Download, Plug, Webhook, RefreshCw, Shield } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader } from '@gleamops/ui';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface Props {
  search: string;
}

type DatasetCard = {
  key: string;
  label: string;
  table: string;
  count: number | null;
};

type IntegrationConnection = {
  id: string;
  provider_name: string;
  integration_type: string;
  status: string;
  last_sync_at: string | null;
  updated_at: string;
};

type SyncLog = {
  id: string;
  status: string;
  sync_direction: string;
  summary: string | null;
  started_at: string;
};

type WebhookRow = {
  id: string;
  event_type: string;
  target_url: string;
  is_active: boolean;
  updated_at: string;
};

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: unknown) => {
    const raw = value == null
      ? ''
      : typeof value === 'string'
        ? value
        : typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value);
    if (/[",\n]/.test(raw)) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  };

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function downloadFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataHubPanel({ search }: Props) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [exportingTable, setExportingTable] = useState<string | null>(null);

  const [datasets, setDatasets] = useState<DatasetCard[]>([]);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);

    const datasetDefs: Omit<DatasetCard, 'count'>[] = [
      { key: 'customers', label: 'Customers', table: 'clients' },
      { key: 'locations', label: 'Locations', table: 'sites' },
      { key: 'jobs', label: 'Jobs', table: 'site_jobs' },
      { key: 'tickets', label: 'Work Tickets', table: 'work_tickets' },
      { key: 'timesheets', label: 'Time Entries', table: 'time_entries' },
      { key: 'inventory-items', label: 'Inventory Items', table: 'items' },
      { key: 'stock-movements', label: 'Stock Movements', table: 'stock_movements' },
      { key: 'invoices', label: 'Invoices', table: 'invoices' },
      { key: 'payments', label: 'Payments', table: 'payments' },
    ];

    const counts = await Promise.all(
      datasetDefs.map(async (dataset) => {
        const { count } = await supabase
          .from(dataset.table)
          .select('id', { count: 'exact', head: true });
        return { ...dataset, count: count ?? 0 };
      })
    );

    const [connRes, logRes, webhookRes] = await Promise.all([
      supabase
        .from('integration_connections')
        .select('id, provider_name, integration_type, status, last_sync_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20),
      supabase
        .from('integration_sync_logs')
        .select('id, status, sync_direction, summary, started_at')
        .order('started_at', { ascending: false })
        .limit(20),
      supabase
        .from('webhooks')
        .select('id, event_type, target_url, is_active, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20),
    ]);

    if (connRes.error) toast.error(connRes.error.message);
    if (logRes.error) toast.error(logRes.error.message);
    if (webhookRes.error) toast.error(webhookRes.error.message);

    setDatasets(counts);
    setConnections((connRes.data ?? []) as IntegrationConnection[]);
    setSyncLogs((logRes.data ?? []) as SyncLog[]);
    setWebhooks((webhookRes.data ?? []) as WebhookRow[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredDatasets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return datasets;
    return datasets.filter((d) => d.label.toLowerCase().includes(q) || d.table.toLowerCase().includes(q));
  }, [datasets, search]);

  const exportDataset = useCallback(async (dataset: DatasetCard) => {
    setExportingTable(dataset.table);
    const { data, error } = await supabase
      .from(dataset.table)
      .select('*')
      .limit(500);

    setExportingTable(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    const csv = rowsToCsv((data ?? []) as Record<string, unknown>[]);
    downloadFile(`anderson-${dataset.table}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast.success(`Exported ${dataset.table} (${(data ?? []).length} rows)`);
  }, [supabase]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading Data Hub...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredDatasets.map((dataset) => (
          <Card key={dataset.key}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{dataset.label}</h3>
                </div>
                <Badge color="blue">{dataset.count ?? 0} rows</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Table: {dataset.table}</p>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => exportDataset(dataset)}
                disabled={exportingTable === dataset.table}
              >
                <Download className="h-4 w-4" />
                {exportingTable === dataset.table ? 'Exporting...' : 'Export CSV (500 rows)'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Plug className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Integration Connections</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {connections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No connections configured.</p>
            ) : connections.map((connection) => (
              <div key={connection.id} className="rounded-lg border border-border p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{connection.provider_name}</p>
                  <Badge color={connection.status === 'CONNECTED' ? 'green' : connection.status === 'EXPIRED' ? 'yellow' : 'gray'}>
                    {connection.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{connection.integration_type} · Last sync: {connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString() : 'Never'}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Webhooks</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {webhooks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No webhooks configured.</p>
            ) : webhooks.map((hook) => (
              <div key={hook.id} className="rounded-lg border border-border p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{hook.event_type}</p>
                  <Badge color={hook.is_active ? 'green' : 'gray'}>{hook.is_active ? 'Active' : 'Disabled'}</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">{hook.target_url}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Sync Logs</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void load()}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {syncLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sync logs recorded.</p>
            ) : syncLogs.map((log) => (
              <div key={log.id} className="rounded-lg border border-border p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{log.sync_direction}</p>
                  <Badge color={log.status === 'SUCCEEDED' ? 'green' : log.status === 'FAILED' ? 'red' : 'blue'}>
                    {log.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(log.started_at).toLocaleString()}</p>
                {log.summary ? <p className="mt-1 text-xs text-muted-foreground">{log.summary}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
