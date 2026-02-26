import type { SupabaseClient } from '@supabase/supabase-js';
import { AUTH_002, SYS_002, createProblemDetails, type LoadDirection, type LoadSheetResponse } from '@gleamops/shared';
import { hasAnyRole } from '@/lib/api/role-guard';
import type { AuthContext } from '@/lib/api/auth-guard';
import {
  getRouteHeader,
  listCustomTasksByStopIds,
  listLoadSheetRows,
  listRouteStopsForSpecialItems,
} from './load-sheet.repository';

type ServiceResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

const LOAD_SHEET_ROLES = ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR', 'CLEANER', 'INSPECTOR'] as const;

function canReadLoadSheet(roles: string[]) {
  return hasAnyRole(roles, LOAD_SHEET_ROLES);
}

function normalizeSiteBreakdown(value: unknown) {
  const raw = Array.isArray(value) ? value : [];
  return raw
    .map((entry) => {
      const row = entry as {
        stop_order?: number | string | null;
        site_name?: string | null;
        quantity?: number | string | null;
      };
      const stopOrder = Number(row.stop_order ?? 0);
      const quantity = Number(row.quantity ?? 0);
      const siteName = row.site_name?.trim() || 'Unknown site';

      if (!Number.isFinite(stopOrder) || stopOrder <= 0) return null;
      if (!Number.isFinite(quantity) || quantity <= 0) return null;

      return {
        stop_order: stopOrder,
        site_name: siteName,
        quantity,
      };
    })
    .filter((entry): entry is { stop_order: number; site_name: string; quantity: number } => !!entry)
    .sort((a, b) => a.stop_order - b.stop_order);
}

export async function getLoadSheetForRoute(
  userDb: SupabaseClient,
  auth: AuthContext,
  routeId: string,
  apiPath: string,
): Promise<ServiceResult<LoadSheetResponse>> {
  if (!canReadLoadSheet(auth.roles)) {
    return { success: false, error: AUTH_002(apiPath) };
  }

  const routeResult = await getRouteHeader(userDb, routeId);
  if (routeResult.error || !routeResult.data) {
    return {
      success: false,
      error: createProblemDetails('ROUTE_004', 'Route not found', 404, 'Route was not found', apiPath),
    };
  }

  const loadRowsResult = await listLoadSheetRows(userDb, routeId);
  if (loadRowsResult.error) {
    return {
      success: false,
      error: SYS_002(loadRowsResult.error.message, apiPath),
    };
  }

  const stopRowsResult = await listRouteStopsForSpecialItems(userDb, routeId);
  if (stopRowsResult.error) {
    return {
      success: false,
      error: SYS_002(stopRowsResult.error.message, apiPath),
    };
  }

  const stopRows = (stopRowsResult.data ?? []) as Array<{
    id: string;
    stop_order: number;
    site_job?: { site?: { id?: string | null; name?: string | null } | null } | null;
  }>;

  const stopIds = stopRows.map((row) => row.id);
  const tasksResult = await listCustomTasksByStopIds(userDb, stopIds);
  if (tasksResult.error) {
    return {
      success: false,
      error: SYS_002(tasksResult.error.message, apiPath),
    };
  }

  const stopMeta = new Map(
    stopRows.map((row) => [
      row.id,
      {
        for_stop: row.stop_order,
        site_name: row.site_job?.site?.name?.trim() || 'Unknown site',
      },
    ]),
  );

  const specialItems = ((tasksResult.data ?? []) as Array<{ route_stop_id: string; description: string | null }>).flatMap((task) => {
    const description = task.description?.trim();
    if (!description) return [];

    const stop = stopMeta.get(task.route_stop_id);
    if (!stop) return [];

    return [{
      description,
      for_stop: stop.for_stop,
      site_name: stop.site_name,
    }];
  }).sort((a, b) => a.for_stop - b.for_stop || a.description.localeCompare(b.description));

  const items = ((loadRowsResult.data ?? []) as Array<{
    supply_id: string;
    supply_name: string | null;
    unit: string | null;
    direction: string;
    total_quantity: number | string;
    site_breakdown: unknown;
  }>).map((row) => {
    const direction: LoadDirection = row.direction === 'pickup' ? 'pickup' : 'deliver';

    return {
      supply_id: row.supply_id,
      supply_name: row.supply_name ?? 'Unknown supply',
      unit: row.unit,
      direction,
      total_quantity: Number(row.total_quantity ?? 0),
      site_breakdown: normalizeSiteBreakdown(row.site_breakdown),
    };
  });

  return {
    success: true,
    data: {
      route_id: routeResult.data.id,
      route_date: routeResult.data.route_date,
      items,
      special_items: specialItems,
    },
  };
}
