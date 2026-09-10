/* ==========================================================
   APP LOGIC (mode, tabs, vitals)
   ========================================================== */
const iconCheck = icon('circle-check', 20);
const iconTelemetry = icon('activity', 20);


/* ==========================================================
   CLINICAL FIELD GUIDE CONTROLLER & DEEP-LINKING
   ========================================================== */
let currentAlertTopic = 'spo2';

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

function triggerButtonPulse(btn) {
  btn.style.display = 'flex';
  btn.className = 'btn-more-info show';
  triggerSilentHaptic();
}

function evaluateVitals(temp, spo2, hr) {
  const panel = document.getElementById('status-panel');
  const iconContainer = document.getElementById('status-icon');
  const textEl = document.getElementById('status-text');
  const infoBtn = document.getElementById('btn-more-info');
  
  // Convert to numbers to prevent string comparison bugs
  const hasTemp = temp !== undefined && temp !== null && temp !== '--' && temp !== '' && !isNaN(parseFloat(temp));
  const tempNum = hasTemp ? parseFloat(temp) : null;
  spo2 = parseInt(spo2) || 99;
  hr = parseInt(hr) || 80;
  
  if (tempNum !== null && tempNum >= 104.0) {
    currentAlertTopic = 'hyper';
    if (iconContainer) iconContainer.innerHTML = iconTelemetry;
    textEl.innerText = 'High body temperature';
    if (infoBtn) triggerButtonPulse(infoBtn);
  } else if (tempNum !== null && tempNum < 95.0 && tempNum > 0) {
    currentAlertTopic = 'hypo';
    if (iconContainer) iconContainer.innerHTML = iconTelemetry;
    textEl.innerText = 'Low body temperature';
    if (infoBtn) triggerButtonPulse(infoBtn);
  } else if (spo2 < 93) {
    currentAlertTopic = 'spo2';
    if (iconContainer) iconContainer.innerHTML = iconTelemetry;
    textEl.innerText = 'Low oxygen level (SpO2)';
    if (infoBtn) triggerButtonPulse(infoBtn);
  } else if (hr > 140 || hr < 50) {
    currentAlertTopic = 'pulse';
    if (iconContainer) iconContainer.innerHTML = iconTelemetry;
    textEl.innerText = 'Abnormal heart rate';
    if (infoBtn) triggerButtonPulse(infoBtn);
  } else if (tempNum !== null && tempNum >= 100.4) {
    currentAlertTopic = 'hyper';
    if (iconContainer) iconContainer.innerHTML = iconTelemetry;
    textEl.innerText = 'Elevated body temperature';
    if (infoBtn) triggerButtonPulse(infoBtn);
  } else if (spo2 < 95) {
    currentAlertTopic = 'spo2';
    if (iconContainer) iconContainer.innerHTML = iconTelemetry;
    textEl.innerText = 'Mildly decreased oxygen (SpO2)';
    if (infoBtn) triggerButtonPulse(infoBtn);
  } else {
    currentAlertTopic = 'spo2';
    if (iconContainer) iconContainer.innerHTML = iconCheck;
    textEl.innerText = 'All readings in normal range';
    if (infoBtn) {
      infoBtn.style.display = 'none';
      infoBtn.className = 'btn-more-info';
    }
  }
}

function simulateNewReading() {
  const hr = Math.floor(Math.random() * (115 - 72 + 1)) + 72;
  const spo2 = Math.floor(Math.random() * (100 - 88 + 1)) + 88;
  document.getElementById('hr-val').innerText = hr;
  document.getElementById('spo2-val').innerText = spo2;
  
  // Check if temperature was manually entered
  const tempEl = document.getElementById('temp-val');
  const tempVal = tempEl ? tempEl.innerText : '--';
  evaluateVitals(tempVal === '--' ? null : tempVal, parseInt(spo2), hr);
  syncTelehealthVitals();
}

