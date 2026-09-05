"""Build the static gallery, responsive thumbnails and standalone detail pages."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
GENERATED_ROOT = ROOT / "assets" / "generated"
GALLERY_ROOT = ROOT / "assets" / "gallery"
THUMB_ROOT = ROOT / "assets" / "thumbs"
CONTENT_ROOT = ROOT / "content"
VERSION = "3.4.2"
REPO_URL = "https://github.com/Spark-chenlin/anime-lineart-director"

# 站点最终地址。域名定下来后只改这一行再跑一次 build_site.py，
# 所有 og:image / og:url / canonical / sitemap 都会跟着更新。
SITE_ORIGIN = "https://spark-chenlin.github.io/anime-lineart-director-gallery"

# 网格里每张图的候选宽度。原图（1086w 或 1448w）作为最大档由 srcset 自动补上。
THUMB_WIDTHS = (400, 800)

# 单列卡片和跨两列卡片在各断点下的实际渲染宽度。
SIZES_TALL = "(max-width: 800px) 46vw, (max-width: 1304px) 24vw, 295px"
SIZES_WIDE = "(max-width: 800px) 92vw, (max-width: 1304px) 48vw, 610px"
SIZES_SLIDE = "(max-width: 800px) 64vw, 340px"

LEGACY_KEEP = ["miku", "nino", "itsuki", "yotsuba", "ichika", "marin", "anna"]
LEGACY_REQUESTS = {
    "miku": "画中野三玖扶住耳机、安静抬眼看向镜头，用深靛蓝乱线做成角色海报，并加入英文角色名和署名。",
    "nino": "画中野二乃捏住制服领结、自信直视镜头，用蓝紫色乱线做成角色海报，并加入英文角色名和署名。",
    "itsuki": "画中野五月整理领口丝带、温柔看向镜头，用暖红色乱线做成角色海报，并加入英文角色名和署名。",
    "yotsuba": "画中野四叶抬手挥动、轻快前倾，用墨绿色乱线做成动态角色海报，并加入英文角色名和署名。",
    "ichika": "画中野一花抬手触碰耳饰、露出从容微笑，用黄橙色乱线做成角色海报，并加入英文角色名和署名。",
    "marin": "画喜多川海梦抬手整理耳侧头发、自信微笑，用玫红色乱线做成角色海报，并加入英文角色名和署名。",
    "anna": "画山田杏奈双手捧着零食、腼腆微笑，用深靛蓝乱线突出黑长发密度，并加入英文角色名。",
}

SECTION_SPECS = [
    ("characters", "01", "角色研究", "CHARACTER STUDIES", "单人身份、手势、动作与角色主色"),
    ("relationships", "02", "关系与动作", "RELATIONSHIPS", "双人线场、接触、距离与承重"),
    ("archive", "03", "系列档案", "SERIES ARCHIVE", "五姐妹、海梦与山田杏奈早期样图"),
]

CN_DIGITS = "零一二三四五六七八九"


def esc(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def cn_number(value: int) -> str:
    """把 1-99 写成中文数字，用于正文里的『全部三十九幅作品』。"""
    if value < 10:
        return CN_DIGITS[value]
    tens, ones = divmod(value, 10)
    head = "" if tens == 1 else CN_DIGITS[tens]
    return f"{head}十{CN_DIGITS[ones] if ones else ''}"


def absolute(path: str) -> str:
    return f"{SITE_ORIGIN.rstrip('/')}/{path.lstrip('/')}"


def build_thumbs(slug: str, source: Path, width: int, height: int) -> list[tuple[int, str]]:
    """为网格生成小尺寸 WebP，返回 (宽度, 相对路径) 列表（含原图这一档）。"""
    THUMB_ROOT.mkdir(parents=True, exist_ok=True)
    variants: list[tuple[int, str]] = []
    for target in THUMB_WIDTHS:
        if target >= width:
            continue
        out = THUMB_ROOT / f"{slug}-{target}.webp"
        if not out.exists() or out.stat().st_mtime < source.stat().st_mtime:
            with Image.open(source) as im:
                resized = im.convert("RGB").resize(
                    (target, round(target * height / width)), Image.LANCZOS)
                resized.save(out, "WEBP", quality=82, method=6)
        variants.append((target, f"assets/thumbs/{slug}-{target}.webp"))
    return variants


def srcset(item: dict, prefix: str = "") -> str:
    parts = [f"{prefix}{path} {w}w" for w, path in item["variants"]]
    parts.append(f"{prefix}{item['image']} {item['width']}w")
    return ", ".join(parts)


def prepare_new() -> list[dict]:
    raw = json.loads((CONTENT_ROOT / "new_samples.json").read_text(encoding="utf-8"))
    prompt_records = json.loads((CONTENT_ROOT / "original_prompts_zh.json").read_text(encoding="utf-8"))
    if set(prompt_records) != {item["slug"] for item in raw}:
        raise ValueError("original_prompts_zh.json must contain exactly one record for every new sample")
    GALLERY_ROOT.mkdir(parents=True, exist_ok=True)
    result = []
    for item in raw:
        item = dict(item)
        item.setdefault("section", "characters")
        item.setdefault("special", "")
        item.setdefault("text", "ChenLin")
        source = GENERATED_ROOT / item.pop("folder") / f"{item['slug']}.png"
        optimized = GALLERY_ROOT / f"{item['slug']}.webp"
        if not source.exists():
            source = optimized
        if not source.exists():
            raise FileNotFoundError(f"Missing source image: {source}")
        with Image.open(source) as im:
            item["width"], item["height"] = im.size
            if source != optimized:
                im.convert("RGB").save(optimized, "WEBP", quality=88, method=6)
        item.update({
            "image": f"assets/gallery/{item['slug']}.webp",
            "variants": build_thumbs(item["slug"], source, item["width"], item["height"]),
            "prompt": prompt_records[item["slug"]]["prompt"],
            "negative": "",
            "requestSource": "input_example",
            "promptSource": "translated_original",
            "promptRounds": prompt_records[item["slug"]].get("rounds", 1),
            "sourceType": "new",
            "model": "OpenAI ImageGen（内置工具）",
            "skillVersion": VERSION,
        })
        result.append(item)
    return result


def prepare_legacy() -> list[dict]:
    raw = json.loads((CONTENT_ROOT / "legacy_samples.json").read_text(encoding="utf-8"))
    by_slug = {item["slug"]: item for item in raw}
    result = []
    for i, slug in enumerate(LEGACY_KEEP, 1):
        item = dict(by_slug[slug])
        image_path = ROOT / "assets" / f"{slug}.webp"
        if not image_path.exists():
            raise FileNotFoundError(f"Missing legacy image: {image_path}")
        with Image.open(image_path) as im:
            item["width"], item["height"] = im.size
        item.update({
            "code": f"A{i:02d}", "section": "archive", "sourceType": "archive",
            "originalRequest": LEGACY_REQUESTS[slug], "requestSource": "input_example",
            "promptSource": "saved", "image": f"assets/{slug}.webp",
            "variants": build_thumbs(slug, image_path, item["width"], item["height"]),
        })
        result.append(item)
    return result


def public_item(item: dict) -> dict:
    hidden = {"subject", "event", "palette", "special", "text", "sourceSession", "prompt", "negative"}
    return {key: value for key, value in item.items() if key not in hidden}


def build_data(samples: list[dict]) -> None:
    """首页只需要轮播说明文字，提示词正文留在各自的详情页里。"""
    payload = {"repoUrl": REPO_URL, "version": VERSION, "author": "尘林 Spark",
               "samples": [public_item(x) for x in samples]}
    (ROOT / "assets" / "data.js").write_text(
        "window.LINEART_SITE = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8"
    )


def is_wide(item: dict) -> bool:
    return item["width"] / item["height"] > 1.12


def gallery_card(item: dict, number: int) -> str:
    wide = is_wide(item)
    cls = "art-item art-wide" if wide else "art-item"
    return (
        f'<a class="{cls}" href="works/{esc(item["slug"])}.html" data-art="{esc(item["slug"])}">'
        f'<span class="art-image"><img src="{esc(item["variants"][0][1] if item["variants"] else item["image"])}" '
        f'srcset="{esc(srcset(item))}" sizes="{SIZES_WIDE if wide else SIZES_TALL}" '
        f'alt="{esc(item["title"])}，{esc(item["subtitle"])}" '
        f'width="{item["width"]}" height="{item["height"]}" loading="lazy" decoding="async"></span>'
        f'<span class="art-meta"><i>{number:02d}</i><b>{esc(item["title"])}</b>'
        f'<em>{esc(item["subtitle"])}</em></span></a>'
    )


def build_gallery(samples: list[dict]) -> str:
    numbers = {item["slug"]: i for i, item in enumerate(samples, 1)}
    blocks = []
    for section, number, title, english, desc in SECTION_SPECS:
        rows = [item for item in samples if item["section"] == section]
        cards = "\n".join(gallery_card(item, numbers[item["slug"]]) for item in rows)
        blocks.append(f"""<section class="gallery-chapter" id="gallery-{section}" aria-labelledby="gallery-{section}-title">
          <header class="gallery-chapter-head"><span>{number} / {english}</span><h3 id="gallery-{section}-title">{title}</h3><p>{len(rows)} 张 · {desc}</p></header>
          <div class="gallery-grid">{cards}</div>
        </section>""")
    return "\n".join(blocks)


def build_index_nav(samples: list[dict]) -> str:
    links = []
    for section, _, title, _, _ in SECTION_SPECS:
        count = sum(1 for item in samples if item["section"] == section)
        links.append(f'<a href="#gallery-{section}"><strong>{count:02d}</strong><span>{title}</span></a>')
    return "".join(links)


def build_slides(samples: list[dict], slugs: list[str]) -> str:
    """首页 hero 轮播：三张精选，第一张作为 LCP 高优先级加载。"""
    slots = ["center", "right", "left"]
    out = []
    for index, slug in enumerate(slugs):
        item = next(x for x in samples if x["slug"] == slug)
        active = ' data-active="true"' if index == 0 else ""
        priority = ' fetchpriority="high"' if index == 0 else ' loading="lazy"'
        label = (f"查看{item['title']}作品详情" if index == 0 else f"将{item['title']}移至前景")
        out.append(
            f'<button class="slide" type="button" data-slide data-art="{esc(slug)}" '
            f'data-title="{esc(item["title"])}" data-subtitle="{esc(item["subtitle"])}" '
            f'data-slot="{slots[index]}"{active} aria-label="{esc(label)}">'
            f'<img src="{esc(item["variants"][-1][1] if item["variants"] else item["image"])}" '
            f'srcset="{esc(srcset(item))}" sizes="{SIZES_SLIDE}" '
            f'alt="{esc(item["title"])}，{esc(item["subtitle"])}" '
            f'width="{item["width"]}" height="{item["height"]}" decoding="async"{priority}></button>'
        )
    return "\n          ".join(out)


def replace_block(text: str, name: str, body: str, indent: str = "        ") -> str:
    start_marker, end_marker = f"<!-- {name}_START -->", f"<!-- {name}_END -->"
    start = text.index(start_marker) + len(start_marker)
    end = text.index(end_marker)
    return text[:start] + "\n" + body + "\n" + indent + text[end:]


def update_index(samples: list[dict], hero_slugs: list[str]) -> None:
    path = ROOT / "index.html"
    text = path.read_text(encoding="utf-8")
    text = replace_block(text, "GALLERY", build_gallery(samples))
    text = replace_block(text, "INDEXNAV", build_index_nav(samples), indent="        ")
    text = replace_block(text, "SLIDES", "          " + build_slides(samples, hero_slugs), indent="        ")
    text = replace_block(text, "GALLERYCOUNT", f"查看全部{cn_number(len(samples))}幅作品", indent="")
    text = replace_block(text, "PRELOAD",
                         f'  <link rel="preload" as="image" fetchpriority="high" '
                         f'href="{esc(next(x for x in samples if x["slug"] == hero_slugs[0])["variants"][-1][1])}">',
                         indent="")
    text = replace_block(text, "VERSION", f"v{VERSION} · by 尘林 Spark", indent="")
    text = replace_block(text, "CANONICAL",
                         f'  <link rel="canonical" href="{SITE_ORIGIN}/">\n'
                         f'  <meta property="og:url" content="{SITE_ORIGIN}/">\n'
                         f'  <meta property="og:image" content="{absolute("assets/share/cover.jpg")}">\n'
                         f'  <meta name="twitter:image" content="{absolute("assets/share/cover.jpg")}">',
                         indent="")
    path.write_text(text, encoding="utf-8")


ICON_BACK = ('<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">'
             '<path d="M10 3 5 8l5 5"/></svg>')
ICON_FORWARD = ('<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">'
                '<path d="m6 3 5 5-5 5"/></svg>')
ICON_EXTERNAL = ('<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">'
                 '<path d="M6 3h7v7M13 3 4 12"/></svg>')
ICON_GRID = ('<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">'
             '<path d="M2.5 2.5h4v4h-4zM9.5 2.5h4v4h-4zM2.5 9.5h4v4h-4zM9.5 9.5h4v4h-4z"/></svg>')


def build_work(item: dict, index: int, samples: list[dict]) -> str:
    previous, following = samples[(index - 1) % len(samples)], samples[(index + 1) % len(samples)]
    prompt_text = item.get("prompt", "") + (("\n\n负面约束\n" + item["negative"]) if item.get("negative") else "")
    image_path = "../" + item["image"]
    page_url = absolute(f"works/{item['slug']}.html")
    share_image = absolute(f"assets/share/{item['slug']}.jpg")
    return f"""<!doctype html><html lang="zh-CN"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#ffffff">
  <meta name="description" content="{esc(item['title'])} · {esc(item['subtitle'])}。查看作品大图、创作请求与提示词。">
  <link rel="canonical" href="{page_url}">
  <meta property="og:type" content="article"><meta property="og:site_name" content="动漫手绘线稿导演"><meta property="og:url" content="{page_url}"><meta property="og:title" content="{esc(item['title'])}｜动漫手绘线稿导演"><meta property="og:description" content="{esc(item['subtitle'])} · 查看作品大图与提示词。"><meta property="og:image" content="{share_image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{share_image}">
  <title>{esc(item['title'])}｜动漫手绘线稿导演</title>
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="preload" href="../assets/fonts/noto-serif-sc-subset.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" as="image" fetchpriority="high" href="{esc(image_path)}">
  <link rel="stylesheet" href="../assets/work.css"></head><body>
  <header class="work-header"><nav class="work-nav shell" aria-label="作品导航"><a class="back-link" href="../index.html#gallery">{ICON_BACK}返回全部作品</a><a class="work-wordmark" href="../index.html">动漫手绘线稿导演</a><a class="repo-link" href="{REPO_URL}" target="_blank" rel="noopener noreferrer">GitHub{ICON_EXTERNAL}</a></nav></header>
  <main class="work-main"><div class="work-layout">
  <div class="work-media-col"><figure class="work-media"><img src="{esc(image_path)}" alt="{esc(item['title'])}，{esc(item['subtitle'])}" width="{item['width']}" height="{item['height']}" fetchpriority="high" decoding="async"></figure>
  <nav class="work-stepper" aria-label="切换作品"><a class="step-prev" href="{esc(previous['slug'])}.html" rel="prev">{ICON_BACK}<span><small>PREVIOUS</small><strong>{esc(previous['title'])}</strong></span></a><span class="step-index"><a href="../index.html#gallery" aria-label="回到全部作品">{ICON_GRID}</a>{index + 1:02d} / {len(samples):02d}</span><a class="step-next" href="{esc(following['slug'])}.html" rel="next"><span><small>NEXT</small><strong>{esc(following['title'])}</strong></span>{ICON_FORWARD}</a></nav></div>
  <article class="work-copy"><span class="section-number">SELECTED WORK · {index + 1:02d} / {len(samples):02d}</span><h1>{esc(item['title'])}</h1><p class="work-subtitle">{esc(item['subtitle'])}</p>
  <section class="work-record" aria-labelledby="record-title"><h2 id="record-title">最初的创作请求</h2><p class="work-request">{esc(item['originalRequest'])}</p><h2>原始提示词</h2><pre class="work-prompt" data-prompt>{esc(prompt_text)}</pre><div class="work-actions"><button class="copy-button" type="button" data-copy>复制提示词</button><button class="share-button" type="button" data-share>分享这张作品</button></div><div class="work-status" data-status role="status" aria-live="polite"></div></section>
  <aside class="work-endnote"><p>想知道这张图是怎么被“导演”出来的？</p><a href="../index.html#how">查看使用方法{ICON_FORWARD}</a></aside>
  <p class="kbd-hint">键盘 <kbd>←</kbd> <kbd>→</kbd> 也可以切换作品。</p></article></div></main>
  <script src="../assets/work.js"></script></body></html>"""


FONT_SRC = ROOT / "assets" / "fonts" / "_src" / "NotoSerifSC[wght].ttf"
FONT_SUBSET = ROOT / "assets" / "fonts" / "noto-serif-sc-subset.woff2"

# 详情页模板里写死、且用 var(--serif) 排的文案。首页那部分直接从生成后的 HTML 里扫，
# 不在这里手工维护。漏字只会退化成多下载一个完整字体切片，不会显示不出来。
FIXED_SERIF_TEXT = "最初的创作请求原始提示词把想象，排成线稿。"


def serif_charset(samples: list[dict]) -> set[str]:
    """收集所有会用衬线体渲染的字符。"""
    chars: set[str] = set(FIXED_SERIF_TEXT)
    for item in samples:                       # 详情页 h1 与 work-pager，以及创作请求正文
        chars |= set(item["title"]) | set(item["originalRequest"])
    text = (ROOT / "index.html").read_text(encoding="utf-8")
    patterns = (r"<h1[^>]*>(.*?)</h1>", r"<h2[^>]*>(.*?)</h2>", r"<h3[^>]*>(.*?)</h3>",
                r"<strong data-caption>(.*?)</strong>",
                r'<a href="#gallery-[a-z]+"><strong>\d+</strong><span>(.*?)</span>',
                r'class="lead">(.*?)</p>')
    for pattern in patterns:
        for found in re.findall(pattern, text, re.S):
            chars |= set(re.sub(r"<[^>]+>", "", found))
    chars |= set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
                 "·—…“”‘’《》，。、：；！？（）×-·")
    return {c for c in chars if c.isprintable() and not c.isspace()}


def build_font_subset(samples: list[dict]) -> None:
    """把思源/Noto 宋体裁成站内实际用到的字。缺源文件时保留已有产物，不阻断构建。"""
    if not FONT_SRC.exists():
        print(f"  跳过字体子集化：缺少 {FONT_SRC.relative_to(ROOT)}（见 .gitignore 里的下载说明）")
        return
    from fontTools import subset as ft_subset

    options = ft_subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.hinting = False
    options.desubroutinize = True
    options.drop_tables += ["DSIG"]
    font = ft_subset.load_font(str(FONT_SRC), options)
    subsetter = ft_subset.Subsetter(options=options)
    subsetter.populate(unicodes=[ord(c) for c in serif_charset(samples)])
    subsetter.subset(font)
    ft_subset.save_font(font, str(FONT_SUBSET), options)
    print(f"  字体子集：{len(serif_charset(samples))} 字 → {round(FONT_SUBSET.stat().st_size / 1024)} KB")


def build_sitemap(samples: list[dict]) -> None:
    urls = [f"{SITE_ORIGIN}/"] + [absolute(f"works/{item['slug']}.html") for item in samples]
    body = "\n".join(f"  <url><loc>{url}</loc></url>" for url in urls)
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + "\n</urlset>\n",
        encoding="utf-8")
    (ROOT / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\n\nSitemap: {SITE_ORIGIN}/sitemap.xml\n", encoding="utf-8")


def build_share_images(samples: list[dict]) -> None:
    """社交分享卡片：1200×630 JPEG。用 JPEG 是因为微信、Facebook 的抓取器对 WebP 支持不稳。"""
    share = ROOT / "assets" / "share"
    share.mkdir(parents=True, exist_ok=True)
    for item in [None] + samples:
        slug = "cover" if item is None else item["slug"]
        source = ROOT / (samples[0]["image"] if item is None else item["image"])
        out = share / f"{slug}.jpg"
        if out.exists() and out.stat().st_mtime >= source.stat().st_mtime:
            continue
        canvas = Image.new("RGB", (1200, 630), "#ffffff")
        with Image.open(source) as im:
            art = im.convert("RGB")
            art.thumbnail((1160, 590), Image.LANCZOS)
            canvas.paste(art, ((1200 - art.width) // 2, (630 - art.height) // 2))
        canvas.save(out, "JPEG", quality=82, optimize=True, progressive=True)


def main() -> None:
    (ROOT / "assets").mkdir(parents=True, exist_ok=True)
    works = ROOT / "works"
    works.mkdir(parents=True, exist_ok=True)
    samples = prepare_new() + prepare_legacy()
    build_data(samples)
    update_index(samples, ["m01-gojo", "f21-ai-hoshino", "m02-sung-jinwoo"])
    build_sitemap(samples)
    build_share_images(samples)
    for page in works.glob("*.html"):
        page.unlink()
    for i, item in enumerate(samples):
        (works / f"{item['slug']}.html").write_text(build_work(item, i, samples), encoding="utf-8")
    build_font_subset(samples)
    print(f"Built {len(samples)} gallery items, detail pages, thumbnails and share cards")


if __name__ == "__main__":
    main()
