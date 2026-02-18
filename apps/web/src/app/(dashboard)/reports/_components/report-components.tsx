'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, cn } from '@gleamops/ui';

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
      <CardContent className="p-5">
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

function normalizeSeries(values: number[]) {
  const finite = values.filter((v) => Number.isFinite(v));
  const min = finite.length ? Math.min(...finite) : 0;
  const max = finite.length ? Math.max(...finite) : 0;
  const range = max - min || 1;
  return values.map((v) => (Number.isFinite(v) ? (v - min) / range : 0));
}

export function MiniBars(props: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  barClassName?: string;
  ariaLabel?: string;
}) {
  const width = props.width ?? 180;
  const height = props.height ?? 44;
  const vals = props.values.length ? props.values : [0];
  const norm = normalizeSeries(vals);
  const pad = 2;
  const innerW = Math.max(1, width - pad * 2);
  const innerH = Math.max(1, height - pad * 2);
  const gap = 2;
  const barW = Math.max(1, innerW / vals.length - gap);

  return (
    <svg
      role="img"
      aria-label={props.ariaLabel ?? 'Bar chart'}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('shrink-0', props.className)}
    >
      {norm.map((v, i) => {
        const h = Math.max(1, v * innerH);
        const x = pad + i * (barW + gap);
        const y = pad + (innerH - h);
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={h}
            rx="2"
            className={props.barClassName ?? 'fill-primary/60'}
          />
        );
      })}
    </svg>
  );
}

export function ChartCard(props: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{props.title}</CardTitle>
            {props.subtitle ? <p className="mt-1 text-xs text-muted-foreground">{props.subtitle}</p> : null}
          </div>
          {props.action ? <div className="shrink-0">{props.action}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="pt-2">{props.children}</CardContent>
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
