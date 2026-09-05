# Anime Lineart Director Gallery

`anime-lineart-director` 的官方作品画廊，以真实样图展示 Skill 对角色身份、人物动作、双人关系、线条密度、角色主色和特殊配色机制的处理能力。

> 本仓库只保存展示网站。Skill 源码位于 [Spark-chenlin/anime-lineart-director](https://github.com/Spark-chenlin/anime-lineart-director)。

<p align="center">
  <img src="assets/gallery/m01-gojo.webp" width="31%" alt="五条悟深靛蓝线稿">
  <img src="assets/gallery/f21-ai-hoshino.webp" width="31%" alt="星野爱紫红线稿">
  <img src="assets/gallery/c05-marin-wakana.webp" width="31%" alt="海梦与若菜双人线稿">
</p>

## 网站内容

- 39 张画廊作品，包括 23 张单人角色、9 张双人关系图和 7 张早期系列样图。
- 首页三图叠放轮播，以及按角色研究、关系与动作、系列档案组织的画廊。
- 每张作品都提供大图、最初的中文创作请求和原始提示词。
- 每张作品都有可独立分享的详情页。
- 网站中的 GitHub 入口统一指向 Skill 仓库。

## 本地预览

在仓库根目录运行：

```powershell
python -m http.server 18943 --bind 127.0.0.1
```

然后打开 <http://127.0.0.1:18943/>。

## 内容结构

```text
.
├─ index.html                 # 首页与画廊
├─ works/                     # 39 个独立作品页
├─ assets/
│  ├─ gallery/               # 正式样图的 WebP 网页版本
│  ├─ data.js                # 构建生成的作品数据
│  ├─ app.js                 # 首页与详情弹窗交互
│  └─ styles.css             # 主站样式
├─ content/
│  ├─ new_samples.json       # 作品标题与中文创作请求
│  ├─ original_prompts_zh.json
│  └─ legacy_samples.json
├─ build_site.py             # 重建画廊数据与详情页
└─ verify_site.cjs           # Playwright 整站验证
```

仓库不包含原始出图 PNG、测试截图或设计阶段原型，避免重复资源扩大仓库体积。

## 重新生成页面

安装 Pillow 后运行：

```powershell
python build_site.py
```

公开仓库直接使用 `assets/gallery/` 中的 WebP 重建数据和详情页。本地存在 `assets/generated/` 原始 PNG 时，脚本会优先重新生成优化后的 WebP。

## 验证

先启动本地服务器，然后运行：

```powershell
node verify_site.cjs
```

验证覆盖首页轮播、移动端布局、39 个详情页、图片加载、作品链接和横向溢出。

## 说明

画廊中的知名动漫角色用于非官方的风格与能力展示，相关角色权利归原权利方所有。网站代码采用 [MIT License](LICENSE)。

