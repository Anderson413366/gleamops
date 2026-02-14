'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Check, Zap, AlertTriangle, BarChart3 } from 'lucide-react';
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
import { calculateWorkload, calculatePricing, expressLoad } from '@gleamops/cleanflow';
import type {
  BidVersionSnapshot,
  WorkloadResult,
  PricingResult,
  BidTypeCode,
  BidSpecialization,
  CrewMember,
  DayPorterConfig,
  ConsumableItem,
} from '@gleamops/cleanflow';
import { SpecializationStep } from './steps/specialization-step';
import { CrewWageStep } from './steps/crew-wage-step';
import { DayPorterStep } from './steps/day-porter-step';
import { ConsumablesStep } from './steps/consumables-step';

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
  // Step: Basics
  client_id: string;
  service_id: string;
  bid_type_code: BidTypeCode;
  opportunity_id: string;
  building_type_code: string;
  total_sqft: number;
  // Step: Areas + Tasks
  areas: WizardArea[];
  // Step: Schedule
  days_per_week: number;
  visits_per_day: number;
  hours_per_shift: number;
  lead_required: boolean;
  supervisor_hours_week: number;
  // Step: Specialization (non-JANITORIAL)
  specialization: BidSpecialization | undefined;
  // Step: Costs
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
  // Costs: Crew + Day Porter + Consumables
  crew: CrewMember[];
  day_porter: DayPorterConfig;
  consumable_items: ConsumableItem[];
  // Step: Pricing strategy
  pricing_method: 'COST_PLUS' | 'TARGET_MARGIN' | 'MARKET_RATE' | 'HYBRID';
  target_margin_pct: number;
  cost_plus_pct: number;
  market_price_monthly: number;
}

const DAY_PORTER_DEFAULTS: DayPorterConfig = {
  enabled: false,
  days_per_week: 5,
  hours_per_day: 4,
  hourly_rate: 16,
};

const DEFAULTS: WizardState = {
  client_id: '',
  service_id: '',
  bid_type_code: 'JANITORIAL',
  opportunity_id: '',
  building_type_code: '',
  total_sqft: 0,
  areas: [],
  days_per_week: 5,
  visits_per_day: 1,
  hours_per_shift: 4,
  lead_required: false,
  supervisor_hours_week: 0,
  specialization: undefined,
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
  crew: [],
  day_porter: { ...DAY_PORTER_DEFAULTS },
  consumable_items: [],
  pricing_method: 'TARGET_MARGIN',
  target_margin_pct: 25,
  cost_plus_pct: 30,
  market_price_monthly: 0,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DIFFICULTY_OPTIONS = [
  { value: 'EASY', label: 'Easy (0.85x)' },
  { value: 'STANDARD', label: 'Standard (1.0x)' },
  { value: 'DIFFICULT', label: 'Difficult (1.25x)' },
];

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Daily' },
  { value: '2X_WEEK', label: '2x/Week' },
  { value: '3X_WEEK', label: '3x/Week' },
  { value: '5X_WEEK', label: '5x/Week' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'AS_NEEDED', label: 'As Needed' },
];

const BID_TYPE_OPTIONS = [
  { value: 'JANITORIAL', label: 'Janitorial' },
  { value: 'DISINFECTING', label: 'Disinfecting' },
  { value: 'CARPET', label: 'Carpet' },
  { value: 'WINDOW', label: 'Window' },
  { value: 'TILE', label: 'Tile' },
  { value: 'MOVE_IN_OUT', label: 'Move In/Out' },
  { value: 'POST_CONSTRUCTION', label: 'Post Construction' },
  { value: 'MAID', label: 'Maid' },
];

const FLOOR_TYPE_OPTIONS = [
  { value: 'CARPET', label: 'Carpet' },
  { value: 'VCT', label: 'VCT' },
  { value: 'CERAMIC', label: 'Ceramic' },
  { value: 'HARDWOOD', label: 'Hardwood' },
  { value: 'CONCRETE', label: 'Concrete' },
  { value: 'LVT', label: 'LVT' },
];

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
  editBidId?: string | null;
}

