# Wave Incremental

一个物理学主题的中文放置类增量游戏（纯前端，无依赖构建）。

从一条简单的波开始：提升波速、缩短波长、推高频率；解锁声子与温度、
湮灭宇宙换取奇点、修正扭曲宇宙，甚至喂养一个属于你的黑洞，或者……直接颠覆多元宇宙的规则？甚至做到比这更多？

## 运行

无需构建——任选其一：

- 直接双击打开 `index.html`；
- 或起一个静态服务器（推荐，避免浏览器对 `file://` 的部分限制）：

  ```bash
  npx http-server -p 8080
  # 然后访问 http://127.0.0.1:8080
  ```

## 玩法层级

| 阶段 | 内容 |
| --- | --- |
| 波动 | 波速 U / 波长 L → 频率 F = U/L，三个可重复升级 + 单次升级 |
| 声子 | 声子发生器、温度 T = n·h·F/k_B、热涨落加成 |
| 湮灭 | 达到普朗克温度重置换取奇点 Sp，改写宇宙常数 |
| 扭曲 | 8 个规则扭曲的挑战宇宙（刚性/膨胀/定向/冷却/滞涨/热寂/狭窄/简洁） |
| 奇点升级 | SAU 可重复 + AU 单次（3DA 解锁） |
| 黑洞 | 质量/虚粒子、吸积-扭曲-脉冲三状态（5DA 解锁） |

## 技术说明

- 纯 HTML/CSS/JS 单页，唯一的第三方库是 [break_infinity.js](https://github.com/Patashu/break_infinity.js)（超越大数上限）。
- 核心数值采用「log10 权威 + double 缓存」双表示，全量支持 >1e308 / <1e-308。
- 存档：localStorage 每 15 秒自动保存 + 6 个手动槽位（可命名）+ base64 导出导入 / TXT 文件导出。
- 黑洞动画为原生 canvas 渲染。

## 开发工作流（模块化构建，v0.6.3.2 起）

- 游戏逻辑源码在 `src/`（25 个按序分段：core/rules/engine/services/ui/app + `modules/` 两个纯函数模块 + `adapters/` 存储端口）。**改 `src/` 后运行 `node tools/build.mjs` 重新生成根目录 `game.js`**（index.html 只加载构建产物）。
- `source-manifest.json` 记录分段行区间与 SHA256 指纹：分段/模块被改动后构建会拒绝，需 `node tools/build.mjs --update` 审查后显式重建指纹（防「审的版本」与「跑的版本」脱节）。
- 回归：`node tests/log-math-invariants.mjs`（log 算术 vs break_infinity 参照随机差分 + WI1 编解码往返）；Node 存根回归沿用 tail55 拼接方式对构建产物运行。
- `Issue/` 为只读审查存档（bug 报告与修复方案），不参与构建。

## 版本

见 [CHANGELOG.md](CHANGELOG.md)。版本标签随每次发布打在 git 上（`v0.4.2.4` 起）。
