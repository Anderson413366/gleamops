import { NextRequest, NextResponse } from 'next/server';
import { createProblemDetails, fleetWorkflowSchema, SYS_002 } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { extractAuditContext, writeAuditMutation } from '@/lib/api/audit';
import { getServiceClient } from '@/lib/api/service-client';
import { validateBody } from '@/lib/api/validate-request';

const API_PATH = '/api/operations/fleet/workflow';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

export async function POST(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const { tenantId, userId } = auth;
  const db = getServiceClient();

  const validation = await validateBody(request, fleetWorkflowSchema, API_PATH);
  if (validation.error) return validation.error;
  const payload = validation.data;
  const checklist = payload.checklist ?? {};
  const now = new Date().toISOString();

  try {
    if (payload.mode === 'checkout') {
      const { data: checkout, error: checkoutErr } = await db
        .from('vehicle_checkouts')
        .insert({
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
        })
        .select('*')
        .single();

      if (checkoutErr || !checkout) {
        return problemResponse(SYS_002(checkoutErr?.message ?? 'Failed to create checkout', API_PATH));
      }

      const issuesFound = Object.values(checklist).some((flag) => flag === false);
      const { error: dvirErr } = await db
        .from('vehicle_dvir_logs')
        .insert({
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
        return problemResponse(SYS_002(dvirErr.message, API_PATH));
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

      return NextResponse.json({ success: true, checkout });
    }

    if (!payload.checkoutId) {
      return problemResponse(
        createProblemDetails('FLEET_001', 'Missing checkout', 400, 'checkoutId is required for return workflow', API_PATH),
      );
    }

    const { data: beforeCheckout, error: beforeErr } = await db
      .from('vehicle_checkouts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', payload.checkoutId)
      .single();

    if (beforeErr || !beforeCheckout) {
      return problemResponse(
        createProblemDetails('FLEET_404', 'Checkout not found', 404, 'No checkout found for this tenant', API_PATH),
      );
    }

    const { data: checkout, error: checkoutErr } = await db
      .from('vehicle_checkouts')
      .update({
        returned_at: now,
        return_odometer: payload.odometer,
        fuel_level_in: payload.fuelLevel,
        dvir_in_status: Object.values(checklist).every(Boolean) ? 'PASS' : 'FAIL',
        return_notes: payload.notes,
        status: 'RETURNED',
      })
      .eq('tenant_id', tenantId)
      .eq('id', payload.checkoutId)
      .select('*')
      .single();

    if (checkoutErr || !checkout) {
      return problemResponse(SYS_002(checkoutErr?.message ?? 'Failed to complete return workflow', API_PATH));
    }

    const issuesFound = Object.values(checklist).some((flag) => flag === false);
    const { error: dvirErr } = await db
      .from('vehicle_dvir_logs')
      .insert({
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
      return problemResponse(SYS_002(dvirErr.message, API_PATH));
    }

    if (payload.fuelGallons != null && payload.fuelGallons > 0) {
      const { error: fuelErr } = await db
        .from('vehicle_fuel_logs')
        .insert({
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
        return problemResponse(SYS_002(fuelErr.message, API_PATH));
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

    return NextResponse.json({ success: true, checkout });
  } catch (error) {
    return problemResponse(
      SYS_002(error instanceof Error ? error.message : 'Fleet workflow failed', API_PATH),
    );
  }
}
