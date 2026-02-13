'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SlideOver,
  Button,
  Input,
  Select,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@gleamops/ui';
import { calculateWorkload, calculatePricing } from '@gleamops/cleanflow';
import type { BidVersionSnapshot, WorkloadResult, PricingResult } from '@gleamops/cleanflow';

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------
const STEPS = [
  'Basics',
  'Areas',
  'Tasks',
  'Schedule',
  'Costs',
  'Pricing',
  'Review',
];

// ---------------------------------------------------------------------------
// Form state types
// ---------------------------------------------------------------------------
interface WizardArea {
  tempId: string;
  name: string;
  area_type_code: string;
  floor_type_code: string;
  building_type_code: string;
  difficulty_code: 'EASY' | 'STANDARD' | 'DIFFICULT';
  square_footage: number;
  quantity: number;
  fixtures: Record<string, number>;
  tasks: WizardAreaTask[];
}

interface WizardAreaTask {
  task_id: string;
  task_code: string;
  task_name: string;
  frequency_code: string;
  use_ai: boolean;
  custom_minutes: number | null;
}

interface WizardState {
  // Step 1: Basics
  client_id: string;
  service_id: string;
  total_sqft: number;
  // Step 2-3: Areas + tasks
  areas: WizardArea[];
  // Step 4: Schedule
  days_per_week: number;
  visits_per_day: number;
  hours_per_shift: number;
  lead_required: boolean;
  supervisor_hours_week: number;
  // Step 5: Costs
  cleaner_rate: number;
  lead_rate: number;
  supervisor_rate: number;
  employer_tax_pct: number;
  workers_comp_pct: number;
  insurance_pct: number;
  other_pct: number;
  monthly_overhead: number;
  supply_allowance_sqft: number;
  consumables_monthly: number;
  // Step 6: Pricing strategy
  pricing_method: 'COST_PLUS' | 'TARGET_MARGIN' | 'MARKET_RATE' | 'HYBRID';
  target_margin_pct: number;
  cost_plus_pct: number;
  market_price_monthly: number;
}

const DEFAULTS: WizardState = {
  client_id: '',
  service_id: '',
  total_sqft: 0,
  areas: [],
  days_per_week: 5,
  visits_per_day: 1,
  hours_per_shift: 4,
  lead_required: false,
  supervisor_hours_week: 0,
  cleaner_rate: 15,
  lead_rate: 18,
  supervisor_rate: 22,
  employer_tax_pct: 7.65,
  workers_comp_pct: 5,
  insurance_pct: 3,
  other_pct: 0,
  monthly_overhead: 0,
  supply_allowance_sqft: 0.01,
  consumables_monthly: 0,
  pricing_method: 'TARGET_MARGIN',
  target_margin_pct: 25,
  cost_plus_pct: 30,
  market_price_monthly: 0,
};

