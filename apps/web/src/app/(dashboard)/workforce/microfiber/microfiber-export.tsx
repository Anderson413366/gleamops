'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

function monthStartKey() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return new Date(local.getFullYear(), local.getMonth(), 1).toISOString().slice(0, 10);
}

function todayKey() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export default function MicrofiberExport() {
  const [dateFrom, setDateFrom] = useState(monthStartKey);
  const [dateTo, setDateTo] = useState(todayKey);
  const [loading, setLoading] = useState(false);

  const exportCsv = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      const response = await fetch(`/api/workforce/microfiber/export?${params.toString()}`, {
        headers: await authHeaders(),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Failed to export microfiber payroll CSV');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `microfiber-payroll-${dateFrom}-to-${dateTo}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={dateFrom}
        onChange={(event) => setDateFrom(event.target.value)}
        className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
      />
      <input
        type="date"
        value={dateTo}
        onChange={(event) => setDateTo(event.target.value)}
        className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
      />
      <Button onClick={() => void exportCsv()} disabled={loading}>
        <Download className="h-4 w-4" />
        {loading ? 'Exporting...' : 'Export Payroll CSV'}
      </Button>
    </div>
  );
}
