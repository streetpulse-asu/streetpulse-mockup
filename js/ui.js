function toggleDropdown() {
  document.getElementById('mode-dropdown').classList.toggle('show');
}
document.addEventListener('click', e => {
  if (!e.target.closest('.mode-selector')) document.getElementById('mode-dropdown').classList.remove('show');
});

function selectMode(mode) {
  document.getElementById('mode-dropdown').classList.remove('show');
  if (mode === 'Worker') {
    document.getElementById('bt-modal').classList.add('show');
  } else {
    document.getElementById('current-mode-text').innerText = 'Individual';
    document.getElementById('bottom-nav').classList.remove('show');
    switchTab('map', null);
    setTimeout(resizeAll, 60);
  }
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
    document.getElementById('current-mode-text').innerText = 'Worker';
    document.getElementById('bottom-nav').classList.add('show');
    switchTab('scanner', document.querySelectorAll('.nav-item')[1]);
    setTimeout(resizeAll, 60);
  }, 950);
}
function cancelPairing() { document.getElementById('bt-modal').classList.remove('show'); }

function switchTab(tabId, element) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  if (element) element.classList.add('active');
  if (tabId === 'map') setTimeout(resizeAll, 40);
}

