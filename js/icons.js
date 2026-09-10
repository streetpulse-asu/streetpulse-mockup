/* ---------------------------------------------------------------------------
   Icon set — generated from lucide-static v1.43.0 (ISC). Do not hand-edit.

   Every icon in the app comes from here, so a single geometry applies
   everywhere: a 24x24 box, 2px strokes, round caps and joins, currentColor.
   Before this the app carried 45 hand-drawn SVGs across six different stroke
   widths, which is what made the walking glyph look unlike its neighbours.

   Markup writes <span class="icon" data-icon="phone"></span> and renderIcons()
   fills it in; code that builds HTML strings calls icon(name, size). Adding an
   icon means adding its name to the generator and regenerating, never pasting
   a path in by hand.
   --------------------------------------------------------------------------- */

const ICON_PATHS = {
  "activity"            : "<path d=\"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2\"/>",
  "arrow-right"         : "<path d=\"M5 12h14\"/> <path d=\"m12 5 7 7-7 7\"/>",
  "bluetooth"           : "<path d=\"m7 7 10 10-5 5V2l5 5L7 17\"/>",
  "bluetooth-searching" : "<path d=\"m7 7 10 10-5 5V2l5 5L7 17\"/> <path d=\"M20.83 14.83a4 4 0 0 0 0-5.66\"/> <path d=\"M18 12h.01\"/>",
  "book-open-text"      : "<path d=\"M12 5v16\"/> <path d=\"M16 13h2\"/> <path d=\"M16 9h2\"/> <path d=\"M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z\"/> <path d=\"M6 13h2\"/> <path d=\"M6 9h2\"/>",
  "camera"              : "<path d=\"M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z\"/> <circle cx=\"12\" cy=\"13\" r=\"3\"/>",
  "check"               : "<path d=\"M20 6 9 17l-5-5\"/>",
  "chevron-down"        : "<path d=\"m6 9 6 6 6-6\"/>",
  "circle-check"        : "<circle cx=\"12\" cy=\"12\" r=\"10\"/> <path d=\"m16 9-5.5 5.5L8 12\"/>",
  "clipboard-pen"       : "<path d=\"M16 4h2a2 2 0 0 1 2 2v2\"/> <path d=\"M21.34 15.664a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z\"/> <path d=\"M8 22H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/> <rect x=\"8\" y=\"2\" width=\"8\" height=\"4\" rx=\"1\"/>",
  "droplet"             : "<path d=\"M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z\"/>",
  "footprints"          : "<path d=\"M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z\"/> <path d=\"M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z\"/> <path d=\"M16 17h4\"/> <path d=\"M4 13h4\"/>",
  "funnel"              : "<path d=\"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z\"/>",
  "heart-pulse"         : "<path d=\"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5\"/> <path d=\"M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27\"/>",
  "house"               : "<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\"/> <path d=\"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/>",
  "info"                : "<circle cx=\"12\" cy=\"12\" r=\"10\"/> <path d=\"M12 16v-4\"/> <path d=\"M12 8h.01\"/>",
  "lock"                : "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"/> <path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>",
  "map"                 : "<path d=\"M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z\"/> <path d=\"M15 5.764v15\"/> <path d=\"M9 3.236v15\"/>",
  "megaphone"           : "<path d=\"M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z\"/> <path d=\"M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14\"/> <path d=\"M8 6v8\"/>",
  "mic"                 : "<path d=\"M12 19v3\"/> <path d=\"M19 10v2a7 7 0 0 1-14 0v-2\"/> <rect x=\"9\" y=\"2\" width=\"6\" height=\"13\" rx=\"3\"/>",
  "navigation"          : "<polygon points=\"3 11 22 2 13 21 11 13 3 11\"/>",
  "package"             : "<path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\"/> <path d=\"M12 22V12\"/> <polyline points=\"3.29 7 12 12 20.71 7\"/> <path d=\"m7.5 4.27 9 5.15\"/>",
  "phone"               : "<path d=\"M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384\"/>",
  "phone-call"          : "<path d=\"M13 2a9 9 0 0 1 9 9\"/> <path d=\"M13 6a5 5 0 0 1 5 5\"/> <path d=\"M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384\"/>",
  "phone-off"           : "<path d=\"M10.1 13.9a14 14 0 0 0 3.732 2.668 1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2 18 18 0 0 1-12.728-5.272\"/> <path d=\"M22 2 2 22\"/> <path d=\"M4.76 13.582A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 .244.473\"/>",
  "pill"                : "<path d=\"m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z\"/> <path d=\"m8.5 8.5 7 7\"/>",
  "refresh-cw"          : "<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\"/> <path d=\"M21 3v5h-5\"/> <path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\"/> <path d=\"M8 16H3v5\"/>",
  "send"                : "<path d=\"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z\"/> <path d=\"m21.854 2.147-10.94 10.939\"/>",
  "settings"            : "<path d=\"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915\"/> <circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  "shield-check"        : "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/> <path d=\"m9 12 2 2 4-4\"/>",
  "snowflake"           : "<path d=\"m10 20-1.25-2.5L6 18\"/> <path d=\"M10 4 8.75 6.5 6 6\"/> <path d=\"m14 20 1.25-2.5L18 18\"/> <path d=\"m14 4 1.25 2.5L18 6\"/> <path d=\"m17 21-3-6h-4\"/> <path d=\"m17 3-3 6 1.5 3\"/> <path d=\"M2 12h6.5L10 9\"/> <path d=\"m20 10-1.5 2 1.5 2\"/> <path d=\"M22 12h-6.5L14 15\"/> <path d=\"m4 10 1.5 2L4 14\"/> <path d=\"m7 21 3-6-1.5-3\"/> <path d=\"m7 3 3 6h4\"/>",
  "stethoscope"         : "<path d=\"M11 2v2\"/> <path d=\"M5 2v2\"/> <path d=\"M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1\"/> <path d=\"M8 15a6 6 0 0 0 12 0v-3\"/> <circle cx=\"20\" cy=\"10\" r=\"2\"/>",
  "thermometer-sun"     : "<path d=\"M12 2v2\"/> <path d=\"M12 8a4 4 0 0 0-1.645 7.647\"/> <path d=\"M2 12h2\"/> <path d=\"M20 14.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z\"/> <path d=\"m4.93 4.93 1.41 1.41\"/> <path d=\"m6.34 17.66-1.41 1.41\"/>",
  "user"                : "<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\"/> <circle cx=\"12\" cy=\"7\" r=\"4\"/>",
  "video"               : "<path d=\"m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5\"/> <rect x=\"2\" y=\"6\" width=\"14\" height=\"12\" rx=\"2\"/>",
  "wind"                : "<path d=\"M12.8 19.6A2 2 0 1 0 14 16H2\"/> <path d=\"M17.5 8a2.5 2.5 0 1 1 2 4H2\"/> <path d=\"M9.8 4.4A2 2 0 1 1 11 8H2\"/>",
  "x"                   : "<path d=\"M18 6 6 18\"/> <path d=\"m6 6 12 12\"/>",
};

