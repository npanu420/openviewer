(() => {
  const repository = 'https://github.com/npanu420/F1OpenViewer';
  const latestPage = `${repository}/releases/latest`;
  const endpoint = 'https://api.github.com/repos/npanu420/F1OpenViewer/releases/latest';
  const cacheKey = 'openviewer-release-v1';
  const cacheLifetime = 10 * 60 * 1000;
  const links = [...document.querySelectorAll('[data-download]')];
  const platformButtons = [...document.querySelectorAll('[data-platform]')];
  const releaseLabel = document.querySelector('[data-release-label]');
  const ua = navigator.userAgent || '';
  const devicePlatform = navigator.userAgentData?.platform || navigator.platform || ua;
  const mobile = /Android|iPhone|iPad|iPod/i.test(ua) || (/Mac/i.test(devicePlatform) && navigator.maxTouchPoints > 1);
  let platform = mobile ? null : /Win/i.test(devicePlatform) ? 'windows' : /Mac/i.test(devicePlatform) ? 'mac' : null;
  let release = null;
  let waiting = true;

  function validRelease(value) {
    return value && typeof value.tag_name === 'string' && !value.draft && !value.prerelease && Array.isArray(value.assets) && value.html_url?.startsWith(`${repository}/releases/tag/`);
  }
  function chooseAsset() {
    if (!release || !platform) return null;
    return release.assets.filter(asset => {
      if (typeof asset.name !== 'string' || typeof asset.browser_download_url !== 'string') return false;
      if (!asset.browser_download_url.startsWith(`${repository}/releases/download/`)) return false;
      if (/blockmap|\.ya?ml$|\.txt$|\.sha\d*|symbols|debug|pdb|source/i.test(asset.name)) return false;
      return platform === 'windows' ? /windows|win32|win64|\.exe$|\.msi$/i.test(asset.name) : /mac|darwin|\.dmg$|\.pkg$/i.test(asset.name);
    }).sort((a, b) => {
      const score = name => (/universal/i.test(name) ? 60 : 0) + (/arm64|aarch64/i.test(name) && platform === 'mac' ? 20 : 0) + (/\.exe$|\.dmg$/i.test(name) ? 30 : /\.msi$|\.pkg$/i.test(name) ? 20 : /\.zip$/i.test(name) ? 10 : 0);
      return score(b.name) - score(a.name);
    })[0] || null;
  }
  function render() {
    const name = platform === 'mac' ? 'Mac' : 'Windows';
    const asset = chooseAsset();
    platformButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.platform === platform)));
    links.forEach(link => {
      link.href = asset?.browser_download_url || release?.html_url || latestPage;
      link.dataset.resolved = asset ? 'true' : 'false';
      link.querySelector('[data-download-label]').textContent = platform ? `${asset || waiting ? 'Download for' : 'View downloads for'} ${name}` : 'View downloads';
    });
    releaseLabel.textContent = release ? `Release ${release.tag_name.replace(/^v/, '')}` : waiting ? 'Checking the latest release…' : 'Latest release on GitHub';
    document.querySelectorAll('[data-release-page]').forEach(link => { link.href = release?.html_url || latestPage; });
  }
  platformButtons.forEach(button => button.addEventListener('click', () => { platform = button.dataset.platform; render(); }));

  async function loadRelease() {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && Date.now() - cached.checkedAt < cacheLifetime && validRelease(cached.release)) {
        release = cached.release;
        waiting = false;
        render();
        return;
      }
    } catch (_) {}
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(endpoint, { headers: { Accept: 'application/vnd.github+json' }, signal: controller.signal, cache: 'no-cache', credentials: 'omit' });
      if (!response.ok) throw new Error('Release metadata unavailable');
      const data = await response.json();
      if (!validRelease(data)) throw new Error('Invalid release metadata');
      release = { tag_name: data.tag_name, html_url: data.html_url, assets: data.assets.map(({ name, browser_download_url }) => ({ name, browser_download_url })) };
      try { localStorage.setItem(cacheKey, JSON.stringify({ checkedAt: Date.now(), release })); } catch (_) {}
    } catch (_) {
      // The release page always stays usable if GitHub is offline or rate-limits the API.
      release = null;
    } finally {
      clearTimeout(timeout);
      waiting = false;
      render();
    }
  }
  render();
  let ready = loadRelease();
  function refreshLatest() {
    if (waiting) return ready;
    waiting = true;
    ready = loadRelease();
    return ready;
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshLatest(); });
  window.addEventListener('focus', refreshLatest);
  setInterval(() => { if (document.visibilityState === 'visible') refreshLatest(); }, cacheLifetime);
  links.forEach(link => link.addEventListener('click', async event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    await refreshLatest();
    window.location.assign(link.href);
  }));
})();
