'use client';

import { useState, useCallback, useRef } from 'react';
import type { ZodError } from 'zod';
import { toast } from 'sonner';

type AnyZodSchema = {
  safeParse: (data: unknown) => { success: true; data: unknown } | { success: false; error: ZodError };
};

/**
 * Thrown when an optimistic-lock update finds 0 affected rows.
 * This means another user modified the record between load and save.
 */
export class ConflictError extends Error {
  constructor(message = 'This record was modified by another user. Please refresh and try again.') {
    super(message);
    this.name = 'ConflictError';
  }
}

/**
 * Checks that a Supabase `.update().select()` actually returned data.
 * Supabase returns `{ data: null, error: null }` when WHERE doesn't match
 * (e.g., version_etag mismatch), which looks like success but isn't.
 */
export function assertUpdateSucceeded(result: { data: unknown; error: unknown }) {
  if (result.error) {
    throw result.error;
  }
  const data = result.data;
  if (data === null || (Array.isArray(data) && data.length === 0)) {
    throw new ConflictError();
  }
}

interface UseFormOptions<T> {
  schema: AnyZodSchema;
  initialValues: T;
  onSubmit: (data: T) => Promise<void>;
}

export function useForm<T extends Record<string, unknown>>({
  schema,
  initialValues,
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [loading, setLoading] = useState(false);
  const touched = useRef(new Set<string>());

  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    touched.current.add(key as string);
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear error on change
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const onBlur = useCallback(
    (key: keyof T) => {
      touched.current.add(key as string);
      const result = schema.safeParse(values);
      if (!result.success) {
        const fieldError = result.error.issues.find(
          (issue) => issue.path[0] === key
        );
        if (fieldError) {
          setErrors((prev) => ({ ...prev, [key]: fieldError.message }));
        } else {
          setErrors((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [schema, values]
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const result = schema.safeParse(values);
      if (!result.success) {
        const fieldErrors: Partial<Record<keyof T, string>> = {};
        for (const issue of result.error.issues) {
          const key = issue.path[0] as keyof T;
          if (!fieldErrors[key]) {
            fieldErrors[key] = issue.message;
          }
        }
        setErrors(fieldErrors);
        return;
      }
      setLoading(true);
      try {
        await onSubmit(result.data as T);
      } catch (err) {
        console.error('Form submit error:', err);
        if (err instanceof ConflictError) {
          toast.error(err.message, { duration: Infinity });
        } else if (err instanceof Error) {
          toast.error(err.message, { duration: Infinity });
        } else {
          toast.error('An unexpected error occurred.', { duration: Infinity });
        }
      } finally {
        setLoading(false);
      }
    },
    [schema, values, onSubmit]
  );

  const reset = useCallback((newValues?: T) => {
    setValues(newValues ?? initialValues);
    setErrors({});
    touched.current.clear();
  }, [initialValues]);

  return {
    values,
    errors,
    loading,
    setValue,
    onBlur,
    handleSubmit,
    reset,
    touched: touched.current,
  };
}
