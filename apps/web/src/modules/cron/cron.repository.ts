/**
 * Cron data access layer.
 * All Supabase queries for the inventory count reminders cron.
 * Extracted from api/cron/inventory-count-reminders/route.ts
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/api/service-client';

export function createDb(): SupabaseClient {
  return getServiceClient();
}

export type DueSite = {
  id: string;
  tenant_id: string;
  name: string;
  site_code: string;
  next_count_due: string;
};

export async function findDueSites(
  db: SupabaseClient,
  dueIn7Key: string,
) {
  return db
    .from('sites')
    .select('id, tenant_id, name, site_code, next_count_due')
    .is('archived_at', null)
    .not('next_count_due', 'is', null)
    .lte('next_count_due', dueIn7Key)
    .order('next_count_due');
}

export async function findCountTokensBySiteIds(
  db: SupabaseClient,
  siteIds: string[],
) {
  return db
    .from('inventory_counts')
    .select('site_id, public_token, status, created_at')
    .in('site_id', siteIds)
    .is('archived_at', null)
    .in('status', ['DRAFT', 'IN_PROGRESS'])
    .not('public_token', 'is', null)
    .order('created_at', { ascending: false });
}

export async function findTenantMemberships(
  db: SupabaseClient,
  tenantIds: string[],
) {
  return db
    .from('tenant_memberships')
    .select('tenant_id, user_id, role_code')
    .in('tenant_id', tenantIds)
    .in('role_code', ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'])
    .is('archived_at', null);
}

export async function getUserEmail(
  db: SupabaseClient,
  userId: string,
): Promise<string | undefined> {
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return undefined;
  return data.user.email;
}

export async function updateSiteAlert(
  db: SupabaseClient,
  siteId: string,
  alert: string,
) {
  return db
    .from('sites')
    .update({ count_status_alert: alert })
    .eq('id', siteId)
    .is('archived_at', null);
}

export async function findExistingNotification(
  db: SupabaseClient,
  tenantId: string,
  title: string,
  link: string,
  midnightIso: string,
) {
  return db
    .from('notifications')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('title', title)
    .eq('link', link)
    .gte('created_at', midnightIso)
    .limit(1);
}

export async function insertNotifications(
  db: SupabaseClient,
  payload: Array<{
    tenant_id: string;
    user_id: string;
    title: string;
    body: string;
    link: string;
  }>,
) {
  return db.from('notifications').insert(payload);
}

export async function findUnreviewedNightBridgeRoutes(
  db: SupabaseClient,
  routeDate: string,
) {
  return db
    .from('routes')
    .select('id, tenant_id')
    .eq('route_date', routeDate)
    .eq('status', 'COMPLETED')
    .eq('shift_review_status', 'PENDING')
    .is('archived_at', null);
}

export async function findNightBridgeRecipients(
  db: SupabaseClient,
  tenantIds: string[],
) {
  return db
    .from('tenant_memberships')
    .select('tenant_id, user_id, role_code')
    .in('tenant_id', tenantIds)
    .in('role_code', ['OWNER_ADMIN', 'MANAGER'])
    .is('archived_at', null);
}
