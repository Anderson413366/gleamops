/**
 * Inventory orders service.
 * Business logic for proof-of-delivery.
 * Extracted verbatim from api/inventory/orders/[id]/pod/route.ts
 */
import type { NextRequest } from 'next/server';
import { createProblemDetails, SYS_002 } from '@gleamops/shared';
import type { AuthContext } from '@/lib/api/auth-guard';
import {
  createDb,
  findProofOfDelivery,
  findOrder,
  verifyFileOwnership,
  upsertProofOfDelivery,
  updateOrderStatus,
} from './inventory-orders.repository';

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: ReturnType<typeof createProblemDetails> };

export async function getProofOfDelivery(
  tenantId: string,
  orderId: string,
  apiPath: string,
): Promise<ServiceResult<unknown>> {
  try {
    const db = createDb();
    const { data: proof, error } = await findProofOfDelivery(db, tenantId, orderId);
    if (error) return { success: false, error: SYS_002(error.message, apiPath) };
    return { success: true, data: proof };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[inventory-order-pod][GET] Unexpected error:', msg);
    return { success: false, error: SYS_002(msg, apiPath) };
  }
}

export async function createProofOfDelivery(
  auth: AuthContext,
  request: NextRequest,
  orderId: string,
  body: {
    recipientName: string;
    recipientTitle?: string | null;
    deliveredAt?: string | null;
    notes?: string | null;
    signatureFileId: string;
    photoFileId: string;
    gpsLat?: number | null;
    gpsLng?: number | null;
    gpsAccuracyMeters?: number | null;
    deviceInfo?: Record<string, unknown> | null;
  },
  apiPath: string,
): Promise<ServiceResult<unknown>> {
  const { tenantId, userId } = auth;

  try {
    const db = createDb();

    // Verify order exists
    const { data: order, error: orderErr } = await findOrder(db, tenantId, orderId);
    if (orderErr || !order) {
      return { success: false, error: createProblemDetails('INV_ORD_404', 'Order not found', 404, 'Supply order not found for this tenant', apiPath) };
    }

    // Verify file ownership
    const fileIds = [body.signatureFileId, body.photoFileId];
    const { data: files, error: fileErr } = await verifyFileOwnership(db, tenantId, fileIds);
    if (fileErr) return { success: false, error: SYS_002(fileErr.message, apiPath) };

    const ownedFileIds = new Set((files ?? []).map((f: { id: string }) => f.id));
    if (!ownedFileIds.has(body.signatureFileId) || !ownedFileIds.has(body.photoFileId)) {
      return { success: false, error: createProblemDetails('INV_POD_403', 'Invalid file reference', 403, 'POD file reference is outside tenant scope', apiPath) };
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? null;
    const userAgent = request.headers.get('user-agent') ?? null;
    const deliveredAtIso = body.deliveredAt ?? new Date().toISOString();

    // Upsert POD
    const { data: pod, error: podErr } = await upsertProofOfDelivery(db, {
      tenant_id: tenantId,
      order_id: orderId,
      delivered_at: deliveredAtIso,
      recipient_name: body.recipientName.trim(),
      recipient_title: body.recipientTitle?.trim() || null,
      notes: body.notes?.trim() || null,
      signature_file_id: body.signatureFileId,
      photo_file_id: body.photoFileId,
      gps_lat: body.gpsLat,
      gps_lng: body.gpsLng,
      gps_accuracy_meters: body.gpsAccuracyMeters,
      ip_address: ipAddress,
      user_agent: userAgent,
      device_info: body.deviceInfo,
      captured_by_user_id: userId,
    });
    if (podErr || !pod) {
      return { success: false, error: SYS_002(podErr?.message ?? 'Failed to save proof of delivery', apiPath) };
    }

    // Update order status
    const status = String(order.status ?? '').toUpperCase();
    const nextStatus = status === 'RECEIVED' ? 'RECEIVED' : 'DELIVERED';
    const { error: updateErr } = await updateOrderStatus(db, tenantId, orderId, nextStatus, deliveredAtIso);
    if (updateErr) return { success: false, error: SYS_002(updateErr.message, apiPath) };

    return { success: true, data: pod };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[inventory-order-pod][POST] Unexpected error:', msg);
    return { success: false, error: SYS_002(msg, apiPath) };
  }
}
