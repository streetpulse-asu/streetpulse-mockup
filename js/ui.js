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
  isDeviceConnected = connected;
  const lockedView = document.getElementById('scanner-locked-view');
  const activeView = document.getElementById('scanner-active-view');

  if (connected) {
    if (lockedView) lockedView.style.display = 'none';
    if (activeView) activeView.style.display = 'flex';
  } else {
    if (lockedView) lockedView.style.display = 'flex';
    if (activeView) activeView.style.display = 'none';
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
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const targetTab = document.getElementById('tab-' + tabId);
  if (targetTab) targetTab.classList.add('active');
  const targetNav = element || document.querySelector(`.nav-item[onclick*="${tabId}"]`);
  if (targetNav) targetNav.classList.add('active');

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


