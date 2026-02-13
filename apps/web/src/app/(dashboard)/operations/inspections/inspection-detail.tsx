'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ClipboardCheck, MapPin, Calendar, User, FileText, AlertTriangle,
  CheckCircle2, XCircle, Star,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SlideOver, Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton, Select,
} from '@gleamops/ui';
import { INSPECTION_STATUS_COLORS, ISSUE_SEVERITY_COLORS } from '@gleamops/shared';
import type { Inspection, InspectionItem, InspectionIssue } from '@gleamops/shared';

interface InspectionWithRelations extends Inspection {
  site?: { name: string; site_code: string } | null;
  inspector?: { full_name: string; staff_code: string } | null;
  template?: { name: string } | null;
  ticket?: { ticket_code: string } | null;
}

interface InspectionDetailProps {
  inspection: InspectionWithRelations | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'SUBMITTED', label: 'Submitted' },
];

export function InspectionDetail({ inspection, open, onClose, onUpdate }: InspectionDetailProps) {
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [issues, setIssues] = useState<InspectionIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scoringScale, setScoringScale] = useState(5);
  const [passThreshold, setPassThreshold] = useState(80);

  const fetchDetails = useCallback(async () => {
    if (!inspection || !open) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    const [itemsRes, issuesRes] = await Promise.all([
      supabase
        .from('inspection_items')
        .select('*')
        .eq('inspection_id', inspection.id)
        .is('archived_at', null)
        .order('sort_order'),
      supabase
        .from('inspection_issues')
        .select('*')
        .eq('inspection_id', inspection.id)
        .is('archived_at', null)
        .order('created_at', { ascending: false }),
    ]);

    if (itemsRes.data) setItems(itemsRes.data as unknown as InspectionItem[]);
    if (issuesRes.data) setIssues(issuesRes.data as unknown as InspectionIssue[]);

    // Fetch template details for scoring config
    if (inspection.template_id) {
      const { data: tmpl } = await supabase
        .from('inspection_templates')
        .select('scoring_scale, pass_threshold')
        .eq('id', inspection.template_id)
        .single();
      if (tmpl) {
        setScoringScale(tmpl.scoring_scale ?? 5);
        setPassThreshold(tmpl.pass_threshold ?? 80);
      }
    }
    setLoading(false);
  }, [inspection, open]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const handleScoreItem = async (itemId: string, score: number) => {
    setScoring(true);
    const supabase = getSupabaseBrowserClient();

    // Optimistic update
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, score } : i));

    await supabase
      .from('inspection_items')
      .update({ score })
      .eq('id', itemId);

    // Recalculate totals
    const updatedItems = items.map((i) => i.id === itemId ? { ...i, score } : i);
    const scoredItems = updatedItems.filter((i) => i.score !== null);
    if (scoredItems.length > 0 && inspection) {
      const totalScore = scoredItems.reduce((sum, i) => sum + (i.score ?? 0), 0);
      const maxScore = scoredItems.length * scoringScale;
      const scorePct = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const passed = scorePct >= passThreshold;

      await supabase
        .from('inspections')
        .update({
          total_score: totalScore,
          max_score: maxScore,
          score_pct: Math.round(scorePct * 100) / 100,
          passed,
        })
        .eq('id', inspection.id);
    }

    setScoring(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!inspection) return;
    const supabase = getSupabaseBrowserClient();
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'IN_PROGRESS' && !inspection.started_at) {
      updates.started_at = new Date().toISOString();
    }
    if (newStatus === 'COMPLETED' || newStatus === 'SUBMITTED') {
      updates.completed_at = new Date().toISOString();
    }
    await supabase.from('inspections').update(updates).eq('id', inspection.id);
    onUpdate?.();
  };

  if (!inspection) return null;

  // Score calculations
  const scoredItems = items.filter((i) => i.score !== null);
  const totalScore = scoredItems.reduce((sum, i) => sum + (i.score ?? 0), 0);
  const maxScore = scoredItems.length * scoringScale;
  const scorePct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : null;
  const passed = scorePct !== null ? scorePct >= passThreshold : null;

  // Group items by section
  const sections = new Map<string, InspectionItem[]>();
  for (const item of items) {
    const key = item.section || 'General';
    const existing = sections.get(key) || [];
    existing.push(item);
    sections.set(key, existing);
  }

  return (
    <SlideOver open={open} onClose={onClose} title={inspection.inspection_code} subtitle={inspection.template?.name} wide>
      <div className="space-y-6">
        {/* Status + Score Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge color={INSPECTION_STATUS_COLORS[inspection.status] ?? 'gray'}>
              {inspection.status}
            </Badge>
            {passed !== null && (
              <Badge color={passed ? 'green' : 'red'}>
                {passed ? 'PASSED' : 'FAILED'}
              </Badge>
            )}
          </div>
          <Select
            value={inspection.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            options={STATUS_OPTIONS}
            className="text-xs"
          />
        </div>

        {/* Score Overview */}
        {scorePct !== null && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Quality Score</span>
                </div>
                <span className={`text-2xl font-bold ${
                  scorePct >= 80 ? 'text-green-600' : scorePct >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {scorePct}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    scorePct >= 80 ? 'bg-green-500' : scorePct >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${scorePct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{totalScore}/{maxScore} points ({scoredItems.length}/{items.length} scored)</span>
                <span>Pass: {passThreshold}%</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inspection Info */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Site</p>
                  <p className="text-sm font-medium">{inspection.site?.name ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Inspector</p>
                  <p className="text-sm font-medium">{inspection.inspector?.full_name ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium">{new Date(inspection.created_at).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                  })}</p>
                </div>
              </div>
              {inspection.ticket && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Work Ticket</p>
                    <p className="text-sm font-mono">{inspection.ticket.ticket_code}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scoring Items */}
        {loading ? (
          <Skeleton className="h-60 w-full" />
        ) : items.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  Inspection Items ({items.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from(sections.entries()).map(([sectionName, sectionItems]) => (
                  <div key={sectionName}>
                    {sections.size > 1 && (
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {sectionName}
                      </p>
                    )}
                    <div className="space-y-2">
                      {sectionItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.label}</p>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                            )}
                          </div>
                          {/* Score buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            {Array.from({ length: scoringScale + 1 }, (_, i) => (
                              <button
                                key={i}
                                onClick={() => handleScoreItem(item.id, i)}
                                disabled={scoring}
                                className={`w-7 h-7 rounded-md text-xs font-bold transition-colors ${
                                  item.score === i
                                    ? i === 0 ? 'bg-red-500 text-white'
                                      : i <= scoringScale * 0.4 ? 'bg-orange-500 text-white'
                                      : i <= scoringScale * 0.7 ? 'bg-yellow-500 text-white'
                                      : 'bg-green-500 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                              >
                                {i}
                              </button>
                            ))}
                          </div>
                          {/* Photo indicator */}
                          {item.requires_photo && (
                            <div className={`text-xs ${item.photo_taken ? 'text-green-500' : 'text-gray-300'}`}>
                              {item.photo_taken ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No inspection items. Select a template when creating to auto-populate items.
            </CardContent>
          </Card>
        )}

        {/* Issues */}
        {issues.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Issues ({issues.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {issues.map((issue) => (
                  <div key={issue.id} className="p-3 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <Badge color={ISSUE_SEVERITY_COLORS[issue.severity] ?? 'gray'}>
                        {issue.severity}
                      </Badge>
                      {issue.resolved_at && (
                        <Badge color="green">Resolved</Badge>
                      )}
                    </div>
                    <p className="text-sm">{issue.description}</p>
                    {issue.resolution_notes && (
                      <p className="text-xs text-muted-foreground mt-1">Resolution: {issue.resolution_notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {inspection.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{inspection.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
          <p>Created: {new Date(inspection.created_at).toLocaleDateString()}</p>
          <p>Updated: {new Date(inspection.updated_at).toLocaleDateString()}</p>
          {inspection.started_at && <p>Started: {new Date(inspection.started_at).toLocaleDateString()}</p>}
          {inspection.completed_at && <p>Completed: {new Date(inspection.completed_at).toLocaleDateString()}</p>}
        </div>
      </div>
    </SlideOver>
  );
}
