# StreetPulse Mockup

Visual/interactive mockup of the StreetPulse outreach companion app — two
screens (Map + Vitals Scanner) built as a static HTML/CSS/JS site. This is
the **design reference**, not the production app; the real app is the
Flutter build described in the project's session handoff doc.

## Folder structure

```
index.html              Page structure only — no inline CSS/JS
css/
  tokens.css             Colors, spacing, shadows, type scale — the one
                          file to touch for a global visual change
  base.css                Resets, phone-frame shell, tab container
  components.css           Shared chrome: header, dropdown, bottom nav, modals, buttons
  map.css                   Map screen only (Leaflet, filter chips, site
                            detail card, resource list sheet)
  scanner.css               Vitals scan screen only (encounter header, the
                            telemetry board, encounter log, field guide and
                            the telehealth call)
js/
  icons.js                Generated icon set (lucide-static, ISC). Every glyph
                          in the app comes from here — never paste an SVG path
                          into markup; add the name and regenerate
  data.js                 Heat Relief Network site data (public, non-PHI)
                          + the helpers that map live ArcGIS features onto it
  map.js                    All map-screen logic (Leaflet setup, filtering,
                            directions, walk-time estimates)
  ui.js                     App chrome shared by both screens (mode
                            dropdown, tab switching, BLE-pairing simulation)
  scanner.js                 Vitals scanner logic. Holds the encounter
                            record: ENCOUNTER, LIMITS and VITALS (value +
                            capture time + source), with the board rendered
                            from them, plus the encounter log, field guide,
                            manual entry and the telehealth call
assets/
  icon.png                 App icon (used as favicon, apple-touch-icon, and
                            in the manifest)
manifest.webmanifest     PWA manifest — name, icons, theme color
service-worker.js        Minimal offline cache for the app shell
```

Everything here was mechanically split out of a single-file prototype with
no visual changes — it should look and behave identically to the original.
Load order matters for the JS files (`icons.js` → `data.js` → `map.js` →
`ui.js` → `scanner.js`); `index.html` already references them in that order.
`icons.js` must come first: `scanner.js` calls `icon()` while it is parsing.

## Editing visuals

- Global color/spacing/shadow change → edit `css/tokens.css` only.
- Something specific to the map screen → `css/map.css`.
- Something specific to the vitals scanner → `css/scanner.css`.
- Shared chrome (header, buttons, modals) → `css/components.css`.

## Data note

`js/data.js` contains a real public snapshot of the Maricopa County Heat
Relief Network (site names, addresses, hours) — it's public resource
directory data, not PHI, and safe to keep in a public mockup repo. No
patient or encounter data appears anywhere in this mockup; vitals readings
are randomly simulated in `scanner.js`.

## Running it locally

Any static file server works, e.g. from this folder:

```
python3 -m http.server 8000
```

then open `http://localhost:8000` in a browser. Opening `index.html`
directly via `file://` will NOT work — the browser blocks `fetch`/module
-style relative loads for local files in some browsers, and Leaflet's CDN
assets need a real HTTP context in others. A local server (or the
deployment below) avoids that entirely.

## Deploying so it opens on an iPhone (no App Store)

1. Push this folder to a GitHub repo (a `docs/` subfolder or the repo root
   both work).
2. In the repo settings, enable **GitHub Pages** for that folder/branch.
   GitHub gives you a URL like `https://<username>.github.io/<repo>/`.
3. Open that URL in Safari on the iPhone.
4. Tap the **Share** button → **Add to Home Screen**.

That's it — no Apple Developer account, no $99/year fee, no App Store
review. The app icon appears on the home screen and opens full-screen
(no Safari address bar), because of the `manifest.webmanifest` and the
`apple-mobile-web-app-*` meta tags already in `index.html`.

Two things worth knowing:

- Adding to the home screen is a manual step on iOS — there's no install
  prompt like on Android — so for a demo it's easiest to just send people
  the link directly; viewing it as a normal Safari tab works exactly the
  same, "Add to Home Screen" just adds the icon/full-screen shell on top.
- `service-worker.js` caches the app shell so the screens still open with
  no signal, matching the "offline-first" pitch. It does **not** cache the
  Leaflet map tiles themselves (those come from a CDN), so the map tab
  needs a connection the first time; everything else works offline.

## Known gaps (cosmetic, not blocking)

- `assets/icon.png` is a real 512×512 export and the manifest now declares
  it as such (it previously claimed 192×192). A dedicated smaller size would
  save a few KB on install but changes nothing visually.
- `node_modules/` is committed — 2,268 files, mostly Puppeteer, which is only
  used for local screenshots. Adding a `.gitignore` and untracking it would
  drop the repo from ~16 MB to well under one, but rewrites history for
  anyone who has already cloned.
- `mockup_1…5.html` and `map_ui_redesign_plan.md` are frozen reference
  material from the September redesign. They describe a palette and a layout
  the app has since moved off, so read them as history, not as guidance.
