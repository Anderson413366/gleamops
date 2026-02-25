'use client';

import { Card, CardContent, CardHeader, CardTitle, cn } from '@gleamops/ui';
import type { BidTypeCode, PricingResult, WorkloadResult } from '@gleamops/cleanflow';

interface WinProbabilityGaugeProps {
  pricing: PricingResult | null;
  workload: WorkloadResult | null;
  targetMarginPct: number;
  serviceType: BidTypeCode;
}

interface ProbabilityResult {
  probabilityPct: number;
  confidence: 'Low' | 'Moderate' | 'High';
  factors: Array<{ label: string; impact: number }>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function calculateProbability({
  pricing,
  workload,
  targetMarginPct,
  serviceType,
}: WinProbabilityGaugeProps): ProbabilityResult {
  if (!pricing || !workload) {
    return {
      probabilityPct: 0,
      confidence: 'Low',
      factors: [],
    };
  }

  const factors: Array<{ label: string; impact: number }> = [];
  let score = 55;

  const marginDelta = pricing.effective_margin_pct - targetMarginPct;
  const marginImpact = clamp(marginDelta * 1.8, -18, 18);
  score += marginImpact;
  factors.push({ label: 'Margin Alignment', impact: marginImpact });

  const staffingImpact =
    workload.cleaners_needed <= 2 ? 8 :
      workload.cleaners_needed <= 3 ? 3 : -8;
  score += staffingImpact;
  factors.push({ label: 'Crew Complexity', impact: staffingImpact });

  const warningImpact = clamp(-(workload.warnings.length * 3), -12, 4);
  score += warningImpact;
  factors.push({ label: 'Operational Risk', impact: warningImpact });

  const strategyImpact =
    pricing.pricing_method === 'HYBRID' ? 4 :
      pricing.pricing_method === 'MARKET_RATE' ? 2 : 0;
  score += strategyImpact;
  factors.push({ label: 'Pricing Strategy', impact: strategyImpact });

  const servicePenalty =
    serviceType === 'POST_CONSTRUCTION' || serviceType === 'DISINFECTING' ? -4 : 0;
  score += servicePenalty;
  factors.push({ label: 'Service Volatility', impact: servicePenalty });

  const probabilityPct = clamp(Math.round(score), 5, 95);
  const confidence =
    probabilityPct >= 75 ? 'High' :
      probabilityPct >= 55 ? 'Moderate' : 'Low';

  return { probabilityPct, confidence, factors };
}

export function WinProbabilityGauge(props: WinProbabilityGaugeProps) {
  const result = calculateProbability(props);
  const markerLeft = `${result.probabilityPct}%`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Win Probability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Predicted Close Likelihood</p>
          <p className="text-lg font-bold tabular-nums text-foreground">{result.probabilityPct}%</p>
        </div>

        <div className="space-y-2">
          <div className="relative h-3 overflow-hidden rounded-full bg-gradient-to-r from-orange-300 via-amber-300 to-emerald-400">
            <div
              className="absolute top-1/2 h-4 w-1.5 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-background"
              style={{ left: markerLeft }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Low</span>
            <span>Moderate</span>
            <span>High</span>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {result.factors.map((factor) => (
            <div key={factor.label} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
              <span className="text-foreground">{factor.label}</span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  factor.impact > 0 ? 'text-emerald-700' : factor.impact < 0 ? 'text-orange-700' : 'text-muted-foreground',
                )}
              >
                {factor.impact > 0 ? '+' : ''}
                {factor.impact.toFixed(1)}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Confidence:
          {' '}
          <span className="font-semibold text-foreground">{result.confidence}</span>
        </p>
      </CardContent>
    </Card>
  );
}
