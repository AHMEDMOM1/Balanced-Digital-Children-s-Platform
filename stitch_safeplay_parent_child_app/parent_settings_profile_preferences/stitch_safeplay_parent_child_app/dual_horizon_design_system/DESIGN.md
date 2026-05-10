---
name: Dual-Horizon Design System
colors:
  surface: '#fdf7ff'
  surface-dim: '#ded8e0'
  surface-bright: '#fdf7ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f2fa'
  surface-container: '#f2ecf4'
  surface-container-high: '#ece6ee'
  surface-container-highest: '#e6e0e9'
  on-surface: '#1d1b20'
  on-surface-variant: '#494551'
  inverse-surface: '#322f35'
  inverse-on-surface: '#f5eff7'
  outline: '#7a7582'
  outline-variant: '#cbc4d2'
  surface-tint: '#6750a4'
  primary: '#4f378a'
  on-primary: '#ffffff'
  primary-container: '#6750a4'
  on-primary-container: '#e0d2ff'
  inverse-primary: '#cfbcff'
  secondary: '#63597c'
  on-secondary: '#ffffff'
  secondary-container: '#e1d4fd'
  on-secondary-container: '#645a7d'
  tertiary: '#765b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#c9a74d'
  on-tertiary-container: '#503d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#cfbcff'
  on-primary-fixed: '#22005d'
  on-primary-fixed-variant: '#4f378a'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#cdc0e9'
  on-secondary-fixed: '#1f1635'
  on-secondary-fixed-variant: '#4b4263'
  tertiary-fixed: '#ffdf93'
  tertiary-fixed-dim: '#e7c365'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#594400'
  background: '#fdf7ff'
  on-background: '#1d1b20'
  surface-variant: '#e6e0e9'
typography:
  child-hero:
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  child-title:
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  child-subtitle:
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  child-body:
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  parent-title:
    fontSize: 22px
    fontWeight: '700'
    lineHeight: '1.3'
  parent-subtitle:
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  parent-body:
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.5'
  parent-caption:
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  child-padding-h: 24px
  child-padding-v: 24px
  child-gap: 20px
  parent-padding-h: 20px
  parent-padding-v: 16px
  parent-gap: 12px
---

## Brand & Style

This design system employs a **Bimodal Personality** to serve two distinct user archetypes within a single ecosystem. It bridges the gap between high-energy discovery and calm, data-driven oversight.

**Child Mode: Tactile Playfulness**
The style for younger users is rooted in **Soft-Skeuomorphism**. Elements appear "squishy" and physically touchable. It prioritizes emotional safety and accessibility through high-contrast colors paired with organic, ultra-rounded geometries. The goal is to evoke joy, curiosity, and confidence in navigation.

**Parent Mode: Modern Professionalism**
The style for adults shifts toward **Corporate Minimalism**. It utilizes clean lines, generous white space, and a refined blue-based palette. The interface communicates reliability, security, and clarity, allowing parents to digest metrics and manage settings without visual fatigue.

## Colors

The system operates on two distinct color engines. 

**Child Mode** uses high-saturation "vibrant pastels." The Primary Purple serves as the main interactive anchor, while specific functional colors distinguish content types (e.g., Story vs. Game) to aid pre-literate or early-reading navigation.

**Parent Mode** transitions to a "Trust Spectrum" of blues and deep navies. It removes the high-chroma accents of the child mode to create a workspace feel. Borders and subtle grays are used instead of heavy shadows to define structure.

## Typography

Both modes utilize **Inter** to ensure maximum legibility and a systematic foundation.

- **Child Mode Hierarchy:** Uses significantly larger base sizes (18px body) to facilitate easier reading and larger tap targets. Weights are kept heavy (Bold/SemiBold) to ensure text remains legible against vibrant background colors.
- **Parent Mode Hierarchy:** Adopts a more information-dense approach. The scale is compressed to allow for dashboards, lists, and settings toggles to coexist on single viewports without excessive scrolling.
- **Accessibility:** All color-on-color combinations (especially in Child Mode) must be verified for AA contrast ratios.

## Layout & Spacing

This system utilizes a **Dynamic Fluid Grid** that adjusts based on the active mode.

**Child Mode Layout:**
- **Generosity:** Higher gutter and margin values to prevent accidental taps.
- **Safe Areas:** Significant vertical padding to keep content centered and focused.
- **Alignment:** Centralized or asymmetrical playful placements.

**Parent Mode Layout:**
- **Efficiency:** Standardized 8pt-grid alignment.
- **Density:** Tighter spacing (12px-16px gaps) to group related data points like screen time or usage reports.
- **Reflow:** On desktop, parent dashboards expand to a 12-column grid, while child views remain centered in a "large-tablet" max-width container to maintain focus.

## Elevation & Depth

**Child Mode: Tactile Depth**
Shadows are used to create a sense of "lift" for interactive objects. Use large blur radii (20px+) with low opacity (10-15%) tinted by the primary color. Buttons should feature a "pressed" state that removes the shadow and offsets the element downward, mimicking a physical button.

**Parent Mode: Tonal Layers**
Depth is achieved through surface-on-surface layering. Use the background color (`#F0F4F8`) for the canvas and the surface color (`#FFFFFF`) for cards. Elevation is indicated by thin 1px borders (`#E2E8F0`) rather than shadows, except for modal overlays which use a neutral, neutral-gray soft shadow.

## Shapes

The shape language is the primary differentiator between the two modes.

- **Child Mode:** Applies a `rounded-2xl` (20px) or `rounded-3xl` (32px) logic. Every corner is significantly rounded to communicate safety and friendliness. Circular buttons are preferred for single-icon actions.
- **Parent Mode:** Adopts a standard `rounded-lg` (8px-12px) logic. This creates a more "organized" and "structured" appearance suitable for professional software. 
- **Interactive States:** In Child Mode, shapes can slightly expand (1.05x scale) on hover or tap to provide immediate tactile feedback.

## Components

### Buttons
- **Child Mode:** High-contrast, large-format buttons. Primary buttons use the Soft Purple with a thick, darker-purple bottom border to create a "3D" look.
- **Parent Mode:** Standard flat buttons with the Aqua Blue primary color. Uses subtle hover state color shifts.

### Cards
- **Child Mode:** Cards are the hero of the UI. Use the specific category colors (Story, Game, etc.). Cards should have a minimum height of 160px and include large, friendly iconography.
- **Parent Mode:** White surface cards with #E2E8F0 borders. Minimalist headers with small "View All" or "Edit" text links in Aqua Blue.

### Input Fields
- **Child Mode:** Extra-thick borders (3px) and 18px text. Focus states use the Warm Yellow highlight.
- **Parent Mode:** Standard 1px border with a soft blue focus ring. Labels use the Caption size (13px) for a clean, professional look.

### Navigation
- **Child Mode:** Bottom bar with large, colorful icons and no text labels (or very short labels).
- **Parent Mode:** Sidebar (on desktop) or a slim bottom bar with 12px labels and monotone icons in Deep Navy.