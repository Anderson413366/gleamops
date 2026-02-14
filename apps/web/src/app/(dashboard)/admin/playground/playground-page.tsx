'use client';

import { useState } from 'react';
import {
  Package, Wrench, Truck, Users, DollarSign, Briefcase,
  AlertTriangle, Settings, Plus, Trash2, Sun, Moon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Input,
  Select,
  Textarea,
  Badge,
  StatusPill,
  Card, CardHeader, CardTitle, CardContent, CardFooter,
  CollapsibleCard,
  StatCard,
  ChipTabs,
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  Pagination,
  SlideOver,
  Skeleton, TableSkeleton, CardSkeleton,
} from '@gleamops/ui';
import type { StatusColor } from '@gleamops/shared';
import { CLIENT_STATUS_COLORS, JOB_STATUS_COLORS, BADGE_COLOR_CLASSES } from '@gleamops/shared';

/* ── Token swatch data ── */
const TOKEN_SWATCHES = [
  { label: 'bg', token: '--background' },
  { label: 'fg', token: '--foreground' },
  { label: 'card', token: '--card' },
  { label: 'muted', token: '--muted' },
  { label: 'mut-fg', token: '--muted-foreground' },
  { label: 'border', token: '--border' },
  { label: 'primary', token: '--primary' },
  { label: 'pri-fg', token: '--primary-foreground' },
  { label: 'secondary', token: '--secondary' },
  { label: 'destructive', token: '--destructive' },
  { label: 'success', token: '--success' },
  { label: 'warning', token: '--warning' },
  { label: 'sidebar', token: '--sidebar-bg' },
  { label: 'side-act', token: '--sidebar-active' },
];

/* ── Select options ── */
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

/* ── Badge colors ── */
const BADGE_COLORS: StatusColor[] = ['green', 'red', 'yellow', 'blue', 'gray', 'orange', 'purple'];
const BADGE_LABELS: Record<StatusColor, string> = {
  green: 'Active', red: 'Canceled', yellow: 'Pending',
  blue: 'In Progress', gray: 'Draft', orange: 'High', purple: 'Special',
};

/* ── ChipTabs data ── */
const TABS_WITH_COUNTS = [
  { key: 'supplies', label: 'Supplies', icon: <Package className="h-4 w-4" />, count: 128 },
  { key: 'equipment', label: 'Equipment', icon: <Wrench className="h-4 w-4" />, count: 34 },
  { key: 'vehicles', label: 'Vehicles', icon: <Truck className="h-4 w-4" />, count: 8 },
];
const PLAIN_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'draft', label: 'Draft' },
];

/* ── Table data ── */
const SAMPLE_DATA = [
  { code: 'CLI-1001', name: 'Acme Corp', status: 'ACTIVE' as const, sites: 4, revenue: '$12,400' },
  { code: 'CLI-1002', name: 'Beacon LLC', status: 'ACTIVE' as const, sites: 2, revenue: '$6,800' },
  { code: 'CLI-1003', name: 'Cedar Inc', status: 'ON_HOLD' as const, sites: 1, revenue: '$3,200' },
  { code: 'CLI-1004', name: 'Delta Group', status: 'INACTIVE' as const, sites: 0, revenue: '$0' },
  { code: 'CLI-1005', name: 'Echo Partners', status: 'ACTIVE' as const, sites: 7, revenue: '$28,900' },
];
/* Table uses centralized CLIENT_STATUS_COLORS from @gleamops/shared */

/* ── Button variants/sizes ── */
const VARIANTS = ['primary', 'secondary', 'ghost', 'danger'] as const;
const SIZES = ['sm', 'md', 'lg', 'icon'] as const;

/* ═══════════════════════════════════════════════════════
   PLAYGROUND PAGE
   ═══════════════════════════════════════════════════════ */

