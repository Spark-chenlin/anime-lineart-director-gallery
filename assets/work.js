(() => {
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
  const status = document.querySelector('[data-status]');
  document.querySelector('[data-copy]')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    const ok = await copyText(document.querySelector('[data-prompt]').textContent);
    button.classList.toggle('is-copied', ok);
    button.textContent = ok ? '已复制 ✓' : '请手动复制';
    status.textContent = ok ? '提示词已复制到剪贴板。' : '复制失败，请选中提示词手动复制。';
    window.setTimeout(() => {
      button.classList.remove('is-copied');
      button.textContent = '复制提示词';
    }, 1800);
  });
  document.querySelector('[data-share]')?.addEventListener('click', async () => {
    const share = { title: document.title, text: document.querySelector('meta[name="description"]').content, url: location.href };
    if (navigator.share) {
      try { await navigator.share(share); status.textContent = '分享面板已打开。'; return; } catch (error) { if (error.name === 'AbortError') return; }
    }
    status.textContent = await copyText(location.href) ? '作品链接已复制。' : '无法复制链接，请从地址栏复制。';
  });
  document.querySelectorAll('[data-repo]').forEach(button => button.addEventListener('click', () => {
    const url = window.LINEART_SITE?.repoUrl;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else alert('暂时无法读取 GitHub 地址，请稍后重试。');
  }));
})();
