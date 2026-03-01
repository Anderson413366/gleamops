'use client';

import { useState } from 'react';
import { Plus, Tag } from 'lucide-react';
import { Button, Card, CardContent, Table, TableHeader, TableHead, TableBody, TableRow, TableCell, EmptyState, Badge } from '@gleamops/ui';

interface ShiftTag {
  id: string;
  name: string;
  color: string;
  description: string;
  shift_count: number;
}

const TAG_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'orange' | 'gray'> = {
  green: 'green',
  blue: 'blue',
  yellow: 'yellow',
  red: 'red',
  purple: 'purple',
  orange: 'orange',
  gray: 'gray',
};

const SAMPLE_TAGS: ShiftTag[] = [
  { id: '1', name: 'Training', color: 'blue', description: 'Shifts that include training activities', shift_count: 12 },
  { id: '2', name: 'Deep Clean', color: 'green', description: 'Deep cleaning shift rotation', shift_count: 8 },
  { id: '3', name: 'Emergency Cover', color: 'red', description: 'Emergency coverage shifts', shift_count: 3 },
  { id: '4', name: 'Weekend Premium', color: 'purple', description: 'Weekend shifts with premium pay', shift_count: 15 },
];

export default function ShiftTagsTable({ search }: { search: string }) {
  const [tags] = useState<ShiftTag[]>(SAMPLE_TAGS);

  const filtered = search
    ? tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()))
    : tags;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Tag className="h-12 w-12" />}
        title="No Shift Tags"
        description="Create tags to categorize and group shifts for easier management."
        actionLabel="+ Add Shift Tag"
        onAction={() => {}}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} shift tag{filtered.length !== 1 ? 's' : ''}</p>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Add Shift Tag
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Tag Name</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Shifts Using</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filtered.map((tag) => (
                <TableRow key={tag.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground">{tag.name}</TableCell>
                  <TableCell>
                    <Badge color={TAG_COLORS[tag.color] ?? 'gray'}>{tag.color}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] truncate">{tag.description}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{tag.shift_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
