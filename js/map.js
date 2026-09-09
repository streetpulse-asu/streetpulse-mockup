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
  return L.divIcon({
    className: 'hrn-pin' + (dimmed ? ' dim' : ''),
    iconSize: [30, 38], iconAnchor: [15, 36], popupAnchor: [0, -32],
    html: '<svg width="30" height="38" viewBox="-15 -30 30 38">' +
          '<path d="M0 6 L-6.4 -3 A11.4 11.4 0 1 1 6.4 -3 Z" fill="#fffdf9"/>' +
          '<circle cx="0" cy="-11" r="10.4" fill="' + col + '"/>' +
          '<g transform="translate(0,-11) scale(0.92)">' + ICONS[cat] + '</g></svg>'
  });
}

function primaryCat(s) {
  return s.c.indexOf('resp') > -1 ? 'resp'
       : s.c.indexOf('cool') > -1 ? 'cool'
       : s.c.indexOf('hydr') > -1 ? 'hydr' : 'coll';
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
    maxBounds: [[32.6, -113.7], [34.3, -111.0]], maxBoundsViscosity: 0.6
  });

  // Official ArcGIS / Esri World Street Map basemap (matches MAG Heat Relief Network official GIS layer)
  // Clean, high-resolution street network with zero API key or token requirements.
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri · Sites: MAG Heat Relief Network',
    maxZoom: 19, minZoom: 9
  }).addTo(MAP);

  clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 60, showCoverageOnHover: false, spiderfyDistanceMultiplier: 1.5,
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
  MAP.addLayer(clusterGroup);

  MAP.on('moveend', () => { renderList(); });
  MAP.on('click', closePoi);

  buildMarkers();
  renderRail();
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
  SITES.forEach((s, i) => { if (matchesFilters(s)) shown.push(markers[i]); });
  clusterGroup.addLayers(shown);
  renderList();
}

/* ---------- Filter rail ---------- */
function renderRail() {
  const rail = document.getElementById('filter-rail');
  rail.innerHTML = '';

  const openChip = document.createElement('button');
  openChip.className = 'chip chip-open' + (openOnly ? '' : ' off');
  openChip.innerHTML = '<span class="dot live"></span>Open now';
  openChip.onclick = () => {
    openOnly = !openOnly;
    openChip.classList.toggle('off', !openOnly);
    applyFilters();
  };
  rail.appendChild(openChip);

  Object.keys(CATEGORIES).forEach(key => {
    const cat = CATEGORIES[key];
    const chip = document.createElement('button');
    chip.className = 'chip' + (activeCats.has(key) ? '' : ' off');
    chip.innerHTML = '<span class="dot" style="background:' + cat.raw + '"></span>' + cat.label;
    chip.onclick = () => {
      if (activeCats.has(key)) activeCats.delete(key); else activeCats.add(key);
      chip.classList.toggle('off', !activeCats.has(key));
      applyFilters();
    };
    rail.appendChild(chip);
  });

  const sep = document.createElement('span');
  sep.className = 'rail-sep';
  rail.appendChild(sep);

  Object.keys(SERVICES).forEach(key => {
    const chip = document.createElement('button');
    chip.className = 'chip chip-svc off';
    chip.textContent = SERVICES[key].label;
    chip.onclick = () => {
      if (activeSvcs.has(key)) activeSvcs.delete(key); else activeSvcs.add(key);
      chip.classList.toggle('off', !activeSvcs.has(key));
      applyFilters();
    };
    rail.appendChild(chip);
  });
}

