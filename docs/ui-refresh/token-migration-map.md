# Token Migration Map

> Source of truth for the GleamOps UI refresh token migration.
> Goal: adopt the Anderson Cleaning App's semantic token values as defaults,
> keep all existing GleamOps `--color-*` variable names intact so zero classnames break.

---

## 1. Side-by-Side Token Comparison

### 1A — Brand / Primary Scale

| Token | GleamOps (current) | Anderson (target) | Action |
|-------|--------------------|--------------------|--------|
| Brand scale name | `--color-gleam-*` | `--color-brand-*` | Rename `gleam` → `brand` inside `@theme` only (no class changes; scale is internal) |
| Brand 500 (primary) | `#007AFF` (Apple Blue) | `#3b82f6` (Blue-600) | **Change** |
| Brand 600 (hover) | `#007AFF` (dupe of 500) | `#2563eb` (Blue-700) | **Change** |
| Brand 700 | `#004A99` | `#1d4ed8` | **Change** |
| Brand 50 | `#E5F1FF` | `#eff6ff` | **Change** |
| Brand 100 | `#CCE4FF` | `#dbeafe` | **Change** |
| Brand 200 | `#99C8FF` | `#bfdbfe` | **Change** |
| Brand 300 | `#66ADFF` | `#93c5fd` | **Change** |
| Brand 400 | `#3391FF` | `#60a5fa` | **Change** |
| Brand 800 | `#003166` | `#1e40af` | **Change** |
| Brand 900 | `#001933` | `#1e3a8a` | **Change** |
| Brand 950 | `#000D1A` | `#172554` | **Change** |

### 1B — Semantic Tokens (Light Mode)

| Token | GleamOps (current) | Anderson (target) | Delta |
|-------|--------------------|--------------------|-------|
| `--color-background` | `#FFFFFF` | `#ffffff` | Same |
| `--color-foreground` | `#1D1D1F` (Apple gray) | `#0f172a` (Slate-900) | **Change** — deeper blue-slate instead of warm gray |
| `--color-card` | `#FFFFFF` | `#ffffff` | Same |
| `--color-card-foreground` | `#1D1D1F` | `#0f172a` | **Change** (track foreground) |
| `--color-primary` | `#007AFF` | `#3b82f6` | **Change** |
| `--color-primary-foreground` | `#FFFFFF` | `#f8fafc` (Slate-50) | **Change** — slightly warm white |
| `--color-secondary` | `#F5F5F7` (Apple gray) | `#f1f5f9` (Slate-100) | **Change** — blue-tinted neutral |
| `--color-secondary-foreground` | `#1D1D1F` | `#1e293b` (Slate-800) | **Change** |
| `--color-muted` | `#F5F5F7` | `#f1f5f9` | **Change** |
| `--color-muted-foreground` | `#86868B` (Apple gray) | `#64748b` (Slate-500) | **Change** |
| `--color-accent` | `#E5F1FF` | `#f1f5f9` | **Change** — neutral instead of blue-tinted |
| `--color-accent-foreground` | `#003166` | `#1e293b` | **Change** |
| `--color-destructive` | `#FF3B30` (Apple red) | `#ef4444` (Red-500) | **Change** |
| `--color-destructive-foreground` | `#FFFFFF` | `#f8fafc` | **Change** |
| `--color-border` | `#E5E5EA` (Apple gray) | `#e2e8f0` (Slate-200) | **Change** |
| `--color-input` | `#E5E5EA` | `#e2e8f0` | **Change** (track border) |
| `--color-ring` | `#007AFF` | `#3b82f6` | **Change** (track primary) |
| `--color-success` | `#34C759` (Apple green) | `#22c55e` (Green-500) | **Change** |
| `--color-warning` | `#FF9500` (Apple orange) | `#f59e0b` (Amber-500) | **Change** |
| `--color-info` | `#007AFF` | `#3b82f6` | **Change** (track primary) |
| `--color-surface` | `#FFFFFF` | _(not in Anderson)_ | Keep — GleamOps-only token, alias to background |

**Anderson has, GleamOps does not:**

| Token | Anderson value | Action |
|-------|---------------|--------|
| `--color-danger` | `#ef4444` | Add as alias → `--color-destructive` |
| `--radius-sm` | `0.375rem` | Add |
| `--radius-md` | `0.5rem` | Add |
| `--radius-lg` | `0.75rem` | Add |
| `--radius-xl` | `1rem` | Add |

