'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@gleamops/ui';

export default function PayrollExportPage() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [integrationConnectionId, setIntegrationConnectionId] = useState('');
  const [payPeriodStart, setPayPeriodStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [payPeriodEnd, setPayPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));

  async function handleGenerate() {
    setBusy(true);
    setStatus('');

    try {
      const response = await fetch('/api/payroll/checkwriters/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integration_connection_id: integrationConnectionId,
          pay_period_start: payPeriodStart,
          pay_period_end: payPeriodEnd,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setStatus(`Export request failed: ${errorText}`);
        return;
      }

      const json = await response.json();
      setStatus(`Export created: ${json.data?.file_name ?? 'unknown'}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Payroll Export (Checkwriters)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate Checkwriters Basic Import files. Format enforces no header and short filename.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Export Workflow</CardTitle>
          <CardDescription>Select period -&gt; preview -&gt; generate -&gt; download</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>File name format defaults to <code>cwYYMMDD.csv</code>.</li>
            <li>File is generated from approved payroll runs.</li>
            <li>Mapping comes from platform Checkwriters configuration.</li>
          </ul>

          <div className="grid gap-3 md:grid-cols-3">
            <Input
              label="Integration Connection ID"
              value={integrationConnectionId}
              onChange={(e) => setIntegrationConnectionId(e.target.value)}
              placeholder="UUID"
            />
            <Input
              label="Pay Period Start"
              type="date"
              value={payPeriodStart}
              onChange={(e) => setPayPeriodStart(e.target.value)}
            />
            <Input
              label="Pay Period End"
              type="date"
              value={payPeriodEnd}
              onChange={(e) => setPayPeriodEnd(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <Button onClick={handleGenerate} disabled={busy || integrationConnectionId.trim().length === 0}>
              {busy ? 'Generating...' : 'Generate Checkwriters Export'}
            </Button>
          </div>

          {status && (
            <p className="text-sm text-muted-foreground">{status}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
