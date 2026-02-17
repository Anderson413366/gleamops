'use client';

import { Building2, Layers } from 'lucide-react';
import { Input, FormSection, Tooltip } from '@gleamops/ui';
import type {
  CustomerTier,
  SupplyPricingStructure,
  SupplyPricingMethod,
  SupplyManagementFee,
  VolumeDiscountBracket,
} from '@gleamops/cleanflow';
import {
  ALLOWANCE_PER_PERSON_YEAR_DEFAULT,
  ALLOWANCE_PER_SQFT_YEAR_DEFAULT,
} from '@gleamops/cleanflow';
import type { SupplyCalculatorState } from '../lib/supply-calculator-types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface PricingConfigStepProps {
  customerTier: CustomerTier;
  pricingStructure: SupplyPricingStructure;
  pricingMethod: SupplyPricingMethod;
  managementFee: SupplyManagementFee;
  volumeDiscounts: SupplyCalculatorState['volumeDiscounts'];
  allowance: SupplyCalculatorState['allowance'];
  allInclusive: SupplyCalculatorState['allInclusive'];
  onSetTier: (tier: CustomerTier) => void;
  onSetStructure: (structure: SupplyPricingStructure) => void;
  onSetMethod: (method: SupplyPricingMethod) => void;
  onSetManagementFee: (fee: SupplyManagementFee) => void;
  onSetVolumeDiscounts: (vd: SupplyCalculatorState['volumeDiscounts']) => void;
  onSetAllowance: (a: SupplyCalculatorState['allowance']) => void;
  onSetAllInclusive: (a: SupplyCalculatorState['allInclusive']) => void;
}

// ---------------------------------------------------------------------------
// Tier / Structure card helpers
// ---------------------------------------------------------------------------
interface RadioCardProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}

