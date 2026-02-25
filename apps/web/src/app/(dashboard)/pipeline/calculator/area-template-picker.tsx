'use client';

import { Badge, cn } from '@gleamops/ui';

export interface AreaTemplateDefinition {
  code: string;
  label: string;
  description: string;
  areaTypeCode: string;
  floorTypeCode: string;
  defaultSharePct: number;
  minutesPer1000: number;
}

export interface CalculatorTemplateArea {
  id: string;
  name: string;
  areaTypeCode: string;
  floorTypeCode: string;
  sqft: number;
  quantity: number;
  minutesPer1000: number;
}

export const AREA_TEMPLATES: AreaTemplateDefinition[] = [
  {
    code: 'OFFICE_OPEN',
    label: 'Office',
    description: 'Open desks and private office zones.',
    areaTypeCode: 'OFFICE_OPEN',
    floorTypeCode: 'CARPET',
    defaultSharePct: 40,
    minutesPer1000: 22,
  },
  {
    code: 'RESTROOM',
    label: 'Restroom',
    description: 'Toilets, sinks, mirrors, dispensers, and floors.',
    areaTypeCode: 'RESTROOM',
    floorTypeCode: 'CERAMIC',
    defaultSharePct: 12,
    minutesPer1000: 42,
  },
  {
    code: 'LOBBY_RECEPTION',
    label: 'Lobby',
    description: 'Entrances, reception, waiting, and high-touch glass.',
    areaTypeCode: 'LOBBY_RECEPTION',
    floorTypeCode: 'VCT',
    defaultSharePct: 10,
    minutesPer1000: 30,
  },
  {
    code: 'HALLWAY_CORRIDOR',
    label: 'Hallway',
    description: 'Corridors, connectors, and transition spaces.',
    areaTypeCode: 'HALLWAY_CORRIDOR',
    floorTypeCode: 'VCT',
    defaultSharePct: 15,
    minutesPer1000: 20,
  },
  {
    code: 'BREAK_ROOM_KITCHEN',
    label: 'Break Room',
    description: 'Kitchenettes, sinks, counters, and dining spots.',
    areaTypeCode: 'BREAK_ROOM_KITCHEN',
    floorTypeCode: 'VCT',
    defaultSharePct: 10,
    minutesPer1000: 34,
  },
  {
    code: 'CONFERENCE_ROOM',
    label: 'Conference',
    description: 'Meeting tables, chairs, screens, and reset zones.',
    areaTypeCode: 'CONFERENCE_ROOM',
    floorTypeCode: 'CARPET',
    defaultSharePct: 8,
    minutesPer1000: 18,
  },
  {
    code: 'WAREHOUSE_PRODUCTION',
    label: 'Warehouse',
    description: 'Production floor, stock, loading, and utility spaces.',
    areaTypeCode: 'WAREHOUSE_PRODUCTION',
    floorTypeCode: 'CONCRETE',
    defaultSharePct: 20,
    minutesPer1000: 16,
  },
];

function findTemplate(code: string): AreaTemplateDefinition | undefined {
  return AREA_TEMPLATES.find((template) => template.code === code);
}

function normalizeSelectedCodes(selectedCodes: string[]): string[] {
  const codes = selectedCodes.filter((code) => !!findTemplate(code));
  return codes.length > 0 ? codes : ['OFFICE_OPEN'];
}

export function buildAreasFromTemplates(selectedCodes: string[], totalSqft: number): CalculatorTemplateArea[] {
  const normalizedCodes = normalizeSelectedCodes(selectedCodes);
  const templates = normalizedCodes
    .map((code) => findTemplate(code))
    .filter((template): template is AreaTemplateDefinition => !!template);
  const totalShare = templates.reduce((sum, template) => sum + template.defaultSharePct, 0) || 1;
  const safeSqft = Math.max(100, totalSqft);

  const areas: CalculatorTemplateArea[] = [];
  let assignedSqft = 0;

  templates.forEach((template, index) => {
    const isLast = index === templates.length - 1;
    const templateSqft = isLast
      ? Math.max(1, safeSqft - assignedSqft)
      : Math.max(1, Math.floor((safeSqft * template.defaultSharePct) / totalShare));
    assignedSqft += templateSqft;

    areas.push({
      id: `template-${template.code}`,
      name: template.label,
      areaTypeCode: template.areaTypeCode,
      floorTypeCode: template.floorTypeCode,
      sqft: templateSqft,
      quantity: 1,
      minutesPer1000: template.minutesPer1000,
    });
  });

  return areas;
}

interface AreaTemplatePickerProps {
  selectedCodes: string[];
  totalSqft: number;
  onChange: (codes: string[]) => void;
}

export function AreaTemplatePicker({ selectedCodes, totalSqft, onChange }: AreaTemplatePickerProps) {
  const normalizedCodes = normalizeSelectedCodes(selectedCodes);
  const areas = buildAreasFromTemplates(normalizedCodes, totalSqft);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Area Templates</h3>
        <Badge color="blue">{normalizedCodes.length} selected</Badge>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {AREA_TEMPLATES.map((template) => {
          const selected = normalizedCodes.includes(template.code);
          return (
            <button
              key={template.code}
              type="button"
              onClick={() => {
                const next = selected
                  ? normalizedCodes.filter((code) => code !== template.code)
                  : [...normalizedCodes, template.code];
                onChange(next.length > 0 ? next : ['OFFICE_OPEN']);
              }}
              className={cn(
                'rounded-xl border p-3 text-left transition-all',
                'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                selected ? 'border-primary/60 bg-primary/5' : 'border-border bg-card',
              )}
              aria-pressed={selected}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{template.label}</p>
                {selected ? <Badge color="green">On</Badge> : null}
              </div>
              <p className="text-xs text-muted-foreground">{template.description}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {template.defaultSharePct}% default share • {template.floorTypeCode}
              </p>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-dashed bg-muted/20 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projected Area Mix</p>
        <div className="grid gap-2 md:grid-cols-2">
          {areas.map((area) => (
            <div key={area.id} className="flex items-center justify-between rounded-lg bg-background/80 px-2.5 py-2 text-xs">
              <span className="font-medium text-foreground">{area.name}</span>
              <span className="tabular-nums text-muted-foreground">{area.sqft.toLocaleString()} sqft</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
