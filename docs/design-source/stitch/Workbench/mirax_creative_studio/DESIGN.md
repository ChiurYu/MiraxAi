---
name: Mirax Creative Studio
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c3c7cd'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8d9197'
  outline-variant: '#42474d'
  surface-tint: '#abcae8'
  primary: '#abcae8'
  on-primary: '#12334b'
  primary-container: '#3e5c76'
  on-primary-container: '#b5d4f2'
  inverse-primary: '#43617c'
  secondary: '#bcc7de'
  on-secondary: '#263143'
  secondary-container: '#3e495d'
  on-secondary-container: '#aeb9d0'
  tertiary: '#eabf8a'
  on-tertiary: '#452b03'
  tertiary-container: '#735328'
  on-tertiary-container: '#f5c993'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#abcae8'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#2b4963'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffddb6'
  tertiary-fixed-dim: '#eabf8a'
  on-tertiary-fixed: '#2a1800'
  on-tertiary-fixed-variant: '#5e4118'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-label:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  sidebar-width: 64px
  control-panel-width: 320px
---

## Brand & Style
The design system is built for a professional AI creative studio, emphasizing precision, restraint, and utility. It rejects the typical "AI glow" in favor of a grounded, editorial aesthetic reminiscent of high-end film editing suites. 

The visual direction follows a **Modern Corporate** style with **Minimalist** sensibilities. The emotional response is one of calm focus and technical reliability. Surfaces are defined by subtle tonal shifts rather than shadows, creating a workspace that recedes to let the user's creative content remain the primary focus.

## Colors
The palette is rooted in a sophisticated Zinc/Slate grayscale to minimize eye fatigue during long creative sessions. 

- **Foundation:** The UI uses a deep `#0F172A` for the base background. Surface elevations are built using increasing steps of the Slate scale.
- **Accent:** A single, low-saturation Cobalt (`#3E5C76`) is used sparingly for active states, primary actions, and progress indicators.
- **Status:** Status indicators utilize muted, "earthy" tones (Sage, Ochre, Terracotta) to provide clear feedback without breaking the professional, editorial atmosphere.
- **Text:** High-contrast White (#F8FAFC) for headlines, and Muted Slate (#94A3B8) for secondary metadata.

## Typography
This design system utilizes **Inter** for all Latin characters and UI elements, paired with **PingFang SC** for Chinese text. The hierarchy is established through weight transitions and uppercase labeling rather than color.

- **Editorial Headlines:** Use semi-bold weights with slight negative letter-spacing for a compact, professional look.
- **Functional Labels:** Technical data and property headers use `label-caps` to distinguish them from user-generated content.
- **Monospaced Data:** While using Inter, numerical values in the workspace (timecodes, coordinates) should utilize tabular lining figures to ensure vertical alignment in lists and property panels.

## Layout & Spacing
The layout employs a **fixed-panel grid** typical of professional creative software. 

- **Sidebar:** A compact 64px vertical rail for top-level navigation.
- **Workflow Header:** A 48px persistent bar containing breadcrumbs, workflow stages (Generation, Refinement, Export), and global actions.
- **Split-Workspace:** A three-pane architecture. Left: Controls/Assets (320px), Center: Global Preview (Fluid), Right: Contextual Properties (Variable).
- **Rhythm:** An 8px base unit governs all margins and padding. Internal component spacing (icon to text) defaults to 4px or 8px.

## Elevation & Depth
Depth is achieved through **Tonal Layering** rather than shadows. 

1. **Floor (Level 0):** `#0F172A` - Used for the main application background.
2. **Surface (Level 1):** `#1E293B` - Used for primary panels (Sidebar, Control Panel).
3. **Inset (Level 2):** `#020617` - Used for the Canvas/Preview area to create a "light box" effect where content pops.
4. **Active/Hover (Level 3):** `#334155` - Used for hovered list items or active tool states.

Borders are 1px solid `#334155` to define panel boundaries without adding visual weight.

## Shapes
The shape language is precise and geometric. A `Soft` (4px to 6px) radius is applied to buttons, input fields, and panel containers to provide a modern touch while maintaining a serious, technical character. Larger containers like cards or the preview viewport use 8px to subtly frame the content.

## Components
- **Buttons:** Primary buttons use the Cobalt accent with white text. Secondary buttons are ghost-style with a subtle Slate border. Tertiary buttons are icon-only with a 4px radius.
- **Input Fields:** Darker than the panel surface with a 1px border. Focus state is indicated by a Cobalt border and no outer glow.
- **Progress-Headers:** A horizontal step-indicator using thin lines and `label-caps` typography. Active steps are Cobalt; completed steps use the Sage Green status color.
- **Lists:** High-density rows (32px height) with subtle divider lines. Hover states use a slight tonal lift.
- **Property Sliders:** Minimalist horizontal tracks. The handle is a simple 12px circle in the accent color, accompanied by a monospaced numerical value input.
- **Icons:** Use a 1.5pt stroke weight. Icons should be functional and literal, avoiding decorative flourishes.