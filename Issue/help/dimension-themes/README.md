# 维度折叠器：三主题动画候选

直接双击本目录的 [index.html](index.html) 查看。点击「空间 / 时间 / 信息」切换同一个画布的模型，无需构建、服务器或网络。

| 主题 | 造型 | 颜色 |
| --- | --- | --- |
| 空间 / CM | 正二十四胞体，24 顶点、96 边 | 橙 |
| 时间 / SF | 正十六胞体，8 顶点、24 边 | 紫 |
| 信息 / NE | 四维超立方体（正八胞体），16 顶点、32 边 | 蓝 |

信息主题已经按最后要求从五维改成四维。旧二十四胞体预览保留在 `../dimension-24cell/`。

## 文件

- [PLAN.md](PLAN.md)：方案、理由、性能约束、主代码接入步骤、待验收项与回退方式。
- `geometry.js`：三种几何数据，加载时只生成一次。
- `renderer.js`：可复用的绘图与生命周期管理。
- `preview.js` / `preview.css` / `index.html`：独立预览和控制。

候选库使用经典脚本，按 `geometry.js → renderer.js → preview.js` 顺序加载，避免本地双击时模块跨域限制。无第三方依赖、构建工具、存储读写或对话专用接口。

## 接口

```js
const animation = WaveFoldAnimations.mount(canvas, {
  theme: 'info', // space / time / info
  speed: 0.65,  // 0–2；0 停止调度
  paused: false,
});
animation.setTheme('time');
animation.setPaused(true);
animation.setVisible(false);
animation.setSpeed(0.5);
animation.refreshColors();
animation.resize();
animation.destroy();
```

画布需要有父容器和明确的显示尺寸。父容器需定义 `--fold-space-line/bright/rear`、`--fold-time-line/bright/rear`、`--fold-info-line/bright/rear` 九个颜色变量，示例在 `preview.css`。库只读颜色，不修改父容器属性；游戏自身切换外观后需调用 `refreshColors()`。

绘图上限 30 帧/秒、像素比例上限 1.5；每帧只投影当前几何体，最多 24 个顶点和 96 条边。边深度排序仍有固定工作量，没有依照资源、购买次数或离线时长增长的循环。每主题投影缓冲及边记录预分配并复用；隐藏后恢复不补算。

系统减少动态效果时保持静态图。`setVisible()` 用于游戏子页显隐；浏览器标签隐藏与画布离屏会另外自动停播。重复挂载同一画布自动销毁旧实例，正式页面仍应明确管理实例生命周期。

## 审查范围

本次只增加候选实现和文档，并更新 help 导航。未修改游戏主代码、存档字段、玩法公式、版本号；未新增或运行游戏测试。正式接入的验收项保留在 `PLAN.md`，尤其要对照原空间动画、检查低端设备表现以及避免新旧动画调度同时存在。

已在独立浏览器中直接打开本地预览，查看三个主题的切换、深色画面及浅色窄屏画面；未发现预览脚本报错。该显示检查不等于游戏接入验收或设备性能测量。
