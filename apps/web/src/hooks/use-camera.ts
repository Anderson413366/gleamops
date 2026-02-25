'use client';

import { useCallback, useEffect, useState, type ChangeEvent } from 'react';

export function useCamera() {
  const [file, setFileState] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clear = useCallback(() => {
    setFileState(null);
    setError(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  const setFile = useCallback((nextFile: File | null) => {
    setError(null);

    if (!nextFile) {
      setFileState(null);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      return;
    }

    if (!nextFile.type.startsWith('image/')) {
      setError('Selfie must be an image file.');
      return;
    }

    const nextPreview = URL.createObjectURL(nextFile);
    setFileState(nextFile);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextPreview;
    });
  }, []);

  const handleFileInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
  }, [setFile]);

  useEffect(() => () => {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  return {
    file,
    previewUrl,
    error,
    setFile,
    handleFileInputChange,
    clear,
  };
}

