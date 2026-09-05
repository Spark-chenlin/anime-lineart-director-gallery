const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/zhou_yx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root = __dirname;
const base = 'http://127.0.0.1:18943/';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
fs.mkdirSync(path.join(root, 'screenshots'), { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { home: {}, mobile: {}, works: [], errors: [] };
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelectorAll('img').forEach(image => image.loading = 'eager');
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
  });

  const activeSlug = () => page.locator('[data-carousel] [data-slide][data-active="true"]').getAttribute('data-art');
  const first = await activeSlug();
  await page.locator('.hero-baseline [data-next]').click(); await wait(850);
  const second = await activeSlug();
  await page.locator('.hero-baseline [data-next]').click(); await wait(850);
  const third = await activeSlug();
  await page.locator('[data-toggle]').click();
  const held = await activeSlug(); await wait(5100);
  const paused = held === await activeSlug();
  await page.locator('[data-toggle]').click();

  const active = page.locator('[data-carousel] [data-slide][data-active="true"]');
  const activeBeforeDialog = await active.getAttribute('data-art');
  await active.click();
  await page.locator('[data-art-dialog][open]').waitFor();
  const dialogTitle = await page.locator('[data-art-dialog] h2').textContent();
  const urlHasWork = new URL(page.url()).searchParams.get('work') === activeBeforeDialog;
  await page.screenshot({ path: path.join(root, 'screenshots', 'site-detail-desktop.png') });
  await page.keyboard.press('Escape');

  const repoTruthful = await page.evaluate(() => window.LINEART_SITE?.repoUrl === 'https://github.com/Spark-chenlin/anime-lineart-director');

  const metrics = await page.evaluate(() => ({
    width: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    images: document.images.length,
    broken: [...document.images].filter(image => !image.naturalWidth).length,
    uniqueArt: new Set([...document.querySelectorAll('[data-art]')].map(node => node.dataset.art)).size,
    galleryItems: document.querySelectorAll('#gallery a[data-art]').length,
    galleryChapters: document.querySelectorAll('.gallery-chapter').length,
    excludesDeku: !document.querySelector('[data-art="m06-deku"]'),
    keepsArchive: ['miku','nino','itsuki','yotsuba','ichika','marin','anna'].every(slug => document.querySelector(`[data-art="${slug}"]`)),
    workLinks: [...document.querySelectorAll('#gallery a[data-art]')].every(link => /works\/.+\.html$/.test(link.getAttribute('href'))),
    sections: ['gallery', 'about', 'how'].every(id => document.getElementById(id)),
    heading: document.querySelector('h1')?.textContent.trim()
  }));
  report.home = { first, second, third, threeDistinct: new Set([first, second, third]).size === 3, paused, dialogTitle, urlHasWork, repoTruthful, ...metrics };
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(root, 'screenshots', 'site-home-desktop.png') });
  await page.screenshot({ path: path.join(root, 'screenshots', 'site-home-desktop-full.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(async () => Promise.all([...document.images].slice(0, 4).map(image => image.decode().catch(() => {}))));
  report.mobile = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, heroBottom: Math.round(document.querySelector('.hero').getBoundingClientRect().bottom), viewportHeight: innerHeight }));
  await page.screenshot({ path: path.join(root, 'screenshots', 'site-home-mobile.png') });
  await page.screenshot({ path: path.join(root, 'screenshots', 'site-home-mobile-full.png'), fullPage: true });

  const dataSource = fs.readFileSync(path.join(root, 'assets', 'data.js'), 'utf8');
  const slugs = JSON.parse(dataSource.replace(/^window\.LINEART_SITE\s*=\s*/, '').replace(/;\s*$/, '')).samples.map(item => item.slug);
  for (const slug of slugs) {
    const work = await browser.newPage({ viewport: { width: 1100, height: 800 } });
    const errors = [];
    work.on('pageerror', error => errors.push(error.message));
    await work.goto(`${base}works/${slug}.html`, { waitUntil: 'networkidle' });
    const result = await work.evaluate(() => ({
      status: document.readyState,
      title: document.querySelector('h1')?.textContent.trim(),
      broken: [...document.images].filter(image => !image.naturalWidth).length,
      overflow: document.documentElement.scrollWidth > innerWidth,
      hasPrevious: Boolean(document.querySelector('.work-pager a:first-child')),
      hasNext: Boolean(document.querySelector('.work-pager a:last-child')),
      hasShare: Boolean(document.querySelector('[data-share]'))
    }));
    report.works.push({ slug, ...result, errors });
    if (slug === 'miku') await work.screenshot({ path: path.join(root, 'screenshots', 'site-work-miku.png'), fullPage: true });
    await work.close();
  }

  fs.writeFileSync(path.join(root, 'verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
