'use client';

import { Plus, Trash2, Users } from 'lucide-react';
import { Input, Button, Card, CardContent, CardHeader, CardTitle } from '@gleamops/ui';
import type { CrewMember } from '@gleamops/cleanflow';
import { calculateWeightedWage } from '@gleamops/cleanflow';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface CrewWageStepProps {
  crew: CrewMember[];
  onChange: (crew: CrewMember[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CrewWageStep({ crew, onChange }: CrewWageStepProps) {
  const addMember = () => {
    onChange([...crew, { role: '', hourly_rate: 15, weekly_hours: 20 }]);
  };

  const removeMember = (index: number) => {
    onChange(crew.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, patch: Partial<CrewMember>) => {
    onChange(crew.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const wageResult = crew.length > 0 ? calculateWeightedWage(crew) : null;
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Crew Roster</CardTitle>
          </div>
          <Button variant="secondary" size="sm" onClick={addMember}>
            <Plus className="h-3.5 w-3.5" /> Add Member
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Define crew members to calculate a weighted average wage. Leave empty to use flat cleaner rate.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {crew.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            No crew members — using flat cleaner rate.
          </p>
        ) : (
          <>
            {crew.map((member, i) => (
              <div key={i} className="flex items-end gap-3 p-3 rounded-lg border border-border">
                <div className="flex-1">
                  <Input
                    label="Role"
                    value={member.role}
                    onChange={(e) => updateMember(i, { role: e.target.value })}
                    placeholder="e.g. Senior Cleaner"
                  />
                </div>
                <div className="w-28">
                  <Input
                    label="$/hr"
                    type="number"
                    value={member.hourly_rate}
                    onChange={(e) => updateMember(i, { hourly_rate: Number(e.target.value) })}
                  />
                </div>
                <div className="w-28">
                  <Input
                    label="Hrs/wk"
                    type="number"
                    value={member.weekly_hours}
                    onChange={(e) => updateMember(i, { weekly_hours: Number(e.target.value) })}
                  />
                </div>
                <button type="button" onClick={() => removeMember(i)} className="text-muted-foreground hover:text-destructive pb-2">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {/* Weighted average summary */}
            {wageResult && (
              <div className="rounded-lg bg-muted/50 p-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">Weighted Avg Rate</p>
                  <p className="text-sm font-bold">{fmt(wageResult.weighted_avg_rate)}/hr</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Total Weekly Hours</p>
                  <p className="text-sm font-bold">{wageResult.total_weekly_hours.toFixed(1)}</p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
