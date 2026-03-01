'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Card, CardContent, Table, TableHeader, TableHead, TableBody, TableRow, TableCell, EmptyState, Badge } from '@gleamops/ui';

interface BreakRule {
  id: string;
  name: string;
  duration_minutes: number;
  is_paid: boolean;
  applies_to: string;
  min_shift_hours: number;
}

const SAMPLE_RULES: BreakRule[] = [
  { id: '1', name: 'Standard Break', duration_minutes: 30, is_paid: false, applies_to: 'All Positions', min_shift_hours: 6 },
  { id: '2', name: 'Short Break', duration_minutes: 15, is_paid: true, applies_to: 'All Positions', min_shift_hours: 4 },
  { id: '3', name: 'Extended Lunch', duration_minutes: 60, is_paid: false, applies_to: 'Day Porter', min_shift_hours: 8 },
];

export default function BreakRulesTable({ search }: { search: string }) {
  const [rules] = useState<BreakRule[]>(SAMPLE_RULES);

  const filtered = search
    ? rules.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.applies_to.toLowerCase().includes(search.toLowerCase()))
    : rules;

  if (filtered.length === 0) {
    return (
      <EmptyState
        title="No Break Rules"
        description="Configure break rules to automatically apply breaks to shifts based on duration."
        actionLabel="+ Add Break Rule"
        onAction={() => {}}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} break rule{filtered.length !== 1 ? 's' : ''} configured</p>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Add Break Rule
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Rule Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Paid/Unpaid</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Min Shift Hours</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filtered.map((rule) => (
                <TableRow key={rule.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground">{rule.name}</TableCell>
                  <TableCell className="text-muted-foreground">{rule.duration_minutes} min</TableCell>
                  <TableCell>
                    <Badge color={rule.is_paid ? 'green' : 'gray'}>{rule.is_paid ? 'Paid' : 'Unpaid'}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{rule.applies_to}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{rule.min_shift_hours}h</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
