'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calculator } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@gleamops/ui';
import {
  calculatePricing,
  calculateWorkload,
  type BidTypeCode,
  type BidSpecialization,
  type BidVersionSnapshot,
} from '@gleamops/cleanflow';
import { LiveEstimatePanel } from './live-estimate-panel';
import { AreaTemplatePicker, buildAreasFromTemplates } from './area-template-picker';
import { FinancialBreakdown } from './financial-breakdown';
import { PricingStrategySelector, type PricingMethod } from './pricing-strategy-selector';
import { getServiceTypeConfig, ServiceTypeSelector } from './service-type-selector';

interface NumericChangeEvent {
  target: {
    value: string;
  };
}

interface SelectChangeEvent {
  target: {
    value: string;
  };
}

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

function parseNumber(value: string, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

function buildSpecialization(serviceType: BidTypeCode): BidSpecialization | undefined {
  switch (serviceType) {
    case 'JANITORIAL':
      return undefined;
    case 'DISINFECTING':
      return {
        type: 'DISINFECTING',
        inputs: {
          method: 'WIPE',
          density: 'STANDARD',
          active_cases_nearby: false,
          waiver_signed: false,
          ppe_included: true,
        },
      };
    case 'CARPET':
      return {
        type: 'CARPET',
        inputs: {
          method: 'HOT_WATER_EXTRACTION',
          move_furniture: false,
          furniture_piece_count: 0,
          apply_deodorizer: false,
          stain_treatment_spots: 0,
          carpet_age_years: 5,
        },
      };
    case 'WINDOW':
      return {
        type: 'WINDOW',
        inputs: {
          pane_count_interior: 20,
          pane_count_exterior: 20,
          includes_screens: false,
          includes_tracks: false,
          includes_sills: true,
          high_access_panes: 0,
          stories: 1,
        },
      };
    case 'TILE':
      return {
        type: 'TILE',
        inputs: {
          service_type: 'SCRUB_RECOAT',
          coats_of_wax: 1,
          current_wax_condition: 'FAIR',
          needs_stripping: false,
          grout_cleaning: false,
        },
      };
    case 'MOVE_IN_OUT':
      return {
        type: 'MOVE_IN_OUT',
        inputs: {
          unit_type: 'CONDO',
          bedrooms: 0,
          bathrooms: 2,
          garage_included: false,
          appliance_cleaning: false,
          window_cleaning: false,
          carpet_cleaning: false,
        },
      };
    case 'POST_CONSTRUCTION':
      return {
        type: 'POST_CONSTRUCTION',
        inputs: {
          phase: 'FINAL',
          debris_level: 'MODERATE',
          includes_window_cleaning: false,
          includes_pressure_wash: false,
          includes_floor_polish: false,
          floors_count: 1,
        },
      };
    case 'MAID':
      return {
        type: 'MAID',
        inputs: {
          bedrooms: 0,
          bathrooms: 2,
          has_pets: false,
          pet_count: 0,
          appliance_cleaning: false,
          laundry_included: false,
          fridge_inside: false,
          oven_inside: false,
        },
      };
    default:
      return undefined;
  }
}

export default function CalculatorPage() {
  const router = useRouter();
  const [serviceType, setServiceType] = useState<BidTypeCode>('JANITORIAL');
  const [buildingTypeCode, setBuildingTypeCode] = useState('OFFICE');
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>('TARGET_MARGIN');
  const [totalSqft, setTotalSqft] = useState(12000);
  const [selectedTemplateCodes, setSelectedTemplateCodes] = useState<string[]>([
    'OFFICE_OPEN',
    'RESTROOM',
    'LOBBY_RECEPTION',
  ]);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [hoursPerShift, setHoursPerShift] = useState(4);
  const [targetMarginPct, setTargetMarginPct] = useState(24);
  const [costPlusPct, setCostPlusPct] = useState(28);
  const [marketPriceMonthly, setMarketPriceMonthly] = useState(0);
  const [monthlyOverhead, setMonthlyOverhead] = useState(900);
  const [supplyAllowanceSqft, setSupplyAllowanceSqft] = useState(0.01);
  const serviceConfig = useMemo(() => getServiceTypeConfig(serviceType), [serviceType]);

  const calculatedAreas = useMemo(
    () => buildAreasFromTemplates(selectedTemplateCodes, totalSqft),
    [selectedTemplateCodes, totalSqft],
  );

  const snapshot = useMemo<BidVersionSnapshot>(() => ({
    bid_version_id: 'standalone-preview',
    service_code: serviceType,
    schedule: {
      days_per_week: Math.max(1, Math.min(7, daysPerWeek)),
      visits_per_day: 1,
      hours_per_shift: Math.max(1, hoursPerShift),
      lead_required: false,
      supervisor_hours_week: 2,
    },
    labor_rates: {
      cleaner_rate: 17,
      lead_rate: 20,
      supervisor_rate: 24,
    },
    burden: {
      employer_tax_pct: 7.65,
      workers_comp_pct: 5,
      insurance_pct: 3,
      other_pct: 0,
    },
    overhead: {
      monthly_overhead_allocated: Math.max(0, monthlyOverhead),
    },
    supplies: {
      allowance_per_sqft_monthly: Math.max(0, supplyAllowanceSqft),
      consumables_monthly: 120,
    },
    equipment: [],
    areas: calculatedAreas.map((area) => ({
      area_id: area.id,
      name: area.name,
      area_type_code: area.areaTypeCode,
      floor_type_code: area.floorTypeCode,
      building_type_code: buildingTypeCode,
      difficulty_code: 'STANDARD' as const,
      square_footage: area.sqft,
      quantity: area.quantity,
      fixtures: {},
      tasks: [
        {
          task_code: `TASK_${area.areaTypeCode}`,
          frequency_code: 'DAILY',
          custom_minutes: Math.max(
            15,
            (area.sqft / 1000) * serviceConfig.minutesPer1000 * (area.minutesPer1000 / 24),
          ),
        },
      ],
    })),
    production_rates: [],
    pricing_strategy: {
      method: pricingMethod,
      target_margin_pct: targetMarginPct,
      cost_plus_pct: costPlusPct,
      market_price_monthly: marketPriceMonthly || undefined,
    },
    specialization: buildSpecialization(serviceType),
    contract_terms: {
      length_months: 12,
      annual_escalation_pct: 3,
      start_date: new Date().toISOString().slice(0, 10),
      include_deep_clean: false,
      deep_clean_price: 0,
    },
  }), [
    buildingTypeCode,
    costPlusPct,
    daysPerWeek,
    hoursPerShift,
    marketPriceMonthly,
    monthlyOverhead,
    calculatedAreas,
    pricingMethod,
    serviceConfig.minutesPer1000,
    serviceType,
    supplyAllowanceSqft,
    targetMarginPct,
  ]);

  const { workload, pricing, error } = useMemo(() => {
    try {
      const nextWorkload = calculateWorkload(snapshot);
      const nextPricing = calculatePricing(snapshot, nextWorkload);
      return { workload: nextWorkload, pricing: nextPricing, error: null };
    } catch (err) {
      return {
        workload: null,
        pricing: null,
        error: err instanceof Error ? err.message : 'Unable to calculate estimate',
      };
    }
  }, [snapshot]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push('/pipeline')}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pipeline
          </button>
          <h1 className="text-2xl font-bold text-foreground">Standalone Sales Calculator</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build a quick estimate with service mix, scope assumptions, and pricing strategy.
          </p>
        </div>
        <Button variant="secondary">
          <Calculator className="h-4 w-4" />
          Save Draft
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ServiceTypeSelector
            value={serviceType}
            onChange={(nextType, nextConfig) => {
              setServiceType(nextType);
              setDaysPerWeek(nextConfig.recommendedDaysPerWeek);
              setTargetMarginPct(nextConfig.recommendedTargetMarginPct);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <PricingStrategySelector
            method={pricingMethod}
            targetMarginPct={targetMarginPct}
            costPlusPct={costPlusPct}
            marketPriceMonthly={marketPriceMonthly}
            onMethodChange={setPricingMethod}
            onTargetMarginChange={setTargetMarginPct}
            onCostPlusChange={setCostPlusPct}
            onMarketPriceMonthlyChange={setMarketPriceMonthly}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <AreaTemplatePicker
            selectedCodes={selectedTemplateCodes}
            totalSqft={totalSqft}
            onChange={setSelectedTemplateCodes}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calculator Inputs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Building Type</p>
            <Select
              value={buildingTypeCode}
              onChange={(event: SelectChangeEvent) => setBuildingTypeCode(event.target.value)}
              options={BUILDING_TYPE_OPTIONS}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Total Sqft</p>
            <Input
              type="number"
              value={String(totalSqft)}
              onChange={(event: NumericChangeEvent) => setTotalSqft(parseNumber(event.target.value, 12000))}
              min={100}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Days per Week</p>
            <Input
              type="number"
              value={String(daysPerWeek)}
              onChange={(event: NumericChangeEvent) => setDaysPerWeek(parseNumber(event.target.value, 5))}
              min={1}
              max={7}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Hours per Shift</p>
            <Input
              type="number"
              value={String(hoursPerShift)}
              onChange={(event: NumericChangeEvent) => setHoursPerShift(parseNumber(event.target.value, 4))}
              min={1}
              max={12}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Monthly Overhead</p>
            <Input
              type="number"
              value={String(monthlyOverhead)}
              onChange={(event: NumericChangeEvent) => setMonthlyOverhead(parseNumber(event.target.value, 900))}
              min={0}
              step={50}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Supply Allowance / sqft</p>
            <Input
              type="number"
              value={String(supplyAllowanceSqft)}
              onChange={(event: NumericChangeEvent) => setSupplyAllowanceSqft(parseNumber(event.target.value, 0.01))}
              min={0}
              step={0.001}
            />
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-red-300/70">
          <CardContent className="py-4 text-sm text-red-700">
            Calculator error: {error}
          </CardContent>
        </Card>
      ) : (
        <LiveEstimatePanel
          workload={workload}
          pricing={pricing}
          buildingTypeCode={buildingTypeCode}
          totalSqft={Math.max(100, totalSqft)}
          contractTerms={snapshot.contract_terms}
        />
      )}

      <FinancialBreakdown pricing={pricing} />

    </div>
  );
}
