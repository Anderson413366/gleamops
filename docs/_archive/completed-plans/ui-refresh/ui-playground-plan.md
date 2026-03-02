# UI Playground Plan

> Internal dev-only page for visually inspecting all design system components during the token migration.

---

## Route

```
/admin/playground
```

Lives under `/admin` so it's naturally behind auth and won't confuse end-users.
Not linked from the sidebar — accessed by typing the URL directly.

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/web/src/app/(dashboard)/admin/playground/page.tsx` | Route entry — `export const dynamic = 'force-dynamic'` wrapper |
| `apps/web/src/app/(dashboard)/admin/playground/playground-page.tsx` | `'use client'` component with all sections |

Two files total. No new components, no new packages, no shared code changes.

---

## Page Structure

Single scrollable page with labeled sections separated by `<hr />`. Each section gets a heading (`<h2>`) and renders the components in all their variant combinations. A sticky token swatch bar at the top shows current theme colors at a glance.

```
┌─────────────────────────────────────────────┐
│  UI Playground            [Toggle Dark Mode] │
├─────────────────────────────────────────────┤
│  Token Swatches (sticky bar)                │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐ │
│  │bg││fg││cd││mt││bd││pr││sc││dt││su││wa│ │
│  └──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘ │
├─────────────────────────────────────────────┤
│  § Buttons                                  │
│  § Inputs / Select / Textarea               │
│  § Badges                                   │
│  § Cards + CollapsibleCard                  │
│  § StatCards                                │
│  § ChipTabs                                 │
│  § DataTable                                │
│  § SlideOver (trigger button)               │
│  § Skeleton / Loading States                │
└─────────────────────────────────────────────┘
```

---

## Section Specifications

### 0. Token Swatches (sticky)

A row of small color squares showing the live resolved value of each semantic token.
Reads CSS custom properties via `getComputedStyle` so it reflects theme changes instantly.

Tokens to show:
```
background, foreground, card, muted, muted-foreground, border,
primary, primary-foreground, secondary, destructive, success, warning,
sidebar-bg, sidebar-active
```

Each swatch: 32x32px square, rounded-md, with the token name below in 10px text.

### 1. Buttons

Render a grid of all variant x size combinations:

| | `sm` | `md` | `lg` | `icon` |
|---|---|---|---|---|
| **primary** | | | | |
| **secondary** | | | | |
| **ghost** | | | | |
| **danger** | | | | |

Plus one row showing states:
- `loading={true}` (primary md)
- `disabled` (primary md)
- `loading + disabled` (secondary md)

```tsx
import { Button } from '@gleamops/ui';
import { Plus, Trash2, Settings } from 'lucide-react';

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger'] as const;
const SIZES = ['sm', 'md', 'lg', 'icon'] as const;

// Grid: VARIANTS.map → SIZES.map → <Button variant size>
// Icon size uses <Plus className="h-4 w-4" /> as children
```

### 2. Inputs / Select / Textarea

Three columns: **Default**, **Error**, **Disabled**.

```tsx
import { Input, Select, Textarea } from '@gleamops/ui';

// Default
<Input label="Full Name" placeholder="Jane Smith" hint="As it appears on ID" />
<Select label="Role" options={ROLE_OPTIONS} placeholder="Select role..." />
<Textarea label="Notes" placeholder="Any additional context..." />

// Error
<Input label="Email" value="not-an-email" error="Invalid email address" />
<Select label="Status" options={STATUS_OPTIONS} error="Status is required" />
<Textarea label="Reason" error="Please provide a reason" />

// Disabled
<Input label="Code" value="CLI-0042" disabled hint="Auto-generated" />
<Select label="Type" options={TYPE_OPTIONS} disabled value="STANDARD" />
<Textarea label="Locked" value="Read-only content" disabled />

