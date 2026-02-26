'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import type { StaffPosition } from '@gleamops/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  SlideOver,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
  ViewToggle,
} from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useViewPreference } from '@/hooks/use-view-preference';
import { PositionForm } from '@/components/forms/position-form';

import { PositionTypeCardGrid } from './position-type-card-grid';

interface Props {
  search: string;
}

interface StaffCountLite {
  role: string | null;
  staff_type: string | null;
}

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function briefDescription(position: StaffPosition): string {
  const note = position.notes?.trim();
  if (!note) return 'No notes provided';
  const firstLine = note.split(/\r?\n/)[0]?.trim();
  return firstLine && firstLine.length > 0 ? firstLine : 'No notes provided';
}

export default function PositionTypesTable({ search }: Props) {
  const [rows, setRows] = useState<StaffPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StaffPosition | null>(null);
  const [editingRow, setEditingRow] = useState<StaffPosition | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [staffCountByPositionId, setStaffCountByPositionId] = useState<Record<string, number>>({});
  const { view, setView, mounted } = useViewPreference('admin-position-types');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('staff_positions')
      .select('*')
      .is('archived_at', null)
      .order('title');

    if (!error && data) {
      const positionRows = data as StaffPosition[];
      setRows(positionRows);

      const { data: staffRows } = await supabase
        .from('staff')
        .select('role, staff_type')
        .is('archived_at', null);

      const staff = (staffRows ?? []) as StaffCountLite[];
      const counts: Record<string, number> = {};
      for (const position of positionRows) {
        const byCode = normalize(position.position_code);
        const byTitle = normalize(position.title);
        counts[position.id] = staff.filter((member) => {
          const role = normalize(member.role);
          const staffType = normalize(member.staff_type);
          return role === byCode || role === byTitle || staffType === byCode || staffType === byTitle;
        }).length;
      }
      setStaffCountByPositionId(counts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const query = search.trim().toLowerCase();
    return rows.filter((row) => (
      row.position_code.toLowerCase().includes(query)
      || row.title.toLowerCase().includes(query)
      || (row.department ?? '').toLowerCase().includes(query)
      || (row.notes ?? '').toLowerCase().includes(query)
    ));
  }, [rows, search]);

  const openCreate = () => {
    setEditingRow(null);
    setFormOpen(true);
  };

  const openEdit = (row: StaffPosition) => {
    setEditingRow(row);
    setFormOpen(true);
  };

  if (loading) {
    return <TableSkeleton rows={8} cols={6} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <ViewToggle view={mounted ? view : 'list'} onChange={setView} />
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Position Type
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={search ? 'No matching position types' : 'No position types yet'}
          description={search ? 'Try another search term.' : 'Create your first position type to start assigning schedule colors.'}
        />
      ) : view === 'card' ? (
        <PositionTypeCardGrid
          rows={filtered}
          staffCountByPositionId={staffCountByPositionId}
          onSelect={setSelected}
        />
      ) : (
        <div className="w-full overflow-x-auto">
          <Table className="w-full min-w-full">
            <TableHeader>
              <tr>
                <TableHead>Code</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelected(row)}>
                  <TableCell className="font-mono text-xs">{row.position_code}</TableCell>
                  <TableCell className="font-medium text-foreground">{row.title}</TableCell>
                  <TableCell>{row.department?.trim() || <span className="text-muted-foreground">Not set</span>}</TableCell>
                  <TableCell>{staffCountByPositionId[row.id] ?? 0}</TableCell>
                  <TableCell>
                    <Badge color={row.is_active ? 'green' : 'gray'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium text-foreground transition hover:bg-muted"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEdit(row);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title || 'Position Type'}
        subtitle={selected?.position_code}
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <Card>
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Status</span>
                  <Badge color={selected.is_active ? 'green' : 'gray'}>
                    {selected.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Department</span>
                  <span className="text-right font-medium text-foreground">{selected.department?.trim() || 'Not set'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Pay Grade</span>
                  <span className="text-right font-medium text-foreground">{selected.pay_grade?.trim() || 'Not set'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Assigned Staff</span>
                  <span className="text-right font-medium text-foreground">{staffCountByPositionId[selected.id] ?? 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Description</p>
                <p className="mt-2 text-sm text-foreground">{briefDescription(selected)}</p>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setSelected(null);
                  openEdit(selected);
                }}
              >
                <Pencil className="h-4 w-4" />
                Edit Position Type
              </Button>
            </div>
          </div>
        )}
      </SlideOver>

      <PositionForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingRow(null);
        }}
        initialData={editingRow}
        onSuccess={() => {
          setFormOpen(false);
          setEditingRow(null);
          void fetchData();
        }}
      />
    </div>
  );
}