const DIFFICULTY_OPTIONS = [
  { value: 'EASY', label: 'Easy (0.85x)' },
  { value: 'STANDARD', label: 'Standard (1.0x)' },
  { value: 'DIFFICULT', label: 'Difficult (1.25x)' },
];

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const PRICING_METHOD_OPTIONS = [
  { value: 'COST_PLUS', label: 'Cost Plus' },
  { value: 'TARGET_MARGIN', label: 'Target Margin' },
  { value: 'MARKET_RATE', label: 'Market Rate' },
  { value: 'HYBRID', label: 'Hybrid' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface BidWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BidWizard({ open, onClose, onSuccess }: BidWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardState>({ ...DEFAULTS });
  const [saving, setSaving] = useState(false);

  // Lookup data
  const [clients, setClients] = useState<{ value: string; label: string }[]>([]);
  const [services, setServices] = useState<{ value: string; label: string }[]>([]);
  const [serviceTasks, setServiceTasks] = useState<{ task_id: string; task_code: string; task_name: string; frequency: string }[]>([]);
  const [productionRates, setProductionRates] = useState<BidVersionSnapshot['production_rates']>([]);

  // Calculation results
  const [workloadResult, setWorkloadResult] = useState<WorkloadResult | null>(null);
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);

  const supabase = getSupabaseBrowserClient();

  // Load clients + services on open
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setForm({ ...DEFAULTS });
    setWorkloadResult(null);
    setPricingResult(null);

    supabase.from('clients').select('id, name, client_code').is('archived_at', null).order('name')
      .then(({ data }) => {
        if (data) setClients(data.map((c) => ({ value: c.id, label: `${c.name} (${c.client_code})` })));
      });
    supabase.from('services').select('id, name, service_code').is('archived_at', null).order('name')
      .then(({ data }) => {
        if (data) setServices(data.map((s) => ({ value: s.id, label: `${s.name} (${s.service_code})` })));
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
          const mapped = data.map((st: Record<string, unknown>) => {
            const task = st.task as { task_code: string; name: string } | null;
            return {
              task_id: st.task_id as string,
              task_code: task?.task_code ?? '',
              task_name: task?.name ?? '',
              frequency: st.frequency_default as string,
            };
          });
          setServiceTasks(mapped);
        }
      });
  }, [form.service_id, supabase]);

  // Load production rates
  useEffect(() => {
    if (!open) return;
    supabase
      .from('task_production_rates')
      .select('*, task:task_id(task_code)')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) {
          setProductionRates(
            data.map((r: Record<string, unknown>) => {
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
            })
          );
        }
      });
  }, [open, supabase]);

  // Add area helper
  const addArea = () => {
    const newArea: WizardArea = {
      tempId: crypto.randomUUID(),
      name: `Area ${form.areas.length + 1}`,
      area_type_code: '',
      floor_type_code: '',
      building_type_code: '',
      difficulty_code: 'STANDARD',
      square_footage: 0,
      quantity: 1,
      fixtures: {},
      tasks: serviceTasks.map((st) => ({
        task_id: st.task_id,
        task_code: st.task_code,
        task_name: st.task_name,
        frequency_code: st.frequency,
        use_ai: false,
        custom_minutes: null,
      })),
    };
    setForm((prev) => ({ ...prev, areas: [...prev.areas, newArea] }));
  };

  const removeArea = (tempId: string) => {
    setForm((prev) => ({ ...prev, areas: prev.areas.filter((a) => a.tempId !== tempId) }));
  };

  const updateArea = (tempId: string, updates: Partial<WizardArea>) => {
    setForm((prev) => ({
      ...prev,
      areas: prev.areas.map((a) => (a.tempId === tempId ? { ...a, ...updates } : a)),
    }));
  };

  const updateAreaTask = (areaTempId: string, taskId: string, updates: Partial<WizardAreaTask>) => {
    setForm((prev) => ({
      ...prev,
      areas: prev.areas.map((a) =>
        a.tempId === areaTempId
          ? { ...a, tasks: a.tasks.map((t) => (t.task_id === taskId ? { ...t, ...updates } : t)) }
          : a
      ),
    }));
  };

  // Calculate on step 6 → step 7
  const runCalculation = useCallback(() => {
    const totalSqft = form.areas.reduce((sum, a) => sum + a.square_footage * a.quantity, 0);

    const snapshot: BidVersionSnapshot = {
      bid_version_id: 'preview',
      service_code: form.service_id || null,
      areas: form.areas.map((a) => ({
        area_id: a.tempId,
        name: a.name,
        area_type_code: a.area_type_code || null,
        floor_type_code: a.floor_type_code || null,
        building_type_code: a.building_type_code || null,
        difficulty_code: a.difficulty_code,
        square_footage: a.square_footage,
        quantity: a.quantity,
        fixtures: a.fixtures,
        tasks: a.tasks.map((t) => ({
          task_code: t.task_code,
          frequency_code: t.frequency_code,
          use_ai: t.use_ai,
          custom_minutes: t.custom_minutes,
        })),
      })),
      schedule: {
        days_per_week: form.days_per_week,
        visits_per_day: form.visits_per_day,
        hours_per_shift: form.hours_per_shift,
        lead_required: form.lead_required,
        supervisor_hours_week: form.supervisor_hours_week,
      },
      labor_rates: {
        cleaner_rate: form.cleaner_rate,
        lead_rate: form.lead_rate,
        supervisor_rate: form.supervisor_rate,
      },
      burden: {
        employer_tax_pct: form.employer_tax_pct,
        workers_comp_pct: form.workers_comp_pct,
        insurance_pct: form.insurance_pct,
        other_pct: form.other_pct,
      },
      overhead: { monthly_overhead_allocated: form.monthly_overhead },
      supplies: {
        allowance_per_sqft_monthly: form.supply_allowance_sqft,
        consumables_monthly: form.consumables_monthly,
      },
      equipment: [],
      production_rates: productionRates,
      pricing_strategy: {
        method: form.pricing_method,
        target_margin_pct: form.target_margin_pct,
        cost_plus_pct: form.cost_plus_pct,
        market_price_monthly: form.market_price_monthly,
      },
    };

    try {
      const workload = calculateWorkload(snapshot);
      const pricing = calculatePricing(snapshot, workload);
      setWorkloadResult(workload);
      setPricingResult(pricing);
      setForm((prev) => ({ ...prev, total_sqft: totalSqft }));
    } catch (err) {
      console.error('CleanFlow calculation error:', err);
    }
  }, [form, productionRates]);

  // Save bid
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
      for (const area of form.areas) {
        const { data: areaRow, error: areaErr } = await supabase
          .from('sales_bid_areas')
          .insert({
            tenant_id: tenantId,
            bid_version_id: version.id,
            name: area.name,
            area_type_code: area.area_type_code || null,
            floor_type_code: area.floor_type_code || null,
            building_type_code: area.building_type_code || null,
            difficulty_code: area.difficulty_code,
            square_footage: area.square_footage,
            quantity: area.quantity,
            fixtures: area.fixtures,
          })
          .select('id')
          .single();
        if (areaErr || !areaRow) continue;

        const taskInserts = area.tasks.map((t) => ({
          tenant_id: tenantId,
          bid_area_id: areaRow.id,
          task_id: t.task_id,
          task_code: t.task_code,
          frequency_code: t.frequency_code,
          use_ai: t.use_ai,
          custom_minutes: t.custom_minutes,
        }));
        if (taskInserts.length > 0) {
          await supabase.from('sales_bid_area_tasks').insert(taskInserts);
        }
      }

      // 4. Save schedule, labor, burden
      await supabase.from('sales_bid_schedule').insert({
        tenant_id: tenantId,
        bid_version_id: version.id,
        days_per_week: form.days_per_week,
        visits_per_day: form.visits_per_day,
        hours_per_shift: form.hours_per_shift,
        lead_required: form.lead_required,
        supervisor_hours_week: form.supervisor_hours_week,
      });

      await supabase.from('sales_bid_labor_rates').insert({
        tenant_id: tenantId,
        bid_version_id: version.id,
        cleaner_rate: form.cleaner_rate,
        lead_rate: form.lead_rate,
        supervisor_rate: form.supervisor_rate,
      });

      await supabase.from('sales_bid_burden').insert({
        tenant_id: tenantId,
        bid_version_id: version.id,
        employer_tax_pct: form.employer_tax_pct,
        workers_comp_pct: form.workers_comp_pct,
        insurance_pct: form.insurance_pct,
        other_pct: form.other_pct,
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
      console.error('Save bid error:', err);
    } finally {
      setSaving(false);
    }
  };

  const canNext = () => {
    switch (step) {
      case 0: return !!form.client_id;
      case 1: return form.areas.length > 0 && form.areas.every((a) => a.square_footage > 0);
      case 2: return form.areas.every((a) => a.tasks.length > 0);
      case 3: return form.days_per_week > 0;
      case 4: return form.cleaner_rate > 0;
      case 5: return true;
      default: return false;
    }
  };

  const goNext = () => {
    if (step === 5) {
      runCalculation();
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const fmtPct = (n: number) => `${n.toFixed(1)}%`;

  return (
    <SlideOver open={open} onClose={onClose} title="New Bid" subtitle={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`} wide>
      {/* Step indicator */}
      <div className="flex gap-1 mb-6">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      {/* Step 0: Basics */}
      {step === 0 && (
        <div className="space-y-4">
          <Select label="Client" value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))} options={clients} placeholder="Select a client..." required />
          <Select label="Service Template" value={form.service_id} onChange={(e) => setForm((f) => ({ ...f, service_id: e.target.value }))} options={[{ value: '', label: 'None (custom)' }, ...services]} />
          {form.service_id && serviceTasks.length > 0 && (
            <p className="text-xs text-muted">{serviceTasks.length} tasks will be pre-loaded from the template.</p>
          )}
        </div>
      )}

      {/* Step 1: Areas */}
      {step === 1 && (
        <div className="space-y-4">
          {form.areas.map((area) => (
            <Card key={area.tempId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{area.name}</CardTitle>
                  <button onClick={() => removeArea(area.tempId)} className="text-muted hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input label="Area Name" value={area.name} onChange={(e) => updateArea(area.tempId, { name: e.target.value })} required />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Square Footage" type="number" value={area.square_footage || ''} onChange={(e) => updateArea(area.tempId, { square_footage: Number(e.target.value) })} required />
                  <Input label="Quantity" type="number" value={area.quantity} onChange={(e) => updateArea(area.tempId, { quantity: Number(e.target.value) || 1 })} />
                </div>
                <Select label="Difficulty" value={area.difficulty_code} onChange={(e) => updateArea(area.tempId, { difficulty_code: e.target.value as WizardArea['difficulty_code'] })} options={DIFFICULTY_OPTIONS} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Floor Type" value={area.floor_type_code} onChange={(e) => updateArea(area.tempId, { floor_type_code: e.target.value })} placeholder="e.g. TILE, CARPET" />
                  <Input label="Building Type" value={area.building_type_code} onChange={(e) => updateArea(area.tempId, { building_type_code: e.target.value })} placeholder="e.g. OFFICE, RETAIL" />
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="secondary" onClick={addArea}><Plus className="h-4 w-4" /> Add Area</Button>
        </div>
      )}

      {/* Step 2: Tasks per Area */}
      {step === 2 && (
        <div className="space-y-4">
          {form.areas.map((area) => (
            <Card key={area.tempId}>
              <CardHeader>
                <CardTitle>{area.name} ({area.square_footage.toLocaleString()} sq ft)</CardTitle>
              </CardHeader>
              <CardContent>
                {area.tasks.length === 0 ? (
                  <p className="text-sm text-muted">No tasks. Select a service template in Step 1.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {area.tasks.map((task) => (
                      <div key={task.task_id} className="py-2 grid grid-cols-3 gap-3 items-center">
                        <div>
                          <p className="text-sm font-medium">{task.task_name}</p>
                          <p className="text-xs text-muted font-mono">{task.task_code}</p>
                        </div>
                        <Select
                          value={task.frequency_code}
                          onChange={(e) => updateAreaTask(area.tempId, task.task_id, { frequency_code: e.target.value })}
                          options={FREQUENCY_OPTIONS}
                        />
                        <Input
                          placeholder="Custom min"
                          type="number"
                          value={task.custom_minutes ?? ''}
                          onChange={(e) => updateAreaTask(area.tempId, task.task_id, { custom_minutes: e.target.value ? Number(e.target.value) : null })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 3: Schedule */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Days per Week" type="number" value={form.days_per_week} onChange={(e) => setForm((f) => ({ ...f, days_per_week: Number(e.target.value) }))} />
            <Input label="Visits per Day" type="number" value={form.visits_per_day} onChange={(e) => setForm((f) => ({ ...f, visits_per_day: Number(e.target.value) }))} />
          </div>
          <Input label="Hours per Shift" type="number" value={form.hours_per_shift} onChange={(e) => setForm((f) => ({ ...f, hours_per_shift: Number(e.target.value) }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.lead_required} onChange={(e) => setForm((f) => ({ ...f, lead_required: e.target.checked }))} className="rounded border-border" />
            <span className="font-medium">Lead cleaner required</span>
          </label>
          {form.lead_required && (
            <Input label="Supervisor Hours / Week" type="number" value={form.supervisor_hours_week} onChange={(e) => setForm((f) => ({ ...f, supervisor_hours_week: Number(e.target.value) }))} />
          )}
        </div>
      )}

      {/* Step 4: Costs */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Labor Rates ($/hr)</h3>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Cleaner" type="number" value={form.cleaner_rate} onChange={(e) => setForm((f) => ({ ...f, cleaner_rate: Number(e.target.value) }))} />
              <Input label="Lead" type="number" value={form.lead_rate} onChange={(e) => setForm((f) => ({ ...f, lead_rate: Number(e.target.value) }))} />
              <Input label="Supervisor" type="number" value={form.supervisor_rate} onChange={(e) => setForm((f) => ({ ...f, supervisor_rate: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Burden (%)</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Employer Tax %" type="number" value={form.employer_tax_pct} onChange={(e) => setForm((f) => ({ ...f, employer_tax_pct: Number(e.target.value) }))} />
              <Input label="Workers Comp %" type="number" value={form.workers_comp_pct} onChange={(e) => setForm((f) => ({ ...f, workers_comp_pct: Number(e.target.value) }))} />
              <Input label="Insurance %" type="number" value={form.insurance_pct} onChange={(e) => setForm((f) => ({ ...f, insurance_pct: Number(e.target.value) }))} />
              <Input label="Other %" type="number" value={form.other_pct} onChange={(e) => setForm((f) => ({ ...f, other_pct: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Overhead & Supplies</h3>
            <Input label="Monthly Overhead ($)" type="number" value={form.monthly_overhead} onChange={(e) => setForm((f) => ({ ...f, monthly_overhead: Number(e.target.value) }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Supply Allowance ($/sqft/mo)" type="number" step="0.001" value={form.supply_allowance_sqft} onChange={(e) => setForm((f) => ({ ...f, supply_allowance_sqft: Number(e.target.value) }))} />
              <Input label="Consumables ($/mo)" type="number" value={form.consumables_monthly} onChange={(e) => setForm((f) => ({ ...f, consumables_monthly: Number(e.target.value) }))} />
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Pricing Strategy */}
      {step === 5 && (
        <div className="space-y-4">
          <Select label="Pricing Method" value={form.pricing_method} onChange={(e) => setForm((f) => ({ ...f, pricing_method: e.target.value as WizardState['pricing_method'] }))} options={PRICING_METHOD_OPTIONS} />
          {(form.pricing_method === 'TARGET_MARGIN' || form.pricing_method === 'HYBRID') && (
            <Input label="Target Margin %" type="number" value={form.target_margin_pct} onChange={(e) => setForm((f) => ({ ...f, target_margin_pct: Number(e.target.value) }))} />
          )}
          {(form.pricing_method === 'COST_PLUS') && (
            <Input label="Cost Plus Markup %" type="number" value={form.cost_plus_pct} onChange={(e) => setForm((f) => ({ ...f, cost_plus_pct: Number(e.target.value) }))} />
          )}
          {(form.pricing_method === 'MARKET_RATE' || form.pricing_method === 'HYBRID') && (
            <Input label="Market Price ($/month)" type="number" value={form.market_price_monthly} onChange={(e) => setForm((f) => ({ ...f, market_price_monthly: Number(e.target.value) }))} />
          )}
        </div>
      )}

      {/* Step 6: Review */}
      {step === 6 && (
        <div className="space-y-6">
          {workloadResult && pricingResult ? (
            <>
              {/* Workload Summary */}
              <Card>
                <CardHeader><CardTitle>Workload Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted">Monthly Hours</p>
                      <p className="text-lg font-bold">{workloadResult.monthly_hours.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Cleaners Needed</p>
                      <p className="text-lg font-bold">{workloadResult.cleaners_needed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Lead Needed</p>
                      <p className="text-lg font-bold">{workloadResult.lead_needed ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Breakdown */}
              <Card>
                <CardHeader><CardTitle>Pricing Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Burdened Labor</span>
                    <span className="font-medium">{fmt(pricingResult.burdened_labor_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Supplies</span>
                    <span className="font-medium">{fmt(pricingResult.supplies_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Equipment</span>
                    <span className="font-medium">{fmt(pricingResult.equipment_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Overhead</span>
                    <span className="font-medium">{fmt(pricingResult.overhead_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border pt-2">
                    <span className="font-medium">Total Monthly Cost</span>
                    <span className="font-bold">{fmt(pricingResult.total_monthly_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border pt-2">
                    <span className="font-medium text-primary">Recommended Price</span>
                    <span className="font-bold text-lg text-primary">{fmt(pricingResult.recommended_price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Effective Margin</span>
                    <Badge color={pricingResult.effective_margin_pct >= 20 ? 'green' : pricingResult.effective_margin_pct >= 10 ? 'yellow' : 'red'}>
                      {fmtPct(pricingResult.effective_margin_pct)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Why this price */}
              <Card>
                <CardHeader><CardTitle>Why This Price?</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted space-y-1">
                  <p>Method: <strong>{pricingResult.pricing_method}</strong></p>
                  <p>Labor: {workloadResult.monthly_hours.toFixed(1)} hrs/mo at {fmt(form.cleaner_rate)}/hr</p>
                  <p>Burden multiplier: {pricingResult.explanation.burden_multiplier.toFixed(3)}x</p>
                  <p>Effective hourly revenue: {fmt(pricingResult.explanation.effective_hourly_revenue)}</p>
                  {pricingResult.explanation.price_per_sqft != null && (
                    <p>Price per sqft: ${pricingResult.explanation.price_per_sqft.toFixed(4)}/sqft/mo</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-sm text-muted">Calculating...</p>
          )}
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
            <Check className="h-4 w-4" />
            Save as Draft
          </Button>
        )}
      </div>
    </SlideOver>
  );
}
