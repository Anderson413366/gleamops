'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Building2, FileText, CheckCircle, DollarSign, Layers, Pen,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@gleamops/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProposalData {
  send: { id: string; status: string; recipient_name: string | null; recipient_email: string };
  proposal: { id: string; proposal_code: string; status: string; notes: string | null; pricing_option_count: number };
  bid: { bid_code: string; total_sqft: number | null; bid_monthly_price: number | null; client: { name: string } | null; service: { name: string } | null } | null;
  pricing: { recommended_price: number; total_monthly_cost: number; effective_margin_pct: number; burdened_labor_cost: number; supplies_cost: number; equipment_cost: number; overhead_cost: number } | null;
  workload: { monthly_hours: number; cleaners_needed: number } | null;
  areas: Array<{ name: string; square_footage: number; quantity: number; building_type_code: string | null }>;
  company: { name: string; logo_url: string | null; primary_color: string | null } | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

// ---------------------------------------------------------------------------
// Signature Section (inline — no auth required)
// ---------------------------------------------------------------------------
function PublicSignatureSection({ token, onSigned }: { token: string; onSigned: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [saving, setSaving] = useState(false);

  const startDraw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }, []);

  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  }, [isDrawing]);

  const stopDraw = useCallback(() => setIsDrawing(false), []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = async () => {
    if (!signerName.trim() || !signerEmail.trim()) {
      toast.error('Name and email are required');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to capture signature');

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const res = await fetch(`/api/public/proposals/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signer_name: signerName.trim(),
          signer_email: signerEmail.trim(),
          signature_type_code: 'DRAWN',
          signature_data: base64,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Signature failed');
      }

      toast.success('Proposal accepted and signed!');
      onSigned();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Signature failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pen className="h-4 w-4" />
          Accept & Sign
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Your Name</label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Your Email</label>
            <input
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="email@company.com"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Draw Your Signature</label>
          <div className="mt-1 rounded-lg border border-border bg-white overflow-hidden">
            <canvas
              ref={canvasRef}
              width={500}
              height={150}
              className="w-full cursor-crosshair touch-none"
              onPointerDown={startDraw}
              onPointerMove={draw}
              onPointerUp={stopDraw}
              onPointerLeave={stopDraw}
            />
          </div>
          <button
            type="button"
            onClick={clearCanvas}
            className="mt-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear signature
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button onClick={handleSign} loading={saving}>
            <CheckCircle className="h-4 w-4" />
            Accept & Sign Proposal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function ProposalPublicPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/proposals/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Proposal not found');
        return res.json();
      })
      .then((d) => { setData(d as ProposalData); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [token]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Proposal Not Found</h1>
        <p className="text-sm text-muted-foreground">
          This proposal link may have expired or is invalid.
        </p>
      </div>
    );
  }

  const { proposal, bid, pricing, workload, areas, company, send } = data;
  const isSignable = !signed && proposal.status !== 'WON' && proposal.status !== 'LOST';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Company Header */}
      <div className="text-center space-y-2">
        {company?.logo_url && (
          <div className="mx-auto h-16 w-16 rounded-full overflow-hidden bg-muted">
            <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${company.logo_url})` }} />
          </div>
        )}
        <h1 className="text-2xl font-bold text-foreground">
          {company?.name ?? 'Service Proposal'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Proposal {proposal.proposal_code}
          {send.recipient_name ? ` for ${send.recipient_name}` : ''}
        </p>
      </div>

      {/* Status */}
      {signed && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-4 text-center">
          <CheckCircle className="h-8 w-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            Proposal accepted and signed. Thank you!
          </p>
        </div>
      )}

      {/* Client & Service */}
      {bid && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Client</p>
              </div>
              <p className="text-sm font-medium">{bid.client?.name ?? '---'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Service</p>
              </div>
              <p className="text-sm font-medium">{bid.service?.name ?? '---'}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pricing */}
      {pricing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-primary">{fmt(pricing.recommended_price)}</p>
              <p className="text-xs text-muted-foreground">per month</p>
            </div>
            {workload && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Hours</p>
                  <p className="font-medium">{workload.monthly_hours.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Team Size</p>
                  <p className="font-medium">{workload.cleaners_needed} cleaner{workload.cleaners_needed !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scope of Work */}
      {areas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Scope of Work
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {areas.map((area, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{area.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {area.square_footage.toLocaleString()} sq ft
                    {area.quantity > 1 ? ` x ${area.quantity}` : ''}
                  </span>
                </div>
              ))}
              {bid?.total_sqft && (
                <div className="flex items-center justify-between text-sm border-t border-border pt-2 mt-2 font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">{bid.total_sqft.toLocaleString()} sq ft</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {proposal.notes && (
        <Card>
          <CardHeader><CardTitle>Additional Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{proposal.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Signature Section */}
      {isSignable && (
        <PublicSignatureSection token={token} onSigned={() => setSigned(true)} />
      )}

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pt-8 pb-4 border-t border-border">
        <p>Powered by GleamOps</p>
      </div>
    </div>
  );
}
