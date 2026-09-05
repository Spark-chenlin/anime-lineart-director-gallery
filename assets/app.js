(() => {
  const carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;

  const slides = [...carousel.querySelectorAll('[data-slide]')];
  const dots = [...document.querySelectorAll('[data-dot]')];
  const toggle = document.querySelector('[data-toggle]');
  const caption = document.querySelector('[data-caption]');
  const captionSub = document.querySelector('[data-caption-sub]');
  const captions = slides.map(slide => [slide.dataset.title || '', slide.dataset.subtitle || '']);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 把「离前景第几张」换算成槽位。前后各一张在台上，再往外的收到台侧藏起来。
  // 这段规则和 build_site.py 里的 hero_slot() 必须保持一致。
  const slotFor = index => {
    const count = slides.length;
    let offset = (index - active + count) % count;
    if (offset > count / 2) offset -= count;
    if (offset === 0) return 'center';
    if (offset === 1) return 'right';
    if (offset === -1) return 'left';
    return offset > 0 ? 'far-right' : 'far-left';
  };

  let active = 0;
  let manualPause = reduceMotion;
  let hoverPause = false;
  let focusPause = false;
  let timer = null;
  let touchStart = 0;

  const workUrl = slug => `works/${slug}.html`;
  const paused = () => manualPause || hoverPause || focusPause || document.hidden;

  const schedule = () => {
    clearTimeout(timer);
    if (!paused()) timer = setTimeout(() => move(active + 1), 4800);
  };

  const updateToggle = () => {
    toggle.dataset.paused = String(manualPause);
    toggle.setAttribute('aria-pressed', String(manualPause));
    toggle.setAttribute('aria-label', manualPause ? '播放自动轮播' : '暂停自动轮播');
  };

  // announce 只在用户主动切换时打开，避免自动轮播每 4.8 秒打断读屏用户
  function move(index, announce = false) {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const slot = slotFor(slideIndex);
      const isActive = slot === 'center';
      slide.dataset.slot = slot;
      slide.dataset.active = String(isActive);
      slide.setAttribute('aria-label', isActive
        ? `查看${captions[slideIndex][0]}作品详情`
        : `将${captions[slideIndex][0]}移至前景`);
      // 台侧那两张退出 Tab 键序列，只留台上三张可聚焦
      if (slot === 'center' || slot === 'right' || slot === 'left') slide.removeAttribute('tabindex');
      else if (slide !== document.activeElement) slide.setAttribute('tabindex', '-1');
    });
    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === active;
      dot.dataset.active = String(isActive);
      dot.setAttribute('aria-selected', String(isActive));
    });
    caption.textContent = captions[active][0];
    captionSub.textContent = captions[active][1];
    caption.parentElement.setAttribute('aria-live', announce ? 'polite' : 'off');
    schedule();
  }

  // 点中间那张 = 打开详情页；点侧边那张 = 先把它转到前景
  const activate = slide => {
    const index = slides.indexOf(slide);
    if (index === -1) return;
    if (index === active) window.location.href = workUrl(slide.dataset.art);
    else move(index, true);
  };

  carousel.addEventListener('click', event => {
    const slide = event.target.closest('[data-slide]');
    if (slide) activate(slide);
  });

  // Enter/Space 作用在真正获得焦点的那张，而不是当前前景那张
  carousel.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(active - 1, true); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); move(active + 1, true); return; }
    if (event.key === 'Enter' || event.key === ' ') {
      const slide = event.target.closest('[data-slide]');
      if (!slide) return;
      event.preventDefault();
      activate(slide);
    }
  });

  carousel.addEventListener('pointerenter', () => { hoverPause = true; schedule(); });
  carousel.addEventListener('pointerleave', () => { hoverPause = false; schedule(); });
  carousel.addEventListener('focusin', () => { focusPause = true; schedule(); });
  carousel.addEventListener('focusout', event => {
    if (carousel.contains(event.relatedTarget)) return;
    focusPause = false;
    schedule();
  });
  carousel.addEventListener('touchstart', event => { touchStart = event.changedTouches[0].clientX; }, { passive: true });
  carousel.addEventListener('touchend', event => {
    const delta = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(delta) > 55) move(active + (delta < 0 ? 1 : -1), true);
  }, { passive: true });

  document.querySelector('[data-prev]').addEventListener('click', () => move(active - 1, true));
  document.querySelector('[data-next]').addEventListener('click', () => move(active + 1, true));
  dots.forEach((dot, index) => dot.addEventListener('click', () => move(index, true)));
  toggle.addEventListener('click', () => { manualPause = !manualPause; updateToggle(); schedule(); });
  document.addEventListener('visibilitychange', schedule);

  updateToggle();
  move(0);
})();