export function BidWizard({ open, onClose, onSuccess, editBidId }: BidWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardState>({ ...DEFAULTS });
  const [saving, setSaving] = useState(false);

  // Lookup data
  const [clients, setClients] = useState<{ value: string; label: string }[]>([]);
  const [services, setServices] = useState<{ value: string; label: string }[]>([]);
  const [opportunities, setOpportunities] = useState<{ value: string; label: string }[]>([]);
  const [serviceTasks, setServiceTasks] = useState<{ task_id: string; task_code: string; task_name: string; frequency: string }[]>([]);
  const [productionRates, setProductionRates] = useState<BidVersionSnapshot['production_rates']>([]);

  // Calculation results
  const [workloadResult, setWorkloadResult] = useState<WorkloadResult | null>(null);
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);

  const supabase = getSupabaseBrowserClient();

  // ---------------------------------------------------------------------------
  // Dynamic steps — insert Specialization for non-JANITORIAL bid types
  // ---------------------------------------------------------------------------
  const stepNames = useMemo(() => {
    const names = ['Basics', 'Areas', 'Tasks', 'Schedule'];
    if (form.bid_type_code !== 'JANITORIAL') {
      names.push('Specialization');
    }
    names.push('Costs', 'Pricing', 'Review');
    return names;
  }, [form.bid_type_code]);

  const currentStepName = stepNames[step];
  const isLastStep = step === stepNames.length - 1;
  const reviewStepIndex = stepNames.length - 1;

  // Clamp step if bid type changes and we're past Specialization
  useEffect(() => {
    if (step >= stepNames.length) {
      setStep(stepNames.length - 1);
    }
  }, [stepNames.length, step]);

  // ---------------------------------------------------------------------------
  // Build snapshot (shared between live estimate + final calculation)
  // ---------------------------------------------------------------------------
  const buildSnapshot = useCallback((previewId: string): BidVersionSnapshot => {
    return {
      bid_version_id: previewId,
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
      // P1 extensions
      specialization: form.specialization,
      crew: form.crew.length > 0 ? form.crew : undefined,
      day_porter: form.day_porter.enabled ? form.day_porter : undefined,
      consumable_items: form.consumable_items.length > 0 ? form.consumable_items : undefined,
    };
  }, [form, productionRates]);

  // ---------------------------------------------------------------------------
  // Load clients + services on open
  // ---------------------------------------------------------------------------
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
    supabase.from('sales_opportunities').select('id, name, opportunity_code, stage_code')
      .is('archived_at', null)
      .not('stage_code', 'in', '("WON","LOST")')
      .order('name')
      .then(({ data }) => {
        if (data) setOpportunities(data.map((o) => ({ value: o.id, label: `${o.name} (${o.opportunity_code})` })));
      });
  }, [open, supabase]);

  // Load existing bid data for editing
  useEffect(() => {
    if (!open || !editBidId) return;

    const loadBid = async () => {
      const { data: bid } = await supabase
        .from('sales_bids')
        .select('*')
        .eq('id', editBidId)
        .single();
      if (!bid) return;

      const { data: version } = await supabase
        .from('sales_bid_versions')
        .select('id, version_number, snapshot_data')
        .eq('bid_id', editBidId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();
      if (!version) return;

      const [areasRes, scheduleRes, laborRes, burdenRes] = await Promise.all([
        supabase.from('sales_bid_areas').select('*, tasks:sales_bid_area_tasks(*)').eq('bid_version_id', version.id).is('archived_at', null),
        supabase.from('sales_bid_schedule').select('*').eq('bid_version_id', version.id).single(),
        supabase.from('sales_bid_labor_rates').select('*').eq('bid_version_id', version.id).single(),
        supabase.from('sales_bid_burden').select('*').eq('bid_version_id', version.id).single(),
      ]);

      const wizardAreas: WizardArea[] = (areasRes.data ?? []).map((a: Record<string, unknown>) => ({
        tempId: crypto.randomUUID(),
        name: a.name as string,
        area_type_code: (a.area_type_code as string) || '',
        floor_type_code: (a.floor_type_code as string) || '',
        building_type_code: (a.building_type_code as string) || '',
        difficulty_code: (a.difficulty_code as WizardArea['difficulty_code']) || 'STANDARD',
        square_footage: a.square_footage as number,
        quantity: (a.quantity as number) || 1,
        fixtures: (a.fixtures as Record<string, number>) || {},
        tasks: ((a.tasks as Record<string, unknown>[]) || []).map((t) => ({
          task_id: t.task_id as string,
          task_code: (t.task_code as string) || '',
          task_name: '',
          frequency_code: (t.frequency_code as string) || 'DAILY',
          use_ai: (t.use_ai as boolean) || false,
          custom_minutes: (t.custom_minutes as number | null) ?? null,
        })),
      }));

      const sched = scheduleRes.data as Record<string, unknown> | null;
      const labor = laborRes.data as Record<string, unknown> | null;
      const burd = burdenRes.data as Record<string, unknown> | null;

      // Restore P1 extension data from snapshot_data if available
      const snap = (version.snapshot_data ?? {}) as Record<string, unknown>;

      setForm({
        client_id: bid.client_id || '',
        service_id: bid.service_id || '',
        bid_type_code: (bid.bid_type_code as BidTypeCode) || 'JANITORIAL',
        opportunity_id: bid.opportunity_id || '',
        building_type_code: '',
        total_sqft: bid.total_sqft || 0,
        areas: wizardAreas,
        days_per_week: (sched?.days_per_week as number) || 5,
        visits_per_day: (sched?.visits_per_day as number) || 1,
        hours_per_shift: (sched?.hours_per_shift as number) || 4,
        lead_required: (sched?.lead_required as boolean) || false,
        supervisor_hours_week: (sched?.supervisor_hours_week as number) || 0,
        specialization: snap.specialization as BidSpecialization | undefined,
        cleaner_rate: (labor?.cleaner_rate as number) || 15,
        lead_rate: (labor?.lead_rate as number) || 18,
        supervisor_rate: (labor?.supervisor_rate as number) || 22,
        employer_tax_pct: (burd?.employer_tax_pct as number) || 7.65,
        workers_comp_pct: (burd?.workers_comp_pct as number) || 5,
        insurance_pct: (burd?.insurance_pct as number) || 3,
        other_pct: (burd?.other_pct as number) || 0,
        monthly_overhead: 0,
        supply_allowance_sqft: 0.01,
        consumables_monthly: 0,
        crew: (snap.crew as CrewMember[]) || [],
        day_porter: (snap.day_porter as DayPorterConfig) || { ...DAY_PORTER_DEFAULTS },
        consumable_items: (snap.consumable_items as ConsumableItem[]) || [],
        pricing_method: 'TARGET_MARGIN',
        target_margin_pct: bid.target_margin_percent || 25,
        cost_plus_pct: 30,
        market_price_monthly: 0,
      });
    };

    loadBid();
  }, [open, editBidId, supabase]);

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

  // ---------------------------------------------------------------------------
  // Area helpers
  // ---------------------------------------------------------------------------
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

  // Express Load
  const handleExpressLoad = () => {
    if (!form.building_type_code || form.total_sqft <= 0) return;
    const generated = expressLoad({
      building_type_code: form.building_type_code,
      total_sqft: form.total_sqft,
    });
    const wizardAreas: WizardArea[] = generated.map((area) => ({
      tempId: crypto.randomUUID(),
      name: area.name,
      area_type_code: area.area_type_code,
      floor_type_code: area.floor_type_code,
      building_type_code: form.building_type_code,
      difficulty_code: 'STANDARD',
      square_footage: area.square_footage,
      quantity: area.quantity,
      fixtures: area.fixtures,
      tasks: serviceTasks.map((st) => ({
        task_id: st.task_id,
        task_code: st.task_code,
        task_name: st.task_name,
        frequency_code: st.frequency,
        use_ai: false,
        custom_minutes: null,
      })),
    }));
    setForm((prev) => ({ ...prev, areas: wizardAreas }));
  };

  // ---------------------------------------------------------------------------
  // Live estimate — debounced recalculation as wizard state changes
  // ---------------------------------------------------------------------------
  const [liveWorkload, setLiveWorkload] = useState<WorkloadResult | null>(null);
  const [livePricing, setLivePricing] = useState<PricingResult | null>(null);
  const liveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hasEnoughForEstimate = form.areas.length > 0
    && form.areas.some((a) => a.square_footage > 0 && a.tasks.length > 0)
    && form.days_per_week > 0
    && form.cleaner_rate > 0;

  useEffect(() => {
    if (!hasEnoughForEstimate || productionRates.length === 0) {
      setLiveWorkload(null);
      setLivePricing(null);
      return;
    }

    if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    liveTimerRef.current = setTimeout(() => {
      try {
        const snapshot = buildSnapshot('live-preview');
        const w = calculateWorkload(snapshot);
        const p = calculatePricing(snapshot, w);
        setLiveWorkload(w);
        setLivePricing(p);
      } catch {
        setLiveWorkload(null);
        setLivePricing(null);
      }
    }, 300);

    return () => {
      if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    };
  }, [buildSnapshot, hasEnoughForEstimate, productionRates.length]);

  // ---------------------------------------------------------------------------
  // Final calculation (run when stepping to Review)
  // ---------------------------------------------------------------------------
  const runCalculation = useCallback(() => {
    const totalSqft = form.areas.reduce((sum, a) => sum + a.square_footage * a.quantity, 0);
    try {
      const snapshot = buildSnapshot('preview');
      const workload = calculateWorkload(snapshot);
      const pricing = calculatePricing(snapshot, workload);
      setWorkloadResult(workload);
      setPricingResult(pricing);
      setForm((prev) => ({ ...prev, total_sqft: totalSqft }));
    } catch (err) {
      console.error('CleanFlow calculation error:', err);
    }
  }, [form.areas, buildSnapshot]);

  // ---------------------------------------------------------------------------
  // Save bid
  // ---------------------------------------------------------------------------
  const saveBid = async () => {
    if (!workloadResult || !pricingResult) return;
    setSaving(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      const tenantId = user?.app_metadata?.tenant_id;

      let bidId: string;
      let versionNumber = 1;

      if (editBidId) {
        bidId = editBidId;
        const { data: latestVer } = await supabase
          .from('sales_bid_versions')
          .select('version_number')
          .eq('bid_id', editBidId)
          .order('version_number', { ascending: false })
          .limit(1)
          .single();
        versionNumber = (latestVer?.version_number ?? 0) + 1;

        await supabase
          .from('sales_bids')
          .update({
            total_sqft: form.total_sqft,
            bid_monthly_price: pricingResult.recommended_price,
            target_margin_percent: pricingResult.effective_margin_pct,
            client_id: form.client_id,
            service_id: form.service_id || null,
            bid_type_code: form.bid_type_code || null,
            opportunity_id: form.opportunity_id || null,
          })
          .eq('id', editBidId);
      } else {
        const { data: codeData } = await supabase.rpc('next_code', { p_tenant_id: tenantId, p_prefix: 'BID' });
        const bidCode = codeData || `BID-${Date.now()}`;

        const { data: bid, error: bidErr } = await supabase
          .from('sales_bids')
          .insert({
            tenant_id: tenantId,
            bid_code: bidCode,
            client_id: form.client_id,
            service_id: form.service_id || null,
            bid_type_code: form.bid_type_code || null,
            opportunity_id: form.opportunity_id || null,
            status: 'DRAFT',
            total_sqft: form.total_sqft,
            bid_monthly_price: pricingResult.recommended_price,
            target_margin_percent: pricingResult.effective_margin_pct,
          })
          .select('id')
          .single();
        if (bidErr || !bid) throw bidErr;
        bidId = bid.id;
      }

      // Create bid version with P1 extension data in snapshot_data
      const { data: version, error: verErr } = await supabase
        .from('sales_bid_versions')
        .insert({
          tenant_id: tenantId,
          bid_id: bidId,
          version_number: versionNumber,
          is_sent_snapshot: false,
          snapshot_data: {
            specialization: form.specialization ?? null,
            crew: form.crew.length > 0 ? form.crew : null,
            day_porter: form.day_porter.enabled ? form.day_porter : null,
            consumable_items: form.consumable_items.length > 0 ? form.consumable_items : null,
          },
        })
        .select('id')
        .single();
      if (verErr || !version) throw verErr;

      // Areas + tasks
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

      // Schedule, labor, burden
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

      // Consumables expansion table
      if (form.consumable_items.length > 0) {
        const firstItem = form.consumable_items[0];
        await supabase.from('sales_bid_consumables').insert({
          tenant_id: tenantId,
          bid_version_id: version.id,
          include_consumables: true,
          toilet_paper_case_cost: form.consumable_items.find((i) => i.category === 'PAPER' && i.name.toLowerCase().includes('toilet'))?.unit_cost ?? 0,
          toilet_paper_usage_per_person_month: form.consumable_items.find((i) => i.category === 'PAPER' && i.name.toLowerCase().includes('toilet'))?.units_per_occupant_per_month ?? 0,
          paper_towel_case_cost: form.consumable_items.find((i) => i.category === 'PAPER' && i.name.toLowerCase().includes('towel'))?.unit_cost ?? 0,
          paper_towel_usage_per_person_month: form.consumable_items.find((i) => i.category === 'PAPER' && i.name.toLowerCase().includes('towel'))?.units_per_occupant_per_month ?? 0,
          soap_case_cost: form.consumable_items.find((i) => i.category === 'SOAP')?.unit_cost ?? 0,
          soap_usage_per_person_month: form.consumable_items.find((i) => i.category === 'SOAP')?.units_per_occupant_per_month ?? 0,
          liner_case_cost: form.consumable_items.find((i) => i.category === 'LINER')?.unit_cost ?? 0,
          liner_usage_per_person_month: form.consumable_items.find((i) => i.category === 'LINER')?.units_per_occupant_per_month ?? 0,
          markup_pct: 0,
        });
      }

      // Workload + pricing results
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

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const canNext = () => {
    switch (currentStepName) {
      case 'Basics': return !!form.client_id;
      case 'Areas': return form.areas.length > 0 && form.areas.every((a) => a.square_footage > 0);
      case 'Tasks': return form.areas.every((a) => a.tasks.length > 0);
      case 'Schedule': return form.days_per_week > 0;
      case 'Specialization': return true;
      case 'Costs': return form.cleaner_rate > 0;
      case 'Pricing': return true;
      default: return false;
    }
  };

  const goNext = () => {
    if (currentStepName === 'Pricing') {
      runCalculation();
    }
    setStep((s) => Math.min(s + 1, stepNames.length - 1));
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const fmtPct = (n: number) => `${n.toFixed(1)}%`;

  return (
    <SlideOver open={open} onClose={onClose} title={editBidId ? 'Edit Bid' : 'New Bid'} subtitle={`Step ${step + 1} of ${stepNames.length}: ${currentStepName}`} wide>
      {/* Step indicator */}
      <div className="flex gap-1 mb-6">
        {stepNames.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {/* Step: Basics */}
      {currentStepName === 'Basics' && (
        <div className="space-y-4">
          <Select label="Client" value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))} options={clients} placeholder="Select a client..." required />
          <Select
            label="Bid Type"
            value={form.bid_type_code}
            onChange={(e) => {
              const newType = e.target.value as BidTypeCode;
              setForm((f) => ({
                ...f,
                bid_type_code: newType,
                // Reset specialization when bid type changes
                specialization: newType === 'JANITORIAL' ? undefined : f.specialization?.type === newType ? f.specialization : undefined,
              }));
            }}
            options={BID_TYPE_OPTIONS}
          />
          <Select label="Service Template" value={form.service_id} onChange={(e) => setForm((f) => ({ ...f, service_id: e.target.value }))} options={[{ value: '', label: 'None (custom)' }, ...services]} />
          <Select label="Link to Opportunity (optional)" value={form.opportunity_id} onChange={(e) => setForm((f) => ({ ...f, opportunity_id: e.target.value }))} options={[{ value: '', label: 'None' }, ...opportunities]} />
          {form.service_id && serviceTasks.length > 0 && (
            <p className="text-xs text-muted-foreground">{serviceTasks.length} tasks will be pre-loaded from the template.</p>
          )}
        </div>
      )}

      {/* Step: Areas */}
      {currentStepName === 'Areas' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Express Load</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Auto-generate areas based on building type and total square footage.</p>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Building Type" value={form.building_type_code} onChange={(e) => setForm((f) => ({ ...f, building_type_code: e.target.value }))} options={[{ value: '', label: 'Select...' }, ...BUILDING_TYPE_OPTIONS]} />
                <Input label="Total Sq Ft" type="number" value={form.total_sqft || ''} onChange={(e) => setForm((f) => ({ ...f, total_sqft: Number(e.target.value) }))} placeholder="e.g. 25000" />
              </div>
              <Button variant="secondary" onClick={handleExpressLoad} disabled={!form.building_type_code || form.total_sqft <= 0}>
                <Zap className="h-4 w-4" /> Express Load
              </Button>
            </CardContent>
          </Card>

          {form.areas.map((area) => (
            <Card key={area.tempId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{area.name}</CardTitle>
                  <button type="button" onClick={() => removeArea(area.tempId)} className="text-muted-foreground hover:text-destructive">
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
                  <Select label="Floor Type" value={area.floor_type_code} onChange={(e) => updateArea(area.tempId, { floor_type_code: e.target.value })} options={[{ value: '', label: 'Select...' }, ...FLOOR_TYPE_OPTIONS]} />
                  <Select label="Building Type" value={area.building_type_code} onChange={(e) => updateArea(area.tempId, { building_type_code: e.target.value })} options={[{ value: '', label: 'Select...' }, ...BUILDING_TYPE_OPTIONS]} />
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="secondary" onClick={addArea}><Plus className="h-4 w-4" /> Add Area</Button>
        </div>
      )}

      {/* Step: Tasks per Area */}
      {currentStepName === 'Tasks' && (
        <div className="space-y-4">
          {form.areas.map((area) => (
            <Card key={area.tempId}>
              <CardHeader>
                <CardTitle>{area.name} ({area.square_footage.toLocaleString()} sq ft)</CardTitle>
              </CardHeader>
              <CardContent>
                {area.tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks. Select a service template in Step 1.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {area.tasks.map((task) => (
                      <div key={task.task_id} className="py-2 grid grid-cols-3 gap-3 items-center">
                        <div>
                          <p className="text-sm font-medium">{task.task_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{task.task_code}</p>
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

      {/* Step: Schedule */}
      {currentStepName === 'Schedule' && (
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

      {/* Step: Specialization (non-JANITORIAL only) */}
      {currentStepName === 'Specialization' && (
        <div className="space-y-4">
          <SpecializationStep
            bidType={form.bid_type_code}
            specialization={form.specialization}
            onChange={(spec) => setForm((f) => ({ ...f, specialization: spec }))}
          />
        </div>
      )}

      {/* Step: Costs */}
      {currentStepName === 'Costs' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Labor Rates ($/hr)</h3>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Cleaner" type="number" value={form.cleaner_rate} onChange={(e) => setForm((f) => ({ ...f, cleaner_rate: Number(e.target.value) }))} />
              <Input label="Lead" type="number" value={form.lead_rate} onChange={(e) => setForm((f) => ({ ...f, lead_rate: Number(e.target.value) }))} />
              <Input label="Supervisor" type="number" value={form.supervisor_rate} onChange={(e) => setForm((f) => ({ ...f, supervisor_rate: Number(e.target.value) }))} />
            </div>
          </div>

          {/* Crew Roster (weighted wage) */}
          <CrewWageStep
            crew={form.crew}
            onChange={(crew) => setForm((f) => ({ ...f, crew }))}
          />

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

          {/* Itemized Consumables */}
          <ConsumablesStep
            items={form.consumable_items}
            onChange={(items) => setForm((f) => ({ ...f, consumable_items: items }))}
          />

          {/* Day Porter */}
          <DayPorterStep
            config={form.day_porter}
            onChange={(config) => setForm((f) => ({ ...f, day_porter: config }))}
          />
        </div>
      )}

      {/* Step: Pricing Strategy */}
      {currentStepName === 'Pricing' && (
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

      {/* Live Estimate Panel — visible on all steps except Review */}
      {currentStepName !== 'Review' && (
        <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Live Estimate</h3>
          </div>
          {liveWorkload && livePricing ? (
            <div className="grid grid-cols-4 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground">Monthly Hours</p>
                <p className="text-sm font-bold">{liveWorkload.monthly_hours.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Cleaners</p>
                <p className="text-sm font-bold">{liveWorkload.cleaners_needed}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Est. Monthly Price</p>
                <p className="text-sm font-bold text-primary">{fmt(livePricing.recommended_price)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Margin</p>
                <p className="text-sm font-bold">
                  <Badge color={livePricing.effective_margin_pct >= 20 ? 'green' : livePricing.effective_margin_pct >= 10 ? 'yellow' : 'red'}>
                    {fmtPct(livePricing.effective_margin_pct)}
                  </Badge>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Add areas & tasks to see estimate</p>
          )}
          {liveWorkload && liveWorkload.warnings.length > 0 && (
            <div className="mt-2 flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 text-warning mt-0.5 shrink-0" />
              <p className="text-[10px] text-warning">{liveWorkload.warnings.join('; ')}</p>
            </div>
          )}
        </div>
      )}

      {/* Step: Review */}
      {currentStepName === 'Review' && (
        <div className="space-y-6">
          {workloadResult && pricingResult ? (
            <>
              {/* Workload Summary */}
              <Card>
                <CardHeader><CardTitle>Workload Summary</CardTitle></CardHeader>
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
                      <p className="text-xs text-muted-foreground">Lead Needed</p>
                      <p className="text-lg font-bold">{workloadResult.lead_needed ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Guardrail Warnings */}
              {workloadResult.warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                    <div className="text-sm text-warning space-y-1">
                      {workloadResult.warnings.map((w, i) => <p key={i}>{w}</p>)}
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Breakdown */}
              <Card>
                <CardHeader><CardTitle>Pricing Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Burdened Labor</span>
                    <span className="font-medium">{fmt(pricingResult.burdened_labor_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Supplies</span>
                    <span className="font-medium">{fmt(pricingResult.supplies_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Equipment</span>
                    <span className="font-medium">{fmt(pricingResult.equipment_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Overhead</span>
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
                    <span className="text-muted-foreground">Effective Margin</span>
                    <Badge color={pricingResult.effective_margin_pct >= 20 ? 'green' : pricingResult.effective_margin_pct >= 10 ? 'yellow' : 'red'}>
                      {fmtPct(pricingResult.effective_margin_pct)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Why this price */}
              <Card>
                <CardHeader><CardTitle>Why This Price?</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p>Method: <strong>{pricingResult.pricing_method}</strong></p>
                  <p>Bid Type: <strong>{form.bid_type_code}</strong></p>
                  <p>Labor: {workloadResult.monthly_hours.toFixed(1)} hrs/mo at {fmt(pricingResult.explanation.cleaner_rate)}/hr{pricingResult.explanation.weighted_avg_wage != null && ' (weighted avg)'}</p>
                  <p>Burden multiplier: {pricingResult.explanation.burden_multiplier.toFixed(3)}x</p>
                  <p>Effective hourly revenue: {fmt(pricingResult.explanation.effective_hourly_revenue)}</p>
                  {pricingResult.explanation.price_per_sqft != null && (
                    <p>Price per sqft: ${pricingResult.explanation.price_per_sqft.toFixed(4)}/sqft/mo</p>
                  )}
                  {pricingResult.explanation.day_porter && pricingResult.explanation.day_porter.monthly_cost > 0 && (
                    <p>Day porter: {fmt(pricingResult.explanation.day_porter.monthly_cost)}/mo ({pricingResult.explanation.day_porter.monthly_hours.toFixed(0)} hrs)</p>
                  )}
                  {pricingResult.explanation.consumables_detail && (
                    <p>Consumables (itemized): {fmt(pricingResult.explanation.consumables_detail.total_monthly)}/mo</p>
                  )}
                  {pricingResult.explanation.specialization_adjustments && (
                    <p>Specialization ({pricingResult.explanation.specialization_adjustments.bid_type}): +{pricingResult.explanation.specialization_adjustments.extra_minutes_per_visit.toFixed(0)} min/visit</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Calculating...</p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-border mt-6">
        <Button variant="secondary" onClick={() => step === 0 ? onClose() : setStep((s) => s - 1)}>
          <ChevronLeft className="h-4 w-4" />
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {!isLastStep ? (
          <Button onClick={goNext} disabled={!canNext()}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={saveBid} loading={saving} disabled={!workloadResult || !pricingResult}>
            <Check className="h-4 w-4" />
            {editBidId ? 'Save New Version' : 'Save as Draft'}
          </Button>
        )}
      </div>
    </SlideOver>
  );
}
