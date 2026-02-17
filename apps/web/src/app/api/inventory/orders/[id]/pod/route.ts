import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createProblemDetails, SYS_002, supplyOrderPodSchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { validateBody } from '@/lib/api/validate-request';

const CONTENT_TYPE_PROBLEM = 'application/problem+json';
const API_PATH = '/api/inventory/orders/[id]/pod';

function problemResponse(pd: ReturnType<typeof createProblemDetails>) {
  return NextResponse.json(pd, {
    status: pd.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM },
  });
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params;

    const auth = await extractAuth(request, API_PATH);
    if (isAuthError(auth)) return auth;
    const { tenantId } = auth;

    const db = getServiceClient();

    const { data: proof, error } = await db
      .from('supply_order_deliveries')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('order_id', orderId)
      .is('archived_at', null)
      .maybeSingle();

    if (error) {
      return problemResponse(SYS_002(error.message, API_PATH));
    }

    return NextResponse.json({ success: true, proof });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[inventory-order-pod][GET] Unexpected error:', msg);
    return problemResponse(SYS_002(msg, API_PATH));
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params;

    const auth = await extractAuth(request, API_PATH);
    if (isAuthError(auth)) return auth;
    const { tenantId, userId } = auth;

    const validation = await validateBody(request, supplyOrderPodSchema, API_PATH);
    if (validation.error) return validation.error;

    const {
      recipientName,
      recipientTitle,
      deliveredAt,
      notes,
      signatureFileId,
      photoFileId,
      gpsLat,
      gpsLng,
      gpsAccuracyMeters,
      deviceInfo,
    } = validation.data;

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? null;
    const userAgent = request.headers.get('user-agent') ?? null;

    const db = getServiceClient();

    const { data: order, error: orderErr } = await db
      .from('supply_orders')
      .select('id, status')
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .single();

    if (orderErr || !order) {
      return problemResponse(
        createProblemDetails('INV_ORD_404', 'Order not found', 404, 'Supply order not found for this tenant', API_PATH),
      );
    }

    const fileIds = [signatureFileId, photoFileId];
    const { data: files, error: fileErr } = await db
      .from('files')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('id', fileIds);

    if (fileErr) {
      return problemResponse(SYS_002(fileErr.message, API_PATH));
    }

    const ownedFileIds = new Set((files ?? []).map((f: { id: string }) => f.id));
    if (!ownedFileIds.has(signatureFileId) || !ownedFileIds.has(photoFileId)) {
      return problemResponse(
        createProblemDetails('INV_POD_403', 'Invalid file reference', 403, 'POD file reference is outside tenant scope', API_PATH),
      );
    }

    const deliveredAtIso = deliveredAt ?? new Date().toISOString();

    const { data: pod, error: podErr } = await db
      .from('supply_order_deliveries')
      .upsert({
        tenant_id: tenantId,
        order_id: orderId,
        delivered_at: deliveredAtIso,
        recipient_name: recipientName.trim(),
        recipient_title: recipientTitle?.trim() || null,
        notes: notes?.trim() || null,
        signature_file_id: signatureFileId,
        photo_file_id: photoFileId,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        gps_accuracy_meters: gpsAccuracyMeters,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_info: deviceInfo,
        captured_by_user_id: userId,
      }, { onConflict: 'tenant_id,order_id' })
      .select('*')
      .single();

    if (podErr || !pod) {
      return problemResponse(SYS_002(podErr?.message ?? 'Failed to save proof of delivery', API_PATH));
    }

    const status = String(order.status ?? '').toUpperCase();
    const nextStatus = status === 'RECEIVED' ? 'RECEIVED' : 'DELIVERED';

    const { error: updateErr } = await db
      .from('supply_orders')
      .update({
        status: nextStatus,
        delivered_at: deliveredAtIso,
      })
      .eq('id', orderId)
      .eq('tenant_id', tenantId);

    if (updateErr) {
      return problemResponse(SYS_002(updateErr.message, API_PATH));
    }

    return NextResponse.json({ success: true, proof: pod });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[inventory-order-pod][POST] Unexpected error:', msg);
    return problemResponse(SYS_002(msg, API_PATH));
  }
}
