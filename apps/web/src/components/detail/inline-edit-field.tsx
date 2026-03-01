'use client';

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { Pencil, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type FieldType = 'text' | 'number' | 'date' | 'time' | 'select' | 'textarea' | 'boolean';

type State = 'display' | 'editing' | 'saving';

interface SelectOption {
  value: string;
  label: string;
}

interface InlineEditFieldProps {
  /** Current DB value */
  value: unknown;
  /** Custom formatted display (currency, badges, etc.) — shown in display mode */
  displayValue?: ReactNode;
  /** Input type. Default: 'text' */
  fieldType?: FieldType;
  /** Options for select fields */
  selectOptions?: SelectOption[];
  /** Placeholder text for the input */
  placeholder?: string;
  /** Supabase table name */
  table: string;
  /** UUID of the record */
  recordId: string;
  /** Column name */
  field: string;
  /** Current version_etag for optimistic locking */
  versionEtag: string;
  /** Transform raw input string before saving (e.g. Number, JSONB merge) */
  parseValue?: (raw: string) => unknown;
  /** Format the DB value for the input element */
  formatForInput?: (value: unknown) => string;
  /** Called after successful save — parent should refetch for fresh version_etag */
  onSaved?: () => void;
  /** Layout style. Default: 'horizontal' */
  layout?: 'horizontal' | 'vertical';
  /** Render wrapper element. Default: 'dd' */
  renderAs?: 'dd' | 'span' | 'p';
  /** Additional className for the wrapper */
  className?: string;
}

function valueToInputString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export function InlineEditField({
  value,
  displayValue,
  fieldType = 'text',
  selectOptions,
  placeholder,
  table,
  recordId,
  field,
  versionEtag,
  parseValue,
  formatForInput,
  onSaved,
  layout = 'horizontal',
  renderAs = 'dd',
  className,
}: InlineEditFieldProps) {
  const [state, setState] = useState<State>('display');
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (state === 'editing' && inputRef.current) {
      inputRef.current.focus();
      // Select text for text/number inputs
      if (inputRef.current instanceof HTMLInputElement && (fieldType === 'text' || fieldType === 'number')) {
        inputRef.current.select();
      }
    }
  }, [state, fieldType]);

  const enterEditMode = useCallback(() => {
    if (state !== 'display') return;
    const formatted = formatForInput ? formatForInput(value) : valueToInputString(value);
    setDraft(formatted);
    setState('editing');
  }, [state, value, formatForInput]);

  const cancel = useCallback(() => {
    setState('display');
  }, []);

  const save = useCallback(async (rawValue: string) => {
    const newValue = parseValue ? parseValue(rawValue) : (rawValue.trim() === '' ? null : rawValue.trim());
    // Skip save if value unchanged
    const currentStr = valueToInputString(value);
    const newStr = newValue == null ? '' : String(newValue);
    if (currentStr === newStr) {
      setState('display');
      return;
    }
    setState('saving');
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from(table)
        .update({ [field]: newValue })
        .eq('id', recordId)
        .eq('version_etag', versionEtag)
        .select('version_etag')
        .single();

      if (error) {
        toast.error(error.message);
        setState('editing');
        return;
      }
      if (!data) {
        toast.error('This record was modified by another user. Please refresh and try again.');
        setState('editing');
        return;
      }
      toast.success('Saved');
      setState('display');
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
      setState('editing');
    }
  }, [value, parseValue, table, field, recordId, versionEtag, onSaved]);

  // -- Boolean: toggle on click, no edit mode --
  if (fieldType === 'boolean') {
    const boolValue = value === true;
    const handleToggle = async () => {
      if (state === 'saving') return;
      await save(boolValue ? 'false' : 'true');
    };

    const display = displayValue ?? (boolValue ? 'Yes' : 'No');
    const Wrapper = renderAs === 'dd' ? 'dd' : renderAs === 'p' ? 'p' : 'span';
    return (
      <Wrapper
        className={`group relative inline-flex items-center gap-1.5 cursor-pointer rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors hover:bg-muted/50 ${layout === 'horizontal' ? 'font-medium text-right' : 'font-medium mt-1'} ${className ?? ''}`}
        onClick={() => { void handleToggle(); }}
      >
        {state === 'saving' ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : (
          <>
            <span>{display}</span>
            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground" />
          </>
        )}
      </Wrapper>
    );
  }

  // -- Display mode --
  if (state === 'display') {
    const isEmpty = value == null || (typeof value === 'string' && value.trim() === '');
    const display = displayValue ?? (isEmpty
      ? <span className="italic text-muted-foreground">Not Set</span>
      : String(value));

    const Wrapper = renderAs === 'dd' ? 'dd' : renderAs === 'p' ? 'p' : 'span';
    return (
      <Wrapper
        className={`group relative inline-flex items-center gap-1.5 cursor-pointer rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors hover:bg-muted/50 ${layout === 'horizontal' ? 'font-medium text-right' : 'font-medium mt-1'} ${className ?? ''}`}
        onClick={enterEditMode}
      >
        <span>{display}</span>
        <Pencil className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground" />
      </Wrapper>
    );
  }

  // -- Saving mode (spinner in place of input) --
  if (state === 'saving') {
    const Wrapper = renderAs === 'dd' ? 'dd' : renderAs === 'p' ? 'p' : 'span';
    return (
      <Wrapper className={`inline-flex items-center gap-1.5 ${layout === 'horizontal' ? 'font-medium text-right' : 'font-medium mt-1'} ${className ?? ''}`}>
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Saving...</span>
      </Wrapper>
    );
  }

  // -- Editing mode --
  const Wrapper = renderAs === 'dd' ? 'dd' : renderAs === 'p' ? 'p' : 'span';

  // Select: save on change
  if (fieldType === 'select') {
    return (
      <Wrapper className={`${layout === 'horizontal' ? 'text-right' : 'mt-1'} ${className ?? ''}`}>
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); void save(e.target.value); }}
          onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
          className="h-8 rounded-md border border-border bg-background text-sm px-2"
        >
          <option value="">— Select —</option>
          {selectOptions?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </Wrapper>
    );
  }

  // Textarea: save/cancel buttons
  if (fieldType === 'textarea') {
    return (
      <Wrapper className={`mt-1 ${className ?? ''}`}>
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-md border border-border bg-background text-sm px-2 py-1.5 resize-y min-h-[4rem]"
        />
        <div className="mt-1.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => { void save(draft); }}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Check className="h-3 w-3" /> Save
          </button>
          <button
            type="button"
            onClick={cancel}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3 w-3" /> Cancel
          </button>
        </div>
      </Wrapper>
    );
  }

  // Text / number / date / time: Enter or blur to save, Escape to cancel
  const inputType = fieldType === 'number' ? 'number'
    : fieldType === 'date' ? 'date'
    : fieldType === 'time' ? 'time'
    : 'text';

  return (
    <Wrapper className={`${layout === 'horizontal' ? 'text-right' : 'mt-1'} ${className ?? ''}`}>
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={inputType}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void save(draft);
          }
          if (e.key === 'Escape') cancel();
        }}
        onBlur={() => { void save(draft); }}
        placeholder={placeholder}
        className="h-8 rounded-md border border-border bg-background text-sm px-2 w-full max-w-[200px]"
      />
    </Wrapper>
  );
}