### 1C — Sidebar Tokens (Light Mode)

| Token | GleamOps (current) | Anderson (target) | Delta |
|-------|--------------------|--------------------|-------|
| `--color-sidebar-bg` | `#F5F5F7` (light gray) | `#0f172a` (Slate-900, dark) | **Major change** — Anderson uses a dark sidebar even in light mode |
| `--color-sidebar-text` | `#86868B` | `#94a3b8` (Slate-400) | **Change** |
| `--color-sidebar-active` | `#007AFF` | `#3b82f6` | **Change** (track primary) |
| `--color-sidebar-hover` | `#E8E8ED` | `#1e293b` (Slate-800) | **Change** |

> **Decision:** The Anderson app's dark sidebar in light mode is a strong visual identity marker. Adopt it.

### 1D — Dark Mode Tokens

| Token | GleamOps (current) | Anderson (target) | Delta |
|-------|--------------------|--------------------|-------|
| `--color-background` | `#000000` (true black) | `#0f172a` (Slate-900) | **Major change** — blue-gray, not true black |
| `--color-foreground` | `#F5F5F7` | `#e2e8f0` (Slate-200) | **Change** |
| `--color-card` | `#1C1C1E` (Apple dark) | `#1e293b` (Slate-800) | **Change** |
| `--color-card-foreground` | `#F5F5F7` | `#e2e8f0` | **Change** |
| `--color-primary` | `#0A84FF` | `#3b82f6` | **Change** — keep primary consistent across modes |
| `--color-primary-foreground` | `#FFFFFF` | `#f8fafc` | **Change** |
| `--color-secondary` | `#1C1C1E` | `#1e293b` | **Change** |
| `--color-secondary-foreground` | `#F5F5F7` | `#cbd5e1` (Slate-300) | **Change** |
| `--color-muted` | `#2C2C2E` (Apple dark) | `#1e293b` | **Change** |
| `--color-muted-foreground` | `#98989D` | `#94a3b8` (Slate-400) | **Change** |
| `--color-accent` | `#001933` | `#1e293b` | **Change** |
| `--color-accent-foreground` | `#99C8FF` | `#e2e8f0` | **Change** |
| `--color-destructive` | `#FF453A` | `#ef4444` | **Change** |
| `--color-border` | `#38383A` (Apple dark) | `#334155` (Slate-700) | **Change** |
| `--color-input` | `#38383A` | `#334155` | **Change** |
| `--color-ring` | `#0A84FF` | `#3b82f6` | **Change** |
| `--color-sidebar-bg` | `#1C1C1E` | `#020617` (Slate-950) | **Change** — deeper sidebar |
| `--color-sidebar-hover` | `#2C2C2E` | `#0f172a` | **Change** |

---

## 2. Aliasing Strategy

### Principle
GleamOps uses Tailwind CSS v4 with `@theme` directive. All utility classes (`bg-primary`, `text-foreground`, `border-border`, etc.) are auto-generated from `--color-*` CSS custom properties. **We only change values inside `@theme` and `.dark` — no classnames change.**

### Step-by-step

**Step 1: Replace values in `@theme` block (globals.css)**
```css
@theme {
  /* ── Brand Scale (Anderson Blue-600 family) ── */
  --color-brand-50:  #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-200: #bfdbfe;
  --color-brand-300: #93c5fd;
  --color-brand-400: #60a5fa;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-800: #1e40af;
  --color-brand-900: #1e3a8a;
  --color-brand-950: #172554;

  /* ── Semantic Tokens (Light) ── */
  --color-background:             #ffffff;
  --color-foreground:             #0f172a;
  --color-card:                   #ffffff;
  --color-card-foreground:        #0f172a;
  --color-primary:                #3b82f6;
  --color-primary-foreground:     #f8fafc;
  --color-secondary:              #f1f5f9;
  --color-secondary-foreground:   #1e293b;
  --color-muted:                  #f1f5f9;
  --color-muted-foreground:       #64748b;
  --color-accent:                 #f1f5f9;
  --color-accent-foreground:      #1e293b;
  --color-destructive:            #ef4444;
  --color-destructive-foreground: #f8fafc;
  --color-border:                 #e2e8f0;
  --color-input:                  #e2e8f0;
  --color-ring:                   #3b82f6;
  --color-success:                #22c55e;
  --color-warning:                #f59e0b;
  --color-info:                   #3b82f6;
  --color-danger:                 #ef4444;  /* alias for destructive */
  --color-surface:                #ffffff;

  /* ── Sidebar (dark sidebar in light mode — Anderson identity) ── */
  --color-sidebar-bg:     #0f172a;
  --color-sidebar-text:   #94a3b8;
  --color-sidebar-active: #3b82f6;
  --color-sidebar-hover:  #1e293b;

  /* ── Radius Scale ── */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  /* ── Animations (unchanged) ── */
  --animate-slide-in-right: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  --animate-fade-in:        fade-in 0.2s ease-out;
  --animate-fade-in-up:     fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  --animate-scale-in:       scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  --animate-shimmer:        shimmer 2s infinite;
}
```

