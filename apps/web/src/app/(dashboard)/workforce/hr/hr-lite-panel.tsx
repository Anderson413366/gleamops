'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, FileText, Flag, Plus, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, ExportButton, Input, SlideOver, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@gleamops/ui';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { uploadToStorage } from '@/lib/upload-to-storage';
import { executeWithOfflineQueue } from '@/lib/offline/mutation-queue';

type StaffRow = {
  id: string;
  staff_code: string;
  full_name: string | null;
};

type HrPtoRow = {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  hours_requested: number;
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
  created_at: string;
};

type HrReviewRow = {
  id: string;
  staff_id: string;
  reviewer_staff_id: string | null;
  review_period_start: string | null;
  review_period_end: string | null;
  overall_score: number | null;
  summary: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'CLOSED';
  reviewed_at: string | null;
  created_at: string;
};

type HrGoalRow = {
  id: string;
  staff_id: string;
  title: string;
  target_date: string | null;
  progress_pct: number;
  status: 'ACTIVE' | 'ON_TRACK' | 'AT_RISK' | 'COMPLETED' | 'CANCELED';
  created_at: string;
};

type HrBadgeRow = {
  id: string;
  name: string;
  color: string | null;
  is_active: boolean;
};

type HrStaffBadgeRow = {
  id: string;
  staff_id: string;
  badge_id: string;
  awarded_at: string;
  notes: string | null;
};

type HrDocumentRow = {
  id: string;
  staff_id: string;
  file_id: string;
  document_type: string;
  expires_on: string | null;
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'REVOKED';
  notes: string | null;
  created_at: string;
};

type FileRow = {
  id: string;
  bucket: string;
  storage_path: string;
  original_filename: string;
};

type PtoImpactAssignment = {
  ticket_id: string;
  ticket_code: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  site_name: string | null;
  period_id: string | null;
  period_name: string | null;
  period_status: string | null;
};

type PtoImpactSummary = {
  assignments: PtoImpactAssignment[];
  impactedPeriods: { id: string; name: string; status: string }[];
};

interface Props {
  search: string;
}

