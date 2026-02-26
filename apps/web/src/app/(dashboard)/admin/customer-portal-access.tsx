'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface ClientRow {
  id: string;
  name: string;
  client_code: string;
}

interface SessionRow {
  id: string;
  session_code: string;
  client_id: string;
  expires_at: string;
  last_used_at: string | null;
  is_active: boolean;
  client?: { id: string; name: string; client_code: string | null } | null;
}

async function authHeaders() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function CustomerPortalAccess() {
  const supabase = getSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('30');
  const [latestToken, setLatestToken] = useState<string | null>(null);
  const [latestSessionCode, setLatestSessionCode] = useState<string | null>(null);

  const clientOptions = useMemo(() => clients.map((client) => ({
    value: client.id,
    label: `${client.name} (${client.client_code})`,
  })), [clients]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientRes, sessionsRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name, client_code')
          .is('archived_at', null)
          .order('name'),
        fetch('/api/operations/customer-portal/sessions?include_inactive=true', {
          headers: await authHeaders(),
          cache: 'no-store',
        }),
      ]);

      if (clientRes.error) {
        throw new Error(clientRes.error.message);
      }
      const nextClients = (clientRes.data ?? []) as ClientRow[];
      setClients(nextClients);
      if (!selectedClientId && nextClients.length > 0) {
        setSelectedClientId(nextClients[0].id);
      }

      const sessionsBody = await sessionsRes.json().catch(() => ({}));
      if (!sessionsRes.ok) {
        throw new Error(sessionsBody.error ?? 'Unable to load portal sessions.');
      }
      setSessions((sessionsBody.data ?? []) as SessionRow[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load portal access data.');
    } finally {
      setLoading(false);
    }
  }, [selectedClientId, supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const createSession = async () => {
    if (!selectedClientId) {
      toast.error('Select a client first.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/operations/customer-portal/sessions', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          client_id: selectedClientId,
          expires_in_days: Number(expiresInDays),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to generate access code.');
      }

      setLatestToken(body.data?.token ?? null);
      setLatestSessionCode(body.data?.session?.session_code ?? null);
      toast.success('Portal access code generated.');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to generate access code.');
    } finally {
      setSaving(false);
    }
  };

  const archiveSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/operations/customer-portal/sessions/${sessionId}/archive`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ reason: 'Manually revoked from admin panel' }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to revoke session.');
      }
      toast.success('Portal session revoked.');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to revoke session.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          Customer Portal Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            label="Client"
            value={selectedClientId}
            onChange={(event) => setSelectedClientId(event.target.value)}
            options={clientOptions}
            disabled={loading}
          />
          <Input
            label="Expires in days"
            type="number"
            value={expiresInDays}
            onChange={(event) => setExpiresInDays(event.target.value)}
            min={1}
            max={90}
          />
          <div className="flex items-end justify-end">
            <Button onClick={() => void createSession()} loading={saving}>
              Generate Access Code
            </Button>
          </div>
        </div>

        {latestToken ? (
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Latest generated code {latestSessionCode ? `(${latestSessionCode})` : ''}</p>
            <p className="mt-1 break-all font-mono text-sm text-foreground">{latestToken}</p>
            <div className="mt-2 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(latestToken);
                  toast.success('Access code copied.');
                }}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Active Sessions</p>
            <Button variant="ghost" size="sm" onClick={() => void loadData()}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No portal sessions created yet.</p>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{session.session_code}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.client?.name ?? session.client_id} · Expires {formatDate(session.expires_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">Last used: {formatDate(session.last_used_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={session.is_active ? 'green' : 'gray'}>{session.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>
                    {session.is_active ? (
                      <Button variant="secondary" size="sm" onClick={() => void archiveSession(session.id)}>
                        Revoke
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
