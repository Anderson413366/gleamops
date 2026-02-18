'use client';

import { Button } from '@gleamops/ui';

export function PrimaryActionFooter({ label, onClick, disabled }: { label: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-3 flex justify-end">
      <Button onClick={onClick} disabled={disabled}>{label}</Button>
    </div>
  );
}
