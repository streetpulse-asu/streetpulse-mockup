# StreetPulse Design System & Visual Guidelines

## 1. Design Philosophy: Human, Clinical, & Editorial
StreetPulse is a clinical triage and field outreach tool used by healthcare and outreach workers in demanding real-world outdoor environments. 

### Anti-Slop Directive
- **Zero generic SaaS tropes**: No random purple/indigo gradients, no oversized blurred box shadows (`box-shadow: 0 10px 30px rgba(0,0,0,0.2)`), no emojis as icons, no bubbly cartoonish pills.
- **High-contrast field legibility**: Crisp rendering optimized for bright outdoor daylight.
- **Physical-like tactile surfaces**: 1px crisp borders (`#e2e8f0` / `rgba(15, 23, 42, 0.08)`) with subtle inset elevation rather than heavy blurred drop-shadows.

---

## 2. Color Palette & Hierarchy

### Core Brand & Surfaces
- **Deep Navy (Structure & Ink)**: `#16233d` — Primary headings, phone frame, institutional anchor.
- **StreetPulse Blue (Brand Accent)**: `#2563eb` — Key interactive highlights, brand mark pulse accent.
- **Oceanic Teal (Clinical/Telemetry)**: `#0f6e6a` (deep: `#0b524f`) — Sensor status, medical triage, Telehealth actions.
- **Canvas / App Background**: `#f8fafc` / `#f1f5f9` — Clean, crisp, neutral (retiring murky sepia).
- **Surface / Cards**: `#ffffff` — Crisp white cards with 1px border.
- **Hairline Borders**: `#e2e8f0` / `rgba(15, 23, 42, 0.08)`.

### Retired Color
- ❌ **Rust / Terracotta (`#b5502f`)**: **STRICTLY RETIRED**. All occurrences are being replaced with StreetPulse Electric Blue (`#2563eb`), Oceanic Teal (`#0f6e6a`), or intentional clinical status colors.

### Clinical Status Colors (Accessible & High Contrast)
- **Normal / Healthy**: Text `#15803d`, BG `#f0fdf4`, Border `#bbf7d0`
- **Warning / Moderate**: Text `#b45309`, BG `#fffbeb`, Border `#fde68a`
- **Critical / Emergency**: Text `#b91c1c`, BG `#fef2f2`, Border `#fecaca`

---

## 3. Typography Hierarchy
- **Editorial Brand & Major Titles**: `Literata` / `Fraunces` serif (700 wt) — Conveys clinical authority and human care.
- **Operational Data & Telemetry**: `Plus Jakarta Sans` / `Work Sans` — Clean geometric numerals, tabular alignment.
- **Micro-Labels & Meta Copy**: Uppercase, tracked:
  `font-size: 0.62rem - 0.68rem; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;`

---

## 4. Map UI & Ergonomics
- **Map Surface**: Crisp Oceanic styling (`hue-rotate(195deg)`).
- **Category Filter Rail**: Tactile floating horizontal pill rail with active state indicators (not bloated chips).
- **Custom Map Pins**: Crisp SVG icons with category color rings.
- **Bottom Drawer / Sheet**: Clean peek sheet with drag bar, instant walk time calculation, and direct action buttons.
