'use client';

import type { ComponentType } from 'react';
import {
  Building2,
  Blinds,
  Hammer,
  Home,
  Layers,
  Paintbrush,
  ShieldCheck,
  Sparkles,
  type LucideProps,
} from 'lucide-react';
import { Badge, cn } from '@gleamops/ui';
import type { BidTypeCode } from '@gleamops/cleanflow';

export interface ServiceTypeConfig {
  code: BidTypeCode;
  label: string;
  description: string;
  icon: ComponentType<LucideProps>;
  minutesPer1000: number;
  recommendedDaysPerWeek: number;
  recommendedTargetMarginPct: number;
  tone: 'blue' | 'green' | 'amber' | 'rose' | 'purple';
}

export const SERVICE_TYPE_CONFIGS: ServiceTypeConfig[] = [
  {
    code: 'JANITORIAL',
    label: 'Janitorial',
    description: 'Recurring daily/weekly commercial cleaning program.',
    icon: Building2,
    minutesPer1000: 24,
    recommendedDaysPerWeek: 5,
    recommendedTargetMarginPct: 24,
    tone: 'blue',
  },
  {
    code: 'DISINFECTING',
    label: 'Disinfecting',
    description: 'High-touch disinfection routines and pathogen reduction.',
    icon: ShieldCheck,
    minutesPer1000: 29,
    recommendedDaysPerWeek: 5,
    recommendedTargetMarginPct: 28,
    tone: 'green',
  },
  {
    code: 'CARPET',
    label: 'Carpet',
    description: 'Extraction, spot treatment, and restorative carpet care.',
    icon: Layers,
    minutesPer1000: 34,
    recommendedDaysPerWeek: 2,
    recommendedTargetMarginPct: 32,
    tone: 'amber',
  },
  {
    code: 'WINDOW',
    label: 'Window',
    description: 'Interior/exterior pane and frame service.',
    icon: Blinds,
    minutesPer1000: 30,
    recommendedDaysPerWeek: 1,
    recommendedTargetMarginPct: 30,
    tone: 'blue',
  },
  {
    code: 'TILE',
    label: 'Tile',
    description: 'Floor scrub, recoat, strip/wax, and grout maintenance.',
    icon: Paintbrush,
    minutesPer1000: 33,
    recommendedDaysPerWeek: 2,
    recommendedTargetMarginPct: 31,
    tone: 'amber',
  },
  {
    code: 'MOVE_IN_OUT',
    label: 'Move In/Out',
    description: 'Vacancy turnover cleaning and prep service.',
    icon: Home,
    minutesPer1000: 31,
    recommendedDaysPerWeek: 1,
    recommendedTargetMarginPct: 29,
    tone: 'rose',
  },
  {
    code: 'POST_CONSTRUCTION',
    label: 'Post Construction',
    description: 'Debris/fine-dust cleanup and final readiness detailing.',
    icon: Hammer,
    minutesPer1000: 38,
    recommendedDaysPerWeek: 1,
    recommendedTargetMarginPct: 33,
    tone: 'purple',
  },
  {
    code: 'MAID',
    label: 'Maid',
    description: 'Residential-style detailing and deep-clean touchpoints.',
    icon: Sparkles,
    minutesPer1000: 28,
    recommendedDaysPerWeek: 1,
    recommendedTargetMarginPct: 27,
    tone: 'green',
  },
];

const TONE_STYLES: Record<ServiceTypeConfig['tone'], string> = {
  blue: 'border-blue-300/70 bg-blue-50/50',
  green: 'border-emerald-300/70 bg-emerald-50/50',
  amber: 'border-amber-300/70 bg-amber-50/50',
  rose: 'border-rose-300/70 bg-rose-50/50',
  purple: 'border-violet-300/70 bg-violet-50/50',
};

const TONE_ICON_STYLES: Record<ServiceTypeConfig['tone'], string> = {
  blue: 'text-blue-700',
  green: 'text-emerald-700',
  amber: 'text-amber-700',
  rose: 'text-rose-700',
  purple: 'text-violet-700',
};

export function getServiceTypeConfig(code: BidTypeCode): ServiceTypeConfig {
  const config = SERVICE_TYPE_CONFIGS.find((item) => item.code === code);
  return config ?? SERVICE_TYPE_CONFIGS[0];
}

interface ServiceTypeSelectorProps {
  value: BidTypeCode;
  onChange: (next: BidTypeCode, config: ServiceTypeConfig) => void;
}

export function ServiceTypeSelector({ value, onChange }: ServiceTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Service Type</h3>
        <Badge color="blue">{SERVICE_TYPE_CONFIGS.length} service types</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {SERVICE_TYPE_CONFIGS.map((config) => {
          const selected = config.code === value;
          const Icon = config.icon;
          return (
            <button
              key={config.code}
              type="button"
              onClick={() => onChange(config.code, config)}
              className={cn(
                'rounded-xl border p-3 text-left transition-all',
                'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                selected ? TONE_STYLES[config.tone] : 'border-border bg-card',
              )}
              aria-pressed={selected}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-background/80 ring-1 ring-border/60">
                  <Icon className={cn('h-4 w-4', TONE_ICON_STYLES[config.tone])} />
                </div>
                {selected ? <Badge color="green">Selected</Badge> : null}
              </div>
              <p className="text-sm font-semibold text-foreground">{config.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{config.description}</p>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{config.minutesPer1000} min/1k sqft</span>
                <span>•</span>
                <span>{config.recommendedTargetMarginPct}% target</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