export default function PlaygroundPageClient() {
  const [chipTab1, setChipTab1] = useState('supplies');
  const [chipTab2, setChipTab2] = useState('all');
  const [slideOpen, setSlideOpen] = useState(false);
  const [slideWideOpen, setSlideWideOpen] = useState(false);

  const toggleDark = () => {
    const html = document.documentElement;
    html.classList.toggle('dark');
    // Remove true-black when toggling base dark
    html.removeAttribute('data-theme');
  };

  const toggleTrueBlack = () => {
    const html = document.documentElement;
    if (!html.classList.contains('dark')) html.classList.add('dark');
    if (html.getAttribute('data-theme') === 'true-black') {
      html.removeAttribute('data-theme');
    } else {
      html.setAttribute('data-theme', 'true-black');
    }
  };

  return (
    <div className="space-y-12 pb-20">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">UI Playground</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Design system components with new semantic token layer
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={toggleDark}>
            <Sun className="h-4 w-4" />
            Toggle Dark
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleTrueBlack}>
            <Moon className="h-4 w-4" />
            True Black
          </Button>
        </div>
      </div>

      {/* ── Token Swatches ── */}
      <Section title="Token Swatches" subtitle="Live resolved values from CSS custom properties">
        <div className="flex flex-wrap gap-3">
          {TOKEN_SWATCHES.map(({ label, token }) => (
            <div key={token} className="flex flex-col items-center gap-1">
              <div
                className="h-10 w-10 rounded-md border border-border shadow-sm"
                style={{ backgroundColor: `var(${token})` }}
              />
              <span className="text-[10px] text-muted-foreground font-mono">{label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Buttons ── */}
      <Section title="Buttons" subtitle="4 variants x 4 sizes + loading/disabled states">
        <div className="space-y-4">
          {VARIANTS.map((variant) => (
            <div key={variant} className="flex items-center gap-3 flex-wrap">
              <span className="w-20 text-xs font-mono text-muted-foreground">{variant}</span>
              {SIZES.map((size) => (
                <Button key={`${variant}-${size}`} variant={variant} size={size}>
                  {size === 'icon' ? <Plus className="h-4 w-4" /> : `${variant} ${size}`}
                </Button>
              ))}
            </div>
          ))}
          <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-border">
            <span className="w-20 text-xs font-mono text-muted-foreground">states</span>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <Button variant="secondary" loading>Sec Loading</Button>
            <Button variant="danger" disabled>Danger Off</Button>
          </div>
        </div>
      </Section>

      {/* ── Inputs / Select / Textarea ── */}
      <Section title="Form Fields" subtitle="Default, error, and disabled states">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Default */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Default</p>
            <Input label="Full Name" placeholder="Jane Smith" hint="As it appears on ID" />
            <Select label="Role" options={ROLE_OPTIONS} placeholder="Select role..." />
            <Textarea label="Notes" placeholder="Any additional context..." />
            <Input label="Required Field" required placeholder="Shows red asterisk" />
          </div>
          {/* Error */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Error</p>
            <Input label="Email" defaultValue="not-an-email" error="Invalid email address" />
            <Select label="Status" options={STATUS_OPTIONS} error="Status is required" />
            <Textarea label="Reason" error="Please provide a reason" />
          </div>
          {/* Disabled */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Disabled</p>
            <Input label="Code" value="CLI-0042" disabled hint="Auto-generated" />
            <Select label="Type" options={TYPE_OPTIONS} disabled value="STANDARD" />
            <Textarea label="Locked" value="Read-only content" disabled />
          </div>
        </div>
      </Section>

      {/* ── Badges ── */}
      <Section title="Badges" subtitle="7 semantic colors, dot on/off, centralized via BADGE_COLOR_CLASSES">
        <div className="space-y-6">
          {/* Row 1: All colors with dot */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">With dot</p>
            <div className="flex flex-wrap gap-2">
              {BADGE_COLORS.map((c) => (
                <Badge key={c} color={c} dot>{BADGE_LABELS[c]}</Badge>
              ))}
            </div>
          </div>

          {/* Row 2: All colors without dot */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Without dot</p>
            <div className="flex flex-wrap gap-2">
              {BADGE_COLORS.map((c) => (
                <Badge key={`${c}-nodot`} color={c} dot={false}>{BADGE_LABELS[c]}</Badge>
              ))}
            </div>
          </div>

          {/* Row 3: StatusPill — automatic label from centralized maps */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">StatusPill (centralized maps)</p>
            <div className="flex flex-wrap gap-2">
              <StatusPill status="ACTIVE" colorMap={CLIENT_STATUS_COLORS} />
              <StatusPill status="ON_HOLD" colorMap={CLIENT_STATUS_COLORS} />
              <StatusPill status="CANCELED" colorMap={CLIENT_STATUS_COLORS} />
              <StatusPill status="DRAFT" colorMap={JOB_STATUS_COLORS} />
              <StatusPill status="COMPLETED" colorMap={JOB_STATUS_COLORS} />
            </div>
          </div>

          {/* Row 4: Color swatch reference */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Color reference (from BADGE_COLOR_CLASSES)</p>
            <div className="flex flex-wrap gap-3">
              {BADGE_COLORS.map((c) => {
                const classes = BADGE_COLOR_CLASSES[c];
                return (
                  <div key={`swatch-${c}`} className="flex items-center gap-2">
                    <span className={`inline-block h-4 w-4 rounded-full ${classes.dot}`} />
                    <span className="text-xs font-mono text-muted-foreground">{c}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Cards + CollapsibleCard ── */}
      <Section title="Cards" subtitle="Standard Card, CardFooter, and CollapsibleCard with localStorage">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Standard Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Card body content showing typography and spacing. Uses bg-card and border-border tokens.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm">Cancel</Button>
              <Button size="sm">Save</Button>
            </CardFooter>
          </Card>

          <div className="space-y-4">
            <CollapsibleCard
              id="playground-collapsible-1"
              title="Collapsible Section"
              icon={<Settings className="h-5 w-5" />}
              headerRight={<Badge color="blue">3 items</Badge>}
            >
              <p className="text-sm text-muted-foreground">
                This section remembers its open/closed state across page loads via localStorage.
              </p>
            </CollapsibleCard>

            <CollapsibleCard
              id="playground-collapsible-2"
              title="Starts Collapsed"
              defaultOpen={false}
            >
              <p className="text-sm text-muted-foreground">
                Opened via click or Enter/Space. Keyboard accessible.
              </p>
            </CollapsibleCard>
          </div>
        </div>
      </Section>

      {/* ── StatCards ── */}
      <Section title="Stat Cards" subtitle="With trend, icon, and link variants">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Clients" value="185" icon={<Users className="h-5 w-5" />} trend="+12%" trendUp />
          <StatCard label="Monthly Revenue" value="$47,250" icon={<DollarSign className="h-5 w-5" />} trend="-3%" trendUp={false} />
          <StatCard label="Open Jobs" value="42" icon={<Briefcase className="h-5 w-5" />} />
          <StatCard label="Open Issues" value="7" icon={<AlertTriangle className="h-5 w-5" />} href="#" />
        </div>
      </Section>

      {/* ── ChipTabs ── */}
      <Section title="ChipTabs" subtitle="With icons + counts, and plain">
        <div className="space-y-4">
          <ChipTabs tabs={TABS_WITH_COUNTS} active={chipTab1} onChange={setChipTab1} />
          <ChipTabs tabs={PLAIN_TABS} active={chipTab2} onChange={setChipTab2} />
        </div>
      </Section>

      {/* ── DataTable ── */}
      <Section title="DataTable" subtitle="Sortable headers, clickable rows, pagination">
        <Table>
          <TableHeader>
            <tr>
              <TableHead sortable sorted="asc" onSort={() => toast('Sort: code')}>Code</TableHead>
              <TableHead sortable sorted={false} onSort={() => toast('Sort: name')}>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead sortable sorted={false} onSort={() => toast('Sort: sites')}>Sites</TableHead>
              <TableHead>Revenue</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {SAMPLE_DATA.map((row) => (
              <TableRow key={row.code} onClick={() => toast(`Clicked ${row.code}`)}>
                <TableCell className="font-mono text-xs">{row.code}</TableCell>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>
                  <Badge color={CLIENT_STATUS_COLORS[row.status]}>{row.status}</Badge>
                </TableCell>
                <TableCell>{row.sites}</TableCell>
                <TableCell className="font-mono text-xs">{row.revenue}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination
          currentPage={1} totalPages={3} totalItems={12} pageSize={5}
          hasNext hasPrev={false} onNext={() => toast('Next page')} onPrev={() => {}}
        />
      </Section>

      {/* ── SlideOver ── */}
      <Section title="SlideOver" subtitle="Standard and wide panel">
        <div className="flex gap-3">
          <Button onClick={() => setSlideOpen(true)}>Open SlideOver</Button>
          <Button variant="secondary" onClick={() => setSlideWideOpen(true)}>Open Wide SlideOver</Button>
        </div>

        <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title="Edit Client" subtitle="CLI-1001">
          <div className="space-y-4">
            <Input label="Name" defaultValue="Acme Corp" />
            <Select label="Status" options={STATUS_OPTIONS} defaultValue="ACTIVE" />
            <Textarea label="Notes" placeholder="Internal notes..." />
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="secondary" onClick={() => setSlideOpen(false)}>Cancel</Button>
              <Button onClick={() => { setSlideOpen(false); toast.success('Saved!'); }}>Save</Button>
            </div>
          </div>
        </SlideOver>

        <SlideOver open={slideWideOpen} onClose={() => setSlideWideOpen(false)} title="Wide Panel" wide>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This is the wide variant (max-w-2xl). Good for complex forms or detail views.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" placeholder="Jane" />
              <Input label="Last Name" placeholder="Smith" />
            </div>
            <Select label="Role" options={ROLE_OPTIONS} placeholder="Select..." />
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="secondary" onClick={() => setSlideWideOpen(false)}>Cancel</Button>
              <Button onClick={() => { setSlideWideOpen(false); toast.success('Saved!'); }}>Save</Button>
            </div>
          </div>
        </SlideOver>
      </Section>

      {/* ── Skeletons ── */}
      <Section title="Skeletons" subtitle="Loading states">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </div>
          <CardSkeleton />
        </div>
        <div className="mt-4">
          <TableSkeleton rows={3} cols={4} />
        </div>
      </Section>
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ title, subtitle, children }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
      <hr className="mt-8 border-border" />
    </section>
  );
}