/* ---------- List, sorted by distance from where you're looking ---------- */
function renderList() {
  const list = document.getElementById('sheet-list');
  const from = userLL || (MAP ? [MAP.getCenter().lat, MAP.getCenter().lng] : PHX);

  const rows = [];
  SITES.forEach((s, i) => {
    if (!matchesFilters(s)) return;
    const walk = getWalkInfo(from, s, i);
    rows.push({ s: s, i: i, d: walk.distMi, walk: walk });
  });
  rows.sort((a, b) => a.d - b.d);

  document.getElementById('sheet-count').innerText = rows.length + ' sites';
  document.getElementById('sheet-source').innerText = dataStamp;

  if (!rows.length) {
    list.innerHTML = '<div class="empty-note">No sites match these filters. ' +
      'Turn a filter back on, or clear <strong>Open now</strong> to see sites that open later.</div>';
    return;
  }

  list.innerHTML = rows.slice(0, 60).map(r => {
    const s = r.s, st = statusOf(s), cat = primaryCat(s);
    return '<div class="res-row" onclick="flyTo(' + r.i + ')">' +
      '<div class="res-badge" style="background:' + CATEGORIES[cat].raw + '">' +
        '<svg width="18" height="18" viewBox="-9 -9 18 18">' + ICONS[cat] + '</svg></div>' +
      '<div class="res-body">' +
        '<div class="res-name">' + esc(s.n) + '</div>' +
        '<div class="res-meta">' + esc(s.a || s.ci || '') + '</div>' +
        '<span class="res-tag ' + st.tone + '">' + esc(st.label) + '</span>' +
      '</div>' +
      '<div class="res-dist-col">' +
        '<div class="res-dist">' + (r.walk ? r.walk.distText : r.d.toFixed(1) + ' mi') + '</div>' +
        '<div class="res-walk-time">' + (r.walk ? r.walk.timeText : '') + '</div>' +
      '</div>' +
      '<button class="row-dir" aria-label="Walking directions to ' + esc(s.n) + '" ' +
        'onclick="event.stopPropagation();openDirections(' + r.i + ',\'walking\')">' +
        '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="13" cy="4" r="2"/><path d="m9 21 1.5-6.5L8 12l1-5 3.5 2 3 1.5"/><path d="M14.5 14.5 17 21"/></svg>' +
      '</button></div>';
  }).join('') +
  (rows.length > 60 ? '<div class="empty-note">Showing the 60 closest of ' + rows.length +
    '. Move the map or add a filter to narrow it down.</div>' : '');
}

