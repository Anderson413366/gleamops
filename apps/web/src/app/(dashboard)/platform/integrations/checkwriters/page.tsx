'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchJsonWithSupabaseAuth } from '@/lib/supabase/authenticated-fetch';
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Input, Select, Skeleton,
} from '@gleamops/ui';
import type { CheckwritersImportColumn, CheckwritersCodeMap, CheckwritersEmployeeExternalId } from '@gleamops/shared';

interface StaffOption { value: string; label: string }

interface ConfigResponse {
  success: boolean;
  data: {
    profile: { id: string; column_schema_json: CheckwritersImportColumn[] } | null;
    code_map: (CheckwritersCodeMap & { id: string })[];
    employee_map: (CheckwritersEmployeeExternalId & { id: string })[];
  };
}

const DET_OPTIONS = [
  { value: 'E', label: 'E — Earnings' },
  { value: 'D', label: 'D — Deductions' },
  { value: 'T', label: 'T — Taxes' },
];

export default function CheckwritersIntegrationPage() {
  const supabase = getSupabaseBrowserClient();
  const [connectionId, setConnectionId] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Column schema
  const [columns, setColumns] = useState<CheckwritersImportColumn[]>([]);

  // Code mapping
  const [codeMap, setCodeMap] = useState<CheckwritersCodeMap[]>([]);

  // Employee mapping
  const [employeeMap, setEmployeeMap] = useState<CheckwritersEmployeeExternalId[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);

  // Load staff for employee picker
  useEffect(() => {
    supabase
      .from('staff')
      .select('id, full_name, staff_code')
      .is('archived_at', null)
      .order('full_name')
      .then(({ data }) => {
        if (data) {
          setStaffOptions(data.map((s) => ({
            value: s.id,
            label: `${s.full_name ?? s.staff_code} (${s.staff_code})`,
          })));
        }
      });
  }, [supabase]);

  const handleLoad = useCallback(async () => {
    if (!connectionId.trim()) return;
    setLoading(true);
    try {
      const res = await fetchJsonWithSupabaseAuth<ConfigResponse>(
        supabase,
        `/api/payroll/checkwriters/config?integration_connection_id=${encodeURIComponent(connectionId)}`,
      );
      setColumns(res.data.profile?.column_schema_json ?? [
        { key: 'employee_id', label: 'ID', enabled: true, order_index: 0 },
        { key: 'det', label: 'DET', enabled: true, order_index: 1 },
        { key: 'det_code', label: 'DET Code', enabled: true, order_index: 2 },
        { key: 'hours', label: 'Hours', enabled: true, order_index: 3 },
        { key: 'rate', label: 'Rate', enabled: true, order_index: 4 },
        { key: 'amount', label: 'Amount', enabled: true, order_index: 5 },
      ]);
      setCodeMap(res.data.code_map.map((r) => ({
        internal_pay_code: r.internal_pay_code,
        det: r.det,
        det_code: r.det_code,
        default_rate: r.default_rate,
      })));
      setEmployeeMap(res.data.employee_map.map((r) => ({
        staff_id: r.staff_id,
        external_employee_id: r.external_employee_id,
      })));
      setLoaded(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, [connectionId, supabase]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetchJsonWithSupabaseAuth(supabase, '/api/payroll/checkwriters/config', {
        method: 'PUT',
        body: JSON.stringify({
          integration_connection_id: connectionId,
          profile_name: 'Default Checkwriters',
          column_schema_json: columns,
          code_map: codeMap,
          employee_map: employeeMap,
        }),
      });
      toast.success('Configuration saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Column helpers
  const updateColumn = (index: number, patch: Partial<CheckwritersImportColumn>) => {
    setColumns((prev) => prev.map((c, i) => i === index ? { ...c, ...patch } : c));
  };

  // Code map helpers
  const addCodeRow = () => setCodeMap((prev) => [...prev, { internal_pay_code: '', det: 'E', det_code: '', default_rate: null }]);
  const removeCodeRow = (index: number) => setCodeMap((prev) => prev.filter((_, i) => i !== index));
  const updateCodeRow = (index: number, patch: Partial<CheckwritersCodeMap>) => {
    setCodeMap((prev) => prev.map((r, i) => i === index ? { ...r, ...patch } : r));
  };

  // Employee map helpers
  const addEmployeeRow = () => setEmployeeMap((prev) => [...prev, { staff_id: '', external_employee_id: '' }]);
  const removeEmployeeRow = (index: number) => setEmployeeMap((prev) => prev.filter((_, i) => i !== index));
  const updateEmployeeRow = (index: number, patch: Partial<CheckwritersEmployeeExternalId>) => {
    setEmployeeMap((prev) => prev.map((r, i) => i === index ? { ...r, ...patch } : r));
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Checkwriters Payroll Integration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure mapping for Basic Import columns, pay codes, and employee external IDs.
        </p>
      </header>

      {/* Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>Enter a PAYROLL integration connection ID to load or create configuration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="Integration Connection ID"
                value={connectionId}
                onChange={(e) => setConnectionId(e.target.value)}
                placeholder="UUID"
              />
            </div>
            <Button onClick={handleLoad} disabled={loading || !connectionId.trim()}>
              {loading ? 'Loading...' : 'Load Config'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && <Skeleton className="h-64 w-full" />}

      {loaded && !loading && (
        <>
          {/* Column Schema */}
          <Card>
            <CardHeader>
              <CardTitle>Column Schema</CardTitle>
              <CardDescription>Configure export columns and their order.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {columns.map((col, i) => (
                  <div key={col.key} className="grid grid-cols-4 gap-3 items-end">
                    <Input label="Key" value={col.key} onChange={(e) => updateColumn(i, { key: e.target.value })} />
                    <Input label="Label" value={col.label} onChange={(e) => updateColumn(i, { label: e.target.value })} />
                    <Input label="Order" type="number" value={col.order_index} onChange={(e) => updateColumn(i, { order_index: Number(e.target.value) })} />
                    <label className="flex items-center gap-2 text-sm pb-2">
                      <input
                        type="checkbox"
                        checked={col.enabled}
                        onChange={(e) => updateColumn(i, { enabled: e.target.checked })}
                        className="rounded border-border"
                      />
                      Enabled
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Code Mapping */}
          <Card>
            <CardHeader>
              <CardTitle>Code Mapping</CardTitle>
              <CardDescription>Map internal pay codes to Checkwriters DET codes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {codeMap.length === 0 && (
                <p className="text-sm text-muted-foreground">No code mappings yet.</p>
              )}
              {codeMap.map((row, i) => (
                <div key={i} className="grid grid-cols-5 gap-3 items-end">
                  <Input
                    label="Internal Pay Code"
                    value={row.internal_pay_code}
                    onChange={(e) => updateCodeRow(i, { internal_pay_code: e.target.value })}
                  />
                  <Select
                    label="DET"
                    value={row.det}
                    onChange={(e) => updateCodeRow(i, { det: e.target.value as 'E' | 'D' | 'T' })}
                    options={DET_OPTIONS}
                  />
                  <Input
                    label="DET Code"
                    value={row.det_code}
                    onChange={(e) => updateCodeRow(i, { det_code: e.target.value })}
                  />
                  <Input
                    label="Default Rate"
                    value={row.default_rate ?? ''}
                    onChange={(e) => updateCodeRow(i, { default_rate: e.target.value || null })}
                  />
                  <button
                    type="button"
                    onClick={() => removeCodeRow(i)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors mb-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button size="sm" variant="secondary" onClick={addCodeRow}>
                <Plus className="h-3.5 w-3.5" /> Add Code Mapping
              </Button>
            </CardContent>
          </Card>

          {/* Employee Mapping */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Mapping</CardTitle>
              <CardDescription>Map staff members to their external Checkwriters employee IDs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {employeeMap.length === 0 && (
                <p className="text-sm text-muted-foreground">No employee mappings yet.</p>
              )}
              {employeeMap.map((row, i) => (
                <div key={i} className="grid grid-cols-3 gap-3 items-end">
                  <Select
                    label="Staff"
                    value={row.staff_id}
                    onChange={(e) => updateEmployeeRow(i, { staff_id: e.target.value })}
                    options={[{ value: '', label: 'Select staff...' }, ...staffOptions]}
                  />
                  <Input
                    label="External Employee ID"
                    value={row.external_employee_id}
                    onChange={(e) => updateEmployeeRow(i, { external_employee_id: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removeEmployeeRow(i)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors mb-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button size="sm" variant="secondary" onClick={addEmployeeRow}>
                <Plus className="h-3.5 w-3.5" /> Add Employee Mapping
              </Button>
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
