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
      // A linked probe is streaming, so it takes its first reading straight
      // away. Leaving the board on dashes after pairing made a working sensor
      // look dead — and carried through to the telehealth call, where the
      // shared-telemetry panel was nothing but placeholders.
      if (typeof simulateNewReading === 'function') simulateNewReading();
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

/* ==========================================================
   LAYOUT MEASUREMENT
   The bottom nav and the carousel drawer were both positioned against
   hardcoded pixel guesses. On a phone with a home indicator the nav is
   roughly 95px tall, not the 58px the drawer assumed, so the bottom of the
   drawer sat underneath it - which is what got cut off on the home screen.
   Both are measured instead, and the map controls ride on top of whatever
   the drawer currently is, so they rise and fall as it opens and collapses.
   ========================================================== */

/* The real visible area, which is not the same as the screen and not the same
   between two iPhones. Safari's URL bar collapses as you scroll, standalone
   has no URL bar at all, and every model has a different inset for its notch
   or island. visualViewport reports what is actually visible right now, so
   the layout is measured rather than guessed from a device list. */
function measureViewport() {
  const shell = document.querySelector('.phone-container');
  if (!shell) return;
  const vv = window.visualViewport;
  const h = Math.round(vv ? vv.height : window.innerHeight);
  if (h > 0) shell.style.setProperty('--app-h', h + 'px');
}

function measureChrome() {
  const shell = document.querySelector('.phone-container');
  const nav = document.querySelector('.bottom-nav');
  const drawer = document.getElementById('bottom-carousel-drawer');
  if (!shell) return;

  if (nav) {
    const h = Math.round(nav.getBoundingClientRect().height);
    if (h > 0) shell.style.setProperty('--nav-h', h + 'px');
  }
  if (drawer) {
    // a hidden drawer still has a height, so the controls would float above
    // nothing; treat it as zero so they drop to the nav
    const hidden = drawer.classList.contains('hidden');
    const h = hidden ? 0 : Math.round(drawer.getBoundingClientRect().height);
    shell.style.setProperty('--drawer-h', h + 'px');
  }
}

(function watchChrome() {
  const start = () => {
    measureViewport();
    measureChrome();
    const targets = [document.querySelector('.bottom-nav'),
                     document.getElementById('bottom-carousel-drawer')].filter(Boolean);
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => measureChrome());
      targets.forEach(t => ro.observe(t));
    }
    // collapsing the drawer animates its height, so keep measuring through it
    const drawer = document.getElementById('bottom-carousel-drawer');
    if (drawer) {
      drawer.addEventListener('transitionend', measureChrome);
      if (typeof MutationObserver === 'function') {
        new MutationObserver(measureChrome)
          .observe(drawer, { attributes: true, attributeFilter: ['class'] });
      }
    }
    const remeasure = () => { measureViewport(); measureChrome(); };
    window.addEventListener('resize', remeasure);
    window.addEventListener('orientationchange', () => setTimeout(remeasure, 250));
    if (window.visualViewport) {
      // fires as Safari's URL bar collapses and expands
      window.visualViewport.addEventListener('resize', remeasure);
      window.visualViewport.addEventListener('scroll', remeasure);
    }
    // iOS settles safe-area insets a beat after first paint in standalone
    [150, 500, 1200].forEach(ms => setTimeout(remeasure, ms));

    /* Coming back from Maps or a phone call, iOS restores the web view
       without repainting it. Leaflet in particular renders nothing until it
       is told its size again, which is the blank screen on return. Re-measure
       and revive the map whenever the app becomes visible. */
    const revive = () => {
      if (document.visibilityState === 'hidden') return;
      remeasure();
      if (typeof MAP !== 'undefined' && MAP && typeof MAP.invalidateSize === 'function') {
        try { MAP.invalidateSize(true); } catch (e) { /* map not up yet */ }
      }
      if (typeof renderIcons === 'function') renderIcons();
    };
    document.addEventListener('visibilitychange', revive);
    window.addEventListener('pageshow', revive);
    window.addEventListener('focus', revive);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