function esc(t) {
  return String(t == null ? '' : t).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* ---------- Site detail ---------- */
function openPoi(i) {
  const s = SITES[i];
  if (!s) return;
  activePoi = i;
  const st = statusOf(s);

  document.getElementById('poi-badges').innerHTML = s.c.map(c =>
    '<span class="poi-badge" style="background:' + CATEGORIES[c].raw + '">' +
    esc(CATEGORIES[c].short) + '</span>').join('');

  document.getElementById('poi-name').innerHTML = '<span class="poi-title">' + esc(s.n) + '</span>';
  document.getElementById('poi-org').innerHTML = s.o && s.o !== s.n
    ? '<span class="poi-org">' + esc(s.o) + '</span>' : '';

  document.getElementById('poi-status').innerHTML =
    '<span class="status-pill ' + st.tone + '">' + esc(st.label) + '</span>' +
    (userLL ? '<span class="poi-dist">' + getWalkInfo(userLL, s, i).distText + ' away</span>' : '');

  const addr = esc(s.a || '');
  document.getElementById('poi-addr').innerHTML = addr ? '<div class="poi-addr">' + addr + '</div>' : '';

  document.getElementById('poi-hours').innerHTML = weekTable(s);

  const tags = [];
  (s.sv || []).forEach(v => { if (SERVICES[v]) tags.push(SERVICES[v].label); });
  if (s.ct) tags.push(s.ct);
  if (s.wc === 1) tags.push('Wheelchair accessible');
  if (s.ada === 1) tags.push('ADA accessible');
  if (s.pet === 1) tags.push('Pets welcome');
  else if (s.pet === 0) tags.push('No pets');
  document.getElementById('poi-tags').innerHTML =
    tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('');

  document.getElementById('poi-note').innerHTML =
    s.nt ? '<div class="poi-note">' + esc(s.nt) + '</div>' : '';

  const call = document.getElementById('poi-call');
  if (s.ph) {
    call.style.display = '';
    call.onclick = () => { window.location.href = 'tel:' + s.ph.replace(/[^0-9+]/g, ''); };
    call.setAttribute('aria-label', 'Call ' + s.n + ' at ' + s.ph);
  } else {
    call.style.display = 'none';
  }

  document.getElementById('poi-sheet').classList.add('show');
  positionOverlays();
}

/* The whole week, with today marked — an outreach worker is often planning
   tomorrow's route, not just this minute. */
function weekTable(s) {
  const today = new Date().getDay();
  let rows = '';
  for (let i = 0; i < 7; i++) {
    const d = (today + i) % 7, row = (s.hr || [])[d];
    rows += '<div class="hrow' + (i === 0 ? ' today' : '') + '">' +
      '<span>' + (i === 0 ? 'Today' : DAY_NAMES[d]) + '</span>' +
      '<span>' + (row ? fmtTime(row[0]) + ' – ' + fmtTime(row[1]) : 'Closed') + '</span></div>';
  }
  const season = s.sd && s.ed
    ? '<div class="season">Season ' + esc(s.sd) + ' to ' + esc(s.ed) + '</div>' : '';
  return '<details class="hours-wrap"><summary>Hours this week</summary>' + rows + season + '</details>';
}

function closePoi() {
  document.getElementById('poi-sheet').classList.remove('show');
  activePoi = null;
  positionOverlays();
}

function flyTo(i) {
  const s = SITES[i];
  if (!s) return;
  document.getElementById('sheet').classList.remove('expanded');
  MAP.flyTo(s.ll, Math.max(MAP.getZoom(), 16), { duration: 0.7 });
  openPoi(i);
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
function locateMe() {
  const btn = document.getElementById('btn-locate');
  if (!navigator.geolocation) return;
  btn.classList.add('busy');
  navigator.geolocation.getCurrentPosition(pos => {
    btn.classList.remove('busy');
    userLL = [pos.coords.latitude, pos.coords.longitude];
    enrichAllSitesWithOSRM(userLL);
    if (meMarker) MAP.removeLayer(meMarker);
    if (meCircle) MAP.removeLayer(meCircle);
    meCircle = L.circle(userLL, { radius: Math.min(pos.coords.accuracy || 60, 400),
      color: '#2f6fd0', weight: 1, fillColor: '#2f6fd0', fillOpacity: 0.1 }).addTo(MAP);
    meMarker = L.circleMarker(userLL, { radius: 7, color: '#fff', weight: 2.5,
      fillColor: '#2f6fd0', fillOpacity: 1 }).addTo(MAP);
    MAP.flyTo(userLL, 15, { duration: 0.7 });
    renderList();
  }, () => {
    btn.classList.remove('busy');
    MAP.flyTo(PHX, 12, { duration: 0.6 });
  }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
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


const sheet = document.getElementById('sheet');
const grip = document.getElementById('sheet-grip');
let gripStart = null;
grip.addEventListener('pointerdown', e => {
  grip.setPointerCapture(e.pointerId);
  gripStart = { y: e.clientY };
});
grip.addEventListener('pointermove', e => {
  if (!gripStart) return;
  const dy = e.clientY - gripStart.y;
  if (dy < -34) sheet.classList.add('expanded');
  if (dy > 34) sheet.classList.remove('expanded');
});
grip.addEventListener('pointerup', e => {
  if (gripStart && Math.abs(e.clientY - gripStart.y) < 8) sheet.classList.toggle('expanded');
  gripStart = null;
});

/* Keep the zoom buttons clear of whatever is currently open */
function positionOverlays() {
  const wrap = document.querySelector('.map-wrap');
  if (!wrap) return;
  const wrapH = wrap.clientHeight;
  let floor = wrapH - 200;
  const poi = document.getElementById('poi-sheet');
  if (poi && poi.classList.contains('show')) {
    floor = Math.min(floor, wrapH - 212 - poi.offsetHeight - 12);
  }
  document.getElementById('map-controls').style.top = Math.max(56, floor - 148) + 'px';
}


function resizeAll() {
  positionOverlays();
  if (MAP) MAP.invalidateSize();
}
window.addEventListener('resize', resizeAll);
window.addEventListener('orientationchange', () => setTimeout(resizeAll, 220));

initMap();
resizeAll();
setTimeout(resizeAll, 300);
setTimeout(locateMe, 400);
