# Developer Workflows

> Step-by-step guides for common development tasks. Copy-paste ready.

---

## Adding a New Entity (End-to-End)

This is the most common task. Example: adding a "Vehicle Inspection" entity.

### Step 1: Database Migration

Create `supabase/migrations/XXXXX_add_vehicle_inspections.sql`:

```sql
CREATE TABLE vehicle_inspections (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  inspection_code TEXT UNIQUE,
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
  inspector_id    UUID REFERENCES staff(id),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT NOT NULL DEFAULT 'DRAFT',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  archived_at     TIMESTAMPTZ,
  archived_by     UUID REFERENCES auth.users(id),
  archive_reason  TEXT,
  version_etag    UUID DEFAULT gen_random_uuid() NOT NULL
);

-- Standard triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON vehicle_inspections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_version_etag BEFORE INSERT OR UPDATE ON vehicle_inspections
  FOR EACH ROW EXECUTE FUNCTION set_version_etag();
CREATE TRIGGER prevent_hard_delete BEFORE DELETE ON vehicle_inspections
  FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- RLS
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_select" ON vehicle_inspections
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY "tenant_insert" ON vehicle_inspections
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY "tenant_update" ON vehicle_inspections
  FOR UPDATE USING (tenant_id = current_tenant_id());
```

### Step 2: TypeScript Interface

Add to `packages/shared/src/types/database.ts`:

```ts
export interface VehicleInspection extends StandardColumns {
  inspection_code: string;
  vehicle_id: string;
  inspector_id: string | null;
  inspection_date: string;
  status: string;
  notes: string | null;
}
```

### Step 3: Zod Schema

Add to `packages/shared/src/validation/`:

```ts
import { z } from 'zod';

export const vehicleInspectionSchema = z.object({
  vehicle_id: z.string().uuid(),
  inspector_id: z.string().uuid().nullable().optional(),
  inspection_date: z.string(),
  status: z.string().default('DRAFT'),
  notes: z.string().nullable().optional(),
});
```

### Step 4: Table Component

Create `apps/web/src/app/(dashboard)/equipment/inspections/inspections-table.tsx`:

Follow the Table Pattern from CLAUDE.md — fetch, filter, sort, paginate, render.

### Step 5: Form Component

Create `apps/web/src/components/forms/vehicle-inspection-form.tsx`:

Follow the Form Pattern — SlideOver + useForm + Zod + optimistic locking.

### Step 6: Wire Into Module Page

Add a tab to the Equipment module page:

```tsx
const TABS = [
  // ... existing tabs
  { key: 'inspections', label: 'Inspections', icon: ClipboardCheck },
];

// In render:
{tab === 'inspections' && <InspectionsTable search={search} />}
```

---

## Adding a Detail Page

### Step 1: Create the Route

Create `apps/web/src/app/(dashboard)/equipment/inspections/[id]/page.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ProfileCompletenessCard } from '@/components/detail/profile-completeness-card';
import { ActivityHistorySection } from '@/components/activity/activity-history-section';

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<VehicleInspection | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('vehicle_inspections')
        .select('*')
        .eq('inspection_code', id)
        .single();
      setItem(data);
    }
    load();
  }, [id]);

  if (!item) return null; // or skeleton

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/equipment?tab=inspections"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Equipment
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">{item.inspection_code}</h1>
        <Badge variant="green">{item.status}</Badge>
      </div>

      {/* Stats, Sections, Activity — follow the pattern */}
    </div>
  );
}
```

### Step 2: Update Table Row Click

In the table component, add router navigation:

```tsx
const router = useRouter();
// In row click handler:
router.push(`/equipment/inspections/${row.inspection_code}`);
```

---

## Adding a New Tab to a Module

1. Add to the `TABS` array:
```tsx
const TABS = [
  ...existing,
  { key: 'new-tab', label: 'New Tab', icon: SomeIcon },
];
```

2. Add aliases if replacing an old tab:
```tsx
const [tab, setTab] = useSyncedTab({
  tabKeys: TABS.map((t) => t.key),
  defaultTab: 'first-tab',
  aliases: { 'old-tab-name': 'new-tab' },
});
```

3. Add conditional render:
```tsx
{tab === 'new-tab' && <NewTabTable search={search} />}
```

---

## Adding a Navigation Module

1. Add module key to `NavSpace` type in `packages/shared/src/types/app.ts`
2. Add entry to `NAV_TREE` in `packages/shared/src/constants/index.ts`
3. Add accent color to `MODULE_ACCENTS` in the same file
4. Add path mapping to `getModuleFromPathname()` in the same file
5. Add icon to `ICON_MAP` in `apps/web/src/components/layout/sidebar.tsx`
6. Create route directory: `apps/web/src/app/(dashboard)/new-module/page.tsx`

---

## Adding Status Filter Chips

```tsx
const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'ON_HOLD', 'all'] as const;
const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

const statusCounts = useMemo(() => {
  const counts: Record<string, number> = {};
  for (const s of STATUS_OPTIONS) {
    counts[s] = s === 'all' ? rows.length : rows.filter((r) => r.status === s).length;
  }
  return counts;
}, [rows]);

const filtered = useMemo(() => {
  if (statusFilter === 'all') return rows;
  return rows.filter((r) => r.status === statusFilter);
}, [rows, statusFilter]);

// Render chips:
<div className="flex flex-wrap gap-2">
  {STATUS_OPTIONS.map((s) => (
    <button key={s} onClick={() => setStatusFilter(s)}
      className={statusFilter === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}>
      {s} ({statusCounts[s]})
    </button>
  ))}
</div>
```

---

## Adding CSV Export

```tsx
import { ExportButton } from '@gleamops/ui';

<ExportButton
  data={filtered}
  filename="vehicle-inspections"
  columns={[
    { key: 'inspection_code', label: 'Code' },
    { key: 'status', label: 'Status' },
    { key: 'inspection_date', label: 'Date' },
  ]}
/>
```

---

## Quality Gates (Before Every Commit)

```bash
pnpm typecheck    # TypeScript — must pass
pnpm build        # Production build — must pass
```

After commit + push, verify Vercel deployment:

```bash
git push origin main
# Wait ~60 seconds
gh api repos/Anderson413366/gleamops/commits/$(git rev-parse HEAD)/statuses
# Look for "state": "success"
```

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Using `bg-gray-*` in page components | Use semantic tokens: `bg-muted`, `text-muted-foreground` |
| Hardcoding `text-white` on colored backgrounds | Use `getContrastTextColor()` from `@/lib/utils/color-contrast` |
| Missing `dark:` variants on status colors | Always add dark mode variants |
| Using `/crm` in new back-links | Use `/clients` (canonical route) |
| Hard-deleting records | Use `archived_at` (trigger blocks DELETE) |
| Forgetting `version_etag` on updates | Always `.eq('version_etag', data.version_etag)` |
| Using admin client for user queries | Use browser/server client (RLS-scoped) |
| `search_path` set to empty string in SQL | Always use `'public'` |
| HEAD requests for KPI counts → 503 | Use `select('id')` with `.data?.length` instead of `{ count: 'exact', head: true }` |
| `new Date().toISOString().slice(0,10)` for dates | Use local date components: `now.getFullYear()-getMonth()-getDate()` (avoids UTC off-by-one) |
| Sidebar tab switching fails on same route | `useSyncedTab` hook always syncs from URL — never blocks external navigation |
| Views with SECURITY DEFINER | Use `ALTER VIEW SET (security_invoker = on)` for RLS enforcement |
