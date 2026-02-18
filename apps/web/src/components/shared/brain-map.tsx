'use client';

export function BrainMap({ steps }: { steps: string[] }) {
  return (
    <div className="text-sm text-muted-foreground">
      {steps.join(' -> ')}
    </div>
  );
}
