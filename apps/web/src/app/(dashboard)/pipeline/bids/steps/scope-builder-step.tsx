'use client';

import { useMemo } from 'react';
import { Zap } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@gleamops/ui';
import { FACILITY_TYPES } from '@gleamops/shared';

// ---------------------------------------------------------------------------
// Facility type options for Select
// ---------------------------------------------------------------------------
const FACILITY_TYPE_OPTIONS = FACILITY_TYPES.map((f) => ({
  value: f.code,
  label: f.label,
}));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ScopeBuilderStepProps {
  facilityTypeCode: string;
  sizeTierCode: string;
  totalSqft: number;
  selectedAreas: string[];
  onFacilityTypeChange: (code: string) => void;
  onSizeTierChange: (code: string) => void;
  onTotalSqftChange: (sqft: number) => void;
  onSelectedAreasChange: (areas: string[]) => void;
  onGenerate: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ScopeBuilderStep({
  facilityTypeCode,
  sizeTierCode,
  totalSqft,
  selectedAreas,
  onFacilityTypeChange,
  onSizeTierChange,
  onTotalSqftChange,
  onSelectedAreasChange,
  onGenerate,
}: ScopeBuilderStepProps) {
  const facility = useMemo(
    () => FACILITY_TYPES.find((f) => f.code === facilityTypeCode),
    [facilityTypeCode]
  );

  const sizeTierOptions = useMemo(() => {
    if (!facility) return [];
    return facility.size_tiers.map((t) => ({
      value: t.code,
      label: `${t.label} (${t.min_sqft.toLocaleString()}–${t.max_sqft.toLocaleString()} sqft)`,
    }));
  }, [facility]);

  const typicalAreas = useMemo(() => {
    if (!facility) return [];
    return facility.typical_areas;
  }, [facility]);

  // When facility type changes, reset downstream
  const handleFacilityTypeChange = (code: string) => {
    onFacilityTypeChange(code);
    onSizeTierChange('');
    const newFacility = FACILITY_TYPES.find((f) => f.code === code);
    if (newFacility) {
      onSelectedAreasChange(newFacility.typical_areas.map((a) => a.name));
    } else {
      onSelectedAreasChange([]);
    }
  };

  // When size tier changes, auto-fill sqft midpoint
  const handleSizeTierChange = (code: string) => {
    onSizeTierChange(code);
    if (facility) {
      const tier = facility.size_tiers.find((t) => t.code === code);
      if (tier) {
        onTotalSqftChange(tier.midpoint_sqft);
      }
    }
  };

  const toggleArea = (areaName: string) => {
    if (selectedAreas.includes(areaName)) {
      onSelectedAreasChange(selectedAreas.filter((a) => a !== areaName));
    } else {
      onSelectedAreasChange([...selectedAreas, areaName]);
    }
  };

  const canGenerate = !!facilityTypeCode && totalSqft > 0 && selectedAreas.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scope Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Select a facility type to auto-populate areas with industry-standard defaults.
        </p>

        <Select
          label="Facility Type"
          value={facilityTypeCode}
          onChange={(e) => handleFacilityTypeChange(e.target.value)}
          options={[{ value: '', label: 'Select facility type...' }, ...FACILITY_TYPE_OPTIONS]}
        />

        {facility && (
          <>
            <Select
              label="Size Tier"
              value={sizeTierCode}
              onChange={(e) => handleSizeTierChange(e.target.value)}
              options={[{ value: '', label: 'Select size tier...' }, ...sizeTierOptions]}
            />

            <Input
              label="Total Sq Ft"
              type="number"
              value={totalSqft || ''}
              onChange={(e) => onTotalSqftChange(Number(e.target.value))}
              placeholder="e.g. 25000"
            />

            {/* Area checklist */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Areas to Include</p>
              <div className="space-y-1.5">
                {typicalAreas.map((area) => {
                  const isChecked = selectedAreas.includes(area.name);
                  return (
                    <label
                      key={area.name}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleArea(area.name)}
                        className="rounded border-border"
                      />
                      <span className={isChecked ? 'text-foreground' : 'text-muted-foreground'}>
                        {area.name}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono ml-auto">
                        {area.pct}%
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {facility.key_considerations.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Key Considerations
                </p>
                <ul className="space-y-0.5">
                  {facility.key_considerations.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground">- {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <Button
          variant="secondary"
          onClick={onGenerate}
          disabled={!canGenerate}
        >
          <Zap className="h-4 w-4" /> Generate Areas
        </Button>
      </CardContent>
    </Card>
  );
}
