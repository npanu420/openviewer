(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const shots = {
    multiview: { src: 'assets/multiview.jpg', alt: 'OpenViewer multiview with the main feed and five onboard cameras', text: 'Auto layout follows the window, with Live Timing and the driver HUD.' },
    focus: { src: 'assets/focus-timing.jpg', alt: 'OpenViewer Focus view with a large onboard and synchronized replay timing', text: 'One perspective up close. Replay timing right alongside it.' },
    session: { src: 'assets/session.jpg', alt: 'OpenViewer session view with feed selection and layout controls', text: 'Pick your session. Choose your feeds. Make the view yours.' }
  };
  const experienceImage = document.querySelector('.experience-image');
  const experienceVideo = document.querySelector('.experience-video');
  const experienceStill = document.querySelector('.experience-still');
  const experiencePlayer = document.querySelector('.experience-player');
  let videoMode = true;
  let videoInView = false;
  let userPausedVideo = false;
  let automaticPause = false;
  function updateVideoPlayback() {
    if (videoMode && videoInView && !reduced.matches && !userPausedVideo && !document.hidden && !document.querySelector('.lightbox').open) {
      automaticPause = false;
      experienceVideo.muted = true;
      experienceVideo.play().catch(() => {});
    } else if (!experienceVideo.paused) {
      automaticPause = true;
      experienceVideo.pause();
    }
  }
  experienceVideo.addEventListener('pause', () => {
    if (!automaticPause && videoInView && videoMode) userPausedVideo = true;
    automaticPause = false;
  });
  experienceVideo.addEventListener('play', () => { userPausedVideo = false; });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { videoInView = entries[0].isIntersecting; updateVideoPlayback(); }, { threshold: .2 }).observe(document.querySelector('.product-screen'));
  }
  document.addEventListener('visibilitychange', updateVideoPlayback);
  reduced.addEventListener('change', updateVideoPlayback);
  document.querySelectorAll('[data-view]').forEach(button => {
    button.addEventListener('click', () => {
      const selected = shots[button.dataset.view];
      videoMode = button.dataset.view === 'multiview';
      experienceVideo.hidden = !videoMode;
      experiencePlayer.hidden = !videoMode;
      document.querySelector('[data-open-current]').hidden = videoMode;
      document.querySelector('#player-help').textContent = videoMode ? 'Click to pause. Double-click to enlarge.' : 'Italian Grand Prix, 2025';
      experienceStill.hidden = videoMode;
      updateVideoPlayback();
      document.querySelectorAll('[data-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      experienceImage.src = selected.src;
      experienceImage.alt = selected.alt;
      document.querySelector('#view-description').textContent = selected.text;
      if (!videoMode && !reduced.matches) experienceImage.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 350, easing: 'ease-out' });
    });
  });
  const heroScene = document.querySelector('.hero-scene');
  const depthRoot = document.querySelector('.hero-visual');
  const rig = document.querySelector('.depth-rig');
  const updateAssemblyControls = () => {
    const spread = parseFloat(getComputedStyle(heroScene).getPropertyValue('--spread')) || 0;
    const flat = spread < .5;
    depthRoot.classList.toggle('is-flat', flat);
    document.querySelectorAll('[data-depth]').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.depth === 'flat') === flat)));
  };
  document.querySelectorAll('[data-depth]').forEach(button => {
    button.addEventListener('click', () => {
      const value = button.dataset.depth === 'flat' ? 0 : 1;
      const current = parseFloat(getComputedStyle(heroScene).getPropertyValue('--spread')) || 0;
      heroScene.style.setProperty('--manual-spread', current);
      if (window.gsap && !reduced.matches) {
        gsap.to(heroScene, { '--manual-spread': value, duration: .7, ease: 'power2.out', onUpdate: updateAssemblyControls });
      } else {
        heroScene.style.setProperty('--manual-spread', value);
        updateAssemblyControls();
      }
    });
  });
  window.addEventListener('scroll', () => {
    if (window.gsap) gsap.killTweensOf(heroScene, '--manual-spread');
    heroScene.style.removeProperty('--manual-spread');
  }, { passive: true });
  if (window.matchMedia('(pointer: fine) and (min-width: 901px)').matches) {
    let pointerFrame = 0;
    depthRoot.addEventListener('pointermove', event => {
      if (reduced.matches) return;
      cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(() => {
        const bounds = depthRoot.getBoundingClientRect();
        heroScene.style.setProperty('--pointer-x', `${-((event.clientY - bounds.top) / bounds.height - .5) * 5}deg`);
        heroScene.style.setProperty('--pointer-y', `${((event.clientX - bounds.left) / bounds.width - .5) * 7}deg`);
      });
    });
    depthRoot.addEventListener('pointerleave', () => {
      cancelAnimationFrame(pointerFrame);
      heroScene.style.removeProperty('--pointer-x');
      heroScene.style.removeProperty('--pointer-y');
    });
  }
  const dialog = document.querySelector('.lightbox');
  const dialogVideo = dialog.querySelector('.lightbox-video');
  const dialogPlayer = dialog.querySelector('.lightbox-player');
  const showImage = image => {
    dialogVideo.pause();
    dialogVideo.hidden = true;
    dialogPlayer.hidden = true;
    const enlarged = dialog.querySelector('img');
    enlarged.hidden = false;
    enlarged.src = image.src;
    enlarged.alt = image.alt;
    dialog.showModal();
  };
  document.querySelectorAll('[data-enlarge]').forEach(button => button.addEventListener('click', () => showImage(button.querySelector('img'))));
  document.querySelector('[data-open-current]').addEventListener('click', () => {
    if (!videoMode) { showImage(experienceImage); return; }
    dialog.querySelector('img').hidden = true;
    dialogVideo.hidden = false;
    dialogPlayer.hidden = false;
    dialogVideo.src = experienceVideo.currentSrc || 'assets/auto-layout-demo.mp4';
    dialogVideo.currentTime = experienceVideo.currentTime;
    dialogVideo.muted = true;
    dialogVideo.loop = true;
    const wasPlaying = !experienceVideo.paused;
    automaticPause = true;
    experienceVideo.pause();
    dialog.showModal();
    if (wasPlaying) dialogVideo.play().catch(() => {});
  });
  async function enlargePlayer(player) {
    if (document.fullscreenElement) { await document.exitFullscreen().catch(() => {}); return; }
    if (player.requestFullscreen) {
      try { await player.requestFullscreen(); return; } catch (_) {}
    }
    if (player === experiencePlayer) document.querySelector('[data-open-current]').click();
    else if (dialog.open) dialog.close();
  }
  function bindPlayer(player, video) {
    let singleClick;
    const togglePlayback = () => {
      if (video === experienceVideo) { userPausedVideo = !video.paused; automaticPause = false; }
      if (video.paused) video.play().catch(() => {}); else video.pause();
    };
    const syncLabel = () => {
      player.setAttribute('aria-label', `${video.paused ? 'Play' : 'Pause'} video. Double-click to enlarge. Press F for fullscreen.`);
      player.setAttribute('aria-pressed', String(!video.paused));
    };
    video.addEventListener('play', syncLabel);video.addEventListener('pause', syncLabel);syncLabel();
    player.addEventListener('click', event => {
      if (event.detail > 1) { clearTimeout(singleClick); return; }
      clearTimeout(singleClick);
      singleClick = setTimeout(togglePlayback, 320);
    });
    player.addEventListener('dblclick', event => { event.preventDefault();clearTimeout(singleClick);enlargePlayer(player); });
    player.addEventListener('keydown', event => {
      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault();clearTimeout(singleClick);togglePlayback(); }
      if (event.key.toLowerCase() === 'f') { event.preventDefault();enlargePlayer(player); }
    });
  }
  bindPlayer(experiencePlayer, experienceVideo);
  bindPlayer(dialogPlayer, dialogVideo);
  dialog.addEventListener('close', () => {
    if (!dialogPlayer.hidden) {
      userPausedVideo = dialogVideo.paused;
      experienceVideo.currentTime = dialogVideo.currentTime;
    }
    dialogVideo.pause();
    updateVideoPlayback();
  });
  document.querySelector('.close-lightbox').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('reveal');
        observer.unobserve(entry.target);
      });
    }, { threshold: .09 });
    document.querySelectorAll('.section-heading h2, .section-heading .lead, .experience-controls, .experience-caption, .timing-copy h2, .timing-copy p, .timing-copy a, .layout-heading h2, .layout-heading p, .layout-bottom p, .faq h2, .faq details, .download h2, .download p, .download .platform-controls').forEach(element => observer.observe(element));
  }
  if (window.Stage) {
    window.Scenes['hero-assembly'] = (root, options) => {
      if (window.matchMedia('(max-width: 900px)').matches) {
        root.classList.add('is-rest');
        if (!reduced.matches) {
          let scheduled = false;
          const updateCompactAssembly = () => {
            scheduled = false;
            const bounds = depthRoot.getBoundingClientRect();
            const start = innerHeight * .78;
            const progress = Math.min(1, Math.max(0, (start - bounds.top) / Math.min(300, bounds.height * .6)));
            root.style.setProperty('--scroll-spread', String(1 - progress));
            updateAssemblyControls();
          };
          window.addEventListener('scroll', () => {
            if (!scheduled) { scheduled = true; requestAnimationFrame(updateCompactAssembly); }
          }, { passive: true });
          window.addEventListener('resize', updateCompactAssembly);
          updateCompactAssembly();
        }
        return null;
      }
      return window.Stage.scene(root, {
        hold: options.hold || 1,
        start: () => `top ${document.querySelector('.site-header').offsetHeight}px`,
        scrub: true,
        phone: 'rest',
        build(timeline) {
          timeline.fromTo(root, { '--scroll-spread': 1 }, { '--scroll-spread': 0, duration: .9, ease: 'none', onUpdate: updateAssemblyControls }, 0);
        }
      });
    };
    window.Stage.init();
  }
  updateAssemblyControls();
})();
