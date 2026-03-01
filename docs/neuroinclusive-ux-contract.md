# Neuroinclusive UX Contract

> 12 UX rules for ADHD, Dyslexia, and Anxiety optimization.

## ADHD — Progressive Disclosure

### Rule 1: Table Rows Navigate to Full Detail Pages
- **Acceptance:** Clicking any data table row opens a detail page at `/{module}/{entity}/{code}`
- **NOT:** Drawers, modals, or inline expansion for read views
- **Status:** PASS — All 18 entity detail pages use `router.push()` navigation. Position table fixed this sprint (was using SlideOver).

### Rule 2: One Blue CTA Per Page
- **Acceptance:** Each page has at most one primary blue `<Button>` for the main action
- **NOT:** Multiple competing blue CTAs
- **Status:** PASS — Detail pages: "Edit" is secondary variant. "Add [Entity]" is the single primary CTA on list pages.

### Rule 3: ChipTabs for Module Sections
- **Acceptance:** Module pages use `<ChipTabs>` component for section navigation
- **NOT:** Standard tabs, accordion, or dropdown navigation
- **Status:** PASS — All 13 module pages use ChipTabs with `useSyncedTab` hook.

### Rule 4: Filter Chips for Status Filtering
- **Acceptance:** Tables with status columns show pill-style filter buttons with count badges
- **NOT:** Dropdown select for status filtering
- **Status:** PASS — Implemented across major tables (staff, clients, jobs, tickets, etc.)

## Dyslexia — Spacing & Scanning

### Rule 5: Detail Pages Use `<dl>` for Key-Value Pairs
- **Acceptance:** All detail page sections render key-value data as `<dl className="space-y-3 text-sm">` with `<div className="flex justify-between">` children
- **NOT:** Inline text like "Department: Operations" or tables for metadata
- **Status:** PASS — All 18 detail pages follow this pattern.

### Rule 6: Card Grids Use Centered Layout with Large Avatars
- **Acceptance:** Card grid items show `h-20 w-20` avatar circles with large initials, centered text
- **NOT:** Left-aligned small icons or no visual anchor
- **Status:** PASS — 20 card grid components follow this pattern.

### Rule 7: Inter Font Family Throughout
- **Acceptance:** `font-family: 'Inter', sans-serif` applied globally
- **NOT:** System fonts, serif, or mixed font families
- **Status:** PASS — Set in Tailwind config and global CSS.

### Rule 8: Entity Codes in Monospace Badges
- **Acceptance:** Entity codes (STF-0001, CLI-1001, etc.) render in `font-mono text-xs` within muted background badges
- **NOT:** Inline text without visual distinction
- **Status:** PASS — Table cells and detail page headers use monospace code badges.

## Anxiety — Predictability

### Rule 9: Back Links on Every Detail Page
- **Acceptance:** Every detail page starts with `<Link href="/module">← Back to Module</Link>`
- **NOT:** Browser back button as primary navigation
- **Status:** PASS — All 18 detail pages include back links to canonical module routes.

### Rule 10: Modals Have Both Close Button and Cancel Button
- **Acceptance:** All dialogs/modals include an `×` close button AND a "Cancel" text button
- **NOT:** Only one dismiss method
- **Status:** PASS — `ConfirmDialog`, `SlideOver`, and `StatusToggleDialog` all implement both.

### Rule 11: Frosted Glass Header
- **Acceptance:** App header uses `backdrop-blur-md` with semi-transparent background
- **NOT:** Solid opaque header or no blur
- **Status:** PASS — Header component uses `backdrop-blur-md bg-card/80`.

### Rule 12: Deactivate/Archive Uses Outline Variant with Red Styling
- **Acceptance:** Deactivate/Archive buttons use `border border-destructive/40 text-destructive` styling
- **NOT:** Primary red button (too anxiety-inducing) or unstyled text button (too easy to miss)
- **Status:** PASS — All detail pages use outline-styled deactivate buttons with red border/text.

---

## Compliance Checklist

| # | Rule | Domain | Status |
|---|------|--------|--------|
| 1 | Table rows → detail pages | ADHD | PASS |
| 2 | One blue CTA per page | ADHD | PASS |
| 3 | ChipTabs for sections | ADHD | PASS |
| 4 | Filter chips with counts | ADHD | PASS |
| 5 | `<dl>` key-value layout | Dyslexia | PASS |
| 6 | Centered card grids | Dyslexia | PASS |
| 7 | Inter font | Dyslexia | PASS |
| 8 | Monospace code badges | Dyslexia | PASS |
| 9 | Back links | Anxiety | PASS |
| 10 | Dual dismiss (close + cancel) | Anxiety | PASS |
| 11 | Frosted glass header | Anxiety | PASS |
| 12 | Outline deactivate buttons | Anxiety | PASS |
