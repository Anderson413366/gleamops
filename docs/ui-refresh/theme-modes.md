# Theme Modes

GleamOps supports three visual modes:

| Mode | Background | Card | When |
|------|-----------|------|------|
| **Light** | `#ffffff` | `#ffffff` | Default daytime |
| **Dark** (blue-gray) | `#0f172a` | `#1e293b` | Default dark mode |
| **True Black** | `#000000` | `#0a0a0a` | OLED-optimized dark |

## How it works

- **CSS layer**: `.dark` class on `<html>` activates the blue-gray dark palette. Adding `data-theme="true-black"` alongside `.dark` overrides surface tokens to pure black values. See `globals.css` for the full token set.
- **Hook**: `useTheme()` from `@/hooks/use-theme` exposes `resolvedTheme`, `trueBlack`, `setTheme()`, `setTrueBlack()`, and `toggleTheme()`.
- **Persistence**: Theme choice stored in `localStorage` under `gleamops-theme`; true-black preference under `gleamops-true-black`.
- **No backend**: Entirely client-side. No database writes.

## UI surfaces

- **Header**: Theme picker dropdown (Light / Dark / True Black) replaces the old Sun/Moon toggle.
- **Settings > Appearance**: Theme selector buttons + True Black toggle switch with OLED description.

## Adding new tokens for True Black

If you add a new CSS custom property that needs a true-black override, add it inside the `.dark[data-theme="true-black"]` block in `globals.css`. The `@theme` aliases in Tailwind v4 automatically follow.
