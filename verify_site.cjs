/**
 * 整站验证。断言的是「行为和几何」，不是「元素存不存在」——
 * 上一版只检查存在性，漏掉了弹窗打开后跑到视口外这类问题。
 *
 * 用法：先起 python -m http.server 18943，再 node verify_site.cjs
 * 默认用真实 Edge（headless shell 的滚动行为和真实浏览器不一致，会掩盖问题）。
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/zhou_yx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root = __dirname;
const base = 'http://127.0.0.1:18943/';
const BUDGET_MB = 1.2;                       // 首屏传输预算
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
fs.mkdirSync(path.join(root, 'screenshots'), { recursive: true });

const checks = [];
const check = (name, pass, detail) => { checks.push({ name, pass: Boolean(pass), detail }); };

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const report = { home: {}, mobile: {}, works: [], errors: [], checks };
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('response', response => {
    if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(base, { waitUntil: 'load' });
  await wait(3500);

  // ---- 首屏预算与字体 ----
  const budget = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    return {
      requests: resources.length,
      transferMB: +(resources.reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1048576).toFixed(2),
      fontKB: Math.round(resources.filter(r => r.name.endsWith('.woff2'))
        .reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024)
    };
  });
  check('首屏传输在预算内', budget.transferMB <= BUDGET_MB, `${budget.transferMB}MB / ${BUDGET_MB}MB`);

  const font = await page.evaluate(async () => {
    await document.fonts.ready;
    const chars = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim()) continue;
      if (!getComputedStyle(node.parentElement).fontFamily.startsWith('"Lineart Serif"')) continue;
      for (const ch of node.textContent) if (ch.trim()) chars.add(ch);
    }
    return {
      h1Family: getComputedStyle(document.querySelector('h1')).fontFamily.split(',')[0],
      serifChars: chars.size,
      loaded: [...document.fonts].filter(f => f.status === 'loaded').length
    };
  });
  check('大标题用的是自托管衬线体', font.h1Family === '"Lineart Serif"', font.h1Family);

  // ---- 网格：同一行的图片底边必须对齐 ----
  const alignment = await page.evaluate(() => {
    const rows = {};
    document.querySelectorAll('.art-item').forEach(el => {
      const rect = el.querySelector('.art-image').getBoundingClientRect();
      const key = Math.round(rect.top / 10) * 10;
      (rows[key] = rows[key] || []).push(Math.round(rect.bottom));
    });
    return Object.values(rows).filter(bottoms => new Set(bottoms).size > 1).length;
  });
  check('网格每一行的图片底边对齐', alignment === 0, `${alignment} 行错位`);

  // ---- 轮播 ----
  const activeSlug = () => page.locator('[data-carousel] [data-slide][data-active="true"]').getAttribute('data-art');
  const first = await activeSlug();
  await page.locator('[data-next]').click(); await wait(850);
  const second = await activeSlug();
  await page.locator('[data-next]').click(); await wait(850);
  const third = await activeSlug();
  check('轮播三张互不相同', new Set([first, second, third]).size === 3, [first, second, third].join(' → '));

  // 5 张参与轮转，但同一时刻台上只有 center/right/left 三张
  const stage = await page.evaluate(() => {
    const onstage = ['center', 'right', 'left'];
    const slots = [...document.querySelectorAll('[data-slide]')].map(s => s.dataset.slot);
    const visible = [...document.querySelectorAll('[data-slide]')].filter(s => {
      const cs = getComputedStyle(s);
      return +cs.opacity > 0.05 && cs.pointerEvents !== 'none';
    }).length;
    return {
      total: slots.length,
      dots: document.querySelectorAll('[data-dot]').length,
      onstage: slots.filter(x => onstage.includes(x)).length,
      visible,
      tabbable: [...document.querySelectorAll('[data-slide]')].filter(s => s.tabIndex >= 0).length
    };
  });
  check('轮播共 5 张、点位同步', stage.total === 5 && stage.dots === 5,
    `${stage.total} 张 / ${stage.dots} 个点`);
  check('同一时刻只展示 3 张', stage.onstage === 3 && stage.visible === 3,
    `槽位 ${stage.onstage} / 可见 ${stage.visible}`);
  check('台侧两张退出 Tab 序列', stage.tabbable === 3, `${stage.tabbable} 张可 Tab`);

  // 连点 5 次必须回到出发的那张（此刻前景是 third），且每一步台上都是 3 张
  const cycleStart = third;
  const cycle = [];
  for (let i = 0; i < 5; i++) {
    await page.locator('[data-next]').click(); await wait(820);
    cycle.push(await page.evaluate(() => {
      const onstage = ['center', 'right', 'left'];
      const slots = [...document.querySelectorAll('[data-slide]')].map(s => s.dataset.slot);
      return { active: document.querySelector('[data-slide][data-active="true"]').dataset.art,
               onstage: slots.filter(x => onstage.includes(x)).length };
    }));
  }
  check('轮播一圈回到起点', cycle[4].active === cycleStart,
    `${cycleStart} → ${cycle.map(c => c.active).join(' → ')}`);
  check('轮转过程中始终 3 张在台上', cycle.every(c => c.onstage === 3),
    cycle.map(c => c.onstage).join(','));
  const captionSync = await page.evaluate(() => {
    const active = document.querySelector('[data-slide][data-active="true"]');
    const all = [...document.querySelectorAll('[data-slide]')];
    return document.querySelector('[data-caption-request]').textContent === active.dataset.request
      && document.querySelector('[data-caption-link]').getAttribute('href') === active.getAttribute('href')
      && +document.querySelector('[data-counter]').textContent === all.indexOf(active) + 1;
  });
  check('作品、请求、详情链接与计数同步', captionSync);

  await page.locator('[data-toggle]').click();
  const held = await activeSlug(); await wait(5200);
  check('暂停后不再自动切换', held === await activeSlug());
  await page.locator('[data-toggle]').click();

  // 焦点在侧边那张时按 Enter，必须操作「聚焦的那张」而不是当前前景那张
  await page.goto(base, { waitUntil: 'networkidle' }); await wait(600);
  const keyboard = await page.evaluate(() => {
    const foreground = document.querySelector('[data-slide][data-active="true"]').dataset.art;
    const side = [...document.querySelectorAll('[data-slide]')].find(s => s.dataset.slot === 'left');
    side.focus();
    return { foreground, focused: side.dataset.art };
  });
  await page.keyboard.press('Enter'); await wait(900);
  const afterEnter = await activeSlug();
  check('轮播键盘激活作用在聚焦的那张上', afterEnter === keyboard.focused,
    `聚焦 ${keyboard.focused} / 结果 ${afterEnter}`);

  // ---- 点击作品：必须导航到详情页，且返回后恢复滚动位置 ----
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('a[data-art="f06-yor-forger"]').scrollIntoViewIfNeeded(); await wait(700);
  const scrollBefore = await page.evaluate(() => Math.round(window.scrollY));
  await page.locator('a[data-art="f06-yor-forger"]').click();
  await page.waitForLoadState('load'); await wait(500);
  check('点击作品跳转到独立详情页', /works\/f06-yor-forger\.html$/.test(page.url()), page.url());
  await page.goBack(); await wait(1400);
  const scrollAfter = await page.evaluate(() => Math.round(window.scrollY));
  check('返回后恢复画廊滚动位置', Math.abs(scrollAfter - scrollBefore) < 100,
    `${scrollBefore} → ${scrollAfter}`);

  // ---- 结构与元数据 ----
  const metrics = await page.evaluate(() => ({
    width: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    images: document.images.length,
    broken: [...document.images].filter(image => image.complete && !image.naturalWidth).length,
    galleryItems: document.querySelectorAll('#gallery a[data-art]').length,
    galleryChapters: document.querySelectorAll('.gallery-chapter').length,
    withSrcset: [...document.querySelectorAll('#gallery img')].every(i => i.srcset && i.sizes),
    chapterCounts: [...document.querySelectorAll('.gallery-index strong')].map(n => +n.textContent),
    chapterActual: [...document.querySelectorAll('.gallery-chapter')].map(s => s.querySelectorAll('.art-item').length),
    ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
    canonical: document.querySelector('link[rel="canonical"]')?.href || '',
    repoLinks: [...document.querySelectorAll('a[href*="github.com"]')].length,
    repoButtons: document.querySelectorAll('button[data-repo]').length,
    dialogs: document.querySelectorAll('dialog').length,
    h1: document.querySelectorAll('h1').length
  }));
  check('无横向溢出', metrics.documentWidth <= metrics.width, `${metrics.documentWidth} / ${metrics.width}`);
  check('39 件作品 3 个章节', metrics.galleryItems === 39 && metrics.galleryChapters === 3);
  check('章节计数与实际数量一致',
    JSON.stringify(metrics.chapterCounts) === JSON.stringify(metrics.chapterActual),
    `${metrics.chapterCounts} vs ${metrics.chapterActual}`);
  check('网格图片都有 srcset/sizes', metrics.withSrcset);
  check('og:image 是绝对 URL', /^https?:\/\//.test(metrics.ogImage), metrics.ogImage);
  check('首页有 canonical', /^https?:\/\//.test(metrics.canonical), metrics.canonical);
  check('GitHub 是真链接而不是按钮', metrics.repoLinks >= 2 && metrics.repoButtons === 0,
    `${metrics.repoLinks} 个链接 / ${metrics.repoButtons} 个按钮`);
  check('首页已无弹窗', metrics.dialogs === 0);
  check('唯一 h1', metrics.h1 === 1);
  report.home = { ...budget, ...font, ...metrics, first, second, third };

  await page.goto(base, { waitUntil: 'networkidle' }); await wait(1500);
  await page.screenshot({ path: path.join(root, 'screenshots', 'site-home-desktop.png') });
  await page.screenshot({ path: path.join(root, 'screenshots', 'site-home-desktop-full.png'), fullPage: true });

  // ---- 移动端 ----
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.on('pageerror', error => report.errors.push('mobile: ' + error.message));
  await mobile.goto(base, { waitUntil: 'networkidle' }); await wait(1200);
  report.mobile = await mobile.evaluate(() => {
    const small = [...document.querySelectorAll('.dot, .control-button, .nav-links a, .gallery-index a')]
      .map(el => el.getBoundingClientRect())
      .filter(r => r.width < 24 || r.height < 24).length;
    return {
      width: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      navLinks: document.querySelectorAll('.nav-links a').length,
      tooSmallTargets: small
    };
  });
  check('移动端无横向溢出', report.mobile.documentWidth <= report.mobile.width,
    `${report.mobile.documentWidth} / ${report.mobile.width}`);
  check('移动端保留全部四个导航项', report.mobile.navLinks === 4, `${report.mobile.navLinks} 个`);
  check('移动端触控目标不小于 24px', report.mobile.tooSmallTargets === 0,
    `${report.mobile.tooSmallTargets} 个偏小`);
  await mobile.screenshot({ path: path.join(root, 'screenshots', 'site-home-mobile.png') });
  await mobile.screenshot({ path: path.join(root, 'screenshots', 'site-home-mobile-full.png'), fullPage: true });
  await mobile.setViewportSize({ width: 320, height: 740 });
  const narrow = await mobile.evaluate(() => {
    const nav = document.querySelector('.nav').getBoundingClientRect();
    const navItems = [...document.querySelectorAll('.nav a')].map(a => a.getBoundingClientRect());
    const baseline = document.querySelector('.hero-baseline').getBoundingClientRect();
    const controls = document.querySelector('.controls').getBoundingClientRect();
    return navItems.every(r => r.left >= nav.left - 1 && r.right <= nav.right + 1 && r.height <= 44)
      && controls.right <= baseline.right + 1;
  });
  check('320px 导航不换行且控制条不越界', narrow);
  const nojs = await browser.newPage({ javaScriptEnabled: false });
  await nojs.goto(base);
  await nojs.locator('[data-slide][data-active="true"]').click();
  check('禁用 JavaScript 仍可打开首页作品', /works\/m01-gojo\.html$/.test(nojs.url()));
  await nojs.close();
  await mobile.close();

  // ---- 39 个详情页 ----
  const source = fs.readFileSync(path.join(root, 'assets', 'data.js'), 'utf8');
  const slugs = JSON.parse(source.replace(/^window\.LINEART_SITE\s*=\s*/, '').replace(/;\s*$/, ''))
    .samples.map(item => item.slug);
  for (const slug of slugs) {
    const work = await browser.newPage({ viewport: { width: 1100, height: 800 } });
    const errors = [];
    work.on('pageerror', error => errors.push(error.message));
    work.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await work.goto(`${base}works/${slug}.html`, { waitUntil: 'networkidle' });
    const result = await work.evaluate(() => ({
      title: document.querySelector('h1')?.textContent.trim(),
      broken: [...document.images].filter(i => i.complete && !i.naturalWidth).length,
      overflow: document.documentElement.scrollWidth > innerWidth,
      absoluteOg: /^https?:\/\//.test(document.querySelector('meta[property="og:image"]')?.content || ''),
      canonical: /^https?:\/\//.test(document.querySelector('link[rel="canonical"]')?.href || ''),
      hasPager: document.querySelectorAll('.work-stepper a[rel]').length === 2,
      hasPrompt: Boolean(document.querySelector('[data-prompt]')?.textContent.trim()),
      hasNotes: Boolean(document.querySelector('.work-notes')?.textContent.trim()),
      copyBeforePrompt: document.querySelector('[data-copy]').getBoundingClientRect().bottom < document.querySelector('[data-prompt]').getBoundingClientRect().top,
      loadsDataJs: [...document.scripts].some(s => s.src.includes('data.js'))
    }));
    report.works.push({ slug, ...result, errors });
    if (slug === 'miku') await work.screenshot({ path: path.join(root, 'screenshots', 'site-work-miku.png'), fullPage: true });
    await work.close();
  }
  // ---- 详情页：图片必须钉死不动，上下张导航必须始终可见 ----
  const detail = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await detail.goto(`${base}works/m01-gojo.html`, { waitUntil: 'networkidle' });
  await detail.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await detail.locator('[data-copy]').click();
  await detail.waitForFunction(() => document.querySelector('[data-copy]').textContent === '已复制');
  check('复制完整提示词且不混入创作要点', await detail.evaluate(async () =>
    (await navigator.clipboard.readText()).replace(/\r\n/g, '\n') === document.querySelector('[data-prompt]').textContent.replace(/\r\n/g, '\n')));
  await detail.screenshot({ path: path.join(root, 'screenshots', 'detail-refined.png') });
  await wait(900);
  const geom = () => detail.evaluate(() => {
    const img = document.querySelector('.work-media img').getBoundingClientRect();
    const next = document.querySelector('a[rel="next"]').getBoundingClientRect();
    return {
      imgTop: Math.round(img.top),
      navVisible: next.top >= 0 && next.bottom <= innerHeight + 1
    };
  });
  const atTop = await geom();
  await detail.evaluate(() => window.scrollTo(0, 99999)); await wait(800);
  const atBottom = await geom();
  check('详情页图片滚动时不位移', Math.abs(atBottom.imgTop - atTop.imgTop) <= 2,
    `${atTop.imgTop} → ${atBottom.imgTop}`);
  check('上下张导航始终完整可见', atTop.navVisible && atBottom.navVisible,
    `顶部 ${atTop.navVisible} / 底部 ${atBottom.navVisible}`);
  report.detailGeometry = { atTop, atBottom };
  await detail.close();

  const works = report.works;
  check('39 个详情页无破图无溢出', works.every(w => !w.broken && !w.overflow && w.title));
  check('详情页 og:image 与 canonical 都是绝对 URL', works.every(w => w.absoluteOg && w.canonical));
  check('详情页都有提示词和上下页', works.every(w => w.hasPrompt && w.hasPager));
  check('39 页创作要点齐全且复制入口位于提示词前', works.every(w => w.hasNotes && w.copyBeforePrompt));
  check('详情页不再加载 data.js', works.every(w => !w.loadsDataJs));
  check('详情页无报错', works.every(w => w.errors.length === 0),
    works.flatMap(w => w.errors).slice(0, 3).join(' | '));
  check('全站无控制台报错与 4xx', report.errors.length === 0, report.errors.slice(0, 3).join(' | '));

  {
  const narrow = await browser.newPage({ viewport: { width: 320, height: 740 } });
  await narrow.goto(base + '#how');
  await narrow.locator('.install-guide summary').first().click();
  await narrow.locator('.install-guide summary').nth(1).click();
  check('320px 安装说明展开后无溢出', await narrow.evaluate(() =>
    document.querySelectorAll('.install-guide details[open]').length === 2 && document.documentElement.scrollWidth <= innerWidth));
  await narrow.goto(base + 'works/m01-gojo.html', { waitUntil: 'networkidle' });
  await narrow.evaluate(() => document.fonts.ready);
  await narrow.locator('[data-copy]').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await narrow.waitForFunction(() => {
    const r = document.querySelector('[data-copy]').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight;
  });
  check('320px 详情复制按钮完整可见', await narrow.locator('[data-copy]').evaluate(el => {
    const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
  }));
  await narrow.screenshot({ path: path.join(root, 'screenshots', 'detail-refined-mobile.png') });
  await narrow.close();
  }

  report.passed = checks.filter(c => c.pass).length;
  report.failed = checks.filter(c => !c.pass).length;
  fs.writeFileSync(path.join(root, 'verification.json'), JSON.stringify(report, null, 2));
  for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? '  — ' + c.detail : ''}`);
  console.log(`\n${report.passed} passed, ${report.failed} failed`);
  await browser.close();
  process.exit(report.failed ? 1 : 0);
})().catch(error => { console.error(error); process.exit(1); });
