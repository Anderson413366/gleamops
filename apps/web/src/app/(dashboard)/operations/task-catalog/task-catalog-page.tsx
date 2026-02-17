'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SearchInput } from '@gleamops/ui';
import { useState } from 'react';
import TaskCatalogTable from './task-catalog-table';

export default function TaskCatalogStandalonePage() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <Link
        href="/operations?tab=task-catalog"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Operations
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Task Catalog</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Master task library for standardized service-plan scope of work.
        </p>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search tasks by name, code, or category..."
      />

      <TaskCatalogTable search={search} />
    </div>
  );
}
