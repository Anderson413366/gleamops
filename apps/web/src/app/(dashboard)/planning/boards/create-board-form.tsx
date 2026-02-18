'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchJsonWithSupabaseAuth } from '@/lib/supabase/authenticated-fetch';
import { SlideOver, Input, Select, Textarea, Button, FormSection } from '@gleamops/ui';

const SCOPE_OPTIONS = [
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'REGION', label: 'Region' },
  { value: 'GLOBAL', label: 'Global' },
];

interface CreateBoardFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateBoardForm({ open, onClose, onSuccess }: CreateBoardFormProps) {
  const supabase = getSupabaseBrowserClient();
  const [title, setTitle] = useState('');
  const [boardDate, setBoardDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scope, setScope] = useState('SUPERVISOR');
  const [supervisorId, setSupervisorId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [supervisors, setSupervisors] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setBoardDate(new Date().toISOString().slice(0, 10));
    setScope('SUPERVISOR');
    setSupervisorId('');
    setNotes('');
  }, [open]);

  useEffect(() => {
    supabase
      .from('staff')
      .select('id, full_name, staff_code')
      .is('archived_at', null)
      .order('full_name')
      .then(({ data }) => {
        if (data) {
          setSupervisors(data.map((s) => ({
            value: s.id,
            label: `${s.full_name ?? s.staff_code} (${s.staff_code})`,
          })));
        }
      });
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required.');
      return;
    }
    setSaving(true);
    try {
      await fetchJsonWithSupabaseAuth(supabase, '/api/planning/boards', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          board_date: boardDate,
          workspace_scope: scope,
          supervisor_staff_id: supervisorId || null,
          notes: notes.trim() || null,
        }),
      });
      toast.success('Board created.');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create board');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOver open={open} onClose={onClose} title="New Planning Board">
      <form onSubmit={handleSubmit} className="space-y-8">
        <FormSection title="Board Details" icon={<ClipboardList className="h-4 w-4" />} description="Configure the planning board.">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Input label="Date" type="date" value={boardDate} onChange={(e) => setBoardDate(e.target.value)} />
          <Select label="Scope" value={scope} onChange={(e) => setScope(e.target.value)} options={SCOPE_OPTIONS} />
          <Select
            label="Supervisor"
            value={supervisorId}
            onChange={(e) => setSupervisorId(e.target.value)}
            options={[{ value: '', label: 'None' }, ...supervisors]}
          />
          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </FormSection>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Create Board</Button>
        </div>
      </form>
    </SlideOver>
  );
}
