'use client';

import { useEffect, useMemo, useState } from 'react';
import { MonitorSmartphone, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle, Select } from '@gleamops/ui';
import { useAuth } from '@/hooks/use-auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { loadTenantSetting, saveTenantSetting } from '@/lib/admin/tenant-settings-storage';

interface ClientRow {
  id: string;
  name: string;
  client_code: string;
}

interface PortalSectionSettings {
  inspections: boolean;
  schedule: boolean;
  changeRequests: boolean;
  supplyInventory: boolean;
  orders: boolean;
  sds: boolean;
  agreements: boolean;
}

interface PortalSettingsState {
  defaults: PortalSectionSettings;
  perClient: Record<string, PortalSectionSettings>;
}

const STORAGE_KEY = 'admin:portal-settings';

const DEFAULT_SECTIONS: PortalSectionSettings = {
  inspections: true,
  schedule: true,
  changeRequests: true,
  supplyInventory: true,
  orders: true,
  sds: true,
  agreements: true,
};

const DEFAULT_SETTINGS: PortalSettingsState = {
  defaults: DEFAULT_SECTIONS,
  perClient: {},
};

const SECTION_LABELS: Array<{ key: keyof PortalSectionSettings; label: string }> = [
  { key: 'inspections', label: 'Inspections' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'changeRequests', label: 'Change Requests' },
  { key: 'supplyInventory', label: 'Supply Inventory' },
  { key: 'orders', label: 'Orders' },
  { key: 'sds', label: 'SDS + Chemical Images' },
  { key: 'agreements', label: 'Agreements' },
];

function cloneSections(source: PortalSectionSettings): PortalSectionSettings {
  return {
    inspections: source.inspections,
    schedule: source.schedule,
    changeRequests: source.changeRequests,
    supplyInventory: source.supplyInventory,
    orders: source.orders,
    sds: source.sds,
    agreements: source.agreements,
  };
}

export default function PortalSettings() {
  const { tenantId } = useAuth();
  const supabase = getSupabaseBrowserClient();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [settings, setSettings] = useState<PortalSettingsState>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadTenantSetting(tenantId, STORAGE_KEY, DEFAULT_SETTINGS));
  }, [tenantId]);

  useEffect(() => {
    async function loadClients() {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, client_code')
        .is('archived_at', null)
        .order('name');

      if (error) {
        toast.error(error.message);
        return;
      }

      const rows = (data ?? []) as ClientRow[];
      setClients(rows);
      if (rows.length > 0 && !selectedClientId) {
        setSelectedClientId(rows[0].id);
      }
    }

    void loadClients();
  }, [selectedClientId, supabase]);

  const effectiveClientSettings = useMemo(() => {
    if (!selectedClientId) return settings.defaults;
    return settings.perClient[selectedClientId] ?? settings.defaults;
  }, [selectedClientId, settings.defaults, settings.perClient]);

  const updateDefaults = (key: keyof PortalSectionSettings, enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      defaults: {
        ...prev.defaults,
        [key]: enabled,
      },
    }));
  };

  const updateClientOverride = (key: keyof PortalSectionSettings, enabled: boolean) => {
    if (!selectedClientId) return;

    setSettings((prev) => {
      const baseline = prev.perClient[selectedClientId] ?? cloneSections(prev.defaults);
      return {
        ...prev,
        perClient: {
          ...prev.perClient,
          [selectedClientId]: {
            ...baseline,
            [key]: enabled,
          },
        },
      };
    });
  };

  const resetClientOverride = () => {
    if (!selectedClientId) return;
    setSettings((prev) => {
      const next = { ...prev.perClient };
      delete next[selectedClientId];
      return { ...prev, perClient: next };
    });
  };

  const handleSave = () => {
    saveTenantSetting(tenantId, STORAGE_KEY, settings);
    toast.success('Client portal settings saved.');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5 text-primary" />
            Portal Defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {SECTION_LABELS.map((section) => (
            <label key={`default-${section.key}`} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={settings.defaults[section.key]}
                onChange={(event) => updateDefaults(section.key, event.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              {section.label}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-Client Visibility Override</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            label="Client"
            value={selectedClientId}
            onChange={(event) => setSelectedClientId(event.target.value)}
            options={clients.map((client) => ({
              value: client.id,
              label: `${client.name} (${client.client_code})`,
            }))}
          />

          <div className="space-y-2">
            {SECTION_LABELS.map((section) => (
              <label key={`client-${section.key}`} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={effectiveClientSettings[section.key]}
                  onChange={(event) => updateClientOverride(section.key, event.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                {section.label}
              </label>
            ))}
          </div>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={resetClientOverride}>
              Reset Client Override
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save Portal Settings
        </Button>
      </div>
    </div>
  );
}
