# TaskFlow Cloud — Design System

> Design dialect: **Premium dark SaaS** — Linear/Vercel-adjacent.
> Dials: DESIGN_VARIANCE: 7 / MOTION_INTENSITY: 5 / VISUAL_DENSITY: 6

---

## Typography

| Role | Font | Weight | Size | Notes |
|------|------|--------|------|-------|
| UI sans | Plus Jakarta Sans | 400–800 | — | Loaded via Google Fonts |
| Monospaced | JetBrains Mono | 400–500 | — | Numbers, IDs, timestamps |

```css
font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
font-family: 'JetBrains Mono', monospace; /* tabular-nums elements */
```

---

## Color Palette

All neutrals use the **zinc** family (never mix gray/slate/zinc on same page).

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#09090B` zinc-950 | Page background |
| `--bg-surface` | `#111113` | Sidebar, panels |
| `--bg-elevated` | `#1C1C1F` | Cards, modals, dropdowns |
| `--border` | `#27272A` zinc-800 | Default borders |
| `--border-subtle` | `#1C1C1F` | Card borders (resting) |
| `--text-primary` | `#FAFAFA` zinc-50 | Headings, important text |
| `--text-secondary` | `#A1A1AA` zinc-400 | Body text |
| `--text-muted` | `#52525B` zinc-600 | Captions, helper text |
| `--accent` | `#6366F1` indigo-500 | Primary CTA, active states |
| `--accent-hover` | `#4F46E5` indigo-600 | Button hover |
| `--accent-subtle` | `rgba(99,102,241,0.10)` | Icon backgrounds, chips |
| `--success` | `#10B981` emerald-500 | Completed, active status |
| `--warning` | `#F59E0B` amber-500 | Medium alerts |
| `--danger` | `#EF4444` red-500 | Errors, overdue |
| `--info` | `#3B82F6` blue-500 | Info states |

---

## Priority System (Kanban)

Task cards use a **left border** to signal priority — Linear-inspired pattern.

| Priority | Border color | Label color |
|----------|-------------|-------------|
| critical | `#EF4444` | `#DC2626` |
| high | `#F97316` | `#C2410C` |
| medium | `#EAB308` | `#CA8A04` |
| low | `#27272A` | `#52525B` |

---

## Border Radius Scale

| Name | Value | Applied to |
|------|-------|-----------|
| xs | `4px` | Small chips, tiny badges |
| sm | `6px` | Badges, micro elements |
| md / `rounded-lg` | `8px` | Buttons, inputs |
| lg / `rounded-xl` | `12px` | Cards, panels |
| xl / `rounded-2xl` | `16px` | Modals, large overlays |
| pill | `9999px` | Status pills, avatar |

**Rule: one radius family per component — no mixed radii within a card.**

---

## Spacing Scale

Uses Tailwind's base-4 scale. Key breakpoints:

- Page padding: `p-6` (24px)
- Card inner padding: `p-5` (20px)
- Section gaps: `gap-4` (16px) for grids, `gap-3` for tight lists
- Sidebar width: `220px` expanded, `60px` collapsed

---

## Elevation / Shadows

No hard black shadows. All shadows are dark and subtle.

```css
--shadow-sm:  0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4);
--shadow-md:  0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3);
--shadow-lg:  0 12px 40px rgba(0,0,0,0.6), 0 4px 8px rgba(0,0,0,0.4);
```

---

## Motion

- **Default transitions:** `transition-all duration-150` (CSS)
- **Hover translate:** `-translate-y-px` on task cards (tactile lift)
- **Skeleton loaders:** `animate-pulse` with `rgba(255,255,255,0.04)` background
- **Spinners:** indigo border, transparent top (not generic gray)
- **No GSAP or framer-motion** (kept lean; add if motion budget increases)

All animations respect `prefers-reduced-motion: reduce`.

---

## Component Conventions

### Buttons
```
Primary:   bg #6366F1 → hover #4F46E5, text #FAFAFA
Danger:    text #F87171, bg rgba(239,68,68,0.10) on hover
Ghost:     text #71717A → hover #FAFAFA, bg rgba(255,255,255,0.04) on hover
Disabled:  opacity-50, cursor-not-allowed
```

### Inputs
```
Background:  #0D0D10
Border:      #27272A (resting) → #6366F1 (focus)
Text:        #FAFAFA
Placeholder: #52525B
Ring:        focus:ring-1 focus:ring-indigo-500/30
```

### Cards / Panels
```
Background:  #111113
Border:      #1C1C1F (resting) → #27272A (hover)
Hover lift:  border-color transition only (no box-shadow)
```

### Status badges
```
active:   bg rgba(16,185,129,0.12)  text #34D399  border rgba(16,185,129,0.2)
archived: bg rgba(113,113,122,0.12) text #71717A  border rgba(113,113,122,0.2)
```

---

## Auth Layout Pattern

**Split-screen** (desktop):
- Left `420px`: dark branding panel with logo, headline, feature list
- Right: form on `#09090B` with max-width 400px
- Mobile: stacked, logo shown above form

---

## Sidebar Pattern

- Width: `220px` expanded / `60px` collapsed
- Background: `#111113`
- Active nav: indigo-500/12 background + 2px left border at `#6366F1`
- Logo mark: custom SVG with indigo fill — not a generic letter in a box
- User section at bottom with avatar initials

---

## Kanban-specific Patterns

- **Drop zone active:** `rgba(99,102,241,0.06)` background + `1px dashed rgba(99,102,241,0.4)` border
- **Task card ghost (dragging):** `opacity: 0.35` + `outline: 1px solid #6366F1`
- **Column header:** color dot + name + task count badge

---

## Icons

**Library:** lucide-react (already installed — project dependency).
- Consistent `strokeWidth` of 1.75 (inactive) / 2.0 (active)
- Size: `w-4 h-4` for content icons, `w-3.5 h-3.5` for compact/toolbar

---

## Anti-patterns (DO NOT use)

- `gray-*` Tailwind utilities (use `zinc-*` instead)
- Bootstrap blue (`#3B82F6`) as primary accent
- `box-shadow` with pure black (`rgba(0,0,0,1)`)
- Emojis as UI elements
- `bg-blue-600` as the active nav state (use indigo + left border)
- Gradient rainbow text on headings
- `h-screen` (use `min-h-[100dvh]` instead)
- Hardcoded mixed `rounded-` values within a single component
