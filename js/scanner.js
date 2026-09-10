/* ==========================================================
   APP LOGIC (mode, tabs, vitals)
   ========================================================== */
const iconCheck = icon('circle-check', 20);
const iconTelemetry = icon('activity', 20);



/* ==========================================================
   ENCOUNTER RECORD
   Readings used to live in the DOM, which meant a number on screen carried
   no history: no capture time, no idea whether a probe or a person put it
   there. Everything now goes through VITALS, and the board is rendered from
   it — so "75 bpm" is always accompanied by when it was taken and from what.
   ========================================================== */

const ENCOUNTER = {
  id: '0417',
  worker: 'A. Reyes',
  badge: '#4471',
  location: '12th Ave & W Jackson St',
  startedAt: Date.now(),
  online: false
};

/* value, when it was taken, and where it came from */
const VITALS = {
  hr:   { v: null, at: null, src: null },
  spo2: { v: null, at: null, src: null },
  temp: { v: null, at: null, src: null },
  bp:   { v: null, at: null, src: null },
  rr:   { v: null, at: null, src: null }
};

const LOG = [];

function clockOf(ts) {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function minutesSince(ts) { return Math.floor((Date.now() - ts) / 60000); }

/* A reading is "live" for its first minute, then starts showing its age —
   staleness matters more than precision when someone is deciding whether to
   trust the number in front of them. */
function ageLabel(entry) {
  if (!entry.at) return 'Not taken';
  const mins = minutesSince(entry.at);
  const src = entry.src === 'probe' ? 'Probe' : 'Manual';
  if (mins < 1) return src + ' · live';
  return src + ' · ' + mins + ' min ago';
}

function isStale(entry) { return entry.at !== null && minutesSince(entry.at) >= 3; }

function logEvent(text) {
  LOG.unshift({ at: Date.now(), text: text });
  renderLog();
}

function renderLog() {
  const box = document.getElementById('log-rows');
  if (!box) return;
  // The whole encounter, not a window onto it. This used to render only the
  // six most recent events, so older entries silently vanished and the log
  // had nothing to scroll through - it was capped, not scrollable.
  box.innerHTML = LOG.map(e =>
    '<div class="log-row">' +
      '<span class="log-t num">' + clockOf(e.at) + '</span>' +
      '<span class="log-d">' + e.text + '</span>' +
    '</div>').join('');
}

function recordVital(key, value, source) {
  const entry = VITALS[key];
  if (!entry) return;
  const clean = (value === '' || value === null || value === undefined || value === '--') ? null : value;
  if (clean === null) { entry.v = null; entry.at = null; entry.src = null; return; }
  entry.v = clean;
  entry.at = Date.now();
  entry.src = source;
}

const VITAL_UI = {
  hr:   { val: 'hr-val',   age: 'hr-age',   chan: 'chan-hr'   },
  spo2: { val: 'spo2-val', age: 'spo2-age', chan: 'chan-spo2' },
  temp: { val: 'temp-val', age: 'temp-age', chan: 'chan-temp' },
  bp:   { val: 'bp-val',   age: 'bp-age',   chan: 'chan-bp'   },
  rr:   { val: 'rr-val',   age: 'rr-age',   chan: 'chan-rr'   }
};

function renderVitals() {
  Object.keys(VITAL_UI).forEach(key => {
    const ui = VITAL_UI[key], entry = VITALS[key];
    const valEl = document.getElementById(ui.val);
    const ageEl = document.getElementById(ui.age);
    const chanEl = document.getElementById(ui.chan);
    if (valEl) valEl.innerText = entry.v === null ? (key === 'bp' ? '—/—' : '—') : entry.v;
    if (ageEl) ageEl.innerText = ageLabel(entry);
    if (chanEl) {
      chanEl.classList.toggle('empty', entry.v === null);
      chanEl.classList.toggle('stale', isStale(entry));
    }
  });
  renderSync();
}

function renderSync() {
  const bar = document.getElementById('sync-bar');
  const text = document.getElementById('sync-text');
  if (!bar || !text) return;
  const anyReading = Object.keys(VITALS).some(k => VITALS[k].v !== null);
  bar.hidden = !anyReading;
  bar.classList.toggle('synced', ENCOUNTER.online);
  text.innerText = ENCOUNTER.online
    ? 'Synced to the encounter record'
    : 'Offline - encounter queued locally, syncs when signal returns';
}

function renderEncounter() {
  const el = document.getElementById('enc-elapsed');
  if (el) el.innerText = 'Open ' + Math.max(0, minutesSince(ENCOUNTER.startedAt)) + ' min';
  const idEl = document.getElementById('enc-id');
  if (idEl) idEl.innerText = ENCOUNTER.id;
  const whereEl = document.getElementById('enc-where');
  if (whereEl) whereEl.innerText = ENCOUNTER.location;
  const wEl = document.getElementById('log-worker');
  if (wEl) wEl.innerText = ENCOUNTER.worker + ' · ' + ENCOUNTER.badge;
}

/* Ages and the elapsed clock have to keep moving; a frozen "3 min ago" is
   worse than no timestamp at all. */
function startEncounter() {
  ENCOUNTER.startedAt = Date.now();
  LOG.length = 0;
  logEvent('Verbal consent recorded · encounter opened');
  renderEncounter();
  renderVitals();
  clearInterval(startEncounter._tick);
  startEncounter._tick = setInterval(() => { renderEncounter(); renderVitals(); }, 15000);
}

/* ==========================================================
   CLINICAL FIELD GUIDE CONTROLLER & DEEP-LINKING
   ========================================================== */
function openFieldGuide(topic) {
  const modal = document.getElementById('guide-modal');
  if (!modal) return;
  modal.classList.add('show');
  
  // Clear any existing section highlights
  document.querySelectorAll('.guide-section').forEach(sec => sec.classList.remove('highlight'));
  
  if (topic) {
    let targetId = 'guide-sec-' + topic;
    if (topic === 'temp' || topic === 'high' || topic === 'fever') targetId = 'guide-sec-hyper';
    if (topic === 'low' || topic === 'hypoxia') targetId = 'guide-sec-spo2';
    if (topic === 'hr' || topic === 'heart') targetId = 'guide-sec-pulse';
    if (topic === 'narcan') targetId = 'guide-sec-overdose';
    scrollGuideTo(targetId, true);
  } else {
    const body = document.getElementById('guide-body');
    if (body) body.scrollTop = 0;
  }
}

function closeFieldGuide() {
  const modal = document.getElementById('guide-modal');
  if (modal) modal.classList.remove('show');
}

function scrollGuideTo(elementId, animateHighlight) {
  const target = document.getElementById(elementId);
  const container = document.getElementById('guide-body');
  if (!target || !container) return;
  
  setTimeout(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (animateHighlight) {
      target.classList.add('highlight');
      setTimeout(() => target.classList.remove('highlight'), 2600);
    }
  }, 70);
}


