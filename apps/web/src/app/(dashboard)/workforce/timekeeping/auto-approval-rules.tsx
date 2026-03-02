'use client';

import { useState } from 'react';
import { Plus, ShieldCheck, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  EmptyState, Badge, Button, Card, CardContent, SlideOver, Input, Select, FormSection,
} from '@gleamops/ui';

interface AutoApprovalRule {
  id: string;
  name: string;
  description: string;
  condition_type: 'within_geofence' | 'max_duration' | 'no_exceptions' | 'combined';
  threshold_value: string;
  priority: number;
  is_active: boolean;
}

const CONDITION_OPTIONS = [
  { value: 'within_geofence', label: 'Within Geofence' },
  { value: 'max_duration', label: 'Max Duration' },
  { value: 'no_exceptions', label: 'No Exceptions' },
  { value: 'combined', label: 'Combined' },
];

const CONDITION_LABELS: Record<string, string> = {
  within_geofence: 'Clock-in within geofence AND duration < threshold',
  max_duration: 'Duration less than threshold hours',
  no_exceptions: 'No exceptions on entry',
  combined: 'Within geofence AND no exceptions AND under threshold',
};

const SAMPLE_RULES: AutoApprovalRule[] = [
  {
    id: '1',
    name: 'Within Geofence — Auto-approve',
    description: 'Auto-approve when clock-in is within geofence and duration is under 10 hours.',
    condition_type: 'within_geofence',
    threshold_value: '10h',
    priority: 1,
    is_active: true,
  },
  {
    id: '2',
    name: 'Short Shift — Auto-approve',
    description: 'Auto-approve shifts under 4 hours with no exceptions.',
    condition_type: 'max_duration',
    threshold_value: '4h',
    priority: 2,
    is_active: true,
  },
  {
    id: '3',
    name: 'No Exceptions — Auto-approve',
    description: 'Auto-approve entries with zero exceptions.',
    condition_type: 'no_exceptions',
    threshold_value: '0',
    priority: 3,
    is_active: false,
  },
];

const EMPTY_FORM: Omit<AutoApprovalRule, 'id'> = {
  name: '',
  description: '',
  condition_type: 'within_geofence',
  threshold_value: '',
  priority: 1,
  is_active: true,
};

export default function AutoApprovalRules({ search }: { search: string }) {
  const [rules, setRules] = useState<AutoApprovalRule[]>(SAMPLE_RULES);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoApprovalRule | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = search
    ? rules.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.condition_type.toLowerCase().includes(search.toLowerCase())
      )
    : rules;

  const openCreate = () => {
    setEditingRule(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (rule: AutoApprovalRule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      description: rule.description,
      condition_type: rule.condition_type,
      threshold_value: rule.threshold_value,
      priority: rule.priority,
      is_active: rule.is_active,
    });
    setFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Rule name is required.');
      return;
    }

    if (editingRule) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === editingRule.id ? { ...r, ...form } : r
        )
      );
      toast.success('Rule updated');
    } else {
      const newRule: AutoApprovalRule = {
        id: String(Date.now()),
        ...form,
      };
      setRules((prev) => [...prev, newRule]);
      toast.success('Rule created');
    }
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (!editingRule) return;
    setRules((prev) => prev.filter((r) => r.id !== editingRule.id));
    toast.success('Rule deleted');
    setFormOpen(false);
  };

  const toggleActive = (id: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, is_active: !r.is_active } : r
      )
    );
  };

  if (filtered.length === 0 && !search) {
    return (
      <div>
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            New Rule
          </Button>
        </div>
        <EmptyState
          icon={<ShieldCheck className="h-12 w-12" />}
          title="No Auto-approval Rules"
          description="Create rules to automatically approve timesheets and clock entries that meet specific conditions."
          actionLabel="+ New Rule"
          onAction={openCreate}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} rule{filtered.length !== 1 ? 's' : ''} configured
          <span className="ml-2 text-xs text-muted-foreground/70">(sample data — backend integration pending)</span>
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          New Rule
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Rule Name</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16">Active</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filtered.map((rule) => (
                <TableRow
                  key={rule.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openEdit(rule)}
                >
                  <TableCell className="font-medium text-foreground">{rule.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {CONDITION_LABELS[rule.condition_type] ?? rule.condition_type}
                    {rule.threshold_value && ` (${rule.threshold_value})`}
                  </TableCell>
                  <TableCell className="tabular-nums">{rule.priority}</TableCell>
                  <TableCell>
                    <Badge color={rule.is_active ? 'green' : 'gray'}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rule.is_active}
                      onClick={() => toggleActive(rule.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        rule.is_active ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                          rule.is_active ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* SlideOver Form */}
      <SlideOver
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingRule ? 'Edit Rule' : 'New Rule'}
      >
        <form onSubmit={handleSave} className="space-y-8">
          <FormSection
            title="Rule Configuration"
            icon={<ShieldCheck className="h-4 w-4" />}
            description="Define conditions for automatic approval."
          >
            <Input
              label="Rule Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="e.g., Within Geofence — Auto-approve"
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe what this rule does..."
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Select
              label="Condition Type"
              value={form.condition_type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  condition_type: e.target.value as AutoApprovalRule['condition_type'],
                }))
              }
              options={CONDITION_OPTIONS}
            />
            <Input
              label="Threshold Value"
              value={form.threshold_value}
              onChange={(e) => setForm((f) => ({ ...f, threshold_value: e.target.value }))}
              placeholder="e.g., 10h, 0, etc."
              hint="The value compared against (hours, count, etc.)"
            />
            <Input
              label="Priority"
              type="number"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) || 1 }))}
              hint="Lower number = higher priority"
            />
            <Select
              label="Enabled"
              value={form.is_active ? 'true' : 'false'}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value === 'true' }))}
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
            />
          </FormSection>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
            {editingRule && (
              <Button variant="secondary" type="button" onClick={handleDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <div className="ml-auto flex gap-3">
              <Button variant="secondary" type="button" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingRule ? 'Save Changes' : 'Create Rule'}
              </Button>
            </div>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
