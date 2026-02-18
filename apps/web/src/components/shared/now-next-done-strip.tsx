'use client';

import { Badge } from '@gleamops/ui';

export function NowNextDoneStrip({ now, next, done }: { now: string; next: string; done: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge color="blue">Now: {now}</Badge>
      <Badge color="yellow">Next: {next}</Badge>
      <Badge color="green">Done: {done}</Badge>
    </div>
  );
}
