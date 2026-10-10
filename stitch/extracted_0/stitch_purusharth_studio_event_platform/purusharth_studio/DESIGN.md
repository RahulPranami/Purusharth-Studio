---
name: Purusharth Studio
colors:
  surface: '#fbf9f4'
  surface-dim: '#dbdad5'
  surface-bright: '#fbf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ee'
  surface-container: '#f0eee9'
  surface-container-high: '#eae8e3'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c19'
  on-surface-variant: '#444748'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ec'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#755a2a'
  on-secondary: '#ffffff'
  secondary-container: '#fcd89c'
  on-secondary-container: '#775d2d'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1c1b1a'
  on-tertiary-container: '#868382'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#ffdea9'
  secondary-fixed-dim: '#e5c188'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5b4315'
  tertiary-fixed: '#e6e2df'
  tertiary-fixed-dim: '#cac6c4'
  on-tertiary-fixed: '#1c1b1a'
  on-tertiary-fixed-variant: '#484645'
  background: '#fbf9f4'
  on-background: '#1b1c19'
  surface-variant: '#e4e2dd'
typography:
  display-xl:
    fontFamily: Bodoni Moda
    fontSize: 56px
    fontWeight: '400'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-xl-mobile:
    fontFamily: Bodoni Moda
    fontSize: 38px
    fontWeight: '400'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Bodoni Moda
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Bodoni Moda
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 34px
  headline-md:
    fontFamily: Bodoni Moda
    fontSize: 26px
    fontWeight: '500'
    lineHeight: 34px
  headline-sm:
    fontFamily: Bodoni Moda
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.04em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.06em
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.12em
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
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system positions the platform within a luxury editorial photography and high-production cinematography landscape. It balances gallery-level restraint with the functional precision expected of high-end event producers, creative directors, and luxury private clients.

The visual direction merges **Warm Editorial Minimalism** with understated tactile craft. It eschews generic digital SaaS tropes in favor of an art book aesthetic: deliberate pacing, expansive visual breathing room, whisper-weight hairline structure, and cinematic framing. Every surface, interaction, and visual threshold must evoke the tactile tactility of heavy archival paper, gilt details, and velvet shadows.

## Colors
The palette evokes an archival gallery space, defined by high tonal contrast softened by natural, warm undertones.

- **Primary Canvas (`#F8F6F1`)**: A warm ivory ground that prevents cold glare, offering the tactile presence of museum-grade cotton rag paper.
- **Surface Elevation (`#FFFFFF`)**: Crisp, immaculate white cards that lift imagery and content blocks gracefully off the ivory field.
- **Primary Ink (`#171717`)**: Deep obsidian charcoal for display typography, primary actions, and primary narrative anchors. Avoid pure `#000000` to preserve tonal nuance.
- **Accent Gilt (`#C5A46D`)**: Refined champagne gold applied sparingly to key focal points, active states, verified insignia, and bespoke highlights.
- **Secondary Ink (`#6B7280`)**: Slate gray for metadata, timestamps, secondary navigation, and supporting captions.
- **Structural Hairline (`#E7E5DF`)**: Subdued bone-gray border tone engineered for 1px hairline separation without visual clutter.
- **Editorial Semantic Statuses**:
  - *Confirmed / Delivered*: Muted Emerald (`#1B4D3E` text on `#EBF3EF` surface)
  - *In Curation / Processing*: Burnished Amber (`#8C6314` text on `#FAF4E8` surface)
  - *Attention Required*: Crimson Velvet (`#842029` text on `#FCECEF` surface)

## Typography
Typography creates tension between classic editorial prestige and modern interface legibility.

**Bodoni Moda** commands all primary headings, editorial quotes, and high-impact metadata (such as gallery title sets and milestone dates). Its sharp bracketed serifs and high-contrast strokes establish high-fashion authority.

**Plus Jakarta Sans** anchors all utilitarian demands: navigation, client portals, metadata grids, technical capture specs (aperture, focal length, LUT variants), and transaction details. It brings warm geometry, humanistic terminals, and effortless readability at miniature scales.

Headlines larger than 32px automatically compress via mobile token scales to preserve rhythmic vertical cadence on compact screens without breaking line compositions.

## Layout & Spacing
The layout model employs a responsive 12-column grid on desktop screens (max-width `1440px`), transitioning to an 8-column layout on tablets, and a 4-column structured fluid system on mobile devices.

