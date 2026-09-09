/* ==========================================================
   APP LOGIC (mode, tabs, vitals)
   ========================================================== */
const iconCheck = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
const iconWarning = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
const iconAlert = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';


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

function triggerButtonPulse(btn, modeClass) {
  btn.style.display = 'flex';
  btn.className = 'btn-more-info ' + modeClass;
  // Trigger animation replay by forcing a browser reflow
  btn.style.animation = 'none';
  btn.offsetHeight;
  btn.style.animation = '';

  // Trigger silent haptic feedback
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
    panel.className = 'status-panel alert'; iconContainer.innerHTML = iconAlert;
    textEl.innerText = 'Critical: High body temperature';
    if (infoBtn) triggerButtonPulse(infoBtn, 'alert-mode');
  } else if (tempNum !== null && tempNum < 95.0 && tempNum > 0) {
    currentAlertTopic = 'hypo';
    panel.className = 'status-panel alert'; iconContainer.innerHTML = iconAlert;
    textEl.innerText = 'Critical: Low body temperature';
    if (infoBtn) triggerButtonPulse(infoBtn, 'alert-mode');
  } else if (spo2 < 93) {
    currentAlertTopic = 'spo2';
    panel.className = 'status-panel alert'; iconContainer.innerHTML = iconAlert;
    textEl.innerText = 'Critical: Low oxygen level (SpO2)';
    if (infoBtn) triggerButtonPulse(infoBtn, 'alert-mode');
  } else if (hr > 140 || hr < 50) {
    currentAlertTopic = 'pulse';
    panel.className = 'status-panel alert'; iconContainer.innerHTML = iconAlert;
    textEl.innerText = 'Critical: Abnormal heart rate';
    if (infoBtn) triggerButtonPulse(infoBtn, 'alert-mode');
  } else if (tempNum !== null && tempNum >= 100.4) {
    currentAlertTopic = 'hyper';
    panel.className = 'status-panel warning'; iconContainer.innerHTML = iconWarning;
    textEl.innerText = 'Warning: Elevated body temperature';
    if (infoBtn) triggerButtonPulse(infoBtn, 'warning-mode');
  } else if (spo2 < 95) {
    currentAlertTopic = 'spo2';
    panel.className = 'status-panel warning'; iconContainer.innerHTML = iconWarning;
    textEl.innerText = 'Warning: Mildly decreased oxygen (SpO2)';
    if (infoBtn) triggerButtonPulse(infoBtn, 'warning-mode');
  } else {
    currentAlertTopic = 'spo2';
    panel.className = 'status-panel normal'; iconContainer.innerHTML = iconCheck;
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
}

function openManualEntry() {
  document.getElementById('manual-modal').classList.add('show');
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

function saveManualEntry() {
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
  closeManualEntry();
}

/* ---------- Boot ---------- */
