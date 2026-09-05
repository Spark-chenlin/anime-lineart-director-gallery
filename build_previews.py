"""Build two isolated homepage concepts using the existing gallery and artwork."""
import json
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
source = (ROOT / 'index.html').read_text(encoding='utf-8')
samples = {item['slug']: item for item in json.loads((ROOT / 'content/new_samples.json').read_text(encoding='utf-8'))}
order = ['m01-gojo', 'f07-bocchi', 'c28-mitsuha-taki', 'f21-ai-hoshino', 'm02-sung-jinwoo']
artworks = [{key: samples[slug][key] for key in ('slug', 'title', 'subtitle', 'originalRequest')} for slug in order]
nav = re.search(r'<header class="site-header">.*?</header>', source, re.S)[0]
nav = nav.replace('<small>anime lineart director</small>', '')
lower = source[source.index('    <section class="gallery-section"'):source.index('  </main>')]
archived = ROOT / 'preview-a.html'
if archived.exists() and 'id="about"' not in lower:
    intro = re.search(r'    <section class="about-section.*?</section>', archived.read_text(encoding='utf-8'), re.S)
    if intro:
        lower = intro[0] + lower
lower = lower.replace('它导演的，<br>不只是“画风”。', '从人物到笔触，<br>都有章法。')
prev = re.search(r'<button class="control-button"[^>]*data-prev.*?(<svg.*?</svg>)', source, re.S)[1]
next_icon = re.search(r'<button class="control-button"[^>]*data-next.*?(<svg.*?</svg>)', source, re.S)[1]

def actions():
    return '<div class="preview-actions"><a class="primary-action" href="https://github.com/Spark-chenlin/anime-lineart-director" target="_blank" rel="noopener noreferrer">获取 Skill</a><a class="secondary-action" href="#gallery">浏览作品 <span aria-hidden="true">→</span></a></div>'

def controls():
    return f'<div class="preview-controls" role="group" aria-label="切换精选作品"><button type="button" data-preview-prev aria-label="上一张">{prev}</button><span class="preview-counter"><b data-preview-counter>01</b> / 05</span><button type="button" data-preview-next aria-label="下一张">{next_icon}</button></div>'

def img(slug, extra=''):
    s = samples[slug]
    return f'<img src="assets/gallery/{slug}.webp" alt="{escape(s["title"] + "，" + s["subtitle"])}" width="1086" height="1448" decoding="async" {extra}>'

copy = '说出人物、动作与情绪，让 Skill 为你组织构图、墨色与笔触。'
cards = ''
for i, slug in enumerate(order):
    slot = ['center', 'right', 'hidden', 'hidden', 'left'][i]
    cards += f'<a class="cover-art" href="works/{slug}.html" data-preview-art="{i}" data-slot="{slot}" aria-label="查看{escape(samples[slug]["title"])}作品"{(" tabindex=\"-1\" aria-hidden=\"true\"" if slot == "hidden" else "")}>{img(slug, "fetchpriority=\"high\"" if i == 0 else "")}</a>'

cover = f'''<section class="cover-hero" aria-labelledby="preview-title">
  <div class="cover-heading"><p class="preview-eyebrow">OPEN SOURCE · ANIME LINEART DIRECTOR</p>
  <h1 id="preview-title">一句想象，落笔成画。</h1><p class="preview-copy">{copy}</p>{actions()}</div>
  <div class="cover-stage" data-preview-stage aria-label="精选作品，左右方向键切换">{cards}</div>
  <div class="cover-baseline"><div class="cover-caption" aria-live="polite"><a href="works/m01-gojo.html" data-preview-link><strong data-preview-title>五条悟 · 深靛墨线</strong></a><p data-preview-request>画五条悟抬手扶住眼罩，用深靛蓝乱线速写。</p></div><span class="baseline-rule" aria-hidden="true"></span>{controls()}</div>
</section><div class="preview-transition"><h2>从人物到笔触，都有章法。</h2><p>单人角色、双人互动与系列创作，从你的一句话开始。</p></div>'''

exhibit = f'''<section class="exhibit-hero" aria-labelledby="preview-title">
  <div class="exhibit-rail" aria-hidden="true"><span>●</span>SELECTED WORKS</div>
  <a class="exhibit-art" data-preview-link data-preview-stage href="works/f07-bocchi.html" aria-label="查看精选作品详情">{img('f07-bocchi', 'fetchpriority="high"')}</a>
  <div class="exhibit-copy"><p class="preview-eyebrow">ANIME LINEART DIRECTOR</p><h1 id="preview-title"><span>一句想象，</span><span>落笔成画。</span></h1><p class="preview-copy">{copy}</p>{actions()}
  <div class="exhibit-caption"><div aria-live="polite"><a data-preview-link href="works/f07-bocchi.html"><strong data-preview-title>后藤一里</strong></a><p data-preview-subtitle>玫粉 · 吉他与发饰</p></div>{controls()}</div></div>
  <div class="exhibit-type" aria-hidden="true">LINEART</div>
</section><div class="exhibit-transition">从人物到笔触，都有章法。</div>'''

for variant, hero in [('a', cover), ('b', exhibit)]:
    name = '画册封面' if variant == 'a' else '非对称画展'
    data = artworks if variant == 'a' else artworks[1:] + artworks[:1]
    page = f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>{name} · 首页预览</title><link rel="icon" href="favicon.svg"><link rel="preload" href="assets/fonts/noto-serif-sc-subset.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="assets/styles.css"><link rel="stylesheet" href="assets/preview.css"></head>
<body class="preview-page preview-{variant}"><a class="skip-link" href="#top">跳到主要内容</a>{nav}<main id="top">{hero}{lower}</main>
<footer class="site-footer shell"><p>动漫手绘线稿导演 · 作品、提示词与创作方法。</p><p>画廊中的动漫角色用于非官方的风格展示，相关权利归原权利方所有。</p></footer>
<nav class="preview-switch" aria-label="首页版本对比"><span>首页预览</span><a href="preview-a.html" {('aria-current="page"' if variant == 'a' else '')}>A 画册</a><a href="preview-b.html" {('aria-current="page"' if variant == 'b' else '')}>B 画展</a><a href="index.html">正式首页</a></nav>
<script type="application/json" id="preview-data">{json.dumps(data, ensure_ascii=False).replace('</', '<\\/')}</script><script src="assets/preview.js"></script></body></html>'''
    (ROOT / f'preview-{variant}.html').write_text(page, encoding='utf-8')
    print(f'Built preview-{variant}.html')