// Required indicator
<Input label="Required Field" required placeholder="Shows red asterisk" />
```

Options constants:
```tsx
const ROLE_OPTIONS = [
  { value: 'OWNER_ADMIN', label: 'Owner / Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'CLEANER', label: 'Cleaner' },
];
const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];
const TYPE_OPTIONS = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PREMIUM', label: 'Premium' },
];
```

### 3. Badges

All 7 colors with dot on and off:

```tsx
import { Badge } from '@gleamops/ui';
import type { BadgeColor } from '@gleamops/ui';

const COLORS: BadgeColor[] = ['green', 'red', 'yellow', 'blue', 'gray', 'orange', 'purple'];
const LABELS: Record<BadgeColor, string> = {
  green: 'Active', red: 'Canceled', yellow: 'Pending',
  blue: 'In Progress', gray: 'Draft', orange: 'High', purple: 'Special',
};

// Row 1: dot={true} (default)
COLORS.map(c => <Badge color={c} dot>{LABELS[c]}</Badge>)

// Row 2: dot={false}
COLORS.map(c => <Badge color={c} dot={false}>{LABELS[c]}</Badge>)
```

### 4. Cards + CollapsibleCard

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CollapsibleCard } from '@gleamops/ui';

// Standard Card
<Card>
  <CardHeader>
    <CardTitle>Standard Card</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Card body content with some text to show typography.</p>
  </CardContent>
  <CardFooter>
    <Button variant="ghost" size="sm">Cancel</Button>
    <Button size="sm">Save</Button>
  </CardFooter>
</Card>

// CollapsibleCard (localStorage key: "playground-collapsible-1")
<CollapsibleCard
  id="playground-collapsible-1"
  title="Collapsible Section"
  icon={<Settings className="h-5 w-5" />}
  headerRight={<Badge color="blue">3 items</Badge>}
>
  <p>This section remembers its open/closed state across page loads.</p>
</CollapsibleCard>

// Second CollapsibleCard (default closed)
<CollapsibleCard
  id="playground-collapsible-2"
  title="Starts Collapsed"
  defaultOpen={false}
>
  <p>Opened via click or Enter/Space.</p>
</CollapsibleCard>
```

### 5. StatCards

A row of 4 StatCards showing different configurations:

```tsx
import { StatCard } from '@gleamops/ui';
import { Users, DollarSign, Briefcase, AlertTriangle } from 'lucide-react';

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard label="Active Clients" value="185" icon={<Users />} trend="+12%" trendUp />
  <StatCard label="Monthly Revenue" value="$47,250" icon={<DollarSign />} trend="-3%" trendUp={false} />
  <StatCard label="Open Jobs" value="42" icon={<Briefcase />} />
  <StatCard label="Open Issues" value="7" icon={<AlertTriangle />} href="#" />
</div>
```

### 6. ChipTabs

Two sets: one with icons + counts, one plain.

```tsx
import { ChipTabs } from '@gleamops/ui';
import { Package, Wrench, Truck } from 'lucide-react';

// With icons + counts
const [activeTab, setActiveTab] = useState('supplies');
const TABS_WITH_COUNTS = [
  { key: 'supplies', label: 'Supplies', icon: <Package className="h-4 w-4" />, count: 128 },
  { key: 'equipment', label: 'Equipment', icon: <Wrench className="h-4 w-4" />, count: 34 },
  { key: 'vehicles', label: 'Vehicles', icon: <Truck className="h-4 w-4" />, count: 8 },
];
<ChipTabs tabs={TABS_WITH_COUNTS} active={activeTab} onChange={setActiveTab} />

// Plain (no icons, no counts)
const [activeTab2, setActiveTab2] = useState('all');
const PLAIN_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'draft', label: 'Draft' },
];
<ChipTabs tabs={PLAIN_TABS} active={activeTab2} onChange={setActiveTab2} />
```

### 7. DataTable

Static sample data, 5 rows. Includes sortable headers and clickable rows.

