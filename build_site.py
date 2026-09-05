"""Build the 39-work static gallery and standalone detail pages."""
from __future__ import annotations

import html
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
GENERATED_ROOT = ROOT / "assets" / "generated"
GALLERY_ROOT = ROOT / "assets" / "gallery"
CONTENT_ROOT = ROOT / "content"
VERSION = "3.4.2"
REPO_URL = "https://github.com/Spark-chenlin/anime-lineart-director"

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


def esc(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


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
        item.update({
            "code": f"A{i:02d}", "section": "archive", "sourceType": "archive",
            "originalRequest": LEGACY_REQUESTS[slug], "requestSource": "input_example",
            "promptSource": "saved", "image": f"assets/{slug}.webp",
        })
        result.append(item)
    return result


def public_item(item: dict) -> dict:
    hidden = {"subject", "event", "palette", "special", "text", "sourceSession"}
    return {key: value for key, value in item.items() if key not in hidden}


def build_data(samples: list[dict]) -> None:
    payload = {"repoUrl": REPO_URL, "version": VERSION, "author": "尘林 Spark", "samples": [public_item(x) for x in samples]}
    (ROOT / "assets" / "data.js").write_text(
        "window.LINEART_SITE = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8"
    )


def gallery_card(item: dict, number: int) -> str:
    wide = item["width"] / item["height"] > 1.12
    cls = "art-item art-wide" if wide else "art-item"
    return (
        f'<a class="{cls}" href="works/{esc(item["slug"])}.html" data-art="{esc(item["slug"])}">'
        f'<span class="art-image"><img src="{esc(item["image"])}" alt="{esc(item["title"])}，{esc(item["subtitle"])}" '
        f'width="{item["width"]}" height="{item["height"]}" loading="lazy"></span>'
        f'<span class="art-meta"><i>{number:02d}</i><b>{esc(item["title"])}</b><em>{esc(item["subtitle"])}</em></span></a>'
    )


def build_gallery(samples: list[dict]) -> str:
    specs = [
        ("characters", "01", "角色研究", "CHARACTER STUDIES", "23 张 · 单人身份、手势、动作与角色主色"),
        ("relationships", "02", "关系与动作", "RELATIONSHIPS", "9 张 · 双人线场、接触、距离与承重"),
        ("archive", "03", "系列档案", "SERIES ARCHIVE", "7 张 · 五姐妹、海梦与山田杏奈早期样图"),
    ]
    numbers = {item["slug"]: i for i, item in enumerate(samples, 1)}
    blocks = []
    for section, number, title, english, desc in specs:
        cards = "\n".join(gallery_card(item, numbers[item["slug"]]) for item in samples if item["section"] == section)
        blocks.append(f"""<section class="gallery-chapter" id="gallery-{section}" aria-labelledby="gallery-{section}-title">
          <header class="gallery-chapter-head"><span>{number} / {english}</span><h3 id="gallery-{section}-title">{title}</h3><p>{desc}</p></header>
          <div class="gallery-grid">{cards}</div>
        </section>""")
    return "\n".join(blocks)


def update_index(samples: list[dict]) -> None:
    path = ROOT / "index.html"
    text = path.read_text(encoding="utf-8")
    marker_start, marker_end = "<!-- GALLERY_START -->", "<!-- GALLERY_END -->"
    start = text.index(marker_start) + len(marker_start)
    end = text.index(marker_end)
    text = text[:start] + "\n" + build_gallery(samples) + "\n        " + text[end:]
    path.write_text(text, encoding="utf-8")


def build_work(item: dict, index: int, samples: list[dict]) -> str:
    previous, following = samples[(index - 1) % len(samples)], samples[(index + 1) % len(samples)]
    prompt_text = item.get("prompt", "") + (("\n\n负面约束\n" + item["negative"]) if item.get("negative") else "")
    image_path = "../" + item["image"]
    return f"""<!doctype html><html lang="zh-CN"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#ffffff">
  <meta name="description" content="{esc(item['title'])} · {esc(item['subtitle'])}。查看作品大图、创作请求与提示词。">
  <meta property="og:type" content="article"><meta property="og:title" content="{esc(item['title'])}｜动漫手绘线稿导演"><meta property="og:description" content="{esc(item['subtitle'])} · 查看作品大图与提示词。"><meta property="og:image" content="{esc(image_path)}"><meta name="twitter:card" content="summary_large_image">
  <title>{esc(item['title'])}｜动漫手绘线稿导演</title><link rel="stylesheet" href="../assets/work.css"></head><body>
  <header class="work-header"><nav class="work-nav shell" aria-label="作品导航"><a class="back-link" href="../index.html#gallery">← 返回全部作品</a><a class="work-wordmark" href="../index.html">动漫手绘线稿导演</a><button type="button" data-repo>GitHub ↗</button></nav></header>
  <main class="work-main"><div class="work-layout shell"><figure class="work-media"><img src="{esc(image_path)}" alt="{esc(item['title'])}，{esc(item['subtitle'])}" width="{item['width']}" height="{item['height']}"></figure>
  <article class="work-copy"><span class="section-number">SELECTED WORK · {index + 1:02d} / {len(samples):02d}</span><h1>{esc(item['title'])}</h1><p class="work-subtitle">{esc(item['subtitle'])}</p>
  <section class="work-record" aria-labelledby="record-title"><h2 id="record-title">最初的创作请求</h2><p>{esc(item['originalRequest'])}</p><h2>原始提示词</h2><pre class="work-prompt" data-prompt>{esc(prompt_text)}</pre><div class="work-actions"><button class="copy-button" type="button" data-copy>复制提示词</button><button class="share-button" type="button" data-share>分享这张作品</button></div><div class="work-status" data-status role="status" aria-live="polite"></div></section>
  <nav class="work-pager" aria-label="上一张和下一张作品"><a href="{esc(previous['slug'])}.html"><small>PREVIOUS</small><strong>← {esc(previous['title'])}</strong></a><a href="{esc(following['slug'])}.html"><small>NEXT</small><strong>{esc(following['title'])} →</strong></a></nav></article></div></main>
  <footer class="work-footer"><div class="work-footer-inner shell"><div><h2>把想象，排成线稿。</h2><p>了解 Skill 如何组织角色、动作、笔触与留白。</p></div><a class="copy-button" href="../index.html#how">查看使用方法</a></div></footer><script src="../assets/data.js"></script><script src="../assets/work.js"></script></body></html>"""


def main() -> None:
    (ROOT / "assets").mkdir(parents=True, exist_ok=True)
    works = ROOT / "works"
    works.mkdir(parents=True, exist_ok=True)
    samples = prepare_new() + prepare_legacy()
    build_data(samples)
    update_index(samples)
    for page in works.glob("*.html"):
        page.unlink()
    for i, item in enumerate(samples):
        (works / f"{item['slug']}.html").write_text(build_work(item, i, samples), encoding="utf-8")
    print(f"Built {len(samples)} gallery items and detail pages")


if __name__ == "__main__":
    main()