function formatDate(value: string | null) {
  if (!value) return 'Not Set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not Set';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusColor(status: string): 'gray' | 'blue' | 'yellow' | 'green' | 'red' | 'orange' {
  switch (status) {
    case 'ACTIVE':
    case 'APPROVED':
    case 'COMPLETED':
    case 'CLOSED':
      return 'green';
    case 'PENDING':
    case 'DRAFT':
    case 'ON_TRACK':
    case 'ACKNOWLEDGED':
      return 'blue';
    case 'AT_RISK':
    case 'EXPIRING':
      return 'yellow';
    case 'REJECTED':
    case 'EXPIRED':
    case 'REVOKED':
    case 'CANCELED':
      return 'red';
    default:
      return 'gray';
  }
}

function displayName(staff: StaffRow | undefined) {
  if (!staff) return 'Unknown Staff';
  return staff.full_name?.trim() || staff.staff_code;
}

export default function HrLitePanel({ search }: Props) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [pto, setPto] = useState<HrPtoRow[]>([]);
  const [reviews, setReviews] = useState<HrReviewRow[]>([]);
  const [goals, setGoals] = useState<HrGoalRow[]>([]);
  const [badges, setBadges] = useState<HrBadgeRow[]>([]);
  const [staffBadges, setStaffBadges] = useState<HrStaffBadgeRow[]>([]);
  const [documents, setDocuments] = useState<HrDocumentRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);

  const [drawer, setDrawer] = useState<null | 'pto' | 'review' | 'goal' | 'badge' | 'award' | 'document'>(null);

  const [ptoForm, setPtoForm] = useState({
    staff_id: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    hours_requested: '8',
    reason: '',
  });
  const [reviewForm, setReviewForm] = useState({
    staff_id: '',
    reviewer_staff_id: '',
    review_period_start: '',
    review_period_end: '',
    overall_score: '',
    summary: '',
    status: 'DRAFT',
  });
  const [goalForm, setGoalForm] = useState({
    staff_id: '',
    title: '',
    target_date: '',
    progress_pct: '0',
    status: 'ACTIVE',
  });
  const [badgeForm, setBadgeForm] = useState({
    name: '',
    color: '#2563eb',
    is_active: true,
  });
  const [awardForm, setAwardForm] = useState({
    staff_id: '',
    badge_id: '',
    notes: '',
  });
  const [documentForm, setDocumentForm] = useState({
    staff_id: '',
    document_type: 'Onboarding',
    expires_on: '',
    status: 'ACTIVE',
    notes: '',
  });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [ptoImpact, setPtoImpact] = useState<PtoImpactSummary>({ assignments: [], impactedPeriods: [] });

  const staffById = useMemo(() => new Map(staff.map((row) => [row.id, row])), [staff]);
  const badgeById = useMemo(() => new Map(badges.map((row) => [row.id, row])), [badges]);
  const fileById = useMemo(() => new Map(files.map((row) => [row.id, row])), [files]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const nextTenantId = (authData.user?.app_metadata?.tenant_id as string | undefined) ?? null;
    setTenantId(nextTenantId);

    const [staffRes, ptoRes, reviewRes, goalsRes, badgesRes, staffBadgesRes, docsRes, filesRes] = await Promise.all([
      supabase
        .from('staff')
        .select('id, staff_code, full_name')
        .is('archived_at', null)
        .order('full_name', { ascending: true })
        .limit(2000),
      supabase
        .from('hr_pto_requests')
        .select('id, staff_id, start_date, end_date, hours_requested, reason, status, created_at')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(250),
      supabase
        .from('hr_performance_reviews')
        .select('id, staff_id, reviewer_staff_id, review_period_start, review_period_end, overall_score, summary, status, reviewed_at, created_at')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(250),
      supabase
        .from('hr_goals')
        .select('id, staff_id, title, target_date, progress_pct, status, created_at')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(400),
      supabase
        .from('hr_badges')
        .select('id, name, color, is_active')
        .is('archived_at', null)
        .order('name', { ascending: true })
        .limit(500),
      supabase
        .from('hr_staff_badges')
        .select('id, staff_id, badge_id, awarded_at, notes')
        .is('archived_at', null)
        .order('awarded_at', { ascending: false })
        .limit(400),
      supabase
        .from('hr_staff_documents')
        .select('id, staff_id, file_id, document_type, expires_on, status, notes, created_at')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(400),
      supabase
        .from('files')
        .select('id, bucket, storage_path, original_filename')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(1000),
    ]);

    const errors = [
      staffRes.error,
      ptoRes.error,
      reviewRes.error,
      goalsRes.error,
      badgesRes.error,
      staffBadgesRes.error,
      docsRes.error,
      filesRes.error,
    ].filter(Boolean);
    if (errors.length > 0) {
      toast.error(errors[0]?.message ?? 'Failed loading HR data');
    }

    const staffRows = (staffRes.data ?? []) as StaffRow[];
    setStaff(staffRows);
    setPto((ptoRes.data ?? []) as HrPtoRow[]);
    setReviews((reviewRes.data ?? []) as HrReviewRow[]);
    setGoals((goalsRes.data ?? []) as HrGoalRow[]);
    setBadges((badgesRes.data ?? []) as HrBadgeRow[]);
    setStaffBadges((staffBadgesRes.data ?? []) as HrStaffBadgeRow[]);
    setDocuments((docsRes.data ?? []) as HrDocumentRow[]);
    setFiles((filesRes.data ?? []) as FileRow[]);

    const firstStaffId = staffRows[0]?.id ?? '';
    const firstBadgeId = (((badgesRes.data ?? [])[0] as HrBadgeRow | undefined)?.id) ?? '';
    setPtoForm((prev) => ({ ...prev, staff_id: prev.staff_id || firstStaffId }));
    setReviewForm((prev) => ({ ...prev, staff_id: prev.staff_id || firstStaffId, reviewer_staff_id: prev.reviewer_staff_id || firstStaffId }));
    setGoalForm((prev) => ({ ...prev, staff_id: prev.staff_id || firstStaffId }));
    setAwardForm((prev) => ({ ...prev, staff_id: prev.staff_id || firstStaffId, badge_id: prev.badge_id || firstBadgeId }));
    setDocumentForm((prev) => ({ ...prev, staff_id: prev.staff_id || firstStaffId }));

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const loadPtoImpact = useCallback(async () => {
    if (!ptoForm.staff_id || !ptoForm.start_date || !ptoForm.end_date) {
      setPtoImpact({ assignments: [], impactedPeriods: [] });
      return;
    }

    const { data, error } = await supabase
      .from('ticket_assignments')
      .select(`
        id,
        assignment_status,
        ticket:ticket_id!inner(
          id, ticket_code, scheduled_date, start_time, end_time, schedule_period_id,
          site:site_id(name),
          period:schedule_period_id(id, period_name, status)
        )
      `)
      .eq('staff_id', ptoForm.staff_id)
      .is('archived_at', null)
      .gte('ticket.scheduled_date', ptoForm.start_date)
      .lte('ticket.scheduled_date', ptoForm.end_date);

    if (error) {
      setPtoImpact({ assignments: [], impactedPeriods: [] });
      return;
    }

    const assignments = ((data ?? []) as unknown as Array<{
      assignment_status?: string | null;
      ticket?: {
        id?: string;
        ticket_code?: string;
        scheduled_date?: string;
        start_time?: string | null;
        end_time?: string | null;
        schedule_period_id?: string | null;
        site?: { name?: string | null } | { name?: string | null }[] | null;
        period?: { id?: string; period_name?: string | null; status?: string | null } | { id?: string; period_name?: string | null; status?: string | null }[] | null;
      } | {
        id?: string;
        ticket_code?: string;
        scheduled_date?: string;
        start_time?: string | null;
        end_time?: string | null;
        schedule_period_id?: string | null;
        site?: { name?: string | null } | { name?: string | null }[] | null;
        period?: { id?: string; period_name?: string | null; status?: string | null } | { id?: string; period_name?: string | null; status?: string | null }[] | null;
      }[] | null;
    }>)
      .filter((row) => (row.assignment_status ?? 'ASSIGNED') === 'ASSIGNED')
      .map((row) => {
        const ticket = Array.isArray(row.ticket) ? row.ticket[0] : row.ticket;
        const site = ticket?.site;
        const period = ticket?.period;
        const normalizedSite = Array.isArray(site) ? site[0] : site;
        const normalizedPeriod = Array.isArray(period) ? period[0] : period;

        return {
          ticket_id: ticket?.id ?? '',
          ticket_code: ticket?.ticket_code ?? '—',
          scheduled_date: ticket?.scheduled_date ?? '',
          start_time: ticket?.start_time ?? null,
          end_time: ticket?.end_time ?? null,
          site_name: normalizedSite?.name ?? null,
          period_id: normalizedPeriod?.id ?? ticket?.schedule_period_id ?? null,
          period_name: normalizedPeriod?.period_name ?? null,
          period_status: normalizedPeriod?.status ?? null,
        };
      })
      .filter((row) => row.ticket_id)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

    const periodMap = new Map<string, { id: string; name: string; status: string }>();
    for (const assignment of assignments) {
      if (!assignment.period_id) continue;
      if (!periodMap.has(assignment.period_id)) {
        periodMap.set(assignment.period_id, {
          id: assignment.period_id,
          name: assignment.period_name ?? assignment.period_id,
          status: assignment.period_status ?? 'UNKNOWN',
        });
      }
    }

    setPtoImpact({
      assignments,
      impactedPeriods: Array.from(periodMap.values()),
    });
  }, [ptoForm.end_date, ptoForm.staff_id, ptoForm.start_date, supabase]);

  useEffect(() => {
    void loadPtoImpact();
  }, [loadPtoImpact]);

  const filteredPto = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pto;
    return pto.filter((row) => {
      const person = displayName(staffById.get(row.staff_id)).toLowerCase();
      return person.includes(q) || row.status.toLowerCase().includes(q) || (row.reason ?? '').toLowerCase().includes(q);
    });
  }, [pto, search, staffById]);

  const filteredReviews = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter((row) => {
      const person = displayName(staffById.get(row.staff_id)).toLowerCase();
      return person.includes(q) || row.status.toLowerCase().includes(q) || (row.summary ?? '').toLowerCase().includes(q);
    });
  }, [reviews, search, staffById]);

  const filteredGoals = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return goals;
    return goals.filter((row) => {
      const person = displayName(staffById.get(row.staff_id)).toLowerCase();
      return person.includes(q) || row.status.toLowerCase().includes(q) || row.title.toLowerCase().includes(q);
    });
  }, [goals, search, staffById]);

  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((row) => {
      const person = displayName(staffById.get(row.staff_id)).toLowerCase();
      const fileName = fileById.get(row.file_id)?.original_filename?.toLowerCase() ?? '';
      return person.includes(q) || row.status.toLowerCase().includes(q) || row.document_type.toLowerCase().includes(q) || fileName.includes(q);
    });
  }, [documents, search, staffById, fileById]);

  const pendingPto = pto.filter((row) => row.status === 'PENDING').length;
  const activeGoals = goals.filter((row) => ['ACTIVE', 'ON_TRACK', 'AT_RISK'].includes(row.status)).length;
  const expiringDocs = documents.filter((row) => row.status === 'EXPIRING').length;
  const submittedReviews = reviews.filter((row) => row.status === 'SUBMITTED').length;
  const exportRows = useMemo(() => {
    return [
      ...pto.map((row) => ({
        record_type: 'PTO_REQUEST',
        staff: displayName(staffById.get(row.staff_id)),
        status: row.status,
        start_date: row.start_date,
        end_date: row.end_date,
        hours_requested: row.hours_requested,
        title: row.reason ?? '',
      })),
      ...reviews.map((row) => ({
        record_type: 'PERFORMANCE_REVIEW',
        staff: displayName(staffById.get(row.staff_id)),
        status: row.status,
        start_date: row.review_period_start ?? '',
        end_date: row.review_period_end ?? '',
        hours_requested: '',
        title: row.summary ?? '',
      })),
      ...goals.map((row) => ({
        record_type: 'GOAL',
        staff: displayName(staffById.get(row.staff_id)),
        status: row.status,
        start_date: '',
        end_date: row.target_date ?? '',
        hours_requested: '',
        title: row.title,
      })),
      ...documents.map((row) => ({
        record_type: 'DOCUMENT',
        staff: displayName(staffById.get(row.staff_id)),
        status: row.status,
        start_date: row.created_at,
        end_date: row.expires_on ?? '',
        hours_requested: '',
        title: row.document_type,
      })),
    ];
  }, [documents, goals, pto, reviews, staffById]);

  const withSubmit = useCallback(async (action: () => Promise<void>) => {
    if (!tenantId) {
      toast.error('Tenant context missing. Please re-authenticate.');
      return;
    }
    setSubmitting(true);
    try {
      await action();
      await load();
      setDrawer(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }, [load, tenantId]);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { authorization: `Bearer ${token}` } : {};
  }, [supabase]);

  const postHrEntity = useCallback(async (entity: string, body: Record<string, unknown>) => {
    const queuedResult = await executeWithOfflineQueue({
      url: `/api/workforce/hr/${entity}`,
      method: 'POST',
      headers: await authHeaders(),
      body,
    });

    if (queuedResult.queued) return { queued: true } as const;
    const response = queuedResult.response as Response;
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.success !== true) {
      throw new Error(payload?.detail || payload?.error || `Failed to save ${entity}`);
    }
    return { queued: false } as const;
  }, [authHeaders]);

  const createPto = useCallback(async () => {
    if (!ptoForm.staff_id) throw new Error('Staff is required');
    if (!ptoForm.start_date || !ptoForm.end_date) throw new Error('Start and end dates are required');
    const hours = Number(ptoForm.hours_requested);
    if (!Number.isFinite(hours) || hours < 0) throw new Error('Hours requested must be a valid number');

    const result = await postHrEntity('pto-requests', {
      staff_id: ptoForm.staff_id,
      start_date: ptoForm.start_date,
      end_date: ptoForm.end_date,
      hours_requested: hours,
      reason: ptoForm.reason || null,
      status: 'PENDING',
    });
    const impactSuffix = ptoImpact.assignments.length > 0 ? ` (${ptoImpact.assignments.length} scheduled shift(s) in range)` : '';
    toast[result.queued ? 'info' : 'success'](
      result.queued ? `PTO request queued for sync${impactSuffix}.` : `PTO request created${impactSuffix}.`
    );
  }, [postHrEntity, ptoForm, ptoImpact.assignments.length]);

  const createReview = useCallback(async () => {
    if (!reviewForm.staff_id) throw new Error('Staff is required');
    const overall = reviewForm.overall_score ? Number(reviewForm.overall_score) : null;
    if (overall != null && (!Number.isFinite(overall) || overall < 0 || overall > 5)) {
      throw new Error('Overall score must be between 0 and 5');
    }
    const result = await postHrEntity('performance-reviews', {
      staff_id: reviewForm.staff_id,
      reviewer_staff_id: reviewForm.reviewer_staff_id || null,
      review_period_start: reviewForm.review_period_start || null,
      review_period_end: reviewForm.review_period_end || null,
      overall_score: overall,
      summary: reviewForm.summary || null,
      status: reviewForm.status,
    });
    toast[result.queued ? 'info' : 'success'](result.queued ? 'Review queued for sync.' : 'Performance review created');
  }, [postHrEntity, reviewForm]);

  const createGoal = useCallback(async () => {
    if (!goalForm.staff_id) throw new Error('Staff is required');
    if (!goalForm.title.trim()) throw new Error('Goal title is required');
    const progress = Number(goalForm.progress_pct);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) throw new Error('Progress must be between 0 and 100');

    const { data: authData } = await supabase.auth.getUser();
    const result = await postHrEntity('goals', {
      staff_id: goalForm.staff_id,
      title: goalForm.title.trim(),
      target_date: goalForm.target_date || null,
      progress_pct: progress,
      status: goalForm.status,
      created_by_user_id: authData.user?.id ?? null,
    });
    toast[result.queued ? 'info' : 'success'](result.queued ? 'Goal queued for sync.' : 'Goal created');
  }, [goalForm, postHrEntity, supabase]);

  const createBadge = useCallback(async () => {
    if (!badgeForm.name.trim()) throw new Error('Badge name is required');
    const result = await postHrEntity('badges', {
      name: badgeForm.name.trim(),
      color: badgeForm.color || null,
      is_active: badgeForm.is_active,
    });
    toast[result.queued ? 'info' : 'success'](result.queued ? 'Badge creation queued for sync.' : 'Badge created');
  }, [badgeForm, postHrEntity]);

  const awardBadge = useCallback(async () => {
    if (!awardForm.staff_id || !awardForm.badge_id) throw new Error('Staff and badge are required');
    const { data: authData } = await supabase.auth.getUser();
    const result = await postHrEntity('staff-badges', {
      staff_id: awardForm.staff_id,
      badge_id: awardForm.badge_id,
      awarded_by_user_id: authData.user?.id ?? null,
      notes: awardForm.notes || null,
    });
    toast[result.queued ? 'info' : 'success'](result.queued ? 'Badge award queued for sync.' : 'Badge awarded');
  }, [awardForm, postHrEntity, supabase]);

  const createDocument = useCallback(async () => {
    if (!documentForm.staff_id) throw new Error('Staff is required');
    if (!documentFile) throw new Error('Select a document file');

    const filename = `${Date.now()}-${documentFile.name.replace(/\s+/g, '-').toLowerCase()}`;
    const path = `hr-docs/${tenantId}/${documentForm.staff_id}/${filename}`;
    const upload = await uploadToStorage({
      supabase,
      bucket: 'documents',
      path,
      file: documentFile,
      tenantId: tenantId as string,
      entityType: 'hr_staff_documents',
      entityId: documentForm.staff_id,
    });

    const result = await postHrEntity('staff-documents', {
      staff_id: documentForm.staff_id,
      file_id: upload.fileId,
      document_type: documentForm.document_type,
      expires_on: documentForm.expires_on || null,
      status: documentForm.status,
      notes: documentForm.notes || null,
    });
    toast[result.queued ? 'info' : 'success'](result.queued ? 'Document record queued for sync.' : 'Document record created');
  }, [documentFile, documentForm, postHrEntity, supabase, tenantId]);

  const awardRows = useMemo(() => {
    return staffBadges.slice(0, 12).map((entry) => ({
      ...entry,
      staffName: displayName(staffById.get(entry.staff_id)),
      badgeName: badgeById.get(entry.badge_id)?.name ?? 'Unknown Badge',
      badgeColor: badgeById.get(entry.badge_id)?.color ?? null,
    }));
  }, [staffBadges, staffById, badgeById]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
          Print PDF
        </Button>
        <ExportButton<Record<string, unknown>> data={exportRows as unknown as Record<string, unknown>[]} filename="workforce-hr-lite" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pending PTO</p><p className="text-xl font-semibold">{pendingPto}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Goals</p><p className="text-xl font-semibold">{activeGoals}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Submitted Reviews</p><p className="text-xl font-semibold">{submittedReviews}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Expiring Docs</p><p className="text-xl font-semibold text-warning">{expiringDocs}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold"><UserRoundCheck className="h-4 w-4" /> PTO Requests</div>
            <Button size="sm" onClick={() => setDrawer('pto')}><Plus className="h-4 w-4" /> New</Button>
          </CardHeader>
          <CardContent className="w-full overflow-x-auto">
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead>Staff</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {(loading ? [] : filteredPto.slice(0, 8)).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{displayName(staffById.get(row.staff_id))}</TableCell>
                    <TableCell>{formatDate(row.start_date)} - {formatDate(row.end_date)}</TableCell>
                    <TableCell>{row.hours_requested}</TableCell>
                    <TableCell><Badge color={statusColor(row.status)}>{row.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" /> Performance Reviews</div>
            <Button size="sm" onClick={() => setDrawer('review')}><Plus className="h-4 w-4" /> New</Button>
          </CardHeader>
          <CardContent className="w-full overflow-x-auto">
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead>Staff</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {(loading ? [] : filteredReviews.slice(0, 8)).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{displayName(staffById.get(row.staff_id))}</TableCell>
                    <TableCell>{formatDate(row.review_period_start)} - {formatDate(row.review_period_end)}</TableCell>
                    <TableCell>{row.overall_score ?? '—'}</TableCell>
                    <TableCell><Badge color={statusColor(row.status)}>{row.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold"><Flag className="h-4 w-4" /> Goals</div>
            <Button size="sm" onClick={() => setDrawer('goal')}><Plus className="h-4 w-4" /> New</Button>
          </CardHeader>
          <CardContent className="w-full overflow-x-auto">
            <Table className="w-full min-w-full">
              <TableHeader>
                <tr>
                  <TableHead>Staff</TableHead>
                  <TableHead>Goal</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {(loading ? [] : filteredGoals.slice(0, 8)).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{displayName(staffById.get(row.staff_id))}</TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell>{formatDate(row.target_date)}</TableCell>
                    <TableCell>{Number(row.progress_pct).toFixed(0)}%</TableCell>
                    <TableCell><Badge color={statusColor(row.status)}>{row.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold"><Award className="h-4 w-4" /> Badges & Awards</div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDrawer('badge')}><Plus className="h-4 w-4" /> Badge</Button>
              <Button size="sm" onClick={() => setDrawer('award')}><Plus className="h-4 w-4" /> Award</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {badges.slice(0, 10).map((badgeRow) => (
                <span
                  key={badgeRow.id}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: badgeRow.color || '#2563eb', opacity: badgeRow.is_active ? 1 : 0.5 }}
                >
                  {badgeRow.name}
                </span>
              ))}
            </div>
            <div className="space-y-2 text-sm">
              {awardRows.length === 0 ? (
                <p className="text-muted-foreground">No awards yet.</p>
              ) : awardRows.map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div>
                    <p className="font-medium">{row.staffName}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(row.awarded_at)}</p>
                  </div>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: row.badgeColor || '#2563eb' }}
                  >
                    {row.badgeName}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4" /> Employee Documents Vault</div>
          <Button size="sm" onClick={() => setDrawer('document')}><Plus className="h-4 w-4" /> Add Document</Button>
        </CardHeader>
        <CardContent className="w-full overflow-x-auto">
          <Table className="w-full min-w-full">
            <TableHeader>
              <tr>
                <TableHead>Staff</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {(loading ? [] : filteredDocuments.slice(0, 16)).map((row) => {
                const file = fileById.get(row.file_id);
                const fileName = file?.original_filename ?? row.file_id;
                const fileUrl = file ? supabase.storage.from(file.bucket).getPublicUrl(file.storage_path).data.publicUrl : null;
                return (
                  <TableRow key={row.id}>
                    <TableCell>{displayName(staffById.get(row.staff_id))}</TableCell>
                    <TableCell>{row.document_type}</TableCell>
                    <TableCell>
                      {fileUrl ? (
                        <a href={fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
                          {fileName}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{fileName}</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(row.expires_on)}</TableCell>
                    <TableCell><Badge color={statusColor(row.status)}>{row.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SlideOver open={drawer === 'pto'} onClose={() => setDrawer(null)} title="New PTO Request">
        <div className="space-y-3">
          <label className="text-sm font-medium">Staff</label>
          <select className="w-full rounded border bg-background px-2 py-2 text-sm" value={ptoForm.staff_id} onChange={(event) => setPtoForm((prev) => ({ ...prev, staff_id: event.target.value }))}>
            {staff.map((row) => <option key={row.id} value={row.id}>{displayName(row)}</option>)}
          </select>
          <label className="text-sm font-medium">Start Date</label>
          <Input type="date" value={ptoForm.start_date} onChange={(event) => setPtoForm((prev) => ({ ...prev, start_date: event.target.value }))} />
          <label className="text-sm font-medium">End Date</label>
          <Input type="date" value={ptoForm.end_date} onChange={(event) => setPtoForm((prev) => ({ ...prev, end_date: event.target.value }))} />
          <label className="text-sm font-medium">Hours Requested</label>
          <Input type="number" min={0} step={0.25} value={ptoForm.hours_requested} onChange={(event) => setPtoForm((prev) => ({ ...prev, hours_requested: event.target.value }))} />
          <label className="text-sm font-medium">Reason</label>
          <Textarea value={ptoForm.reason} onChange={(event) => setPtoForm((prev) => ({ ...prev, reason: event.target.value }))} rows={3} />
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <p className="font-semibold text-foreground">Schedule Impact Preview</p>
            <p className="mt-1 text-muted-foreground">
              {ptoImpact.assignments.length} assigned shift(s) fall inside this PTO window.
            </p>
            {ptoImpact.impactedPeriods.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {ptoImpact.impactedPeriods.map((period) => (
                  <span key={period.id} className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                    {period.name} ({period.status})
                  </span>
                ))}
              </div>
            ) : null}
            {ptoImpact.assignments.slice(0, 4).map((assignment) => (
              <p key={assignment.ticket_id} className="mt-1 text-muted-foreground">
                {assignment.ticket_code} · {formatDate(assignment.scheduled_date)} {assignment.start_time ? `${assignment.start_time}-${assignment.end_time ?? ''}` : ''} {assignment.site_name ? `· ${assignment.site_name}` : ''}
              </p>
            ))}
            {ptoImpact.assignments.length > 4 ? (
              <p className="mt-1 text-muted-foreground">+{ptoImpact.assignments.length - 4} more shift(s)</p>
            ) : null}
          </div>
          <Button disabled={submitting} onClick={() => withSubmit(createPto)}>Create PTO Request</Button>
        </div>
      </SlideOver>

      <SlideOver open={drawer === 'review'} onClose={() => setDrawer(null)} title="New Performance Review">
        <div className="space-y-3">
          <label className="text-sm font-medium">Staff</label>
          <select className="w-full rounded border bg-background px-2 py-2 text-sm" value={reviewForm.staff_id} onChange={(event) => setReviewForm((prev) => ({ ...prev, staff_id: event.target.value }))}>
            {staff.map((row) => <option key={row.id} value={row.id}>{displayName(row)}</option>)}
          </select>
          <label className="text-sm font-medium">Reviewer</label>
          <select className="w-full rounded border bg-background px-2 py-2 text-sm" value={reviewForm.reviewer_staff_id} onChange={(event) => setReviewForm((prev) => ({ ...prev, reviewer_staff_id: event.target.value }))}>
            <option value="">None</option>
            {staff.map((row) => <option key={row.id} value={row.id}>{displayName(row)}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Period Start</label>
              <Input type="date" value={reviewForm.review_period_start} onChange={(event) => setReviewForm((prev) => ({ ...prev, review_period_start: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Period End</label>
              <Input type="date" value={reviewForm.review_period_end} onChange={(event) => setReviewForm((prev) => ({ ...prev, review_period_end: event.target.value }))} />
            </div>
          </div>
          <label className="text-sm font-medium">Overall Score (0-5)</label>
          <Input type="number" min={0} max={5} step={0.1} value={reviewForm.overall_score} onChange={(event) => setReviewForm((prev) => ({ ...prev, overall_score: event.target.value }))} />
          <label className="text-sm font-medium">Status</label>
          <select className="w-full rounded border bg-background px-2 py-2 text-sm" value={reviewForm.status} onChange={(event) => setReviewForm((prev) => ({ ...prev, status: event.target.value }))}>
            <option value="DRAFT">DRAFT</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
          <label className="text-sm font-medium">Summary</label>
          <Textarea value={reviewForm.summary} onChange={(event) => setReviewForm((prev) => ({ ...prev, summary: event.target.value }))} rows={4} />
          <Button disabled={submitting} onClick={() => withSubmit(createReview)}>Create Review</Button>
        </div>
      </SlideOver>

      <SlideOver open={drawer === 'goal'} onClose={() => setDrawer(null)} title="New Goal">
        <div className="space-y-3">
          <label className="text-sm font-medium">Staff</label>
          <select className="w-full rounded border bg-background px-2 py-2 text-sm" value={goalForm.staff_id} onChange={(event) => setGoalForm((prev) => ({ ...prev, staff_id: event.target.value }))}>
            {staff.map((row) => <option key={row.id} value={row.id}>{displayName(row)}</option>)}
          </select>
          <label className="text-sm font-medium">Title</label>
          <Input value={goalForm.title} onChange={(event) => setGoalForm((prev) => ({ ...prev, title: event.target.value }))} />
          <label className="text-sm font-medium">Target Date</label>
          <Input type="date" value={goalForm.target_date} onChange={(event) => setGoalForm((prev) => ({ ...prev, target_date: event.target.value }))} />
          <label className="text-sm font-medium">Progress %</label>
          <Input type="number" min={0} max={100} step={1} value={goalForm.progress_pct} onChange={(event) => setGoalForm((prev) => ({ ...prev, progress_pct: event.target.value }))} />
          <label className="text-sm font-medium">Status</label>
          <select className="w-full rounded border bg-background px-2 py-2 text-sm" value={goalForm.status} onChange={(event) => setGoalForm((prev) => ({ ...prev, status: event.target.value }))}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ON_TRACK">ON_TRACK</option>
            <option value="AT_RISK">AT_RISK</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELED">CANCELED</option>
          </select>
          <Button disabled={submitting} onClick={() => withSubmit(createGoal)}>Create Goal</Button>
        </div>
      </SlideOver>

      <SlideOver open={drawer === 'badge'} onClose={() => setDrawer(null)} title="Create Badge">
        <div className="space-y-3">
          <label className="text-sm font-medium">Name</label>
          <Input value={badgeForm.name} onChange={(event) => setBadgeForm((prev) => ({ ...prev, name: event.target.value }))} />
          <label className="text-sm font-medium">Color</label>
          <Input type="color" value={badgeForm.color} onChange={(event) => setBadgeForm((prev) => ({ ...prev, color: event.target.value }))} />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={badgeForm.is_active} onChange={(event) => setBadgeForm((prev) => ({ ...prev, is_active: event.target.checked }))} />
            Active
          </label>
          <Button disabled={submitting} onClick={() => withSubmit(createBadge)}>Create Badge</Button>
        </div>
      </SlideOver>

      <SlideOver open={drawer === 'award'} onClose={() => setDrawer(null)} title="Award Badge">
        <div className="space-y-3">
          <label className="text-sm font-medium">Staff</label>
          <select className="w-full rounded border bg-background px-2 py-2 text-sm" value={awardForm.staff_id} onChange={(event) => setAwardForm((prev) => ({ ...prev, staff_id: event.target.value }))}>
            {staff.map((row) => <option key={row.id} value={row.id}>{displayName(row)}</option>)}
          </select>
          <label className="text-sm font-medium">Badge</label>
          <select className="w-full rounded border bg-background px-2 py-2 text-sm" value={awardForm.badge_id} onChange={(event) => setAwardForm((prev) => ({ ...prev, badge_id: event.target.value }))}>
            {badges.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <label className="text-sm font-medium">Notes</label>
          <Textarea value={awardForm.notes} onChange={(event) => setAwardForm((prev) => ({ ...prev, notes: event.target.value }))} rows={3} />
          <Button disabled={submitting} onClick={() => withSubmit(awardBadge)}>Award</Button>
        </div>
      </SlideOver>

      <SlideOver open={drawer === 'document'} onClose={() => setDrawer(null)} title="Add Staff Document">
        <div className="space-y-3">
          <label className="text-sm font-medium">Staff</label>
          <select className="w-full rounded border bg-background px-2 py-2 text-sm" value={documentForm.staff_id} onChange={(event) => setDocumentForm((prev) => ({ ...prev, staff_id: event.target.value }))}>
            {staff.map((row) => <option key={row.id} value={row.id}>{displayName(row)}</option>)}
          </select>
          <label className="text-sm font-medium">Document Type</label>
          <Input value={documentForm.document_type} onChange={(event) => setDocumentForm((prev) => ({ ...prev, document_type: event.target.value }))} />
          <label className="text-sm font-medium">Expires On</label>
          <Input type="date" value={documentForm.expires_on} onChange={(event) => setDocumentForm((prev) => ({ ...prev, expires_on: event.target.value }))} />
          <label className="text-sm font-medium">Status</label>
          <select className="w-full rounded border bg-background px-2 py-2 text-sm" value={documentForm.status} onChange={(event) => setDocumentForm((prev) => ({ ...prev, status: event.target.value as HrDocumentRow['status'] }))}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="EXPIRING">EXPIRING</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="REVOKED">REVOKED</option>
          </select>
          <label className="text-sm font-medium">Upload File</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} className="w-full rounded border border-border bg-background px-2 py-2 text-sm" />
          <label className="text-sm font-medium">Notes</label>
          <Textarea value={documentForm.notes} onChange={(event) => setDocumentForm((prev) => ({ ...prev, notes: event.target.value }))} rows={3} />
          <Button disabled={submitting} onClick={() => withSubmit(createDocument)}>Create Document Record</Button>
        </div>
      </SlideOver>
    </div>
  );
}
