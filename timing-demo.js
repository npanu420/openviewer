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
  let feeds = [...canvas.querySelectorAll('[data-feed]')];
  const widthSlider = document.querySelector('[data-dock-width]');
  let resizing = false;
  let defaultLayout = true;
  let shownCount = 3;
  let shownFamily = null;
  let layoutFrame = 0;
  let imagesReady = false;
  let lastLayoutKey = '';

  // Choose the count and arrangement from both dimensions, as the app does.
  // Narrow areas become a column; wider ones give the main feed a row of onboards.
  function renderFeeds(animate = true) {
    if (!imagesReady || !window.OpenViewerTiling || !feeds.length) return;
    const W = canvas.clientWidth;
    if (W < 1) return;
    const H = height;
    // Scrolling, pointer release and unchanged ResizeObserver reports must not reflow tiles.
    const key = `${W}:${H}:${compact.matches}:${defaultLayout}`;
    if (key === lastLayoutKey) return;
    lastLayoutKey = key;
    const origin = canvas.getBoundingClientRect();
    const previous = feeds.map(feed => feed.hidden ? null : feed.getBoundingClientRect());
    canvas.style.setProperty('--feed-canvas-height', `${H}px`);
    canvas.dataset.ready = 'true';
    const options = { width: W, height: H, maxTiles: feeds.length, preferredCount: 3, minTileWidth: Math.max(48, Math.min(220, showcase.clientWidth * .14)), spacing: compact.matches ? 3 : 5 };
    const preset = defaultLayout && feeds.length >= 3;
    const ideal = window.OpenViewerTiling.solveTiling(preset ? { ...options, count: 3, only: 'm0-2' } : options);
    if (!ideal) return;
    const current = window.OpenViewerTiling.solveTiling({ ...options, count: shownCount, keepFamily: shownFamily, keepTolerance: .03 });
    // Keep near-equivalent arrangements through small size changes instead of flipping at a tie.
    const plan = preset ? ideal : current && current.coverage >= ideal.coverage - .025 ? current : ideal;
    shownCount = plan.frames.length;
    shownFamily = plan.family;
    feeds.forEach((feed, index) => {
      const old = previous[index];
      feed.getAnimations().forEach(animation => animation.cancel());
      const target = plan.frames[index];
      if (!target) {
        feed.style.pointerEvents = 'none';
        feed.setAttribute('aria-hidden', 'true');feed.tabIndex = -1;
        if (feed.contains(document.activeElement)) (compact.matches ? widthSlider : widthHandle).focus({ preventScroll: true });
        feed.hidden = true;
        return;
      }
      feed.hidden = false;
      feed.removeAttribute('aria-hidden');feed.tabIndex = 0;
      feed.style.pointerEvents = '';
      feed.style.width = `${target.width}px`;
      feed.style.height = `${target.height}px`;
      const finish = `translate3d(${target.x}px,${target.y}px,0)`;
      feed.style.transform = finish;
      if (old && animate && !reduced.matches) {
        const start = `translate3d(${old.x - origin.x}px,${old.y - origin.y}px,0) scale(${old.width / target.width})`;
        feed.animate([{ transform: start }, { transform: finish }], { duration: 280, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    });
    canvas.dataset.visibleCount = String(plan.frames.length);
    canvas.dataset.family = plan.family;
    canvas.dataset.coverage = plan.coverage.toFixed(3);
  }
  function commitFeeds() {
    scheduleFeeds();
  }
  function scheduleFeeds() {
    if (!layoutFrame) layoutFrame = requestAnimationFrame(() => { layoutFrame = 0;renderFeeds(!resizing); });
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
  let widthRatio = compact.matches ? .31 : .35;
  let width = Math.round(showcase.clientWidth * widthRatio);
  let height = 620;
  function setWidth(next, rememberRatio = true) {
    const limits = widthBounds();
    const previous = width;
    width = Math.round(clamp(next, limits.min, limits.max));
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
    if (width !== previous) scheduleFeeds();
  }
  function heightBounds() {
    const spacing = compact.matches ? 3 : 5;
    return { min: compact.matches ? 280 : 380, max: Math.max(380, Math.min(1120, Math.floor(canvas.clientWidth * 9 / 16 * feeds.length + spacing * (feeds.length - 1)))) };
  }
  function setHeight(next) {
    const limits = heightBounds();
    const previous = height;
    height = Math.round(clamp(next, limits.min, limits.max));
    showcase.style.setProperty('--dock-height', `${height}px`);
    heightHandle.setAttribute('aria-valuenow', String(height));
    heightHandle.setAttribute('aria-valuemin', String(limits.min));
    heightHandle.setAttribute('aria-valuemax', String(limits.max));
    if (height !== previous) scheduleFeeds();
  }
  let pendingFrame = false;
  function updateAutoHeight() {
    pendingFrame = false;
    if (defaultLayout) widthRatio = compact.matches ? .31 : .35;
    setWidth(showcase.clientWidth * widthRatio, false);
    if (!auto.checked) return;
    if (defaultLayout) {
      const spacing = compact.matches ? 3 : 5;
      const W = canvas.clientWidth;
      setHeight(W * 9 / 16 + spacing + (W - spacing) * 9 / 32);
      return;
    }
    const header = document.querySelector('.site-header').offsetHeight;
    // Window size, never the section's scroll position, determines the preview height.
    setHeight(compact.matches ? Math.min(460, showcase.clientWidth * .98) : innerHeight - header - 36);
  }
  function scheduleFit() {
    if (!pendingFrame) { pendingFrame = true; requestAnimationFrame(updateAutoHeight); }
  }
  function startAdjusting() {
    if (!defaultLayout) return;
    defaultLayout = false;
    scheduleFit();
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
  resizeHandle(widthHandle, event => { startAdjusting();setWidth(showcase.getBoundingClientRect().right - event.clientX); });
  widthSlider.addEventListener('input', () => { startAdjusting();setWidth(Number(widthSlider.value)); });
  widthSlider.addEventListener('change', commitFeeds);
  widthSlider.addEventListener('pointerdown', () => { resizing = true; });
  window.addEventListener('pointerup', () => { if (resizing) { resizing = false;commitFeeds(); } });

  resizeHandle(heightHandle, (event, startY, startHeight) => { startAdjusting();auto.checked = false;setHeight(startHeight + event.clientY - startY); });
  widthHandle.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();startAdjusting();const bounds = widthBounds();setWidth(event.key === 'Home' ? bounds.min : event.key === 'End' ? bounds.max : width + (event.key === 'ArrowLeft' ? 32 : -32));
  });
  heightHandle.addEventListener('keydown', event => {
    if (!['ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
    event.preventDefault();startAdjusting();auto.checked = false;setHeight(event.key === 'Home' ? heightBounds().min : event.key === 'End' ? heightBounds().max : height + (event.key === 'ArrowDown' ? 32 : -32));
  });
  auto.addEventListener('change', scheduleFit);
  document.querySelector('[data-dock-reset]').addEventListener('click', () => {
    defaultLayout = true;widthRatio = compact.matches ? .31 : .35;shownCount = 3;shownFamily = null;lastLayoutKey = '';setWidth(showcase.clientWidth * widthRatio);auto.checked = true;activePanel = 'standings';renderPanels();scheduleFit();commitFeeds();
    try { localStorage.removeItem('openviewer-demo-dock-width');localStorage.removeItem('openviewer-demo-dock-ratio'); } catch (_) {}
  });
  window.addEventListener('resize', scheduleFit);
  if ('ResizeObserver' in window) {
    new ResizeObserver(fitRows).observe(content);
    let previousWidth = showcase.clientWidth;
    new ResizeObserver(() => { if (showcase.clientWidth !== previousWidth) { previousWidth = showcase.clientWidth;scheduleFit(); } }).observe(showcase);
  }
  if ('ResizeObserver' in window) {
    let previousWidth = 0;
    new ResizeObserver(() => { if (canvas.clientWidth !== previousWidth) { previousWidth = canvas.clientWidth;scheduleFeeds(); } }).observe(canvas);
  }
  // Each visit starts with the main feed and two onboards, regardless of older saved widths.
  setWidth(showcase.clientWidth * widthRatio);setHeight(height);renderPanels();updateAutoHeight();commitFeeds();
  // Hidden lazy-loaded sprite crops could appear blank when first added. Decode each
  // small standalone capture before admitting it to the automatic layout.
  Promise.all(feeds.map(async feed => {
    try { await feed.querySelector('img').decode();return feed; }
    catch (_) { feed.hidden = true;return null; }
  })).then(loaded => {
    feeds = loaded.filter(Boolean);imagesReady = true;renderFeeds(false);
  });
})();
