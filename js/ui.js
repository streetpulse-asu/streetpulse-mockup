let isDeviceConnected = false;

function openPairModal() {
  document.getElementById('bt-modal').classList.add('show');
}

function cancelPairing() {
  document.getElementById('bt-modal').classList.remove('show');
}

function simulatePairing() {
  const btnText = document.getElementById('pair-text');
  const loader = document.getElementById('pair-loader');
  const pairBtn = document.getElementById('pair-btn');
  btnText.innerText = 'Pairing…';
  loader.style.display = 'block';
  pairBtn.disabled = true;

  setTimeout(() => {
    document.getElementById('bt-modal').classList.remove('show');
    btnText.innerText = 'Search for device';
    loader.style.display = 'none';
    pairBtn.disabled = false;

    setDeviceConnected(true);
    switchTab('scanner');
  }, 950);
}

function setDeviceConnected(connected) {
  // switchTab() calls this on every visit to the scanner to sync the view, so
  // it runs far more often than the state changes. Showing the right view is
  // idempotent; opening an encounter and writing to the log is not, which is
  // why the probe used to appear in the log twice after pairing.
  const changed = isDeviceConnected !== connected;
  isDeviceConnected = connected;
  const lockedView = document.getElementById('scanner-locked-view');
  const activeView = document.getElementById('scanner-active-view');

  const scannerTab = document.getElementById('tab-scanner');
  if (scannerTab) scannerTab.classList.toggle('encounter-open', connected);

  if (connected) {
    if (lockedView) lockedView.style.display = 'none';
    if (activeView) activeView.style.display = 'flex';
    if (changed) {
      // linking the probe is what opens the encounter record
      if (typeof startEncounter === 'function') startEncounter();
      if (typeof logEvent === 'function') logEvent('Probe SP-4471 linked');
    }
  } else {
    if (lockedView) lockedView.style.display = 'flex';
    if (activeView) activeView.style.display = 'none';
    if (changed && typeof startEncounter === 'function') {
      clearInterval(startEncounter._tick);
      startEncounter._tick = null;
    }
  }
  setTimeout(resizeAll, 60);
}

function disconnectDevice() {
  if (confirm('Disconnect StreetPulse telemetry sensor probe?')) {
    setDeviceConnected(false);
  }
}

function switchTab(tabId, element) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('active');
    n.setAttribute('aria-selected', 'false');
  });

  const targetTab = document.getElementById('tab-' + tabId);
  if (targetTab) targetTab.classList.add('active');
  const targetNav = element || document.querySelector(`.nav-item[onclick*="${tabId}"]`);
  if (targetNav) {
    targetNav.classList.add('active');
    targetNav.setAttribute('aria-selected', 'true');
  }

  const container = document.querySelector('.phone-container');
  if (container) {
    container.classList.toggle('tab-map-active', tabId === 'map');
  }

  // Only show map filter button when map tab is active
  const filterBtn = document.getElementById('btn-open-filter');
  if (filterBtn) {
    filterBtn.style.display = (tabId === 'map') ? 'inline-flex' : 'none';
  }

  // If opening scanner, ensure correct locked vs active view is shown
  if (tabId === 'scanner') {
    setDeviceConnected(isDeviceConnected);
  }

  if (tabId === 'map') setTimeout(resizeAll, 40);
}




/* The version shown in Settings is read from the cache-busting query on the
   script tag rather than typed into the markup, so it can never disagree with
   the bundle actually running. */
function renderAppVersion() {
  const el = document.getElementById('settings-version');
  if (!el) return;
  const src = document.querySelector('script[src*="js/ui.js"]');
  const m = src && (src.getAttribute('src') || '').match(/[?&]v=(v?[\w.]+)/);
  el.innerText = m ? m[1] : '—';
}

document.addEventListener('DOMContentLoaded', renderAppVersion);
