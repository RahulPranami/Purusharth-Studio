---
name: Event Pulse Admin
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#434655'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#0051b1'
  on-tertiary: '#ffffff'
  tertiary-container: '#0f69dc'
  on-tertiary-container: '#edf0ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.006em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.006em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
  label-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an ultra-refined, high-density Superadmin command center for an AI-powered event photography infrastructure. It fuses the analytical rigor of Stripe with the kinetic precision of Linear and the restrained, typographic clarity of Vercel.

The visual style is **Corporate / Modern High-Utility**:
- **Aesthetic Tenets**: Monochromatic base canvases, razor-sharp 1px neutral structural borders, deliberate micro-contrasts, and electric blue micro-accents reserved exclusively for primary actions, focus rings, and active states.
- **Target Audience**: Event tech superadmins, enterprise platform operators, event organizers, and AI pipeline engineers overseeing high-volume face recognition indexing, live ingest, and CDN delivery.
- **Emotional Response**: Absolute technical confidence, calm predictability under operational load, tactile snappiness, and zero cognitive clutter.

## Colors

The palette operates on a strict functional stratification designed for high information density and long work shifts without eye strain.

### Surface System
- **Canvas Base**: `#FFFFFF` — The ultimate background layer for maximum contrast and clean canvas rendering.
- **Subtle Surface 1**: `#F9FAFB` — Used for secondary container wells, table headers, sidebar navigation wells, and inactive panel backgrounds.
- **Subtle Surface 2**: `#F3F4F6` — Used for elevated hover states, selected chip backgrounds, and segmented control tracks.
- **Border Default**: `#E5E7EB` — Neutral-200 boundary for crisp 1px structural framing.
- **Border Strong**: `#D1D5DB` — Neutral-300 boundary for inputs and active hover borders.

### Functional Typography Colors
- **Text Primary**: `#111827` — Deep charcoal, delivering strong contrast for mission-critical metrics and table data.
- **Text Secondary**: `#6B7280` — Mid-tone slate gray for metadata, sub-labels, table column titles, and placeholder text.
- **Text Muted**: `#9CA3AF` — De-emphasized indicators, timestamps, and hotkey hints.

### Semantic Status Tokens
- **Success (Indexed / Live)**: Foreground `#059669`, Background `#ECFDF5`, Border `#A7F3D0`
- **Warning / Processing (AI Ingest / Matching)**: Foreground `#D97706`, Background `#FFFBEB`, Border `#FDE68A`
- **Error (Failed Pipeline / Alert)**: Foreground `#DC2626`, Background `#FEF2F2`, Border `#FECACA`
- **Draft / Inactive (Archived / Pending)**: Foreground `#4B5563`, Background `#F3F4F6`, Border `#E5E7EB`

## Typography

The typographic hierarchy prioritizes tracking, geometric clarity, and high-density legibility across massive data grids and telemetry charts.

- **Typeface Selection**: Inter is deployed universally across headlines, body copy, and UI controls for its balanced x-height and neutral geometry. For raw hashes, image dimensions, UUIDs, and processing timestamps, `JetBrains Mono` handles secondary monospace workloads.
- **Optical Tracking**: Tight negative letter spacing is applied systematically to headlines (`-0.025em` to `-0.015em`) and UI body sizes (`-0.01em` to `-0.006em`) to reproduce the crisp, compact feel of developer tools. Micro-labels (`label-xs`) apply positive tracking (`+0.04em`) with uppercase transforms for column sorting tokens and category slugs.
- **Numbers & Metrics**: Metric counters, throughput indicators, and aggregate statistics utilize tabular lining figures (`font-feature-settings: 'tnum' 1, 'cv05' 1`) to eliminate character jitter during real-time dashboard socket updates.

## Layout & Spacing

The layout is grounded in a strict 8-point base grid system, supplemented by 4px sub-increments (`space-xs`) for dense dashboard components such as badges, compact table cells, and form field stacks.

### Master Shell Architecture
- **Desktop (≥ 1280px)**: Persistent collapsible 256px utility sidebar on the left, top-fixed 56px global utility and context bar, and an edge-to-edge canvas with `margin: 2rem` (32px) max fluid layout constrained to a maximum display cap of 1600px for central telemetry.
- **Data Grids & Metric Cards**: 12-column responsive fluid grid with 24px gutters (`gutter: 1.5rem`). Standard metric cards default to a 4-column span (3 per row) or 3-column span (4 per row). High-density AI pipeline inspectors span a 12-column horizontal pane.
- **Tablet & Mobile (≤ 768px)**: The navigation collapses into a slide-over sheet drawer. The grid reduces to single or two-column reflows with `margin-mobile: 1rem` and `gutter-mobile: 1rem`. Data tables enable fixed left-column horizontal touch scrolling.

## Elevation & Depth

Visual hierarchy uses a flat, layered architecture that relies on structural borders and low-opacity ambient shadows rather than heavy drop shadows.

### Elevation Levels
- **Level 0 (Canvas Surface)**: `#FFFFFF` without shadows, delineated purely by 1px solid `#E5E7EB` borders.
- **Level 1 (Cards, Metric Containers, Dropzones)**: `#FFFFFF` with a 1px border (`#E5E7EB`) and a soft ambient blur:
  `box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04)`.
