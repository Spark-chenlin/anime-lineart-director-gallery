# 优化执行计划 · anime-lineart-director-gallery

来源：2026-09-05 对抗式审查报告。用户指令「执行优化」。

## 已确认的决策

| 议题 | 决定 |
|---|---|
| 部署域名 | **先不部署**。build_site.py 里放 `SITE_ORIGIN` 常量，默认填 GitHub Pages 地址，定域名后改一行重跑 |
| 首页点击作品 | **砍掉弹窗**，直接跳 `works/<slug>.html` |
| 中文字体 | **全集自托管**（unicode-range 切片方案，非子集化，后续加字不会漏） |

## 任务清单

- [x] T0 计划文件
- [x] T1 字体：自托管 Noto Serif SC / Noto Sans SC 的 unicode-range 切片
- [x] T2 build_site.py：缩略图（400w/800w）+ srcset/sizes
- [x] T3 build_site.py：SITE_ORIGIN + 绝对 og:image/og:url + canonical
- [x] T4 build_site.py：章节数量从数据算出，删掉三处硬编码数字
- [x] T5 build_site.py：生成 sitemap.xml / robots.txt / 404.html
- [x] T6 index.html：删除作品弹窗 + repo 弹窗，GitHub 改 `<a>`
- [x] T7 index.html：轮播 srcset + preload + fetchpriority，sticky header，移动端导航补回 #about/#how
- [x] T8 图标全部换成内联 SVG（全局约定：禁止 emoji / 文本字符当图标）
- [x] T9 app.js：只保留轮播；修 Enter 键打开错作品；focus 暂停；aria-live 只在手动切换时播报
- [x] T10 work.js：去掉 101KB data.js 依赖
- [x] T11 styles.css：宽卡 4/3、网格行对齐、点位触控 24px、图片占位、删死 CSS
- [x] T12 删除零引用素材（action/asuka/blue-boy/couple/aqua.webp，1.47MB）
- [x] T13 重建 + 真实 Edge 验证
- [x] T14 verify_site.cjs 增加几何断言
- [x] T15 README 更新

## 验收标准

1. 首屏传输 < 1.2MB（原 3.15MB）
2. 点击画廊缩略图 → 跳详情页，浏览位置由浏览器自然管理（bfcache/返回）
3. 所有 og:image 是绝对 URL
4. 真实 Edge 跑通：0 控制台报错、0 破图、0 横向溢出、39 页可达
5. 大标题在未安装思源宋体的机器上仍为宋体


## 执行结果（真实 Edge 验证，26/26 通过）

| 指标 | 优化前 | 优化后 |
|---|---|---|
| 首屏传输 | 3.15 MB | **0.95 MB**（-70%） |
| 首页整页图片 | 12.5 MB | 网格 400w 档合计 1.47 MB |
| 点击作品 | 弹窗，页面被拉回顶部 | 跳详情页，返回恢复位置 |
| 大标题字体 | 依赖访问者机器，多数落到 SimSun | 自托管，全站一致 |
| og:image | 相对路径，分享无图 | 绝对 URL + 1200×630 JPEG |
| GitHub 入口 | `<button>` + window.open | `<a href>` |
| 控制台报错 / 4xx | 1 个 favicon 404 | 0 |
| 验证断言 | 存在性检查 | 26 项行为与几何断言 |

未做：改成完全静态 SSG、加作品筛选/搜索、深色模式。范围外。


## 追加：详情页排版（用户选定方案 A1）

原问题：`.work-media` 的 `position: sticky` + `min-height: 70vh` 让图片跟着滚、贴住、再滑走；
底部大页脚和「上一张/下一张」要滚到最底才看得到。

改法：
- 左栏包一层 `.work-media-col`，`position: sticky; top: header; height: calc(100dvh - header)`，
  内部 grid 分成「图片撑满剩余高度」+「常驻导航条」两行。图片一像素不动（实测 108 → 107）。
- 底部 `.work-pager` 删除，改成左栏底部的 `.work-stepper`：‹ 上一张作品名 ｜ ▦ 01/39 ｜ 下一张作品名 ›。
  未滚动和滚到底都完整可见。
- 整页大页脚 `.work-footer` 删除，换成右栏末尾一条 `.work-endnote`（一句话 + 查看使用方法）。
- 新增键盘 ← → 切换（`work.js`），输入框和修饰键组合不拦截。
- 移动端 `.work-media-col` 退回静态，导航条落在图片正下方。

验证从 26 项加到 28 项，新增「详情页图片滚动时不位移」和「上下张导航始终完整可见」。


## 追加：首页轮播扩到 5 张（台上仍是 3 张）

- `HERO_SLUGS` 五张：m01-gojo、f21-ai-hoshino、c28-mitsuha-taki、f07-bocchi、m02-sung-jinwoo。
  顺序刻意排成「0 居中 / 1 在右 / 末位在左」，所以首屏首帧和三张时完全一致。
- 槽位从固定数组改成按「离前景第几张」算：0=center、+1=right、-1=left、再往外 far-right / far-left。
  `build_site.py::hero_slot()` 和 `assets/app.js::slotFor()` 是同一套规则，改一个必须改另一个。
- far-* 两张 `opacity:0; pointer-events:none`，并去掉 tabindex，不进 Tab 序列。
- 点位由 `build_dots()` 生成，不再手写。
- 窄屏：控制条从 248px 压到 229px，说明文字改成可截断，320–430px 实测都不再被裁切。
- 首屏传输 0.95MB → 1.02MB（多两张 400w 缩略图），仍在 1.2MB 预算内。
