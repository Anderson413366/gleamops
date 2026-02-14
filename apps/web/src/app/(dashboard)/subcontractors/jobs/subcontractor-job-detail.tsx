'use client';

import { Briefcase, Building2, MapPin, Calendar, DollarSign, Star, FileText } from 'lucide-react';
import { SlideOver, Badge, Button, Card, CardContent } from '@gleamops/ui';
import type { SubcontractorJobAssignment } from '@gleamops/shared';
import { formatDate } from '@/lib/utils/date';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
  ACTIVE: 'green',
  COMPLETED: 'green',
  SUSPENDED: 'yellow',
  CANCELED: 'gray',
};

const BILLING_LABELS: Record<string, string> = {
  HOURLY: 'Hourly',
  PER_SERVICE: 'Per Service',
  FLAT_MONTHLY: 'Flat Monthly',
  PER_SQFT: 'Per Sq Ft',
};

function formatCurrency(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

interface SubcontractorJobDetailProps {
  assignment: SubcontractorJobAssignment | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (item: SubcontractorJobAssignment) => void;
  onRefresh?: () => void;
}

export function SubcontractorJobDetail({ assignment, open, onClose, onEdit, onRefresh }: SubcontractorJobDetailProps) {
  if (!assignment) return null;

  const handleArchive = async () => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from('subcontractor_jobs')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', assignment.id);
    if (error) {
      toast.error('Failed to archive assignment');
      return;
    }
    toast.success('Assignment archived');
    onRefresh?.();
    onClose();
  };

  return (
    <SlideOver open={open} onClose={onClose} title={assignment.job_code} subtitle={assignment.subcontractor_name}>
      <div className="space-y-4">
        {/* Status + Actions */}
        <div className="flex items-center justify-between">
          <Badge color={STATUS_COLORS[assignment.status] ?? 'gray'}>{assignment.status}</Badge>
          <div className="flex gap-2">
            {onEdit && (
              <Button size="sm" variant="secondary" onClick={() => onEdit(assignment)}>
                Edit
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={handleArchive}>
              Archive
            </Button>
          </div>
        </div>

        {/* Subcontractor Info */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Subcontractor</p>
                <p className="text-sm font-medium">{assignment.subcontractor_name}</p>
                <p className="text-xs text-muted-foreground font-mono">{assignment.subcontractor_code}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job & Site Info */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-start gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Job</p>
                <p className="text-sm font-medium">{assignment.job_name ?? assignment.job_code}</p>
                <p className="text-xs text-muted-foreground font-mono">{assignment.job_code}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Site</p>
                <p className="text-sm font-medium">{assignment.site_name}</p>
                <p className="text-xs text-muted-foreground">{assignment.client_name} ({assignment.client_code})</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Details */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Billing Rate</p>
                  <p className="text-sm font-medium tabular-nums">{formatCurrency(assignment.billing_rate)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Billing Type</p>
                <p className="text-sm font-medium">{BILLING_LABELS[assignment.billing_type ?? ''] ?? assignment.billing_type ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="text-sm font-medium">{assignment.start_date ? formatDate(assignment.start_date) : '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">End Date</p>
                <p className="text-sm font-medium">{assignment.end_date ? formatDate(assignment.end_date) : '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance */}
        {assignment.performance_score != null && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <Star className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Performance Score</p>
                  <p className="text-sm font-bold">{assignment.performance_score.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scope */}
        {assignment.scope_description && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Scope Description</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{assignment.scope_description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timestamps */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
          <p>Created: {formatDate(assignment.created_at)}</p>
          <p>Updated: {formatDate(assignment.updated_at)}</p>
          {assignment.last_service_date && <p>Last service: {formatDate(assignment.last_service_date)}</p>}
        </div>
      </div>
    </SlideOver>
  );
}
