# Wave Incremental 图标候选

设计：深灰圆角底 + 单条青色波形。波形对应游戏起点，末端稍高呼应增长；无文字、无渐变、无细小装饰，便于在浏览器 16/32px 标签中识别。底色沿用游戏的 `#1a1a1a`，青色提高了小尺寸下的清晰度。

- `wave-icon-v1.svg`：矢量原稿，推荐作为现代浏览器 favicon。
- `favicon.ico`：包含 16、32、48、64、128、256px 的兼容文件。
- `wave-icon-*.png`：对应尺寸的 PNG；180px 可供 Apple touch icon 使用。
- `preview.html`：在深浅背景上查看不同尺寸。

所有文件仅位于 `Issue/help/icons/`，尚未接入主页面。负责主代码的 agent 可选择图标并添加以下标签；路径按其最终放置位置调整：

```html
<link rel="icon" type="image/svg+xml" href="Issue/help/icons/wave-icon-v1.svg">
<link rel="alternate icon" href="Issue/help/icons/favicon.ico">
<link rel="apple-touch-icon" href="Issue/help/icons/wave-icon-180.png">
```

PNG/ICO 由浏览器直接栅格化 SVG，可用 `node Issue/help/icons/render.mjs` 重新导出。设计使用原生 SVG，未使用图像生成工具。
