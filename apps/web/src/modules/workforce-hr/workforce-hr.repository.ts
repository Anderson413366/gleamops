/**
 * Workforce HR data access layer.
 * Polymorphic CRUD for 6 HR entity types.
 * Extracted from api/workforce/hr/[entity]/route.ts
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/api/service-client';

export function createDb(): SupabaseClient {
  return getServiceClient();
}

const STAFF_FILTERABLE_TABLES = new Set([
  'hr_pto_requests',
  'hr_performance_reviews',
  'hr_goals',
  'hr_staff_badges',
  'hr_staff_documents',
]);

export async function listRecords(
  db: SupabaseClient,
  tenantId: string,
  table: string,
  orderBy: string,
  staffId: string | null,
  status: string | null,
) {
  let query = db
    .from(table)
    .select('*')
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .order(orderBy, { ascending: false })
    .limit(500);

  if (staffId && STAFF_FILTERABLE_TABLES.has(table)) {
    query = query.eq('staff_id', staffId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  return query;
}

export async function insertRecord(
  db: SupabaseClient,
  table: string,
  payload: Record<string, unknown>,
) {
  return db
    .from(table)
    .insert(payload)
    .select('*')
    .single();
}
