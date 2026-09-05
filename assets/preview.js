(() => {
  const data = JSON.parse(document.getElementById('preview-data').textContent);
  const cards = [...document.querySelectorAll('[data-preview-art]')];
  const stage = document.querySelector('[data-preview-stage]');
  const counter = document.querySelector('[data-preview-counter]');
  let active = 0;
  let requestId = 0;
  let start = null;
  const title = document.querySelector('[data-preview-title]');
  const subtitle = document.querySelector('[data-preview-subtitle]');
  const request = document.querySelector('[data-preview-request]');
  const links = [...document.querySelectorAll('[data-preview-link]')];
  const setCaption = item => {
    title.textContent = cards.length ? `${item.title} · ${item.subtitle.split(' · ')[0]}墨线` : item.title;
    if (subtitle) subtitle.textContent = item.subtitle;
    if (request) request.textContent = item.originalRequest;
    links.forEach(a => { a.href = `works/${item.slug}.html`; });
    stage.setAttribute('aria-label', `查看${item.title}作品详情，左右方向键切换`);
    counter.textContent = String(active + 1).padStart(2, '0');
  };
  async function move(index) {
    active = (index + data.length) % data.length;
    const currentRequest = ++requestId;
    const item = data[active];
    if (cards.length) {
      cards.forEach((card, i) => {
        const offset = (i - active + data.length) % data.length;
        const slot = offset === 0 ? 'center' : offset === 1 ? 'right' : offset === data.length - 1 ? 'left' : 'hidden';
        card.dataset.slot = slot;
        card.tabIndex = slot === 'hidden' ? -1 : 0;
        card.setAttribute('aria-hidden', String(slot === 'hidden'));
        card.setAttribute('aria-label', slot === 'center' ? `查看${data[i].title}作品详情` : `将${data[i].title}移至前景`);
      });
    } else {
      const next = new Image();
      next.src = `assets/gallery/${item.slug}.webp`;
      try { await next.decode(); } catch { return; }
      if (currentRequest !== requestId) return;
      const visible = stage.querySelector('img');
      visible.src = next.src;
      visible.alt = `${item.title}，${item.subtitle}`;
    }
    setCaption(item);
  }
  document.querySelector('[data-preview-prev]').addEventListener('click', () => move(active - 1));
  document.querySelector('[data-preview-next]').addEventListener('click', () => move(active + 1));
  cards.forEach((card, i) => card.addEventListener('click', event => {
    if (i !== active) { event.preventDefault(); move(i); }
  }));
  document.querySelector('.cover-hero, .exhibit-hero').addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); move(active + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  stage.addEventListener('touchstart', e => { start = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }; }, { passive: true });
  let suppressClickUntil = 0;
  stage.addEventListener('touchend', e => {
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      suppressClickUntil = Date.now() + 400;
      move(active + (dx < 0 ? 1 : -1));
    }
    start = null;
  }, { passive: true });
  stage.addEventListener('click', e => {
    if (Date.now() < suppressClickUntil) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  // Manual navigation keeps both design previews stable for side-by-side inspection.
})();
