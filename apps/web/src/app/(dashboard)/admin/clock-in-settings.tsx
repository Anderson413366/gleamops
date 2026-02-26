'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@gleamops/ui';
import { useAuth } from '@/hooks/use-auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { loadTenantSetting, saveTenantSetting } from '@/lib/admin/tenant-settings-storage';

interface ClockInExtras {
  geofenceRadiusFeet: number;
  autoBlockOutsideGeofence: boolean;
  selfieVerificationRequired: boolean;
  gpsSamplingSeconds: number;
  gpsRetentionDays: number;
}

const EXTRA_STORAGE_KEY = 'admin:clock-in-settings:extras';

const DEFAULT_EXTRAS: ClockInExtras = {
  geofenceRadiusFeet: 300,
  autoBlockOutsideGeofence: false,
  selfieVerificationRequired: true,
  gpsSamplingSeconds: 45,
  gpsRetentionDays: 30,
};

export default function ClockInSettings() {
  const supabase = getSupabaseBrowserClient();
  const { tenantId } = useAuth();

  const [policyId, setPolicyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [policyName, setPolicyName] = useState('Default Clock Policy');
  const [clockInRestriction, setClockInRestriction] = useState<'NONE' | 'GEOFENCE_REQUIRED' | 'NFC_QR_REQUIRED' | 'BOTH_REQUIRED'>('GEOFENCE_REQUIRED');
  const [earlyClockInMinutes, setEarlyClockInMinutes] = useState(30);
  const [lateClockOutMinutes, setLateClockOutMinutes] = useState(30);
  const [requiresPhotoOnManualEdit, setRequiresPhotoOnManualEdit] = useState(true);

  const [extras, setExtras] = useState<ClockInExtras>(DEFAULT_EXTRAS);

  const loadPolicy = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('time_policies')
      .select('id, policy_name, clock_in_restriction, early_clock_in_minutes, late_clock_out_minutes, requires_photo_on_manual_edit')
      .eq('tenant_id', tenantId)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data) {
      const row = data as {
        id: string;
        policy_name: string | null;
        clock_in_restriction: 'NONE' | 'GEOFENCE_REQUIRED' | 'NFC_QR_REQUIRED' | 'BOTH_REQUIRED';
        early_clock_in_minutes: number | null;
        late_clock_out_minutes: number | null;
        requires_photo_on_manual_edit: boolean | null;
      };

      setPolicyId(row.id);
      setPolicyName(row.policy_name?.trim() || 'Default Clock Policy');
      setClockInRestriction(row.clock_in_restriction ?? 'GEOFENCE_REQUIRED');
      setEarlyClockInMinutes(row.early_clock_in_minutes ?? 30);
      setLateClockOutMinutes(row.late_clock_out_minutes ?? 30);
      setRequiresPhotoOnManualEdit(Boolean(row.requires_photo_on_manual_edit));
    }

    setExtras(loadTenantSetting(tenantId, EXTRA_STORAGE_KEY, DEFAULT_EXTRAS));
    setLoading(false);
  }, [supabase, tenantId]);

  useEffect(() => {
    void loadPolicy();
  }, [loadPolicy]);

  const savePolicy = async () => {
    if (!tenantId) {
      toast.error('Tenant context is missing.');
      return;
    }

    setSaving(true);

    const payload = {
      tenant_id: tenantId,
      policy_name: policyName.trim() || 'Default Clock Policy',
      clock_in_restriction: clockInRestriction,
      early_clock_in_minutes: earlyClockInMinutes,
      late_clock_out_minutes: lateClockOutMinutes,
      requires_photo_on_manual_edit: requiresPhotoOnManualEdit,
      is_active: true,
    };

    if (policyId) {
      const { error } = await supabase
        .from('time_policies')
        .update(payload)
        .eq('id', policyId);

      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from('time_policies')
        .insert(payload)
        .select('id')
        .single();

      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }

      setPolicyId((data as { id: string }).id);
    }

    saveTenantSetting(tenantId, EXTRA_STORAGE_KEY, extras);
    toast.success('Clock-in settings saved.');
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">Loading clock-in settings...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Clock-In Verification Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Input
            label="Policy Name"
            value={policyName}
            onChange={(event) => setPolicyName(event.target.value)}
          />

          <Select
            label="Clock-In Restriction"
            value={clockInRestriction}
            onChange={(event) => setClockInRestriction(event.target.value as typeof clockInRestriction)}
            options={[
              { value: 'NONE', label: 'None' },
              { value: 'GEOFENCE_REQUIRED', label: 'Require Geofence' },
              { value: 'NFC_QR_REQUIRED', label: 'Require NFC / QR' },
              { value: 'BOTH_REQUIRED', label: 'Require Both' },
            ]}
          />

          <Input
            label="Allow Early Clock-In (minutes)"
            type="number"
            min={0}
            max={240}
            value={String(earlyClockInMinutes)}
            onChange={(event) => setEarlyClockInMinutes(Number(event.target.value) || 0)}
          />

          <Input
            label="Allow Late Clock-Out (minutes)"
            type="number"
            min={0}
            max={240}
            value={String(lateClockOutMinutes)}
            onChange={(event) => setLateClockOutMinutes(Number(event.target.value) || 0)}
          />

          <label className="col-span-full flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={requiresPhotoOnManualEdit}
              onChange={(event) => setRequiresPhotoOnManualEdit(event.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Require selfie proof when manual time edits are submitted
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Geofence + GPS Options</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Input
            label="Default Geofence Radius (feet)"
            type="number"
            min={50}
            max={5000}
            value={String(extras.geofenceRadiusFeet)}
            onChange={(event) => setExtras((prev) => ({ ...prev, geofenceRadiusFeet: Number(event.target.value) || 0 }))}
          />

          <Input
            label="GPS Sampling Interval (seconds)"
            type="number"
            min={5}
            max={600}
            value={String(extras.gpsSamplingSeconds)}
            onChange={(event) => setExtras((prev) => ({ ...prev, gpsSamplingSeconds: Number(event.target.value) || 0 }))}
          />

          <Input
            label="GPS Retention (days)"
            type="number"
            min={1}
            max={365}
            value={String(extras.gpsRetentionDays)}
            onChange={(event) => setExtras((prev) => ({ ...prev, gpsRetentionDays: Number(event.target.value) || 0 }))}
          />

          <div className="space-y-2">
            <label className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={extras.autoBlockOutsideGeofence}
                onChange={(event) => setExtras((prev) => ({ ...prev, autoBlockOutsideGeofence: event.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              Auto-block clock-in when outside geofence
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={extras.selfieVerificationRequired}
                onChange={(event) => setExtras((prev) => ({ ...prev, selfieVerificationRequired: event.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              Require selfie verification for clock events
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={savePolicy} loading={saving}>
          <Save className="h-4 w-4" />
          Save Clock-In Settings
        </Button>
      </div>
    </div>
  );
}