function openManualEntry() {
  document.getElementById('manual-modal').classList.add('show');
  clearManualErrors();
  const getVal = id => { const v = document.getElementById(id).innerText; return v === '--' ? '' : v; };
  const bpText = document.getElementById('bp-val').innerText;
  if (bpText !== '--/--' && bpText.includes('/')) {
    const p = bpText.split('/');
    document.getElementById('manual-bp-sys').value = p[0];
    document.getElementById('manual-bp-dia').value = p[1];
  } else {
    document.getElementById('manual-bp-sys').value = '';
    document.getElementById('manual-bp-dia').value = '';
  }
  document.getElementById('manual-rr').value = getVal('rr-val');
  document.getElementById('manual-hr').value = getVal('hr-val');
  document.getElementById('manual-spo2').value = getVal('spo2-val');
  document.getElementById('manual-temp').value = getVal('temp-val');
}
function closeManualEntry() { document.getElementById('manual-modal').classList.remove('show'); }

/* ---------- Manual entry validation ----------
   Physiologic bounds, not clinical thresholds: they only reject values a
   worker could not have measured (a typo'd SpO2 of 900, a transposed HR).
   Judgement about whether a real reading is concerning stays in
   evaluateVitals(). Mirrors the min/max on the inputs so keyboard entry and
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

  const sys = document.getElementById('manual-bp-sys').value;
  const dia = document.getElementById('manual-bp-dia').value;
  const rr = document.getElementById('manual-rr').value;
  const hr = document.getElementById('manual-hr').value || '--';
  const spo2 = document.getElementById('manual-spo2').value || '--';
  const temp = document.getElementById('manual-temp').value || '--';

  if (sys && dia) {
    document.getElementById('bp-val').innerText = sys + '/' + dia;
    document.getElementById('bp-card').style.display = 'flex';
  } else {
    document.getElementById('bp-val').innerText = '--/--';
    document.getElementById('bp-card').style.display = 'none';
  }
  if (rr && rr !== '--') {
    document.getElementById('rr-val').innerText = rr;
    document.getElementById('rr-card').style.display = 'flex';
  } else {
    document.getElementById('rr-val').innerText = '--';
    document.getElementById('rr-card').style.display = 'none';
  }
  if (temp && temp !== '--' && temp.trim() !== '') {
    document.getElementById('temp-val').innerText = temp;
    const tempCard = document.getElementById('temp-card');
    if (tempCard) tempCard.style.display = 'flex';
  } else {
    document.getElementById('temp-val').innerText = '--';
    const tempCard = document.getElementById('temp-card');
    if (tempCard) tempCard.style.display = 'none';
  }
  document.getElementById('hr-val').innerText = hr;
  document.getElementById('spo2-val').innerText = spo2;

  // Always evaluate, passing hr
  evaluateVitals(temp === '--' ? null : temp, spo2, hr);
  syncTelehealthVitals();
  closeManualEntry();

  // Reveal active vitals view if currently locked
  const lockedView = document.getElementById('scanner-locked-view');
  const activeView = document.getElementById('scanner-active-view');
  if (lockedView && activeView && lockedView.style.display !== 'none') {
    lockedView.style.display = 'none';
    activeView.style.display = 'flex';
  }
}

/* ==========================================================
   TELEHEALTH CONSULTATION CONTROLLER
   ========================================================== */
let thStream = null;
let thTimerInterval = null;
let thTimerSeconds = 0;
let thMicMuted = false;
let thCamOff = false;

function openTelehealthPrompt() {
  document.getElementById('telehealth-perm-modal').classList.add('show');
}

function closeTelehealthPrompt() {
  document.getElementById('telehealth-perm-modal').classList.remove('show');
}

async function grantCameraAndCall(useCamera) {
  closeTelehealthPrompt();
  
  // Sync current vitals to the Telehealth HUD
  syncTelehealthVitals();

  const callModal = document.getElementById('telehealth-call-modal');
  callModal.classList.add('show');
  
  const videoEl = document.getElementById('th-local-video');
  const fallbackEl = document.getElementById('th-pip-fallback');

  if (useCamera && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      thStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoEl && thStream) {
        videoEl.srcObject = thStream;
        videoEl.style.display = 'block';
        if (fallbackEl) fallbackEl.style.display = 'none';
      }
    } catch (err) {
      console.warn('Camera access declined or unavailable, falling back to simulated view:', err);
      if (videoEl) videoEl.style.display = 'none';
      if (fallbackEl) fallbackEl.style.display = 'flex';
    }
  } else {
    if (videoEl) videoEl.style.display = 'none';
    if (fallbackEl) fallbackEl.style.display = 'flex';
  }

  // Start call timer
  thTimerSeconds = 0;
  updateCallTimerDisplay();
  clearInterval(thTimerInterval);
  thTimerInterval = setInterval(() => {
    thTimerSeconds++;
    updateCallTimerDisplay();
  }, 1000);
}

