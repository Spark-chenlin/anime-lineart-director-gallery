(() => {
  const carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;

  const slides = [...carousel.querySelectorAll('[data-slide]')];
  const dots = [...document.querySelectorAll('[data-dot]')];
  const toggle = document.querySelector('[data-toggle]');
  const caption = document.querySelector('[data-caption]');
  const captionSub = document.querySelector('[data-caption-sub]');
  const captionRequest = document.querySelector('[data-caption-request]');
  const captionLink = document.querySelector('[data-caption-link]');
  const counter = document.querySelector('[data-counter]');
  const hero = carousel.closest('.hero');
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
  let touchStartY = 0;
  let suppressClickUntil = 0;
  let offscreen = false;
  let explicitPlay = false;
  let moving = false;
  let pending = null;
  let captionAnimation;
  const motionMs = reduceMotion ? 0 : 500;
  const captionBox = caption.closest('.baseline-copy');
  const interactionRegions = [carousel, hero.querySelector('.hero-baseline')];

  const workUrl = slug => `works/${slug}.html`;
  const paused = () => manualPause || (!explicitPlay && (hoverPause || focusPause)) || offscreen || document.hidden;

  const schedule = () => {
    clearTimeout(timer);
    updateToggle();
    if (!paused()) timer = setTimeout(() => move(active + 1), 6500);
  };

  const updateToggle = () => {
    const stopped = paused();
    toggle.dataset.paused = String(stopped);
    toggle.setAttribute('aria-pressed', String(stopped));
    toggle.setAttribute('aria-label', stopped ? '播放自动轮播' : '暂停自动轮播');
  };

  // announce 只在用户主动切换时打开，避免自动轮播每 6.5 秒打断读屏用户
  function move(index, announce = false) {
    index = (index + slides.length) % slides.length;
    if (moving) { pending = { index, announce }; return; }
    const changed = index !== active;
    if (changed && motionMs) {
      moving = true;
      setTimeout(() => {
        moving = false;
        const next = pending;
        pending = null;
        if (next) move(next.index, next.announce);
      }, motionMs);
    }
    active = (index + slides.length) % slides.length;
    // Move focus before its previous slide becomes inert during repeated arrow navigation.
    const focused = slides.indexOf(document.activeElement);
    if (focused >= 0 && !['center', 'right', 'left'].includes(slotFor(focused))) {
      slides[active].inert = false;
      slides[active].removeAttribute('aria-hidden');
      slides[active].focus({ preventScroll: true });
    }
    slides.forEach((slide, slideIndex) => {
      const slot = slotFor(slideIndex);
      const isActive = slot === 'center';
      slide.dataset.slot = slot;
      slide.dataset.active = String(isActive);
      slide.setAttribute('aria-label', isActive
        ? `查看${captions[slideIndex][0]}作品详情`
        : `将${captions[slideIndex][0]}移至前景`);
      // 台侧那两张退出 Tab 键序列，只留台上三张可聚焦
      const visible = slot === 'center' || slot === 'right' || slot === 'left';
      if (visible) {
        const artwork = slide.querySelector('img');
        if (artwork.dataset.stageSrcset && artwork.srcset !== artwork.dataset.stageSrcset) {
          artwork.srcset = artwork.dataset.stageSrcset;
        }
      }
      slide.inert = !visible;
      if (visible) { slide.removeAttribute('tabindex'); slide.removeAttribute('aria-hidden'); }
      else { slide.setAttribute('tabindex', '-1'); slide.setAttribute('aria-hidden', 'true'); }
    });
    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === active;
      dot.dataset.active = String(isActive);
      dot.setAttribute('aria-pressed', String(isActive));
    });
    captionBox.setAttribute('aria-live', announce ? 'polite' : 'off');
    caption.textContent = captions[active][0];
    captionSub.textContent = captions[active][1];
    if (captionRequest) captionRequest.textContent = slides[active].dataset.request || '';
    if (captionLink) captionLink.href = workUrl(slides[active].dataset.art);
    if (counter) counter.textContent = String(active + 1).padStart(2, '0');
    if (changed && !reduceMotion) {
      captionAnimation?.cancel();
      captionAnimation = captionBox.animate([{ opacity: .25 }, { opacity: 1 }], { duration: motionMs, easing: 'ease-out' });
    }
    schedule();
  }
  const step = direction => move((pending?.index ?? active) + direction, true);

  // 点中间那张 = 打开详情页；点侧边那张 = 先把它转到前景
  const activate = slide => {
    const index = slides.indexOf(slide);
    if (index === -1) return;
    if (index === active && !moving) window.location.href = workUrl(slide.dataset.art);
    else move(index, true);
  };

  carousel.addEventListener('click', event => {
    if (Date.now() < suppressClickUntil) { event.preventDefault(); return; }
    const slide = event.target.closest('[data-slide]');
    if (!slide || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (moving && slides.indexOf(slide) === active) { event.preventDefault(); return; }
    // Real anchors keep details available without JavaScript and with modifier clicks.
    if (slides.indexOf(slide) !== active) { event.preventDefault(); activate(slide); }
  });

  // Enter/Space 作用在真正获得焦点的那张，而不是当前前景那张
  hero.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); return; }
    if (event.key === 'Enter' || event.key === ' ') {
      const slide = event.target.closest('[data-slide]');
      if (!slide) return;
      event.preventDefault();
      activate(slide);
    }
  });

  interactionRegions.forEach(region => {
    region.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      explicitPlay = false; hoverPause = true; schedule();
    });
    region.addEventListener('pointerleave', event => {
      if (event.pointerType === 'touch') return;
      hoverPause = false; schedule();
    });
  });
  hero.addEventListener('focusin', event => {
    explicitPlay = false;
    focusPause = interactionRegions.some(region => region.contains(event.target));
    schedule();
  });
  hero.addEventListener('focusout', event => {
    focusPause = interactionRegions.some(region => region.contains(event.relatedTarget));
    schedule();
  });
  carousel.addEventListener('touchstart', event => {
    touchStart = event.changedTouches[0].clientX;
    touchStartY = event.changedTouches[0].clientY;
  }, { passive: true });
  carousel.addEventListener('touchend', event => {
    const delta = event.changedTouches[0].clientX - touchStart;
    const deltaY = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(delta) > 55 && Math.abs(delta) > Math.abs(deltaY)) {
      suppressClickUntil = Date.now() + 450;
      step(delta < 0 ? 1 : -1);
    }
  }, { passive: true });

  document.querySelector('[data-prev]').addEventListener('click', () => step(-1));
  document.querySelector('[data-next]').addEventListener('click', () => step(1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => move(index, true)));
  toggle.addEventListener('click', () => {
    const resume = paused();
    manualPause = !resume;
    explicitPlay = resume;
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      offscreen = !entry.isIntersecting;
      schedule();
    }, { threshold: 0 }).observe(carousel);
  }

  updateToggle();
  move(0);
})();
