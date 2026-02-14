'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '../utils';

export interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  disabled?: boolean;
  uploading?: boolean;
  className?: string;
}

export function FileDropzone({
  onFileSelect,
  accept = 'application/pdf,image/*',
  maxSizeMB = 10,
  label = 'Drop a file here or click to browse',
  disabled = false,
  uploading = false,
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null);

      // Size check
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File exceeds ${maxSizeMB}MB limit`);
        return;
      }

      // Type check
      if (accept) {
        const accepted = accept.split(',').map((t) => t.trim());
        const isValid = accepted.some((a) => {
          if (a.endsWith('/*')) {
            return file.type.startsWith(a.replace('/*', '/'));
          }
          return file.type === a;
        });
        if (!isValid) {
          setError('File type not supported');
          return;
        }
      }

      onFileSelect(file);
    },
    [accept, maxSizeMB, onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || uploading) return;
      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [disabled, uploading, validateAndSelect],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSelect(file);
      // Reset so the same file can be selected again
      e.target.value = '';
    },
    [validateAndSelect],
  );

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 border-dashed p-6 text-center transition-colors',
        dragOver
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/40',
        (disabled || uploading) && 'pointer-events-none opacity-50',
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled && !uploading) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Uploading...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xs text-muted-foreground/60">
            Max {maxSizeMB}MB
          </p>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
