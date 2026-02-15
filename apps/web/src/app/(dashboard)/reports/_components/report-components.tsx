'use client';

import type { ReactNode } from 'react';
import { Card, CardContent } from '@gleamops/ui';

type Tone = 'primary' | 'success' | 'warning' | 'destructive' | 'accent' | 'muted';

const TONE_STYLES: Record<Tone, { wrap: string; icon: string }> = {
  primary: { wrap: 'bg-primary/10', icon: 'text-primary' },
  success: { wrap: 'bg-success/10', icon: 'text-success' },
  warning: { wrap: 'bg-warning/10', icon: 'text-warning' },
  destructive: { wrap: 'bg-destructive/10', icon: 'text-destructive' },
  accent: { wrap: 'bg-accent/10', icon: 'text-accent' },
  muted: { wrap: 'bg-muted', icon: 'text-muted-foreground' },
};

export function MetricCard(props: {
  icon: ReactNode;
  tone?: Tone;
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  helper?: ReactNode;
}) {
  const tone = props.tone ?? 'primary';
  const styles = TONE_STYLES[tone];

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${styles.wrap}`}>
            <div className={styles.icon}>{props.icon}</div>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{props.label}</p>
            <p className="text-2xl font-bold truncate">{props.value}</p>
            {props.sublabel && <p className="text-xs text-muted-foreground">{props.sublabel}</p>}
            {props.helper && <p className="text-xs text-muted-foreground">{props.helper}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BreakdownRow(props: {
  left: ReactNode;
  right: ReactNode;
  // 0..1
  pct?: number;
  rightWidthClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">{props.left}</div>
      {props.pct != null ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-1 bg-muted rounded-full h-2 min-w-0">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${Math.max(0, Math.min(1, props.pct)) * 100}%` }}
            />
          </div>
          <span className={`text-sm font-medium text-right shrink-0 ${props.rightWidthClassName ?? 'w-10'}`}>
            {props.right}
          </span>
        </div>
      ) : (
        <div className="shrink-0">{props.right}</div>
      )}
    </div>
  );
}