Layout decisions emphasize vertical rhythm and negative space:
- **Mobile First Focus**: Screen margins expand to `1.25rem` (`20px`) with edge-to-edge media previews bordered by hairline separators. Thumb-accessible floating control regions sit within lower safe areas.
- **Desktop Grandeur**: Page gutters expand to `1.5rem` (`24px`) with dynamic section margins up to `5rem` (`80px`), mimicking high-end monograph catalog spreads.
- **Editorial Proportions**: Media cards strictly favor 4:5 portrait and 16:9 cinematic landscape aspect ratios, preventing arbitrary image cropping.

## Elevation & Depth
Depth is created through deliberate surface stacking and crisp hairline borders rather than heavy drop shadows.

- **Level 0 (Base)**: Warm ivory canvas (`#F8F6F1`). Completely non-elevated.
- **Level 1 (Card & Section Containers)**: `#FFFFFF` resting on `#F8F6F1`, defined strictly by a 1px continuous hairline border of `#E7E5DF`. Ambient shadow is subtle: `0 1px 3px rgba(23, 23, 23, 0.02)`.
- **Level 2 (Hover & Floating Elements)**: Elevated event cards, selection trays, and client approval drawers receive an ambient diffused blur: `0 12px 32px -4px rgba(23, 23, 23, 0.06), 0 4px 12px -2px rgba(23, 23, 23, 0.03)`, bordered with `#E7E5DF`.
- **Level 3 (Modals & Full-Screen Lightboxes)**: `#FFFFFF` surfaces centered over an archival charcoal veil (`rgba(23, 23, 23, 0.72)`) backed with a `12px` backdrop blur.

## Shapes
Shapes balance structural rigor with soft modern tactility.

Standard UI components, media cards, and content blocks implement `rounded-2xl` (`16px`) for primary outer envelopes and `rounded-xl` (`12px`) for nested inner elements such as input bars, secondary thumbnails, and status pills. Micro-elements (such as tags, selection dots, and counter badges) make use of complete pill radiuses (`9999px`).

Sharp 90-degree corners are reserved strictly for technical viewfinder overlays, framing grid guides, and metadata dividers.

## Components

### Buttons
- **Primary**: Solid Charcoal (`#171717`) background, warm ivory text (`#F8F6F1`), `rounded-xl`, uppercase label with `0.06em` tracking. Hover state features a transition to `#2A2A2A` with a micro-scale transition (`1.01x`).
- **Accent (Editorial Exclusive)**: Champagne Gold (`#C5A46D`) fill, charcoal text (`#171717`), reserved for booking sign-offs, production package locks, and high-tier downloads.
- **Secondary (Outline)**: Transparent background, 1px `#E7E5DF` hairline border, deep charcoal text (`#171717`). Hover state shifts background to pure `#FFFFFF`.
- **Ghost**: No border, slate gray (`#6B7280`) text shifting to charcoal on interaction.

### Cards
- Constructed with `#FFFFFF` background, `rounded-2xl`, and a persistent 1px hairline border in `#E7E5DF`.
- Featured event photo and video showcase cards include edge-to-edge media heads with a `rounded-xl` internal inset, followed by an editorial metadata block: Event Moniker in `headline-sm`, client and production role tags, and status indicator badges.

### Badges & Chips
- Status indicators maintain high typographic refinement: `label-caps` in uppercase format with `0.12em` letter spacing.
- **Success (Proofed/Delivered)**: `#EBF3EF` surface with `#1B4D3E` typography and a tiny `#1B4D3E` dot glyph.
- **In Progress (Color Grading/Raw Ingestion)**: `#FAF4E8` surface with `#8C6314` typography.
- **Urgent / Re-Take**: `#FCECEF` surface with `#842029` typography.

### Input Fields & Selectors
- Background: `#FFFFFF`.
- Border: 1px `#E7E5DF`, transition to 1px `#C5A46D` on focus without aggressive outer focus rings.
- Labeling: Floating or top-stacked using `label-md` in slate gray (`#6B7280`).
- Value typography uses `body-md` in deep charcoal (`#171717`).

### Checkboxes & Radio Selection
- Unchecked state: 1px `#E7E5DF` border with `#FFFFFF` core.
- Checked state: Charcoal (`#171717`) or Champagne Gold (`#C5A46D`) fill carrying a crisp ivory checkmark or central node.

### Native Mobile Dock & Role Navigation
- A floating bottom command bar elevated with Level 2 elevation, `rounded-2xl` perimeter, `#FFFFFF` translucent glass background (`rgba(255, 255, 255, 0.92)` + `16px` backdrop filter).
- Clear contextual mode-switching between **Client Experience Mode** (lookbook viewing, favorites curation, digital download access) and **Studio Crew Mode** (call sheets, run of show, shoot logs, ingest status).