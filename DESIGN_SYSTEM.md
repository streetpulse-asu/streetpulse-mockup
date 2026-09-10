# StreetPulse Design System & Visual Guidelines

## 1. Design Philosophy: Human, Clinical, & Editorial
StreetPulse is a clinical triage and field outreach tool used by healthcare and outreach workers in demanding real-world outdoor environments. 

### Anti-Slop Directive
- **Zero generic SaaS tropes**: No random purple/indigo gradients, no oversized blurred box shadows (`box-shadow: 0 10px 30px rgba(0,0,0,0.2)`), no emojis as icons, no bubbly cartoonish pills.
- **High-contrast field legibility**: Crisp rendering optimized for bright outdoor daylight.
- **Physical-like tactile surfaces**: 1px crisp borders (`#c8d2de` / `#a9b7c9`) with subtle inset elevation rather than heavy blurred drop-shadows.

---

## 2. Color Palette & Hierarchy

### Core Brand & Surfaces
- **Deep Navy (Structure, Ink & Action)**: `#101a2c` ink / `#16233d` action — headings, phone frame, and every interactive surface. One action colour, not two brand hues competing.
- **Ink ramp**: `#101a2c` (17.4:1 on white) / `#3d4c63` (8.7:1) / `#5c6b82` (5.4:1). All three clear AA on both the ground and the surface.
- **Ground ramp (cool slate)**: `#e8ecf1` app / `#ffffff` surface / `#dde3ea` sunken. The app-to-surface step is 0.165 in relative luminance — elevation comes from this step, not from blur.
- **Amber (Attention)**: `#8f5a06` — scarce, and never a button. Marks active filter counts, selected pins, unsynced cache. Sits at ~40 deg, the true complement of the navy, and a clear 30 deg off the alert red so brand never reads as emergency. Tint: `#fdf6e6`.
- **Hairline Borders**: `#c8d2de` soft / `#a9b7c9` strong.

### Elevation Scale
Four steps, and nothing outside them. A card at rest is `--shadow-1` over a 1px border; only true overlays get `--shadow-overlay`.
```
--shadow-1        0 1px 2px    rgba(16,26,44,.06)   resting card
--shadow-2        0 2px 4px    rgba(16,26,44,.08)   raised chip / button
--shadow-3        0 6px 16px -4px rgba(16,26,44,.14) floating sheet
--shadow-overlay  0 16px 40px -12px rgba(16,26,44,.40) modal only
```

### Retired Colors
- **Rust / Terracotta (`#b5502f`)**: retired. No occurrences remain.
- **Oceanic Teal (`#0f6e6a` / `#0b524f`)**: retired as a brand accent. Warm cream + teal + terracotta is itself a recognisable template palette; retinting inside it cannot fix it, so the whole scheme was replaced rather than adjusted.
- **Warm cream ground (`#f7f4ee` / `#fffdf9`)**: retired. Only 0.077 apart in luminance, so cards never read as cards and hierarchy fell to an oversized shadow.

### Map Category Colors
Category is carried by the **glyph** (`ICONS` in `js/data.js`); colour only has to keep four pins apart at 24px in daylight. Hues are spaced >=48 deg with distinct lightness, and every fill clears 4.9:1 against its white glyph.
- Cooling center `#0f766e` (teal, 175 deg) · Hydration station `#1d4ed8` (blue, 224 deg) · Respite center `#9d174d` (rose, 336 deg) · Donation drop-off `#4d7c0f` (moss, 86 deg)

Never reuse a clinical status colour for a category, or vice versa.

### Clinical Status Colors (Accessible & High Contrast)
- **Normal / Healthy**: Text `#15803d`, BG `#f0fdf4`, Border `#bbf7d0`
- **Warning / Moderate**: Text `#b45309`, BG `#fffbeb`, Border `#fde68a`
- **Critical / Emergency**: Text `#b91c1c`, BG `#fef2f2`, Border `#fecaca`

---

## 3. Typography Hierarchy
- **Editorial Brand & Major Titles**: `Fraunces` serif (500-700 wt, variable optical size) — Conveys clinical authority and human care. It is the *only* display serif; Literata was cut as a redundant second.
- **Operational Data & Telemetry**: `Plus Jakarta Sans` — Clean geometric numerals, tabular alignment. The only sans; Work Sans was cut as a redundant second. Two families total, not four.
- **Micro-Labels & Meta Copy**: Uppercase, tracked:
  `font-size: 0.62rem - 0.68rem; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;`

---

## 4. Map UI & Ergonomics
- **Map Surface**: Crisp Oceanic styling (`hue-rotate(195deg)`).
- **Category Filter Rail**: Tactile floating horizontal pill rail with active state indicators (not bloated chips).
- **Custom Map Pins**: Crisp SVG glyphs carry the category; the fill colour only separates the four apart at a glance.
- **Bottom Drawer / Sheet**: Clean peek sheet with drag bar, instant walk time calculation, and direct action buttons.
