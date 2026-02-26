'use client';

import { useEffect, useState } from 'react';
import { Boxes, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@gleamops/ui';
import { useAuth } from '@/hooks/use-auth';
import { loadTenantSetting, saveTenantSetting } from '@/lib/admin/tenant-settings-storage';

interface InventorySettingsState {
  countFrequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY';
  requireAllItems: boolean;
  mandatoryPhotoProof: boolean;
  aiPhotoCountingEnabled: boolean;
  decimalCountingEnabled: boolean;
  supportedLanguages: string;
  defaultMarkupPercent: number;
}

const STORAGE_KEY = 'admin:inventory-settings';

const DEFAULT_SETTINGS: InventorySettingsState = {
  countFrequency: 'MONTHLY',
  requireAllItems: true,
  mandatoryPhotoProof: true,
  aiPhotoCountingEnabled: false,
  decimalCountingEnabled: true,
  supportedLanguages: 'English, Spanish, Portuguese, Romanian',
  defaultMarkupPercent: 33.3,
};

export default function InventorySettings() {
  const { tenantId } = useAuth();
  const [values, setValues] = useState<InventorySettingsState>(DEFAULT_SETTINGS);

  useEffect(() => {
    setValues(loadTenantSetting(tenantId, STORAGE_KEY, DEFAULT_SETTINGS));
  }, [tenantId]);

  const handleSave = () => {
    saveTenantSetting(tenantId, STORAGE_KEY, values);
    toast.success('Inventory settings saved.');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            Inventory Count Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Select
            label="Count Frequency"
            value={values.countFrequency}
            onChange={(event) => setValues((prev) => ({ ...prev, countFrequency: event.target.value as InventorySettingsState['countFrequency'] }))}
            options={[
              { value: 'WEEKLY', label: 'Weekly' },
              { value: 'BIWEEKLY', label: 'Biweekly' },
              { value: 'MONTHLY', label: 'Monthly' },
              { value: 'QUARTERLY', label: 'Quarterly' },
            ]}
          />

          <Input
            label="Default Client Markup (%)"
            type="number"
            step="0.1"
            min={0}
            max={500}
            value={String(values.defaultMarkupPercent)}
            onChange={(event) => setValues((prev) => ({ ...prev, defaultMarkupPercent: Number(event.target.value) || 0 }))}
          />

          <Input
            label="Supported Languages"
            value={values.supportedLanguages}
            onChange={(event) => setValues((prev) => ({ ...prev, supportedLanguages: event.target.value }))}
            hint="Comma-separated order used in count forms"
          />

          <div className="space-y-2">
            <label className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={values.requireAllItems}
                onChange={(event) => setValues((prev) => ({ ...prev, requireAllItems: event.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              Require a value for every assigned inventory item
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={values.mandatoryPhotoProof}
                onChange={(event) => setValues((prev) => ({ ...prev, mandatoryPhotoProof: event.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              Require photo proof before submitting counts
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={values.decimalCountingEnabled}
                onChange={(event) => setValues((prev) => ({ ...prev, decimalCountingEnabled: event.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              Allow decimal counting (example: 1.5 cases)
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={values.aiPhotoCountingEnabled}
                onChange={(event) => setValues((prev) => ({ ...prev, aiPhotoCountingEnabled: event.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              Enable AI photo counting assistance
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save Inventory Settings
        </Button>
      </div>
    </div>
  );
}
