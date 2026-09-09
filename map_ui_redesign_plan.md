# StreetPulse Map UI/UX Redesign Implementation Plan

This plan details the comprehensive redesign of the Map UI/UX, correcting previous hallucinatory claims and ensuring strict adherence to `DESIGN_SYSTEM.md`'s "Anti-Slop Directive" and color palette constraints.

## 1. Color Palette Refinement (Replacing Rust `#b5502f`)

**Observation**: The prior investigation incorrectly claimed that `#b5502f` was defined as `--rust` and used extensively as a clinical warning. In reality, it was defined as `--cat-naloxone` in `css/tokens.css` (Line 23) and used in a gradient in `css/scanner.css` (Line 13). Furthermore, the design system specifically dictates: **"❌ Rust / Terracotta (`#b5502f`): STRICTLY RETIRED. All occurrences are being replaced with StreetPulse Electric Blue (`#2563eb`), Oceanic Teal (`#0f6e6a`), or intentional clinical status colors."** The prior suggestion to use Terracotta (`#D67A62`) was a direct violation of this rule.

**Action**:
- Edit `css/tokens.css`: Replace `--cat-naloxone: #b5502f;` with `--cat-naloxone: #2563eb;` (StreetPulse Electric Blue).
- Edit `css/scanner.css`: Replace the background gradient on line 13: `linear-gradient(135deg, #b5502f 0%, #8c2e11 100%)` with a gradient using the Electric Blue or Oceanic Teal colors.

## 2. Top Filter Rail Redesign

**Observation**: The prior investigation correctly located the filter rail in `index.html` (`.filter-rail`) and `css/map.css`. However, it suggested a "glassmorphic... backdrop-filter" redesign, failing to notice that the current implementation *already uses* `backdrop-filter: blur(12px)`. More importantly, `DESIGN_SYSTEM.md` explicitly forbids "generic SaaS tropes" and "oversized blurred box shadows", pushing for "Physical-like tactile surfaces".

**Action**:
- Edit `css/map.css` (`.filter-rail` and `.chip` classes, lines 31-56):
  - Remove `backdrop-filter: blur(12px)` and `background: rgba(255, 253, 249, 0.65)`.
  - Apply a solid, crisp background: `background: var(--surface);` (`#fffdf9`).
  - Strengthen the border to a crisp 1px line: `border: 1px solid var(--border-soft);`
  - Reduce the heavy drop shadow to a subtle inset elevation or a tight, low-opacity drop shadow: `box-shadow: 0 2px 4px rgba(15, 23, 42, 0.05);`

## 3. Minimalist Map Pins

**Observation**: The prior investigation hallucinated that pins were drawn via a "heavy teardrop SVG path (`<path d=\"M0 6 L-6.4 -3...\">`)". In reality, `js/map.js` (Lines 207-213) uses `L.divIcon` to generate circular `<div>` elements with a solid background and a box shadow (`box-shadow:0 3px 5px rgba(22,35,61,0.3)`).

**Action**:
- Edit `js/map.js` (`pinIcon` function):
  - Retain the elegant minimalist circular concept but align it with the design system.
  - Remove the heavy `rgba(22,35,61,0.3)` drop shadow.
  - Keep the crisp 2px white border (`#fffdf9`) and ensure the category color rings have high contrast.
  - Updated HTML string: `<div style="width:24px;height:24px;background:${col};border:2px solid #fffdf9;border-radius:50%;box-shadow:0 1px 2px rgba(15,23,42,0.15);"></div>`

## 4. POI Bottom Sheet Upgrade

**Observation**: The prior investigation misidentified the class as `.poi-sheet` (it is `.sheet`) and proposed adding "frosted glass", "blur(20px)", and a "softer, deeper shadow", all of which constitute the exact "AI SLOP" the `DESIGN_SYSTEM.md` warns against.

**Action**:
- Edit `css/map.css` (`.sheet` class, lines 158-181):
  - Ensure the background is solid crisp white (`var(--surface)`).
  - Modify the box-shadow to be crisp and minimal, avoiding the "oversized blurred" look: `box-shadow: 0 -4px 12px rgba(15, 23, 42, 0.08);`
  - Ensure the top border is a crisp 1px line: `border-top: 1px solid var(--border-soft);`
  - Maintain the typography hierarchy using `Literata` for the title (`.sheet-title`) and `Plus Jakarta Sans` for operational data.

## 5. Artifact Delivery
- A new, high-quality, anti-slop UI mockup has been generated reflecting these specific changes and copied to the Desktop as `map_ui_redesign_concept.jpg`.
