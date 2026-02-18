'use client';

import { useEffect, useId } from 'react';
import { ScanLine, X } from 'lucide-react';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const elementId = useId().replace(/:/g, '_');
  const viewfinderId = `scanner-${elementId}`;
  const { scanning, start, stop, error } = useBarcodeScanner(onDetected);

  useEffect(() => {
    // Small delay to ensure DOM element is rendered
    const timer = setTimeout(() => {
      start(viewfinderId);
    }, 100);
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [viewfinderId, start, stop]);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ScanLine className="h-4 w-4" />
          Scan Barcode
        </div>
        <button
          type="button"
          onClick={() => { stop(); onClose(); }}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        id={viewfinderId}
        className="w-full rounded-lg overflow-hidden bg-black"
        style={{ minHeight: 200 }}
      />

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {scanning && (
        <p className="text-xs text-muted-foreground text-center">
          Point camera at a barcode or QR code...
        </p>
      )}
    </div>
  );
}