/* ==========================================================
   SILENT NATIVE HAPTIC TRIGGER (iOS & Android)
   Uses native iOS switch mechanics and Vibration API (100% silent)
   ========================================================== */
function triggerSilentHaptic() {
  // 1. Android / standard hardware vibration API
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([90, 1110, 90, 1110, 90]);
  }

  // 2. iOS Native Switch UI Haptic Trigger
  try {
    let switchEl = document.getElementById('ios-haptic-switch');
    if (!switchEl) {
      switchEl = document.createElement('input');
      switchEl.type = 'checkbox';
      switchEl.setAttribute('role', 'switch');
      switchEl.id = 'ios-haptic-switch';
      switchEl.style.position = 'fixed';
      switchEl.style.opacity = '0';
      switchEl.style.pointerEvents = 'none';
      switchEl.style.top = '-9999px';
      document.body.appendChild(switchEl);
    }
    switchEl.checked = !switchEl.checked;
  } catch (e) {}
}

/* Readings are simulated for the mockup. The app records and displays them —
   it does not interpret them, flag them, or decide what they mean. Judgement
   about a reading belongs to the worker on scene and the physician. */
function simulateNewReading() {
  const hr = Math.floor(Math.random() * (115 - 72 + 1)) + 72;
  const spo2 = Math.floor(Math.random() * (100 - 88 + 1)) + 88;

  recordVital('hr', hr, 'probe');
  recordVital('spo2', spo2, 'probe');
  renderVitals();
  logEvent('HR ' + hr + ', SpO₂ ' + spo2 + ' captured from probe');

  triggerSilentHaptic();
  syncTelehealthVitals();
}

