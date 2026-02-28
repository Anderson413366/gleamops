'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { SlideOver, Button, Input, EmptyState } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface ScheduleTemplate {
  id: string;
  template_name: string;
  site_id: string | null;
  template_data: Array<{
    position_code: string;
    weekday: number;
    start_time: string;
    end_time: string;
    required_staff: number;
  }>;
  created_at: string;
}

interface TemplateManagerProps {
  mode: 'save' | 'load';
  open: boolean;
  onClose: () => void;
  /** Current schedule data to extract template from (for save mode) */
  currentRows?: Array<{
    positionType: string;
    startTime: string;
    endTime: string;
    scheduleDays: string[];
  }>;
  /** Called when a template is loaded (for load mode) */
  onApplyTemplate?: (template: ScheduleTemplate['template_data']) => void;
}

const WEEKDAY_MAP: Record<string, number> = {
  MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0,
};

export function TemplateManager({ mode, open, onClose, currentRows, onApplyTemplate }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('schedule_templates')
      .select('id, template_name, site_id, template_data, created_at')
      .eq('is_active', true)
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    setTemplates((data as ScheduleTemplate[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) void fetchTemplates();
  }, [open, fetchTemplates]);

  const handleSave = useCallback(async () => {
    if (!templateName.trim() || !currentRows?.length) return;
    setSaving(true);

    // Extract template data from current rows
    const templateData: ScheduleTemplate['template_data'] = [];
    for (const row of currentRows) {
      for (const day of row.scheduleDays) {
        templateData.push({
          position_code: row.positionType,
          weekday: WEEKDAY_MAP[day] ?? 1,
          start_time: row.startTime,
          end_time: row.endTime,
          required_staff: 1,
        });
      }
    }

    const supabase = getSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    const tenantId = auth.user?.app_metadata?.tenant_id ?? null;

    await supabase.from('schedule_templates').insert({
      tenant_id: tenantId,
      template_name: templateName.trim(),
      template_data: templateData,
    });

    setSaving(false);
    setTemplateName('');
    onClose();
  }, [templateName, currentRows, onClose]);

  const handleDelete = useCallback(async (id: string) => {
    const supabase = getSupabaseBrowserClient();
    await supabase
      .from('schedule_templates')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id);
    void fetchTemplates();
  }, [fetchTemplates]);

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={mode === 'save' ? 'Save Schedule Template' : 'Load Schedule Template'}
      subtitle={mode === 'save' ? 'Save current schedule pattern as a reusable template' : 'Select a template to apply'}
    >
      {mode === 'save' ? (
        <div className="space-y-6">
          <Input
            label="Template Name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g., Standard Weeknight Schedule"
            required
          />
          <p className="text-sm text-muted-foreground">
            This will capture the current schedule pattern ({currentRows?.length ?? 0} assignments) as a reusable template.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!templateName.trim()}>
              Save Template
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading templates...</p>
          ) : templates.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-10 w-10" />}
              title="No templates saved"
              description="Save a schedule as a template first, then load it here."
            />
          ) : (
            templates.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-border p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{t.template_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.template_data.length} shift patterns · Created {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        onApplyTemplate?.(t.template_data);
                        onClose();
                      }}
                    >
                      Apply
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label={`Delete template ${t.template_name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </SlideOver>
  );
}
