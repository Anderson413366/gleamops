'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { AlertTriangle, Award, BookOpen, FileText, CalendarCheck } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Badge, Skeleton } from '@gleamops/ui';
import { CERTIFICATION_STATUS_COLORS, SAFETY_DOCUMENT_STATUS_COLORS } from '@gleamops/shared';
import type { StatusColor } from '@gleamops/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ExpiringItem {
  id: string;
  type: 'certification' | 'training' | 'document';
  title: string;
  subtitle: string;
  expiryDate: string;
  daysUntil: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function daysUntilDate(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function urgencyColor(days: number): StatusColor {
  if (days < 0) return 'red';
  if (days <= 14) return 'orange';
  if (days <= 30) return 'yellow';
  return 'green';
}

function urgencyLabel(days: number): string {
  if (days < 0) return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `${days} days`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ComplianceCalendar() {
  const [items, setItems] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    // Look ahead 90 days + show already expired (past 30 days)
    const lookAhead = new Date();
    lookAhead.setDate(lookAhead.getDate() + 90);
    const lookAheadStr = lookAhead.toISOString().split('T')[0];

    const lookBack = new Date();
    lookBack.setDate(lookBack.getDate() - 30);
    const lookBackStr = lookBack.toISOString().split('T')[0];

    const [certsRes, completionsRes, docsRes] = await Promise.all([
      // Expiring certifications
      supabase
        .from('staff_certifications')
        .select('id, certification_name, expiry_date, status, staff:staff_id(full_name)')
        .is('archived_at', null)
        .eq('status', 'ACTIVE')
        .not('expiry_date', 'is', null)
        .gte('expiry_date', lookBackStr)
        .lte('expiry_date', lookAheadStr)
        .order('expiry_date'),

      // Expiring training completions
      supabase
        .from('training_completions')
        .select('id, expiry_date, staff:staff_id(full_name), course:course_id(name)')
        .is('archived_at', null)
        .not('expiry_date', 'is', null)
        .gte('expiry_date', lookBackStr)
        .lte('expiry_date', lookAheadStr)
        .order('expiry_date'),

      // Expiring / needs-review safety documents
      supabase
        .from('safety_documents')
        .select('id, document_code, title, expiry_date, review_date, status')
        .is('archived_at', null)
        .eq('status', 'ACTIVE')
        .or(`expiry_date.gte.${lookBackStr},review_date.gte.${lookBackStr}`)
        .or(`expiry_date.lte.${lookAheadStr},review_date.lte.${lookAheadStr}`)
        .order('expiry_date'),
    ]);

    const result: ExpiringItem[] = [];

    // Certifications
    if (certsRes.data) {
      for (const cert of certsRes.data as unknown as {
        id: string;
        certification_name: string;
        expiry_date: string;
        status: string;
        staff?: { full_name: string } | null;
      }[]) {
        if (!cert.expiry_date) continue;
        result.push({
          id: cert.id,
          type: 'certification',
          title: cert.certification_name,
          subtitle: cert.staff?.full_name ?? 'Unknown Staff',
          expiryDate: cert.expiry_date,
          daysUntil: daysUntilDate(cert.expiry_date),
          status: cert.status,
        });
      }
    }

    // Training completions
    if (completionsRes.data) {
      for (const comp of completionsRes.data as unknown as {
        id: string;
        expiry_date: string;
        staff?: { full_name: string } | null;
        course?: { name: string } | null;
      }[]) {
        if (!comp.expiry_date) continue;
        result.push({
          id: comp.id,
          type: 'training',
          title: comp.course?.name ?? 'Unknown Course',
          subtitle: comp.staff?.full_name ?? 'Unknown Staff',
          expiryDate: comp.expiry_date,
          daysUntil: daysUntilDate(comp.expiry_date),
          status: 'DUE',
        });
      }
    }

    // Safety documents
    if (docsRes.data) {
      for (const doc of docsRes.data as unknown as {
        id: string;
        document_code: string;
        title: string;
        expiry_date: string | null;
        review_date: string | null;
        status: string;
      }[]) {
        const dateToUse = doc.expiry_date ?? doc.review_date;
        if (!dateToUse) continue;
        const days = daysUntilDate(dateToUse);
        if (days > 90 || days < -30) continue;
        result.push({
          id: doc.id,
          type: 'document',
          title: doc.title,
          subtitle: doc.document_code,
          expiryDate: dateToUse,
          daysUntil: days,
          status: doc.status,
        });
      }
    }

    // Sort by urgency (most urgent first)
    result.sort((a, b) => a.daysUntil - b.daysUntil);
    setItems(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group by urgency bucket
  const overdue = useMemo(() => items.filter((i) => i.daysUntil < 0), [items]);
  const within14 = useMemo(() => items.filter((i) => i.daysUntil >= 0 && i.daysUntil <= 14), [items]);
  const within30 = useMemo(() => items.filter((i) => i.daysUntil > 14 && i.daysUntil <= 30), [items]);
  const within90 = useMemo(() => items.filter((i) => i.daysUntil > 30), [items]);

  const typeIcon = (type: string) => {
    switch (type) {
      case 'certification': return <Award className="h-4 w-4" />;
      case 'training': return <BookOpen className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <CalendarCheck className="h-4 w-4" />;
    }
  };

  function renderSection(title: string, badgeColor: StatusColor, sectionItems: ExpiringItem[]) {
    if (sectionItems.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <Badge color={badgeColor}>{sectionItems.length}</Badge>
        </div>
        <div className="space-y-2">
          {sectionItems.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="shrink-0 text-muted-foreground">
                  {typeIcon(item.type)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {dateFormatter.format(new Date(item.expiryDate + 'T00:00:00'))}
                </span>
                <Badge color={urgencyColor(item.daysUntil)}>
                  {urgencyLabel(item.daysUntil)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarCheck className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground">All clear</h3>
        <p className="text-sm text-muted-foreground mt-1">
          No certifications, training, or documents are expiring within the next 90 days.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{overdue.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Overdue</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-warning">{within14.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Within 14 days</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-warning">{within30.length}</p>
          <p className="text-xs text-muted-foreground mt-1">15–30 days</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-success">{within90.length}</p>
          <p className="text-xs text-muted-foreground mt-1">31–90 days</p>
        </div>
      </div>

      {/* Urgency sections */}
      {renderSection('Overdue', 'red', overdue)}
      {renderSection('Expiring Within 14 Days', 'orange', within14)}
      {renderSection('Expiring Within 30 Days', 'yellow', within30)}
      {renderSection('Upcoming (31–90 Days)', 'green', within90)}
    </div>
  );
}
