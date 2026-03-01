'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Pencil,
  PauseCircle,
  PlayCircle,
  Users,
  Palette,
  Building2,
  DollarSign,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@gleamops/ui';
import type { StaffPosition } from '@gleamops/shared';
import { PositionForm } from '@/components/forms/position-form';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';
import { StatusToggleDialog } from '@/components/detail/status-toggle-dialog';
import { EntityLink } from '@/components/links/entity-link';

interface EligibleStaffRow {
  staff_id: string;
  position_code: string;
  is_primary: boolean;
  staff?: { full_name: string; staff_code: string; staff_status: string | null } | null;
}

function formatDate(d: string | null | undefined) {
  if (!d) return 'Not Set';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PositionDetailPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [position, setPosition] = useState<StaffPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [eligibleStaff, setEligibleStaff] = useState<EligibleStaffRow[]>([]);

  const fetchData = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const decodedCode = decodeURIComponent(code);

    // Try by position_code first, then by id
    const { data: byCode } = await supabase
      .from('staff_positions')
      .select('*')
      .eq('position_code', decodedCode)
      .maybeSingle();

    const posRow = byCode ?? (await supabase
      .from('staff_positions')
      .select('*')
      .eq('id', decodedCode)
      .maybeSingle()).data;

    if (!posRow) {
      setLoading(false);
      return;
    }

    const pos = posRow as StaffPosition;
    setPosition(pos);

    // Fetch eligible staff
    const { data: eligRows } = await supabase
      .from('staff_eligible_positions')
      .select('staff_id, position_code, is_primary, staff:staff_id(full_name, staff_code, staff_status)')
      .eq('position_code', pos.position_code)
      .is('archived_at', null);

    setEligibleStaff((eligRows ?? []) as unknown as EligibleStaffRow[]);
    setLoading(false);
  }, [code]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="space-y-4 p-6">
        <Link href="/team?tab=positions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Team
        </Link>
        <p className="text-muted-foreground">Position not found.</p>
      </div>
    );
  }

  const isInactive = !position.is_active;
  const updatedAgo = position.updated_at
    ? `${Math.round((Date.now() - new Date(position.updated_at).getTime()) / 86400000)}d ago`
    : '';

  const colorPreviewStyle: React.CSSProperties = {
    backgroundColor: `var(--color-${position.color_token}-200, #94a3b8)`,
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/team?tab=positions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Team
      </Link>

      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground">
        <Link href="/home" className="hover:text-foreground">Home</Link>
        {' › '}
        <Link href="/team" className="hover:text-foreground">Team</Link>
        {' › '}
        <Link href="/team?tab=positions" className="hover:text-foreground">Positions</Link>
        {' › '}
        <span className="text-foreground">{position.position_code}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center border-2"
            style={{
              ...colorPreviewStyle,
              borderColor: `var(--color-${position.color_token}-400, #94a3b8)`,
            }}
          >
            <BriefcaseBusiness className="h-6 w-6 text-foreground/70" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{position.title}</h1>
            <p className="text-sm text-muted-foreground">{position.position_code}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge color={isInactive ? 'gray' : 'green'}>
            {isInactive ? 'Inactive' : 'Active'}
          </Badge>
          {updatedAgo && <Badge color="gray">{`Updated ${updatedAgo}`}</Badge>}
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            className={isInactive
              ? 'inline-flex items-center gap-2 rounded-lg border border-green-300 px-3.5 py-2 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors'
              : 'inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-3.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors'}
          >
            {isInactive ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
            {isInactive ? 'Reactivate' : 'Deactivate'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Staff Assigned</p>
            <p className="text-xl font-semibold">{eligibleStaff.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Color Token</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-5 w-5 rounded-full border" style={colorPreviewStyle} />
              <p className="text-sm font-medium capitalize">{position.color_token}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Department</p>
            <p className="text-xl font-semibold">{position.department || <span className="text-muted-foreground text-sm">Not Set</span>}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Pay Grade</p>
            <p className="text-xl font-semibold">{position.pay_grade || <span className="text-muted-foreground text-sm">Not Set</span>}</p>
          </CardContent>
        </Card>
      </div>

      {/* Position Details Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4" /> Position Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Position Code</dt>
                <dd className="font-mono font-medium">{position.position_code}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Title</dt>
                <dd className="font-medium">{position.title}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> Department</dt>
                <dd className="font-medium">{position.department || <span className="italic text-muted-foreground">Not Set</span>}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground inline-flex items-center gap-1"><DollarSign className="h-3 w-3" /> Pay Grade</dt>
                <dd className="font-medium">{position.pay_grade || <span className="italic text-muted-foreground">Not Set</span>}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground inline-flex items-center gap-1"><Palette className="h-3 w-3" /> Schedule Color</dt>
                <dd className="font-medium flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border" style={colorPreviewStyle} />
                  <span className="capitalize">{position.color_token}</span>
                </dd>
              </div>
              {position.notes && (
                <div className="pt-2 border-t border-border">
                  <dt className="text-muted-foreground mb-1">Notes</dt>
                  <dd className="text-foreground whitespace-pre-wrap">{position.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Eligible Staff Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Eligible Staff ({eligibleStaff.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eligibleStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No staff assigned to this position.</p>
            ) : (
              <ul className="space-y-2">
                {eligibleStaff.map((row) => (
                  <li key={row.staff_id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <EntityLink
                        entityType="staff"
                        code={row.staff?.staff_code ?? null}
                        name={row.staff?.full_name ?? 'Unknown'}
                      />
                      {row.is_primary && (
                        <Badge color="blue" className="text-[10px]">Primary</Badge>
                      )}
                    </div>
                    <Badge color={row.staff?.staff_status === 'ACTIVE' ? 'green' : 'gray'}>
                      {row.staff?.staff_status ?? 'N/A'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity History */}
      <ActivityHistorySection
        entityType="staff_positions"
        entityId={position.id}
      />

      {/* Metadata footer */}
      <div className="text-xs text-muted-foreground border-t border-border pt-4">
        <p>Created {formatDate(position.created_at)} &middot; Last updated {formatDate(position.updated_at)}</p>
      </div>

      {/* Edit Form */}
      <PositionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={position}
        onSuccess={() => fetchData()}
      />

      {/* Deactivate / Reactivate */}
      <StatusToggleDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        entityLabel="Position"
        entityName={position.title}
        mode={position.is_active ? 'deactivate' : 'reactivate'}
        onConfirm={async () => {
          const supabase = getSupabaseBrowserClient();
          await supabase
            .from('staff_positions')
            .update({ is_active: !position.is_active })
            .eq('id', position.id)
            .eq('version_etag', position.version_etag);
          setArchiveOpen(false);
          fetchData();
        }}
      />
    </div>
  );
}