function openManualEntry() {
  document.getElementById('manual-modal').classList.add('show');
  clearManualErrors();
  const bp = VITALS.bp.v;
  const parts = (bp && bp.includes('/')) ? bp.split('/') : ['', ''];
  document.getElementById('manual-bp-sys').value = parts[0];
  document.getElementById('manual-bp-dia').value = parts[1];
  document.getElementById('manual-rr').value = VITALS.rr.v || '';
  document.getElementById('manual-hr').value = VITALS.hr.v || '';
  document.getElementById('manual-spo2').value = VITALS.spo2.v || '';
  document.getElementById('manual-temp').value = VITALS.temp.v || '';
}
function closeManualEntry() { document.getElementById('manual-modal').classList.remove('show'); }

/* ---------- Manual entry validation ----------
   Physiologic bounds, not clinical thresholds: they only reject values a
   worker could not have measured (a typo'd SpO2 of 900, a transposed HR).
   Nothing here interprets a reading: a value inside these bounds is recorded
   exactly as given. Mirrors the min/max on the inputs so keyboard entry and
   paste are both covered. */
const MANUAL_FIELDS = [
  { id: 'manual-bp-sys', label: 'Systolic BP', min: 40,  max: 300, required: false, pairs: 'manual-bp-dia' },
  { id: 'manual-bp-dia', label: 'Diastolic BP', min: 20, max: 200, required: false, pairs: 'manual-bp-sys' },
  { id: 'manual-rr',     label: 'Respiratory rate', min: 4,  max: 80,  required: false },
  { id: 'manual-hr',     label: 'Heart rate', min: 20, max: 300, required: true },
  { id: 'manual-spo2',   label: 'SpO\u2082', min: 50, max: 100, required: true },
  { id: 'manual-temp',   label: 'Temperature', min: 80, max: 115, required: false }
];

function showManualError(msg, focusId) {
  const box = document.getElementById('manual-error');
  box.textContent = msg;
  box.hidden = false;
  const el = focusId && document.getElementById(focusId);
  if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); }
}

function clearManualErrors() {
  const box = document.getElementById('manual-error');
  box.hidden = true;
  box.textContent = '';
  MANUAL_FIELDS.forEach(f => document.getElementById(f.id).removeAttribute('aria-invalid'));
}

function validateManualEntry() {
  clearManualErrors();
  for (const f of MANUAL_FIELDS) {
    const raw = document.getElementById(f.id).value.trim();
    if (raw === '') {
      if (f.required) { showManualError(f.label + ' is required.', f.id); return false; }
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) { showManualError(f.label + ' must be a number.', f.id); return false; }
    if (n < f.min || n > f.max) {
      showManualError(f.label + ' must be between ' + f.min + ' and ' + f.max + '.', f.id);
      return false;
    }
  }
  const sys = document.getElementById('manual-bp-sys').value.trim();
  const dia = document.getElementById('manual-bp-dia').value.trim();
  if ((sys === '') !== (dia === '')) {
    showManualError('Enter both systolic and diastolic, or neither.', sys === '' ? 'manual-bp-sys' : 'manual-bp-dia');
    return false;
  }
  if (sys !== '' && dia !== '' && Number(dia) >= Number(sys)) {
    showManualError('Diastolic must be lower than systolic.', 'manual-bp-dia');
    return false;
  }
  return true;
}