**Step 2: Dark mode — blue-gray default**
```css
.dark {
  --color-background:             #0f172a;
  --color-foreground:             #e2e8f0;
  --color-card:                   #1e293b;
  --color-card-foreground:        #e2e8f0;
  --color-primary:                #3b82f6;
  --color-primary-foreground:     #f8fafc;
  --color-secondary:              #1e293b;
  --color-secondary-foreground:   #cbd5e1;
  --color-muted:                  #1e293b;
  --color-muted-foreground:       #94a3b8;
  --color-accent:                 #1e293b;
  --color-accent-foreground:      #e2e8f0;
  --color-destructive:            #ef4444;
  --color-destructive-foreground: #f8fafc;
  --color-border:                 #334155;
  --color-input:                  #334155;
  --color-ring:                   #3b82f6;
  --color-success:                #22c55e;
  --color-warning:                #f59e0b;
  --color-info:                   #3b82f6;
  --color-danger:                 #ef4444;
  --color-surface:                #1e293b;

  --color-sidebar-bg:     #020617;
  --color-sidebar-text:   #94a3b8;
  --color-sidebar-active: #3b82f6;
  --color-sidebar-hover:  #0f172a;
}
```

**Step 3: True Black (optional OLED theme)**
```css
.true-black {
  --color-background:  #000000;
  --color-foreground:  #f5f5f7;
  --color-card:        #0a0a0a;
  --color-card-foreground: #f5f5f7;
  --color-muted:       #171717;
  --color-muted-foreground: #a1a1aa;
  --color-border:      #27272a;
  --color-input:       #27272a;
  --color-secondary:   #0a0a0a;
  --color-secondary-foreground: #d4d4d8;
  --color-accent:      #0a0a0a;
  --color-accent-foreground: #f5f5f7;
  --color-surface:     #0a0a0a;

  --color-sidebar-bg:    #000000;
  --color-sidebar-text:  #a1a1aa;
  --color-sidebar-hover: #171717;
}
```

Applied by toggling `.true-black` on `<html>` alongside `.dark`. The `useTheme` hook should support three modes: `light`, `dark` (blue-gray default), `true-black`.

### What does NOT change

| Thing | Why it stays |
|-------|-------------|
| CSS property names (`--color-background`, `--color-primary`, etc.) | Tailwind v4 generates utilities from these names — `bg-background`, `text-primary`, etc. |
| Tailwind utility classnames in components | They reference the token names, not the values |
| `@theme` block structure | Tailwind v4 requirement |
| Animation keyframe names | Referenced by `--animate-*` tokens |
| `.focus-ring` utility class | Used across components |

---

## 3. Dark Mode Strategy

### Default: Dark Blue-Gray (`.dark`)
- Background: `#0f172a` (Slate-900) — not true black
- Cards: `#1e293b` (Slate-800) — enough contrast without harshness
- Borders: `#334155` (Slate-700) — visible separation
- Primary: `#3b82f6` — same as light mode for consistency
- This matches the Anderson Cleaning App exactly

### Optional: True Black (`.dark.true-black`)
- Background: `#000000` — for OLED screens
- Cards: `#0a0a0a` — near-black
- Kept as opt-in toggle in settings page
- Applied by adding `.true-black` class alongside `.dark` on `<html>`
- **Off by default**

### Theme toggle UX
```
Light  ←→  Dark (blue-gray)  ←→  True Black
       (default dark)           (OLED opt-in)
```