function RadioCard({ selected, onClick, title, description }: RadioCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start rounded-lg p-4 text-left transition-all duration-200 ${
        selected
          ? 'ring-2 ring-primary bg-primary/5'
          : 'ring-1 ring-border bg-card hover:bg-muted'
      }`}
    >
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <span className="mt-1 text-xs text-muted-foreground">{description}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PricingConfigStep({
  customerTier,
  pricingStructure,
  pricingMethod,
  managementFee,
  volumeDiscounts,
  allowance,
  allInclusive,
  onSetTier,
  onSetStructure,
  onSetMethod,
  onSetManagementFee,
  onSetVolumeDiscounts,
  onSetAllowance,
  onSetAllInclusive,
}: PricingConfigStepProps) {
  return (
    <div className="space-y-6">
      {/* Section 1: Customer & Pricing */}
      <FormSection
        title="Customer & Pricing"
        icon={<Building2 className="h-4 w-4" />}
        description="Choose tier, structure, and pricing method"
      >
        <div className="space-y-5">
          {/* Customer Tier */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Customer Tier
            </label>
            <div className="grid grid-cols-3 gap-3">
              <RadioCard
                selected={customerTier === 'STRATEGIC'}
                onClick={() => onSetTier('STRATEGIC')}
                title="Strategic"
                description="Top 10% — max discounts"
              />
              <RadioCard
                selected={customerTier === 'CORE'}
                onClick={() => onSetTier('CORE')}
                title="Core"
                description="Standard — default"
              />
              <RadioCard
                selected={customerTier === 'BASE'}
                onClick={() => onSetTier('BASE')}
                title="Base"
                description="Protect margins"
              />
            </div>
          </div>

          {/* Pricing Structure */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pricing Structure
            </label>
            <div className="grid grid-cols-3 gap-3">
              <RadioCard
                selected={pricingStructure === 'LINE_ITEM'}
                onClick={() => onSetStructure('LINE_ITEM')}
                title="Line-Item"
                description="SKU-by-SKU pricing"
              />
              <RadioCard
                selected={pricingStructure === 'MONTHLY_ALLOWANCE'}
                onClick={() => onSetStructure('MONTHLY_ALLOWANCE')}
                title="Monthly Allowance"
                description="Fixed monthly fee"
              />
              <RadioCard
                selected={pricingStructure === 'ALL_INCLUSIVE'}
                onClick={() => onSetStructure('ALL_INCLUSIVE')}
                title="All-Inclusive"
                description="Embedded in rate"
              />
            </div>
          </div>

          {/* Pricing Method */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pricing Method
            </label>
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => onSetMethod('MARGIN')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-l-lg ${
                    pricingMethod === 'MARGIN'
                      ? 'bg-primary text-white'
                      : 'bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  Margin
                </button>
                <button
                  type="button"
                  onClick={() => onSetMethod('MARKUP')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-r-lg ${
                    pricingMethod === 'MARKUP'
                      ? 'bg-primary text-white'
                      : 'bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  Markup
                </button>
              </div>
              <Tooltip content="20% margin = 25% markup, 25% = 33.3%, 30% = 42.9%">
                <span className="text-xs text-muted-foreground cursor-help underline decoration-dotted">
                  Cheat sheet
                </span>
              </Tooltip>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Section 2: Structure Details (conditional) */}
      {pricingStructure === 'MONTHLY_ALLOWANCE' && allowance && (
        <FormSection
          title="Allowance Details"
          icon={<Building2 className="h-4 w-4" />}
          description="Set monthly supply allowance calculation"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() =>
                    onSetAllowance({
                      ...allowance,
                      method: 'PER_PERSON',
                      rate: ALLOWANCE_PER_PERSON_YEAR_DEFAULT,
                    })
                  }
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-l-lg ${
                    allowance.method === 'PER_PERSON'
                      ? 'bg-primary text-white'
                      : 'bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  Per Person
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSetAllowance({
                      ...allowance,
                      method: 'PER_SQFT',
                      rate: ALLOWANCE_PER_SQFT_YEAR_DEFAULT,
                    })
                  }
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-r-lg ${
                    allowance.method === 'PER_SQFT'
                      ? 'bg-primary text-white'
                      : 'bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  Per Sq Ft
                </button>
              </div>
            </div>
            {allowance.method === 'PER_PERSON' ? (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Number of Occupants"
                  type="number"
                  value={allowance.occupant_count || ''}
                  onChange={(e) =>
                    onSetAllowance({ ...allowance, occupant_count: Number(e.target.value) })
                  }
                  placeholder="e.g. 150"
                />
                <Input
                  label="Rate ($/person/year)"
                  type="number"
                  step="0.01"
                  value={allowance.rate}
                  onChange={(e) => onSetAllowance({ ...allowance, rate: Number(e.target.value) })}
                  placeholder="$27-$35"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Total Square Feet"
                  type="number"
                  value={allowance.total_sqft || ''}
                  onChange={(e) =>
                    onSetAllowance({ ...allowance, total_sqft: Number(e.target.value) })
                  }
                  placeholder="e.g. 50000"
                />
                <Input
                  label="Rate ($/sqft/year)"
                  type="number"
                  step="0.001"
                  value={allowance.rate}
                  onChange={(e) => onSetAllowance({ ...allowance, rate: Number(e.target.value) })}
                  placeholder="$0.06-$0.08"
                />
              </div>
            )}
            {allowance.occupant_count > 0 || allowance.total_sqft > 0 ? (
              <p className="text-sm text-muted-foreground">
                Estimated monthly allowance:{' '}
                <strong>
                  $
                  {(
                    ((allowance.method === 'PER_PERSON'
                      ? allowance.occupant_count
                      : allowance.total_sqft) *
                      allowance.rate) /
                    12
                  ).toFixed(2)}
                  /mo
                </strong>
              </p>
            ) : null}
          </div>
        </FormSection>
      )}

      {pricingStructure === 'ALL_INCLUSIVE' && allInclusive && (
        <FormSection
          title="All-Inclusive Details"
          icon={<Building2 className="h-4 w-4" />}
          description="Set supply budget from cleaning rate"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Monthly Cleaning Rate"
                type="number"
                step="0.01"
                value={allInclusive.monthly_cleaning_rate || ''}
                onChange={(e) =>
                  onSetAllInclusive({
                    ...allInclusive,
                    monthly_cleaning_rate: Number(e.target.value),
                  })
                }
                placeholder="$4,500"
              />
              <Input
                label="Supply % of Rate"
                type="number"
                step="0.1"
                value={allInclusive.supply_pct}
                onChange={(e) =>
                  onSetAllInclusive({
                    ...allInclusive,
                    supply_pct: Number(e.target.value),
                  })
                }
                placeholder="4-8%"
              />
            </div>
            {allInclusive.monthly_cleaning_rate > 0 && (
              <p className="text-sm text-muted-foreground">
                Supply budget:{' '}
                <strong>
                  ${((allInclusive.monthly_cleaning_rate * allInclusive.supply_pct) / 100).toFixed(2)}
                  /mo
                </strong>
              </p>
            )}
          </div>
        </FormSection>
      )}

      {/* Section 3: Add-Ons */}
      <FormSection
        title="Add-Ons"
        icon={<Layers className="h-4 w-4" />}
        description="Management fee and volume discounts"
      >
        <div className="space-y-5">
          {/* Management Fee */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Management Fee</span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={managementFee.enabled}
                  onChange={(e) =>
                    onSetManagementFee({ ...managementFee, enabled: e.target.checked })
                  }
                  className="peer sr-only"
                />
                <div className="peer h-5 w-9 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full" />
              </label>
            </div>
            {managementFee.enabled && (
              <div className="space-y-3 pl-1">
                <div className="flex gap-2">
                  {(['BAKED_IN', 'SEPARATE', 'FLAT'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onSetManagementFee({ ...managementFee, mode })}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                        managementFee.mode === mode
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {mode === 'BAKED_IN'
                        ? 'Baked into prices'
                        : mode === 'SEPARATE'
                          ? 'Separate line'
                          : 'Flat monthly'}
                    </button>
                  ))}
                </div>
                {managementFee.mode !== 'FLAT' ? (
                  <Input
                    label="Fee %"
                    type="number"
                    step="0.1"
                    value={managementFee.fee_pct}
                    onChange={(e) =>
                      onSetManagementFee({
                        ...managementFee,
                        fee_pct: Number(e.target.value),
                      })
                    }
                    placeholder="3-8%"
                  />
                ) : (
                  <Input
                    label="Flat Amount ($/mo)"
                    type="number"
                    step="1"
                    value={managementFee.flat_amount}
                    onChange={(e) =>
                      onSetManagementFee({
                        ...managementFee,
                        flat_amount: Number(e.target.value),
                      })
                    }
                    placeholder="$100-$150"
                  />
                )}
              </div>
            )}
          </div>

          {/* Volume Discounts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Volume Discounts</span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={volumeDiscounts.enabled}
                  onChange={(e) =>
                    onSetVolumeDiscounts({
                      ...volumeDiscounts,
                      enabled: e.target.checked,
                    })
                  }
                  className="peer sr-only"
                />
                <div className="peer h-5 w-9 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full" />
              </label>
            </div>
            {volumeDiscounts.enabled && (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Cases
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                        Discount %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {volumeDiscounts.brackets.map((bracket, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 text-foreground">
                          {bracket.min_quantity}
                          {bracket.max_quantity ? `–${bracket.max_quantity}` : '+'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            step="0.5"
                            value={bracket.discount_pct}
                            onChange={(e) => {
                              const updated: VolumeDiscountBracket[] = volumeDiscounts.brackets.map(
                                (b, j) =>
                                  j === i
                                    ? { ...b, discount_pct: Number(e.target.value) }
                                    : b
                              );
                              onSetVolumeDiscounts({ ...volumeDiscounts, brackets: updated });
                            }}
                            className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-right text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </FormSection>
    </div>
  );
}
