'use client';

import { DollarSign, Gauge, LineChart, ShieldAlert } from 'lucide-react';
import { Badge, Card, CardContent, Input, cn } from '@gleamops/ui';

export type PricingMethod = 'COST_PLUS' | 'TARGET_MARGIN' | 'MARKET_RATE' | 'HYBRID';

interface PricingStrategyConfig {
  method: PricingMethod;
  label: string;
  description: string;
  formula: string;
  guidance: string;
  icon: typeof DollarSign;
  badge: 'green' | 'yellow' | 'red' | 'blue';
}

const PRICING_STRATEGIES: PricingStrategyConfig[] = [
  {
    method: 'COST_PLUS',
    label: 'Cost Plus',
    description: 'Adds a markup on top of your total monthly cost.',
    formula: 'Price = Cost × (1 + Markup%)',
    guidance: 'Good for stable cost environments and quick quoting.',
    icon: DollarSign,
    badge: 'blue',
  },
  {
    method: 'TARGET_MARGIN',
    label: 'Target Margin',
    description: 'Back-solves price from your desired margin target.',
    formula: 'Price = Cost ÷ (1 - Margin%)',
    guidance: 'Best for protecting profitability and consistent margin policy.',
    icon: Gauge,
    badge: 'green',
  },
  {
    method: 'MARKET_RATE',
    label: 'Market Rate',
    description: 'Sets a fixed monthly price based on market conditions.',
    formula: 'Price = Market Input',
    guidance: 'Useful when bids must match a market anchor or budget cap.',
    icon: LineChart,
    badge: 'yellow',
  },
  {
    method: 'HYBRID',
    label: 'Hybrid',
    description: 'Balances target margin against market reference pricing.',
    formula: 'Clamp(Target Margin, ±10% of Market)',
    guidance: 'Great for competitive bids where margin guardrails still matter.',
    icon: ShieldAlert,
    badge: 'red',
  },
];

interface NumericChangeEvent {
  target: {
    value: string;
  };
}

function parseNumber(value: string, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

interface PricingStrategySelectorProps {
  method: PricingMethod;
  targetMarginPct: number;
  costPlusPct: number;
  marketPriceMonthly: number;
  onMethodChange: (method: PricingMethod) => void;
  onTargetMarginChange: (value: number) => void;
  onCostPlusChange: (value: number) => void;
  onMarketPriceMonthlyChange: (value: number) => void;
}

export function PricingStrategySelector({
  method,
  targetMarginPct,
  costPlusPct,
  marketPriceMonthly,
  onMethodChange,
  onTargetMarginChange,
  onCostPlusChange,
  onMarketPriceMonthlyChange,
}: PricingStrategySelectorProps) {
  const showTargetMargin = method === 'TARGET_MARGIN' || method === 'HYBRID';
  const showCostPlus = method === 'COST_PLUS';
  const showMarket = method === 'MARKET_RATE' || method === 'HYBRID';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Pricing Strategy</h3>
        <Badge color="blue">4 strategies</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {PRICING_STRATEGIES.map((strategy) => {
          const selected = strategy.method === method;
          const Icon = strategy.icon;
          return (
            <button
              key={strategy.method}
              type="button"
              onClick={() => onMethodChange(strategy.method)}
              className={cn(
                'rounded-xl border p-3 text-left transition-all',
                'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                selected ? 'border-primary/60 bg-primary/5' : 'border-border bg-card',
              )}
              aria-pressed={selected}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-background ring-1 ring-border">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <Badge color={strategy.badge}>{selected ? 'Active' : strategy.label}</Badge>
              </div>
              <p className="text-sm font-semibold text-foreground">{strategy.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{strategy.description}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">{strategy.formula}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{strategy.guidance}</p>
            </button>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardContent className="grid gap-3 pt-4 md:grid-cols-3">
          {showTargetMargin ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Target Margin %</p>
              <Input
                type="number"
                value={String(targetMarginPct)}
                min={0}
                max={75}
                onChange={(event: NumericChangeEvent) =>
                  onTargetMarginChange(parseNumber(event.target.value, targetMarginPct))
                }
              />
            </div>
          ) : null}

          {showCostPlus ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Cost Plus %</p>
              <Input
                type="number"
                value={String(costPlusPct)}
                min={0}
                max={100}
                onChange={(event: NumericChangeEvent) =>
                  onCostPlusChange(parseNumber(event.target.value, costPlusPct))
                }
              />
            </div>
          ) : null}

          {showMarket ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Market Monthly Price</p>
              <Input
                type="number"
                value={String(marketPriceMonthly)}
                min={0}
                step={100}
                onChange={(event: NumericChangeEvent) =>
                  onMarketPriceMonthlyChange(parseNumber(event.target.value, marketPriceMonthly))
                }
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
