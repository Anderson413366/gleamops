'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, MapPin } from 'lucide-react';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type CommandCenterFilter = 'all' | 'regular-shifts' | 'projects' | 'requests';

interface SiteBlueprintRow {
  id: string;
  name: string;
  site_code: string | null;
  janitorial_closet_location: string | null;
  supply_storage_location: string | null;
  water_source_location: string | null;
  dumpster_location: string | null;
  security_protocol: string | null;
  entry_instructions: string | null;
}

interface SiteBlueprintReviewProps {
  filter: CommandCenterFilter;
}

const REQUIRED_BLUEPRINT_FIELDS: Array<keyof SiteBlueprintRow> = [
  'janitorial_closet_location',
  'supply_storage_location',
  'water_source_location',
  'dumpster_location',
  'security_protocol',
  'entry_instructions',
];

function readableField(field: keyof SiteBlueprintRow): string {
  const labels: Record<keyof SiteBlueprintRow, string> = {
    id: 'ID',
    name: 'Name',
    site_code: 'Site Code',
    janitorial_closet_location: 'Janitorial Closet',
    supply_storage_location: 'Supply Storage',
    water_source_location: 'Water Source',
    dumpster_location: 'Dumpster',
    security_protocol: 'Security Protocol',
    entry_instructions: 'Entry Instructions',
  };
  return labels[field];
}

function missingFields(site: SiteBlueprintRow) {
  return REQUIRED_BLUEPRINT_FIELDS.filter((field) => {
    const value = site[field];
    return !value || value.trim().length === 0;
  });
}

export function SiteBlueprintReview({ filter }: SiteBlueprintReviewProps) {
  const [sites, setSites] = useState<SiteBlueprintRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSites() {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('sites')
        .select(`
          id,
          name,
          site_code,
          janitorial_closet_location,
          supply_storage_location,
          water_source_location,
          dumpster_location,
          security_protocol,
          entry_instructions
        `)
        .eq('status', 'ACTIVE')
        .is('archived_at', null)
        .order('name', { ascending: true })
        .limit(40);

      if (cancelled) return;

      if (error || !data) {
        setSites([]);
        setLoading(false);
        return;
      }

      setSites(data as SiteBlueprintRow[]);
      setLoading(false);
    }

    void loadSites();
    return () => {
      cancelled = true;
    };
  }, []);

  const incompleteSites = useMemo(() => {
    return sites
      .map((site) => ({
        site,
        missing: missingFields(site),
      }))
      .filter((entry) => entry.missing.length > 0)
      .sort((a, b) => b.missing.length - a.missing.length)
      .slice(0, 6);
  }, [sites]);

  const hiddenByFilter = filter === 'requests';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4 text-module-accent" aria-hidden="true" />
          Site Blueprint Review
          <Badge color={incompleteSites.length > 0 ? 'yellow' : 'green'}>{incompleteSites.length}</Badge>
        </CardTitle>
        <CardDescription>
          Manager follow-up for missing site blueprint details
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2">
        {hiddenByFilter ? (
          <p className="text-sm text-muted-foreground">
            Hidden in Requests filter. Switch to All or Regular Shifts to review blueprint gaps.
          </p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading site blueprint coverage...</p>
        ) : incompleteSites.length === 0 ? (
          <p className="text-sm text-muted-foreground">All active sites have complete blueprint essentials.</p>
        ) : (
          incompleteSites.map(({ site, missing }) => (
            <div key={site.id} className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {site.site_code ? `${site.site_code} - ${site.name}` : site.name}
                </p>
                <Badge color={missing.length >= 4 ? 'red' : 'yellow'}>
                  {missing.length} missing
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Missing: {missing.map((field) => readableField(field)).join(', ')}
              </p>
              <Link
                href={`/crm/sites/${encodeURIComponent(site.site_code ?? site.id)}`}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-module-accent hover:underline"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Open site profile
              </Link>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