The `useTheme` hook cycles: `light` → `dark` → `true-black` → `light`, or uses a 3-way selector in settings.

---

## 4. New Tokens to Add

These tokens don't exist in GleamOps yet but are needed for the page cleanup phase:

| Token | Light Value | Dark Value | Purpose |
|-------|------------|------------|---------|
| `--color-danger` | `#ef4444` | `#ef4444` | Alias for destructive; used in old app |
| `--color-success-foreground` | `#f8fafc` | `#f8fafc` | Text on success backgrounds |
| `--color-warning-foreground` | `#f8fafc` | `#f8fafc` | Text on warning backgrounds |
| `--color-danger-foreground` | `#f8fafc` | `#f8fafc` | Text on danger backgrounds |
| `--radius-sm` | `0.375rem` | — | Tailwind `rounded-sm` equivalent |
| `--radius-md` | `0.5rem` | — | Tailwind `rounded-md` equivalent |
| `--radius-lg` | `0.75rem` | — | Default for cards/buttons/inputs |
| `--radius-xl` | `1rem` | — | Overlays only (SlideOver, modals) |

---

## 5. Risky Changes to Avoid

### DO NOT change classnames
Tailwind v4 auto-generates utilities from `--color-*` names. The existing codebase uses:
- `bg-background`, `bg-card`, `bg-muted`, `bg-primary`, `bg-secondary`, `bg-accent`, `bg-destructive`
- `text-foreground`, `text-muted-foreground`, `text-primary`, `text-primary-foreground`
- `border-border`, `ring-ring`

These all still work because we're changing **values**, not **names**. Renaming `--color-background` to `--background` or `--color-primary` to `--primary` would break every utility class in the app.

### DO NOT change layout measurements
- Sidebar width: `w-64` (256px) — hardcoded in sidebar.tsx, layout depends on it
- Header height: `h-16` (64px) — sticky header, content starts below it
- Main content padding: `md:ml-64` in app-shell.tsx — offset for sidebar
- Table cell padding, card padding, form field sizing — all existing values are fine

### DO NOT touch these files
- `supabase/migrations/*` — backend lock
- `packages/shared/src/types/*` — type definitions don't change for a reskin
- `packages/shared/src/constants/*` — status color maps use string keys, not CSS tokens
- `src/middleware.ts` — auth middleware
- `next.config.ts` — routing config
- Any `*.sql` files

### DO NOT introduce HSL token format
The current system uses hex values (`#3b82f6`). The Anderson app also uses hex. Do not convert to `hsl(...)` or `oklch(...)` — this would require touching every token consumer and provides no visual benefit for this migration.

### DO NOT change the `@theme` directive to `@layer`
Tailwind CSS v4 requires `@theme` for design token registration. Using `@layer` would break utility class generation.

### Badge component — keep raw Tailwind colors
The `Badge` component (`packages/ui/src/components/badge.tsx`) intentionally uses raw Tailwind color classes (`bg-green-50`, `text-red-700`, etc.) for its 7-color status system. This is correct — status badges need explicit color mapping, not semantic tokens. The same pattern exists in the Anderson app. **Do not convert badge colors to semantic tokens.**

### Selection colors — update but keep hardcoded
The `::selection` CSS rule uses hardcoded hex values for the highlight color. Update the values to match the new brand scale but keep them hardcoded (CSS custom properties don't work reliably in `::selection` across all browsers).

### Transition values — normalize, don't break
When changing `transition-colors` to `transition-all`, do it component-by-component inside `packages/ui/`. Do not use a global CSS override — some components intentionally avoid transitioning specific properties (e.g., `transition-transform` only).

---

## 6. Migration Order

1. **Update `@theme` values** in `globals.css` (brand scale + all semantic tokens)
2. **Update `.dark` values** in `globals.css` (blue-gray, not true black)
3. **Add `.true-black` class** in `globals.css` (optional OLED theme)
4. **Add new tokens** (`--color-danger`, `--radius-*`, `*-foreground` variants)
5. **Update `::selection` colors** to match new brand scale
6. **Verify build** — `pnpm build` must pass before proceeding
7. **Reskin packages/ui components** (radius, shadows, transitions)
8. **Clean up page-level hard-coded colors** (31 files identified in audit)
9. **Update `useTheme` hook** to support 3 modes
10. **Final build + visual verification**
