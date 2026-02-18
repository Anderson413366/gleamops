'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@gleamops/ui';

export default function CheckwritersIntegrationPage() {
  const [integrationConnectionId, setIntegrationConnectionId] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function saveConfig() {
    setBusy(true);
    setStatus('');

    try {
      const response = await fetch('/api/payroll/checkwriters/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integration_connection_id: integrationConnectionId,
          profile_name: 'Default Checkwriters',
          column_schema_json: [
            { key: 'employee_id', label: 'ID', enabled: true, order_index: 0 },
            { key: 'det', label: 'DET', enabled: true, order_index: 1 },
            { key: 'det_code', label: 'DET Code', enabled: true, order_index: 2 },
            { key: 'hours', label: 'Hours', enabled: true, order_index: 3 },
            { key: 'rate', label: 'Rate', enabled: true, order_index: 4 },
            { key: 'amount', label: 'Amount', enabled: true, order_index: 5 },
          ],
          code_map: [],
          employee_map: [],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        setStatus(`Save failed: ${text}`);
        return;
      }

      setStatus('Configuration saved successfully.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Checkwriters Payroll Integration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure mapping for Basic Import columns and employee external IDs.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>Use a PAYROLL integration connection ID</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            label="Integration Connection ID"
            value={integrationConnectionId}
            onChange={(e) => setIntegrationConnectionId(e.target.value)}
            placeholder="UUID"
          />

          <div>
            <Button onClick={saveConfig} disabled={busy || integrationConnectionId.trim().length === 0}>
              {busy ? 'Saving...' : 'Save Checkwriters Config'}
            </Button>
          </div>

          {status && <p className="text-sm text-muted-foreground">{status}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
