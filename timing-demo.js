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
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = showcase.querySelector('.auto-feed-canvas');
  const feeds = [...canvas.querySelectorAll('[data-feed]')];
  const countLabel = document.querySelector('[data-feed-count]');
  const widthSlider = document.querySelector('[data-dock-width]');
  let resizing = false;
  let shownCount = 3;
  let shownFamily = null;
  let layoutFrame = 0;
  let settleTimer = 0;
  let layoutEpoch = 0;
  let lastLayoutKey = '';

  // Choose the count and arrangement from both dimensions, as the app does.
  // Narrow areas become a column; wider ones give the main feed a row of onboards.
  function wantedFeedCount() {
    if (!window.OpenViewerTiling) return 3;
    const ideal = window.OpenViewerTiling.solveTiling({ width: canvas.clientWidth, height, maxTiles: feeds.length, preferredCount: 3, minTileWidth: Math.max(48, Math.min(220, showcase.clientWidth * .14)), spacing: compact.matches ? 3 : 5 });
    return ideal?.frames.length || 1;
  }
  function renderFeeds(animate = true) {
    if (!window.OpenViewerTiling) return;
    const W = canvas.clientWidth;
    if (W < 1) return;
    const H = height;
    const key = `${W.toFixed(1)}:${H.toFixed(1)}:${shownCount}:${resizing ? 1 : 0}`;
    if (key === lastLayoutKey) return;
    lastLayoutKey = key;
    const origin = canvas.getBoundingClientRect();
    const previous = feeds.map(feed => feed.hidden ? null : feed.getBoundingClientRect());
    canvas.style.setProperty('--feed-canvas-height', `${H}px`);
    canvas.dataset.ready = 'true';
    const plan = window.OpenViewerTiling.solveTiling({ width: W, height: H, maxTiles: feeds.length, count: shownCount, spacing: compact.matches ? 3 : 5, keepFamily: resizing ? shownFamily : null, keepTolerance: .25 });
    if (!plan) return;
    shownFamily = plan.family;
    const epoch = ++layoutEpoch;
    feeds.forEach((feed, index) => {
      const old = previous[index];
      feed.getAnimations().forEach(animation => animation.cancel());
      const target = plan.frames[index];
      if (!target) {
        feed.style.pointerEvents = 'none';
        feed.setAttribute('aria-hidden', 'true');feed.tabIndex = -1;
        if (feed.contains(document.activeElement)) (compact.matches ? widthSlider : widthHandle).focus({ preventScroll: true });
        if (old && animate && !reduced.matches) {
          const motion = feed.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' });
          motion.finished.then(() => { if (epoch === layoutEpoch) { feed.hidden = true;motion.cancel(); } }).catch(() => {});
        } else feed.hidden = true;
        return;
      }
      feed.hidden = false;
      feed.removeAttribute('aria-hidden');feed.tabIndex = 0;
      feed.style.pointerEvents = '';
      feed.style.width = `${target.width}px`;
      feed.style.height = `${target.height}px`;
      const finish = `translate3d(${target.x}px,${target.y}px,0)`;
      feed.style.transform = finish;
      if (animate && !reduced.matches) {
        const start = old ? `translate3d(${old.x - origin.x}px,${old.y - origin.y}px,0) scale(${old.width / target.width})` : `${finish} scale(.94)`;
        feed.animate([{ transform: start, opacity: old ? 1 : 0 }, { transform: finish, opacity: 1 }], { duration: old ? 380 : 300, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    });
    canvas.dataset.visibleCount = String(plan.frames.length);
    canvas.dataset.family = plan.family;
    canvas.dataset.coverage = plan.coverage.toFixed(3);
    countLabel.textContent = `${plan.frames.length} ${plan.frames.length === 1 ? 'feed' : 'feeds'}`;
  }
  function commitFeeds() {
    clearTimeout(settleTimer);
    if (resizing) return;
    shownCount = wantedFeedCount();
    renderFeeds(true);
  }
  function scheduleFeeds() {
    if (!layoutFrame) layoutFrame = requestAnimationFrame(() => { layoutFrame = 0;renderFeeds(!resizing); });
    clearTimeout(settleTimer);
    settleTimer = setTimeout(commitFeeds, 260);
  }

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
  function widthBounds() {
    const W = showcase.clientWidth;
    return compact.matches ? { min: Math.max(104, Math.round(W * .31)), max: Math.min(Math.round(W * .65), W - 22 - 94) } : { min: 280, max: Math.max(280, Math.min(1600, Math.round(W * .6))) };
  }
  let widthRatio = compact.matches ? .42 : .35;
  let width = Math.round(showcase.clientWidth * widthRatio);
  let height = 620;
  function setWidth(next, rememberRatio = true) {
    const limits = widthBounds();width = clamp(next, limits.min, limits.max);
    if (rememberRatio) widthRatio = width / Math.max(1, showcase.clientWidth);
    showcase.style.setProperty('--dock-width', `${Math.round(width)}px`);
    dock.dataset.wide = String(width >= 640);
    dock.dataset.narrow = String(width < 230);
    widthHandle.setAttribute('aria-valuenow', String(Math.round(width)));
    widthHandle.setAttribute('aria-valuemax', String(limits.max));
    widthHandle.setAttribute('aria-valuemin', String(limits.min));
    widthSlider.min = String(limits.min);widthSlider.max = String(limits.max);widthSlider.value = String(Math.round(width));
    widthSlider.setAttribute('aria-valuetext', `${Math.round(width)} pixels`);
    if (height > heightBounds().max) setHeight(height);
    scheduleFeeds();
  }
  function heightBounds() {
    const spacing = compact.matches ? 3 : 5;
    return { min: 380, max: Math.max(380, Math.min(1120, Math.floor(canvas.clientWidth * 9 / 16 * feeds.length + spacing * (feeds.length - 1)))) };
  }
  function setHeight(next) {
    const limits = heightBounds();
    height = Math.round(clamp(next, limits.min, limits.max));
    showcase.style.setProperty('--dock-height', `${height}px`);
    heightHandle.setAttribute('aria-valuenow', String(height));
    heightHandle.setAttribute('aria-valuemax', String(limits.max));
    scheduleFeeds();
  }
  let pendingFrame = false;
  function updateAutoHeight() {
    pendingFrame = false;
    setWidth(showcase.clientWidth * widthRatio, false);
    if (!auto.checked) return;
    const header = document.querySelector('.site-header').offsetHeight;
    const top = compact.matches ? header + 16 : Math.max(header + 16, dock.getBoundingClientRect().top);
    setHeight(compact.matches ? Math.min(460, showcase.clientWidth * .98) : innerHeight - top - 20);
  }
  function scheduleFit() {
    if (!pendingFrame) { pendingFrame = true; requestAnimationFrame(updateAutoHeight); }
  }
  function resizeHandle(handle, onMove, save) {
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();resizing = true;
      try { handle.setPointerCapture(event.pointerId); } catch (_) {}
      const startY = event.clientY;const startHeight = height;
      const move = next => { if (next.pointerId === event.pointerId) onMove(next, startY, startHeight); };
      const finish = () => {
        window.removeEventListener('pointermove', move);window.removeEventListener('pointerup', finish);window.removeEventListener('pointercancel', finish);resizing = false;commitFeeds();save?.();
      };
      window.addEventListener('pointermove', move);window.addEventListener('pointerup', finish);window.addEventListener('pointercancel', finish);
    });
  }
  const saveWidth = () => { try { localStorage.setItem('openviewer-demo-dock-ratio', String(widthRatio)); } catch (_) {} };
  resizeHandle(widthHandle, event => setWidth(showcase.getBoundingClientRect().right - event.clientX), saveWidth);
  widthSlider.addEventListener('input', () => setWidth(Number(widthSlider.value)));
  widthSlider.addEventListener('change', () => { commitFeeds();saveWidth(); });
  widthSlider.addEventListener('pointerdown', () => { resizing = true; });
  window.addEventListener('pointerup', () => { if (resizing) { resizing = false;commitFeeds(); } });

  resizeHandle(heightHandle, (event, startY, startHeight) => { auto.checked = false;setHeight(startHeight + event.clientY - startY); });
  widthHandle.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();const bounds = widthBounds();setWidth(event.key === 'Home' ? bounds.min : event.key === 'End' ? bounds.max : width + (event.key === 'ArrowLeft' ? 32 : -32));saveWidth();
  });
  heightHandle.addEventListener('keydown', event => {
    if (!['ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
    event.preventDefault();auto.checked = false;setHeight(event.key === 'Home' ? 380 : event.key === 'End' ? heightBounds().max : height + (event.key === 'ArrowDown' ? 32 : -32));
  });
  auto.addEventListener('change', scheduleFit);
  document.querySelector('[data-dock-reset]').addEventListener('click', () => {
    widthRatio = compact.matches ? .42 : .35;setWidth(showcase.clientWidth * widthRatio);auto.checked = true;activePanel = 'standings';renderPanels();scheduleFit();commitFeeds();
    try { localStorage.removeItem('openviewer-demo-dock-width');localStorage.removeItem('openviewer-demo-dock-ratio'); } catch (_) {}
  });
  window.addEventListener('scroll', scheduleFit, { passive: true });window.addEventListener('resize', scheduleFit);
  if ('ResizeObserver' in window) { new ResizeObserver(fitRows).observe(content);new ResizeObserver(scheduleFit).observe(showcase); }
  if ('ResizeObserver' in window) {
    let previousWidth = 0;
    new ResizeObserver(() => { if (canvas.clientWidth !== previousWidth) { previousWidth = canvas.clientWidth;scheduleFeeds(); } }).observe(canvas);
  }
  try { const saved = Number(localStorage.getItem('openviewer-demo-dock-ratio'));if (saved >= .15 && saved <= .75) widthRatio = saved; } catch (_) {}
  setWidth(showcase.clientWidth * widthRatio);setHeight(height);renderPanels();updateAutoHeight();commitFeeds();
})();
