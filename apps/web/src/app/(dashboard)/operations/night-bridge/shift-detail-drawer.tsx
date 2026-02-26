'use client';

import { useMemo } from 'react';
import { Badge, Button, SlideOver, Textarea } from '@gleamops/ui';
import type { NightBridgeDetail } from '@gleamops/shared';

interface ShiftDetailDrawerProps {
  open: boolean;
  loading: boolean;
  saving: boolean;
  detail: NightBridgeDetail | null;
  reviewNotes: string;
  addToTomorrowEnabled: boolean;
  addToTomorrowSiteId: string;
  addToTomorrowDescription: string;
  onClose: () => void;
  onReviewNotesChange: (value: string) => void;
  onAddToTomorrowEnabledChange: (value: boolean) => void;
  onAddToTomorrowSiteChange: (value: string) => void;
  onAddToTomorrowDescriptionChange: (value: string) => void;
  onMarkReviewed: () => void;
  onNeedsFollowup: () => void;
}

function stopBadgeColor(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'green';
    case 'SKIPPED':
      return 'red';
    case 'ARRIVED':
      return 'blue';
    default:
      return 'gray';
  }
}

export function ShiftDetailDrawer({
  open,
  loading,
  saving,
  detail,
  reviewNotes,
  addToTomorrowEnabled,
  addToTomorrowSiteId,
  addToTomorrowDescription,
  onClose,
  onReviewNotesChange,
  onAddToTomorrowEnabledChange,
  onAddToTomorrowSiteChange,
  onAddToTomorrowDescriptionChange,
  onMarkReviewed,
  onNeedsFollowup,
}: ShiftDetailDrawerProps) {
  const siteOptions = useMemo(() => {
    if (!detail) return [];
    const seen = new Set<string>();
    return detail.stops
      .filter((stop) => !!stop.site_id)
      .filter((stop) => {
        if (!stop.site_id || seen.has(stop.site_id)) return false;
        seen.add(stop.site_id);
        return true;
      })
      .map((stop) => ({
        site_id: stop.site_id as string,
        site_name: stop.site_name,
      }));
  }, [detail]);

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Shift Summary"
      subtitle={detail ? `${detail.summary.floater_name ?? detail.summary.floater_code ?? 'Floater'} • ${new Date(`${detail.summary.route_date}T00:00:00`).toLocaleDateString()}` : undefined}
      wide
    >
      {loading ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Loading shift detail...</p>
          <p className="text-xs text-muted-foreground">Fetching stops, tasks, issues, and photos.</p>
        </div>
      ) : !detail ? (
        <p className="text-sm text-muted-foreground">Shift detail not available.</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <p className="text-xs text-muted-foreground">Stops Completed</p>
              <p className="text-lg font-semibold text-foreground">{detail.summary.stops_completed}/{detail.summary.stops_total}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <p className="text-xs text-muted-foreground">Skipped</p>
              <p className="text-lg font-semibold text-foreground">{detail.summary.stops_skipped}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <p className="text-xs text-muted-foreground">Photos</p>
              <p className="text-lg font-semibold text-foreground">{detail.summary.photos_uploaded}</p>
            </div>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Issues</h3>
            {detail.issues.length === 0 ? (
              <p className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success">
                No issues detected for this shift.
              </p>
            ) : (
              <div className="space-y-2">
                {detail.issues.map((issue) => (
                  <div
                    key={`${issue.type}-${issue.stop_id}-${issue.task_id ?? 'stop'}`}
                    className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm"
                  >
                    <p className="font-medium text-foreground">
                      Stop {issue.stop_order} • {issue.site_name}
                    </p>
                    <p className="text-muted-foreground">{issue.message}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Stops & Tasks</h3>
            <div className="space-y-2">
              {detail.stops.map((stop) => (
                <div key={stop.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      Stop {stop.stop_order} • {stop.site_name}
                    </p>
                    <Badge color={stopBadgeColor(stop.stop_status)}>{stop.stop_status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stop.tasks_completed}/{stop.tasks_total} tasks complete • {stop.photos_uploaded} photos
                  </p>
                  {stop.skip_notes ? (
                    <p className="mt-2 rounded-lg border border-warning/30 bg-warning/10 p-2 text-xs text-warning-foreground">
                      Skip note: {stop.skip_notes}
                    </p>
                  ) : null}

                  <div className="mt-2 space-y-1">
                    {stop.tasks.map((task) => (
                      <div key={task.id} className="rounded-lg border border-border/70 bg-background p-2">
                        <p className="text-xs font-medium text-foreground">
                          {task.task_order}. {task.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {task.is_completed ? 'Completed' : 'Incomplete'}
                          {task.evidence_required ? ' • Photo required' : ''}
                          {task.evidence_photos.length > 0 ? ` • ${task.evidence_photos.length} photo(s)` : ''}
                        </p>
                        {task.notes ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">Note: {task.notes}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Floater Notes</h3>
            <p className="rounded-lg border border-border bg-card p-3 text-sm text-foreground">
              {detail.floater_notes?.trim() ? detail.floater_notes : 'No notes provided.'}
            </p>
          </section>

          <Textarea
            label="Review Note"
            value={reviewNotes}
            onChange={(event) => onReviewNotesChange(event.target.value)}
            rows={3}
            placeholder="Add review context for this shift..."
          />

          <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={addToTomorrowEnabled}
                onChange={(event) => onAddToTomorrowEnabledChange(event.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Add one-off task to tomorrow&apos;s route
            </label>

            {addToTomorrowEnabled ? (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Site</label>
                  <select
                    value={addToTomorrowSiteId}
                    onChange={(event) => onAddToTomorrowSiteChange(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select site...</option>
                    {siteOptions.map((site) => (
                      <option key={site.site_id} value={site.site_id}>
                        {site.site_name}
                      </option>
                    ))}
                  </select>
                </div>

                <Textarea
                  label="Task Description"
                  value={addToTomorrowDescription}
                  onChange={(event) => onAddToTomorrowDescriptionChange(event.target.value)}
                  rows={2}
                  placeholder="Describe the follow-up work..."
                />
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={onNeedsFollowup} disabled={saving}>
              Needs Follow-up
            </Button>
            <Button onClick={onMarkReviewed} disabled={saving}>
              Mark as Reviewed
            </Button>
          </div>
        </div>
      )}
    </SlideOver>
  );
}
