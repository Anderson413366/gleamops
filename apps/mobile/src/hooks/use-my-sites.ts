import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/auth-context';
import { supabase } from '../lib/supabase';

interface StaffSelf {
  id: string;
}

export interface SpecialistSite {
  id: string;
  site_code: string;
  name: string;
  address: Record<string, string> | null;
  cleaning_procedures: string | null;
  cleaning_procedures_photos: string[] | null;
}

export function useMySites() {
  const { user } = useAuth();

  const staffQuery = useQuery<StaffSelf | null>({
    queryKey: ['staff-self', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user!.id)
        .is('archived_at', null)
        .maybeSingle();
      return data as StaffSelf | null;
    },
    enabled: !!user,
  });

  const sitesQuery = useQuery<SpecialistSite[]>({
    queryKey: ['specialist-sites', staffQuery.data?.id],
    queryFn: async () => {
      const staffId = staffQuery.data?.id;
      if (!staffId) return [];

      const { data, error } = await supabase
        .from('job_staff_assignments')
        .select(`
          site_job:job_id(
            id,
            site:site_id(
              id,
              site_code,
              name,
              address,
              cleaning_procedures,
              cleaning_procedures_photos
            )
          )
        `)
        .eq('staff_id', staffId)
        .is('archived_at', null);

      if (error) throw error;

      const unique = new Map<string, SpecialistSite>();
      for (const row of ((data ?? []) as Array<{
        site_job?: {
          site?: {
            id?: string;
            site_code?: string;
            name?: string;
            address?: Record<string, string> | null;
            cleaning_procedures?: string | null;
            cleaning_procedures_photos?: string[] | null;
          } | null;
        } | null;
      }>)) {
        const site = row.site_job?.site;
        if (!site?.id) continue;
        unique.set(site.id, {
          id: site.id,
          site_code: site.site_code ?? 'SITE',
          name: site.name ?? 'Site',
          address: site.address ?? null,
          cleaning_procedures: site.cleaning_procedures ?? null,
          cleaning_procedures_photos: Array.isArray(site.cleaning_procedures_photos)
            ? site.cleaning_procedures_photos
            : null,
        });
      }

      return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!staffQuery.data?.id,
  });

  const isOffline = sitesQuery.isError && (sitesQuery.data ?? []).length > 0;

  return useMemo(() => ({
    staffId: staffQuery.data?.id ?? null,
    sites: sitesQuery.data ?? [],
    loading: staffQuery.isLoading || sitesQuery.isLoading,
    refreshing: sitesQuery.isFetching && !sitesQuery.isLoading,
    isOffline,
    refetch: sitesQuery.refetch,
  }), [isOffline, sitesQuery.data, sitesQuery.isFetching, sitesQuery.isLoading, sitesQuery.refetch, staffQuery.data?.id, staffQuery.isLoading]);
}

