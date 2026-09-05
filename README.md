# Anime Lineart Director Gallery

`anime-lineart-director` 的官方作品画廊，以真实样图展示 Skill 对角色身份、人物动作、双人关系、线条密度、角色主色和特殊配色机制的处理能力。

> 本仓库只保存展示网站。Skill 源码位于 [Spark-chenlin/anime-lineart-director](https://github.com/Spark-chenlin/anime-lineart-director)。

<p align="center">
  <img src="assets/thumbs/m01-gojo-400.webp" width="31%" alt="五条悟深靛蓝线稿">
  <img src="assets/thumbs/f21-ai-hoshino-400.webp" width="31%" alt="星野爱紫红线稿">
  <img src="assets/thumbs/c05-marin-wakana-400.webp" width="31%" alt="海梦与若菜双人线稿">
</p>

## 网站内容

- 39 张画廊作品：23 张单人角色、9 张双人关系图、7 张早期系列样图，按三个章节组织。
- 首页叠放轮播共 5 张参与轮转，同一时刻只有 3 张在台上，另外两张在台侧待命。
  名单在 `build_site.py` 的 `HERO_SLUGS`，改列表即可，点位和槽位会跟着自动生成。
- 点击画廊里的任意作品跳转到它的独立详情页，浏览位置由浏览器的前进后退自然管理。
- 详情页左栏图片钉在视口不随滚动位移，右栏文字独立滚动；「上一张 / 下一张」常驻在
  图片下方，不用滚到底就能用，也支持键盘 <kbd>←</kbd> <kbd>→</kbd>。
- 纯静态，无框架。关掉 JavaScript 实测：39 张画廊卡、GitHub 入口、详情页正文与
  上下张翻页全部照常（都是真 `<a href>`）；失效的只有轮播的切换、复制提示词和分享按钮，
  轮播退化成静态的三张展示。

## 本地预览

在仓库根目录运行：

```powershell
python -m http.server 18943 --bind 127.0.0.1
```

然后打开 <http://127.0.0.1:18943/>。

## 内容结构

```text
.
├─ index.html                  # 首页与画廊（构建脚本按注释标记回填内容）
├─ works/                      # 39 个独立作品页，全部由构建生成
├─ favicon.svg
├─ sitemap.xml, robots.txt     # 构建生成
├─ assets/
│  ├─ gallery/                 # 32 张正式样图的 WebP 原图，详情页与大图档使用
│  ├─ thumbs/                  # 400w / 800w 缩略图，网格与轮播使用（构建生成）
│  ├─ share/                   # 40 张 1200×630 社交分享卡 JPEG（构建生成）
│  ├─ fonts/                   # 自托管 Noto Serif SC，见下节
│  ├─ *.webp                   # 7 张早期系列样图（miku / nino / itsuki 等）
│  ├─ styles.css, app.js       # 首页样式与轮播
│  ├─ work.css, work.js        # 详情页样式与复制／分享／键盘翻页
│  └─ data.js                  # 构建生成的作品清单，只供验证脚本读取，页面不加载
├─ content/
│  ├─ new_samples.json         # 作品标题、副标题与中文创作请求
│  ├─ original_prompts_zh.json # 原始提示词
│  └─ legacy_samples.json      # 早期系列样图元数据
├─ build_site.py               # 重建画廊、缩略图、详情页、分享图、sitemap、字体子集
├─ verify_site.cjs             # Playwright 整站验证
└─ task_plan.md                # 优化那一轮的执行记录与决策依据
```

仓库不包含原始出图 PNG、测试截图或设计阶段原型。

**内容的唯一真相在 `content/*.json`。** 章节数量、作品总数、「查看全部三十九幅作品」这类
数字都由 `build_site.py` 从数据算出来回填，不要手改 `index.html` 或 `works/` 里的文件——
下次跑构建会被覆盖。

## 性能

首页首屏实测（真实 Edge，1440×900，DPR 1）：

| | |
|---|---|
| 传输量 | **1.02 MB**（验证脚本里的预算是 1.2 MB） |
| 请求数 | 18 |
| 其中字体 | 231 KB |

网格里的图按 `srcset` / `sizes` 选档，1x 屏取 400w（平均 39 KB），2x 屏取 800w。
39 张全部铺开、1x 档合计 1.47 MB；原图只在详情页和 2x 网格上出现。

仓库本身约 29 MB，其中字体 6.1 MB、缩略图 7.1 MB、分享卡 2.9 MB、原图 11 MB。
下载量和仓库体积是两回事——访问者拿到的是缩略图和字体子集。

## 字体

大标题用的中文宋体是自托管的，不依赖访问者机器上装了什么字体。分两层：

1. `assets/fonts/noto-serif-sc-subset.woff2`（约 198 KB）——站内实际用到的 472 个字，
   由 `build_site.py` 从完整可变字体裁出，是字体栈里的第一顺位。
2. `assets/fonts/noto-serif-sc/`（101 个 unicode-range 切片，共约 5.75 MB）——完整字符集兜底。
   任何不在子集里的字会自动落到对应切片，只多下载一片，不会退化成系统后备字体。

也就是说**以后加新角色、改文案都不会漏字**，最多多一次切片请求；重新跑构建后子集会
自动包含新字。子集算错只会让性能退化，不会让字显示不出来。

字体来自 Google Fonts 的 Noto Serif SC，[SIL Open Font License 1.1](assets/fonts/OFL.txt)。

## 重新生成页面

```powershell
python build_site.py
```

需要 `Pillow`。若还要重建字体子集，另需 `fonttools` + `brotli`，并把
[NotoSerifSC\[wght\].ttf](https://github.com/google/fonts/tree/main/ofl/notoserifsc)
放到 `assets/fonts/_src/`（该目录已 gitignore）。缺源文件时构建会跳过字体这一步并保留
现有产物，不会中断。

本地存在 `assets/generated/` 原始 PNG 时，脚本会优先从 PNG 重新生成优化后的 WebP 与缩略图；
公开仓库没有这些 PNG，会直接复用 `assets/gallery/` 里的 WebP。

改动内容后的标准流程：

```powershell
python build_site.py
python -m http.server 18943 --bind 127.0.0.1   # 另开一个终端
node verify_site.cjs
```

## 部署

域名还没定，`build_site.py` 里的 `SITE_ORIGIN` 暂时填的是 GitHub Pages 地址。
定下来后改那一行再跑一次构建，`og:url` / `og:image` / `canonical` / `sitemap.xml`
会一起更新。站点是纯静态的，任何静态托管都能直接发。

## 验证

先启动本地服务器，然后运行：

```powershell
node verify_site.cjs
```

跑在**真实 Edge** 上——headless shell 的滚动行为和真实浏览器不一致，会掩盖问题。
结果写入 `verification.json`，截图写入 `screenshots/`（两者都已 gitignore）。

33 项断言，分五类：

- **性能**：首屏传输是否超预算、网格图是否都带 `srcset` / `sizes`
- **排版几何**：网格每一行的图片底边是否对齐、详情页图片滚动时是否位移、
  上下张导航是否始终完整可见、桌面与移动端是否有横向溢出
- **交互**：轮播能否切换与暂停、是否共 5 张且点位同步、同一时刻是否只展示 3 张、
  转一圈能否回到起点、键盘激活是否作用在聚焦的那张、点击作品是否跳转详情页、
  返回是否恢复画廊滚动位置
- **内容一致性**：章节计数与实际数量是否相符、39 件作品 3 个章节、唯一 h1、
  大标题是否用上自托管字体
- **元数据与健壮性**：og:image 与 canonical 是否为绝对 URL、GitHub 是否为真链接、
  移动端触控目标是否 ≥ 24px、39 个详情页的破图 / 溢出 / 报错 / 4xx

断言的是**行为和几何，不是元素存不存在**。上一版只检查存在性，因此漏掉过首页的作品弹窗——
它的 `position: relative` 覆盖了 `dialog:modal` 的 `fixed`，一打开就把页面滚动位置拉回顶部，
关掉后也回不去，在 39 张的画廊里每点一张就丢一次浏览位置。而所有「元素都在」的检查照样全绿。

## 说明

画廊中的知名动漫角色用于非官方的风格与能力展示，相关角色权利归原权利方所有。
网站代码采用 [MIT License](LICENSE)。
