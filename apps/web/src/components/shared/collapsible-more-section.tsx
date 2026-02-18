'use client';

import { useState } from 'react';
import { Button } from '@gleamops/ui';

export function CollapsibleMoreSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide' : 'More'}
        </Button>
      </div>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}
