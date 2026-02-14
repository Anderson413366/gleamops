'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Zap, ChevronLeft, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SlideOver,
  Button,
  Input,
  Select,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@gleamops/ui';
import { calculateWorkload, calculatePricing, expressLoad } from '@gleamops/cleanflow';
import type { BidVersionSnapshot, WorkloadResult, PricingResult } from '@gleamops/cleanflow';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BUILDING_TYPE_OPTIONS = [
  { value: 'OFFICE', label: 'Office' },
  { value: 'MEDICAL_HEALTHCARE', label: 'Medical / Healthcare' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'SCHOOL_EDUCATION', label: 'School / Education' },
  { value: 'INDUSTRIAL_MANUFACTURING', label: 'Industrial / Manufacturing' },
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'RESTAURANT_FOOD', label: 'Restaurant / Food' },
  { value: 'GYM_FITNESS', label: 'Gym / Fitness' },
];

const STEPS = ['Client & Building', 'Areas & Price', 'Confirm'];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ExpressBidProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ExpressForm {
  client_id: string;
  building_type_code: string;
  total_sqft: number;
  occupancy: number;
  service_id: string;
}

const DEFAULTS: ExpressForm = {
  client_id: '',
  building_type_code: '',
  total_sqft: 0,
  occupancy: 0,
  service_id: '',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ExpressBid({ open, onClose, onSuccess }: ExpressBidProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ExpressForm>({ ...DEFAULTS });
  const [saving, setSaving] = useState(false);

  // Lookup data
  const [clients, setClients] = useState<{ value: string; label: string }[]>([]);
  const [services, setServices] = useState<{ value: string; label: string }[]>([]);
  const [serviceTasks, setServiceTasks] = useState<{ task_id: string; task_code: string; task_name: string; frequency: string }[]>([]);
  const [productionRates, setProductionRates] = useState<BidVersionSnapshot['production_rates']>([]);

  // Calculation results
  const [workloadResult, setWorkloadResult] = useState<WorkloadResult | null>(null);
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Generated areas preview
  const [generatedAreas, setGeneratedAreas] = useState<ReturnType<typeof expressLoad>>([]);

  const supabase = getSupabaseBrowserClient();

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setForm({ ...DEFAULTS });
    setWorkloadResult(null);
    setPricingResult(null);
    setCalcError(null);
    setGeneratedAreas([]);

    // Load clients + services + production rates
    supabase.from('clients').select('id, name, client_code').is('archived_at', null).order('name')
      .then(({ data }) => {
        if (data) setClients(data.map((c) => ({ value: c.id, label: `${c.name} (${c.client_code})` })));
      });
    supabase.from('services').select('id, name, service_code').is('archived_at', null).order('name')
      .then(({ data }) => {
        if (data) setServices(data.map((s) => ({ value: s.id, label: `${s.name} (${s.service_code})` })));
      });
    supabase.from('task_production_rates').select('*, task:task_id(task_code)').eq('is_active', true)
      .then(({ data }) => {
        if (data) {
          setProductionRates(data.map((r: Record<string, unknown>) => {
            const task = r.task as { task_code: string } | null;
            return {
              task_code: task?.task_code ?? '',
              floor_type_code: r.floor_type_code as string | null,
              building_type_code: r.building_type_code as string | null,
              unit_code: (r.unit_code as 'SQFT_1000' | 'EACH') ?? 'SQFT_1000',
              base_minutes: r.base_minutes as number,
              default_ml_adjustment: r.default_ml_adjustment as number,
              is_active: true,
            };
          }));
        }
      });
  }, [open, supabase]);

  // Load service tasks when service changes
  useEffect(() => {
    if (!form.service_id) { setServiceTasks([]); return; }
    supabase
      .from('service_tasks')
      .select('task_id, frequency_default, task:task_id(task_code, name)')
      .eq('service_id', form.service_id)
      .is('archived_at', null)
      .then(({ data }) => {
        if (data) {
          setServiceTasks(data.map((st: Record<string, unknown>) => {
            const task = st.task as { task_code: string; name: string } | null;
            return {
              task_id: st.task_id as string,
              task_code: task?.task_code ?? '',
              task_name: task?.name ?? '',
              frequency: st.frequency_default as string,
            };
          }));
        }
      });
  }, [form.service_id, supabase]);

  // Auto-calculate when moving to step 1
  const runExpressCalculation = useCallback(() => {
    setCalcError(null);

    if (!form.building_type_code || form.total_sqft <= 0) {
      setCalcError('Please select a building type and enter square footage.');
      return;
    }

    // Generate areas
    const areas = expressLoad({
      building_type_code: form.building_type_code,
      total_sqft: form.total_sqft,
      occupancy: form.occupancy || undefined,
    });
    setGeneratedAreas(areas);

    if (serviceTasks.length === 0) {
      setCalcError('Please select a service template to calculate pricing.');
      return;
    }

    const snapshot: BidVersionSnapshot = {
      bid_version_id: 'express-preview',
      service_code: form.service_id || null,
      areas: areas.map((a, i) => ({
        area_id: `express-${i}`,
        name: a.name,
        area_type_code: a.area_type_code || null,
        floor_type_code: a.floor_type_code || null,
        building_type_code: form.building_type_code || null,
        difficulty_code: 'STANDARD' as const,
        square_footage: a.square_footage,
        quantity: a.quantity,
        fixtures: a.fixtures,
        tasks: serviceTasks.map((st) => ({
          task_code: st.task_code,
          frequency_code: st.frequency,
          use_ai: false,
          custom_minutes: null,
        })),
      })),
      schedule: {
        days_per_week: 5,
        visits_per_day: 1,
        hours_per_shift: 4,
        lead_required: false,
        supervisor_hours_week: 0,
      },
      labor_rates: { cleaner_rate: 15, lead_rate: 18, supervisor_rate: 22 },
      burden: { employer_tax_pct: 7.65, workers_comp_pct: 5, insurance_pct: 3, other_pct: 0 },
      overhead: { monthly_overhead_allocated: 0 },
      supplies: { allowance_per_sqft_monthly: 0.01, consumables_monthly: 0 },
      equipment: [],
      production_rates: productionRates,
      pricing_strategy: { method: 'TARGET_MARGIN', target_margin_pct: 25 },
    };

    try {
      const workload = calculateWorkload(snapshot);
      const pricing = calculatePricing(snapshot, workload);
      setWorkloadResult(workload);
      setPricingResult(pricing);
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : 'Calculation error');
    }
  }, [form, serviceTasks, productionRates]);

  // Save express bid
  const saveBid = async () => {
    if (!workloadResult || !pricingResult) return;
    setSaving(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      const tenantId = user?.app_metadata?.tenant_id;
      const { data: codeData } = await supabase.rpc('next_code', { p_tenant_id: tenantId, p_prefix: 'BID' });
      const bidCode = codeData || `BID-${Date.now()}`;

      // 1. Create bid
      const { data: bid, error: bidErr } = await supabase
        .from('sales_bids')
        .insert({
          tenant_id: tenantId,
          bid_code: bidCode,
          client_id: form.client_id,
          service_id: form.service_id || null,
          bid_type_code: 'JANITORIAL',
          status: 'DRAFT',
          total_sqft: form.total_sqft,
          bid_monthly_price: pricingResult.recommended_price,
          target_margin_percent: pricingResult.effective_margin_pct,
        })
        .select('id')
        .single();
      if (bidErr || !bid) throw bidErr;

      // 2. Create bid version
      const { data: version, error: verErr } = await supabase
        .from('sales_bid_versions')
        .insert({
          tenant_id: tenantId,
          bid_id: bid.id,
          version_number: 1,
          is_sent_snapshot: false,
        })
        .select('id')
        .single();
      if (verErr || !version) throw verErr;

      // 3. Create areas + tasks
      for (let i = 0; i < generatedAreas.length; i++) {
        const area = generatedAreas[i];
        const { data: areaRow, error: areaErr } = await supabase
          .from('sales_bid_areas')
          .insert({
            tenant_id: tenantId,
            bid_version_id: version.id,
            name: area.name,
            area_type_code: area.area_type_code || null,
            floor_type_code: area.floor_type_code || null,
            building_type_code: form.building_type_code || null,
            difficulty_code: 'STANDARD',
            square_footage: area.square_footage,
            quantity: area.quantity,
            fixtures: area.fixtures,
          })
          .select('id')
          .single();
        if (areaErr || !areaRow) continue;

        const taskInserts = serviceTasks.map((t) => ({
          tenant_id: tenantId,
          bid_area_id: areaRow.id,
          task_id: t.task_id,
          task_code: t.task_code,
          frequency_code: t.frequency,
          use_ai: false,
          custom_minutes: null,
        }));
        if (taskInserts.length > 0) {
          await supabase.from('sales_bid_area_tasks').insert(taskInserts);
        }
      }

      // 4. Save schedule, labor, burden
      await supabase.from('sales_bid_schedule').insert({
        tenant_id: tenantId,
        bid_version_id: version.id,
        days_per_week: 5,
        visits_per_day: 1,
        hours_per_shift: 4,
        lead_required: false,
        supervisor_hours_week: 0,
      });

      await supabase.from('sales_bid_labor_rates').insert({
        tenant_id: tenantId,
        bid_version_id: version.id,
        cleaner_rate: 15,
        lead_rate: 18,
        supervisor_rate: 22,
      });

      await supabase.from('sales_bid_burden').insert({
        tenant_id: tenantId,
        bid_version_id: version.id,
        employer_tax_pct: 7.65,
        workers_comp_pct: 5,
        insurance_pct: 3,
        other_pct: 0,
      });

      // 5. Save calculation results
      await supabase.from('sales_bid_workload_results').insert({
        tenant_id: tenantId,
        bid_version_id: version.id,
        total_minutes_per_visit: workloadResult.total_minutes_per_visit,
        weekly_minutes: workloadResult.weekly_minutes,
        monthly_minutes: workloadResult.monthly_minutes,
        monthly_hours: workloadResult.monthly_hours,
        hours_per_visit: workloadResult.hours_per_visit,
        cleaners_needed: workloadResult.cleaners_needed,
        lead_needed: workloadResult.lead_needed,
      });

      await supabase.from('sales_bid_pricing_results').insert({
        tenant_id: tenantId,
        bid_version_id: version.id,
        pricing_method: pricingResult.pricing_method,
        total_monthly_cost: pricingResult.total_monthly_cost,
        burdened_labor_cost: pricingResult.burdened_labor_cost,
        supplies_cost: pricingResult.supplies_cost,
        equipment_cost: pricingResult.equipment_cost,
        overhead_cost: pricingResult.overhead_cost,
        recommended_price: pricingResult.recommended_price,
        effective_margin_pct: pricingResult.effective_margin_pct,
        explanation: pricingResult.explanation as unknown as Record<string, unknown>,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Save express bid error:', err);
    } finally {
      setSaving(false);
    }
  };

  const canNext = () => {
    switch (step) {
      case 0: return !!form.client_id && !!form.building_type_code && form.total_sqft > 0 && !!form.service_id;
      case 1: return !!workloadResult && !!pricingResult;
      default: return false;
    }
  };

  const goNext = () => {
    if (step === 0) {
      runExpressCalculation();
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const fmtPct = (n: number) => `${n.toFixed(1)}%`;

  return (
    <SlideOver open={open} onClose={onClose} title="Express Bid" subtitle={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
      {/* Step indicator */}
      <div className="flex gap-1 mb-6">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {/* Step 0: Client + Building Type */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Zap className="h-4 w-4 text-primary" />
            <p className="text-sm text-primary font-medium">Express Bid — Get an estimate in under 2 minutes</p>
          </div>
          <Select
            label="Client"
            value={form.client_id}
            onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
            options={clients}
            placeholder="Select a client..."
            required
          />
          <Select
            label="Service Template"
            value={form.service_id}
            onChange={(e) => setForm((f) => ({ ...f, service_id: e.target.value }))}
            options={services}
            placeholder="Select a service..."
            required
          />
          <Select
            label="Building Type"
            value={form.building_type_code}
            onChange={(e) => setForm((f) => ({ ...f, building_type_code: e.target.value }))}
            options={BUILDING_TYPE_OPTIONS}
            placeholder="Select building type..."
            required
          />
          <Input
            label="Total Square Footage"
            type="number"
            value={form.total_sqft || ''}
            onChange={(e) => setForm((f) => ({ ...f, total_sqft: Number(e.target.value) }))}
            placeholder="e.g. 25000"
            required
          />
          <Input
            label="Occupancy (optional — improves restroom estimates)"
            type="number"
            value={form.occupancy || ''}
            onChange={(e) => setForm((f) => ({ ...f, occupancy: Number(e.target.value) }))}
            placeholder="e.g. 150"
          />
          {form.service_id && serviceTasks.length > 0 && (
            <p className="text-xs text-muted-foreground">{serviceTasks.length} tasks from template will be applied to all areas.</p>
          )}
        </div>
      )}

      {/* Step 1: Generated Areas + Price Preview */}
      {step === 1 && (
        <div className="space-y-4">
          {calcError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{calcError}</p>
            </div>
          )}

          {/* Generated Areas */}
          {generatedAreas.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Generated Areas ({generatedAreas.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {generatedAreas.map((area, i) => (
                    <div key={i} className="py-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{area.name}</p>
                        <p className="text-xs text-muted-foreground">{area.floor_type_code} · {area.area_type_code}</p>
                      </div>
                      <span className="text-sm font-medium">{area.square_footage.toLocaleString()} sqft</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {workloadResult && workloadResult.warnings.length > 0 && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <div className="text-sm text-warning space-y-1">
                  {workloadResult.warnings.map((w, i) => <p key={i}>{w}</p>)}
                </div>
              </div>
            </div>
          )}

          {/* Price Summary */}
          {workloadResult && pricingResult && (
            <>
              <Card>
                <CardHeader><CardTitle>Workload Estimate</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Monthly Hours</p>
                      <p className="text-lg font-bold">{workloadResult.monthly_hours.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cleaners Needed</p>
                      <p className="text-lg font-bold">{workloadResult.cleaners_needed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Min/Visit</p>
                      <p className="text-lg font-bold">{workloadResult.total_minutes_per_visit.toFixed(0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Price Estimate</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Burdened Labor</span>
                    <span className="font-medium">{fmt(pricingResult.burdened_labor_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Supplies</span>
                    <span className="font-medium">{fmt(pricingResult.supplies_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border pt-2">
                    <span className="font-medium">Total Cost</span>
                    <span className="font-bold">{fmt(pricingResult.total_monthly_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border pt-2">
                    <span className="font-medium text-primary">Recommended Price</span>
                    <span className="font-bold text-xl text-primary">{fmt(pricingResult.recommended_price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Margin</span>
                    <Badge color={pricingResult.effective_margin_pct >= 20 ? 'green' : pricingResult.effective_margin_pct >= 10 ? 'yellow' : 'red'}>
                      {fmtPct(pricingResult.effective_margin_pct)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
            <Check className="h-4 w-4 text-success" />
            <p className="text-sm text-success font-medium">Ready to create your express bid</p>
          </div>

          {workloadResult && pricingResult && (
            <Card>
              <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <p className="font-medium">{clients.find((c) => c.value === form.client_id)?.label ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Building Type</p>
                    <p className="font-medium">{BUILDING_TYPE_OPTIONS.find((b) => b.value === form.building_type_code)?.label ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Sq Ft</p>
                    <p className="font-medium">{form.total_sqft.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Areas</p>
                    <p className="font-medium">{generatedAreas.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Hours</p>
                    <p className="font-medium">{workloadResult.monthly_hours.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cleaners</p>
                    <p className="font-medium">{workloadResult.cleaners_needed}</p>
                  </div>
                </div>
                <div className="border-t border-border pt-3 flex justify-between items-center">
                  <span className="font-medium text-primary">Monthly Price</span>
                  <span className="text-2xl font-bold text-primary">{fmt(pricingResult.recommended_price)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            This creates a draft bid using default schedule (5 days/week), labor rates, and 25% target margin.
            You can refine any details by editing the bid after creation.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-border mt-6">
        <Button variant="secondary" onClick={() => step === 0 ? onClose() : setStep((s) => s - 1)}>
          <ChevronLeft className="h-4 w-4" />
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={goNext} disabled={!canNext()}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={saveBid} loading={saving} disabled={!workloadResult || !pricingResult}>
            <Zap className="h-4 w-4" />
            Create Express Bid
          </Button>
        )}
      </div>
    </SlideOver>
  );
}
