# UI Refresh Migration Checklist

> Backend is locked. No Supabase/migration/RLS changes.

---

## Phase 1: Design Tokens & Foundations

### 1A — Token Alignment (globals.css)
- [ ] Shift dark mode from true-black (`#000000`) to dark blue-gray (`#1a1f2e` / `#0f172a`)
- [ ] Align primary color: `#007AFF` → `#3b82f6` (Blue-600) with hover `#2563eb` (Blue-700)
- [ ] Add semantic token aliases for status colors: `--color-status-success`, `--color-status-error`, `--color-status-warning`, `--color-status-info`
- [ ] Add semantic tokens for progress bars: `--color-progress-bg`, `--color-progress-fill`
- [ ] Add token for required-field indicator: `--color-required` (destructive red)
- [ ] Verify sidebar tokens still work after primary shift

### 1B — Radius Standardization
- [ ] Audit `packages/ui/` — change `rounded-xl` → `rounded-lg` on cards, buttons, inputs (22 occurrences)
- [ ] Keep `rounded-xl` only on overlays: SlideOver, ConfirmDialog, CommandPalette
- [ ] Keep `rounded-full` on avatars, dots, progress bars
- [ ] Document radius convention in `.claude/rules/ui.md`

### 1C — Shadow Standardization
- [ ] Cards baseline: `shadow-sm` (already mostly correct)
- [ ] Card hover: `hover:shadow-md` (verify consistency)
- [ ] Overlays (SlideOver, dialogs): `shadow-xl` or `shadow-2xl`
- [ ] Buttons: `shadow-sm`, `hover:shadow-md` for primary; no shadow for ghost/secondary

### 1D — Transition Standardization
- [ ] Normalize all `transition-colors` → `transition-all duration-200 ease-in-out` for consistency
- [ ] Verify custom animations (slide-in-right, fade-in, scale-in) still work
- [ ] Add active/pressed state: `active:scale-[0.98]` on buttons

---

## Phase 2: packages/ui Component Reskin

### 2A — Badge
- [ ] Add optional leading dot indicator (small circle before text)
- [ ] Add border to badges: `border border-{color}-200` pattern
- [ ] Ensure all 7 colors (green/red/yellow/blue/orange/purple/gray) have consistent bg + border + text

### 2B — Button
- [ ] Apply `rounded-lg` (currently `rounded-xl`)
- [ ] Add `active:scale-[0.98]` press feedback
- [ ] Verify 4 variants (primary/secondary/ghost/danger) match old style
- [ ] Ensure shadow-sm on primary, no shadow on ghost

### 2C — Card / CollapsibleCard
- [ ] Apply `rounded-lg` (currently `rounded-xl`)
- [ ] Ensure `shadow-sm` baseline, `hover:shadow-md` on interactive cards
- [ ] CollapsibleCard: verify keyboard accessibility (Enter/Space toggle)
- [ ] CollapsibleCard: verify localStorage persistence works

### 2D — Input / Select / Textarea
- [ ] Apply `rounded-lg` (currently `rounded-xl`)
- [ ] Verify focus ring: `focus:ring-2 focus:ring-ring/40 focus:ring-offset-2`
- [ ] Error state: `border-destructive` (not hard-coded `border-red-*`)

### 2E — SlideOver
- [ ] Keep `rounded-xl` (overlay exception)
- [ ] Verify `shadow-2xl` on panel
- [ ] Verify backdrop blur + fade animation

### 2F — ChipTabs
- [ ] Active tab: primary blue fill + white text
- [ ] Inactive: `bg-muted text-muted-foreground`
- [ ] Support optional count badge on tabs
- [ ] Horizontal overflow scroll on mobile

### 2G — Table (data-table)
- [ ] Verify header uses `bg-muted` (not hard-coded gray)
- [ ] Verify hover row uses `hover:bg-muted/50`
- [ ] Sortable column headers: clear active indicator

### 2H — Pagination
- [ ] Apply `rounded-lg` to page buttons
- [ ] Active page: `bg-primary text-primary-foreground`

### 2I — StatCard
- [ ] Apply `rounded-lg`
- [ ] Trend indicator colors: semantic tokens (success/destructive)

### 2J — Skeleton / TableSkeleton
- [ ] Ensure shimmer animation uses `bg-muted`

### 2K — FormWizard
- [ ] Step indicator: active uses primary, completed uses success
- [ ] Progress bar: semantic token colors

