'use client';

import { useEffect, useState } from 'react';
import { FileText, TrendingUp } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm, assertUpdateSucceeded } from '@/hooks/use-form';
import { opportunitySchema, type OpportunityFormData } from '@gleamops/shared';
import { SlideOver, Input, Select, Textarea, Button, FormSection } from '@gleamops/ui';
import type { SalesOpportunity } from '@gleamops/shared';

interface ProspectOption {
  id: string;
  prospect_code: string;
  company_name: string;
}

interface StageOption {
  code: string;
  label: string;
}

const DEFAULTS: OpportunityFormData = {
  opportunity_code: '',
  name: '',
  prospect_id: '',
  stage_code: 'QUALIFIED',
  estimated_monthly_value: null,
  probability_pct: null,
  close_date_target: null,
  competitor_notes: null,
  owner_user_id: null,
  notes: null,
};

interface OpportunityFormProps {
  open: boolean;
  onClose: () => void;
  initialData?: SalesOpportunity | null;
  onSuccess?: () => void;
}

export function OpportunityForm({ open, onClose, initialData, onSuccess }: OpportunityFormProps) {
  const isEdit = !!initialData?.id;
  const supabase = getSupabaseBrowserClient();
  const [opportunityCode, setOpportunityCode] = useState('');
  const [prospects, setProspects] = useState<ProspectOption[]>([]);
  const [stages, setStages] = useState<StageOption[]>([]);

  const { values, errors, loading, setValue, onBlur, handleSubmit, reset } = useForm<OpportunityFormData>({
    schema: opportunitySchema,
    initialValues: initialData
      ? {
          opportunity_code: initialData.opportunity_code,
          name: initialData.name,
          prospect_id: initialData.prospect_id ?? '',
          stage_code: initialData.stage_code,
          estimated_monthly_value: initialData.estimated_monthly_value,
          probability_pct: null,
          close_date_target: initialData.expected_close_date,
          competitor_notes: null,
          owner_user_id: initialData.owner_user_id,
          notes: null,
        }
      : DEFAULTS,
    onSubmit: async (data) => {
      if (isEdit) {
        const result = await supabase
          .from('sales_opportunities')
          .update({
            name: data.name,
            prospect_id: data.prospect_id || null,
            stage_code: data.stage_code,
            estimated_monthly_value: data.estimated_monthly_value,
            expected_close_date: data.close_date_target,
            owner_user_id: data.owner_user_id,
          })
          .eq('id', initialData!.id)
          .eq('version_etag', initialData!.version_etag)
          .select();
        assertUpdateSucceeded(result);
      } else {
        const { error } = await supabase.from('sales_opportunities').insert({
          opportunity_code: opportunityCode,
          name: data.name,
          prospect_id: data.prospect_id || null,
          stage_code: data.stage_code,
          estimated_monthly_value: data.estimated_monthly_value,
          expected_close_date: data.close_date_target,
          owner_user_id: data.owner_user_id,
          tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
        });
        if (error) throw error;
      }
      onSuccess?.();
      handleClose();
    },
  });

  // Generate next opportunity code on create
  useEffect(() => {
    if (open && !isEdit && !opportunityCode) {
      supabase.rpc('next_code', { p_tenant_id: null, p_prefix: 'OPP' }).then(({ data }) => {
        if (data) setOpportunityCode(data);
      });
    }
  }, [open, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load prospects and stage options
  useEffect(() => {
    if (!open) return;

    supabase
      .from('sales_prospects')
      .select('id, prospect_code, company_name')
      .is('archived_at', null)
      .order('company_name')
      .then(({ data }) => {
        if (data) setProspects(data as ProspectOption[]);
      });

    supabase
      .from('lookups')
      .select('code, label')
      .eq('category', 'opportunity_stage')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (data) setStages(data as StageOption[]);
      });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    reset();
    setOpportunityCode('');
    onClose();
  };

  const prospectOptions = [
    { value: '', label: 'Select prospect...' },
    ...prospects.map((p) => ({ value: p.id, label: `${p.company_name} (${p.prospect_code})` })),
  ];

  const stageOptions = stages.length > 0
    ? stages.map((s) => ({ value: s.code, label: s.label }))
    : [{ value: 'QUALIFIED', label: 'Qualified' }];

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Opportunity' : 'New Opportunity'}
      subtitle={isEdit ? initialData?.opportunity_code : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="Opportunity Details" icon={<TrendingUp className="h-4 w-4" />} description="Prospect, stage, value, and target close date.">
          {!isEdit && (
            <Input
              label="Opportunity Code"
              value={opportunityCode}
              readOnly
              disabled
              hint="Auto-generated"
            />
          )}
          <Input
            label="Name"
            value={values.name}
            onChange={(e) => setValue('name', e.target.value)}
            onBlur={() => onBlur('name')}
            error={errors.name}
            required
            placeholder="e.g., Downtown Office Complex Cleaning"
          />
          <Select
            label="Prospect"
            value={values.prospect_id}
            onChange={(e) => setValue('prospect_id', e.target.value)}
            onBlur={() => onBlur('prospect_id')}
            error={errors.prospect_id}
            options={prospectOptions}
            required
          />
          <Select
            label="Stage"
            value={values.stage_code}
            onChange={(e) => setValue('stage_code', e.target.value)}
            options={stageOptions}
          />
          <Input
            label="Estimated Monthly Value"
            type="number"
            value={values.estimated_monthly_value ?? ''}
            onChange={(e) => setValue('estimated_monthly_value', e.target.value ? Number(e.target.value) : null)}
            onBlur={() => onBlur('estimated_monthly_value')}
            error={errors.estimated_monthly_value}
            placeholder="0.00"
          />
          <Input
            label="Probability (%)"
            type="number"
            value={values.probability_pct ?? ''}
            onChange={(e) => setValue('probability_pct', e.target.value ? Number(e.target.value) : null)}
            onBlur={() => onBlur('probability_pct')}
            error={errors.probability_pct}
            placeholder="0 - 100"
          />
          <Input
            label="Target Close Date"
            type="date"
            value={values.close_date_target ?? ''}
            onChange={(e) => setValue('close_date_target', e.target.value || null)}
            onBlur={() => onBlur('close_date_target')}
          />
        </FormSection>

        <FormSection title="Notes" icon={<FileText className="h-4 w-4" />} description="Competitive context and internal notes.">
          <Textarea
            label="Competitor Notes"
            value={values.competitor_notes ?? ''}
            onChange={(e) => setValue('competitor_notes', e.target.value || null)}
            placeholder="Known competitors, their strengths, pricing intel..."
          />
          <Textarea
            label="Notes"
            value={values.notes ?? ''}
            onChange={(e) => setValue('notes', e.target.value || null)}
            placeholder="Additional details about this opportunity..."
          />
        </FormSection>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Opportunity'}
          </Button>
        </div>
      </form>
    </SlideOver>
  );
}