```tsx
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  Badge, Pagination,
} from '@gleamops/ui';

const SAMPLE_DATA = [
  { code: 'CLI-1001', name: 'Acme Corp', status: 'ACTIVE', sites: 4, revenue: '$12,400' },
  { code: 'CLI-1002', name: 'Beacon LLC', status: 'ACTIVE', sites: 2, revenue: '$6,800' },
  { code: 'CLI-1003', name: 'Cedar Inc', status: 'ON_HOLD', sites: 1, revenue: '$3,200' },
  { code: 'CLI-1004', name: 'Delta Group', status: 'INACTIVE', sites: 0, revenue: '$0' },
  { code: 'CLI-1005', name: 'Echo Partners', status: 'ACTIVE', sites: 7, revenue: '$28,900' },
];

const STATUS_COLOR = { ACTIVE: 'green', ON_HOLD: 'yellow', INACTIVE: 'gray' };

<Table>
  <TableHeader>
    <tr>
      <TableHead sortable sorted="asc" onSort={() => {}}>Code</TableHead>
      <TableHead sortable sorted={false} onSort={() => {}}>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead sortable sorted={false} onSort={() => {}}>Sites</TableHead>
      <TableHead>Revenue</TableHead>
    </tr>
  </TableHeader>
  <TableBody>
    {SAMPLE_DATA.map(row => (
      <TableRow key={row.code} onClick={() => toast(`Clicked ${row.code}`)}>
        <TableCell className="font-mono text-xs">{row.code}</TableCell>
        <TableCell className="font-medium">{row.name}</TableCell>
        <TableCell><Badge color={STATUS_COLOR[row.status]}>{row.status}</Badge></TableCell>
        <TableCell>{row.sites}</TableCell>
        <TableCell className="font-mono text-xs">{row.revenue}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>

<Pagination
  currentPage={1} totalPages={3} totalItems={12} pageSize={5}
  hasNext hasPrev={false} onNext={() => {}} onPrev={() => {}}
/>
```

### 8. SlideOver

A button that opens a SlideOver with sample form content inside.

```tsx
import { SlideOver, Input, Select, Textarea, Button } from '@gleamops/ui';

const [slideOpen, setSlideOpen] = useState(false);

<Button onClick={() => setSlideOpen(true)}>Open SlideOver</Button>
<Button variant="secondary" onClick={() => setSlideWideOpen(true)}>Open Wide SlideOver</Button>

<SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title="Edit Client" subtitle="CLI-1001">
  <div className="space-y-4">
    <Input label="Name" value="Acme Corp" />
    <Select label="Status" options={STATUS_OPTIONS} value="ACTIVE" />
    <Textarea label="Notes" placeholder="Internal notes..." />
    <div className="flex justify-end gap-3 pt-4 border-t border-border">
      <Button variant="secondary" onClick={() => setSlideOpen(false)}>Cancel</Button>
      <Button onClick={() => setSlideOpen(false)}>Save</Button>
    </div>
  </div>
</SlideOver>
```

### 9. Skeleton / Loading States

```tsx
import { Skeleton, TableSkeleton, CardSkeleton } from '@gleamops/ui';

<div className="space-y-3">
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
  <Skeleton className="h-10 w-full" />
</div>

<TableSkeleton rows={3} cols={4} />
<CardSkeleton />
```

---

## Implementation Notes

### Dark mode toggle
The page includes a local toggle button in the header area that adds/removes `.dark` on `<html>`.
This is independent of the global theme hook — purely for playground testing.

```tsx
const toggleDark = () => document.documentElement.classList.toggle('dark');
```

### No routing complexity
The entire playground is a single `'use client'` component. No tabs, no sub-routes, no data fetching.
All data is hardcoded constants. No Supabase calls.

### No production impact
- Not linked from sidebar or any navigation
- No bundle-splitting concern — it's one page behind `/admin`
- Can be removed before production release by deleting the `playground/` directory

### Toast for click feedback
Import `toast` from `sonner` to show click feedback on table rows and buttons,
confirming interactive elements work.

---

## Estimated Size

- `page.tsx`: ~5 lines (wrapper)
- `playground-page.tsx`: ~350–400 lines (all sections in one file)
- No new dependencies
- No shared package changes
