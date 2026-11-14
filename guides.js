(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('reveal');
      observer.unobserve(entry.target);
    }
  }, { threshold: .1 });
  document.querySelectorAll('.guide-hero h1, .guide-hero .lead, .guide-hero figure, .guide-article h2, .guide-article figure, .download h2').forEach(element => observer.observe(element));
})();