- **Level 2 (Hover States, Flyouts, Popovers, Segmented Controls)**:
  `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)`.
- **Level 3 (Command Palette, Modal Dialogs, Global Drawers)**:
  `box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)`.

### Border Integrity
Elements do not float unbound. Every floating panel, dropdown, and popover uses an explicit 1px outline (`#E5E7EB`) coupled with its ambient shadow to retain crisp definition against light backgrounds.

## Shapes

The design system standardizes on a refined, balanced corner radius (Level 2: `0.5rem` / 8px baseline with `0.75rem` / 12px for primary cards).

- **Cards & Data Containers**: `rounded-xl` (`12px`) provides a modern, friendly silhouette without appearing overly casual.
- **Buttons, Inputs & Dropdowns**: `rounded-lg` (`8px`) maintains a dependable, precise touch/click target geometry.
- **Badges, Chips & Avatars**: `rounded-full` (`9999px`) creates maximum visual differentiation from content containers and data cells.
- **Nested Geometry Rule**: Outer containers using 12px radii must contain internal interactive elements (such as inner preview frames or secondary nested cards) with a 6px to 8px radius to preserve concentric padding harmony.

## Components

### Buttons
- **Primary**: Background `#2563EB`, text `#FFFFFF`, font `label-md`. Hover `#1D4ED8`, active `#1E40AF`. Focus ring: 2px offset with 2px `#2563EB`.
- **Secondary / Outline**: Background `#FFFFFF`, border 1px solid `#E5E7EB`, text `#111827`. Hover background `#F9FAFB`, hover border `#D1D5DB`.
- **Ghost**: Background transparent, text `#6B7280`. Hover background `#F3F4F6`, text `#111827`.
- **Danger**: Background `#DC2626`, text `#FFFFFF`. Hover `#B91C1C`.

### Status Badges & Chips
- **Geometry**: Compact height (22px), `rounded-full`, padding `2px 8px`, font `label-xs`.
- **Structure**: Soft tint background, 1px border matching the tint variant, and an optional 6px circular status dot on the left.
- **Variants**:
  - *Success* (Indexed): BG `#ECFDF5`, Border `#A7F3D0`, Dot/Text `#059669`.
  - *Processing* (AI Matching): BG `#FFFBEB`, Border `#FDE68A`, Dot/Text `#D97706`. Animate dot pulse for active workloads.
  - *Error* (Sync Failed): BG `#FEF2F2`, Border `#FECACA`, Dot/Text `#DC2626`.
  - *Draft* (Unpublished): BG `#F3F4F6`, Border `#E5E7EB`, Dot/Text `#6B7280`.

### Data Tables (Precision Event Records)
- **Header**: Height 36px, background `#F9FAFB`, border-bottom 1px solid `#E5E7EB`, typography `label-xs` uppercase, text `#6B7280`.
- **Row**: Height 48px, background `#FFFFFF`, border-bottom 1px solid `#F3F4F6`, typography `body-md` text `#111827`. Hover background `#F9FAFB` transition `150ms ease`.
- **Cells**: Support inline badges, thumbnail micro-avatars (32x32px with 6px radius), and monospace IDs.

### Input Fields & Search Bars
- **Frame**: Height 36px, border 1px solid `#E5E7EB`, background `#FFFFFF`, radius 8px, padding `0 12px`, typography `body-md`.
- **States**: Hover border `#D1D5DB`. Focus border `#2563EB`, box-shadow `0 0 0 3px rgba(37, 99, 235, 0.12)`.
- **Search Variant**: Prefixed by 16px slate magnifying glass icon, keyboard shortcut badge (`⌘K`) anchored on the right.

### Metric Cards
- **Structure**: Surface `#FFFFFF`, border 1px solid `#E5E7EB`, radius 12px, padding 20px.
- **Elements**: Top row features title (`label-sm`, `#6B7280`) and optional sparkline/icon. Main value uses `headline-xl` tabular figures (`#111827`). Bottom row features micro trend pill (e.g., `+12.4% vs last event` in success green).

### Upload & Dropzone (Bulk Photo Ingest)
- **Frame**: Border 2px dashed `#D1D5DB`, background `#F9FAFB`, radius 12px, padding 40px, text alignment center.
- **Drag-over Active**: Border 2px dashed `#2563EB`, background `#EFF6FF`.
- **Elements**: 36px cloud-upload icon in `#2563EB`, primary headline `body-lg` font-medium, secondary subtext `body-sm` (`#6B7280`) listing accepted formats (RAW, JPEG, WebP up to 50MB).

### Tab & Segmented Navigation
- **Segmented Control**: Track background `#F3F4F6`, padding 3px, radius 8px. Active pill `#FFFFFF`, border 1px solid `rgba(0,0,0,0.04)`, shadow `0 1px 2px rgba(0,0,0,0.06)`, text `#111827`.
- **Underline Tabs**: 1px horizontal bottom border `#E5E7EB`. Active item marked by 2px solid `#2563EB` bottom bar flush with container line and font weight `500`.