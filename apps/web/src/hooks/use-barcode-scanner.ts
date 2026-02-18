'use client';

import { useCallback, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface UseBarcodeScanner {
  scanning: boolean;
  start: (elementId: string) => Promise<void>;
  stop: () => Promise<void>;
  lastResult: string | null;
  error: string | null;
}

export function useBarcodeScanner(onDetected: (code: string) => void): UseBarcodeScanner {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (elementId: string) => {
    try {
      setError(null);
      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          setLastResult(decodedText);
          onDetected(decodedText);
          // Auto-stop after successful scan
          scanner.stop().then(() => setScanning(false)).catch(() => {});
        },
        () => {
          // scan miss — ignore
        },
      );
      setScanning(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera access failed');
      setScanning(false);
    }
  }, [onDetected]);

  const stop = useCallback(async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
    } catch {
      // ignore
    }
    scannerRef.current = null;
    setScanning(false);
  }, []);

  return { scanning, start, stop, lastResult, error };
}
