'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Zap, BarChart3, Check, AlertTriangle } from 'lucide-react';
import { FormWizard, useWizardSteps, Button, Badge } from '@gleamops/ui';
import type { SupplyPricingResult, SupplyMarginHealth } from '@gleamops/cleanflow';
import { useSupplyCalculator } from './hooks/use-supply-calculator';
import { SUPPLY_WIZARD_STEPS } from './lib/supply-calculator-types';
import { ItemSelectionStep } from './steps/item-selection-step';
import { PricingConfigStep } from './steps/pricing-config-step';
import { ItemPricingStep } from './steps/item-pricing-step';
import { ReviewStep } from './steps/review-step';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const healthBadgeColor: Record<SupplyMarginHealth, 'green' | 'yellow' | 'red'> = {
  healthy: 'green',
  caution: 'yellow',
  below_floor: 'red',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SupplyCalculatorPage() {
  const router = useRouter();
  const { state, dispatch, loadDraft, restoreDraft, reset } = useSupplyCalculator();
  const { currentStep, goToStep, reset: resetWizard } = useWizardSteps(SUPPLY_WIZARD_STEPS.length);
  const [draftAvailable, setDraftAvailable] = useState(false);

  // Check for draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.items.length > 0) {
      setDraftAvailable(true);
    }
  }, [loadDraft]);

  const handleRestoreDraft = useCallback(() => {
    restoreDraft();
    setDraftAvailable(false);
  }, [restoreDraft]);

  const handleDismissDraft = useCallback(() => {
    setDraftAvailable(false);
  }, []);

  // Quick Quote — load anchors and jump to step 3
  const handleQuickQuote = useCallback(() => {
    dispatch({ type: 'QUICK_QUOTE' });
    setDraftAvailable(false);
    // Jump to Step 3 (pricing) after a tick to let state settle
    setTimeout(() => goToStep(2), 50);
  }, [dispatch, goToStep]);

  // Reset
  const handleReset = useCallback(() => {
    reset();
    resetWizard();
  }, [reset, resetWizard]);

  // Validate step navigation
  const validateStep = useCallback(
    (step: number): boolean => {
      if (step === 0) return state.items.length > 0;
      return true;
    },
    [state.items.length]
  );

  // FormWizard submit (on last step)
  const handleSubmit = useCallback(async () => {
    // Export is handled inside ReviewStep via ExportButton
  }, []);

  const isReviewStep = currentStep === 3;
  const result = state.result;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push('/pipeline')}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Pipeline
          </button>
          <h1 className="text-2xl font-bold text-foreground">Supply Calculator</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Price supply items, calculate margins, and build client quotes.
          </p>
        </div>
        <Button variant="secondary" onClick={handleQuickQuote}>
          <Zap className="h-4 w-4" />
          Quick Quote
        </Button>
      </div>

      {/* Draft recovery banner */}
      {draftAvailable && (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-foreground">
            You have an unsaved draft. Would you like to resume?
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleDismissDraft}>
              Start Fresh
            </Button>
            <Button size="sm" onClick={handleRestoreDraft}>
              Resume Draft
            </Button>
          </div>
        </div>
      )}

      {/* Wizard */}
      <FormWizard
        steps={SUPPLY_WIZARD_STEPS}
        currentStep={currentStep}
        onStepChange={goToStep}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/pipeline')}
        submitLabel="Export Quote"
        validateStep={validateStep}
      >
        {/* Step 1: Select Items */}
        {currentStep === 0 && (
          <ItemSelectionStep
            items={state.items}
            onSetItems={(items) => dispatch({ type: 'SET_ITEMS', items })}
            onAddItem={(item) => dispatch({ type: 'ADD_ITEM', item })}
            onRemoveItem={(index) => dispatch({ type: 'REMOVE_ITEM', index })}
            onUpdateItem={(index, patch) => dispatch({ type: 'UPDATE_ITEM', index, patch })}
          />
        )}

        {/* Step 2: Configure Pricing */}
        {currentStep === 1 && (
          <PricingConfigStep
            customerTier={state.customerTier}
            pricingStructure={state.pricingStructure}
            pricingMethod={state.pricingMethod}
            managementFee={state.managementFee}
            volumeDiscounts={state.volumeDiscounts}
            allowance={state.allowance}
            allInclusive={state.allInclusive}
            onSetTier={(tier) => dispatch({ type: 'SET_TIER', tier })}
            onSetStructure={(structure) => dispatch({ type: 'SET_STRUCTURE', structure })}
            onSetMethod={(method) => dispatch({ type: 'SET_METHOD', method })}
            onSetManagementFee={(fee) => dispatch({ type: 'SET_MANAGEMENT_FEE', fee })}
            onSetVolumeDiscounts={(vd) => dispatch({ type: 'SET_VOLUME_DISCOUNTS', volumeDiscounts: vd })}
            onSetAllowance={(a) => dispatch({ type: 'SET_ALLOWANCE', allowance: a })}
            onSetAllInclusive={(a) => dispatch({ type: 'SET_ALL_INCLUSIVE', allInclusive: a })}
          />
        )}

        {/* Step 3: Price Items */}
        {currentStep === 2 && (
          <ItemPricingStep
            items={state.items}
            result={state.result}
            customerTier={state.customerTier}
            pricingMethod={state.pricingMethod}
            onUpdateItem={(index, patch) => dispatch({ type: 'UPDATE_ITEM', index, patch })}
          />
        )}

        {/* Step 4: Review */}
        {currentStep === 3 && result && (
          <ReviewStep
            state={state}
            result={result}
            onReset={handleReset}
          />
        )}

        {currentStep === 3 && !result && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Add items and configure pricing to see the review.
          </div>
        )}
      </FormWizard>

      {/* Live Estimate Panel — visible on steps 0-2 only */}
      {!isReviewStep && (
        <LiveEstimatePanel result={result} itemCount={state.items.length} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live Estimate Panel
// ---------------------------------------------------------------------------
function LiveEstimatePanel({
  result,
  itemCount,
}: {
  result: SupplyPricingResult | null;
  itemCount: number;
}) {
  const belowFloorCount = result?.items.filter((i) => i.margin_health === 'below_floor').length ?? 0;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 transition-all duration-200">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Live Estimate
        </h3>
      </div>

      {result && itemCount > 0 ? (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Total Cost</p>
              <p className="text-sm font-bold">{fmt(result.total_cost)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Revenue</p>
              <p className="text-sm font-bold">{fmt(result.total_revenue)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Margin</p>
              <p className="text-sm font-bold">
                <Badge color={healthBadgeColor[result.margin_health]}>
                  {result.blended_margin_pct}%
                </Badge>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Items</p>
              <p className="text-sm font-bold">{result.items.length}</p>
            </div>
          </div>

          <div className="mt-3">
            {belowFloorCount > 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-warning">
                <AlertTriangle className="h-3 w-3" />
                {belowFloorCount} item{belowFloorCount !== 1 ? 's' : ''} below margin floor — review
                in Step 3
              </div>
            ) : result.margin_health === 'healthy' ? (
              <div className="flex items-center gap-1.5 text-xs text-success">
                <Check className="h-3 w-3" />
                Margins healthy — all items above 20% floor
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-warning">
                <AlertTriangle className="h-3 w-3" />
                Blended margin below 25% target
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Add items to see estimate</p>
      )}
    </div>
  );
}