### 2L — Other Components
- [ ] ConfirmDialog: `rounded-xl`, `shadow-xl`
- [ ] CommandPalette: `rounded-xl`, `shadow-2xl`
- [ ] ExportButton: consistent with Button variant
- [ ] AccessDenied: consistent with Card styling
- [ ] Tooltip: `rounded-lg`, `shadow-md`
- [ ] ArchiveDialog: consistent with ConfirmDialog
- [ ] BulkActions: consistent toolbar styling

---

## Phase 3: Layout Shell

### 3A — Sidebar
- [ ] Match old Anderson feel: sidebar bg token, border-r, hover states
- [ ] Active nav item: `bg-primary/10 text-primary` (already close, verify)
- [ ] Mobile: hamburger + overlay + slide-in (already exists, verify animation)
- [ ] Footer section: avatar, role badge, settings, sign out

### 3B — Header (if separate from sidebar)
- [ ] Dark mode toggle (sun/moon icon)
- [ ] User avatar / profile dropdown
- [ ] Breadcrumb or page title

### 3C — Login Page
- [ ] Centered card with `rounded-xl shadow-xl`
- [ ] Primary button full-width
- [ ] Consistent input styling

---

## Phase 4: Page-by-Page Hard-Coded Color Cleanup

### Priority 1 — Worst Offenders (20+ violations each)
- [ ] `operations/tickets/ticket-detail.tsx` — 23 hard-coded colors
- [ ] `schedule/tickets/ticket-detail.tsx` — 23 hard-coded colors
- [ ] `schedule/inspections/inspection-detail.tsx`
- [ ] `schedule/calendar/week-calendar.tsx`
- [ ] `pipeline/bids/bid-wizard.tsx`

### Priority 2 — Moderate (10–19 violations each)
- [ ] `pipeline/prospects/` pages
- [ ] `pipeline/proposals/` pages
- [ ] `crm/clients/` pages
- [ ] `crm/sites/` pages
- [ ] `operations/` remaining pages
- [ ] `workforce/staff/` pages

### Priority 3 — Minor (< 10 violations)
- [ ] `home/page.tsx` (dashboard)
- [ ] `inventory/` pages
- [ ] `assets/` pages
- [ ] `vendors/` pages
- [ ] `safety/` pages
- [ ] `admin/` pages

### Common Replacements Reference
| Hard-coded | Semantic replacement |
|-----------|---------------------|
| `bg-gray-50`, `bg-gray-100` | `bg-muted` |
| `bg-gray-200` | `bg-muted` or `bg-border` |
| `border-gray-200`, `border-gray-300` | `border-border` |
| `text-gray-300`, `text-gray-400` | `text-muted-foreground` |
| `text-gray-500`, `text-gray-600` | `text-muted-foreground` |
| `bg-red-50` | `bg-destructive/10` |
| `text-red-500`, `text-red-600`, `text-red-700` | `text-destructive` |
| `border-red-200` | `border-destructive/30` |
| `bg-green-50`, `bg-green-100` | `bg-success/10` |
| `text-green-500`, `text-green-600` | `text-success` |
| `border-green-200` | `border-success/30` |
| `bg-blue-50`, `bg-blue-100` | `bg-primary/10` or `bg-info/10` |
| `text-blue-500`, `text-blue-600` | `text-primary` or `text-info` |
| `bg-blue-500` | `bg-primary` |
| `bg-green-500` | `bg-success` |
| `bg-white` | `bg-background` or `bg-card` |
| `text-white` (on colored bg) | `text-primary-foreground` or keep if on bg-primary |

---

## Phase 5: Dark Mode Refinement

- [ ] Default dark mode: dark blue-gray (not true black)
- [ ] Add optional "True Black" toggle in settings (for OLED)
- [ ] Verify all semantic tokens have dark-mode overrides
- [ ] Test every page in dark mode for contrast issues
- [ ] Verify sidebar, header, cards, modals all look correct in dark mode

---

## Phase 6: Final Verification

- [ ] `pnpm build` succeeds
- [ ] `pnpm typecheck` passes
- [ ] No hard-coded Tailwind colors remain in page files (only in packages/ui internals)
- [ ] Visual spot-check: Login, Dashboard, Pipeline list, CRM list, SlideOver form
- [ ] Dark mode spot-check: same pages above
- [ ] Mobile responsive spot-check: sidebar, tables, forms
- [ ] No backend/Supabase files were modified