function updateCallTimerDisplay() {
  const m = String(Math.floor(thTimerSeconds / 60)).padStart(2, '0');
  const s = String(thTimerSeconds % 60).padStart(2, '0');
  const timerEl = document.getElementById('th-call-timer');
  if (timerEl) timerEl.innerText = `${m}:${s}`;
}

function syncTelehealthVitals() {
  const hr = document.getElementById('hr-val')?.innerText || '--';
  const spo2 = document.getElementById('spo2-val')?.innerText || '--';
  const temp = document.getElementById('temp-val')?.innerText || '--';
  const bp = document.getElementById('bp-val')?.innerText || '--/--';

  const thHr = document.getElementById('th-val-hr');
  const thSpo2 = document.getElementById('th-val-spo2');
  const thTemp = document.getElementById('th-val-temp');
  const thBp = document.getElementById('th-val-bp');

  if (thHr) thHr.innerText = hr;
  if (thSpo2) thSpo2.innerText = spo2;
  if (thTemp) thTemp.innerText = temp;
  if (thBp) thBp.innerText = bp;
}

function toggleTelehealthMic() {
  thMicMuted = !thMicMuted;
  const btn = document.getElementById('th-btn-mic');
  if (thStream) {
    thStream.getAudioTracks().forEach(t => t.enabled = !thMicMuted);
  }
  if (btn) {
    btn.classList.toggle('active-off', thMicMuted);
    btn.querySelector('span').innerText = thMicMuted ? 'Muted' : 'Mute';
  }
}

function toggleTelehealthCam() {
  thCamOff = !thCamOff;
  const btn = document.getElementById('th-btn-cam');
  const videoEl = document.getElementById('th-local-video');
  const fallbackEl = document.getElementById('th-pip-fallback');

  if (thStream) {
    thStream.getVideoTracks().forEach(t => t.enabled = !thCamOff);
  }
  if (videoEl) videoEl.style.display = thCamOff ? 'none' : (thStream ? 'block' : 'none');
  if (fallbackEl) fallbackEl.style.display = thCamOff || !thStream ? 'flex' : 'none';

  if (btn) {
    btn.classList.toggle('active-off', thCamOff);
    btn.querySelector('span').innerText = thCamOff ? 'Cam Off' : 'Camera';
  }
}

function sendVitalsSnapshot() {
  syncTelehealthVitals();
  const hudHeader = document.querySelector('.th-hud-header span');
  if (hudHeader) {
    const originalText = hudHeader.innerText;
    hudHeader.innerHTML = icon('check', 13) + ' <span>Vitals Snapshot Transmitted to Dr. Rivera</span>';
    hudHeader.style.color = '#4ade80';
    setTimeout(() => {
      hudHeader.innerText = originalText;
      hudHeader.style.color = '#38bdf8';
    }, 2400);
  }
}

function endTelehealthCall() {
  clearInterval(thTimerInterval);
  thTimerInterval = null;

  if (thStream) {
    thStream.getTracks().forEach(track => track.stop());
    thStream = null;
  }
  const videoEl = document.getElementById('th-local-video');
  if (videoEl) videoEl.srcObject = null;

  const callModal = document.getElementById('telehealth-call-modal');
  if (callModal) callModal.classList.remove('show');

  // Reset controls state
  thMicMuted = false;
  thCamOff = false;
  const micBtn = document.getElementById('th-btn-mic');
  const camBtn = document.getElementById('th-btn-cam');
  if (micBtn) {
    micBtn.classList.remove('active-off');
    micBtn.querySelector('span').innerText = 'Mute';
  }
  if (camBtn) {
    camBtn.classList.remove('active-off');
    camBtn.querySelector('span').innerText = 'Camera';
  }
}
