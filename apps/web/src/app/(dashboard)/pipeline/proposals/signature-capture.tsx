'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { uploadToStorage } from '@/lib/upload-to-storage';
import {
  SlideOver, Button, ChipTabs, FileDropzone,
} from '@gleamops/ui';
import type { ChipTab } from '@gleamops/ui';
import type { SalesProposalSignature } from '@gleamops/shared';

interface SignatureCaptureProps {
  proposalId: string;
  tenantId: string;
  onCaptured: (sig: SalesProposalSignature) => void;
  open: boolean;
  onClose: () => void;
}

const TABS: ChipTab[] = [
  { key: 'type', label: 'Type' },
  { key: 'draw', label: 'Draw' },
  { key: 'upload', label: 'Upload' },
];

const FONTS = [
  { name: 'Dancing Script', css: "'Dancing Script', cursive" },
  { name: 'Great Vibes', css: "'Great Vibes', cursive" },
  { name: 'Pacifico', css: "'Pacifico', cursive" },
];

export function SignatureCapture({
  proposalId,
  tenantId,
  onCaptured,
  open,
  onClose,
}: SignatureCaptureProps) {
  const [tab, setTab] = useState('type');
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Type tab state
  const [typedText, setTypedText] = useState('');
  const [selectedFont, setSelectedFont] = useState(0);
  const typeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Draw tab state
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Upload tab state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setTab('type');
      setSignerName('');
      setSignerEmail('');
      setTypedText('');
      setSelectedFont(0);
      setUploadedFile(null);
      setUploadPreview(null);
      setSaving(false);
    }
  }, [open]);

  // Load Google Fonts for typed signatures
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'gleamops-sig-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&family=Pacifico&display=swap';
    document.head.appendChild(link);
  }, []);

  // Draw canvas setup
  useEffect(() => {
    if (tab !== 'draw') return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#111827';
  }, [tab]);

  const getCanvasPos = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = drawCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      isDrawingRef.current = true;
      lastPosRef.current = getCanvasPos(e);
      drawCanvasRef.current?.setPointerCapture(e.pointerId);
    },
    [getCanvasPos],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      const canvas = drawCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      const pos = getCanvasPos(e);
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPosRef.current = pos;
    },
    [getCanvasPos],
  );

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  const clearDrawCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Handle upload preview
  useEffect(() => {
    if (!uploadedFile) {
      setUploadPreview(null);
      return;
    }
    const url = URL.createObjectURL(uploadedFile);
    setUploadPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [uploadedFile]);

  const renderTypedToCanvas = useCallback((): HTMLCanvasElement | null => {
    const canvas = typeCanvasRef.current;
    if (!canvas || !typedText) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 600;
    canvas.height = 150;
    ctx.clearRect(0, 0, 600, 150);
    ctx.fillStyle = '#111827';
    ctx.font = `48px ${FONTS[selectedFont].css}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(typedText, 20, 75);
    return canvas;
  }, [typedText, selectedFont]);

  const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
    new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

  const handleSave = useCallback(async () => {
    if (!signerName.trim() || !signerEmail.trim()) {
      toast.error('Signer name and email are required');
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      let signatureTypeCode: string;
      let blob: Blob | null = null;

      if (tab === 'type') {
        const canvas = renderTypedToCanvas();
        if (!canvas) {
          toast.error('Please type a signature');
          setSaving(false);
          return;
        }
        blob = await canvasToBlob(canvas);
        signatureTypeCode = 'TYPED';
      } else if (tab === 'draw') {
        const canvas = drawCanvasRef.current;
        if (!canvas) {
          toast.error('Please draw a signature');
          setSaving(false);
          return;
        }
        blob = await canvasToBlob(canvas);
        signatureTypeCode = 'DRAWN';
      } else {
        if (!uploadedFile) {
          toast.error('Please upload a signature image');
          setSaving(false);
          return;
        }
        blob = uploadedFile;
        signatureTypeCode = 'UPLOADED';
      }

      if (!blob) {
        toast.error('Failed to capture signature');
        setSaving(false);
        return;
      }

      // Upload signature image
      const uuid = crypto.randomUUID();
      const sigFile = new File([blob], `${uuid}.png`, { type: 'image/png' });
      const storagePath = `${tenantId}/signatures/${proposalId}/${uuid}.png`;

      const { fileId } = await uploadToStorage({
        supabase,
        bucket: 'documents',
        path: storagePath,
        file: sigFile,
        tenantId,
        entityType: 'PROPOSAL_SIGNATURE',
        entityId: proposalId,
      });

      // Create signature record via API (captures IP + user agent server-side)
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/proposals/${proposalId}/signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          proposalId,
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          signatureTypeCode,
          signatureFileId: fileId,
          signatureFontName: tab === 'type' ? FONTS[selectedFont].name : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? 'Signature save failed');
      }

      const { signature } = await res.json();
      toast.success('Signature captured');
      onCaptured(signature as SalesProposalSignature);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signature save failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [
    signerName, signerEmail, tab, selectedFont, uploadedFile,
    proposalId, tenantId, renderTypedToCanvas, onCaptured, onClose,
  ]);

  return (
    <SlideOver open={open} onClose={onClose} title="Capture Signature" wide>
      <div className="space-y-6">
        {/* Signer info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Signer Name *
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Signer Email *
            </label>
            <input
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="email@example.com"
            />
          </div>
        </div>

        {/* Mode tabs */}
        <ChipTabs tabs={TABS} active={tab} onChange={setTab} />

        {/* Type tab */}
        {tab === 'type' && (
          <div className="space-y-4">
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Type your name..."
            />

            <div className="flex gap-2">
              {FONTS.map((font, i) => (
                <button
                  key={font.name}
                  type="button"
                  onClick={() => setSelectedFont(i)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-center transition-colors ${
                    selectedFont === i
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/40'
                  }`}
                  style={{ fontFamily: font.css, fontSize: '18px' }}
                >
                  {typedText || 'Preview'}
                </button>
              ))}
            </div>

            {/* Hidden canvas for export */}
            <canvas ref={typeCanvasRef} className="hidden" />
          </div>
        )}

        {/* Draw tab */}
        {tab === 'draw' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Draw your signature below
              </p>
              <Button variant="ghost" size="sm" onClick={clearDrawCanvas}>
                <Eraser className="h-3 w-3" />
                Clear
              </Button>
            </div>
            <canvas
              ref={drawCanvasRef}
              className="w-full h-40 rounded-lg border border-border bg-white cursor-crosshair touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>
        )}

        {/* Upload tab */}
        {tab === 'upload' && (
          <div className="space-y-4">
            {uploadPreview ? (
              <div className="space-y-2">
                <div className="rounded-lg border border-border p-4 bg-white flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadPreview}
                    alt="Signature preview"
                    className="max-h-32 object-contain"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setUploadedFile(null)}
                >
                  Choose different image
                </Button>
              </div>
            ) : (
              <FileDropzone
                onFileSelect={setUploadedFile}
                accept="image/*"
                maxSizeMB={5}
                label="Drop a signature image or click to browse"
              />
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Signature'}
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}
