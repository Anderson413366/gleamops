'use client';

interface SiteOption {
  id: string;
  name: string;
  site_code?: string | null;
}

interface PlannerFiltersProps {
  statusFilter: string;
  siteFilter: string;
  sites: SiteOption[];
  onStatusFilterChange: (value: string) => void;
  onSiteFilterChange: (value: string) => void;
}

export function PlannerFilters({
  statusFilter,
  siteFilter,
  sites,
  onStatusFilterChange,
  onSiteFilterChange,
}: PlannerFiltersProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Ticket Status
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
        >
          <option value="all">All statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="VERIFIED">Verified</option>
          <option value="CANCELED">Canceled</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Site
        <select
          value={siteFilter}
          onChange={(event) => onSiteFilterChange(event.target.value)}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
        >
          <option value="all">All sites</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}{site.site_code ? ` (${site.site_code})` : ''}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
