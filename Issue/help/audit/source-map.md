# 源码映射和审查要点

`source-manifest.json` 是机器可读的完整文件与原行号映射。`baselineSha256` 标识固定提交中的原始正文，`candidateSourceSha256` 标识当前候选正文，`candidateInputsSha256` 覆盖分段及三个独立模块；原始正文与候选正文的差异目前仅涉及已经搬入 `src/modules/` 的函数。

| 原源码区域 | 候选位置 | 审查重点 |
| --- | --- | --- |
| 状态和 log 资源 | `src/core/` | `NLOG` 初始化在 `defaultState()` 调用之前；状态可整体替换，不得缓存旧引用 |
| 物理与玩法公式 | `src/rules/` | `F = U / (L·膨胀倍率)^e`；不同资源的零哨兵与 double 缓存边界 |
| 购买、重置与自动化 | `src/engine/` | 免费购买门槛、价格分段、同 tick 自动化顺序、重置保留矩阵 |
| 存档、格式 | `src/services/` | 原始存档对象迁移、`lastTick` 语义、预览键隔离 |
| 页面与渲染 | `src/ui/` | 事件只绑定一次，快速渲染与定时器的调用时机 |
| 启动 | `src/app/` | `break_infinity.js` 先加载；DOM 已存在才调用 `init()` |

首批真实独立 API：`src/adapters/storage.js` 负责预览存储隔离；`src/modules/save-codec.js` 提供 WI1 编解码；`src/modules/log-math.js` 提供 `clampLog`、log 加减与 double/log 比较。它们不读取游戏状态或 DOM，后两者的算式与原函数逐项对照后再接入。

后续每次真实模块提取，都应在这里追加：原函数、新 API、输入、返回值、读写的状态字段、UI/存档副作用、数值对照结果。不能仅依据名称相似合并两个函数。
