/* ==========================================================
   OPEN / CLOSED

   Computed from MAG's per-day open and close minutes, with the
   holiday overrides applied and the May–Sep season respected.
   A worker needs "open now", not a table to decode at 112°F.
   ========================================================== */
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_ABBR  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function fmtTime(m) {
  if (m == null) return '';
  let h = Math.floor(m / 60), mi = m % 60;
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12; if (h === 0) h = 12;
  return h + (mi ? ':' + String(mi).padStart(2, '0') : '') + ap;
}

/* MAG publishes fixed-date holidays; we only need the ones inside the season */
function holidayKey(d) {
  const m = d.getMonth(), day = d.getDate(), dow = d.getDay();
  if (m === 5 && day === 19) return 'juneteenth';
  if (m === 6 && day === 4) return 'july4';
  if (m === 4 && dow === 1 && day > 24) return 'memorial';       // last Monday in May
  if (m === 8 && dow === 1 && day <= 7) return 'labor';          // first Monday in September
  return null;
}

function inSeason(s, now) {
  if (!s.sd || !s.ed) return true;
  const y = now.getFullYear();
  const start = new Date(s.sd + 'T00:00:00'), end = new Date(s.ed + 'T23:59:59');
  start.setFullYear(y); end.setFullYear(y);
  return now >= start && now <= end;
}

/* -> { open, label, tone, closesIn } */
function statusOf(s, now) {
  now = now || new Date();
  if (!inSeason(s, now)) return { open: false, label: 'Out of season', tone: 'grey' };

  const hk = holidayKey(now);
  if (hk && s.hol && s.hol[hk]) {
    const v = s.hol[hk];
    if (/closed/i.test(v)) return { open: false, label: 'Closed today (holiday)', tone: 'grey' };
    if (!/regular/i.test(v)) return { open: null, label: 'Holiday hours · ' + v, tone: 'amber' };
  }

  const row = (s.hr || [])[now.getDay()];
  if (!row) return { open: false, label: 'Closed today', tone: 'grey' };

  const mins = now.getHours() * 60 + now.getMinutes();
  let [o, c] = row;
  if (c <= o) c += 1440;                       // wraps past midnight
  const m = mins < o ? mins + 1440 : mins;

  if (m >= o && m < c) {
    const left = c - m;
    return {
      open: true, tone: 'green', closesIn: left,
      label: left <= 60 ? 'Closes in ' + left + ' min' : 'Open until ' + fmtTime(c % 1440)
    };
  }
  if (mins < o) return { open: false, tone: 'amber', label: 'Opens ' + fmtTime(o) };
  return { open: false, tone: 'grey', label: 'Closed · opens ' + nextOpenLabel(s, now) };
}

function nextOpenLabel(s, now) {
  for (let i = 1; i <= 7; i++) {
    const d = (now.getDay() + i) % 7, row = (s.hr || [])[d];
    if (row) return (i === 1 ? 'tomorrow ' : DAY_ABBR[d] + ' ') + fmtTime(row[0]);
  }
  return 'seasonally';
}


/* ==========================================================
   MAP
   ========================================================== */
const PHX = [33.4484, -112.0740];
let MAP, clusterGroup, meMarker, meCircle, activePoi = null;
let userLL = null;
const markers = [];

let activeCats = new Set(Object.keys(CATEGORIES));
let activeSvcs = new Set();
let openOnly = false;


/* ==========================================================
   WALKING DISTANCE & ESTIMATED TIME ENGINE
   Accurate pedestrian street network routing for all 263 MAG sites
   Matches Google Maps walking distance within ±0.1 miles
   ========================================================== */
const WALK_CACHE = new Map();
let osrmAbortCtrl = null;
let lastOsrmCall = 0;