function saveManualEntry() {
  if (!validateManualEntry()) return;

  const get = id => document.getElementById(id).value.trim();
  const sys = get('manual-bp-sys'), dia = get('manual-bp-dia');
  const entered = [];

  const set = (key, value, label) => {
    const before = VITALS[key].v;
    recordVital(key, value, 'manual');
    if (VITALS[key].v !== null && VITALS[key].v !== before) entered.push(label + ' ' + VITALS[key].v);
  };

  set('bp', (sys && dia) ? sys + '/' + dia : null, 'BP');
  set('rr', get('manual-rr'), 'RR');
  set('hr', get('manual-hr'), 'HR');
  set('spo2', get('manual-spo2'), 'SpO₂');
  set('temp', get('manual-temp'), 'Temp');

  renderVitals();
  if (entered.length) logEvent(entered.join(', ') + ' entered manually by ' + ENCOUNTER.worker);

  syncTelehealthVitals();
  closeManualEntry();

  const lockedView = document.getElementById('scanner-locked-view');
  const activeView = document.getElementById('scanner-active-view');
  if (lockedView && activeView && lockedView.style.display !== 'none') {
    lockedView.style.display = 'none';
    activeView.style.display = 'flex';
    const scannerTab = document.getElementById('tab-scanner');
    if (scannerTab) scannerTab.classList.add('encounter-open');
    startEncounter();
  }
}

/* ==========================================================
   TELEHEALTH CONSULTATION CONTROLLER
   ========================================================== */
let thStream = null;
let thTimerInterval = null;
let thTimerSeconds = 0;
let thMicMuted = false;

function openTelehealthPrompt() {
  document.getElementById('telehealth-perm-modal').classList.add('show');
}

function closeTelehealthPrompt() {
  document.getElementById('telehealth-perm-modal').classList.remove('show');
}

/* Voice consultation. Requests audio only — there is no camera in this flow,
   so there is nothing to fall back to and no simulated-video path. If the mic
   is refused the call still connects; the physician is reading the shared
   vitals, and Mute simply has no track to toggle. */
async function startTelehealthCall() {
  closeTelehealthPrompt();
  syncTelehealthVitals();

  document.getElementById('telehealth-call-modal').classList.add('show');

  // The clock starts with the screen, before the microphone is requested.
  // getUserMedia puts up an OS permission sheet that can sit there for as long
  // as the worker takes to answer it, and a call screen frozen at 00:00 behind
  // that sheet reads as a dead button.
  thTimerSeconds = 0;
  updateCallTimerDisplay();
  clearInterval(thTimerInterval);
  thTimerInterval = setInterval(() => {
    thTimerSeconds++;
    updateCallTimerDisplay();
  }, 1000);

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      thStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.warn('Microphone unavailable; continuing without a live track:', err);
      thStream = null;
    }
  }
}

function updateCallTimerDisplay() {
  const m = String(Math.floor(thTimerSeconds / 60)).padStart(2, '0');
  const s = String(thTimerSeconds % 60).padStart(2, '0');
  const timerEl = document.getElementById('th-call-timer');
  if (timerEl) timerEl.innerText = `${m}:${s}`;
}

/* Placeholders match the board's em dash rather than the old double hyphen,
   so an untaken vital reads the same in the call as it does on the screen the
   worker just came from. */
function syncTelehealthVitals() {
  const show = key => VITALS[key].v === null ? '\u2014' : VITALS[key].v;
  const put = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
  put('th-val-hr', show('hr'));
  put('th-val-spo2', show('spo2'));
  put('th-val-temp', show('temp'));
  put('th-val-bp', VITALS.bp.v === null ? '\u2014/\u2014' : VITALS.bp.v);
}

function toggleTelehealthMic() {
  thMicMuted = !thMicMuted;
  const btn = document.getElementById('th-btn-mic');
  if (thStream) {
    thStream.getAudioTracks().forEach(t => t.enabled = !thMicMuted);
  }
  if (btn) {
    btn.classList.toggle('active-off', thMicMuted);
    btn.querySelector('.th-ctrl-label').innerText = thMicMuted ? 'Muted' : 'Mute';
  }
}

function sendVitalsSnapshot() {
  syncTelehealthVitals();
  const title = document.querySelector('.th-hud-title');
  const header = document.querySelector('.th-hud-header');
  if (!title || !header) return;

  const original = title.innerText;
  title.innerText = 'Vitals snapshot sent to Dr. Rivera';
  header.style.color = 'var(--call-live)';
  setTimeout(() => {
    title.innerText = original;
    header.style.color = '';
  }, 2400);
}

