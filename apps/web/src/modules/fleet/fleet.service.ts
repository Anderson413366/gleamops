/**
 * Fleet workflow service.
 * DVIR checklist calculation, vehicle checkout/return.
 * Extracted verbatim from api/operations/fleet/workflow/route.ts
 */
import type { NextRequest } from 'next/server';
import { createProblemDetails, SYS_002 } from '@gleamops/shared';
import { extractAuditContext } from '@/lib/api/audit';
import {
  createDb,
  insertCheckout,
  insertDvirLog,
  findCheckout,
  updateCheckoutReturn,
  insertFuelLog,
  writeAuditMutation,
} from './fleet.repository';

const API_PATH = '/api/operations/fleet/workflow';

interface FleetPayload {
  mode: 'checkout' | 'return';
  vehicleId: string;
  routeId?: string | null;
  staffId?: string | null;
  checkoutId?: string | null;
  odometer?: number;
  fuelLevel?: string | null;
  fuelGallons?: number | null;
  fuelCost?: number | null;
  stationName?: string | null;
  notes?: string | null;
  checklist?: Record<string, boolean>;
}

interface AuthContext {
  tenantId: string;
  userId: string;
}

type ServiceResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

export async function processFleetWorkflow(
  auth: AuthContext,
  payload: FleetPayload,
  request: NextRequest,
): Promise<ServiceResult> {
  const { tenantId, userId } = auth;
  const checklist = payload.checklist ?? {};
  const now = new Date().toISOString();
  const db = createDb();

  try {
    if (payload.mode === 'checkout') {
      return handleCheckout(db, tenantId, userId, payload, checklist, now, request);
    }

    return handleReturn(db, tenantId, userId, payload, checklist, now, request);
  } catch (error) {
    return {
      success: false,
      error: SYS_002(error instanceof Error ? error.message : 'Fleet workflow failed', API_PATH),
    };
  }
}

async function handleCheckout(
  db: ReturnType<typeof createDb>,
  tenantId: string,
  userId: string,
  payload: FleetPayload,
  checklist: Record<string, boolean>,
  now: string,
  request: NextRequest,
): Promise<ServiceResult> {
  const { data: checkout, error: checkoutErr } = await insertCheckout(db, {
    tenant_id: tenantId,
    vehicle_id: payload.vehicleId,
    route_id: payload.routeId,
    staff_id: payload.staffId,
    checked_out_at: now,
    checkout_odometer: payload.odometer,
    fuel_level_out: payload.fuelLevel,
    condition_notes: payload.notes,
    dvir_out_status: Object.values(checklist).every(Boolean) ? 'PASS' : 'FAIL',
    status: 'OUT',
  });

  if (checkoutErr || !checkout) {
    return { success: false, error: SYS_002(checkoutErr?.message ?? 'Failed to create checkout', API_PATH) };
  }

  const issuesFound = Object.values(checklist).some((flag) => flag === false);
  const { error: dvirErr } = await insertDvirLog(db, {
    tenant_id: tenantId,
    checkout_id: checkout.id,
    vehicle_id: payload.vehicleId,
    route_id: payload.routeId,
    staff_id: payload.staffId,
    report_type: 'CHECKOUT',
    odometer: payload.odometer,
    fuel_level: payload.fuelLevel,
    checklist_json: checklist,
    issues_found: issuesFound,
    notes: payload.notes,
    reported_at: now,
  });

  if (dvirErr) {
    return { success: false, error: SYS_002(dvirErr.message, API_PATH) };
  }

  await writeAuditMutation({
    db,
    tenantId,
    actorUserId: userId,
    entityType: 'vehicle_checkouts',
    entityId: checkout.id,
    action: 'CHECKOUT',
    before: null,
    after: checkout as Record<string, unknown>,
    context: extractAuditContext(request, 'fleet_vehicle_checkout'),
  });

  return { success: true, data: { success: true, checkout } };
}

async function handleReturn(
  db: ReturnType<typeof createDb>,
  tenantId: string,
  userId: string,
  payload: FleetPayload,
  checklist: Record<string, boolean>,
  now: string,
  request: NextRequest,
): Promise<ServiceResult> {
  if (!payload.checkoutId) {
    return {
      success: false,
      error: createProblemDetails('FLEET_001', 'Missing checkout', 400, 'checkoutId is required for return workflow', API_PATH),
    };
  }

  const { data: beforeCheckout, error: beforeErr } = await findCheckout(db, tenantId, payload.checkoutId);
  if (beforeErr || !beforeCheckout) {
    return {
      success: false,
      error: createProblemDetails('FLEET_404', 'Checkout not found', 404, 'No checkout found for this tenant', API_PATH),
    };
  }

  const { data: checkout, error: checkoutErr } = await updateCheckoutReturn(db, tenantId, payload.checkoutId, {
    returned_at: now,
    return_odometer: payload.odometer,
    fuel_level_in: payload.fuelLevel,
    dvir_in_status: Object.values(checklist).every(Boolean) ? 'PASS' : 'FAIL',
    return_notes: payload.notes,
    status: 'RETURNED',
  });

  if (checkoutErr || !checkout) {
    return { success: false, error: SYS_002(checkoutErr?.message ?? 'Failed to complete return workflow', API_PATH) };
  }

  const issuesFound = Object.values(checklist).some((flag) => flag === false);
  const { error: dvirErr } = await insertDvirLog(db, {
    tenant_id: tenantId,
    checkout_id: payload.checkoutId,
    vehicle_id: payload.vehicleId,
    route_id: payload.routeId,
    staff_id: payload.staffId,
    report_type: 'RETURN',
    odometer: payload.odometer,
    fuel_level: payload.fuelLevel,
    checklist_json: checklist,
    issues_found: issuesFound,
    notes: payload.notes,
    reported_at: now,
  });

  if (dvirErr) {
    return { success: false, error: SYS_002(dvirErr.message, API_PATH) };
  }

  if (payload.fuelGallons != null && payload.fuelGallons > 0) {
    const { error: fuelErr } = await insertFuelLog(db, {
      tenant_id: tenantId,
      vehicle_id: payload.vehicleId,
      route_id: payload.routeId,
      checkout_id: payload.checkoutId,
      staff_id: payload.staffId,
      odometer: payload.odometer,
      gallons: payload.fuelGallons,
      total_cost: payload.fuelCost,
      station_name: payload.stationName,
      notes: payload.notes,
      fueled_at: now,
    });
    if (fuelErr) {
      return { success: false, error: SYS_002(fuelErr.message, API_PATH) };
    }
  }

  await writeAuditMutation({
    db,
    tenantId,
    actorUserId: userId,
    entityType: 'vehicle_checkouts',
    entityId: checkout.id,
    action: 'RETURN',
    before: beforeCheckout as Record<string, unknown>,
    after: checkout as Record<string, unknown>,
    context: extractAuditContext(request, 'fleet_vehicle_return'),
  });

  return { success: true, data: { success: true, checkout } };
}