/* Returns an <svg> string. size is in px and applies to both axes; the glyph
   is drawn in a 24x24 box regardless, so strokes stay optically even at any
   size. Decorative by default — pass a label only when the icon is the sole
   content of a control. */
function icon(name, size, label) {
  const d = ICON_PATHS[name];
  if (!d) { console.warn('icon: unknown name', name); return ''; }
  const dims = size ? ` width="${size}" height="${size}"` : '';
  const a11y = label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"';
  return '<svg' + dims + a11y + ' viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
         ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
}

/* Fills every <span class="icon" data-icon="..."> in the tree. data-size sets
   the px box; leaving it off lets CSS size the svg. Idempotent, so it is safe
   to call again after injecting markup. */
function renderIcons(root) {
  (root || document).querySelectorAll('.icon[data-icon]').forEach((el) => {
    const want = el.dataset.icon + '|' + (el.dataset.size || '');
    if (el.dataset.rendered === want) return;
    el.innerHTML = icon(el.dataset.icon, el.dataset.size ? Number(el.dataset.size) : null);
    el.dataset.rendered = want;
  });
}

/* The raw <path> set, for callers that need to place a glyph inside their own
   <svg> — the map pin draws its category glyph in a centred coordinate space,
   so it supplies the wrapper itself. */
function iconGlyph(name) {
  return ICON_PATHS[name] || '';
}

document.addEventListener('DOMContentLoaded', () => renderIcons());
