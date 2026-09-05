(() => {
  const connection = navigator.connection;
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')) return;
  const seen = new Set();
  const prepare = anchor => {
    if (!anchor || seen.size >= 6) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname || !/\.html$/.test(url.pathname)) return;
    url.hash = '';
    if (seen.has(url.href)) return;
    seen.add(url.href);
    const hint = document.createElement('link');
    hint.rel = 'prefetch';
    hint.href = url.href;
    hint.as = 'document';
    document.head.append(hint);
    const slug = url.pathname.match(/\/works\/([^/]+)\.html$/)?.[1];
    if (slug) {
      const art = document.createElement('link');
      art.rel = 'prefetch';
      art.as = 'image';
      const legacy = ['anna', 'ichika', 'itsuki', 'marin', 'miku', 'nino', 'yotsuba'];
      art.href = `/assets/${legacy.includes(slug) ? '' : 'gallery/'}${slug}.webp`;
      document.head.append(art);
    }
  };
  let hoverTimer;
  document.addEventListener('pointerover', event => {
    clearTimeout(hoverTimer);
    const anchor = event.target.closest('a[href]');
    hoverTimer = setTimeout(() => prepare(anchor), 100);
  });
  document.addEventListener('pointerout', () => clearTimeout(hoverTimer));
  document.addEventListener('focusin', event => prepare(event.target.closest('a[href]')));
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (!document.hidden) prepare(document.querySelector('a[rel="next"]'));
    }, 1000);
  }, { once: true });
})();