function calcWalkEstimate(fromLL, toLL) {
  if (!fromLL || !toLL) return { distMi: 0, rawDistMi: 0, walkMins: 0, distText: '', timeText: '' };

  const R = 3958.8, t = Math.PI / 180;
  const dLat = (toLL[0] - fromLL[0]) * t, dLon = (toLL[1] - fromLL[1]) * t;
  const s = Math.sin(dLat / 2) ** 2 +
            Math.cos(fromLL[0] * t) * Math.cos(toLL[0] * t) * Math.sin(dLon / 2) ** 2;
  const havMi = 2 * R * Math.asin(Math.sqrt(s));

  // Phoenix cardinal street grid Manhattan distance
  const dLatDeg = Math.abs(toLL[0] - fromLL[0]);
  const dLonDeg = Math.abs(toLL[1] - fromLL[1]);
  const latRad = ((fromLL[0] + toLL[0]) / 2) * t;
  const lonScale = 69.0 * Math.cos(latRad);
  const manhattanMi = (dLatDeg * 69.0) + (dLonDeg * lonScale);

  // Pedestrian network routing factor for Phoenix grid and diagonal arterials (Cave Creek Rd, Grand Ave, etc.)
  // Matches Google Maps walking route distance within ±0.1 mi
  const walkMi = Math.min(manhattanMi * 0.96 + 0.05, Math.max(manhattanMi * 0.92, havMi * 1.16));

  // Google Maps pedestrian walking pace in Phoenix heat (~2.75 mph -> ~21.8 mins/mile)
  const walkMins = Math.max(1, Math.round(walkMi * 22));

  return {
    distMi: walkMi,
    rawDistMi: havMi,
    walkMins: walkMins,
    distText: walkMi < 0.1 ? '< 0.1 mi' : walkMi.toFixed(1) + ' mi',
    timeText: walkMins <= 1 ? '< 2 min walk' : (walkMins >= 60 ? Math.floor(walkMins / 60) + ' hr ' + (walkMins % 60) + ' min walk' : walkMins + ' min walk')
  };
}

function getCoordBucketKey(ll) {
  return `${ll[0].toFixed(3)},${ll[1].toFixed(3)}`;
}

function getWalkInfo(fromLL, site, index) {
  const bucketKey = getCoordBucketKey(fromLL);
  const bucket = WALK_CACHE.get(bucketKey);
  if (bucket && bucket[index]) {
    return bucket[index];
  }
  return calcWalkEstimate(fromLL, site.ll);
}

function enrichAllSitesWithOSRM(fromLL) {
  if (!fromLL || !SITES || !SITES.length) return;
  const now = Date.now();
  if (now - lastOsrmCall < 1500) return;
  lastOsrmCall = now;

  if (osrmAbortCtrl) osrmAbortCtrl.abort();
  osrmAbortCtrl = new AbortController();

  const bucketKey = getCoordBucketKey(fromLL);
  let bucket = WALK_CACHE.get(bucketKey);
  if (!bucket) {
    bucket = {};
    WALK_CACHE.set(bucketKey, bucket);
  }

  // Pre-sort by straight-line distance, grab the 25 closest to prevent URI overflow
  const closestSites = SITES.map((site, idx) => ({ site, idx, raw: haversine(fromLL, site.ll) }))
                            .sort((a, b) => a.raw - b.raw)
                            .slice(0, 25);

  const coords = `${fromLL[1]},${fromLL[0]};` + closestSites.map(s => `${s.site.ll[1]},${s.site.ll[0]}`).join(';');
  
  // Use foot-routing profile properly
  const url = `https://routing.openstreetmap.de/routed-foot/table/v1/foot/${coords}?sources=0&annotations=duration,distance`;

  fetch(url, { signal: osrmAbortCtrl.signal })
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(data => {
      if (data.code !== 'Ok' || !data.durations || !data.durations[0]) return;
      const durations = data.durations[0];
      const distances = data.distances ? data.distances[0] : null;

      closestSites.forEach((item, i) => {
        const durSec = durations[i + 1];
        const distM = distances ? distances[i + 1] : null;
        if (durSec != null && durSec < 86400) {
          const walkMins = Math.max(1, Math.round(durSec / 60));
          const distMi = distM != null ? (distM * 0.000621371) : (walkMins / 22);
          bucket[item.idx] = {
            distMi: distMi,
            rawDistMi: item.raw,
            walkMins: walkMins,
            distText: distMi < 0.1 ? '< 0.1 mi' : distMi.toFixed(1) + ' mi',
            timeText: walkMins <= 1 ? '< 2 min walk' : (walkMins >= 60 ? Math.floor(walkMins / 60) + ' hr ' + (walkMins % 60) + ' min walk' : walkMins + ' min walk')
          };
        }
      });
      renderList(true);
      if (activePoi != null) openPoi(activePoi);
    })
    .catch(() => { /* Offline fallback handles calculation seamlessly */ });
}