function endTelehealthCall() {
  clearInterval(thTimerInterval);
  thTimerInterval = null;

  // the photo sheet may still be open, and its camera track must not outlive
  // the call it belongs to
  closePhotoCapture();
  thPhotoCount = 0;
  const chip = document.getElementById('th-sent-chip');
  if (chip) chip.hidden = true;

  if (thStream) {
    thStream.getTracks().forEach(track => track.stop());
    thStream = null;
  }

  const callModal = document.getElementById('telehealth-call-modal');
  if (callModal) callModal.classList.remove('show');

  thMicMuted = false;
  const micBtn = document.getElementById('th-btn-mic');
  if (micBtn) {
    micBtn.classList.remove('active-off');
    micBtn.querySelector('.th-ctrl-label').innerText = 'Mute';
  }
}

/* ==========================================================
   TELEHEALTH — SEND A PHOTO
   A still, not a video feed: the camera is opened only for as long as it
   takes to frame and take one shot, the worker reviews it before it goes,
   and the track is stopped the moment the sheet closes. Nothing is written
   to disk — the image lives in a canvas data URL for the length of the call.
   ========================================================== */

let thPhotoStream = null;
let thPhotoData = null;
let thPhotoCount = 0;

function photoStep(name) {
  ['ask', 'view', 'review'].forEach(s => {
    const el = document.getElementById('th-photo-' + s);
    if (el) el.hidden = (s !== name);
  });
}

function photoError(msg) {
  const el = document.getElementById('th-photo-error');
  if (!el) return;
  el.hidden = !msg;
  el.textContent = msg || '';
}

function openPhotoCapture() {
  const sheet = document.getElementById('th-photo');
  if (!sheet) return;
  photoError('');
  photoStep('ask');
  sheet.hidden = false;
}

/* Releasing the camera is not optional housekeeping: a preview left running
   keeps the device's camera indicator lit, which in a street encounter looks
   like covert recording. */
function stopPhotoCamera() {
  if (thPhotoStream) {
    thPhotoStream.getTracks().forEach(t => t.stop());
    thPhotoStream = null;
  }
  const v = document.getElementById('th-photo-preview');
  if (v) v.srcObject = null;
}

function closePhotoCapture() {
  stopPhotoCamera();
  thPhotoData = null;
  const sheet = document.getElementById('th-photo');
  if (sheet) sheet.hidden = true;
  photoError('');
}

async function startPhotoCamera() {
  photoError('');
  const video = document.getElementById('th-photo-preview');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    photoError('This device has no camera available to the app.');
    return;
  }

  stopPhotoCamera();
  photoStep('view');

  try {
    thPhotoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }, audio: false
    });
  } catch (err) {
    photoStep('ask');
    photoError(err && err.name === 'NotAllowedError'
      ? 'Camera access was declined. The consultation continues without a photo.'
      : 'The camera could not be opened. The consultation continues without a photo.');
    return;
  }

  if (video) {
    video.srcObject = thPhotoStream;
    try { await video.play(); } catch (e) { /* autoplay attribute covers this */ }
  }
}

function takePhoto() {
  const video = document.getElementById('th-photo-preview');
  const canvas = document.getElementById('th-photo-canvas');
  const still = document.getElementById('th-photo-still');
  if (!video || !canvas || !video.videoWidth) {
    photoError('The camera is still starting up — try again in a moment.');
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  thPhotoData = canvas.toDataURL('image/jpeg', 0.85);
  if (still) still.src = thPhotoData;

  // the shot is taken, so the camera goes off before the worker reviews it
  stopPhotoCamera();
  photoStep('review');
}

function sendPhoto() {
  if (!thPhotoData) { photoError('Take a photo first.'); return; }
  thPhotoCount++;

  const chip = document.getElementById('th-sent-chip');
  const chipText = document.getElementById('th-sent-text');
  if (chip) chip.hidden = false;
  if (chipText) chipText.innerText = thPhotoCount === 1
    ? 'Photo sent to Dr. Rivera'
    : thPhotoCount + ' photos sent to Dr. Rivera';

  if (typeof logEvent === 'function') {
    logEvent('Photo sent to Dr. Rivera during consultation');
  }
  closePhotoCapture();
}
