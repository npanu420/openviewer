(() => {
  const showcase = document.querySelector('.layout-showcase');
  const dock = document.querySelector('.interactive-dock');
  const content = dock.querySelector('.dock-content');
  const tablePanel = dock.querySelector('.dock-standings');
  const controlPanel = dock.querySelector('.dock-control');
  const tabs = [...dock.querySelectorAll('[data-dock-tab]')];
  const auto = document.querySelector('[data-dock-auto]');
  const widthHandle = document.querySelector('.dock-width-handle');
  const heightHandle = dock.querySelector('.dock-height-handle');
  const compact = matchMedia('(max-width: 650px)');
  // Fixed replay data transcribed from the supplied Monza lap-42 screenshot, not a live feed.
  const rows = [
    ['NOR','LAP 42','LAP 42','M',41,'#ff8700'],['PIA','+4.285','+4.285','M',41,'#ff8700'],
    ['VER','+14.157','+9.849','H',34,'#3671c6'],['LEC','+34.529','+20.096','H',37,'#e8002d'],
    ['RUS','+35.928','+1.395','H',14,'#27f4d2'],['OCO','+46.066','+10.132','M',41,'#b6babd'],
    ['HAM','+46.383','+0.317','H',3,'#e8002d'],['STR','+47.727','+1.344','H',42,'#229971'],
    ['ALB','+33.139','—','H',41,'#64c4ff'],['BEA','+57.119','+23.982','H',40,'#b6babd'],
    ['ANT','+58.831','+1.712','H',14,'#27f4d2'],['BOR','+59.458','+0.627','H',21,'#52e252'],
    ['GAS','+59.422','+0.737','H',40,'#36c5ef'],['HAD','+66.335','+6.910','M',41,'#6692ff'],
    ['SAI','+67.709','+1.374','H',11,'#64c4ff'],['TSU','+70.183','+2.368','H',40,'#3671c6'],
    ['LAW','+71.312','+1.129','H',25,'#6692ff'],['COL','+75.383','+4.071','H',10,'#36c5ef'],
    ['ALO','OUT','—','H',5,'#229971'],['HUL','OUT','—','M',0,'#52e252']
  ];
  const body = dock.querySelector('tbody');
  rows.forEach(([driver, gap, interval, compound, stint, colour], index) => {
    const row = document.createElement('tr');
    if (gap === 'OUT') row.className = 'driver-retired';
    const values = [String(index + 1), driver, gap, interval, `${compound} ${stint}`];
    values.forEach((value, column) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      if (column === 1) { cell.className = 'dock-driver'; cell.style.setProperty('--team-colour', colour); }
      if (column === 3) cell.className = 'dock-interval';
      if (column === 4) { cell.className = 'dock-tyre'; cell.dataset.compound = compound; }
      row.append(cell);
    });
    body.append(row);
  });
  [
    ['TURN 5 INCIDENT INVOLVING CARS 55 (SAI) AND 87 (BEA) NOTED', 'L42'],
    ['CLEAR IN TRACK SECTOR 6', 'L41'],['YELLOW IN TRACK SECTOR 6', 'L41'],
    ['DOUBLE YELLOW IN TRACK SECTOR 6', 'L41'],['BLUE FLAG FOR CAR 43 (COL)', 'L40']
  ].forEach(([message, lap]) => {
    const p = document.createElement('p');p.textContent = `${message} (${lap})`;controlPanel.append(p);
  });

  // Same row-height and split-feed algorithm as LiveTimingBody.tsx in the app.
  function dockLayout(available, count, headRow) {
    const n = Math.max(1, count);
    for (const rowHeight of [36, 32, 30]) {
      if (available - headRow - n * rowHeight >= 200) return { rowHeight, split: true };
    }
    return { rowHeight: Math.max(28, Math.min(40, Math.floor((available - headRow) / n))), split: false };
  }
  let activePanel = 'standings';
  let split = false;
  function renderPanels() {
    tablePanel.hidden = !split && activePanel !== 'standings';
    controlPanel.hidden = !split && activePanel !== 'control';
    dock.classList.toggle('dock-split', split);
    tabs.forEach(tab => {
      const selected = tab.dataset.dockTab === activePanel;
      tab.setAttribute('aria-selected', String(selected));tab.tabIndex = selected ? 0 : -1;
    });
  }
  function fitRows() {
    const next = dockLayout(content.clientHeight, rows.length, 28);
    dock.style.setProperty('--dock-row-h', `${next.rowHeight}px`);
    split = next.split;
    renderPanels();
  }
  tabs.forEach((tab, index) => {
    const select = () => { activePanel = tab.dataset.dockTab; renderPanels(); };
    tab.addEventListener('click', select);
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].click();tabs[next].focus();
    });
  });
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function widthBounds() { return { min: 280, max: Math.max(280, Math.min(1600, Math.round(showcase.clientWidth * .6))) }; }
  let width = Math.max(280, Math.round(showcase.clientWidth * .35));
  let height = 620;
  function setWidth(next) {
    const limits = widthBounds();width = clamp(next, limits.min, limits.max);
    showcase.style.setProperty('--dock-width', `${Math.round(width)}px`);
    dock.dataset.wide = String(width >= 640);
    widthHandle.setAttribute('aria-valuenow', String(Math.round(width)));
    widthHandle.setAttribute('aria-valuemax', String(limits.max));
  }
  function setHeight(next) {
    height = Math.round(clamp(next, 380, 1120));
    showcase.style.setProperty('--dock-height', `${height}px`);
    heightHandle.setAttribute('aria-valuenow', String(height));
  }
  let pendingFrame = false;
  function updateAutoHeight() {
    pendingFrame = false;
    setWidth(width);
    if (!auto.checked) return;
    const header = document.querySelector('.site-header').offsetHeight;
    const top = compact.matches ? header + 16 : Math.max(header + 16, dock.getBoundingClientRect().top);
    setHeight(innerHeight - top - 20);
  }
  function scheduleFit() {
    if (!pendingFrame) { pendingFrame = true; requestAnimationFrame(updateAutoHeight); }
  }
  function resizeHandle(handle, onMove, save) {
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      try { handle.setPointerCapture(event.pointerId); } catch (_) {}
      const startY = event.clientY;const startHeight = height;
      const move = next => { if (next.pointerId === event.pointerId) onMove(next, startY, startHeight); };
      const finish = () => {
        window.removeEventListener('pointermove', move);window.removeEventListener('pointerup', finish);window.removeEventListener('pointercancel', finish);save?.();
      };
      window.addEventListener('pointermove', move);window.addEventListener('pointerup', finish);window.addEventListener('pointercancel', finish);
    });
  }
  resizeHandle(widthHandle, event => setWidth(showcase.getBoundingClientRect().right - event.clientX), () => { try { localStorage.setItem('openviewer-demo-dock-width', String(width)); } catch (_) {} });
  resizeHandle(heightHandle, (event, startY, startHeight) => { auto.checked = false;setHeight(startHeight + event.clientY - startY); });
  widthHandle.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();const bounds = widthBounds();setWidth(event.key === 'Home' ? bounds.min : event.key === 'End' ? bounds.max : width + (event.key === 'ArrowLeft' ? 32 : -32));
  });
  heightHandle.addEventListener('keydown', event => {
    if (!['ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
    event.preventDefault();auto.checked = false;setHeight(event.key === 'Home' ? 380 : event.key === 'End' ? 1120 : height + (event.key === 'ArrowDown' ? 32 : -32));
  });
  auto.addEventListener('change', scheduleFit);
  document.querySelector('[data-dock-reset]').addEventListener('click', () => {
    width = Math.max(280, Math.round(showcase.clientWidth * .35));auto.checked = true;activePanel = 'standings';renderPanels();scheduleFit();
    try { localStorage.removeItem('openviewer-demo-dock-width'); } catch (_) {}
  });
  window.addEventListener('scroll', scheduleFit, { passive: true });window.addEventListener('resize', scheduleFit);
  if ('ResizeObserver' in window) { new ResizeObserver(fitRows).observe(content);new ResizeObserver(scheduleFit).observe(showcase); }
  try { const saved = Number(localStorage.getItem('openviewer-demo-dock-width'));if (saved >= 280) width = saved; } catch (_) {}
  setWidth(width);setHeight(height);renderPanels();scheduleFit();
})();