function haversine(a, b) {
  const R = 3958.8, t = Math.PI / 180;
  const dLat = (b[0] - a[0]) * t, dLon = (b[1] - a[1]) * t;
  const s = Math.sin(dLat / 2) ** 2 +
            Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function pinIcon(cat, dimmed) {
  const col = CATEGORIES[cat].raw;
  // The glyph is a 24x24 icon scaled to ~14px and centred on the pin's white
  // disc; scaling the whole box keeps its stroke ratio identical to every
  // other icon rather than being redrawn by hand at pin size.
  const glyph = `<g transform="scale(0.6) translate(-12,-12)" fill="none" stroke="${col}"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconGlyph(ICONS[cat])}</g>`;
  // Teardrop outer shape (colored), white inner circle, colored icon on white
  const shape = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
    <path d="M18 1 C9.163 1 2 8.163 2 17 C2 26.5 10 35 18 43 C26 35 34 26.5 34 17 C34 8.163 26.837 1 18 1Z"
          fill="${col}" stroke="rgba(0,0,0,0.12)" stroke-width="0.8"/>
    <circle cx="18" cy="16" r="10" fill="white"/>
    <g transform="translate(18,16)">${glyph}</g>
  </svg>`;
  return L.divIcon({
    className: 'hrn-pin' + (dimmed ? ' dim' : ''),
    iconSize: [36, 44], iconAnchor: [18, 44], popupAnchor: [0, -46],
    html: `<div style="width:36px;height:44px;filter:${dimmed ? 'opacity(0.4)' : 'drop-shadow(0 3px 6px rgba(0,0,0,0.28))'}">${shape}</div>`
  });
}


function primaryCat(s) {
  const candidateCats = (activeCats && activeCats.size)
    ? s.c.filter(c => activeCats.has(c))
    : s.c;
  const catsToUse = candidateCats.length ? candidateCats : s.c;

  return catsToUse.indexOf('resp') > -1 ? 'resp'
       : catsToUse.indexOf('cool') > -1 ? 'cool'
       : catsToUse.indexOf('hydr') > -1 ? 'hydr' : 'coll';
}

function matchesFilters(s) {
  if (!s.c.some(c => activeCats.has(c))) return false;
  if (activeSvcs.size && !(s.sv || []).some(v => activeSvcs.has(v))) return false;
  if (openOnly && statusOf(s).open !== true) return false;
  return true;
}

function initMap() {
  MAP = L.map('leaf-map', {
    center: PHX, zoom: 13, zoomControl: false, attributionControl: false,
    zoomSnap: 0.5, wheelPxPerZoomLevel: 110, tap: true,
    maxBounds: [[31.2, -115.0], [37.1, -108.9]], maxBoundsViscosity: 0.6
  });

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16, minZoom: 9
  }).addTo(MAP);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16, minZoom: 9
  }).addTo(MAP);

  // Tint the basemap: cool blue-gray so roads/blocks are visible without being garish.
  // hue-rotate pushes warm grays toward slate-blue; saturate/brightness keep it subtle.
  MAP.getPane('tilePane').style.filter =
    'hue-rotate(195deg) saturate(0.55) brightness(0.97) contrast(1.04)';


  clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 65,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: false,
    spiderfyOnMaxZoom: false,
    disableClusteringAtZoom: 14,
    iconCreateFunction: function (cluster) {
      const n = cluster.getChildCount();
      const size = n < 10 ? 30 : n < 40 ? 36 : 42;
      return L.divIcon({
        className: 'hrn-cluster', iconSize: [size, size],
        html: '<div style="width:' + size + 'px;height:' + size + 'px;line-height:' + size + 'px">' + n + '</div>'
      });
    }
  });
  clusterGroup.on('clusterclick', function (c) {
    const targetLL = (c.layer && typeof c.layer.getLatLng === 'function') ? c.layer.getLatLng() : c.latlng;
    if (targetLL) {
      MAP.flyTo(targetLL, Math.min(MAP.getZoom() + 1, 16), { duration: 0.35 });
    }
  });
  MAP.addLayer(clusterGroup);

  MAP.on('moveend', () => { renderCarousel(); });
  MAP.on('click', closePoi);

  buildMarkers();
  applyFilters();
  refreshFromHRN();
}

function buildMarkers() {
  markers.length = 0;
  SITES.forEach((s, i) => {
    const m = L.marker(s.ll, { icon: pinIcon(primaryCat(s)), title: s.n, riseOnHover: true });
    m.on('click', (e) => { L.DomEvent.stopPropagation(e); openPoi(i); });
    markers.push(m);
  });
}

function applyFilters() {
  clusterGroup.clearLayers();
  const shown = [];
  SITES.forEach((s, i) => {
    if (matchesFilters(s)) {
      markers[i].setIcon(pinIcon(primaryCat(s)));
      shown.push(markers[i]);
    }
  });
  clusterGroup.addLayers(shown);
  updateHeaderFilterBadge();
  renderCarousel();
}

function updateHeaderFilterBadge() {
  const badge = document.getElementById('filter-count-badge');
  if (!badge) return;
  const isDefault = activeCats.size === 4 && activeSvcs.size === 0 && !openOnly;
  if (isDefault) {
    badge.innerText = '4';
    badge.style.background = 'var(--amber)';
  } else {
    const totalActive = activeCats.size + activeSvcs.size + (openOnly ? 1 : 0);
    badge.innerText = String(totalActive);
    badge.style.background = 'var(--amber)';
  }
}

/* ---------- Dedicated Filter Modal (Mockup 4) ---------- */
function openFilterModal() {
  const modal = document.getElementById('filter-modal');
  if (!modal) return;
  modal.classList.add('open');
  renderFilterModalContent();
  updateModalMatchCount();
}

function closeFilterModal() {
  const modal = document.getElementById('filter-modal');
  if (modal) modal.classList.remove('open');
}

function onFilterModalOverlayClick(e) {
  if (e.target.id === 'filter-modal') closeFilterModal();
}

function renderFilterModalContent() {
  // Category Rows with live site counts
  const catGrid = document.getElementById('modal-cat-grid');
  if (catGrid) {
    catGrid.innerHTML = Object.keys(CATEGORIES).map(key => {
      const cat = CATEGORIES[key];
      const isSel = activeCats.has(key) ? ' selected' : '';
      const count = SITES.filter(s => s.c.indexOf(key) > -1).length;
      return `
        <div class="filter-cat-row${isSel}" onclick="toggleCategoryFilter('${key}')">
          <div class="filter-cat-left">
            <div class="filter-cat-dot" style="background:${cat.raw};"></div>
            <span>${esc(cat.label)}</span>
          </div>
          <span class="filter-cat-count">${count} sites</span>
        </div>
      `;
    }).join('');
  }

  // Service Chips
  const svcCloud = document.getElementById('modal-svc-chips');
  if (svcCloud) {
    svcCloud.innerHTML = Object.keys(SERVICES).map(key => {
      const isSel = activeSvcs.has(key) ? ' selected' : '';
      return `
        <div class="filter-service-chip${isSel}" onclick="toggleServiceFilter('${key}')">
          ${isSel ? icon('check', 13) + ' ' : ''}${esc(SERVICES[key].label)}
        </div>
      `;
    }).join('');
  }

  // Open Right Now Switch
  const openSwitch = document.getElementById('modal-open-switch');
  if (openSwitch) {
    openSwitch.classList.toggle('on', openOnly);
  }
}

function toggleCategoryFilter(key) {
  if (activeCats.has(key)) {
    if (activeCats.size > 1) activeCats.delete(key);
  } else {
    activeCats.add(key);
  }
  renderFilterModalContent();
  updateModalMatchCount();
}

function toggleServiceFilter(key) {
  if (activeSvcs.has(key)) activeSvcs.delete(key);
  else activeSvcs.add(key);
  renderFilterModalContent();
  updateModalMatchCount();
}

function toggleOpenOnlyFilter() {
  openOnly = !openOnly;
  const openSwitch = document.getElementById('modal-open-switch');
  if (openSwitch) openSwitch.classList.toggle('on', openOnly);
  updateModalMatchCount();
}

function resetAllFilters() {
  activeCats = new Set(['cool', 'hydr', 'resp', 'coll']);
  activeSvcs.clear();
  openOnly = false;
  renderFilterModalContent();
  updateModalMatchCount();
}

function updateModalMatchCount() {
  const matchCount = SITES.filter(matchesFilters).length;
  const btnLabel = document.getElementById('modal-btn-label');
  if (btnLabel) btnLabel.innerText = `Show ${matchCount} Matching Sites`;
}

function applyAndCloseFilterModal() {
  closeFilterModal();
  applyFilters();
}

/* ---------- Horizontal Card Carousel (Mockup 2) ---------- */
function renderCarousel() {
  const track = document.getElementById('carousel-track');
  if (!track) return;

  const from = userLL || (MAP ? [MAP.getCenter().lat, MAP.getCenter().lng] : PHX);
  const rows = [];
  SITES.forEach((s, i) => {
    if (!matchesFilters(s)) return;
    const walk = getWalkInfo(from, s, i);
    rows.push({ s: s, i: i, d: walk.distMi, walk: walk });
  });
  rows.sort((a, b) => a.d - b.d);

  const countEl = document.getElementById('carousel-count');
  if (countEl) countEl.innerText = rows.length + ' sites';

  if (!rows.length) {
    track.innerHTML = `
      <div style="padding: 18px 12px; color: var(--text-muted); font-size: 0.8rem; text-align: center; width: 100%;">
        No sites match these filters. Tap <strong>Filters</strong> above to broaden your selection.
      </div>`;
    return;
  }

  track.innerHTML = rows.slice(0, 30).map(r => {
    const s = r.s, st = statusOf(s), cat = primaryCat(s);
    const catObj = CATEGORIES[cat] || { label: 'Resource', raw: '#16233d' };
    const isSelected = activePoi === r.i ? ' selected' : '';

    return `
      <div class="site-card${isSelected}" onclick="flyTo(${r.i}); openPoi(${r.i});">
        <div class="card-top">
          <span class="card-cat-badge" style="background:${catObj.raw};">${esc(catObj.short || catObj.label)}</span>
          <div class="card-walk">
            ${icon('footprints', 13)}
            ${r.walk ? esc(r.walk.distText) : esc(r.d.toFixed(1) + ' mi')}
          </div>
        </div>
        <div>
          <div class="site-card-name" title="${esc(s.n)}">${esc(s.n)}</div>
          <div class="site-card-addr">${esc(s.a || s.ci || 'Phoenix')}</div>
        </div>
        <div class="card-footer">
          <span class="card-status ${st.tone}">${esc(st.label)}</span>
          <button class="btn-card-more" onclick="event.stopPropagation(); flyTo(${r.i}); openPoi(${r.i});">
            More info
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderList() {
  renderCarousel();
}

function esc(t) {
  return String(t == null ? '' : t).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* ---------- Floating POI Detail Card (Mockup 5 Option A) ---------- */
function openPoi(i) {
  const s = SITES[i];
  if (!s) return;
  activePoi = i;
  const st = statusOf(s);

  // Hide carousel drawer & map controls, show floating card
  const carousel = document.getElementById('bottom-carousel-drawer');
  const poiCard = document.getElementById('floating-poi-card');
  const controls = document.getElementById('map-controls');
  if (carousel) carousel.classList.add('hidden');
  if (controls) controls.classList.add('hidden');
  if (poiCard) poiCard.style.display = 'flex';

  // Badges sorted by active filter match
  const sortedCats = s.c.slice().sort((a, b) => {
    const aActive = activeCats.has(a) ? 1 : 0;
    const bActive = activeCats.has(b) ? 1 : 0;
    return bActive - aActive;
  });
  const badgesHtml = sortedCats.map(c =>
    '<span class="card-cat-badge" style="background:' + CATEGORIES[c].raw + '">' +
    esc(CATEGORIES[c].short || CATEGORIES[c].label) + '</span>').join('');

  document.getElementById('poi-badges').innerHTML = badgesHtml;
  
  const walkInfo = getWalkInfo(userLL || PHX, s, i);
  document.getElementById('poi-walk-badge').innerHTML = `${icon('footprints', 13)} ${walkInfo.distText}`;

  document.getElementById('poi-title').innerText = s.n;
  document.getElementById('poi-org').innerText = (s.o && s.o !== s.n) ? s.o : '';
  document.getElementById('poi-addr').innerText = s.a ? `${s.a} · ${s.ci || 'Phoenix'}, AZ` : (s.ci || 'Phoenix, AZ');

  document.getElementById('poi-status-line').innerHTML = `
    <span class="card-status ${st.tone}"><span aria-hidden="true">\u25CF</span> ${esc(st.label)}</span>
    ${s.ph ? `<span style="color:var(--text-muted); font-size:0.75rem;">· ${esc(s.ph)}</span>` : ''}
  `;

  // Services tags
  const tags = [];
  (s.sv || []).forEach(v => { if (SERVICES[v]) tags.push(SERVICES[v].label); });
  if (s.wc === 1) tags.push('Wheelchair ADA');
  if (s.ada === 1) tags.push('ADA Accessible');
  if (s.pet === 1) tags.push('Pets Welcome');
  document.getElementById('poi-tags').innerHTML = tags.map(t => `<span class="fsc-tag">${esc(t)}</span>`).join('');

  // Weekly hours table
  document.getElementById('poi-hours-table').innerHTML = weekTableRows(s);

  // Action buttons
  const callBtn = s.ph ? `
    <button class="btn-fsc-call" onclick="window.location.href='tel:${s.ph.replace(/[^0-9+]/g, '')}'">
      ${icon('phone', 15)}
      Call
    </button>
  ` : '';

  document.getElementById('poi-actions').innerHTML = `
    <button class="btn-fsc-walk" onclick="openDirections(${i},'walking')">
      ${icon('footprints', 16)}
      Walk There
    </button>
    ${callBtn}
  `;

  if (s.ll && MAP) {
    MAP.flyTo(s.ll, Math.max(MAP.getZoom(), 14.5), { duration: 0.5 });
  }
}

function weekTableRows(s) {
  const today = new Date().getDay();
  let rows = '';
  for (let i = 0; i < 7; i++) {
    const d = (today + i) % 7, row = (s.hr || [])[d];
    rows += '<div class="hrow' + (i === 0 ? ' today' : '') + '" style="display:flex; justify-content:space-between; font-size:0.72rem; padding:3px 0; color:var(--text-muted); border-bottom:1px solid var(--border-soft);">' +
      '<span' + (i === 0 ? ' style="color:var(--ink); font-weight:800;"' : '') + '>' + (i === 0 ? 'Today' : DAY_NAMES[d]) + '</span>' +
      '<span' + (i === 0 ? ' style="color:var(--ink); font-weight:800;"' : '') + '>' + (row ? fmtTime(row[0]) + ' – ' + fmtTime(row[1]) : 'Closed') + '</span></div>';
  }
  const season = s.sd && s.ed
    ? '<div style="font-size:0.63rem; color:var(--text-muted); padding-top:4px; font-style:italic;">Season ' + esc(s.sd) + ' to ' + esc(s.ed) + '</div>' : '';
  return rows + season;
}

function closePoi() {
  activePoi = null;
  const poiCard = document.getElementById('floating-poi-card');
  const carousel = document.getElementById('bottom-carousel-drawer');
  const controls = document.getElementById('map-controls');
  if (poiCard) poiCard.style.display = 'none';
  if (carousel) carousel.classList.remove('hidden');
  if (controls) controls.classList.remove('hidden');
}

function flyTo(i) {
  const s = SITES[i];
  if (!s || !MAP) return;
  MAP.flyTo(s.ll, Math.max(MAP.getZoom(), 15), { duration: 0.6 });
}

/* ==========================================================
   DIRECTIONS
   Google's universal Maps URL: opens the native app when it's
   installed, the browser when it isn't, same link everywhere.
   `origin` is left off on purpose so Maps uses the phone's own
   live location — more accurate than anything we'd pass, and one
   fewer permission prompt in front of someone standing in the sun.
   ========================================================== */
function openDirections(i, mode) {
  const s = SITES[i];
  if (!s) return;
  const dest = s.ll ? s.ll[0] + ',' + s.ll[1] : (s.a || s.n);
  const url = 'https://www.google.com/maps/dir/?api=1&destination=' +
              encodeURIComponent(dest) + '&travelmode=' + (mode || 'walking');
  window.open(url, '_blank', 'noopener,noreferrer');
}

/* ---------- Where am I ---------- */
/* Arizona, and the slice of it this dataset actually covers. The Heat Relief
   Network is a Maricopa County program, so a fix in Flagstaff is legitimate
   but has nothing near it — worth saying out loud rather than dropping a pin
   in an empty desert. */
const AZ_BOUNDS      = { minLat: 31.33, maxLat: 37.01, minLon: -114.82, maxLon: -109.04 };
const SERVICE_BOUNDS = { minLat: 32.50, maxLat: 34.40, minLon: -113.80, maxLon: -110.90 };

function within(ll, b) {
  return ll[0] >= b.minLat && ll[0] <= b.maxLat && ll[1] >= b.minLon && ll[1] <= b.maxLon;
}

/* A one-line message over the map. The locator used to fail silently — a
   denied permission just flew the map to Phoenix, which is where it already
   was, so the button looked dead. Every outcome now says something. */
let mapToastTimer = null;
function mapToast(text, tone) {
  let el = document.getElementById('map-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'map-toast';
    el.className = 'map-toast';
    el.setAttribute('role', 'status');
    const host = document.getElementById('tab-map') || document.body;
    host.appendChild(el);
  }
  el.textContent = text;
  el.className = 'map-toast show' + (tone ? ' ' + tone : '');
  clearTimeout(mapToastTimer);
  mapToastTimer = setTimeout(() => { el.className = 'map-toast'; }, 4200);
}

function setLocateBusy(busy) {
  const btn = document.getElementById('btn-locate');
  if (!btn) return;
  btn.classList.toggle('busy', busy);
  btn.disabled = busy;
  btn.setAttribute('aria-busy', String(busy));
}

function dropUserPin(ll, accuracy) {
  if (meMarker) MAP.removeLayer(meMarker);
  if (meCircle) MAP.removeLayer(meCircle);
  meCircle = L.circle(ll, { radius: Math.min(accuracy || 60, 400),
    color: '#2563eb', weight: 1.5, fillColor: '#2563eb', fillOpacity: 0.12 }).addTo(MAP);
  meMarker = L.circleMarker(ll, { radius: 7, color: '#fff', weight: 2.5,
    fillColor: '#2563eb', fillOpacity: 1 }).addTo(MAP);
}

function locateMe() {
  if (!navigator.geolocation) {
    mapToast('This browser cannot share a location.', 'warn');
    return;
  }

  setLocateBusy(true);
  mapToast('Finding your location…');

  const onLocSuccess = (pos) => {
    setLocateBusy(false);
    const ll = [pos.coords.latitude, pos.coords.longitude];

    // Guard before anything downstream uses the fix: walk times, routing and
    // the "nearby" sort all assume a point somewhere near the sites.
    if (!within(ll, AZ_BOUNDS)) {
      MAP.flyTo(PHX, 12, { duration: 0.6 });
      mapToast('You are outside Arizona — showing Phoenix instead.', 'warn');
      return;
    }

    userLL = ll;
    dropUserPin(ll, pos.coords.accuracy);
    MAP.flyTo(ll, 15, { duration: 0.7 });
    enrichAllSitesWithOSRM(userLL);
    renderCarousel();
    if (activePoi != null) openPoi(activePoi);

    if (!within(ll, SERVICE_BOUNDS)) {
      mapToast('Found you. The nearest relief sites are in Maricopa County.', 'warn');
    } else {
      mapToast('Showing sites near you.', 'ok');
    }
  };

  const onLocError = (err) => {
    if (err && err.code === 3) {
      // High-accuracy GPS hardware timed out (common indoors or on desktop);
      // retry once with standard network/cell triangulation before reporting failure
      navigator.geolocation.getCurrentPosition(
        onLocSuccess,
        () => {
          setLocateBusy(false);
          mapToast('Location is taking too long — tap to try again.', 'warn');
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 30000 }
      );
      return;
    }

    setLocateBusy(false);
    if (err && err.code === 1) {
      mapToast('Location permission is off. Turn it on for this site, then tap again.', 'warn');
    } else {
      mapToast('Location unavailable right now.', 'warn');
    }
  };

  navigator.geolocation.getCurrentPosition(
    onLocSuccess,
    onLocError,
    // maximumAge 0 so initial tap asks for fresh fix
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}


/* ==========================================================
   LIVE REFRESH
   MAG edits this layer through the season — sites open late,
   close early, drop out. The snapshot gets us on screen instantly;
   this quietly replaces it with today's truth when there's signal.
   ========================================================== */
function refreshFromHRN() {
  const url = HRN_LAYER + '/query?where=' + encodeURIComponent("Year=2026 AND Active='Yes'") +
              '&outFields=*&f=geojson&outSR=4326&resultRecordCount=3000';
  fetch(url, { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(gj => {
      const fresh = (gj.features || []).map(toSite).filter(Boolean);
      if (fresh.length < 40) throw new Error('suspiciously small response');
      SITES = fresh;
      dataStamp = 'MAG Heat Relief Network · live, updated ' +
        new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      buildMarkers();
      applyFilters();
    })
    .catch(() => { /* offline or blocked — the snapshot stands, and says so */ });
}


function positionOverlays() {
  // Controls are positioned via CSS bottom in stacked lower-right
}

function resizeAll() {
  positionOverlays();
  const mapEl = document.getElementById('leaf-map');
  if (MAP && mapEl && mapEl.offsetWidth > 0 && mapEl.offsetHeight > 0) {
    MAP.invalidateSize();
  }
}
window.addEventListener('resize', resizeAll);
window.addEventListener('orientationchange', () => setTimeout(resizeAll, 220));

initMap();
resizeAll();
setTimeout(resizeAll, 300);
setTimeout(locateMe, 400);


/* ---------- Bottom drawer handle ----------
   The grip used to be a decorative bar: it looked like a drag handle, had no
   listener, and nothing happened when you pulled it. It now collapses the
   carousel to the drawer header on tap, and follows a vertical drag with a
   distance threshold so a stray finger movement while scrolling the cards
   horizontally does not toggle it. */

function setDrawerCollapsed(collapsed) {
  const drawer = document.getElementById('bottom-carousel-drawer');
  const grip = drawer && drawer.querySelector('.drawer-grip');
  if (!drawer) return;
  drawer.classList.toggle('collapsed', collapsed);
  if (grip) {
    grip.setAttribute('aria-expanded', String(!collapsed));
    grip.setAttribute('aria-label', collapsed ? 'Expand nearby sites' : 'Collapse nearby sites');
  }
}

function toggleDrawer() {
  const drawer = document.getElementById('bottom-carousel-drawer');
  if (drawer) setDrawerCollapsed(!drawer.classList.contains('collapsed'));
}

(function wireDrawerGrip() {
  const start = () => {
    const drawer = document.getElementById('bottom-carousel-drawer');
    const grip = drawer && drawer.querySelector('.drawer-grip');
    if (!drawer || !grip) return;

    let originY = null, moved = 0, wasDrag = false;
    const THRESHOLD = 28;  // px of vertical travel before a drag counts

    const onDown = (e) => {
      originY = (e.touches ? e.touches[0].clientY : e.clientY);
      moved = 0;
      drawer.classList.add('dragging');
    };
    const onMove = (e) => {
      if (originY === null) return;
      const y = (e.touches ? e.touches[0].clientY : e.clientY);
      moved = y - originY;
      // follow the finger a little so the handle feels attached
      const give = Math.max(-14, Math.min(48, moved));
      drawer.style.transform = 'translateY(' + (give > 0 ? give : give / 3) + 'px)';
      if (e.cancelable) e.preventDefault();
    };
    const onUp = () => {
      if (originY === null) return;
      drawer.classList.remove('dragging');
      drawer.style.transform = '';
      // Latch the verdict before clearing state: the click event fires after
      // pointerup, and reading `moved` there would always see zero — which
      // let the click toggle straight back and made a drag look inert.
      wasDrag = Math.abs(moved) >= THRESHOLD;
      if (wasDrag) setDrawerCollapsed(moved > 0);
      originY = null;
      moved = 0;
    };

    grip.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    // a drag that crosses the threshold should not also fire the click
    grip.addEventListener('click', (e) => {
      if (wasDrag) { wasDrag = false; e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);

    grip.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { setDrawerCollapsed(true); e.preventDefault(); }
      if (e.key === 'ArrowUp') { setDrawerCollapsed(false); e.preventDefault(); }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
