'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, LocateFixed, PenLine, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, SlideOver, Textarea } from '@gleamops/ui';
import type { SupplyOrder } from '@gleamops/shared';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { uploadToStorage } from '@/lib/upload-to-storage';

interface SupplyOrderDeliveryProof {
  id: string;
  delivered_at: string;
  recipient_name: string;
  recipient_title: string | null;
  notes: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy_meters: number | null;
}

interface PodCaptureDrawerProps {
  open: boolean;
  order: SupplyOrder | null;
  onClose: () => void;
  onSaved?: () => void;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not Set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not Set';
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function PodCaptureDrawer({ open, order, onClose, onSaved }: PodCaptureDrawerProps) {
  const supabase = getSupabaseBrowserClient();

  const [recipientName, setRecipientName] = useState('');
  const [recipientTitle, setRecipientTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingProof, setExistingProof] = useState<SupplyOrderDeliveryProof | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const hasSignatureRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { authorization: `Bearer ${token}` } : {};
  }, [supabase]);

  const resetForm = useCallback(() => {
    setRecipientName('');
    setRecipientTitle('');
    setNotes('');
    setPhotoFile(null);
    setGpsLat(null);
    setGpsLng(null);
    setGpsAccuracy(null);
    setExistingProof(null);
    hasSignatureRef.current = false;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }
  }, []);

  const loadExistingProof = useCallback(async () => {
    if (!order) return;
    try {
      const headers = await authHeaders();
      const response = await fetch(`/api/inventory/orders/${order.id}/pod`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) return;
      const payload = await response.json();
      const proof = (payload?.proof ?? null) as SupplyOrderDeliveryProof | null;
      setExistingProof(proof);
      if (proof) {
        setRecipientName(proof.recipient_name ?? '');
        setRecipientTitle(proof.recipient_title ?? '');
        setNotes(proof.notes ?? '');
        setGpsLat(proof.gps_lat ?? null);
        setGpsLng(proof.gps_lng ?? null);
        setGpsAccuracy(proof.gps_accuracy_meters ?? null);
      }
    } catch {
      // Non-blocking: POD capture should still work even if proof preload fails.
    }
  }, [authHeaders, order]);

  useEffect(() => {
    if (!open) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      canvas.width = Math.max(640, canvas.offsetWidth * 2);
      canvas.height = Math.max(220, canvas.offsetHeight * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }

    void loadExistingProof();
  }, [loadExistingProof, open]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  const signatureLabel = useMemo(() => {
    if (existingProof) return `Existing proof captured ${formatDateTime(existingProof.delivered_at)}`;
    return 'Capture recipient signature';
  }, [existingProof]);

  const getCanvasPos = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }, []);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    lastPosRef.current = getCanvasPos(event);
    canvasRef.current?.setPointerCapture(event.pointerId);
  }, [getCanvasPos]);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const next = getCanvasPos(event);
    const prev = lastPosRef.current;

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();

    hasSignatureRef.current = true;
    lastPosRef.current = next;
  }, [getCanvasPos]);

  const onPointerUp = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    hasSignatureRef.current = false;
  }, []);

  const captureLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not available in this browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLat(position.coords.latitude);
        setGpsLng(position.coords.longitude);
        setGpsAccuracy(position.coords.accuracy);
        setLocating(false);
        toast.success('GPS captured.');
      },
      (error) => {
        setLocating(false);
        toast.error(error.message || 'Unable to capture GPS location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  const savePod = useCallback(async () => {
    if (!order) return;
    if (!recipientName.trim()) {
      toast.error('Recipient name is required.');
      return;
    }
    if (!hasSignatureRef.current) {
      toast.error('Please capture a signature before saving POD.');
      return;
    }
    if (!photoFile) {
      toast.error('Please attach a delivery photo.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error('Signature canvas is unavailable.');
      return;
    }

    setSaving(true);
    try {
      const signatureBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      if (!signatureBlob) {
        throw new Error('Unable to generate signature image.');
      }

      const signatureFile = new File([signatureBlob], `${order.order_code}-signature.png`, {
        type: 'image/png',
      });

      const stamp = Date.now();
      const sigPath = `${order.tenant_id}/supply-orders/${order.order_code}/pod/${stamp}-signature.png`;
      const photoPath = `${order.tenant_id}/supply-orders/${order.order_code}/pod/${stamp}-${photoFile.name}`;

      const signatureUpload = await uploadToStorage({
        supabase,
        bucket: 'documents',
        path: sigPath,
        file: signatureFile,
        tenantId: order.tenant_id,
        entityType: 'SUPPLY_ORDER',
        entityId: order.id,
      });

      const photoUpload = await uploadToStorage({
        supabase,
        bucket: 'documents',
        path: photoPath,
        file: photoFile,
        tenantId: order.tenant_id,
        entityType: 'SUPPLY_ORDER',
        entityId: order.id,
      });

      const headers = {
        'Content-Type': 'application/json',
        ...(await authHeaders()),
      };

      const response = await fetch(`/api/inventory/orders/${order.id}/pod`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recipientName: recipientName.trim(),
          recipientTitle: recipientTitle.trim() || null,
          deliveredAt: new Date().toISOString(),
          notes: notes.trim() || null,
          signatureFileId: signatureUpload.fileId,
          photoFileId: photoUpload.fileId,
          gpsLat,
          gpsLng,
          gpsAccuracyMeters: gpsAccuracy,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
          },
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.detail || payload?.error || 'Failed to save proof of delivery.');
      }

      toast.success('Proof of delivery saved.');
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save proof of delivery.');
    } finally {
      setSaving(false);
    }
  }, [
    authHeaders,
    gpsAccuracy,
    gpsLat,
    gpsLng,
    notes,
    onClose,
    onSaved,
    order,
    photoFile,
    recipientName,
    recipientTitle,
    supabase,
  ]);

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Proof of Delivery"
      subtitle={order?.order_code}
      wide
    >
      {!order ? null : (
        <div className="space-y-6">
          {existingProof ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
              <p className="font-medium text-foreground">Existing POD found</p>
              <p className="mt-1 text-muted-foreground">
                Captured {formatDateTime(existingProof.delivered_at)} for {existingProof.recipient_name}
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Recipient Name"
              value={recipientName}
              onChange={(event) => setRecipientName(event.target.value)}
              required
            />
            <Input
              label="Recipient Title"
              value={recipientTitle}
              onChange={(event) => setRecipientTitle(event.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="rounded-xl border border-border p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground inline-flex items-center gap-2">
                <PenLine className="h-4 w-4" />
                {signatureLabel}
              </p>
              <Button variant="secondary" size="sm" type="button" onClick={clearSignature}>
                Clear Signature
              </Button>
            </div>
            <canvas
              ref={canvasRef}
              className="h-28 w-full rounded-lg border border-border bg-white"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
          </div>

          <div className="rounded-xl border border-border p-4">
            <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <Camera className="h-4 w-4" />
              Delivery Photo
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {photoFile ? `Selected: ${photoFile.name}` : 'Attach a photo of the delivered supplies.'}
            </p>
          </div>

          <div className="rounded-xl border border-border p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <LocateFixed className="h-4 w-4" />
                GPS Stamp
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={captureLocation} loading={locating}>
                Capture Current GPS
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {gpsLat != null && gpsLng != null
                ? `Lat ${gpsLat.toFixed(6)}, Lng ${gpsLng.toFixed(6)}${gpsAccuracy != null ? ` (±${gpsAccuracy.toFixed(1)}m)` : ''}`
                : 'No GPS captured yet.'}
            </p>
          </div>

          <Textarea
            label="Delivery Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional handoff details, exceptions, or receiving notes"
          />

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            <p className="inline-flex items-center gap-2 font-medium text-foreground">
              <ShieldCheck className="h-4 w-4" />
              Delivery proof captures signature, photo, timestamp, and optional GPS/device metadata.
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={() => void savePod()} loading={saving}>
              Save Proof of Delivery
            </Button>
          </div>
        </div>
      )}
    </SlideOver>
  );
}
