(() => {
  const site = window.LINEART_SITE || { samples: [] };
  const samples = site.samples || [];
  const bySlug = new Map(samples.map((item, index) => [item.slug, { item, index }]));
  const artDialog = document.querySelector('[data-art-dialog]');
  const repoDialog = document.querySelector('[data-repo-dialog]');
  let currentIndex = 0;
  let lastTrigger = null;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const copyText = async value => {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(value); return true; } catch {}
    }
    const input = document.createElement('textarea');
    input.value = value;
    input.style.cssText = 'position:fixed;left:-9999px;opacity:0';
    document.body.append(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    return copied;
  };

  const setDialogState = open => document.body.classList.toggle('dialog-open', open);

  function closeDialog(dialog, restoreFocus = true) {
    if (!dialog?.open) return;
    dialog.close();
    setDialogState(false);
    if (restoreFocus) lastTrigger?.focus?.({ preventScroll: true });
  }

  function artUrl(item) {
    return new URL(`works/${item.slug}.html`, window.location.href).href;
  }

  function renderArt(index, updateUrl = true) {
    currentIndex = (index + samples.length) % samples.length;
    const item = samples[currentIndex];
    const promptText = item.prompt + (item.negative ? `\n\n负面约束\n${item.negative}` : '');
    const promptBlock = item.prompt
      ? `<details open>
          <summary>原始提示词</summary>
          <pre class="prompt">${escapeHtml(promptText)}</pre>
          <div class="detail-actions">
            <button class="copy-button" type="button" data-copy>复制提示词</button>
            <button class="share-button" type="button" data-share>分享这张作品</button>
          </div>
          <div class="detail-status" data-status role="status" aria-live="polite"></div>
        </details>`
      : `<p class="detail-label">提示词记录</p>
         <p class="detail-muted">这张作品没有可展示的提示词记录。</p>
         <div class="detail-actions"><button class="share-button" type="button" data-share>分享这张作品</button></div>
         <div class="detail-status" data-status role="status" aria-live="polite"></div>`;

    artDialog.setAttribute('aria-label', `${item.title} · 作品详情`);
    artDialog.innerHTML = `
      <button class="dialog-close" type="button" data-close aria-label="关闭作品详情">×</button>
      <div class="detail">
        <div class="detail-media"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)} · ${escapeHtml(item.subtitle)}" width="${item.width}" height="${item.height}"></div>
        <div class="detail-info">
          <span class="dialog-kicker">SELECTED WORK · ${String(currentIndex + 1).padStart(2, '0')}</span>
          <h2>${escapeHtml(item.title)}</h2>
          <p class="detail-subtitle">${escapeHtml(item.subtitle)}</p>
          <div class="detail-rule"></div>
          <p class="detail-label">最初的创作请求</p>
          <p class="detail-request">${escapeHtml(item.originalRequest || '请根据角色主色生成一张带有 ChenLin 署名的日系动漫手写乱线速写。')}</p>
          ${promptBlock}
          <nav class="detail-pager" aria-label="切换作品">
            <button type="button" data-detail-prev>← 上一张</button>
            <span>${String(currentIndex + 1).padStart(2, '0')} / ${samples.length}</span>
            <button type="button" data-detail-next>下一张 →</button>
          </nav>
        </div>
      </div>`;

    artDialog.querySelector('[data-close]').addEventListener('click', () => closeArt());
    artDialog.querySelector('[data-detail-prev]').addEventListener('click', () => renderArt(currentIndex - 1));
    artDialog.querySelector('[data-detail-next]').addEventListener('click', () => renderArt(currentIndex + 1));
    artDialog.querySelector('[data-copy]')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      const ok = await copyText(promptText);
      const status = artDialog.querySelector('[data-status]');
      button.classList.toggle('is-copied', ok);
      button.textContent = ok ? '已复制 ✓' : '请手动复制';
      status.textContent = ok ? '提示词已复制到剪贴板。' : '复制失败，请选中提示词手动复制。';
      window.setTimeout(() => {
        if (!button.isConnected) return;
        button.classList.remove('is-copied');
        button.textContent = '复制提示词';
      }, 1800);
    });
    artDialog.querySelector('[data-share]')?.addEventListener('click', async () => {
      const share = { title: `${item.title}｜动漫手绘线稿导演`, text: `${item.title} · ${item.subtitle}`, url: artUrl(item) };
      const status = artDialog.querySelector('[data-status]');
      if (navigator.share) {
        try { await navigator.share(share); status.textContent = '分享面板已打开。'; return; } catch (error) { if (error.name === 'AbortError') return; }
      }
      status.textContent = await copyText(share.url) ? '作品链接已复制。' : '无法复制链接，请从地址栏复制。';
    });

    if (!artDialog.open) {
      artDialog.showModal();
      setDialogState(true);
    }
    artDialog.querySelector('.detail-info').scrollTop = 0;
    artDialog.querySelector('[data-close]').focus({ preventScroll: true });
    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set('work', item.slug);
      history.replaceState({ work: item.slug }, '', url);
    }
  }

  function openArt(slug, trigger = null, updateUrl = true) {
    const entry = bySlug.get(slug);
    if (!entry) return;
    lastTrigger = trigger || lastTrigger;
    renderArt(entry.index, updateUrl);
  }

  function closeArt(updateUrl = true) {
    closeDialog(artDialog);
    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.delete('work');
      history.replaceState({}, '', url);
    }
  }

  document.addEventListener('click', event => {
    const repo = event.target.closest('[data-repo]');
    if (repo) {
      event.preventDefault();
      if (site.repoUrl) {
        window.open(site.repoUrl, '_blank', 'noopener,noreferrer');
      } else {
        lastTrigger = repo;
        repoDialog.showModal();
        setDialogState(true);
        repoDialog.querySelector('[data-close]').focus({ preventScroll: true });
      }
      return;
    }

    const art = event.target.closest('[data-art]');
    if (!art || art.closest('[data-carousel]')) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openArt(art.dataset.art, art);
  });

  repoDialog?.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(repoDialog)));
  [artDialog, repoDialog].forEach(dialog => {
    dialog?.addEventListener('click', event => {
      if (event.target === dialog) closeDialog(dialog);
    });
    dialog?.addEventListener('cancel', event => {
      event.preventDefault();
      dialog === artDialog ? closeArt() : closeDialog(repoDialog);
    });
  });
  artDialog?.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); renderArt(currentIndex - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); renderArt(currentIndex + 1); }
  });

  const carousel = document.querySelector('[data-carousel]');
  if (carousel) {
    const slides = [...carousel.querySelectorAll('[data-slide]')];
    const dots = [...document.querySelectorAll('[data-dot]')];
    const captions = slides.map(slide => {
      const entry = bySlug.get(slide.dataset.art)?.item;
      return [entry?.title || '', entry?.subtitle || ''];
    });
    const slots = ['center', 'right', 'left'];
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const toggle = document.querySelector('[data-toggle]');
    let active = 0;
    let manualPause = reduceMotion;
    let hoverPause = false;
    let timer = null;
    let touchStart = 0;

    const paused = () => manualPause || hoverPause || document.hidden || artDialog.open || repoDialog.open;
    const schedule = () => {
      clearTimeout(timer);
      if (!paused()) timer = setTimeout(() => move(active + 1), 4800);
    };
    const updateToggle = () => {
      toggle.textContent = manualPause ? '▶' : 'Ⅱ';
      toggle.setAttribute('aria-label', manualPause ? '播放自动轮播' : '暂停自动轮播');
    };
    function move(index) {
      active = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        const relative = (slideIndex - active + slides.length) % slides.length;
        slide.dataset.slot = slots[relative];
        const isActive = relative === 0;
        slide.dataset.active = String(isActive);
        slide.setAttribute('aria-label', isActive ? `查看${captions[slideIndex][0]}作品详情` : `将${captions[slideIndex][0]}移至前景`);
      });
      dots.forEach((dot, index) => dot.dataset.active = String(index === active));
      document.querySelector('[data-caption]').textContent = captions[active][0];
      document.querySelector('[data-caption-sub]').textContent = captions[active][1];
      schedule();
    }

    carousel.addEventListener('click', event => {
      const slide = event.target.closest('[data-slide]');
      if (!slide) return;
      event.preventDefault();
      const index = slides.indexOf(slide);
      if (index === active) openArt(slide.dataset.art, slide);
      else move(index);
    }, true);
    carousel.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(active - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); move(active + 1); }
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openArt(slides[active].dataset.art, slides[active]); }
    });
    carousel.addEventListener('pointerenter', () => { hoverPause = true; schedule(); });
    carousel.addEventListener('pointerleave', () => { hoverPause = false; schedule(); });
    carousel.addEventListener('touchstart', event => { touchStart = event.changedTouches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend', event => {
      const delta = event.changedTouches[0].clientX - touchStart;
      if (Math.abs(delta) > 55) move(active + (delta < 0 ? 1 : -1));
    }, { passive: true });
    document.querySelector('.hero-baseline [data-prev]').addEventListener('click', () => move(active - 1));
    document.querySelector('.hero-baseline [data-next]').addEventListener('click', () => move(active + 1));
    dots.forEach((dot, index) => dot.addEventListener('click', () => move(index)));
    toggle.addEventListener('click', () => { manualPause = !manualPause; updateToggle(); schedule(); });
    document.addEventListener('visibilitychange', schedule);
    [artDialog, repoDialog].forEach(dialog => {
      dialog.addEventListener('close', schedule);
    });
    updateToggle();
    move(0);
  }

  const requested = new URL(window.location.href).searchParams.get('work');
  if (requested && bySlug.has(requested)) openArt(requested, null, false);
})();
