'use client';

import { Camera, CircleCheck, CircleDot } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@gleamops/ui';

export interface ShiftChecklistItemView {
  id: string;
  section: string;
  label: string;
  isRequired: boolean;
  requiresPhoto: boolean;
  isChecked: boolean;
  notes: string | null;
  checkedAt: string | null;
}

interface ChecklistSectionProps {
  title: string;
  items: ShiftChecklistItemView[];
  savingItemId: string | null;
  onToggle: (item: ShiftChecklistItemView) => void;
  readonly?: boolean;
}

function formatCheckedAt(value: string | null): string {
  if (!value) return 'Not completed';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Completed';
  return parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function ChecklistSection({
  title,
  items,
  savingItemId,
  onToggle,
  readonly = false,
}: ChecklistSectionProps) {
  const completed = items.filter((item) => item.isChecked).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge color={completed === items.length && items.length > 0 ? 'green' : 'blue'}>
            {completed}/{items.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-border/70 bg-muted/15 px-3 py-2"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.isChecked ? `Completed at ${formatCheckedAt(item.checkedAt)}` : 'Pending completion'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {item.isRequired ? <Badge color="blue">Required</Badge> : <Badge color="gray">Optional</Badge>}
                {item.requiresPhoto ? (
                  <Badge color="yellow">
                    <Camera className="h-3 w-3" />
                    Photo
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                variant={item.isChecked ? 'secondary' : 'primary'}
                size="sm"
                loading={savingItemId === item.id}
                disabled={readonly}
                onClick={() => onToggle(item)}
              >
                {item.isChecked ? (
                  <>
                    <CircleCheck className="h-4 w-4" />
                    Mark Pending
                  </>
                ) : (
                  <>
                    <CircleDot className="h-4 w-4" />
                    Mark Complete
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
