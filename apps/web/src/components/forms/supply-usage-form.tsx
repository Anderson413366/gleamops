'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import {
  SlideOver,
  Button,
  Input,
  Select,
  Skeleton,
} from '@gleamops/ui';
import { BarcodeScanner } from '@/components/scanner/barcode-scanner';

const UNIT_OPTIONS = [
  { value: 'EACH', label: 'Each' },
  { value: 'BOTTLE', label: 'Bottle' },
  { value: 'GALLON', label: 'Gallon' },
  { value: 'BOX', label: 'Box' },
  { value: 'CASE', label: 'Case' },
  { value: 'ROLL', label: 'Roll' },
];

interface SupplyOption {
  id: string;
  code: string;
  name: string;
  unit: string;
  barcode: string | null;
}

interface SupplyUsageFormProps {
  open: boolean;
  onClose: () => void;
  ticketId: string;
  onSuccess?: () => void;
}

export function SupplyUsageForm({ open, onClose, ticketId, onSuccess }: SupplyUsageFormProps) {
  const { tenantId, user } = useAuth();
  const [supplies, setSupplies] = useState<SupplyOption[]>([]);
  const [loadingSupplies, setLoadingSupplies] = useState(true);
  const [saving, setSaving] = useState(false);

  const [supplyId, setSupplyId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('EACH');
  const [notes, setNotes] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  // Fetch supply catalog
  useEffect(() => {
    if (!open) return;
    setLoadingSupplies(true);
    const supabase = getSupabaseBrowserClient();
    supabase
      .from('supply_catalog')
      .select('id, code, name, unit, barcode')
      .is('archived_at', null)
      .order('name')
      .then(({ data }) => {
        setSupplies(data ?? []);
        setLoadingSupplies(false);
      });
  }, [open]);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setSupplyId('');
      setQuantity('1');
      setUnit('EACH');
      setNotes('');
      setShowScanner(false);
    }
  }, [open]);

  const handleBarcodeDetected = useCallback((code: string) => {
    setShowScanner(false);
    const match = supplies.find((s) => s.barcode === code || s.code === code);
    if (match) {
      setSupplyId(match.id);
      toast.success(`Found: ${match.name}`);
    } else {
      toast.error(`No supply found for barcode: ${code}`);
    }
  }, [supplies]);

  // Auto-set unit when supply changes
  useEffect(() => {
    if (!supplyId) return;
    const found = supplies.find((s) => s.id === supplyId);
    if (found?.unit) setUnit(found.unit);
  }, [supplyId, supplies]);

  const handleSubmit = async () => {
    if (!supplyId) {
      toast.error('Please select a supply');
      return;
    }
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      toast.error('Quantity must be positive');
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from('ticket_supply_usage')
        .insert({
          tenant_id: tenantId,
          ticket_id: ticketId,
          supply_id: supplyId,
          quantity_used: qty,
          unit,
          logged_by: user?.id ?? null,
          notes: notes.trim() || null,
        });

      if (error) throw error;
      toast.success('Supply usage logged');
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to log supply usage');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOver open={open} onClose={onClose} title="Log Supply Usage">
      <div className="space-y-4">
        {loadingSupplies ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground">Supply</label>
              <button
                type="button"
                onClick={() => setShowScanner(!showScanner)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
              >
                <ScanLine className="h-3.5 w-3.5" />
                {showScanner ? 'Hide Scanner' : 'Scan Barcode'}
              </button>
            </div>
            {showScanner && (
              <div className="mb-3">
                <BarcodeScanner
                  onDetected={handleBarcodeDetected}
                  onClose={() => setShowScanner(false)}
                />
              </div>
            )}
            <Select
              value={supplyId}
              onChange={(e) => setSupplyId(e.target.value)}
              options={[
                { value: '', label: 'Select a supply...' },
                ...supplies.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` })),
              ]}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Quantity</label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="0.01"
              step="0.01"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Unit</label>
            <Select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              options={UNIT_OPTIONS}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., extra cleaning required"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            <Plus className="h-4 w-4" />
            Log Usage
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}
