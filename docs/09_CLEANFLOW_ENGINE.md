# CleanFlow engine (Bid → Workload → Price)

CleanFlow is the internal logic engine that connects:
**Service DNA (templates)** → **Sales (bids)** → **Ops (jobs and tickets)**

Location in repo:
- `packages/cleanflow/src/…` (pure functions)
- `apps/web/src/lib/cleanflow/…` (UI glue only, no math)

## 1) Inputs (normalized, deterministic)

CleanFlow should not query the DB directly. It receives a fully-hydrated “Bid Version Snapshot”:

```ts
interface BidVersionSnapshot {
  bid_version_id: string;
  service_code: string | null;
  schedule: {
    days_per_week: number; // 1..7
    visits_per_day?: number; // default 1
    hours_per_shift: number; // default 4
    lead_required: boolean;
    supervisor_hours_week: number;
  };
  labor_rates: {
    cleaner_rate: number;
    lead_rate: number;
    supervisor_rate: number;
  };
  burden: {
    employer_tax_pct: number;
    workers_comp_pct: number;
    insurance_pct: number;
    other_pct: number;
  };
  overhead: {
    monthly_overhead_allocated: number;
  };
  supplies: {
    allowance_per_sqft_monthly: number;
    consumables_monthly: number;
  };
  equipment: Array<{ name: string; monthly_depreciation: number }>;
  areas: Array<{
    area_id: string;
    name: string;
    area_type_code: string | null;
    floor_type_code: string | null;
    building_type_code: string | null;
    difficulty_code: 'EASY' | 'STANDARD' | 'DIFFICULT';
    square_footage: number;
    quantity: number;
    fixtures?: Record<string, number>; // toilets, sinks, etc.
    tasks: Array<{
      task_code: string;
      frequency_code: string; // DAILY/WEEKLY/etc
      use_ai?: boolean;
      custom_minutes?: number | null; // override
    }>;
  }>;
  production_rates: Array<{
    task_code: string;
    floor_type_code: string | null;
    building_type_code: string | null;
    unit_code: 'SQFT_1000' | 'EACH';
    base_minutes: number;
    default_ml_adjustment: number; // -0.2..0.2
    is_active: boolean;
  }>;
  pricing_strategy: {
    method: 'COST_PLUS' | 'TARGET_MARGIN' | 'MARKET_RATE' | 'HYBRID';
    target_margin_pct?: number; // -50..100
    cost_plus_pct?: number; // 0..200
    market_price_monthly?: number;
  };
}
```

## 2) Production rate matching (most-specific wins)

Priority order:
1. task + floor + building
2. task + floor + building=NULL
3. task + floor=NULL + building
4. task + floor=NULL + building=NULL

If no match: throw `BID_003`.

## 3) Compute task minutes (per area)

Rules:
- If `custom_minutes` is present: use it (still apply quantity/difficulty if desired, but recommended: custom is final)
- Else: compute from production rate

Pseudo-code:

```ts
function computeTaskMinutes(task, area, rates): number {
  if (task.custom_minutes != null) return task.custom_minutes * area.quantity;

  const rate = findProductionRate(task.task_code, area.floor_type_code, area.building_type_code, rates);
  let minutes = 0;

  if (rate.unit_code === 'SQFT_1000') {
    minutes = (area.square_footage / 1000) * rate.base_minutes;
  } else if (rate.unit_code === 'EACH') {
    const count = area.fixtures?.[task.task_code] ?? 0;
    minutes = count * rate.base_minutes;
  }

  const difficulty = { EASY: 0.85, STANDARD: 1.0, DIFFICULT: 1.25 }[area.difficulty_code] ?? 1.0;
  minutes *= difficulty;

  if (task.use_ai) minutes *= (1 + rate.default_ml_adjustment);

  minutes *= area.quantity;

  return minutes;
}
```

## 4) Workload totals

Compute:
- total minutes per visit
- weekly minutes = per-visit minutes * days_per_week * visits_per_day
- monthly minutes = weekly minutes * 4.33
- monthly hours = monthly minutes / 60
- hours per visit = per-visit minutes / 60

Staffing heuristic:
- cleaners needed = ceil( hours_per_visit / hours_per_shift )
- lead_needed = lead_required OR cleaners_needed >= 3 (configurable)

Store results in `sales_bid_workload_results`.

## 5) True cost (pricing inputs)

### Burden multiplier
```
burden_multiplier = 1 + (tax + workers_comp + insurance + other)/100
```

### Monthly labor cost
```
monthly_cleaner_hours = monthly_hours
labor_cost = monthly_cleaner_hours * cleaner_rate
if lead_needed: add supervisor_hours_week * 4.33 * lead_rate/supervisor_rate
burdened_labor = labor_cost * burden_multiplier
```

### Monthly total cost
```
total_cost = burdened_labor
  + supplies_allowance (sqft * allowance_per_sqft_monthly)
  + consumables_monthly
  + sum(equipment.monthly_depreciation)
  + monthly_overhead_allocated
```

## 6) Price recommendation

Methods:
- COST_PLUS: `price = total_cost * (1 + cost_plus_pct/100)`
- TARGET_MARGIN: `price = total_cost / (1 - target_margin_pct/100)`
- MARKET_RATE: `price = market_price_monthly` (but still compute margin)
- HYBRID: clamp target-margin price within market bands (config)

Store results in `sales_bid_pricing_results`.

## 7) “Why this price?” explanation (required)
Return an explanation object for trust-building:

- labor hours
- labor rate assumptions
- burden multiplier and components
- supplies + equipment + overhead
- margin and effective hourly revenue
- price per sqft

## 8) Tests (non-negotiable)
Unit tests must cover:
- production rate matching priority
- difficulty multiplier effects
- burden multiplier math
- target margin edge cases (negative margin allowed)
- deterministic output given same input
