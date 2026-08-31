/* ===== Wave Incremental v0.4.2.4 — game logic ===== */

// ---------- Save schema ----------
function defaultState() {
  return {
    version: "0.4.3.3",
    // 物理资源
    U: 10,                 // 波速 m/s (默认国际单位制，double 缓存；极端值看 logU10)
    logU10: 1,             // log10(U) 权威表示（防溢出/下溢；U=0 时为 NLOG 哨兵）
    L: 1,                  // 波长 m（double 缓存；极端值看 logL10）
    logL10: 0,             // log10(L) 权威表示（防下溢）
    // up1 / up2 = 升级1/2 购买次数; up3 = 缩短波长次数; meta1 = 单次元升级(频率加成波速获取)是否已购
    up1: 0, up2: 0, up3: 0, up3LastF: 0, logUp3LastF: NLOG, meta1: 0,
    // 声子系统：声子数（浮点存储，显示取整）、发生器开关、页面解锁
    phonons: 0, phOn: false, phUnlocked: 0,
    pg1: 0,                // 声子发生器效率（间隔 ÷1.5/级）
    pg2: 0,                // 声子发生器倍率（×(n+1)²）
    pg3: 0,                // 升级3指数加成（+0.01/级，上限20）
    phFluct: 0,            // 单次：声子涨落（温度加成声子获取）
    phCoupling: 0,         // 单次：声波耦合（波速加成声子获取）
    // 湮灭层：奇点（持有 / 总获取）、湮灭次数、奇点升级、自动化
    sp: 0, totalSp: 0, annihilations: 0,
    spu1: 0,               // 奇点升级1：奇点之前的升级不再消耗资源（1 Sp）
    autoWaveUpg: 0,        // 主要页可重复升级自动化解锁（1e10 Hz）
    autoPhononUpg: 0,      // 声子页可重复升级自动化解锁（1e20 Hz）
    autoUp3: 0,            // 升级3自动化解锁（第8次湮灭）
    autoAnn: 0,            // 自动湮灭解锁（第10次湮灭）
    autoOn: { wave: false, phonon: false, up3: false, ann: false },
    autoUp3Mult: 1.1,      // 升级3自动购买倍率阈值
    autoAnnSp: 1,          // 自动湮灭 Sp 阈值
    annStartReal: 0,       // 本次湮灭开始（真实时间戳, ms）
    annStartGame: 0,       // 本次湮灭开始（游戏时间, s）
    annBestSp: 0,          // 最好单次奇点获取
    annBestRate: 0,        // 最好单次奇点/分
    annFastest: 0,         // 最快湮灭时间（真实秒，0=无记录）
    annHistory: [],        // 最近十次湮灭记录
    // 扭曲系统（v0.4.2.1 测试）
    distortActive: "",     // 当前所在扭曲宇宙 id（空=普通宇宙）
    distortDone: [],       // 已湮灭的扭曲宇宙 id（每宇宙只计一次奖励）
    distortMult: 1,        // 湮灭扭曲宇宙给的 Sp 倍率（×2/个）
    distortFails: 0,       // S14：扭曲宇宙失败次数
    distortBest: {},       // 各扭曲宇宙最佳完成时间（秒，id→秒）
    distortTotal: 0,       // 所有挑战（扭曲宇宙）耗时总和（秒）
    lastPurchaseAt: 0,     // 冷却宇宙：最近一次购买升级的时间戳
    narrowPurchases: 0,    // 狭窄宇宙：本宇宙内已购买升级次数
    batchMax: 2,           // A34 奖励：批量购买上限（Sp 升级翻倍）
    batchLvl: 0,           // 批量上限已购级数
    batchMode: { wave: false, phonon: false }, // 批量购买开关（false=单次）
    rulesBroken: false,    // 8DA：打破宇宙规则
    zeroGainSince: 0,       // S19：生产为 0 的起始时刻
    autoUp3Mode: "ratio",  // AU21：升级3自动化模式（ratio=比例 / time=时间间隔）
    autoUp3Interval: 10,   // AU21：时间模式的间隔秒数
    autoAnnMode: "sp",     // AU22：自动湮灭模式（sp=奇点阈值 / time=时间间隔）
    autoAnnInterval: 60,   // AU22：时间模式的间隔秒数
    lastAutoUp3At: 0,      // 上次自动升级3时刻
    lastAutoAnnAt: 0,      // 上次自动湮灭时刻
    autoAnnCDLvl: 0,       // A44 奖励：自动湮灭 CD 缩减升级等级（每级 ÷2，最低 25ms）
    sau1: 0, sau2: 0, sau3: 0, sau4: 0,  // 奇点可重复升级等级（3DA 解锁）
    au: {},                                 // 奇点单次升级已购标记（id→1）
    testBreakRules: false, // 测试按钮：临时打破规则（不获 Sp，v0.4.3 移除）

    // 黑洞系统（v0.4.3 实装，5DA 解锁）
    bhMass: 1,             // 黑洞质量（太阳质量，double 缓存）
    logBhMass: 0,          // log10(M) 权威
    bhState: "accrete",    // 黑洞状态：accrete/distorl/pulse（吸积/扭曲/脉冲）
    virtualParticles: 0,   // 虚粒子数（double 缓存）
    logVP: NLOG,           // log10(虚粒子) 权威
    sbu1: 0, sbu2: 0, sbu3: 0, // 黑洞升级：事件视界/引力潮汐/霍金辐射
    svpu1: 0, svpu2: 0, svpu3: 0, // 黑洞虚粒子升级：全息原理/虚幻湮灭/非欧几何
    bhCanvasClicks: 0,     // S21：黑洞动画点击计数
    bhPulseSince: 0,       // S22：本次持续处于脉冲状态的起始时刻（0=不在脉冲）
    bhDistorlSince: 0,     // S23：本次持续处于扭曲状态的起始时刻（0=不在扭曲）
    // rua摆线（v0.4.3.2）
    ruaFav: 0,             // 好感度
    ruaCountToday: 0,      // 今天已获取的好感度（每天最多 100）
    ruaClicksToday: 0,     // 今天总 rua 点击次数（不限上限，用于 S24）
    ruaDayStart: 0,        // 当前天窗口起始时间戳
    ruaBoostMult: 1,       // 当前生效的随机倍率加成
    ruaBoostUntil: 0,      // 倍率加成到期时间戳
    ruaBoostCD: 0,         // 倍率按钮 CD 到期时间戳

    // 统计
    totalFGained: 10,      // 累计频率（生成总量，double 缓存；极端值看 logTotalF）
    logTotalF: 1,          // log10(totalFGained) 权威表示
    maxF: 10, maxU: 10, minL: 1,
    logMaxF: 1, logMaxU: 1, logMinL: 0, // 各极值的 log10 权威表示（防溢出/下溢丢精度）
    playTime: 0,
    realTime: 0,           // 真实时间（未乘时间速率）
    // 成就
    ach: { normal: [], hidden: [], hiddenRevealed: [] },
    // 成就相关瞬时状态（加载时重置，避免离线干扰）
    hiddenClicks: [],      // S5 点击序列（单元格 id）
    metaClicks: [],        // S3 单次升级点击时间戳
    notationSwitches: [],  // S6 显示方式切换时间戳
    phToggles: [],         // S7 声子发生器开关时间戳
    capReachedAt: 0,       // S11 达到温度上限的时间戳
    settings: { theme: "black", notation: "scientific", decimals: 3, uiFps: 33 },
    lastTick: Date.now(),
  };
}

const SAVE_KEY = "waveIncremental_save";
const SLOT_KEY_PREFIX = "waveIncremental_slot";
const SLOT_COUNT = 3;
const AUTOSAVE_INTERVAL = 15000;
// log10 域的「零/无值」哨兵：用有限负数而非 -Infinity（JSON 无法存储 Infinity）。
// 比较时任何正的 log 都 > NLOG，故「从未购买升级3」时 FLog() > NLOG 恒成立。
const NLOG = -1e9;
// double 饱和阈值：仅当数值非有限或超过此量级时才退化为 log 域比较/累积，
// 保证 double 范围内的边界判定（如首个升级 F=10 vs cost=10）逐位不变。
const LOG_FALLBACK = 1e290;
// log 域上界哨兵：log 值永远不允许为 +Infinity（会污染所有 log 域算术）。
// 用一个远超任何可达量级的有限数钳制；任何超此的值都视为「无限大」但有限可算。
const LOG_CAP = 1e15;
// 钳制 log 值到 [NLOG, LOG_CAP]：-Infinity/NaN 归 NLOG（零语义），+Infinity 归 LOG_CAP。
// 注意 -Infinity 必须归 NLOG：湮灭重置后声子=0 时 getLogPhonons()=-Infinity，
// 若被钳到 LOG_CAP 会让温度直接等于上限（T 开局定在 Tcap 的根因）。
function clampLog(v) {
  if (v === -Infinity || v !== v || v < NLOG) return NLOG; // -Inf / NaN / 超下界
  if (v === Infinity || v > LOG_CAP) return LOG_CAP;
  return v;
}

let state = defaultState();
let currentSlot = 0;
let dirty = false;

// ---------- 扭曲宇宙（v0.4.2.1 测试）----------
// 进入扭曲宇宙会立刻湮灭重置；达到该宇宙的普朗克温度即可湮灭它（首杀奖励 Sp 获取 ×2）。
// 宇宙内湮灭不获得 Sp；未达标时点击湮灭按钮 = 退出该宇宙。
const DISTORT_UNIVERSES = [
  {
    id: "rigid", name: "刚性",
    desc: "无法缩短波长，且无法购买声子升级 3",
    tp: 1e100,
  },
  {
    id: "expand", name: "膨胀",
    desc: "波速获取指数随时间下降（每秒 -0.1，到 0 为止），波长每秒 ×1e20",
    tp: 1e300,
  },
  {
    id: "directed", name: "定向",
    desc: "每刻有 50% 概率波速获取变为相反数（波速有 0 的硬下限）；声波耦合失效",
    tp: 1e70,
  },
  {
    id: "cooldown", name: "冷却",
    desc: "购买任何升级后，波速获取受到指数削弱（最高 0.75 次方），在 15 秒内线性回复到最大值",
    tp: 1e90,
  },
  {
    id: "inflation", name: "滞涨",
    desc: "前奇点资源不消耗被禁用，所有升级价格折算从10Hz开始并且变得更严重，声子升级价格平方，波速获取变为原来的平方根，有效温度变为原来的平方根",
    tp: 1e110,
  },
  {
    id: "adiabatic", name: "热寂",
    desc: "热涨落与声子涨落无效，声波耦合无效，无法购买声子发生器效率，温度以 ^-0.5 的倍率除波速获取",
    tp: 1e165,
  },
  {
    id: "narrow", name: "狭窄",
    desc: "你一共只能购买十次升级，禁用所有自动化",
    tp: 1e170,
  },
  {
    id: "simple", name: "简洁",
    desc: "基础波速获取固定为 1 m/s²，波动升级 1/2 与声子升级 3 无效，热涨落无效，声子数始终为 1，升级 3 效果变为原来的平方根",
    tp: Infinity, // 测试值，待调整
  },
];
// 膨胀宇宙的进入时刻（真实 ms），用于计算波长倍率
let distortEnterAt = 0;

function inDistort(id) { return state.distortActive === id; }

// ---------- 资源 Decimal 双表示（3DA 起）----------
// 权威 log10 表示，永不溢出；state.X 为 double 缓存（超 ±1.8e308 时失真但不崩）
function getLogSp() {
  if (state.logDsp !== undefined && isFinite(state.logDsp)) return clampLog(state.logDsp);
  return state.sp > 0 ? clampLog(Math.log10(state.sp)) : 0;
}
function setSp(v) {
  state.sp = v;
  state.logDsp = v > 0 ? clampLog(Math.log10(v)) : 0;
}
function getLogTotalSp() {
  if (state.logDtotal !== undefined && isFinite(state.logDtotal)) return clampLog(state.logDtotal);
  return state.totalSp > 0 ? clampLog(Math.log10(state.totalSp)) : 0;
}
function setTotalSp(v) {
  state.totalSp = v;
  state.logDtotal = v > 0 ? clampLog(Math.log10(v)) : 0;
}
function getLogPhonons() {
  // 声子为 0 时返回 -Infinity（乘积为 0），而非 0（会被当作 1）
  if (state.logDph !== undefined && isFinite(state.logDph)) {
    return state.phonons > 0 ? clampLog(state.logDph) : -Infinity;
  }
  return state.phonons > 0 ? clampLog(Math.log10(state.phonons)) : -Infinity;
}
function setPhonons(v) {
  state.phonons = v;
  state.logDph = (v > 0 && isFinite(v)) ? clampLog(Math.log10(v)) : (v > 0 ? LOG_CAP : 0);
}
// 由 log10(phonons) 直接设（log 域路径）
function setPhononsLog(logP) {
  state.logDph = clampLog(logP);
  state.phonons = (logP <= NLOG + 1) ? 0 : (logP > 308 ? Infinity : Math.pow(10, logP));
}
// ---------- U / 累计频率 / 极值 的双表示（v0.4.2.5 完整接入）----------
// U：权威 logU10（U=0 时存 NLOG 哨兵）；double 缓存 U 在极端大时为 Infinity、极端小时为 0，读取走 log
function getLogU10() {
  if (state.logU10 !== undefined && isFinite(state.logU10)) return clampLog(state.logU10);
  return state.U > 0 ? clampLog(Math.log10(state.U)) : NLOG;
}
// 由 double 设 U（double 路径，值在范围内）。v 非有限正数时仅刷新 double 缓存，保留 logU10 权威（不压成 308）
function setU(v) {
  state.U = v;
  if (v > 0 && isFinite(v)) state.logU10 = clampLog(Math.log10(v));
  else if (v <= 0) state.logU10 = NLOG;
  // v>0 但非有限（Infinity）：不改动 logU10，保留先前权威值，仅 double 缓存为 Infinity
}
// 由 log10(U) 直接设 U（log 域路径，U 超 double 时 double 缓存为 Infinity）
function setULog(logU) {
  state.logU10 = clampLog(logU);
  state.U = (logU <= NLOG + 1) ? 0 : (logU > 308 ? Infinity : Math.pow(10, logU));
}
// 购买扣款 U -= cost·L（costLog 为 log10(cost)）。U 在范围内走 double；否则 log 域减法
function subULog(costLog) {
  const uLog = getLogU10();
  if (isFinite(state.U) && state.U < LOG_FALLBACK && uLog < LOG_FALLBACK) {
    setU(state.U - Math.pow(10, costLog) * state.L);
  } else {
    // log 域：log10(cost·L) = costLog + logL10；U - cost·L（同号相减）
    const subLog = costLog + getLogL10();
    const r = logAddSigned(uLog, 1, subLog, -1);
    if (r.sign < 0) setULog(NLOG); else setULog(r.log);
  }
}
// 累计频率：权威 logTotalF
function getLogTotalF() {
  if (state.logTotalF !== undefined && isFinite(state.logTotalF)) return clampLog(state.logTotalF);
  return state.totalFGained > 0 ? clampLog(Math.log10(state.totalFGained)) : NLOG;
}
function setTotalFGained(v) {
  state.totalFGained = v;
  state.logTotalF = (v > 0 && isFinite(v)) ? clampLog(Math.log10(v)) : (v > 0 ? LOG_CAP : NLOG);
}
function setTotalFGainedLog(logF) {
  state.logTotalF = clampLog(logF);
  state.totalFGained = (logF <= NLOG + 1) ? 0 : (logF > 308 ? Infinity : Math.pow(10, logF));
}
// 统计极值：log 权威（maxU 恒 Infinity / minL 下溢 0 的丢精度在此修复）
function getLogMaxF() { return (state.logMaxF !== undefined && isFinite(state.logMaxF)) ? state.logMaxF : Math.log10(Math.max(state.maxF, 1e-300)); }
function getLogMaxU() { return (state.logMaxU !== undefined && isFinite(state.logMaxU)) ? state.logMaxU : Math.log10(Math.max(state.maxU, 1e-300)); }
function getLogMinL() { return (state.logMinL !== undefined && isFinite(state.logMinL)) ? state.logMinL : Math.log10(Math.max(state.minL || 1, 1e-300)); }
// 升级3 历史峰值频率：权威 logUp3LastF（替代旧版用 Infinity 哨兵导致的 Infinity-vs-Infinity 死锁）
function getLogUp3LastF() {
  if (state.logUp3LastF !== undefined && isFinite(state.logUp3LastF) && state.logUp3LastF > NLOG + 1) return state.logUp3LastF;
  return state.up3LastF > 0 ? (isFinite(state.up3LastF) ? Math.log10(state.up3LastF) : 308) : NLOG;
}
function setUp3LastF(fLog) {
  // fLog：峰值的 log10（始终有限，FLog 不再返回 Infinity）
  state.logUp3LastF = isFinite(fLog) ? fLog : 308;
  state.up3LastF = fLog > 308 ? Infinity : (fLog <= 0 ? 0 : Math.pow(10, fLog)); // double 缓存（>1e308 存 Infinity）
}
// ---------- log 域算术助手 ----------
// log10(a+b)，已知 la=log10(a)、lb=log10(b)（均含符号无关的量级）
function logAddLogs(la, lb) {
  la = clampLog(la); lb = clampLog(lb);
  if (la === -Infinity) return lb;
  if (lb === -Infinity) return la;
  const mx = Math.max(la, lb), mn = Math.min(la, lb);
  if (mn <= NLOG + 1) return mx; // 较小项可忽略
  return clampLog(mx + Math.log10(1 + Math.pow(10, mn - mx)));
}
// 带符号的 log 加法：sa/sb 为 ±1，返回 {log, sign} 表示 log10(|a+b|) 与符号
function logAddSigned(la, sa, lb, sb) {
  la = clampLog(la); lb = clampLog(lb);
  if (la <= NLOG + 1) return { log: lb, sign: sb };
  if (lb <= NLOG + 1) return { log: la, sign: sa };
  if (sa === sb) return { log: logAddLogs(la, lb), sign: sa };
  // 异号相减
  if (la >= lb) return { log: clampLog(la + Math.log10(1 - Math.pow(10, lb - la))), sign: sa };
  return { log: clampLog(lb + Math.log10(1 - Math.pow(10, la - lb))), sign: sb };
}
// 比较 helper：a、b 均有限且 < LOG_FALLBACK 时走原 double 比较（零回归），
// 任一非有限或 ≥ LOG_FALLBACK 时退化为 log 域比较（aLog >= bLog）
function cmpGE(a, b, aLog, bLog) {
  if (isFinite(a) && isFinite(b) && a < LOG_FALLBACK && b < LOG_FALLBACK) return a >= b;
  return aLog >= bLog;
}
function cmpLT(a, b, aLog, bLog) { return !cmpGE(a, b, aLog, bLog); }
// log 域相加（对数加法 = 数值乘法），返回 double log10
function logAdd(a, b) { return a + b; }
// ---------- 派生物理量 ----------
// L 的双表示：logL10 权威（永不下溢），L 为 double 缓存（极端小时可能下溢为 0）
function getLogL10() { return (state.logL10 !== undefined && isFinite(state.logL10)) ? state.logL10 : Math.log10(state.L || 1e-300); }
function setL(newL) {
  state.logL10 = newL > 0 ? Math.log10(newL) : -1000; // 0/负保护
  state.L = newL; // 可能下溢为 0，读取方走 log 域
}
// F = U / L（定向宇宙：波速取绝对值；膨胀宇宙：波长乘以膨胀倍率）
function distortLMod() {
  if (!inDistort("expand")) return 1;
  const t = (Date.now() - distortEnterAt) / 1000;
  if (t <= 1) return 1;
  return Math.pow(1e20, t - 1); // 进入 1 秒后，每秒波长 ×1e20
}
// 波长倍率的 log10（代数式，避免 double 溢出）
function distortLModLog() {
  if (!inDistort("expand")) return 0;
  const t = (Date.now() - distortEnterAt) / 1000;
  if (t <= 1) return 0;
  return 20 * (t - 1);
}
// 膨胀宇宙：波速获取指数随时间下降，每秒 -0.1，到 0 为止（gain^exp → log *= exp）
function distortGainExp() {
  if (!inDistort("expand")) return 1;
  const t = (Date.now() - distortEnterAt) / 1000;
  if (t <= 1) return 1;
  return Math.max(0, 1 - 0.1 * (t - 1));
}
function FLog() {
  // log 域：getLogU10 权威（U 超 1e308 时仍有限），永不返回 Infinity
  return clampLog(getLogU10() - getLogL10() - distortLModLog());
}
function F() {
  const logF = FLog();
  if (logF > 308) return Infinity;
  if (logF < -308) return 0;
  return Math.pow(10, logF);
}
// 温度 T = n·h·F/k_B（声子数 × 普朗克常数 × 频率 / 玻尔兹曼常数），单位 K
// 普朗克常数受总奇点 (1+Sp)^1.5 加成（等价于温度倍率）；温度受当前宇宙硬上限约束
const H_OVER_KB = 6.62607015e-34 / 1.380649e-23; // ≈ 4.799e-11 K·s
const LOG_H_OVER_KB = Math.log10(H_OVER_KB);
// 温度的 log10（未裁剪，权威）：log10(n) + log10(h/k_B) + log10(F) + log10(planckMult)
function temperatureLog() {
  return clampLog(getLogPhonons() + LOG_H_OVER_KB + FLog() + planckMultLog());
}
// 当前生效的温度上限 log10：
// 扭曲宇宙用自己的普朗克温度（用于「达到即完成」）；tp 为 Infinity 的测试宇宙
// 回退到主宇宙上限——否则无上限会让「声子↔温度↔热涨落↔波速」正反馈循环失控爆炸。
function effectiveCapLog() {
  if (state.distortActive) {
    const u = DISTORT_UNIVERSES.find(x => x.id === state.distortActive);
    if (u && isFinite(u.tp)) return Math.log10(Math.max(u.tp, 1e-300));
  }
  return temperatureCapLog();
}
// 温度的 log10（经上限裁剪）：热涨落/声子涨落等增益计算必须用这个，
// 与 double 版 temperature() 语义一致，否则 log 域会绕过上限引发数值爆炸。
function temperatureCappedLog() {
  if (state.rulesBroken || state.testBreakRules) return temperatureLog(); // 打破规则：无上限
  const raw = temperatureLog();
  // 滞涨宇宙：有效温度变为原来的平方根（log ÷ 2），热涨落等加成相应减弱
  const eff = inDistort("inflation") ? raw / 2 : raw;
  return Math.min(eff, effectiveCapLog());
}
function temperature() {
  const log = temperatureCappedLog();
  return log > 308 ? Infinity : (log <= NLOG + 1 ? 0 : Math.pow(10, log));
}
// 热涨落：波速获取 ×= max(1, T)^0.2
function thermalMult() {
  if (inDistort("adiabatic")) return 1 / Math.pow(Math.max(1, temperature()), 0.5); // 热寂：温度反而削弱波速获取
  if (inDistort("simple")) return 1; // 简洁：热涨落无效
  return Math.pow(Math.max(1, temperature()), thermalExp());
}
// 热涨落的 log10（幂项 → 指数乘；热寂为负、简洁为 0）。必须用经上限裁剪的温度 log，
// 否则 log 域会绕过温度上限，令「声子↔温度↔热涨落」正反馈失控（通胀/滞涨爆炸的根因）。
function thermalMultLog() {
  const tLog = Math.max(0, temperatureCappedLog()); // max(1,T) 的 log（已裁剪）
  if (inDistort("adiabatic")) return clampLog(-0.5 * tLog);
  if (inDistort("simple")) return 0;
  return clampLog(thermalExp() * tLog);
}
// 声子涨落（单次）：声子获取 ×= ceil(lg(max(1,T))^1.5)
function fluctMult() {
  if (!state.phFluct) return 1;
  // 热寂宇宙：声子涨落无效
  if (inDistort("adiabatic")) return 1;
  return Math.max(1, Math.ceil(Math.pow(Math.log10(Math.max(1, temperature())), 1.5)));
}
// 声子涨落的 log10：ceil(lg(max(1,T))^1.5) 本身在 double 范围（log 的幂），直接取 log10
function fluctMultLog() {
  if (!state.phFluct || inDistort("adiabatic")) return 0;
  const inner = Math.max(0, temperatureCappedLog()); // lg(max(1,T))（已裁剪）
  const v = Math.max(1, Math.ceil(Math.pow(inner, 1.5)));
  return clampLog(Math.log10(v));
}
// 声波耦合（单次）：声子获取 ×= ceil(U^0.05)（定向宇宙中失效）
function couplingMult() {
  if (!state.phCoupling || inDistort("directed") || inDistort("adiabatic")) return 1;
  return Math.ceil(Math.pow(Math.abs(state.U), 0.05));
}
// 声波耦合的 log10：log10(ceil(10^(0.05·logU10)))；结果幂 ≤ 0.05×logU10，始终 ≤ double
function couplingMultLog() {
  if (!state.phCoupling || inDistort("directed") || inDistort("adiabatic")) return 0;
  const pow = 0.05 * Math.max(0, getLogU10()); // 10^(0.05·logU10)，可能 > 1e308
  const v = Math.ceil(pow > 308 ? Infinity : Math.pow(10, pow));
  return v === Infinity ? 308.2542 : Math.log10(Math.max(v, 1)); // 双精度上限 log
}
// 声子发生器产量（每游戏秒）
function phononRate() {
  return Math.pow(1.5, state.pg1) * Math.pow(state.pg2 + 1 + pg2Free(), 2) * fluctMult() * couplingMult() * invLMult();
}
// 声子发生器产量的 log10（完整乘法链在 log 域，永不溢出）
function phononRateLog() {
  // Math.pow(1.5, pg1) 的 log = pg1·log10(1.5)
  let log = state.pg1 * Math.log10(1.5);
  // (pg2+1+pg2Free())^2 的 log = 2·log10(...)
  log += 2 * Math.log10(Math.max(1, state.pg2 + 1 + pg2Free()));
  log += fluctMultLog();
  log += couplingMultLog();
  log += invLMultLog();
  return clampLog(log);
}
// 升级3波长指数：0.25 基础 + pg3 每级 0.01（上限 20 级 → 0.45）
// 扭曲：刚性 → 指数 ÷4；简洁 → 指数 ×1.5；冷却 → 指数受削弱倍率影响
function up3Exp() {
  let e = 0.25 + 0.01 * state.pg3;

  if (inDistort("inflation")) e /= 2; // 效果开平方根 = 指数 ÷2
  if (inDistort("simple")) e *= 0.5; // 简洁：升级3效果变为原来的平方根
  return e;
}
// ---------- e100 软上限 ----------
// 当频率超过 1e100 Hz：升级1价格增速 ×10（每级 ×10），升级2价格增速变为乘当前等级，升级3效果超出部分按 5/√(log10 F) 缩放
const SOFTCAP_F = 1e100;
// Stirling 近似 log10(n!)（误差 O(1/n)，软上限价格用代数式直接算）
function lgamma10(n) {
  if (n < 2) return 0;
  return (n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n)) / Math.LN10;
}
function softcapped() { return F() > SOFTCAP_F; }
// 升级1价格（含软上限与通胀）：基础 5×2^n；e100 后增速 ×10（近似取 5×10^n×校准，保持当前价平滑）
function up1Cost() {
  const n = state.up1 + 1;
  // 通胀宇宙：直接 100^n（不叠加 costOf 平方与 e100 软上限）
  if (inDistort("inflation")) return Math.pow(100, n);
  // 普通：5×2^n；e100 软上限：额外 ×5/级
  const logP2 = Math.log10(5) + n * Math.log10(2) + (softcapped() ? Math.max(0, n - 332) * Math.log10(5) : 0);
  return costOf(Math.pow(10, logP2));
}
// 升级2价格（含软上限与通胀）：基础 10^(n+1)；e100 后增速变为乘当前等级
function up2Cost() {
  const n = state.up2 + 1;
  // 通胀宇宙：10^(n+1) × max(n²,100)，从头生效（不叠加软上限与 costOf 平方）
  if (inDistort("inflation")) {
    // 初始价 = 1000 的平方（1e6），此后每级乘 max(n²,100)（n 为当前等级，1 起）
    let p = 1e6;
    for (let k = 1; k <= state.up2; k++) p *= Math.max(k * k, 100);
    return p;
  }
  const k = state.up2; // 当前等级
  if (k <= 98) return costOf(Math.pow(10, n + 1)); // ≤98 级：10^(n+1)
  // ≥98 级软上限：连续衔接 10^100 × k!/99!
  // 近距离（k ≤ 300）用精确循环（乘法本身在 double 内安全：k!/99! ≤ 300!/99! ≈ 1e464 超 double，
  // 故以 log 累加）；远处走 Stirling（误差 O(1/k)）
  let logP;
  if (k <= 300) {
    logP = 100;
    for (let i = 100; i <= k; i++) logP += Math.log10(i);
  } else {
    logP = 100 + lgamma10(k) - lgamma10(99);
  }
  if (logP > 300) return costOf(Decimal.pow(10, logP).toNumber()); // 超 double 返回 Infinity
  return costOf(Math.pow(10, logP));
}
// 升级3实际波长缩减（软上限）：e100 以下 1/F^e；超出部分指数 × scale，scale 受 SVPU3 非欧几何削弱
function up3Wavelength(f) {
  const e = up3Exp();
  if (f <= SOFTCAP_F || !isFinite(f)) return Math.pow(f, e);
  const excess = f / SOFTCAP_F;
  const scale = up3SoftcapScale(Math.log10(f));
  return Math.pow(SOFTCAP_F, e) * Math.pow(excess, e * scale);
}
// 由 log10(F) 计算波长缩减量 F^e 的 log10（含软上限缩放，代数式永不溢出）
function up3WavelengthFromFLog(lf) {
  const e = up3Exp();
  if (!isFinite(lf)) return Infinity;
  if (lf <= 100) return e * lf;
  const scale = up3SoftcapScale(lf);
  return e * 100 + e * scale * (lf - 100);
}
// e100 软上限：超出部分（log10 F > 100）的指数缩放增量
function softcapExtraLog(lf) {
  if (lf <= 100) return 0;
  const scale = up3SoftcapScale(lf);
  return up3Exp() * (scale - 1) * (lf - 100);
}
// 上者的 log10（代数式，永不溢出）
function up3WavelengthLog(f) {
  // f 为 F（double）；超 double 的 F 由调用方传 log 域（see buyUp3）
  const e = up3Exp();
  if (!isFinite(f) || f <= 0) return f === Infinity ? e * FLog() : -Infinity;
  const lf = Math.log10(f);
  if (f <= SOFTCAP_F) return e * lf;
  const scale = up3SoftcapScale(lf);
  return e * 100 + e * scale * (lf - 100);
}
// 冷却宇宙：购买任何升级 → 波速获取量变为 A^k，k 在 15 秒内从 0 线性变到 1；
// 期间再次购买则 k 重置为 0（获取量瞬间跌到 1）
function narrowBlocked() { return inDistort("narrow") && state.narrowPurchases >= 10; }
function markPurchase() {
  if (inDistort("cooldown")) state.lastPurchaseAt = Date.now();
  if (inDistort("narrow")) state.narrowPurchases++;
}
function cooldownExp() {
  if (!inDistort("cooldown") || !state.lastPurchaseAt) return 1;
  const t = (Date.now() - state.lastPurchaseAt) / 1000;
  if (t >= 15) return 0.75;
  return 0.75 * (t / 15); // k: 0 → 0.75 线性（最大指数 0.75）
}


// ---------- 湮灭层 ----------
const T_P0 = 1.4168e32; // 最初宇宙的普朗克温度
// 普朗克常数受 (1+总Sp)^1.5 加成 → 等价于温度倍率（T = n·h·F/k_B 中 h 同倍放大）
// log10 版本（权威，永不溢出）：log10((1+totalSp)^exp)
function planckMultLog() {
  if (inDistort("simple")) return 0; // 简洁宇宙：普朗克常数倍率始终为 1
  const exp = hasDistortMilestone(1) ? 1.5 * daExpMult() : 1.5;
  return clampLog(exp * (getLogTotalSp() > 250 ? getLogTotalSp() : Math.log10(1 + state.totalSp)));
}
function planckMult() {
  const l = planckMultLog();
  return l > 308 ? Infinity : Math.pow(10, l);
}
// 当前宇宙温度硬上限：t·(1+总Sp)^10
// log10 版本（权威）：log10(T_P0) + exp·log10(1+totalSp)，含 250 软上限收敛
function temperatureCapLog() {
  const exp = hasDistortMilestone(1) ? 10 * daExpMult() : 10;
  let logCap = Math.log10(T_P0) + exp * (getLogTotalSp() > 250 ? getLogTotalSp() : Math.log10(1 + state.totalSp));
  if (logCap > 250) logCap = 225 + 0.1 * logCap; // 软上限：超 1e250 部分开十次方根
  return clampLog(logCap);
}
function temperatureCap() {
  const logCap = temperatureCapLog();
  return logCap > 308 ? Infinity : Math.pow(10, logCap);
}
// 基础奇点获取：10 以下随温度指数线性增长（1 Sp @ T_P0，10 Sp @ 1e50 K），之后 10·(T/1e50)^0.024
function baseSpGain(T) {
  // 连续版本（floor 只在 spGain 最外层乘 distortMult 之后执行）：
  // T < 1e50：旧公式 1~10 线性；1e50 ≤ T < 1e100：lg(T)/5（线性到 20）；T ≥ 1e100：2·T^0.01
  if (T < 1e50) {
    const frac = Math.log10(T / T_P0) / Math.log10(1e50 / T_P0);
    return 1 + 9 * Math.max(0, frac);
  }
  if (T < 1e100) {
    return Math.log10(T) / 5; // e50→10, e70→14, e99→19.8（连续）
  }
  if (T === Infinity || T > 1e300) {
    return Decimal.pow(T, 0.01).times(2).toNumber();
  }
  return 2 * Math.pow(T, 0.01);
}
// AU42 虚幻凝聚：基于虚粒子数量增加奇点获取 ×(1+VP)^0.15
function vpSpMult() {
  if (!auOwned("au42")) return 1;
  return Math.pow(1 + state.virtualParticles, 0.3);
}
function spGainExact() {
  if (state.testBreakRules) return 0;
  const b = baseSpGain(temperature());
  const m = state.distortMult * Math.pow(2, state.sau4) * phononSpMult() * vpSpMult();
  // 超 double 用 Decimal
  if (b > 1e300) return Decimal.pow(b, 1).times(m).toNumber();
  return Math.max(state.annihilations === 0 ? 1 : 0, b) * m;
}
function spGain() {
  // 测试按钮（打破规则）激活期间不能获得 Sp
  if (state.testBreakRules) return 0;
  // distortMult 乘在 floor 内部：先乘后取整，数值连续（外部乘法会造成整数跳变）
  const base = Math.max(state.annihilations === 0 ? 1 : 0, baseSpGain(temperature())) * state.distortMult * Math.pow(2, state.sau4) * phononSpMult() * vpSpMult();
  return Math.floor(base);
}
// spGain 的 log10（用于 fmtNum 显示，超 double 时显示 1eN）。与 spGain() 一致用裁剪后温度。
function spGainLog() {
  if (state.testBreakRules) return NLOG;
  const tLog = temperatureCappedLog();
  let baseLog;
  if (tLog < 50) {
    // baseSpGain 返回 1~10 区间（小数，log 域小）
    return Math.log10(Math.max(1, spGain()));
  }
  if (tLog < 100) {
    baseLog = Math.log10(tLog / 5); // lg(T)/5 的 log
  } else {
    baseLog = Math.log10(2) + 0.01 * tLog; // 2·T^0.01 的 log
  }
  const mLog = Math.log10(state.distortMult) + state.sau4 * Math.log10(2) + Math.log10(Math.max(1, phononSpMult())) + (auOwned("au42") ? 0.3 * Math.log10(Math.max(1, 1 + state.virtualParticles)) : 0);
  return clampLog(baseLog + mLog);
}
// gainRate 的 log10 版本（完整乘法链在 log 域，永不溢出）
function gainRate() {
  let g;
  if (inDistort("simple")) {
    // 简洁：基础固定 1，升级 1/2 无效
    g = 1;
  } else {
    // A21 奖励：up1 的效果变为原来的 1.5 次方；AU11 机械共振：指数 up1Exp()
    const base = Math.pow(state.up1, (state.ach.normal.includes("A21") ? 1.5 : 1) * up1Exp());
    g = base * Math.pow(up2Base(), state.up2);
  }
  // 单次升级"频率加成波速获取"：拥有后 ×(1 + lg(F+1))；F 超 double 时用 FLog（防 Infinity 污染）
  if (state.meta1 >= 1) {
    const lf = FLog(); // log10(F)，始终有限
    const factor = lf > 0 ? (1 + lf) : (1 + Math.log10(Math.pow(10, lf) + 1));
    g *= factor;
  }
  // 热涨落：波速获取 ×= max(1, T)^0.2
  g *= thermalMult();
  // 奇点：波速获取 ×= (1+总Sp)^2；1DA 后指数 ×daExpMult()
  // 简洁宇宙：第一个奇点效果平方根（指数 ÷2，即 ^2 → ^1）
  {
    let exp = hasDistortMilestone(1) ? 2 * daExpMult() : 2;
    if (inDistort("simple")) exp /= 2;
    if (getLogTotalSp() > 250) {
      g *= Decimal.pow(10, getLogTotalSp() * exp).toNumber();
    } else {
      g *= Math.pow(1 + state.totalSp, exp);
    }
  }
  // 定向：每刻 50% 概率取反（F 计算取绝对值，故 U 可为负）
  if (inDistort("directed") && Math.random() < 0.5) g = -g;
  // 冷却宇宙：波速获取量变为 A^k（k 随购买后时间线性 0→1）
  if (inDistort("cooldown")) g = Math.pow(Math.max(0, g), cooldownExp());
  // 滞涨宇宙（原通胀）：波速获取变为原来的平方根（^0.5）
  if (inDistort("inflation")) g = Math.sqrt(Math.max(0, g));
  // 膨胀宇宙：波速获取指数随时间下降（每秒 -0.1，到 0 为止）
  if (inDistort("expand")) g = Math.pow(Math.max(0, g), distortGainExp());
  return g;
}
// gainRate 的 log10 版本（完整乘法链在 log 域，永不溢出）。
// 仅在 gainRate() 的 double 链因中间项溢出而饱和（Infinity）时由 tick 调用，
// 故 normal-play 下不参与计算（零回归）。返回 {log: log10(|g|), sign}。
function gainRateLog() {
  let log, sign = 1;
  if (inDistort("simple")) {
    log = 0; // 基础固定 1
  } else {
    // A21：up1 效果 1.5 次方；AU11：指数 up1Exp()
    const up1ExpTotal = (state.ach.normal.includes("A21") ? 1.5 : 1) * up1Exp();
    log = (state.up1 > 0 ? Math.log10(state.up1) : NLOG) * up1ExpTotal;
    log += state.up2 * Math.log10(Math.max(1e-300, up2Base()));
  }
  // 单次升级"频率加成波速获取"：×(1 + lg(F+1))。因子 = 1 + lg(F+1)；lg(F+1)≈FLog（F 大时）
  // 该因子是"小数"量级（lg(F+1)），其 log10 = log10(1 + lg(F+1))，恒在 double 范围。
  if (state.meta1 >= 1) {
    const lf = FLog();
    const lgF1 = lf > 15 ? lf : Math.log10(Math.pow(10, lf) + 1); // F 大时 lg(F+1)≈lf；否则精确
    log += Math.log10(1 + lgF1);
  }
  // 热涨落（幂项 → 指数乘；热寂为负、简洁为 0）
  log += thermalMultLog();
  // 奇点：×(1+总Sp)^exp；1DA 后指数 ×daExpMult()；简洁：指数 ÷2
  {
    let exp = hasDistortMilestone(1) ? 2 * daExpMult() : 2;
    if (inDistort("simple")) exp /= 2;
    log += exp * (getLogTotalSp() > 250 ? getLogTotalSp() : Math.log10(1 + state.totalSp));
  }
  // 定向：每刻 50% 概率取反
  if (inDistort("directed") && Math.random() < 0.5) sign = -1;
  // 冷却：g^cooldownExp → log ×= cooldownExp（仅 g>0；g≤0 时原代码 max(0,g) 归零）
  if (inDistort("cooldown")) {
    if (log <= NLOG + 1) return { log: NLOG, sign: 1 }; // g=0
    log *= cooldownExp();
  }
  // 滞涨（原通胀）：平方根 → log ÷ 2
  if (inDistort("inflation")) log *= 0.5;
  // 膨胀：波速获取指数随时间下降 → log ×= distortGainExp（到 0 后 gain=0）
  if (inDistort("expand")) {
    const ge = distortGainExp();
    if (ge <= 0) return { log: NLOG, sign: 1 };
    log *= ge;
  }
  return { log: clampLog(log), sign };
}
// 时间速率：每个普通成就给予 ×1.1 的游戏时间速率加成；黑洞扭曲状态给予 ×(1+bhEffect)；
// A41 特殊奖励：总时间倍率再 ^1.1；rua摆线随机倍率加成（持续 10 分钟）
function timeRate() {
  let tr = Math.pow(achTimeBase(), state.ach.normal.length) * timeArrowMult() * absZeroMult() * bhTimeMult();
  if (state.ach.normal.includes("A41")) tr = Math.pow(tr, 1.1);
  if (state.ruaBoostUntil && Date.now() < state.ruaBoostUntil) tr *= state.ruaBoostMult;
  return tr;
}
// A25 奖励：每次重置后初始波速 100 m/s（否则 10）
function resetU() { return state.ach.normal.includes("A25") ? 100 : 10; }
// 升级价格（下一次购买）
// 通胀宇宙：所有升级的价格变为原来的平方
function costOf(c) { return inDistort("inflation") ? c * c : c; }
// 通胀宇宙下价格的 log10 = 原价 log × 2，否则原价 log
function costOfLog(cLog) { return inDistort("inflation") ? cLog * 2 : cLog; }
function up3Visible() { return F() >= 50000 || state.up3 >= 1; }
const META_COST = 5000; // 单次升级"频率加成波速获取"固定价格（单次购买）
const PH_UNLOCK_COST = 1e10; // 单次升级"解锁声子"价格
const LOG_META_COST = Math.log10(META_COST);
const LOG_PH_UNLOCK_COST = Math.log10(PH_UNLOCK_COST);
// 通胀宇宙下常量价格也需平方（costOf 定义在后，运行时无碍）
// 价格的 log10 getter（与 double 版 up*Cost() 并存，仅 cmp 在饱和时使用）
function up1CostLog() {
  const n = state.up1 + 1;
  // 滞涨宇宙：double 版直接 100^n（已含通胀，不叠 costOf），log 版必须一致 = 2n
  if (inDistort("inflation")) return clampLog(n * Math.log10(100));
  let logP2 = Math.log10(5) + n * Math.log10(2) + (softcapped() ? Math.max(0, n - 332) * Math.log10(5) : 0);
  return clampLog(costOfLog(logP2));
}
function up2CostLog() {
  const n = state.up2 + 1;
  if (inDistort("inflation")) {
    // double 版 1e6 × ∏max(k²,100) 已含通胀，不叠 costOf
    let lp = 6;
    for (let k = 1; k <= state.up2; k++) lp += Math.log10(Math.max(k * k, 100));
    return clampLog(lp);
  }
  const k = state.up2;
  if (k <= 98) return clampLog(costOfLog(n + 1));
  let logP;
  if (k <= 300) {
    logP = 100;
    for (let i = 100; i <= k; i++) logP += Math.log10(i);
  } else {
    logP = 100 + lgamma10(k) - lgamma10(99);
  }
  return clampLog(costOfLog(logP));
}
function pg1CostLog() { return clampLog(costOfLog(Math.log10(1e10) + state.pg1 * Math.log10(100))); }
function pg2CostLog() { return clampLog(costOfLog(Math.log10(100) + state.pg2 * Math.log10(2))); }
function pg3CostLog() { return clampLog(costOfLog(4 + state.pg3)); }

// ---------- Number / time formatting ----------
function fmt(num) {
  if (num === null || num === undefined || isNaN(num)) return "—";
  if (num === 0) return "0";
  if (!isFinite(num)) return "∞";
  // 小数位数由设置控制（3–6）
  const d = Math.min(6, Math.max(3, (state.settings && state.settings.decimals) || 3));
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);
  const tiny = Math.pow(10, -d); // 小于此值用科学计数法
  if (abs < 1000 && abs >= tiny) return sign + abs.toFixed(d);
  if (abs > 0 && abs < tiny) {
    return sign + abs.toExponential(d).replace("e+", "e");
  }
  const notation = (state.settings && state.settings.notation) || "scientific";
  if (notation === "log") {
    return "10^" + Math.log10(abs).toFixed(d);
  }
  if (notation === "engineering") {
    const exp = Math.floor(Math.log10(abs));
    const engExp = Math.floor(exp / 3) * 3;
    const mant = abs / Math.pow(10, engExp);
    return sign + mant.toFixed(d) + "e" + engExp;
  }
  // scientific (default)
  return sign + abs.toExponential(d).replace("e+", "e");
}

function fmtLog(logV) {
  // 以 log10 显示：logV < 308 用 double 指数；≥308 用 log 域还原尾数，显示 a.bbeN
  if (!isFinite(logV) || logV >= LOG_CAP) return "∞"; // LOG_CAP 钳制值视为无穷
  if (logV <= NLOG + 1) return "0";
  if (logV < 308) return Math.pow(10, logV).toExponential(3).replace("e+", "e");
  // log 域：logV = floor(logV) + frac；值 = 10^frac × 10^floor(logV)
  const d = Math.min(6, Math.max(3, (state.settings && state.settings.decimals) || 3));
  const exp = Math.floor(logV);
  const frac = logV - exp;
  const mant = Math.pow(10, frac);
  return mant.toFixed(d) + "e" + exp;
}
// 统一显示：double 在范围内走 fmt（现状），饱和/超 1e308 走 fmtLog（输出 1eN）
function fmtNum(doubleVal, logVal) {
  if (isFinite(doubleVal) && Math.abs(doubleVal) < LOG_FALLBACK) return fmt(doubleVal);
  if (logVal !== undefined && isFinite(logVal)) return fmtLog(logVal);
  return "∞";
}
// 整数显示：double 在范围内取 floor 后走 fmt；超 1e308 走 fmtLog（虚粒子等计数类资源）
function fmtInt(doubleVal, logVal) {
  if (isFinite(doubleVal) && Math.abs(doubleVal) < LOG_FALLBACK) return fmt(Math.floor(doubleVal));
  if (logVal !== undefined && isFinite(logVal)) {
    // log 域下整数：取 logVal 的整数部分为 1eN，尾数 floor
    if (logVal <= 15) return fmt(Math.floor(Math.pow(10, logVal)));
    return fmtLog(logVal); // 超大时 1eN 格式（已是整数概念）
  }
  return "∞";
}
function fmtTime(seconds, precise) {
  // precise=true 时显示最小分度 25ms（挑战计时用；计算精度也是 25ms）
  const total = precise ? seconds : Math.floor(seconds);
  const d = Math.floor(total / 86400);
  // 超过 1e4 天：只显示 XXXd 并用科学计数法
  if (d >= 1e4) return d.toExponential(2).replace("e+", "e") + "d";
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const sStr = precise ? (Math.round(s * 40) / 40).toString() : `${s}`;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sStr}s`;
  if (m > 0) return `${m}m ${sStr}s`;
  return `${sStr}s`;
}

// ---------- Base64 (Unicode-safe) ----------
function encodeSave(obj) {
  const json = JSON.stringify(obj);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return "WI1-" + b64;
}
function decodeSave(str) {
  str = str.trim();
  if (str.startsWith("WI1-")) str = str.slice(4);
  const json = decodeURIComponent(escape(atob(str)));
  return JSON.parse(json);
}

// ---------- Persistence ----------
// 迁移旧存档：旧版 up3 叠加除法、无 up3LastF；按当前波长反推等效峰值频率。
function migrateState() {
  // 旧档可能直接写 state.L（无 logL10）：同步 log 表示
  if (state.logL10 === undefined || state.logL10 === null || !isFinite(state.logL10)) {
    state.logL10 = (state.L > 0) ? Math.log10(state.L) : 0;
  }
  // 存档若带有 logL10 且 L 已下溢为 0，则 L 以 log 为准
  if (state.L === 0 && isFinite(state.logL10)) state.L = 0; // 保持 0，读取走 getLogL10
  // v0.4.2.5：U/累计频率/极值/升级3峰值 的 log 权威字段回填
  if (state.logU10 === undefined || state.logU10 === null || !isFinite(state.logU10)) {
    state.logU10 = state.U > 0 ? Math.log10(state.U) : NLOG;
  }
  if (state.logTotalF === undefined || state.logTotalF === null || !isFinite(state.logTotalF)) {
    state.logTotalF = state.totalFGained > 0 ? Math.log10(state.totalFGained) : NLOG;
  }
  if (state.logMaxF === undefined || state.logMaxF === null || !isFinite(state.logMaxF)) {
    state.logMaxF = state.maxF > 0 ? (isFinite(state.maxF) ? Math.log10(state.maxF) : getLogU10()) : 1;
  }
  if (state.logMaxU === undefined || state.logMaxU === null || !isFinite(state.logMaxU)) {
    state.logMaxU = state.maxU > 0 ? (isFinite(state.maxU) ? Math.log10(state.maxU) : getLogU10()) : 1;
  }
  if (state.logMinL === undefined || state.logMinL === null || !isFinite(state.logMinL)) {
    state.logMinL = (state.minL > 0) ? Math.log10(state.minL) : getLogL10();
  }
  // 升级3 峰值：旧档 up3LastF 可能是 Infinity（JSON 存为 null）或 0；用 log 重建
  if (state.logUp3LastF === undefined || state.logUp3LastF === null || !isFinite(state.logUp3LastF) || state.logUp3LastF <= NLOG + 1) {
    if (state.up3LastF > 0) {
      state.logUp3LastF = isFinite(state.up3LastF) ? Math.log10(state.up3LastF) : 308;
    } else if (state.up3 > 0) {
      // 旧版无 up3LastF 但有 up3：从波长反推等效峰值频率
      state.logUp3LastF = -getLogL10() / up3Exp();
      state.up3LastF = state.logUp3LastF > 308 ? Infinity : Math.pow(10, state.logUp3LastF);
    } else {
      state.logUp3LastF = NLOG;
    }
  }
  // 旧档 up3 反推（logUp3LastF 已建好则跳过）
  if (state.up3 > 0 && !state.up3LastF && state.logUp3LastF <= NLOG + 1) {
    state.logUp3LastF = -getLogL10() / up3Exp();
    state.up3LastF = state.logUp3LastF > 308 ? Infinity : Math.pow(10, state.logUp3LastF);
  }
  // 旧存档无 realTime：以 playTime 作为初始近似值
  if (!state.realTime) state.realTime = state.playTime;
  // 旧存档 distortTotal 为对象（各宇宙分别累计）时：求和迁移为单一数字
  if (typeof state.distortTotal === "object" && state.distortTotal !== null) {
    let s = 0;
    for (const k in state.distortTotal) s += state.distortTotal[k] || 0;
    state.distortTotal = s;
  }
  // v0.4.2.x：批量升级改版（增速 ×20），一次性清除旧价格体系的等级（标记防重复）
  if (!state.batchResetDone && state.batchLvl > 0) { state.batchLvl = 0; state.batchMax = 2; state.batchResetDone = 1; }
  else if (!state.batchResetDone) state.batchResetDone = 1;
  // v0.4.3 黑洞字段回填（旧档无 bhMass/bhState/sbu*）
  if (state.bhMass === undefined || state.bhMass === null) { state.bhMass = 1; state.logBhMass = 0; }
  if (state.logBhMass === undefined || !isFinite(state.logBhMass)) state.logBhMass = state.bhMass > 0 ? Math.log10(state.bhMass) : NLOG;
  if (!state.bhState) state.bhState = "accrete";
  if (state.virtualParticles === undefined || state.virtualParticles === null) { state.virtualParticles = 0; state.logVP = NLOG; }
  if (state.logVP === undefined || !isFinite(state.logVP)) state.logVP = state.virtualParticles > 0 ? Math.log10(state.virtualParticles) : NLOG;
  if (state.sbu1 === undefined) state.sbu1 = 0;
  if (state.sbu2 === undefined) state.sbu2 = 0;
  if (state.sbu3 === undefined) state.sbu3 = 0;
  // v0.4.3.1：黑洞成就追踪字段回填
  if (state.bhCanvasClicks === undefined) state.bhCanvasClicks = 0;
  if (state.bhPulseSince === undefined) state.bhPulseSince = 0;
  if (state.bhDistorlSince === undefined) state.bhDistorlSince = 0;
  // v0.4.3.2：rua摆线字段回填
  if (state.ruaFav === undefined) state.ruaFav = 0;
  if (state.ruaCountToday === undefined) state.ruaCountToday = 0;
  if (state.ruaClicksToday === undefined) state.ruaClicksToday = 0;
  if (state.ruaDayStart === undefined) state.ruaDayStart = 0;
  if (state.ruaBoostMult === undefined) state.ruaBoostMult = 1;
  if (state.ruaBoostUntil === undefined) state.ruaBoostUntil = 0;
  if (state.ruaBoostCD === undefined) state.ruaBoostCD = 0;
  // v0.4.3.2：自动湮灭 CD 升级字段回填
  if (state.autoAnnCDLvl === undefined) state.autoAnnCDLvl = 0;
  // 测试开关不跨会话残留：加载存档时重置（温度无上限的测试状态若被保存，
  // 热反馈失控会让每次湮灭后十几秒就再次到达 Tcap 且不获 Sp）
  if (state.testBreakRules) state.testBreakRules = false;
  // JSON 无法存 Infinity：超 double 的 double 缓存在存档里是 null。
  // 若不恢复，Math.abs(null)=0 会令 tick 误走 double 路径（setU(null+gd) 打塌 logU10），
  // 且各级回填把 null 当 0。统一从 log 权威恢复缓存。
  const fromLog = (lg) => (lg <= NLOG + 1) ? 0 : (lg > 308 ? Infinity : Math.pow(10, lg));
  if (state.U === null || state.U === undefined) state.U = fromLog(getLogU10());
  if (state.totalFGained === null || state.totalFGained === undefined) state.totalFGained = fromLog(getLogTotalF());
  if (state.phonons === null || state.phonons === undefined) {
    state.phonons = (state.logDph !== undefined && isFinite(state.logDph) && state.logDph > 0) ? fromLog(state.logDph) : 0;
  }
  if (state.maxF === null || state.maxF === undefined) state.maxF = fromLog(getLogMaxF());
  if (state.maxU === null || state.maxU === undefined) state.maxU = fromLog(getLogMaxU());
  if (state.bhMass === null || state.bhMass === undefined) state.bhMass = fromLog(getLogBhMass());
  if (state.virtualParticles === null || state.virtualParticles === undefined) state.virtualParticles = fromLog(getLogVP());
  if (state.up3LastF === null || state.up3LastF === undefined) {
    const lp = getLogUp3LastF();
    state.up3LastF = (lp <= NLOG + 1) ? 0 : fromLog(lp);
  }
  // 存档净化：clampLog 修复前的失控会把 log 权威字段写成天文数字（污染指纹
  // 集中在 [2.3e14, 1e15]：0.23×LOG_CAP 与 LOG_CAP 本体；正常游玩 log ≥1e12
  // 需连续不湮灭挂机十余小时才会触及）。检测即修复：U 重置为湮灭初值，
  // 派生统计跟随，Sp/声子等资源清为对应零值。
  const SANITY_MAX = 1e12;
  const polluted = [state.logU10, state.logL10, state.logTotalF, state.logMaxF, state.logMaxU, state.logDsp, state.logDtotal, state.logDph, state.logUp3LastF, state.logVP, state.logBhMass]
    .some(v => v !== undefined && v !== null && isFinite(v) && Math.abs(v) >= SANITY_MAX);
  if (polluted) {
    setU(resetU());
    setTotalFGained(resetU());
    state.L = 1; state.logL10 = 0;
    state.maxF = resetU(); state.logMaxF = 2;
    state.maxU = resetU(); state.logMaxU = 2;
    state.minL = 1; state.logMinL = 0;
    setSp(0); setTotalSp(0);
    setPhonons(0);
    setUp3LastF(NLOG);
    setVP(0);
    setBhMass(1);
    state.up1 = 0; state.up2 = 0; state.up3 = 0; state.meta1 = 0;
    state.pg1 = 0; state.pg2 = 0; state.pg3 = 0;
    state.phFluct = 0; state.phCoupling = 0;
    state.distortActive = "";
  }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const obj = decodeSave(raw);
    state = Object.assign(defaultState(), obj);
    state.settings = Object.assign({ theme: "black", notation: "scientific", decimals: 3 }, obj.settings || {});
    state.ach = Object.assign({ normal: [], hidden: [], hiddenRevealed: [] }, obj.ach || {});
    migrateState();
    // 迁移：v0.1 旧存档用 frequency 字段
    if (obj.frequency !== undefined && obj.U === undefined) {
      setU(obj.frequency);
      state.L = 1; state.logL10 = 0;
    }
    if (obj.totalFrequency !== undefined && state.totalFGained === undefined) {
      setTotalFGained(obj.totalFrequency);
    }
    // 校正派生统计下限（log 域，防 maxF/maxU 恒 Infinity、minL 下溢 0）
    {
      const fLog = FLog();
      if (fLog > getLogMaxF()) { state.maxF = F(); state.logMaxF = fLog; }
      if (getLogU10() > getLogMaxU()) { state.maxU = state.U; state.logMaxU = getLogU10(); }
      if (getLogL10() < getLogMinL()) { state.minL = state.L; state.logMinL = getLogL10(); }
    }
    applyTheme(state.settings.theme);
    applyNotation(state.settings.notation);
    state.lastTick = Date.now();
    return true;
  } catch (e) {
    console.error("存档读取失败:", e);
    return false;
  }
}

function saveGame() {
  state.lastTick = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, encodeSave(state));
    setAutosaveStatus("已自动保存 " + new Date().toLocaleTimeString());
    return true;
  } catch (e) {
    console.error("存档失败:", e);
    setAutosaveStatus("保存失败！");
    return false;
  }
}

function hardReset() {
  if (!confirm("确定要硬重置吗？这将清除当前存档的所有进度！")) return;
  if (!confirm("再次确认：所有进度与成就都将丢失。继续？")) return;
  localStorage.removeItem(SAVE_KEY);
  state = defaultState();
  applyTheme("black");
  applyNotation("scientific");
  saveGame();
  renderAll();
  setAutosaveStatus("已硬重置");
}

// ---------- Save slots ----------
function slotKey(i) { return SLOT_KEY_PREFIX + "_" + i; }
function getSlotInfo(i) {
  try {
    const raw = localStorage.getItem(slotKey(i));
    if (!raw) return null;
    const obj = decodeSave(raw);
    // 槽内存档可能超 double：预览频率用 log 域计算（双精度除法会溢出为 ∞）
    const uLog = (obj.logU10 !== undefined && isFinite(obj.logU10)) ? obj.logU10
      : (obj.U > 0 ? (isFinite(obj.U) ? Math.log10(obj.U) : 308) : 1);
    const lLog = (obj.logL10 !== undefined && isFinite(obj.logL10)) ? obj.logL10
      : (obj.L > 0 ? Math.log10(obj.L) : 0);
    return { freqLog: clampLog(uLog - lLog), realTime: obj.realTime || obj.playTime || 0, empty: false };
  } catch { return null; }
}
function saveToSlot(i) {
  state.lastTick = Date.now();
  try {
    localStorage.setItem(slotKey(i), encodeSave(state));
    setAutosaveStatus(`已保存到存档槽 ${i + 1}`);
    renderSlots();
  } catch { setAutosaveStatus("保存到槽失败！"); }
}
function loadFromSlot(i) {
  try {
    const raw = localStorage.getItem(slotKey(i));
    if (!raw) { setAutosaveStatus("该槽为空"); return; }
    const obj = decodeSave(raw);
    state = Object.assign(defaultState(), obj);
    state.settings = Object.assign({ theme: "black", notation: "scientific", decimals: 3 }, obj.settings || {});
    state.ach = Object.assign({ normal: [], hidden: [], hiddenRevealed: [] }, obj.ach || {});
    migrateState();
    state.lastTick = Date.now();
    currentSlot = i;
    applyTheme(state.settings.theme);
    applyNotation(state.settings.notation);
    saveGame();
    renderAll();
    setAutosaveStatus(`已从存档槽 ${i + 1} 载入`);
  } catch { setAutosaveStatus("读取槽失败！"); }
}
function deleteSlot(i) {
  if (!confirm(`确定删除存档槽 ${i + 1}？`)) return;
  localStorage.removeItem(slotKey(i));
  renderSlots();
  setAutosaveStatus(`已删除存档槽 ${i + 1}`);
}
function renderSlots() {
  const list = document.getElementById("slot-list");
  list.innerHTML = "";
  for (let i = 0; i < SLOT_COUNT; i++) {
    const info = getSlotInfo(i);
    const row = document.createElement("div");
    row.className = "slot" + (i === currentSlot ? " current" : "");
    const name = document.createElement("div"); name.className = "slot-name"; name.textContent = `存档槽 ${i + 1}`;
    const meta = document.createElement("div"); meta.className = "slot-info";
    meta.textContent = (info && !info.empty) ? `${fmtLog(info.freqLog)} Hz · ${fmtTime(info.realTime)}` : "（空）";
    const actions = document.createElement("div"); actions.className = "slot-actions";
    const b1 = document.createElement("button"); b1.textContent = "保存"; b1.onclick = () => saveToSlot(i);
    const b2 = document.createElement("button"); b2.textContent = "读取"; b2.onclick = () => loadFromSlot(i);
    const b3 = document.createElement("button"); b3.textContent = "删除"; b3.className = "danger-btn"; b3.onclick = () => deleteSlot(i);
    actions.append(b1, b2, b3);
    row.append(name, meta, actions);
    list.appendChild(row);
  }
}

// ---------- Theme / notation ----------
function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  state.settings.theme = theme;
  document.getElementById("theme-white").classList.toggle("active", theme === "white");
  document.getElementById("theme-black").classList.toggle("active", theme === "black");
}
function applyNotation(n) {
  state.settings.notation = n;
  document.querySelectorAll("#notation-row button").forEach(b => {
    b.classList.toggle("active", b.dataset.notation === n);
  });
}
function applyDecimals(n) {
  n = Math.min(6, Math.max(3, parseInt(n, 10) || 3));
  state.settings.decimals = n;
  const inp = document.getElementById("decimals-input");
  if (inp) inp.value = n;
}
// 界面刷新频率（显示层）：16/33/100 ms —— 逻辑 tick 恒为 100ms，不影响数值
let uiFrameInterval = 33;
let uiLastFrame = 0;
function applyUiFps(ms) {
  ms = [16, 33, 100].includes(parseInt(ms, 10)) ? parseInt(ms, 10) : 33;
  state.settings.uiFps = ms;
  uiFrameInterval = ms;
  document.querySelectorAll("#uifps-row button").forEach(b => {
    b.classList.toggle("active", parseInt(b.dataset.uifps, 10) === ms);
  });
}

// S6 选择困难症：在 10 分钟内，没有任何一种显示方式被连续使用超过 2 分钟。
// 实现：记录每次切换的时间戳；取当前时间作为末尾，向前找一段连续间隔均 ≤2min 的区间，
// 若该区间跨度 ≥10min 则达成。
function checkS6() {
  if (state.ach.hidden.includes("S6")) return;
  const sw = state.notationSwitches.slice();
  const now = Date.now();
  sw.push(now); // 把"当前时刻"作为最后一个区间端点
  let i = sw.length - 1;
  while (i > 0 && sw[i] - sw[i - 1] <= 120000) i--; // 连续间隔 ≤2min
  const span = sw[sw.length - 1] - sw[i];
  if (span >= 600000) grantHidden("S6");
}

// ---------- Tabs ----------
const DEFAULT_SUBTAB = { wave: "main", stats: "stats-data", annihilation: "ann-sp" };
let lastSubtab = {}; // 记录每个主标签上次停留的子标签页
function switchTab(name) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  const page = document.getElementById("page-" + name);
  if (page) page.classList.remove("hidden");
  // 返回上次离开时所处的子标签页；无记录则用默认
  const sub = lastSubtab[name] || DEFAULT_SUBTAB[name];
  if (sub) switchSubtab(sub);
  if (name === "settings") renderSlots();
  if (name === "achievements") updateAchievementsUI();
  if (name === "annihilation") { updateSpUI(); updateDistortUI(); updateBlackholeUI(); }
  if (name === "automation") updateAutomationUI();
}
function switchSubtab(name) {
  document.querySelectorAll(".subtab").forEach(t => t.classList.toggle("active", t.dataset.subtab === name));
  document.querySelectorAll(".subpage").forEach(p => p.classList.add("hidden"));
  document.getElementById("sub-" + name).classList.remove("hidden");
  // 记录当前主标签下最后停留的子标签页
  const activeTab = document.querySelector(".tab.active");
  if (activeTab) lastSubtab[activeTab.dataset.tab] = name;
  if (name === "ann-sp") updateSpUI();
  if (name === "ann-distort") updateDistortUI();
  if (name === "ann-blackhole") updateBlackholeUI();
}

// ---------- Purchase ----------
function buyUp1() {
  if (inDistort("simple")) return; // 简洁宇宙：波动升级1/2无效（不可购买）
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  const c = up1Cost();
  // 资源必须达标（spu1 只免扣款，不免门槛）；F/c 均 < LOG_FALLBACK 时走 double（零回归），饱和时退 log 域
  if (cmpLT(F(), c, FLog(), up1CostLog())) return;
  if (!upgradesFree()) subULog(up1CostLog());
  markPurchase();
  state.up1++;
  checkAchievements();
  renderWave();
}
function buyUp2() {
  if (inDistort("simple")) return; // 简洁宇宙：波动升级1/2无效（不可购买）
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  const c = up2Cost();
  if (cmpLT(F(), c, FLog(), up2CostLog())) return; // 资源必须达标（spu1 只免扣款，不免门槛）
  if (!upgradesFree()) subULog(up2CostLog());
  markPurchase();
  state.up2++;
  checkAchievements();
  renderWave();
}
function buyUp3() {
  if (inDistort("rigid")) return; // 刚性宇宙：升级 3 无效
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  // 仅当当前频率超过上次记录的峰值时才更新（log 域比较，超 double 不截断；不再用 Infinity 哨兵）
  const fLog = FLog();
  const lastLog = getLogUp3LastF();
  if (fLog <= lastLog) return;
  // e100 软上限 + 防下溢：log 域算波长缩减量与新 L
  const wLog = up3WavelengthFromFLog(fLog);
  // S8 无用功：加成小于 1.1 倍时购买（log 域：旧L × 缩减 < 1.1）
  if (getLogL10() + wLog < Math.log10(1.1)) grantHidden("S8");
  setUp3LastF(fLog); // 权威 log（替代旧版 Infinity 哨兵）
  state.logL10 = -wLog;
  state.L = wLog < 308 ? 1 / Math.pow(10, wLog) : 0; // 超 double 下溢为 0（读取走 log）
  if (wLog < getLogMinL()) { state.minL = state.L; state.logMinL = wLog; } // 极值走 log
  setU(resetU());
  state.up1 = 0;
  if (!auOwned("au23")) state.up2 = 0; // AU23 声纹记忆：购买升级3不再重置升级2
  markPurchase();
  state.up3++;
  checkAchievements();
  renderWave();
  return true; // 成功购买（时间模式自动化用）
}

// ---------- Upgrades rendering (build-once, in-place update) ----------
// 为避免每 tick 重建 DOM 导致按钮闪烁/点击丢失，卡片只在首次构建，
// 之后仅原地更新文本与 class。
let up1Card, up2Card, up3Card = null, metaRefs, unlockRefs;
let upgradesBuilt = false, metaBuilt = false;

function buildUpgradeCard({ name, desc, buyFn }) {
  const card = document.createElement("div");
  card.className = "upgrade-card";
  const left = document.createElement("div"); left.className = "up-card-left";
  const nm = document.createElement("div"); nm.className = "up-name"; nm.textContent = name;
  const d = document.createElement("div"); d.className = "up-desc"; d.textContent = desc;
  const lv = document.createElement("div"); lv.className = "up-level";
  const ef = document.createElement("div"); ef.className = "up-effect";
  left.append(nm, d, lv, ef);
  const right = document.createElement("div"); right.className = "up-card-right";
  const cl = document.createElement("div"); cl.className = "up-cost-label"; cl.textContent = "价格";
  const co = document.createElement("div"); co.className = "up-cost";
  const btn = document.createElement("button"); btn.className = "up-buy"; btn.textContent = "购买";
  if (buyFn) btn.addEventListener("click", buyFn);
  right.append(cl, co, btn);
  card.append(left, right);
  return { root: card, levelEl: lv, effectEl: ef, costEl: co, btn,
    update({ level, effect, cost, affordable, btnText }) {
      this.levelEl.textContent = level;
      this.effectEl.textContent = effect;
      this.costEl.textContent = cost;
      this.root.classList.toggle("affordable", !!affordable);
      this.btn.disabled = !affordable;
      if (btnText !== undefined) this.btn.textContent = btnText;
    } };
}

function buildUpgradesOnce() {
  if (upgradesBuilt) return;
  const list = document.getElementById("upgrades-list");
  list.innerHTML = "";
  up1Card = buildUpgradeCard({ name: "增加基础波速获取", desc: "每次购买为基础获取速率 +1", buyFn: buyUp1 });
  up2Card = buildUpgradeCard({ name: "加成波速获取", desc: "每次购买使获取速率 ×2", buyFn: buyUp2 });
  list.append(up1Card.root, up2Card.root);
  up3Card = null;
  upgradesBuilt = true;
}

function buildMetaOnce() {
  if (metaBuilt) return;
  const list = document.getElementById("meta-upgrades-list");
  list.innerHTML = "";
  const card = document.createElement("div");
  card.className = "upgrade-card locked";
  const left = document.createElement("div"); left.className = "up-card-left";
  const nm = document.createElement("div"); nm.className = "up-name"; nm.textContent = "频率加成波速获取";
  const d = document.createElement("div"); d.className = "up-desc"; d.textContent = "单次升级 · 按当前频率加成波速获取";
  const ef = document.createElement("div"); ef.className = "up-effect";
  left.append(nm, d, ef);
  const right = document.createElement("div"); right.className = "up-card-right";
  const cl = document.createElement("div"); cl.className = "up-cost-label"; cl.textContent = "价格";
  const co = document.createElement("div"); co.className = "up-cost";
  const btn = document.createElement("button"); btn.className = "up-buy"; btn.textContent = "购买";
  // 按钮永不 disable：价格充足时购买；价格不足时计入 S3（5 秒 10 次）。
  btn.addEventListener("click", () => {
    if (state.meta1 >= 1) return; // 已拥有
    if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
    const f = F();
    if (cmpGE(f, costOf(META_COST), FLog(), costOfLog(LOG_META_COST))) {
      // 价格充足（或奇点升级免费）：消耗并拥有
      if (!upgradesFree()) subULog(costOfLog(LOG_META_COST));
      markPurchase();
      state.meta1 = 1;
      checkAchievements(); // 触发 A12 协同
      updateUpgradesUI();
      updateAchievementsUI();
      setAutosaveStatus("已购买：频率加成波长获取");
      return;
    }
    // 价格不足：计入 S3
    const now = Date.now();
    state.metaClicks = state.metaClicks.filter(t => now - t < 5000);
    state.metaClicks.push(now);
    if (state.metaClicks.length >= 10 && !state.ach.hidden.includes("S3")) {
      grantHidden("S3");
      state.metaClicks = [];
      updateAchievementsUI();
    }
    setAutosaveStatus("价格不足，需要 " + fmt(costOf(META_COST)) + " Hz");
  });
  right.append(cl, co, btn);
  card.append(left, right);
  list.appendChild(card);
  metaRefs = { root: card, effectEl: ef, costEl: co, btn };
  // 解锁声子卡（单次，1e10 Hz）
  const ucard = document.createElement("div");
  ucard.className = "upgrade-card locked";
  const uleft = document.createElement("div"); uleft.className = "up-card-left";
  const unm = document.createElement("div"); unm.className = "up-name"; unm.textContent = "解锁声子";
  const ud = document.createElement("div"); ud.className = "up-desc"; ud.textContent = "单次升级 · 解锁波动标签下的「声子」子页面";
  const uef = document.createElement("div"); uef.className = "up-effect";
  uleft.append(unm, ud, uef);
  const uright = document.createElement("div"); uright.className = "up-card-right";
  const ucl = document.createElement("div"); ucl.className = "up-cost-label"; ucl.textContent = "价格";
  const uco = document.createElement("div"); uco.className = "up-cost";
  const ubtn = document.createElement("button"); ubtn.className = "up-buy"; ubtn.textContent = "购买";
  ubtn.addEventListener("click", buyPhUnlock);
  uright.append(ucl, uco, ubtn);
  ucard.append(uleft, uright);
  list.appendChild(ucard);
  unlockRefs = { root: ucard, effectEl: uef, costEl: uco, btn: ubtn };
  metaBuilt = true;
}

function updateUpgradesUI() {
  buildUpgradesOnce();
  // 升级3 随可见性增删（仅切换时操作 DOM，非每 tick）
  const vis = up3Visible();
  if (vis && !up3Card) {
    up3Card = buildUpgradeCard({ name: "缩短波长，但重置波速", desc: "重置波速与基础/加成升级；按峰值频率更新波长", buyFn: buyUp3 });
    document.getElementById("upgrades-list").appendChild(up3Card.root);
  } else if (!vis && up3Card) {
    up3Card.root.remove();
    up3Card = null;
  }
  const f = F();
  const fLog = FLog();
  up1Card.update({
    level: `等级 ${state.up1}`,
    effect: `当前获取速率: ${fmtNum(gainRate() * timeRate(), gainRateLog().log + Math.log10(timeRate()))} m/s²`,
    cost: fmtNum(up1Cost(), up1CostLog()) + " Hz",
    affordable: cmpGE(f, up1Cost(), FLog(), up1CostLog()),
  });
  up2Card.update({
    level: `等级 ${state.up2}`,
    effect: `当前倍率: ×${fmt(Math.pow(2, state.up2))}`,
    cost: fmtNum(up2Cost(), up2CostLog()) + " Hz",
    affordable: cmpGE(f, up2Cost(), FLog(), up2CostLog()),
  });
  if (up3Card) {
    const lastLog = getLogUp3LastF();
    const affordable3 = FLog() > lastLog;
    const wLog2 = up3WavelengthFromFLog(FLog());
    const multLog = getLogL10() + wLog2;
    up3Card.update({
      level: `上次峰值: ${lastLog > NLOG + 1 ? fmtLog(lastLog) + " Hz" : "—"}`,
      effect: affordable3
        ? `下次重置: ×${fmtLog(multLog)}`
        : `当前波长: ${fmtLog(getLogL10())} m`,
      cost: lastLog > NLOG + 1 ? `需 F > ${fmtLog(lastLog)}` : "首次",
      affordable: affordable3,
    });
  }
  buildMetaOnce();
  const eff = 1 + (fLog > 0 ? fLog : Math.log10(Math.pow(10, fLog) + 1)); // meta1 效果因子，防 F=Infinity 污染
  const owned = state.meta1 >= 1;
  const affordable = owned || cmpGE(f, META_COST, FLog(), LOG_META_COST);
  metaRefs.root.className = "upgrade-card" + (affordable ? " affordable" : " locked");
  metaRefs.effectEl.textContent = `当前预期效果: ×${fmt(eff)}`;
  metaRefs.costEl.textContent = fmtNum(costOf(META_COST), costOfLog(LOG_META_COST)) + " Hz";
  metaRefs.btn.textContent = owned ? "已购买" : "购买";
  // 解锁声子卡
  const uOwned = state.phUnlocked >= 1;
  const uAff = uOwned || cmpGE(f, PH_UNLOCK_COST, FLog(), LOG_PH_UNLOCK_COST);
  unlockRefs.root.className = "upgrade-card" + (uAff ? " affordable" : " locked");
  unlockRefs.effectEl.textContent = uOwned ? "声子页面已解锁" : "解锁后可启动声子发生器";
  unlockRefs.costEl.textContent = fmtNum(costOf(PH_UNLOCK_COST), costOfLog(LOG_PH_UNLOCK_COST)) + " Hz";
  unlockRefs.btn.textContent = uOwned ? "已购买" : "购买";
  unlockRefs.btn.disabled = !uAff;
}

// ---------- 声子系统 ----------
function buyPhUnlock() {
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  if (state.phUnlocked) return;
  if (cmpLT(F(), costOf(PH_UNLOCK_COST), FLog(), costOfLog(LOG_PH_UNLOCK_COST))) return;
  if (!upgradesFree()) subULog(costOfLog(LOG_PH_UNLOCK_COST));
  markPurchase();
      state.phUnlocked = 1;
  applyPhononVisibility();
  updateUpgradesUI();
  updatePhononUI();
  setAutosaveStatus("已解锁：声子");
}

function togglePhononGen() {
  state.phOn = !state.phOn;
  // S7 请注意使用规范：10 秒内反复开关 20 次
  const now = Date.now();
  state.phToggles = state.phToggles.filter(t => now - t < 10000);
  state.phToggles.push(now);
  if (state.phToggles.length >= 20 && !state.ach.hidden.includes("S7")) {
    grantHidden("S7");
    state.phToggles = [];
    updateAchievementsUI();
  }
  updatePhononUI();
  setAutosaveStatus(state.phOn ? "声子发生器已启动" : "声子发生器已关闭");
}

// 声子升级价格（下一次购买）
function pg1Cost() { return costOf(1e10 * Math.pow(100, state.pg1)); }  // 花 F，增速 ×100
function pg2Cost() { return costOf(100 * Math.pow(2, state.pg2)); }     // 花 P，增速 ×2
function pg3Cost() { return costOf(1e4 * Math.pow(10, state.pg3)); }    // 花 P，增速 ×10
const FLUCT_COST = 1000;    // 声子涨落（P）
const COUPLING_COST = 10000; // 声波耦合（P）
const LOG_FLUCT_COST = Math.log10(FLUCT_COST);
const LOG_COUPLING_COST = Math.log10(COUPLING_COST);

function buyPG1() {
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  if (inDistort("adiabatic")) return; // 绝热宇宙：无法购买声子发生器效率
  const c = pg1Cost();
  if (cmpLT(F(), c, FLog(), pg1CostLog())) return; // 资源必须达标（spu1 只免扣款，不免门槛）
  if (!upgradesFree()) subULog(pg1CostLog());
  markPurchase();
      state.pg1++;
  renderWave(); updatePhononUI();
}
function buyPG2() {
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  const c = pg2Cost();
  if (cmpLT(state.phonons, c, getLogPhonons(), pg2CostLog())) return;
  if (!upgradesFree()) setPhonons(state.phonons - c);
  markPurchase();
      state.pg2++;
  updatePhononUI();
}
function buyPG3() {
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  if (state.pg3 >= pg3Cap()) return;
  if (inDistort("rigid") || inDistort("adiabatic") || inDistort("simple")) return; // 刚性/热寂/简洁：无法购买声子升级3
  const c = pg3Cost();
  if (cmpLT(state.phonons, c, getLogPhonons(), pg3CostLog())) return;
  if (!upgradesFree()) setPhonons(state.phonons - c);
  markPurchase();
      state.pg3++;
  updatePhononUI();
}
function buyFluct() {
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  if (state.phFluct) return;
  if (cmpLT(state.phonons, costOf(FLUCT_COST), getLogPhonons(), costOfLog(LOG_FLUCT_COST))) return;
  if (!upgradesFree()) setPhonons(state.phonons - FLUCT_COST);
  markPurchase();
      state.phFluct = 1;
  updatePhononUI();
  setAutosaveStatus("已购买：声子涨落");
}
function buyCoupling() {
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  if (state.phCoupling) return;
  if (cmpLT(state.phonons, costOf(COUPLING_COST), getLogPhonons(), costOfLog(LOG_COUPLING_COST))) return;
  if (!upgradesFree()) setPhonons(state.phonons - COUPLING_COST);
  markPurchase();
      state.phCoupling = 1;
  checkAchievements(); // A23 耦合
  updatePhononUI();
  setAutosaveStatus("已购买：声波耦合");
}

// ---------- 声子 UI (build-once, in-place update) ----------
let phBuilt = false, phRefs = {};
function buildPhononOnce() {
  if (phBuilt) return;
  const list = document.getElementById("ph-upg-list");
  const metaList = document.getElementById("ph-meta-list");
  list.innerHTML = ""; metaList.innerHTML = "";
  phRefs.pg1 = buildUpgradeCard({ name: "声子发生器效率", desc: "每次购买使发生间隔 ÷1.5", buyFn: buyPG1 });
  phRefs.pg2 = buildUpgradeCard({ name: "声子发生器倍率", desc: "第 n 级使产量 ×(n+1)²", buyFn: buyPG2 });
  phRefs.pg3 = buildUpgradeCard({ name: "升级3指数加成", desc: "每级使升级3的波长指数 +0.01（上限 20 级）", buyFn: buyPG3 });
  list.append(phRefs.pg1.root, phRefs.pg2.root, phRefs.pg3.root);
  phRefs.fluct = buildUpgradeCard({ name: "声子涨落", desc: "单次 · 温度加成声子获取", buyFn: buyFluct });
  phRefs.coupling = buildUpgradeCard({ name: "声波耦合", desc: "单次 · 波速加成声子获取", buyFn: buyCoupling });
  metaList.append(phRefs.fluct.root, phRefs.coupling.root);
  document.getElementById("ph-gen-btn").addEventListener("click", togglePhononGen);
  phBuilt = true;
}

// 声子页快变显示（资源行与热涨落）——由显示循环高频率刷新
function renderPhononFast() {
  if (!state.phUnlocked) return;
  const T = temperature();
  // 显示必须用裁剪后的温度 log（temperatureCappedLog），传 raw 会在 T=Infinity 时
  // 显示未封顶的原始温度，看起来像温度超过了上限
  document.getElementById("ph-res-text").textContent =
    `你拥有${fmtNum(Math.floor(state.phonons), getLogPhonons())}声子，温度为${fmtNum(T, temperatureCappedLog())} K`;
  document.getElementById("ph-thermal").textContent =
    `热涨落把你的波速获取变为原来的${fmtNum(thermalMult(), thermalMultLog())}倍`;
}
function updatePhononUI() {
  if (!state.phUnlocked) return;
  buildPhononOnce();
  renderPhononFast();
  document.getElementById("ph-gen-btn").textContent = state.phOn ? "关闭声子发生器" : "启动声子发生器";
  const f = F();
  const c1 = pg1Cost(), c2 = pg2Cost(), c3 = pg3Cost();
  phRefs.pg1.update({
    level: `等级 ${state.pg1}`,
    effect: `当前产量: ${fmtNum(phononRate(), phononRateLog())} 声子/s（游戏时间）`,
    cost: fmtNum(c1, pg1CostLog()) + " Hz",
    affordable: cmpGE(f, c1, FLog(), pg1CostLog()),
  });
  phRefs.pg2.update({
    level: `等级 ${state.pg2}`,
    effect: `当前倍率: ×${fmt(Math.pow(state.pg2 + 1, 2))}`,
    cost: fmtNum(c2, pg2CostLog()) + " P",
    affordable: cmpGE(state.phonons, c2, getLogPhonons(), pg2CostLog()),
  });
  phRefs.pg3.update({
    level: `等级 ${state.pg3} / ${pg3Cap()}`,
    effect: `升级3当前指数: ${up3Exp().toFixed(2)}`,
    cost: fmtNum(c3, pg3CostLog()) + " P",
    affordable: state.pg3 < pg3Cap() && cmpGE(state.phonons, c3, getLogPhonons(), pg3CostLog()),
  });
  const fOwn = state.phFluct >= 1, cOwn = state.phCoupling >= 1;
  phRefs.fluct.update({
    level: fOwn ? "已拥有" : "单次",
    effect: `当前温度加成: ×${fmtNum(fluctMult(), fluctMultLog())}`,
    cost: fmtNum(costOf(FLUCT_COST), costOfLog(LOG_FLUCT_COST)) + " P",
    affordable: fOwn || cmpGE(state.phonons, FLUCT_COST, getLogPhonons(), costOfLog(LOG_FLUCT_COST)),
    btnText: fOwn ? "已购买" : "购买",
  });
  phRefs.coupling.update({
    level: cOwn ? "已拥有" : "单次",
    effect: `当前波速加成: ×${fmtNum(couplingMult(), couplingMultLog())}`,
    cost: fmtNum(costOf(COUPLING_COST), costOfLog(LOG_COUPLING_COST)) + " P",
    affordable: cOwn || cmpGE(state.phonons, COUPLING_COST, getLogPhonons(), costOfLog(LOG_COUPLING_COST)),
    btnText: cOwn ? "已购买" : "购买",
  });
}

function applyPhononVisibility() {
  document.getElementById("subtab-phonon").classList.toggle("hidden", !state.phUnlocked);
}

// ---------- 湮灭 ----------
// 奇点升级1：除升级3外的升级不再消耗资源。
// 滞涨宇宙（原通胀）：价格是核心机制，spu1 免费效果失效（否则自动化免费连买导致数值失控）。
function upgradesFree() { return state.spu1 >= 1 && !inDistort("inflation"); }

const MILESTONES = [
  { n: 1,  desc: "保持解锁声子升级和声子页面的可见性，解锁「自动化」主选项卡" },
  { n: 2,  desc: "湮灭保持单次波动升级，和主要页面自动化的解锁" },
  { n: 3,  desc: "湮灭保持单次声子升级，和声子相关自动化的解锁" },
  { n: 5,  desc: "湮灭不重置自动化开关，声子发生器一开始就是启动状态" },
  { n: 8,  desc: "解锁自动购买升级3（可设置在多少倍率时购买）" },
  { n: 10, desc: "解锁自动湮灭（可设置在多少奇点时重置）" },
  { n: 20, desc: "解锁「扭曲」选项卡" },
];
// SVPU2 虚幻湮灭：加成每次获得的奇点数 ×2^svpu2（不加成湮灭次数本身）。
// effAnnihilations 仍为实际次数（里程碑/统计只用实际次数）。
function effAnnihilations() { return state.annihilations; }
function hasMilestone(n) { return state.annihilations >= n; }

// ---------- 扭曲里程碑（按已湮灭的扭曲宇宙数量 DA）----------
const DISTORT_MILESTONES = [
  { n: 1, desc: "" }, // 动态填充：基于扭曲宇宙湮灭数，将奇点效果变为 X 倍
  { n: 3, desc: "解锁更多的奇点升级" },
  { n: 5, desc: "解锁黑洞选项卡", black: true },
  { n: 8, desc: "打破多元宇宙的规则：取消温度上限（WIP）" },
];
function distortDA() { return state.distortDone.length; }
// 1DA 里程碑效果倍率：基于湮灭扭曲宇宙数，奇点效果指数 ×(1 + log2(1+DA))
function daExpMult() {
  return (1 + Math.log2(1 + distortDA())) * sauMult();
}
function hasDistortMilestone(n) { return distortDA() >= n; }

const LOG_T_P0 = Math.log10(T_P0);
function annihilationReady() {
  // log 域比较：temperatureLog 与目标温度的 log10；double 路径不变（零回归）
  const tLog = temperatureLog();
  // 扭曲宇宙：目标是该宇宙自己的普朗克温度（未知宇宙 id 视为不在扭曲中）
  if (state.distortActive) {
    const u = DISTORT_UNIVERSES.find(x => x.id === state.distortActive);
    if (!u) { state.distortActive = ""; return tLog >= LOG_T_P0; }
    const tpLog = isFinite(u.tp) ? Math.log10(u.tp) : Infinity;
    return tLog >= tpLog;
  }
  return tLog >= LOG_T_P0; // 只需超过最初的普朗克温度，无需到当前宇宙上限
}

// 记录一次湮灭到历史（最近十次）
function pushAnnHistory(entry) {
  state.annHistory.push(entry);
  if (state.annHistory.length > 10) state.annHistory.shift();
}

// 大重置：回到波长1m波速10，重置所有升级购买；里程碑决定保留项
function doAnnihilation() {
  if (!annihilationReady()) return;
  const inDistortMode = !!state.distortActive;
  const dUniverse = inDistortMode ? DISTORT_UNIVERSES.find(x => x.id === state.distortActive) : null;
  const gained = inDistortMode ? 0 : spGain(); // Sp 获取不受 SVPU2 加成
  if (!inDistortMode && gained < 1 && !state.testBreakRules) return; // 测试模式：Sp=0 也执行湮灭
  const wasFirst = state.annihilations === 0;

  // 统计（扭曲宇宙内不刷新 Sp 相关纪录，但记入历史）
  const realNow = Date.now();
  const realDur = (realNow - state.annStartReal) / 1000;
  const gameDur = state.playTime - state.annStartGame;
  const rate = realDur > 0 ? (gained / realDur) * 60 : 0; // Sp/分
  if (!inDistortMode) {
    setSp(state.sp + gained);
    setTotalSp(state.totalSp + gained);
    if (gained > state.annBestSp) state.annBestSp = gained;
    if (rate > state.annBestRate) state.annBestRate = rate;
    if (state.annFastest === 0 || realDur < state.annFastest) state.annFastest = realDur;
  }
  // 历史记录
  pushAnnHistory({
    label: inDistortMode ? `扭曲·${dUniverse.name}` : `第 ${state.annihilations + 1} 次`,
    distort: inDistortMode ? dUniverse.id : "",
    sp: gained, realDur, gameDur, rate, at: realNow,
  });
  // SVPU2 虚幻湮灭：每次获得的湮灭次数 ×2^svpu2（如 3 级则每次 +8 次而非 +1）
  state.annihilations += annSpMult();

  // 重置（几乎全部）。累计频率与统计极值（通用统计）不重置。
  setU(resetU()); state.L = 1; state.logL10 = 0;
  state.up1 = 0; state.up2 = 0; state.up3 = 0; state.up3LastF = 0; state.logUp3LastF = NLOG;
  if (!auOwned("au24")) setPhonons(0); // AU24 量子涟漪：湮灭保留声子
  state.pg1 = 0; state.pg2 = 0; state.pg3 = 0; // 发生器重复升级等级总是重置
  if (!hasMilestone(1)) state.phUnlocked = 0;
  if (!hasMilestone(2)) state.meta1 = 0;
  if (!hasMilestone(3)) { state.phFluct = 0; state.phCoupling = 0; }
  // 自动化解锁随里程碑保留：2 湮灭保主要页自动化，3 湮灭保声子自动化
  if (!hasMilestone(2)) state.autoWaveUpg = 0;
  if (!hasMilestone(3)) state.autoPhononUpg = 0;
  if (!hasMilestone(5)) {
    state.autoOn = { wave: false, phonon: false, up3: false, ann: false };
    state.phOn = false;
  } else {
    state.phOn = true; // 声子发生器一开始就是启动状态
  }

  // 里程碑驱动的解锁
  if (hasMilestone(1)) { /* 声子页保留可见 */ }
  if (hasMilestone(8)) state.autoUp3 = 1;   // 第 8 次湮灭：解锁自动购买升级3
  if (hasMilestone(10)) state.autoAnn = 1;  // 第 10 次湮灭：解锁自动湮灭

  // 扭曲宇宙湮灭处理：首杀给予 Sp 获取 ×2，并离开该宇宙
  if (inDistortMode) {
    // 挑战计时：耗时计入所有挑战总和，并更新该宇宙最佳
    state.distortTotal = (state.distortTotal || 0) + Math.max(0.025, Math.round(realDur * 40) / 40);
    // 计时以 25ms 为最小刻度（硬下限 25ms，防止后续时间加成爆炸）
    const durQ = Math.max(0.025, Math.round(realDur * 40) / 40);
    if (!state.distortBest[dUniverse.id] || durQ < state.distortBest[dUniverse.id]) {
      state.distortBest[dUniverse.id] = durQ;
    }
    if (!state.distortDone.includes(dUniverse.id)) {
      state.distortDone.push(dUniverse.id);
      state.distortMult *= 2;
      checkAchievements(); // A34 秩序
      setAutosaveStatus(`湮灭了扭曲宇宙「${dUniverse.name}」：奇点获取 ×2！`);
    } else {
      setAutosaveStatus(`湮灭了扭曲宇宙「${dUniverse.name}」（无奖励）`);
    }
    state.distortActive = "";
  } else {
    setAutosaveStatus(`湮灭完成：获得 ${fmtNum(gained, gained > 0 ? Math.log10(gained) : NLOG)} 奇点`);
  }

  // 湮灭计时重置
  state.annStartReal = realNow;
  state.annStartGame = state.playTime;

  applyPhononVisibility();
  applyAnnihilationVisibility();
  checkAchievements();
  saveGame();
  renderAll();
  return true; // 成功执行（wasFirst 语义不再需要，首次流程由 confirmFirstAnnihilation 单独处理）
}

// 进入扭曲宇宙：立即进行一次湮灭重置（普通宇宙部分照常结算 Sp），然后应用该宇宙规则
function enterDistort(id) {
  // S16：硬核玩家 —— 已在一个扭曲宇宙中时点击另一个扭曲宇宙的进入
  if (state.distortActive && state.distortActive !== id && !state.ach.hidden.includes("S16")) {
    grantHidden("S16"); updateAchievementsUI();
  }
  if (state.distortActive) return;
  const u = DISTORT_UNIVERSES.find(x => x.id === id);
  if (!u) return;
  if (state.annihilations < 20) return; // 扭曲选项卡本身 20 湮灭解锁
  // 强制进行一次普通湮灭重置（无需达到 T_P0；已达标则照常给 Sp）
  if (annihilationReady()) {
    doAnnihilation();
  } else {
    forceAnnihilationReset(0); // 未达标进入：重置但不获 Sp、不计入最好纪录
  }
  // AU24 的「湮灭保留声子」在进出扭曲宇宙时不生效：进入扭曲必须清零声子
  setPhonons(0);
  state.distortActive = id;
  distortEnterAt = Date.now();
  if (id === "simple") setPhonons(1); // 简洁宇宙：声子恒 1
  if (id === "narrow") state.narrowPurchases = 0; // 狭窄宇宙：进入时购买次数强制重置（防残留）
  state.annStartReal = Date.now();
  state.annStartGame = state.playTime;
  applyAnnihilationVisibility(); // 重设按钮为扭曲模式文案
  updateDistortUI();
  switchTab("wave");
  switchSubtab("main");
  setAutosaveStatus(`进入扭曲宇宙「${u.name}」`);
}

// 强制重置（进入扭曲用）：gained 为获得的 Sp（可为 0）
function forceAnnihilationReset(gained) {
  const realNow = Date.now();
  const realDur = (realNow - state.annStartReal) / 1000;
  const gameDur = state.playTime - state.annStartGame;
  const rate = realDur > 0 ? (gained / realDur) * 60 : 0;
  if (gained > 0) {
    setSp(state.sp + gained); setTotalSp(state.totalSp + gained);
    if (gained > state.annBestSp) state.annBestSp = gained;
    if (rate > state.annBestRate) state.annBestRate = rate;
    if (state.annFastest === 0 || realDur < state.annFastest) state.annFastest = realDur;
  }
  pushAnnHistory({ label: `第 ${state.annihilations + 1} 次`, distort: "", sp: gained, realDur, gameDur, rate, at: realNow });
  state.annihilations += annSpMult();
  applyAnnihilationResetBody(realNow);
  setAutosaveStatus(gained > 0 ? `湮灭完成：获得 ${fmtNum(gained, gained > 0 ? Math.log10(gained) : NLOG)} 奇点` : "湮灭完成");
}

// 湮灭重置的主体（供 doAnnihilation 与 forceAnnihilationReset 共用）
function applyAnnihilationResetBody(realNow) {
  setU(resetU()); state.L = 1; state.logL10 = 0;
  state.up1 = 0; state.up2 = 0; state.up3 = 0; state.up3LastF = 0; state.logUp3LastF = NLOG;
  setPhonons(0);
  state.pg1 = 0; state.pg2 = 0; state.pg3 = 0;
  state.lastPurchaseAt = 0; state.narrowPurchases = 0;
  if (!hasMilestone(1)) state.phUnlocked = 0;
  if (!hasMilestone(2)) state.meta1 = 0;
  if (!hasMilestone(3)) { state.phFluct = 0; state.phCoupling = 0; }
  if (!hasMilestone(2)) state.autoWaveUpg = 0;
  if (!hasMilestone(3)) state.autoPhononUpg = 0;
  if (!hasMilestone(5)) {
    state.autoOn = { wave: false, phonon: false, up3: false, ann: false };
    state.phOn = false;
  } else {
    state.phOn = true;
  }
  if (hasMilestone(8)) state.autoUp3 = 1;
  if (hasMilestone(10)) state.autoAnn = 1;
  state.annStartReal = realNow;
  state.annStartGame = state.playTime;
  applyPhononVisibility();
  applyAnnihilationVisibility();
  checkAchievements();
  saveGame();
  renderAll();
}

// 重试：立刻湮灭重置并再次进入同一扭曲宇宙（不完成挑战，无论是否达标）
function retryDistort() {
  const id = state.distortActive;
  if (!id) return;
  // S18：getting over it —— 能湮灭扭曲宇宙后重试或退出而并非完成它
  if (annihilationReady() && !state.ach.hidden.includes("S18")) {
    grantHidden("S18"); updateAchievementsUI();
  }
  // S14 失败计数（重试也视为一次失败）
  state.distortFails = (state.distortFails || 0) + 1;
  if (state.distortFails >= 10 && !state.ach.hidden.includes("S14")) {
    grantHidden("S14"); updateAchievementsUI();
  }
  // 退出/重试不记录挑战时长（只有 doAnnihilation 完成才记录 distortBest/distortTotal）
  // 重置（不触发完成逻辑、不获 Sp、不计历史）
  state.distortActive = "";
  setU(resetU()); state.L = 1; state.logL10 = 0;
  state.up1 = 0; state.up2 = 0; state.up3 = 0; state.up3LastF = 0; state.logUp3LastF = NLOG;
  setPhonons(0);
  state.pg1 = 0; state.pg2 = 0; state.pg3 = 0;
  state.lastPurchaseAt = 0; state.narrowPurchases = 0;
  // 再次进入
  state.distortActive = id;
  distortEnterAt = Date.now();
  state.annStartReal = Date.now();
  state.annStartGame = state.playTime;
  applyAnnihilationVisibility();
  updateDistortUI();
  switchTab("wave");
  switchSubtab("main");
  setAutosaveStatus("已重试：" + (DISTORT_UNIVERSES.find(u => u.id === id) || {name:id}).name);
}

// 退出（按钮版）：湮灭重置回主宇宙（不完成挑战，无论是否达标）
function exitDistortBtn() {
  if (!state.distortActive) return;
  // S18：getting over it —— 能湮灭扭曲宇宙后重试或退出而并非完成它
  if (annihilationReady() && !state.ach.hidden.includes("S18")) {
    grantHidden("S18"); updateAchievementsUI();
  }
  const u = DISTORT_UNIVERSES.find(x => x.id === state.distortActive);
  // 退出/重试不记录挑战时长（只有 doAnnihilation 完成才记录 distortBest/distortTotal）
  state.distortFails = (state.distortFails || 0) + 1;
  if (state.distortFails >= 10 && !state.ach.hidden.includes("S14")) {
    grantHidden("S14"); updateAchievementsUI();
  }
  exitDistort();
  setAutosaveStatus("已退出扭曲宇宙「" + (u ? u.name : "") + "」");
}

// 退出扭曲宇宙：未达目标时点击湮灭按钮触发；直接大重置回普通宇宙（不获 Sp）
function exitDistort() {
  const u = DISTORT_UNIVERSES.find(x => x.id === state.distortActive);
  state.distortActive = "";
  // S14：哦不我无疑是难过的 —— 在扭曲宇宙中失败十次
  state.distortFails = (state.distortFails || 0) + 1;
  if (state.distortFails >= 10 && !state.ach.hidden.includes("S14")) {
    grantHidden("S14");
    updateAchievementsUI();
  }
  // 重置（与湮灭相同范围），不计入历史
  setU(resetU()); state.L = 1; state.logL10 = 0;
  state.up1 = 0; state.up2 = 0; state.up3 = 0; state.up3LastF = 0; state.logUp3LastF = NLOG;
  setPhonons(0);
  state.pg1 = 0; state.pg2 = 0; state.pg3 = 0;
  state.lastPurchaseAt = 0; state.narrowPurchases = 0;
  state.annStartReal = Date.now();
  state.annStartGame = state.playTime;
  applyPhononVisibility();
  applyAnnihilationVisibility();
  renderAll();
  setAutosaveStatus(`已退出扭曲宇宙「${u ? u.name : ""}」（未达成目标）`);
}

// 首次湮灭：渐黑 → "你达到了普朗克温度"淡入淡出 → 主文案+按钮 → 点击 → 黑屏动画 → 执行
// 阶段切换全部由 CSS 动画时间线驱动（.shown 类触发），无 JS 定时器，不受节流影响
let annSequenceActive = false; // 序列进行中（含确认后的黑屏动画期），防止 tick 重复拉起遮罩
function firstAnnihilationFlow() {
  if (annSequenceActive) return;
  annSequenceActive = true;
  const overlay = document.getElementById("first-annihilation-overlay");
  overlay.classList.remove("hidden");
  // 重置动画（移除再强制重排再加回，确保重新播放）
  overlay.classList.remove("shown");
  void overlay.offsetWidth;
  requestAnimationFrame(() => overlay.classList.add("shown"));
}
function confirmFirstAnnihilation() {
  const overlay = document.getElementById("first-annihilation-overlay");
  overlay.classList.add("hidden");
  const flash = document.getElementById("ann-flash");
  flash.classList.remove("hidden");
  flash.classList.add("play");
  setTimeout(() => { flash.classList.remove("play"); flash.classList.add("hidden"); }, 1700);
  // 动画中段执行重置（annSequenceActive 保持 true，直到重置完成后解除）
  setTimeout(() => {
    doAnnihilation();
    applyAnnihilationVisibility();
    switchTab("wave");
    switchSubtab("main");
    annSequenceActive = false;
  }, 700);
}

function applyAnnihilationVisibility() {
  applyHelpVisibility();
  const done = state.annihilations >= 1;
  document.getElementById("sp-display").classList.toggle("hidden", !done);
  document.getElementById("tab-annihilation").classList.toggle("hidden", !done);
  document.getElementById("tab-automation").classList.toggle("hidden", !done);
  document.getElementById("subtab-distort").classList.toggle("hidden", state.annihilations < 20);
  document.getElementById("subtab-blackhole").classList.toggle("hidden", !bhUnlocked());
  const ready = annihilationReady();
  if (!done) {
    // 首次湮灭：全屏遮罩接管（类似第一次大塌缩）；序列进行中不重复拉起
    document.getElementById("annihilate-btn").classList.add("hidden");
    if (ready && !annSequenceActive) firstAnnihilationFlow();
    return;
  }
  const overlay = document.getElementById("first-annihilation-overlay");
  if (!overlay.classList.contains("hidden")) overlay.classList.add("hidden");
  // 湮灭按钮：湮灭后一直可见
  const btn = document.getElementById("annihilate-btn");
  btn.classList.remove("hidden");
  if (state.distortActive) {
    // 扭曲宇宙：达标显示湮灭该宇宙，否则显示逃离（未知宇宙 id 已被 annihilationReady 清空，不进入此分支）
    const u = DISTORT_UNIVERSES.find(x => x.id === state.distortActive);
    if (u) {
      btn.classList.add("distort-mode");
      if (ready) {
        btn.textContent = `湮灭扭曲宇宙「${u.name}」`;
      } else {
        btn.textContent = `逃离扭曲宇宙「${u.name}」`;
      }
      btn.disabled = false;
      return;
    }
  }
  btn.classList.remove("distort-mode");
  if (ready) {
    btn.textContent = `湮灭 (+${fmtNum(spGain(), spGainLog())} Sp)`;
    btn.disabled = false;
  } else {
    btn.textContent = `湮灭 (须达到1.42e32K)`;
    btn.disabled = true;
  }
}

// 帮助页章节与统计湮灭区随游戏进度开放（避免剧透重置层）
function applyHelpVisibility() {
  document.getElementById("help-phonon").classList.toggle("hidden", !state.phUnlocked);
  document.getElementById("help-annihilation").classList.toggle("hidden", state.annihilations < 1);
  document.getElementById("help-distort").classList.toggle("hidden", state.annihilations < 20);
  document.getElementById("help-sp-upgrades").classList.toggle("hidden", !hasDistortMilestone(3));
  document.getElementById("help-blackhole").classList.toggle("hidden", !bhUnlocked());
  document.getElementById("stat-ann-group").classList.toggle("hidden", state.annihilations < 1);
  document.getElementById("subtab-stats-challenge").classList.toggle("hidden", state.annihilations < 20);
}

// ---------- 奇点升级 ----------
const SP_UPGRADES = [];
// spu1 移至 SAU 区（与奇点升级同尺寸按钮）：
const SPU1_DEF = { id: "spu1", name: "奇点之前的升级不再消耗资源", desc: "购买除升级3外奇点之前的升级不再消耗资源" };

// ---------- 奇点升级（3DA 里程碑解锁）----------
// 第一类：可重复（SAU1-3，一行三个）
const SAU_DEFS = [
  { id: "sau1", key: "sau1", name: "象限拓张", desc: "声子升级3的硬上限 +2/级（20→40）", max: 10,
    cost: (n) => Math.pow(10, 2 + 2 * n) }, // 第n次（1起）10^(2+2n)
  { id: "sau2", key: "sau2", name: "奇点凝聚", desc: "第 n 级使奇点效果指数额外乘以 (1+n/10)", max: Infinity,
    cost: (n) => Math.pow(10, 5 * n) },
  { id: "sau3", key: "sau3", name: "紫外灾难", desc: "热涨落效果指数 +0.015/级", max: 10,
    cost: (n) => Math.pow(10, 3 + 2 * n) },
];
// 真空衰变（独立行，位于 spu1 下方、SAU 行上方）：每级奇点获取 ×2，价 10^(3+n)
const VACUUM_DEF = { id: "sau4", key: "sau4", name: "真空衰变", desc: "每级使获得的奇点 ×2", max: Infinity,
  cost: (n) => Math.pow(10, 3 + n) };
// 第二类：单次（四组×4，两组共一行）
const AU_DEFS = [
  [ // 第1组
    { id: "au11", name: "机械共振", desc: "基于波动升级1等级给予其指数加成：^max(1,√n/5)", cost: 1e6 },
    { id: "au12", name: "受激跃迁", desc: "每个声子升级1等级给予声子升级2免费2级", cost: 1e10 },
    { id: "au13", name: "光子共振", desc: "基于波动升级2等级增强其底数：+min(0.5, log₂n/30)", cost: Infinity },
    { id: "au14", name: "黑体辐射", desc: "波长倒数增强声子产生：×max(1, L^-0.05)", cost: Infinity },
  ],
  [ // 第2组
    { id: "au21", name: "时序扩张", desc: "解锁升级3自动化的间隔模式", cost: 1e5 },
    { id: "au22", name: "末日时钟", desc: "解锁自动湮灭的间隔模式", cost: 1e6 },
    { id: "au23", name: "声纹记忆", desc: "购买升级3不再重置升级2", cost: 1e9 },
    { id: "au24", name: "量子涟漪", desc: "湮灭保留声子数量（进出扭曲宇宙除外）", cost: 1e11 },
  ],
  [ // 第3组
    { id: "au31", name: "时间之矢", desc: "基于真实游玩时间给予时间倍率：×(1+lg(1+t)^0.6)", cost: 1e6 },
    { id: "au32", name: "成就刻印", desc: "成就的时间倍率 1.1x → 1.2x", cost: 1e7 },
    { id: "au33", name: "绝对零度", desc: "基于「冷却」最佳完成时间给予时间倍率", cost: 1e10 },
    { id: "au34", name: "引力扭曲", desc: "增强黑洞的效果", cost: 1e11 },
  ],
  [ // 第4组（4DA 解锁）
    { id: "au41", name: "共轭湮灭", desc: "湮灭次数加成奇点效果", cost: 3e8 },
    { id: "au42", name: "虚幻凝聚", desc: "基于虚粒子数量增加奇点获取", cost: 5e9 },
    { id: "au43", name: "奇点塌缩", desc: "新增一个奇点效果", cost: 5e12 },
    { id: "au44", name: "???", desc: "（占位）", cost: Infinity },
  ],
];
function auOwned(id) { return !!state.au[id]; }
function buySAU(id) {
  const u = SAU_DEFS.find(x => x.id === id) || (id === VACUUM_DEF.id ? VACUUM_DEF : null);
  if (!u) return;
  const n = state[u.key] + 1; // 第 n 次购买（1 起）
  if (state[u.key] >= u.max) return;
  const c = u.cost(n);
  if (state.sp < c) return;
  setSp(state.sp - c);
  state[u.key]++;
  checkAchievements(); // A35
  updateSpUI();
  setAutosaveStatus("已购买奇点升级：" + u.name);
}
function buyAU(id) {
  const u = AU_DEFS.flat().find(x => x.id === id);
  if (!u || auOwned(id)) return;
  if (state.sp < u.cost) return;
  setSp(state.sp - u.cost);
  state.au[id] = 1;
  checkAchievements(); // A35
  updateSpUI();
  setAutosaveStatus("已购买奇点升级：" + u.name);
}

// ---- 效果挂钩 ----
// SAU1：声子升级3上限
function pg3Cap() { return 20 + 2 * state.sau1; }
// SAU2：奇点效果指数倍率
function sauMult() { return 1 + state.sau2 / 10; } // 第 n 级总效果 ×(1+n/10)：1级1.1、2级1.2、…
// SAU3：热涨落指数
function thermalExp() { return 0.2 + 0.015 * state.sau3; }
// AU11：up1 指数加成
function up1Exp() { return auOwned("au11") ? Math.max(1, Math.sqrt(state.up1) / 5) : 1; }
// AU12：pg2 免费等级
function pg2Free() { return auOwned("au12") ? state.pg1 * 2 : 0; }
// AU13：up2 底数加成
function up2Base() { return 2 + (auOwned("au13") ? Math.min(0.5, Math.log2(Math.max(1, state.up2)) / 30) : 0); }
// AU14：波长倒数增强声子产生
function invLMult() { return auOwned("au14") ? Math.max(1, Math.pow(10, -0.05 * getLogL10())) : 1; }
// 波长倒数增强声子产生的 log10：max(0, -0.05·logL10)
function invLMultLog() { return auOwned("au14") ? Math.max(0, -0.05 * getLogL10()) : 0; }
// AU41：共轭湮灭——湮灭次数 A 加成奇点效果：×(1+lg(1+A)/3)^(1/2)
function phononSpMult() {
  if (!auOwned("au41")) return 1;
  return Math.sqrt(1 + Math.log10(1 + state.annihilations) / 3);
}
// AU31：时间倍率（真实游玩时间）
function timeArrowMult() { return auOwned("au31") ? 1 + Math.pow(Math.log10(1 + state.realTime), 0.6) : 1; }
// AU32：成就时间倍率底数
function achTimeBase() { return auOwned("au32") ? 1.2 : 1.1; }
// AU33：绝对零度（冷却最佳完成时间 T 秒）：×min(200, max(1, min((1000/T)^0.5, 60/T)))
function absZeroMult() {
  if (!auOwned("au33")) return 1;
  const T = state.distortBest && state.distortBest.cooldown;
  if (!T || T <= 0) return 1;
  return Math.min(200, Math.max(1, Math.min(Math.sqrt(1000 / T), 60 / T)));
}

// ---------- 黑洞系统（v0.4.3 实装，5DA 解锁）----------
// 黑洞：黑洞质量 M（太阳质量）、虚粒子 VP；基础效果 M^0.2 给予时间倍率加成（扭曲状态）
// 三个状态：吸积（获取质量，无加成，虚粒子衰减）/ 扭曲（给时间倍率加成）/ 脉冲（失质量，获虚粒子）
// 三个 SBU 升级：事件视界（吸积效率 ×2/级）/ 引力潮汐（效果指数 +0.05/级）/ 霍金辐射（虚粒子获取 ×2/级）
function bhUnlocked() { return hasDistortMilestone(5); }
function getLogBhMass() {
  if (state.logBhMass !== undefined && isFinite(state.logBhMass)) return clampLog(state.logBhMass);
  return state.bhMass > 0 ? clampLog(Math.log10(state.bhMass)) : NLOG;
}
function setBhMass(v) {
  state.bhMass = v;
  if (v > 0 && isFinite(v)) state.logBhMass = clampLog(Math.log10(v));
  else if (v <= 0) state.logBhMass = NLOG;
}
function setBhMassLog(logM) {
  state.logBhMass = clampLog(logM);
  state.bhMass = (logM <= NLOG + 1) ? 0 : (logM > 308 ? Infinity : Math.pow(10, logM));
}
function getLogVP() {
  if (state.logVP !== undefined && isFinite(state.logVP)) return clampLog(state.logVP);
  return state.virtualParticles > 0 ? clampLog(Math.log10(state.virtualParticles)) : NLOG;
}
function setVP(v) {
  state.virtualParticles = v;
  if (v > 0 && isFinite(v)) state.logVP = clampLog(Math.log10(v));
  else if (v <= 0) state.logVP = NLOG;
}
function setVPLog(logV) {
  state.logVP = clampLog(logV);
  state.virtualParticles = (logV <= NLOG + 1) ? 0 : (logV > 308 ? Infinity : Math.pow(10, logV));
}
// 黑洞基础效果：M^（0.2 + sbu2·0.05）（引力潮汐：效果指数 +0.05/级）；返回 double（扭曲状态给时间倍率）
function bhEffect() {
  const mLog = getLogBhMass();
  if (mLog <= 0) return 1;
  const exp = 0.2 + state.sbu2 * 0.05;
  const effLog = exp * mLog;
  return effLog > 308 ? Infinity : Math.pow(10, effLog);
}
// 黑洞效果 log10（log 域，防溢出）
function bhEffectLog() {
  const mLog = getLogBhMass();
  if (mLog <= 0) return 0;
  const exp = 0.2 + state.sbu2 * 0.05;
  return clampLog(exp * mLog);
}
// 黑洞对时间速率的加成（仅扭曲状态）：×(1 + bhEffect)；AU34 引力扭曲：扭曲状态效果额外 ^2
function bhTimeMult() {
  if (!bhUnlocked() || state.bhState !== "distorl") return 1;
  // AU34：扭曲状态效果 ^2（即 bhEffectLog × 2）
  let el = bhEffectLog();
  if (auOwned("au34")) el = clampLog(el * 2);
  return el > 0 ? (1 + (el > 308 ? Infinity : Math.pow(10, el))) : 1;
}
// 吸积效率倍率（SBU1 事件视界 ×2/级；AU43 奇点塌缩额外 ×spAccretionMult）
function bhAccretionMult() { return Math.pow(2, state.sbu1) * spAccretionMult(); }
// AU43 奇点塌缩：黑洞吸积效率倍率 = (lg(Sp+1) + (Sp+1)^0.01)^2
function spAccretionMult() {
  if (!auOwned("au43")) return 1;
  const sp1 = 1 + state.totalSp;
  return Math.pow(Math.log10(sp1) + Math.pow(sp1, 0.01), 2);
}
// 虚粒子获取倍率（SBU3 霍金辐射 ×2/级）
function bhVPMult() { return Math.pow(2, state.sbu3); }
// 吸积状态：质量获取速率 log10(dM/dt)。M^0.75 × (F/1e200)^0.01 × accretionMult
// → log = massExp*logM + 0.01*(FLog-200) + accretionMult；massExp 受 SVPU1 加成，
// accretionMult = SBU1 ×2^sbu1 × AU43 奇点塌缩倍率（spAccretionMult）
function bhAccretionRateLog() {
  const mLog = getLogBhMass();
  const fLog = FLog();
  const accMult = Math.pow(2, state.sbu1) * spAccretionMult();
  return clampLog(bhAccretionMassExp() * mLog + 0.01 * (fLog - 200) + Math.log10(Math.max(accMult, 1e-300)));
}
// 脉冲状态：虚粒子获取速率（每秒）= floor(mult × (M^0.1 − 1))；M=1 时自然为 0。返回 log10
function bhVPGainLog() {
  const mLog = getLogBhMass();
  if (mLog <= 0) return NLOG; // M=1 → M^0.1−1 = 0，无获取
  const x = 0.1 * mLog;
  // 大质量时 10^x−1 ≈ 10^x（log ≈ x）；小质量直接算，避免精度损失
  const inner = x > 15 ? x : Math.log10(Math.max(Math.pow(10, x) - 1, 1e-300));
  return clampLog(inner + state.sbu3 * Math.log10(2));
}
// 黑洞升级定义
const SBU_DEFS = [
  { id: "sbu1", key: "sbu1", name: "事件视界", desc: "每级使黑洞吸积效率 ×2", max: Infinity, cost: (n) => Math.pow(1e9, 1) * Math.pow(100, n - 1) },
  { id: "sbu2", key: "sbu2", name: "引力潮汐", desc: "每级使黑洞效果指数 +0.05", max: Infinity, cost: (n) => Math.pow(1e10, 1) * Math.pow(1000, n - 1) },
  { id: "sbu3", key: "sbu3", name: "霍金辐射", desc: "每级使虚粒子获取 ×2", max: Infinity, cost: (n) => Math.pow(1e11, 1) * Math.pow(100, n - 1) },
];
function sbuCostLog(u, n) {
  if (u.id === "sbu1") return 9 + (n - 1) * 2;       // 1e9 × 100^(n-1)
  if (u.id === "sbu2") return 10 + (n - 1) * 3;      // 1e10 × 1000^(n-1)
  if (u.id === "sbu3") return 11 + (n - 1) * 2;      // 1e11 × 100^(n-1)
  return 0;
}
function buySBU(id) {
  if (!bhUnlocked()) return;
  const u = SBU_DEFS.find(x => x.id === id);
  if (!u) return;
  const n = state[u.key] + 1;
  const c = u.cost(n);
  if (state.sp < c) return;
  setSp(state.sp - c);
  state[u.key]++;
  updateBlackholeUI();
  setAutosaveStatus("已购买黑洞升级：" + u.name);
}
// 黑洞虚粒子升级（花 VP，位于黑洞页）
const SVPU_DEFS = [
  { id: "svpu1", key: "svpu1", name: "全息原理", desc: "吸积公式中质量的指数 +0.03/级（最高 6 级）", max: 6, costLog: (n) => n },         // 10^n VP
  { id: "svpu2", key: "svpu2", name: "虚幻湮灭", desc: "获得的湮灭次数×2", max: Infinity, costLog: (n) => Math.log10(3) + (n - 1) * Math.log10(5) },  // 3×5^(n-1) VP
  { id: "svpu3", key: "svpu3", name: "非欧几何", desc: "削弱升级3软上限（最高 3 级）", max: 3, costLog: (n) => 5 * n - 4 },                  // 10^(5n-4) VP，增速 ×1e5
];
function buySVPU(id) {
  if (!bhUnlocked()) return;
  const u = SVPU_DEFS.find(x => x.id === id);
  if (!u) return;
  if (state[u.key] >= u.max) return;
  const n = state[u.key] + 1;
  const cLog = u.costLog(n);
  const c = Math.pow(10, cLog);
  if (cmpLT(state.virtualParticles, c, getLogVP(), cLog)) return;
  setVP(state.virtualParticles - c);
  state[u.key]++;
  updateBlackholeUI();
  setAutosaveStatus("已购买黑洞升级：" + u.name);
}
// SVPU1 全息原理：吸积质量指数 +0.03/级（0.75 → 0.75 + 0.03·svpu1）
function bhAccretionMassExp() { return 0.75 + 0.03 * state.svpu1; }
// SVPU2 虚幻湮灭：每次获得的奇点 ×2^svpu2（乘在每次 gained 上，不加成次数本身）
function annSpMult() { return Math.pow(2, state.svpu2); }
// SVPU3 非欧几何：升级3软上限缩放指数的次幂 1/(n+1)（n=svpu3）
function up3SoftcapScale(lf) {
  // 原 scale = 5/√(lf)；SVPU3 后 scale = (5/√lf)^(1/(svpu3+1))
  if (lf <= 100) return 5 / Math.sqrt(lf);
  const base = 5 / Math.sqrt(lf);
  const pw = 1 / (state.svpu3 + 1);
  return Math.pow(base, pw);
}
function setBhState(s) {
  if (!bhUnlocked()) return;
  state.bhState = s;
  updateBlackholeUI();
}
// 黑洞 tick（游戏时间）：处理质量/虚粒子/时间倍率由 timeRate() 调用，此处仅处理质量与虚粒子
function tickBlackhole(dt) {
  if (!bhUnlocked()) return;
  const mLog = getLogBhMass();
  if (state.bhState === "accrete") {
    // 质量获取：dM/dt = M^0.75 × (F/1e200)^0.01 × accretionMult（log 域累积）
    const rateLog = bhAccretionRateLog() + Math.log10(Math.max(dt, 1e-300));
    if (rateLog > NLOG + 1) {
      setBhMassLog(logAddLogs(mLog, rateLog));
    }
    // 虚粒子衰减：每秒 ×(9/10) → logVP += log10(0.9)·dt（负数，故衰减）
    const vpLog = getLogVP();
    if (vpLog > NLOG + 1) {
      setVPLog(vpLog + Math.log10(0.9) * dt);
      if (getLogVP() <= NLOG + 1) setVPLog(NLOG); // 衰减到 0 停止
    }
  } else if (state.bhState === "distorl") {
    // 扭曲：无质量变化，无虚粒子（时间倍率由 bhTimeMult 给予）
  } else if (state.bhState === "pulse") {
    // 脉冲：每秒质量 ×0.5（损失一半，到 1 停）
    if (mLog > 0) {
      const halfLife = Math.log10(0.5) * dt; // 每秒 -log10(2)
      let newLog = mLog + halfLife;
      if (newLog < 0) newLog = 0; // 到 1（log 0）为止
      setBhMassLog(newLog);
    }
    // 虚粒子获取：每秒速率 = floor(mult × (M^0.1 − 1))（整数速率），按 dt 连续累计。
    // floor 按「每秒速率」取整而非按 tick 取整，否则小速率会永远取 0。
    const vRateLog = bhVPGainLog();
    if (vRateLog > NLOG + 1) {
      const rate = vRateLog > 15 ? Math.pow(10, vRateLog) : Math.floor(Math.pow(10, vRateLog));
      if (rate > 0) {
        const addLog = clampLog(Math.log10(rate) + Math.log10(Math.max(dt, 1e-300)));
        setVPLog(logAddLogs(getLogVP(), addLog));
      }
    }
  }
}

// ---------- 黑洞 UI（build-once, in-place update）+ 旋转动画 ----------
let bhBuilt = false, bhRefs = {}, bhStateBtns = [], bhAnimRAF = 0, bhAngle = 0, bhParticles = [];

function buildBlackholeOnce() {
  if (bhBuilt) return;
  const list = document.getElementById("bh-upg-list");
  list.innerHTML = "";
  bhRefs = {};
  // 两组升级：各自三个一排，标题居中
  const mkTitle = (text) => {
    const t = document.createElement("div");
    t.className = "bh-row-title";
    t.textContent = text;
    return t;
  };
  const mkRow = () => {
    const row = document.createElement("div");
    row.className = "bh-upg-row";
    return row;
  };
  // 黑洞升级（花 Sp）
  list.appendChild(mkTitle("黑洞升级"));
  const sbuRow = mkRow();
  list.appendChild(sbuRow);
  for (const u of SBU_DEFS) {
    const btn = document.createElement("button");
    btn.className = "sau-btn bh-upg-btn";
    const nm = document.createElement("div"); nm.className = "sau-name"; nm.textContent = u.name;
    const ds = document.createElement("div"); ds.className = "sau-desc";
    const ct = document.createElement("div"); ct.className = "sau-cost";
    btn.append(nm, ds, ct);
    btn.addEventListener("click", () => buySBU(u.id));
    sbuRow.appendChild(btn);
    bhRefs[u.id] = { u, btn, descEl: ds, costEl: ct };
  }
  // 虚粒子升级（花 VP）
  list.appendChild(mkTitle("虚粒子升级"));
  const svpuRow = mkRow();
  list.appendChild(svpuRow);
  for (const u of SVPU_DEFS) {
    const btn = document.createElement("button");
    btn.className = "sau-btn bh-upg-btn svpu-btn";
    const nm = document.createElement("div"); nm.className = "sau-name"; nm.textContent = u.name;
    const ds = document.createElement("div"); ds.className = "sau-desc";
    const ct = document.createElement("div"); ct.className = "sau-cost";
    btn.append(nm, ds, ct);
    btn.addEventListener("click", () => buySVPU(u.id));
    svpuRow.appendChild(btn);
    bhRefs[u.id] = { u, btn, descEl: ds, costEl: ct, vp: true };
  }
  bhStateBtns = [];
  document.querySelectorAll(".bh-state-btn").forEach(b => {
    b.addEventListener("click", () => setBhState(b.dataset.bhState));
    bhStateBtns.push(b);
  });
  // S21 这是饼干点点乐吗？—— 点击黑洞动画界面 100 次
  const canvas = document.getElementById("bh-canvas");
  if (canvas) {
    canvas.addEventListener("click", () => {
      if (!bhUnlocked() || state.ach.hidden.includes("S21")) return;
      state.bhCanvasClicks++;
      if (state.bhCanvasClicks >= 100) {
        grantHidden("S21");
        updateAchievementsUI();
      }
    });
  }
  // 动画初始化：粒子池
  bhParticles = [];
  for (let i = 0; i < 60; i++) bhParticles.push({ a: Math.random() * Math.PI * 2, r: 0.3 + Math.random() * 0.6, s: 0.5 + Math.random(), life: Math.random() });
  bhBuilt = true;
}

function bhRadius() {
  // 直径比例 = max(0.1, min(0.6, lg(M)/50))（界面宽度的倍数）；返回半径
  // 初始 M=1 时直径约为界面宽度的 0.1 倍，M=1e30 后封顶 0.6 倍
  const mLog = Math.max(0, getLogBhMass());
  const scale = Math.max(0.1, Math.min(0.6, mLog / 50));
  const pageW = document.getElementById("app").offsetWidth || 760;
  return { r: pageW * scale / 2, pageW };
}

function drawBlackhole(state2) {
  const canvas = document.getElementById("bh-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const { r } = bhRadius();
  const cx = w / 2, cy = h / 2;
  // 画布内截断：直径不超过画布宽（保留少量边距给事件视界光环）
  const R = Math.min(r, w * 0.48);
  bhAngle += state2 === "distorl" ? 0.04 : (state2 === "pulse" ? 0.02 : 0.012);
  // 吸积盘环（多层）
  for (let ring = 0; ring < 4; ring++) {
    const rr = R * (1.2 + ring * 0.25);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(bhAngle * (1 - ring * 0.15));
    ctx.beginPath();
    ctx.ellipse(0, 0, rr, rr * 0.32, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, ${120 - ring * 20}, 40, ${0.5 - ring * 0.1})`;
    ctx.lineWidth = 2 + ring;
    ctx.stroke();
    ctx.restore();
  }
  // 黑洞本体（径向渐变）
  const grad = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
  if (state2 === "pulse") {
    grad.addColorStop(0, "#7a0a0a");
    grad.addColorStop(0.5, "#3a0000");
    grad.addColorStop(1, "#000");
  } else {
    grad.addColorStop(0, "#000");
    grad.addColorStop(0.7, "#0a0a0a");
    grad.addColorStop(1, "#1a1a2a");
  }
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  // 事件视界光环
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2);
  ctx.strokeStyle = state2 === "pulse" ? "rgba(255,60,60,0.6)" : "rgba(120,80,200,0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 粒子
  for (const p of bhParticles) {
    p.a += (state2 === "distorl" ? 0.06 : 0.03) * p.s;
    p.life += 0.01;
    if (p.life > 1) { p.life = 0; p.r = 0.3 + Math.random() * 0.6; }
    const dist = state2 === "accrete" ? (1 - p.life) : p.life; // 吸积向内、脉冲向外
    const pr = R * (1.1 + dist * 1.5);
    const px = cx + Math.cos(p.a) * pr;
    const py = cy + Math.sin(p.a) * pr * 0.32;
    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = state2 === "pulse" ? `rgba(255,80,80,${1 - p.life})` : `rgba(180,150,255,${0.3 + (1 - p.life) * 0.5})`;
    ctx.fill();
  }
}

function bhAnimLoop() {
  if (!bhBuilt) { bhAnimRAF = requestAnimationFrame(bhAnimLoop); return; }
  drawBlackhole(state.bhState);
  // 快变数字刷新（黑洞状态行）
  const stats = document.getElementById("bh-stats");
  if (stats) {
    const stNames = { accrete: "吸积", distorl: "扭曲", pulse: "脉冲" };
    stats.innerHTML =
      `<div class="bh-stat-row"><span>黑洞质量</span><span>${fmtNum(state.bhMass, getLogBhMass())} M☉</span></div>` +
      `<div class="bh-stat-row"><span>虚粒子</span><span>${fmtInt(state.virtualParticles, getLogVP())}</span></div>` +
      `<div class="bh-stat-row"><span>当前状态</span><span>${stNames[state.bhState] || "—"}</span></div>` +
      `<div class="bh-stat-row"><span>基础效果</span><span>×${fmtNum(bhEffect(), bhEffectLog())}</span></div>`;
  }
  bhAnimRAF = requestAnimationFrame(bhAnimLoop);
}

function updateBlackholeUI() {
  if (!bhUnlocked()) return;
  buildBlackholeOnce();
  document.getElementById("subtab-blackhole").classList.toggle("hidden", !bhUnlocked());
  // 状态按钮高亮
  for (const b of bhStateBtns) {
    b.classList.toggle("active", b.dataset.bhState === state.bhState);
  }
  // SBU 升级（花 Sp）与 SVPU 升级（花 VP）
  for (const id in bhRefs) {
    const r = bhRefs[id];
    const n = state[r.u.key] + 1;
    const maxed = r.u.max !== Infinity && state[r.u.key] >= r.u.max;
    let c, cLog, affordable, costStr, resUnit;
    if (r.vp) {
      // SVPU：花 VP
      cLog = r.u.costLog(n);
      c = Math.pow(10, cLog);
      affordable = !maxed && cmpGE(state.virtualParticles, c, getLogVP(), cLog);
      costStr = fmtNum(c, cLog) + " VP";
      resUnit = "VP";
    } else {
      // SBU：花 Sp
      cLog = sbuCostLog(r.u, n);
      c = r.u.cost(n);
      affordable = !maxed && state.sp >= c;
      costStr = fmtNum(c, cLog) + " Sp";
      resUnit = "Sp";
    }
    r.descEl.textContent = r.u.desc + (r.u.max !== Infinity ? "（" + state[r.u.key] + "/" + r.u.max + "）" : "（等级 " + state[r.u.key] + "）");
    r.costEl.textContent = maxed ? "已满级" : costStr;
    r.btn.disabled = maxed || !affordable;
    r.btn.classList.toggle("bought", maxed);
    r.btn.classList.toggle("affordable", !maxed && affordable);
  }
}

// 批量购买上限升级（A34 解锁，位于自动化页）
const BATCH_UPG = { id: "batch", name: "批量购买上限翻倍", desc: "批量购买的每次上限翻倍（初始 2）；打破规则且上限超过 128 后变为「最大购买」", key: "batchLvl", repeat: true, cost: () => Math.pow(20, state.batchLvl) };
// A42 星标奖励：自动湮灭 CD 缩减升级（自动化页，Sp 购买；每级 CD ÷2，最低 25ms）
const ANN_CD_UPG = { id: "annCd", name: "自动湮灭 CD 缩减", desc: "每级使自动湮灭 CD ÷2（最低 25ms）", key: "autoAnnCDLvl", cost: () => Math.pow(100, state.autoAnnCDLvl) * 1e12 };
function buyAnnCDUpgrade() {
  if (!state.ach.normal.includes("A42")) return;
  const cost = ANN_CD_UPG.cost();
  if (state.sp < cost) return;
  setSp(state.sp - cost);
  state.autoAnnCDLvl++;
  updateAutomationUI();
  setAutosaveStatus("已购买：自动湮灭 CD 缩减");
}
function buyBatchUpgrade() {
  if (!state.ach.normal.includes("A34")) return;
  const cost = BATCH_UPG.cost();
  if (state.sp < cost) return;
  setSp(state.sp - cost);
  state.batchLvl++;
  state.batchMax = Math.pow(2, state.batchLvl + 1);
  updateAutomationUI();
  setAutosaveStatus("已购买：批量购买上限翻倍");
}
function buySpUpgrade(id) {
  // spu1 单独处理（已移至 SAU 区）
  if (id === "spu1") {
    if (state.spu1 >= 1) return;
    if (state.sp < 1) return;
    setSp(state.sp - 1);
    state.spu1 = 1;
    checkAchievements(); // A31
    updateSpUI();
    setAutosaveStatus("已购买湮灭升级");
    return;
  }
  const u = SP_UPGRADES.find(x => x.id === id);
  if (!u) return;
  if (u.requiresA34 && !state.ach.normal.includes("A34")) return; // A34 解锁
  const cost = u.repeat ? u.cost() : u.cost;
  if (!u.repeat && state[u.key]) return;
  if (state.sp < cost) return;
  setSp(state.sp - cost);
  if (u.repeat) {
    state[u.key]++;
    if (u.id === "batch") { state.batchMax = Math.pow(2, state.batchLvl + 1); }
  } else {
    state[u.key] = 1;
  }
  checkAchievements(); // A31
  updateSpUI();
  updateAutomationUI();
  setAutosaveStatus("已购买湮灭升级");
}

// 湮灭页 UI（build-once, in-place update）
let spBuilt = false, spRefs = [], msRefs = [], sauRefs = [], auRefs = {}, spu1Ref = null, vacRef = null;
function buildAnnihilationOnce() {
  if (spBuilt) return;
  // 里程碑
  const mList = document.getElementById("milestone-list");
  mList.innerHTML = ""; msRefs = [];
  for (const m of MILESTONES) {
    const row = document.createElement("div");
    row.className = "milestone" + (m.n === 20 ? " distort" : "");
    const d = document.createElement("div"); d.className = "ms-desc"; d.textContent = `第 ${m.n} 次湮灭：${m.desc}`;
    const c = document.createElement("div"); c.className = "ms-count";
    row.append(d, c);
    mList.appendChild(row);
    msRefs.push({ m, row, countEl: c });
  }
  // 扭曲里程碑（接在湮灭里程碑下方，暗红色）
  const mSection = document.getElementById("milestone-list");
  const dtTitle = document.createElement("div");
  dtTitle.className = "ms-distort-title hidden";
  dtTitle.id = "distort-ms-title";
  dtTitle.textContent = "扭曲里程碑（已湮灭的扭曲宇宙数量）";
  mSection.appendChild(dtTitle);
  for (const m of DISTORT_MILESTONES) {
    const row = document.createElement("div");
    row.className = "milestone distort hidden distort-ms" + (m.black ? " black" : "");
    const d = document.createElement("div"); d.className = "ms-desc";
    d.textContent = m.n + " DA：" + m.desc; // 1DA 描述在 updateSpUI 动态刷新
    const c = document.createElement("div"); c.className = "ms-count";
    row.append(d, c);
    mSection.appendChild(row);
    msRefs.push({ m, row, countEl: c, descEl: d, distort: true });
  }
  // 奇点升级
  const uList = document.getElementById("sp-upgrade-list");
  uList.innerHTML = ""; spRefs = [];
  // spu1（奇点升级区顶部，与 SAU 按钮同尺寸）
  const spuRow = document.createElement("div");
  spuRow.className = "sau-row spu-row";
  const spuBtn = document.createElement("button");
  spuBtn.className = "sau-btn";
  {
    const nm = document.createElement("div"); nm.className = "sau-name"; nm.textContent = SPU1_DEF.name;
    const ds = document.createElement("div"); ds.className = "sau-desc"; ds.textContent = SPU1_DEF.desc;
    const ct = document.createElement("div"); ct.className = "sau-cost";
    spuBtn.append(nm, ds, ct);
    spuBtn.addEventListener("click", () => buySpUpgrade("spu1"));
    spuRow.appendChild(spuBtn);
  }
  uList.appendChild(spuRow);
  spu1Ref = { btn: spuBtn, costEl: spuBtn.querySelector ? spuBtn.children[2] : null };
  // 真空衰变（spu1 下方、SAU 行上方）
  const vacRow = document.createElement("div");
  vacRow.className = "sau-row vac-row";
  vacRef = null;
  {
    const btn = document.createElement("button");
    btn.className = "sau-btn";
    const nm = document.createElement("div"); nm.className = "sau-name"; nm.textContent = VACUUM_DEF.name;
    const ds = document.createElement("div"); ds.className = "sau-desc";
    const ct = document.createElement("div"); ct.className = "sau-cost";
    btn.append(nm, ds, ct);
    btn.addEventListener("click", () => buySAU(VACUUM_DEF.id));
    vacRow.appendChild(btn);
    vacRef = { u: VACUUM_DEF, btn, descEl: ds, costEl: ct };
  }
  uList.appendChild(vacRow);
  // SAU 可重复升级（一行三个扁长方按钮，3DA 解锁）
  const sauRow = document.createElement("div");
  sauRow.className = "sau-row";
  sauRefs = [];
  for (const u of SAU_DEFS) {
    const btn = document.createElement("button");
    btn.className = "sau-btn";
    const nm = document.createElement("div"); nm.className = "sau-name"; nm.textContent = u.name;
    const ds = document.createElement("div"); ds.className = "sau-desc";
    const ct = document.createElement("div"); ct.className = "sau-cost";
    btn.append(nm, ds, ct);
    btn.addEventListener("click", () => buySAU(u.id));
    sauRow.appendChild(btn);
    sauRefs.push({ u, btn, descEl: ds, costEl: ct });
  }
  uList.appendChild(sauRow);
  // AU 单次升级（四组，两组一行）
  auRefs = {};
  for (let grp = 0; grp < AU_DEFS.length; grp += 2) {
    const rowEl = document.createElement("div");
    rowEl.className = "au-row";
    for (let k = 0; k < 2 && grp + k < AU_DEFS.length; k++) {
      const col = document.createElement("div");
      col.className = "au-col";
      for (const u of AU_DEFS[grp + k]) {
        const btn = document.createElement("button");
        btn.className = "au-btn";
        const nm = document.createElement("div"); nm.className = "sau-name"; nm.textContent = u.name;
        const ds = document.createElement("div"); ds.className = "sau-desc";
        const ct = document.createElement("div"); ct.className = "sau-cost";
        btn.append(nm, ds, ct);
        btn.addEventListener("click", () => buyAU(u.id));
        col.appendChild(btn);
        auRefs[u.id] = { u, btn, nameEl: nm, descEl: ds, costEl: ct };
      }
      rowEl.appendChild(col);
    }
    uList.appendChild(rowEl);
  }
  for (const u of SP_UPGRADES) {
    if (u.requiresA34 && !state.ach.normal.includes("A34")) continue; // 未获得 A34 前隐藏
    const row = document.createElement("div");
    row.className = "sp-upgrade";
    const left = document.createElement("div");
    const nm = document.createElement("div"); nm.className = "spu-name"; nm.textContent = u.name;
    const ds = document.createElement("div"); ds.className = "spu-desc"; ds.textContent = u.desc;
    left.append(nm, ds);
    const right = document.createElement("div"); right.className = "auto-controls";
    const cost = document.createElement("div"); cost.className = "spu-cost";
    const btn = document.createElement("button"); btn.textContent = "购买";
    btn.addEventListener("click", () => buySpUpgrade(u.id));
    right.append(cost, btn);
    row.append(left, right);
    uList.appendChild(row);
    spRefs.push({ u, row, costEl: cost, btn });
  }
  spBuilt = true;
}
function updateSpUI() {
  if (state.annihilations < 1) return;
  buildAnnihilationOnce();
  // 扭曲里程碑：解锁扭曲（20 湮灭）前不可见
  const distortMsVisible = state.annihilations >= 20;
  const dtTitleEl = document.getElementById("distort-ms-title");
  if (dtTitleEl) dtTitleEl.classList.toggle("hidden", !distortMsVisible);
  for (const r of msRefs) {
    if (r.distort) r.row.classList.toggle("hidden", !distortMsVisible);
    // 1DA 描述动态显示当前倍率
    if (r.distort && r.m.n === 1 && r.descEl) {
      r.descEl.textContent = "1 DA：基于扭曲宇宙湮灭数，将奇点效果变为 " + daExpMult().toFixed(2) + " 倍";
    }
    const done = r.distort ? hasDistortMilestone(r.m.n) : hasMilestone(r.m.n);
    r.row.classList.toggle("done", done);
    const cur = r.distort ? distortDA() : effAnnihilations();
    r.countEl.textContent = done ? "✓" : (cur + " / " + r.m.n);
  }
  for (const r of spRefs) {
    const cost = r.u.repeat ? r.u.cost() : r.u.cost;
    if (r.u.repeat) {
      // 可重复升级：显示等级与下一价
      r.row.classList.toggle("affordable", state.sp >= cost);
      r.costEl.textContent = `${fmt(cost)} Sp（等级 ${state[r.u.key]}）`;
      r.btn.textContent = "购买";
      r.btn.disabled = state.sp < cost;
    } else {
      const owned = state[r.u.key] >= 1;
      r.row.classList.toggle("affordable", owned || state.sp >= cost);
      r.costEl.textContent = owned ? "已购买" : `${fmt(cost)} Sp`;
      r.btn.textContent = owned ? "已购买" : "购买";
      r.btn.disabled = owned || state.sp < cost;
    }
  }
  // spu1（始终显示，与 SAU 同尺寸）
  if (spu1Ref) {
    const owned = state.spu1 >= 1;
    spu1Ref.btn.classList.toggle("bought", owned);
    spu1Ref.btn.disabled = owned;
    if (spu1Ref.costEl) spu1Ref.costEl.textContent = owned ? "已购买" : "1 Sp";
  }
  // 真空衰变（3DA 解锁）
  const sauUnlocked = hasDistortMilestone(3);
  if (vacRef) {
    vacRef.btn.classList.toggle("hidden", !sauUnlocked);
    if (sauUnlocked) {
      const n = state.sau4 + 1;
      const c = VACUUM_DEF.cost(n);
      vacRef.descEl.textContent = VACUUM_DEF.desc + "（等级 " + state.sau4 + "）";
      vacRef.costEl.textContent = fmt(c) + " Sp";
      vacRef.btn.disabled = state.sp < c;
      vacRef.btn.classList.toggle("affordable", state.sp >= c);
    }
  }
  for (const r of sauRefs) {
    r.btn.classList.toggle("hidden", !sauUnlocked);
    if (!sauUnlocked) continue;
    const n = state[r.u.key] + 1;
    const maxed = state[r.u.key] >= r.u.max;
    const c = r.u.cost(n);
    r.descEl.textContent = r.u.desc + (r.u.max !== Infinity ? "（" + state[r.u.key] + "/" + r.u.max + "）" : "（等级 " + state[r.u.key] + "）");
    r.costEl.textContent = maxed ? "已满级" : fmt(c) + " Sp";
    r.btn.disabled = maxed || state.sp < c;
    r.btn.classList.toggle("bought", maxed);
    r.btn.classList.toggle("affordable", !maxed && state.sp >= c);
  }
  // AU 单次升级（第 4 组 4DA 前显示 ???，解锁后显示真实内容；AU42 额外需 6DA）
  const au4Unlocked = hasDistortMilestone(4);
  for (const id in auRefs) {
    const r = auRefs[id];
    r.btn.classList.toggle("hidden", !sauUnlocked);
    if (!sauUnlocked) continue;
    const owned = auOwned(id);
    const afford = state.sp >= r.u.cost;
    const isAu4 = id.startsWith("au4");
    // AU42 需 6DA、AU43 需 7DA；其余 au4* 需 4DA
    // 未解锁时名字显示？？？、描述显示「（NDA 解锁）」
    const au42Unlocked = hasDistortMilestone(6);
    const au43Unlocked = hasDistortMilestone(7);
    const thisUnlocked = !isAu4 ? true : (id === "au42" ? au42Unlocked : id === "au43" ? au43Unlocked : au4Unlocked);
    if (isAu4 && !thisUnlocked) {
      r.descEl.textContent = `（${id === "au42" ? "6" : id === "au43" ? "7" : "4"}DA 解锁）`;
      if (r.nameEl) r.nameEl.textContent = "？？？";
    } else {
      r.descEl.textContent = r.u.desc;
      if (r.nameEl) r.nameEl.textContent = r.u.name;
    }
    r.costEl.textContent = owned ? "已购买"
      : (r.u.cost === Infinity ? "未开放"
      : (isAu4 && !thisUnlocked ? "???" : fmt(r.u.cost) + " Sp"));
    r.btn.disabled = owned || !afford || (isAu4 && !thisUnlocked);
    r.btn.classList.toggle("bought", owned);
    r.btn.classList.toggle("affordable", !owned && afford);
  }
  // 总奇点加成面板
  const panel = document.getElementById("sp-bonus-panel");
  const rows = [
    ["总奇点 (Sp)", fmtNum(state.totalSp, getLogTotalSp())],
    ["波速获取倍率", "×" + fmtNum(hasDistortMilestone(1) ? Decimal.pow(1 + state.totalSp, 2 * daExpMult()).toNumber() : Math.pow(1 + state.totalSp, 2), 2 * daExpMult() * (getLogTotalSp() > 250 ? getLogTotalSp() : Math.log10(1 + state.totalSp)))],
    ["普朗克常数倍率", "×" + fmtNum(planckMult(), planckMultLog())],
  ];
  if (auOwned("au43")) rows.push(["黑洞吸积效率倍率", "×" + fmt(spAccretionMult())]);
  rows.push(["当前宇宙普朗克温度", fmtNum(temperatureCap(), temperatureCapLog()) + " K"]);
  panel.innerHTML = "";
  for (const [label, value] of rows) {
    const row = document.createElement("div"); row.className = "spb-row";
    const l = document.createElement("span"); l.className = "spb-label"; l.textContent = label;
    const v = document.createElement("span"); v.className = "spb-value"; v.textContent = value;
    row.append(l, v);
    panel.appendChild(row);
  }
  // 温度上限软上限提示：原上限超 1e250 时显示（亮红）
  {
    const expS = hasDistortMilestone(1) ? 10 * daExpMult() : 10;
    const rawLogCap = (getLogTotalSp() > 250 ? expS * getLogTotalSp() : expS * Math.log10(1 + state.totalSp)) + Math.log10(T_P0);
    if (rawLogCap > 250) {
      const warn = document.createElement("div");
      warn.className = "spb-warning";
      warn.textContent = "多元宇宙的规则正在阻止你获取更高的温度";
      panel.appendChild(warn);
    }
  }
  document.getElementById("sp-value").textContent = fmtNum(state.sp, getLogSp());
}

// ---------- 扭曲宇宙 UI（build-once, in-place update）----------
let distortBuilt = false, distortRefs = [];
function buildDistortOnce() {
  if (distortBuilt) return;
  const list = document.getElementById("distort-list");
  list.innerHTML = ""; distortRefs = [];
  for (const u of DISTORT_UNIVERSES) {
    const card = document.createElement("div");
    card.className = "distort-card";
    const nm = document.createElement("div"); nm.className = "dt-name"; nm.textContent = u.name;
    const ds = document.createElement("div"); ds.className = "dt-desc"; ds.textContent = u.desc;
    const st = document.createElement("div"); st.className = "dt-status";
    const btn = document.createElement("button"); btn.textContent = "进入";
    btn.addEventListener("click", () => enterDistort(u.id));
    card.append(nm, ds, st, btn);
    list.appendChild(card);
    distortRefs.push({ u, card, statusEl: st, btn });
  }
  distortBuilt = true;
}
function updateDistortUI() {
  if (state.annihilations < 20) return;
  buildDistortOnce();
  // 重试/退出按钮：仅在扭曲宇宙中可见
  document.getElementById("distort-active-controls").classList.toggle("hidden", !state.distortActive);
  // 顶部汇总行：湮灭的扭曲宇宙数与奇点倍率
  const summary = document.getElementById("distort-summary");
  summary.innerHTML =
    "你湮灭了<span class='ds-red'>" + distortDA() + "</span>个扭曲宇宙，" +
    "<span class='ds-purple'>奇点</span>获取变为<span class='ds-red'>" + fmt(state.distortMult) + "</span>倍";
  for (const r of distortRefs) {
    const done = state.distortDone.includes(r.u.id);
    const active = state.distortActive === r.u.id;
    r.card.classList.toggle("done", done && !active);
    r.card.classList.toggle("active", active);
    const tpLog = isFinite(r.u.tp) ? Math.log10(r.u.tp) : Infinity;
    const tpStr = isFinite(r.u.tp) ? fmt(r.u.tp) : "∞";
    if (active) {
      r.statusEl.textContent = `进行中 · 目标 ${tpStr} K`;
      r.btn.textContent = "进行中";
      r.btn.disabled = true;
    } else if (done) {
      r.statusEl.textContent = `已湮灭 · 可再次进入`;
      r.btn.textContent = "进入";
      r.btn.disabled = false;
    } else {
      r.statusEl.textContent = `目标 ${tpStr} K`;
      r.btn.textContent = "进入";
      r.btn.disabled = false;
    }
  }
}

// ---------- 自动化 ----------
const AUTO_DEFS = [
  { key: "wave", unlockState: "autoWaveUpg", name: "自动购买主要页升级", desc: "自动购买波动主要页面的可重复升级（升级1/2）", unlockDesc: "1e10 Hz 解锁" },
  { key: "phonon", unlockState: "autoPhononUpg", name: "自动购买声子页升级", desc: "自动购买波动声子页面的可重复升级", unlockDesc: "1e20 Hz 解锁" },
  { key: "up3", unlockState: "autoUp3", name: "自动购买升级3", desc: "在达到指定倍率时自动购买升级3", unlockDesc: "第 8 次湮灭解锁", input: { id: "auto-up3-mult", label: "倍率", value: () => state.autoUp3Mult } },
  { key: "ann", unlockState: "autoAnn", name: "自动湮灭", desc: "在可获取指定奇点数时自动湮灭", unlockDesc: "第 10 次湮灭解锁", input: { id: "auto-ann-sp", label: "Sp", value: () => state.autoAnnSp } },
];

function autoUnlocked(def) {
  if (def.key === "wave") return state.autoWaveUpg >= 1;
  if (def.key === "phonon") return state.autoPhononUpg >= 1;
  if (def.key === "up3") return state.autoUp3 >= 1;
  if (def.key === "ann") return state.autoAnn >= 1;
  return false;
}

let autoBuilt = false, autoRefs = {}, batchRefs = null, annCDRefs = null;
function buildAutomationOnce() {
  if (autoBuilt) return;
  const list = document.getElementById("auto-list");
  list.innerHTML = ""; autoRefs = {};
  for (const def of AUTO_DEFS) {
    const row = document.createElement("div");
    row.className = "auto-row";
    const left = document.createElement("div");
    const nm = document.createElement("div"); nm.className = "auto-name"; nm.textContent = def.name;
    const ds = document.createElement("div"); ds.className = "auto-desc"; ds.textContent = def.desc;
    left.append(nm, ds);
    const right = document.createElement("div"); right.className = "auto-controls";
    const lock = document.createElement("div"); lock.className = "auto-lock";
    const input = document.createElement("input"); input.type = "text"; input.classList.add("hidden"); // text 以允许 AeB 格式
    input.addEventListener("change", () => {
      const v = parseSciInput(input.value);
      if (def.key === "up3") {
        if (!isNaN(v)) state.autoUp3Mult = v;
        // S13：在升级3的自动化中填入小于 1 的数字
        if (!state.ach.hidden.includes("S13") && !isNaN(v) && v < 1) { grantHidden("S13"); updateAchievementsUI(); }
      } else if (def.key === "ann") {
        if (!isNaN(v)) state.autoAnnSp = v;
      }
      saveGame();
    });
    // AU21/AU22：模式切换按钮 + 时间间隔输入框
    let modeBtn = null, timeInput = null;
    if (def.key === "up3" || def.key === "ann") {
      modeBtn = document.createElement("button"); modeBtn.className = "batch-btn single hidden";
      modeBtn.addEventListener("click", () => {
        if (def.key === "up3") state.autoUp3Mode = state.autoUp3Mode === "ratio" ? "time" : "ratio";
        else state.autoAnnMode = state.autoAnnMode === "sp" ? "time" : "sp";
        updateAutomationUI();
      });
      timeInput = document.createElement("input"); timeInput.type = "text"; timeInput.classList.add("hidden"); // text 以允许 AeB 格式
      timeInput.addEventListener("change", () => {
        const v = parseSciInput(timeInput.value);
        if (def.key === "up3") state.autoUp3Interval = isNaN(v) || v < 0.1 ? 10 : v;
        else state.autoAnnInterval = isNaN(v) || v < 0.1 ? 60 : v;
        saveGame();
      });
    }
    const btn = document.createElement("button"); btn.textContent = "开启";
    btn.addEventListener("click", () => {
      if (!autoUnlocked(def)) return;
      state.autoOn[def.key] = !state.autoOn[def.key];
      updateAutomationUI();
    });
    for (const el of [lock, input, timeInput, modeBtn, btn]) if (el) right.append(el);
    // A34 奖励：前两个自动化的批量购买切换按钮
    let batchBtn = null;
    if (def.key === "wave" || def.key === "phonon") {
      batchBtn = document.createElement("button"); batchBtn.className = "batch-btn single hidden";
      batchBtn.addEventListener("click", () => {
        state.batchMode[def.key] = !state.batchMode[def.key];
        updateAutomationUI();
      });
      right.append(batchBtn);
    }
    row.append(left, right);
    list.appendChild(row);
    autoRefs[def.key] = { def, row, lockEl: lock, inputEl: input, btn, batchBtn, modeBtn, timeInput };
  }
  // 批量购买上限升级（A34 解锁，Sp 购买）
  const bRow = document.createElement("div");
  bRow.className = "sp-upgrade";
  const bLeft = document.createElement("div");
  const bNm = document.createElement("div"); bNm.className = "spu-name"; bNm.textContent = BATCH_UPG.name;
  const bDs = document.createElement("div"); bDs.className = "spu-desc"; bDs.textContent = BATCH_UPG.desc;
  bLeft.append(bNm, bDs);
  const bRight = document.createElement("div"); bRight.className = "auto-controls";
  const bCost = document.createElement("div"); bCost.className = "spu-cost";
  const bBtn = document.createElement("button"); bBtn.textContent = "购买";
  bBtn.addEventListener("click", buyBatchUpgrade);
  bRight.append(bCost, bBtn);
  bRow.append(bLeft, bRight);
  list.appendChild(bRow);
  batchRefs = { row: bRow, costEl: bCost, btn: bBtn };
  // A42 星标奖励：自动湮灭 CD 缩减升级（A42 解锁，Sp 购买）
  const cdRow = document.createElement("div");
  cdRow.className = "sp-upgrade";
  const cdLeft = document.createElement("div");
  const cdNm = document.createElement("div"); cdNm.className = "spu-name"; cdNm.textContent = ANN_CD_UPG.name;
  const cdDs = document.createElement("div"); cdDs.className = "spu-desc"; cdDs.textContent = ANN_CD_UPG.desc;
  cdLeft.append(cdNm, cdDs);
  const cdRight = document.createElement("div"); cdRight.className = "auto-controls";
  const cdCost = document.createElement("div"); cdCost.className = "spu-cost";
  const cdBtn = document.createElement("button"); cdBtn.textContent = "购买";
  cdBtn.addEventListener("click", buyAnnCDUpgrade);
  cdRight.append(cdCost, cdBtn);
  cdRow.append(cdLeft, cdRight);
  list.appendChild(cdRow);
  annCDRefs = { row: cdRow, costEl: cdCost, btn: cdBtn };
  autoBuilt = true;
}
// 解析 AeB 格式输入（"1e5"、"3.5e-2" 等；失败返回 NaN）
function parseSciInput(str) {
  if (typeof str !== "string") return parseFloat(str);
  const s = str.trim().replace(/[eE]\+/, "e");
  const v = parseFloat(s);
  return v;
}
// 批量上限：初始 2，奇点升级每级翻倍；打破规则且 >128 时无限制（最大购买）
function batchLimit() {
  if (state.rulesBroken && state.batchMax > 128) return Infinity;
  return state.batchMax;
}
function updateAutomationUI() {
  if (state.annihilations < 1) return;
  buildAutomationOnce();
  for (const key in autoRefs) {
    const r = autoRefs[key];
    const unlocked = autoUnlocked(r.def);
    r.lockEl.textContent = unlocked ? "" : r.def.unlockDesc;
    if (r.def.input) {
      const isTimeMode = (r.def.key === "up3" && state.autoUp3Mode === "time") || (r.def.key === "ann" && state.autoAnnMode === "time");
      // 时间模式下隐藏比例/Sp 输入框（只留时间框）
      const modeOwned = r.def.key === "up3" ? auOwned("au21") : auOwned("au22");
      r.inputEl.classList.toggle("hidden", !unlocked || (modeOwned && isTimeMode));
      if (unlocked && !r.inputEl.classList.contains("hidden") && document.activeElement !== r.inputEl) r.inputEl.value = r.def.input.value();
    }
    r.btn.textContent = state.autoOn[key] ? "开启中" : "已关闭";
    r.btn.disabled = !unlocked;
    r.row.classList.toggle("affordable", state.autoOn[key]);
    // AU21/AU22 模式切换按钮
    if (r.modeBtn) {
      const modeUnlocked = r.def.key === "up3" ? auOwned("au21") : auOwned("au22");
      const isTime = r.def.key === "up3" ? state.autoUp3Mode === "time" : state.autoAnnMode === "time";
      r.modeBtn.classList.toggle("hidden", !modeUnlocked || !unlocked);
      if (r.timeInput) r.timeInput.classList.toggle("hidden", !(modeUnlocked && unlocked && isTime));
      if (modeUnlocked) {
        if (r.def.key === "up3") {
          r.modeBtn.textContent = isTime ? "类型：时间" : "类型：比例";
          if (isTime && document.activeElement !== r.timeInput) r.timeInput.value = state.autoUp3Interval;
        } else {
          r.modeBtn.textContent = isTime ? "类型：时间" : "类型：奇点";
          if (isTime && document.activeElement !== r.timeInput) r.timeInput.value = state.autoAnnInterval;
        }
      }
    }
    // 批量购买按钮（A34 奖励解锁）
    if (r.batchBtn) {
      const batchUnlocked = state.ach.normal.includes("A34");
      if (batchUnlocked && unlocked) {
        // 先定外观再控显隐（className 整体替换会清掉 hidden，顺序不能反）
        const limit = batchLimit();
        if (limit === Infinity) {
          r.batchBtn.textContent = "最大购买";
          r.batchBtn.className = "batch-btn max";
        } else if (state.batchMode[key]) {
          r.batchBtn.textContent = "批量购买 ×" + limit;
          r.batchBtn.className = "batch-btn batch";
        } else {
          r.batchBtn.textContent = "单次购买";
          r.batchBtn.className = "batch-btn single";
        }
        r.batchBtn.classList.remove("hidden");
      } else {
        r.batchBtn.classList.add("hidden");
      }
    }
  }
  // 批量购买上限升级卡（A34 解锁）
  if (batchRefs) {
    const unlocked = state.ach.normal.includes("A34");
    batchRefs.row.classList.toggle("hidden", !unlocked);
    if (unlocked) {
      const cost = BATCH_UPG.cost();
      batchRefs.row.classList.toggle("affordable", state.sp >= cost);
      batchRefs.costEl.textContent = fmt(cost) + " Sp（等级 " + state.batchLvl + "）";
      batchRefs.btn.disabled = state.sp < cost;
    }
  }
  // 自动湮灭 CD 缩减升级卡（A42 解锁）
  if (annCDRefs) {
    const unlocked = state.ach.normal.includes("A42");
    annCDRefs.row.classList.toggle("hidden", !unlocked);
    if (unlocked) {
      const cost = ANN_CD_UPG.cost();
      annCDRefs.row.classList.toggle("affordable", state.sp >= cost);
      annCDRefs.costEl.textContent = fmt(cost) + " Sp（等级 " + state.autoAnnCDLvl + "，当前 CD " + autoAnnCD() + "ms）";
      annCDRefs.btn.disabled = state.sp < cost;
    }
  }
}

// 每帧自动购买/自动湮灭逻辑（游戏时间）
// 注意：即使 spu1 已购（购买免费），自动化仍以"资源达到价格"为触发条件，
// 防止免费升级被自动化每 tick 无限购买导致指数爆炸；手动购买不受此限制。
// 批量执行：mode 下每 tick 最多买 batchLimit() 次（单次=1）
function autoBuyTimes(key) {
  if (state.ach.normal.includes("A34") && state.batchMode[key]) return batchLimit();
  return 1;
}
// 自动湮灭统一入口：所有模式判断与时间戳更新集中在此（tick 与 rAF 共用，防双执行）
function autoAnnTick() {
  if (state.annihilations < 1 || !state.autoOn.ann || !state.autoAnn) return;
  if (inDistort("narrow")) return;
  if (state.distortActive) {
    // 扭曲宇宙：达标即秒（不受模式影响）
    if (annihilationReady() && doAnnihilation()) state.lastAutoAnnAt = Date.now();
    return;
  }
  if (auOwned("au22") && state.autoAnnMode === "time") {
    // 时间模式：距上次自动湮灭超过设定真实秒且达标
    if (Date.now() - state.lastAutoAnnAt >= state.autoAnnInterval * 1000 && annihilationReady()) {
      if (doAnnihilation()) state.lastAutoAnnAt = Date.now();
    }
  } else if (Date.now() - state.lastAutoAnnAt >= autoAnnCD() && annihilationReady() && spGainExact() >= state.autoAnnSp) {
    // Sp 模式：CD 防抖（基础 1s，A42 星标 200ms，A44 升级进一步缩减，最低 25ms）
    if (doAnnihilation()) state.lastAutoAnnAt = Date.now();
  }
}
// 自动湮灭 CD（ms）：基础 1000ms；A42 星标奖励 200ms；A44 解锁的升级每级 ÷2，最低 25ms
function autoAnnCD() {
  let cd = 1000;
  if (state.ach.normal.includes("A42")) cd = 200;
  cd = Math.max(25, cd / Math.pow(2, state.autoAnnCDLvl));
  return cd;
}
function runAutomation() {
  if (state.annihilations < 1) return;
  if (inDistort("narrow")) return; // 狭窄宇宙：禁用所有自动化
  if (state.autoOn.wave && state.autoWaveUpg) {
    const n = autoBuyTimes("wave");
    for (let i = 0; i < n; i++) { if (cmpGE(F(), up1Cost(), FLog(), up1CostLog())) buyUp1(); else break; }
    for (let i = 0; i < n; i++) { if (cmpGE(F(), up2Cost(), FLog(), up2CostLog())) buyUp2(); else break; }
  }
  if (state.autoOn.phonon && state.autoPhononUpg && state.phUnlocked) {
    const n = autoBuyTimes("phonon");
    for (let i = 0; i < n; i++) { if (cmpGE(F(), pg1Cost(), FLog(), pg1CostLog())) buyPG1(); else break; }
    for (let i = 0; i < n; i++) { if (cmpGE(state.phonons, pg2Cost(), getLogPhonons(), pg2CostLog())) buyPG2(); else break; }
    for (let i = 0; i < n; i++) { if (state.pg3 < pg3Cap() && cmpGE(state.phonons, pg3Cost(), getLogPhonons(), pg3CostLog())) buyPG3(); else break; }
  }
  if (state.autoOn.up3 && state.autoUp3 && up3Card) {
    if (auOwned("au21") && state.autoUp3Mode === "time") {
      // 时间模式：距上次自动升级3超过设定秒数即触发（仍需 F 超过峰值，log 域比较）
      if (Date.now() - state.lastAutoUp3At >= state.autoUp3Interval * 1000 && FLog() > getLogUp3LastF()) {
        if (buyUp3()) state.lastAutoUp3At = Date.now();
      }
    } else {
      // 比例模式：在当前加成倍率达到设定值时购买升级3（log 域，防 mult 溢出）
      const fLog = FLog();
      const multLog = getLogL10() + up3WavelengthFromFLog(fLog);
      const autoMultLog = state.autoUp3Mult > 0 ? Math.log10(state.autoUp3Mult) : NLOG;
      if (fLog > getLogUp3LastF() && multLog >= autoMultLog) buyUp3();
    }
  }
  autoAnnTick();
}

// ---------- Rendering ----------
// 快变显示：全局资源栏（频率/获取/冷却k/软上限提示）——由显示循环按高频率刷新
// 显示插值：记录逻辑结算时刻的 U 与增速，显示层用真实时间外推，消除 100ms 阶跃感
let dispUAt = 0, dispUBase = 0, dispGRate = 0, dispUBaseLog = NLOG;
function updateDispAnchor() {
  dispUAt = Date.now();
  dispUBase = state.U;
  dispUBaseLog = getLogU10();
  // 定向宇宙：获取每刻随机取反且 U 有 0 硬下限，外推会失真——不做外推
  dispGRate = inDistort("directed") ? 0 : gainRate() * timeRate();
}
// 显示外推 U：double 在范围内走原路径；超范围（dispGRate 或 U 饱和）退 log 域外推
function extrapolatedU() {
  const dt = (Date.now() - dispUAt) / 1000;
  if (dt < 0 || dt > 1) return state.U;
  if (isFinite(dispGRate) && isFinite(dispUBase) && Math.abs(dispUBase) < LOG_FALLBACK && Math.abs(dispGRate) < LOG_FALLBACK) {
    const v = dispUBase + dispGRate * dt;
    // 定向宇宙：显示层同样遵守 0 硬下限
    if (inDistort("directed") && v < 0) return 0;
    return v;
  }
  // log 域外推：U ≈ U + (g·timeRate)·dt。log10(|g·dt|) = gainRateLog + log10(timeRate) + log10(dt)
  const gr = gainRateLog();
  const gdLog = gr.log + Math.log10(Math.max(timeRate(), 1e-300)) + Math.log10(Math.max(dt, 1e-300));
  if (inDistort("directed") && gr.sign < 0) return state.U; // 定向负向不外推（硬下限 0）
  return logAddLogs(dispUBaseLog, gdLog) <= NLOG + 1 ? state.U : Infinity;
}
// 外推 U 的 log10（显示用，保证 F/U 在 >1e308 时仍可得正确 log）
function extrapolatedULog() {
  const dt = (Date.now() - dispUAt) / 1000;
  if (dt < 0 || dt > 1) return getLogU10();
  if (isFinite(dispGRate) && isFinite(dispUBase) && Math.abs(dispUBase) < LOG_FALLBACK && Math.abs(dispGRate) < LOG_FALLBACK) {
    const v = dispUBase + dispGRate * dt;
    if (v <= 0) return inDistort("directed") ? NLOG : clampLog(Math.log10(Math.max(v, 1e-300)));
    return clampLog(Math.log10(v));
  }
  const gr = gainRateLog();
  if (inDistort("directed") && gr.sign < 0) return getLogU10(); // 定向负向不外推
  const gdLog = gr.log + Math.log10(Math.max(timeRate(), 1e-300)) + Math.log10(Math.max(dt, 1e-300));
  return logAddLogs(dispUBaseLog, gdLog);
}
function renderFast() {
  // 膨胀宇宙下 distortLMod 可能超 double：借用 F() 的 log 域逻辑（此处用外推 U）
  let f, fLog;
  const ml3 = distortLModLog();
  if (ml3 > 0) {
    fLog = clampLog(extrapolatedULog() - getLogL10() - ml3);
    f = fLog > 308 ? Infinity : (fLog < -308 ? 0 : Math.pow(10, fLog));
  } else {
    fLog = clampLog(extrapolatedULog() - getLogL10());
    f = (isFinite(extrapolatedU()) && state.L > 0) ? extrapolatedU() / state.L : Math.pow(10, fLog);
  }
  // F 显示：超 double 走 fmtLog（1eN），否则 fmt（现状）
  document.getElementById("freq-value").textContent = fmtNum(f, fLog);
  // Hz/s 显示：膨胀宇宙需除以含倍率的有效波长（log 域防溢出）
  {
    const gLog = clampLog(gainRateLog().log + Math.log10(Math.max(timeRate(), 1e-300)) - getLogL10() - distortLModLog());
    const gainHz = gLog > 308 ? Infinity : (gLog < -308 ? 0 : Math.pow(10, gLog));
    document.getElementById("freq-gain").textContent = (gainRateLog().sign > 0 ? "+" : "") + fmtNum(gainHz, gLog) + " Hz/s";
  }
  // 冷却宇宙：实时显示当前指数 k
  const cdEl = document.getElementById("cooldown-display");
  if (inDistort("cooldown")) {
    cdEl.classList.remove("hidden");
    cdEl.textContent = "当前指数 k = " + cooldownExp().toFixed(2);
  } else {
    cdEl.classList.add("hidden");
  }
  // 当前游戏速率（奇点下方）
  const trEl = document.getElementById("timerate-display");
  if (state.annihilations >= 1) {
    trEl.classList.remove("hidden");
    trEl.textContent = "当前游戏速率：×" + fmt(timeRate());
  } else {
    trEl.classList.add("hidden");
  }
  // 狭窄宇宙：剩余购买次数
  const nwEl = document.getElementById("narrow-display");
  if (inDistort("narrow")) {
    nwEl.classList.remove("hidden");
    nwEl.textContent = "剩余购买次数：" + Math.max(0, 10 - state.narrowPurchases);
  } else {
    nwEl.classList.add("hidden");
  }
  // e100 软上限提示 / 滞涨宇宙提示（同一位置）
  const scNote = document.getElementById("softcap-note");
  if (inDistort("inflation")) {
    scNote.classList.remove("hidden");
    scNote.textContent = "你处于滞涨宇宙，将始终遭受更强的折算";
  } else {
    scNote.classList.toggle("hidden", !softcapped());
    scNote.textContent = "当频率超过 e100 Hz 时，升级的价格和效果将被软上限";
  }
  // U 显示：超 double 走 fmtLog（外推 U 的 log 权威）
  document.getElementById("u-value").textContent = fmtNum(Math.abs(extrapolatedU()), extrapolatedULog());
  // 波长显示：膨胀宇宙下用 log 域（倍率可能超 double）
  const ml2 = distortLModLog();
  document.getElementById("l-value").textContent = ml2 > 0
    ? fmtLog(getLogL10() + ml2)
    : fmt(Math.pow(10, Math.max(getLogL10(), -320)));
}
function renderWave() {
  renderFast();
  updateUpgradesUI();
}

function renderStats() {
  document.getElementById("stat-playtime").textContent = fmtTime(state.playTime);
  document.getElementById("stat-realtime").textContent = fmtTime(state.realTime);
  document.getElementById("stat-total").textContent = fmtNum(state.totalFGained, getLogTotalF()) + " Hz";
  document.getElementById("stat-maxf").textContent = fmtNum(state.maxF, getLogMaxF()) + " Hz";
  document.getElementById("stat-maxu").textContent = fmtNum(state.maxU, getLogMaxU()) + " m/s";
  document.getElementById("stat-minl").textContent = fmtNum(state.minL, getLogMinL()) + " m";
  document.getElementById("stat-ach-n").textContent = `${state.ach.normal.length} / ${NORMAL_ACH.length}`;
  document.getElementById("stat-ach-h").textContent = `${state.ach.hidden.length} / ${HIDDEN_ACH.length}`;
  document.getElementById("stat-timerate").textContent = "×" + fmt(timeRate());
  // 湮灭统计
  const annReal = state.annihilations >= 1 ? (Date.now() - state.annStartReal) / 1000 : 0;
  const annGame = state.annihilations >= 1 ? state.playTime - state.annStartGame : 0;
  document.getElementById("stat-ann-time").textContent =
    state.annihilations >= 1 ? `${fmtTime(annReal, true)} / ${fmtTime(annGame, true)}` : "— / —";
  document.getElementById("stat-ann-total-sp").textContent = fmtNum(state.totalSp, getLogTotalSp());
  document.getElementById("stat-ann-best-sp").textContent = fmtNum(state.annBestSp, state.annBestSp > 0 ? Math.log10(state.annBestSp) : NLOG);
  document.getElementById("stat-ann-best-rate").textContent = fmtNum(state.annBestRate, state.annBestRate > 0 ? Math.log10(state.annBestRate) : NLOG) + " Sp/min";
  document.getElementById("stat-ann-fastest").textContent = state.annFastest > 0 ? fmtTime(state.annFastest) : "—";
  document.getElementById("stat-ann-count").textContent = fmt(effAnnihilations());
  document.getElementById("stat-ann-tp").textContent = fmtNum(temperatureCap(), temperatureCapLog()) + " K";
  document.getElementById("stat-ann-distort").textContent = `${state.distortDone.length} / ${DISTORT_UNIVERSES.length}`;
  // 挑战选项卡：各扭曲宇宙最佳完成时间与总完成时间
  const chList = document.getElementById('challenge-list');
  if (chList) {
    chList.innerHTML = '';
    for (const u of DISTORT_UNIVERSES) {
      const best = state.distortBest[u.id];

      const row = document.createElement('div');
      row.className = 'stat-row' + (state.distortDone.includes(u.id) ? '' : ' muted');
      const label = document.createElement('span'); label.className = 'stat-label';
      label.textContent = u.name + '（' + (best ? '已湮灭' : '未湮灭') + '）';
      const val = document.createElement('span'); val.className = 'stat-value';
      val.textContent = '最佳 ' + (best ? fmtTime(best, true) : '—');
      row.append(label, val);
      chList.appendChild(row);
    }
    // 总和行：所有挑战时间之和
    const sumRow = document.createElement('div');
    sumRow.className = 'stat-row';
    const sumLabel = document.createElement('span'); sumLabel.className = 'stat-label';
    sumLabel.textContent = '所有挑战时间之和';
    const sumVal = document.createElement('span'); sumVal.className = 'stat-value';
    // 所有宇宙都已湮灭才显示总和；否则视为未定（+∞）
    const allDone = DISTORT_UNIVERSES.every(u => state.distortBest[u.id]);
    sumVal.textContent = allDone ? fmtTime(state.distortTotal || 0, true) : "+∞";
    sumRow.append(sumLabel, sumVal);
    chList.appendChild(sumRow);
  }
  // 最近十次湮灭（重置子页）
  const hList = document.getElementById("ann-history-list");
  if (hList) {
    hList.innerHTML = "";
    const rows = state.annHistory.slice(-10).reverse();
    if (rows.length === 0) {
      const empty = document.createElement("div");
      empty.className = "stat-row muted";
      empty.innerHTML = "<span class='stat-label'>暂无湮灭记录</span><span class='stat-value'>—</span>";
      hList.appendChild(empty);
    }
    for (const r of rows) {
      const row = document.createElement("div");
      row.className = "ann-history-row" + (r.distort ? " distort-row" : "");
      const label = document.createElement("span"); label.className = "ah-label";
      label.textContent = `${r.label} · ${fmtTime(r.realDur)}（真实）/ ${fmtTime(r.gameDur)}（游戏）`;
      const val = document.createElement("span"); val.className = "ah-val";
      val.textContent = `${fmt(r.sp)} Sp · ${fmt(r.rate)} Sp/分`;
      row.append(label, val);
      hList.appendChild(row);
    }
  }
}

function renderAll() { applyPhononVisibility(); renderWave(); updatePhononUI(); renderStats(); renderSlots(); updateAchievementsUI(); updateDistortUI(); updateBlackholeUI(); }
function setAutosaveStatus(msg) { document.getElementById("autosave-status").textContent = msg; }

// ---------- 成就弹窗系统（左上角，堆叠+补位动画）----------
function showAchPopup(name, isHidden) {
  const stack = document.getElementById("ach-popup-stack");
  if (!stack) return;
  const popup = document.createElement("div");
  popup.className = "ach-popup " + (isHidden ? "hidden-ach" : "normal");
  popup.textContent = "获得成就：" + name;
  stack.appendChild(popup);
  // 1.5s 后移除（CSS 动画已淡出）；移除后下方弹窗自动上浮（CSS transition）
  setTimeout(() => {
    popup.style.opacity = "0";
    popup.style.transform = "translateY(-10px)";
    setTimeout(() => popup.remove(), 300);
  }, 1500);
}

// ---------- Achievements ----------
const NORMAL_ACH = [
  // 第 1 行 (A11-A15)
  { id: "A11", name: "蓝移", desc: "购买第一个升级", check: () => state.up1 >= 1 },
  { id: "A12", name: "协同", desc: "购买第一个单次升级", check: () => state.meta1 >= 1 },
  { id: "A13", name: "超声", desc: "到达 20000 Hz", check: () => F() >= 20000 },
  { id: "A14", name: "效率", desc: "第一次缩短波长", check: () => state.up3 >= 1 },
  { id: "A15", name: "计算", desc: "到达 1 GHz", check: () => F() >= 1e9 },
  // 第 2 行 (A21-A25) 声子
  { id: "A21", name: "热学", desc: "启动声子发生器", star: true, reward: "up1 的效果变为 1.5 次方", check: () => !!state.phOn },
  { id: "A22", name: "室温", desc: "到达 300 K", check: () => temperature() >= 300 },
  { id: "A23", name: "耦合", desc: "购买声波耦合", check: () => state.phCoupling >= 1 },
  { id: "A24", name: "聚变", desc: "到达 1.5e7 K", check: () => temperature() >= 1.5e7 },
  { id: "A25", name: "湮灭", desc: "到达 1.42e32 K（普朗克温度）", star: true, reward: "各个重置后波速为 100 m/s", check: () => state.annihilations >= 1 },
  // 第 3 行 (A31-A35) 湮灭
  { id: "A31", name: "创生", desc: "购买第一个湮灭升级", check: () => state.spu1 >= 1 },
  { id: "A32", name: "Qol", desc: "获得所有自动化", check: () => state.autoWaveUpg && state.autoPhononUpg && state.autoUp3 && state.autoAnn },
  { id: "A33", name: "扭曲", desc: "解锁扭曲选项卡", check: () => state.annihilations >= 20 },
  { id: "A34", name: "秩序", desc: "湮灭一个被扭曲的宇宙", star: true, reward: "解锁批量购买", check: () => state.distortDone.length >= 1 },
  { id: "A35", name: "刻写", desc: "购买第一个奇点升级", check: () => (state.sau1 + state.sau2 + state.sau3 > 0) || Object.keys(state.au).length > 0 },
  // 第 4 行 (A41-A45) 奇点
  { id: "A41", name: "视界", desc: "解锁黑洞", star: true, reward: "总时间倍率再 ^1.1", check: () => bhUnlocked() },
  { id: "A42", name: "烂柯", desc: "总时间倍率超过 3.65e6", star: true, reward: "自动湮灭 CD 变为 200ms，并解锁一个新的自动化升级", check: () => timeRate() >= 3.65e6 },
  { id: "A43", name: "无限", desc: "打破多元宇宙的规则", check: () => state.rulesBroken && !state.testBreakRules }, // 原 A35
  { id: "A44", name: "永炽", desc: "温度超过 1.79e308 K", check: () => temperature() >= 1.79e308 },
  { id: "A45", name: "???", desc: "（占位）", check: () => false },
];
const ACH_PER_ROW = 5;
// 已定义行数；之后整行为未解锁 ???
const NORMAL_ROWS = Math.ceil(NORMAL_ACH.length / ACH_PER_ROW);

const HIDDEN_ACH = [
  { id: "S1", name: "点击即送", check: () => false },
  { id: "S2", name: "二游", check: () => false },
  { id: "S3", name: "快点端上来罢", check: () => false }, // 价格不足时5秒点10次购买按钮
  { id: "S4", name: "您来的真早！", check: () => {
      // 00:00–00:59 打开游戏（"真早"指清早）；若指中午 12:00–13:00，改 h===12
      const h = new Date().getHours();
      return h === 0;
  }},
  { id: "S5", name: "哼哼哼啊——", check: () => false },
  { id: "S6", name: "选择困难症", check: () => false },
  { id: "S7", name: "请注意使用规范", check: () => false }, // 10秒内反复开关20次声子发生器
  { id: "S8", name: "无用功", check: () => false }, // 加成小于1.1x时购买升级3
  { id: "S9", name: "柚子厨蒸鹅心", check: () => false }, // 导入存档处输入0721并导入
  { id: "S10", name: "歪了", check: () => false }, // 点击S2时每次有0.1%概率获得
  { id: "S11", name: "踌躇不决", check: () => false }, // 达到当前普朗克温度后五分钟不湮灭
  { id: "S12", name: "就你特殊？？！！", check: () => false }, // 点击Qol成就按钮10次
  { id: "S13", name: "额，你知道这玩意怎么用吗", check: () => false }, // 升级3自动化填入小于1的数字
  { id: "S14", name: "哦不我无疑是难过的", check: () => false }, // 扭曲宇宙中失败十次（退出计失败）
  { id: "S15", name: "这是距离增量吗？", check: () => false }, // 达到 1e308 m 波长
  { id: "S16", name: "硬核玩家", check: () => false }, // 已在扭曲宇宙中时点击另一个宇宙的进入
  { id: "S17", name: "禅", check: () => false }, // 在扭曲宇宙中停留超过 1h 未完成
  { id: "S18", name: "getting over it", check: () => false }, // 能完成后重试/退出而非完成
  { id: "S19", name: "滚木", check: () => false }, // 生产为 0 Hz/s 超过 10 分钟
  { id: "S20", name: "version control", check: () => false }, // 查看 changelog
  { id: "S21", name: "这是饼干点点乐吗？", check: () => false }, // 点击黑洞动画界面 100 次
  { id: "S22", name: "白洞", check: () => false }, // 黑洞保持脉冲状态 5 分钟以上
  { id: "S23", name: "裸奇点", check: () => false }, // 黑洞倍率为 1 时保持扭曲状态 10 分钟以上
  { id: "S24", name: "你变秃了，也变强了", check: () => false }, // 一小时内 rua 摆线 200 次
  { id: "S25", name: "这是旮旯给木吗？", check: () => false }, // 好感度达到 1000
];
// S5 目标序列：S1,S1,S4,S5,S1,S4
const S5_SEQUENCE = ["S1", "S1", "S4", "S5", "S1", "S4"];

function checkAchievements() {
  for (const a of NORMAL_ACH) {
    if (!state.ach.normal.includes(a.id) && a.check()) {
      state.ach.normal.push(a.id);
      showAchPopup(a.name, false);
    }
  }
  for (const a of HIDDEN_ACH) {
    if (!state.ach.hidden.includes(a.id) && a.check()) {
      state.ach.hidden.push(a.id);
      showAchPopup(a.name, true);
    }
  }
}

function isRowUnlocked(r) {
  if (r === 0) return true;
  // 第 r 行解锁条件：第 r-1 行全部完成
  const prev = NORMAL_ACH.slice((r - 1) * ACH_PER_ROW, r * ACH_PER_ROW);
  return prev.length === ACH_PER_ROW && prev.every(a => state.ach.normal.includes(a.id));
}

// ---------- 隐藏成就点击处理 ----------
function grantHidden(id) {
  if (!state.ach.hidden.includes(id)) {
    const a = HIDDEN_ACH.find(x => x.id === id);
    state.ach.hidden.push(id);
    if (a) showAchPopup(a.name, true);
  }
}

function onHiddenClick(id) {
  const done = state.ach.hidden.includes(id);
  const revealed = state.ach.hiddenRevealed.includes(id);
  // S1：点击即送 —— 点击 S1 直接完成
  if (id === "S1" && !done) { grantHidden("S1"); }

  // S2：二游 —— 每次点击 S2 有 0.6% 概率获得
  // S10：歪了 —— 点击 S2 时每次点击有 0.3% 概率获得（独立判定，不受 S2 已完成影响）
  if (id === "S2") {
    if (!done && Math.random() < 0.006) grantHidden("S2");
    if (!state.ach.hidden.includes("S10") && Math.random() < 0.003) grantHidden("S10");
  }

  // S12：就你特殊？？！！ —— 点击 Qol（A32）成就单元格 10 次
  // （在 buildAchievementsOnce 中给 A32 单元格绑定了点击计数）

  // S5：哼哼哼啊—— 按序列 S1,S1,S4,S5,S1,S4 点击
  // （即便目标单元格已完成或未揭示，点击均计入序列）
  if (!state.ach.hidden.includes("S5")) {
    state.hiddenClicks.push(id);
    if (state.hiddenClicks.length > S5_SEQUENCE.length) state.hiddenClicks.shift();
    if (state.hiddenClicks.length === S5_SEQUENCE.length &&
        state.hiddenClicks.every((v, i) => v === S5_SEQUENCE[i])) {
      grantHidden("S5");
      state.hiddenClicks = [];
    }
  }

  // 未揭示的常规揭示逻辑（点击后显示名称）
  if (!done && !revealed) {
    state.ach.hiddenRevealed.push(id);
  }

  // S4 不靠点击，但点击任何隐藏成就时顺便检查一次系统时间
  if (!state.ach.hidden.includes("S4") && HIDDEN_ACH.find(x => x.id === "S4").check()) {
    grantHidden("S4");
  }

  updateAchievementsUI();
}

// ---------- Achievements (build-once, in-place update) ----------
let achBuilt = false;
let normalCellRefs = [];
let hiddenCellRefs = [];

function buildAchievementsOnce() {
  if (achBuilt) return;
  const grid = document.getElementById("normal-ach-grid");
  grid.innerHTML = "";
  normalCellRefs = [];
  // 已定义行 + 1 行锁定行（展示 ??? 结构）。
  // 每个逻辑行包进独立的 .ach-row 行容器：手机窄屏时一行 5 个拆成 3+2 居中，
  // 不同逻辑行的成就永远不会混到同一视觉行。
  for (let r = 0; r < NORMAL_ROWS + 1; r++) {
    const rowEl = document.createElement("div");
    rowEl.className = "ach-row";
    grid.appendChild(rowEl);
    for (let c = 0; c < ACH_PER_ROW; c++) {
      const idx = r * ACH_PER_ROW + c;
      const a = NORMAL_ACH[idx];
      const cell = document.createElement("div");
      cell.className = "ach-cell";
      const idEl = document.createElement("div"); idEl.className = "ach-id";
      const nameEl = document.createElement("div"); nameEl.className = "ach-name";
      const descEl = document.createElement("div"); descEl.className = "ach-desc";
      const checkEl = document.createElement("div"); checkEl.className = "ach-check";
      const lockEl = document.createElement("div"); lockEl.className = "ach-locked";
      const starEl = document.createElement("div"); starEl.className = "ach-star"; starEl.textContent = "★";
      // 特殊奖励 tooltip（小黑框，点击切换显示）
      const tipEl = document.createElement("div"); tipEl.className = "ach-reward-tip";
      cell.append(idEl, nameEl, descEl, checkEl, lockEl, starEl, tipEl);
      if (a && a.reward) {
        cell.classList.add("has-reward");
        // 「//」原意是换行：第一行成就编号，第二行奖励描述
        tipEl.textContent = a.id + "\n" + a.reward;
        // 仅在已完成时才可点击查看奖励；未完成时 disabled
        cell.addEventListener("click", () => {
          if (!state.ach.normal.includes(a.id)) return;
          cell.classList.toggle("show-tip");
        });
      }
      // S12：就你特殊？？！！ —— 点击 Qol（A32）成就单元格 10 次
      if (a && a.id === "A32") {
        let qolClicks = 0;
        cell.addEventListener("click", () => {
          qolClicks++;
          if (qolClicks >= 10 && !state.ach.hidden.includes("S12")) {
            grantHidden("S12");
            updateAchievementsUI();
          }
        });
      }
      rowEl.appendChild(cell);
      normalCellRefs.push({ root: cell, a, row: r, idEl, nameEl, descEl, checkEl, lockEl, starEl, tipEl });
    }
  }
  const hgrid = document.getElementById("hidden-ach-grid");
  hgrid.innerHTML = "";
  hiddenCellRefs = [];
  for (const a of HIDDEN_ACH) {
    const cell = document.createElement("div");
    cell.className = "ach-cell hidden-ach";
    const idEl = document.createElement("div"); idEl.className = "ach-id"; idEl.textContent = a.id;
    const nameEl = document.createElement("div"); nameEl.className = "ach-name";
    const descEl = document.createElement("div"); descEl.className = "ach-desc";
    const lockEl = document.createElement("div"); lockEl.className = "ach-locked";
    const starEl = document.createElement("div"); starEl.className = "ach-star"; starEl.textContent = "★";
    cell.append(idEl, nameEl, descEl, lockEl, starEl);
    // 点击处理器在构建时绑定一次，之后稳定不变
    cell.addEventListener("click", () => onHiddenClick(a.id));
    hgrid.appendChild(cell);
    hiddenCellRefs.push({ root: cell, a, idEl, nameEl, descEl, lockEl, starEl });
  }
  achBuilt = true;
}

function updateAchievementsUI() {
  buildAchievementsOnce();
  // 成就页只显示成就本身的乘数（1.1 或 1.2/个），不含时间之矢/成就刻印以外的升级、黑洞与 A41 加成
  document.getElementById("ach-time-rate").textContent = `你的成就将时间速率变为原来的${fmt(Math.pow(achTimeBase(), state.ach.normal.length))}倍`;
  // 普通成就
  for (const ref of normalCellRefs) {
    const { a, row, root, idEl, nameEl, descEl, checkEl, lockEl, starEl } = ref;
    const unlocked = isRowUnlocked(row);
    if (!a || !unlocked) {
      root.classList.remove("completed");
      idEl.style.display = "none";
      nameEl.style.display = "none";
      descEl.style.display = "none";
      checkEl.style.display = "none";
      starEl.style.display = "none";
      lockEl.style.display = "";
      lockEl.textContent = "???";
      continue;
    }
    const done = state.ach.normal.includes(a.id);
    root.classList.toggle("completed", done);
    lockEl.style.display = "none";
    starEl.style.display = (a.star && done) ? "" : "none";
    idEl.style.display = ""; idEl.textContent = a.id;
    nameEl.style.display = ""; nameEl.textContent = done ? a.name : "???";
    descEl.style.display = ""; descEl.textContent = a.desc;
    checkEl.style.display = ""; checkEl.textContent = done ? "✓ 已完成" : "未完成";
  }
  // 隐藏成就
  for (const ref of hiddenCellRefs) {
    const { a, root, idEl, nameEl, descEl, lockEl, starEl } = ref;
    const done = state.ach.hidden.includes(a.id);
    const revealed = state.ach.hiddenRevealed.includes(a.id);
    root.classList.toggle("completed", done);
    idEl.style.display = "";
    starEl.style.display = "none"; // 隐藏成就无特殊奖励，星星不显示
    if (done) {
      nameEl.style.display = ""; nameEl.textContent = a.name;
      descEl.style.display = ""; descEl.textContent = "✓ 已完成";
      lockEl.style.display = "none";
    } else if (revealed) {
      nameEl.style.display = ""; nameEl.textContent = a.name;
      descEl.style.display = ""; descEl.textContent = "未达成";
      lockEl.style.display = "none";
    } else {
      nameEl.style.display = "none";
      descEl.style.display = "none";
      lockEl.style.display = ""; lockEl.textContent = "？？？";
    }
  }
}

// ---------- Game loop ----------
function tick() {
  const now = Date.now();
  const realDt = (now - state.lastTick) / 1000;
  const dt = realDt * timeRate();
  state.lastTick = now;

  state.playTime += dt;
  state.realTime += realDt;

  // 波速生产（double 链不溢出时走原路径，零回归；饱和时退 log 域累积）
  const g = gainRate();
  const gFinite = isFinite(g) && Math.abs(g) < LOG_FALLBACK;
  const uFinite = Math.abs(state.U) < LOG_FALLBACK;
  if (g !== 0) {
    const gd = g * dt;
    if (gFinite && uFinite && isFinite(gd) && Math.abs(gd) < LOG_FALLBACK) {
      // double 路径（现状）
      setU(state.U + gd);
    } else {
      // log 域累积：U_new = U_old + g·dt（U≥0；定向 0 下限）
      const { log: gLog, sign } = gainRateLog();
      const gdLog = gLog + Math.log10(Math.max(dt, 1e-300)); // log10(|g·dt|)
      let newLogU = logAddLogs(getLogU10(), gdLog);
      if (inDistort("directed") && sign < 0) {
        // 定向：U 可能被减到 0。log 域相减：max(0, U - |gd|)
        const sub = logAddSigned(getLogU10(), 1, gdLog, -1);
        newLogU = sub.sign > 0 ? sub.log : NLOG;
      }
      setULog(newLogU); // double 缓存自动处理超 1e308（存 Infinity，log 权威）
    }
    // 定向宇宙：波速硬下限 0
    if (inDistort("directed") && state.U < 0) setU(0);

    // 累计频率 F 增量 = (g/L)·dt；扭曲宇宙中的产生不计入通用统计
    if (!state.distortActive) {
      const gOverLLog = (gFinite ? Math.log10(Math.max(Math.abs(g), 1e-300)) : gainRateLog().log) + Math.log10(Math.max(dt, 1e-300)) - getLogL10();
      if (gFinite && uFinite && isFinite(state.totalFGained) && state.totalFGained < LOG_FALLBACK && Math.abs(state.totalFGained + gd / Math.max(state.L, 1e-300)) < LOG_FALLBACK) {
        state.totalFGained += (g / state.L) * dt;
        state.logTotalF = state.totalFGained > 0 ? Math.log10(state.totalFGained) : NLOG;
      } else {
        // log 域：logTotalF 与 gOverLLog·sign 累积（带符号）
        const sgn = g < 0 ? -1 : 1;
        const r = logAddSigned(getLogTotalF(), 1, gOverLLog, sgn);
        if (r.sign < 0) {
          setTotalFGainedLog(NLOG);
        } else {
          setTotalFGainedLog(r.log);
        }
      }
    }
  }

  // 声子生产（游戏时间；浮点累计，显示取整）。phononRate 过大时走 log 域。
  if (inDistort("simple")) {
    setPhonons(1); // 简洁宇宙：声子数始终为 1
  } else if (state.phOn) {
    const pr = phononRate();
    const prFinite = isFinite(pr) && pr < LOG_FALLBACK;
    if (prFinite && state.phonons < LOG_FALLBACK) {
      setPhonons(state.phonons + pr * dt);
    } else {
      // log 域：logPhonons + log10(pr·dt)（pr·dt 可能为 0 当 pr=0）
      const prLog = phononRateLog() + Math.log10(Math.max(dt, 1e-300));
      if (prLog <= NLOG + 1) {
        // pr·dt ≈ 0，保持原值（double 微调）
        setPhonons(state.phonons + (prFinite ? pr * dt : 0));
      } else {
        const curLog = getLogPhonons() === -Infinity ? NLOG : getLogPhonons();
        const newLog = logAddLogs(curLog, prLog);
        setPhononsLog(newLog); // double 缓存自动处理超 1e308
      }
    }
  }

  // 黑洞 tick：吸积/脉冲用真实时间（不受时间倍率影响），扭曲状态只给加成（无 tick 效果）
  tickBlackhole(realDt);

  // 自动化解锁门槛（首次湮灭后生效）
  if (state.annihilations >= 1) {
    if (!state.autoWaveUpg && F() >= 1e10) { state.autoWaveUpg = 1; setAutosaveStatus("自动化解锁：主要页升级"); }
    if (!state.autoPhononUpg && F() >= 1e20) { state.autoPhononUpg = 1; setAutosaveStatus("自动化解锁：声子页升级"); }
    // 里程碑 8/10 的自动化授权（老存档补发；新档在 doAnnihilation 内授予）
    if (!state.autoUp3 && hasMilestone(8)) state.autoUp3 = 1;
    if (!state.autoAnn && hasMilestone(10)) state.autoAnn = 1;
  }

  // 更新统计极值（log 域 max/min，防 maxU 恒 Infinity、minL 下溢 0 丢精度）
  const f = F();
  const fLog = FLog();
  if (fLog > getLogMaxF()) { state.maxF = f; state.logMaxF = fLog; }
  if (getLogU10() > getLogMaxU()) { state.maxU = state.U; state.logMaxU = getLogU10(); }
  if (getLogL10() < getLogMinL()) { state.minL = state.L; state.logMinL = getLogL10(); }

  checkAchievements();
  // S4：在 00:00–00:59 打开游戏（每隔几秒检查一次即可，用 tick 节流）
  if (!state.ach.hidden.includes("S4") && HIDDEN_ACH.find(x => x.id === "S4").check()) {
    grantHidden("S4");
  }
  // S6：随时间推进检测（切换时也会检测）
  checkS6();
  // S17：禅 —— 在扭曲宇宙中停留超过 1h 未完成
  if (!state.ach.hidden.includes("S17") && state.distortActive && state.annStartReal) {
    if ((Date.now() - state.annStartReal) / 1000 >= 3600) grantHidden("S17");
  }
  // S19：滚木 —— 生产为 0 Hz/s 超过 10 分钟（连续）
  {
    const gain = gainRate() * timeRate() / Math.max(state.L, 1e-300) * (state.L > 0 ? 1 : 0);
    const zero = Math.abs(gain) < 1e-30;
    if (zero) {
      if (!state.zeroGainSince) state.zeroGainSince = Date.now();
      else if (!state.ach.hidden.includes("S19") && Date.now() - state.zeroGainSince >= 600000) grantHidden("S19");
    } else {
      state.zeroGainSince = 0;
    }
  }
  // S15：这是距离增量吗？—— 有效波长达到 1e308 m（log 域判断）
  if (!state.ach.hidden.includes("S15")) {
    const effLogL = getLogL10() + distortLModLog();
    if (effLogL >= 308) grantHidden("S15");
  }
  // S11：踌躇不决 —— 达到当前宇宙的温度上限后 5 分钟（真实时间）不湮灭
  if (!state.ach.hidden.includes("S11") && state.annihilations >= 1) {
    if (temperature() >= temperatureCap() * 0.999999) {
      if (!state.capReachedAt) state.capReachedAt = Date.now();
      else if (Date.now() - state.capReachedAt >= 300000) grantHidden("S11");
    } else {
      state.capReachedAt = 0;
    }
  }
  // S22：白洞 —— 黑洞保持脉冲状态 5 分钟以上（真实时间，切走即重置）
  if (bhUnlocked() && state.bhState === "pulse") {
    if (!state.bhPulseSince) state.bhPulseSince = Date.now();
    else if (!state.ach.hidden.includes("S22") && Date.now() - state.bhPulseSince >= 300000) grantHidden("S22");
  } else {
    state.bhPulseSince = 0;
  }
  // S23：裸奇点 —— 黑洞倍率为 1（M=1，M^0.2=1）时保持扭曲状态 10 分钟以上
  if (bhUnlocked() && state.bhState === "distorl" && bhEffect() <= 1) {
    if (!state.bhDistorlSince) state.bhDistorlSince = Date.now();
    else if (!state.ach.hidden.includes("S23") && Date.now() - state.bhDistorlSince >= 600000) grantHidden("S23");
  } else {
    state.bhDistorlSince = 0;
  }
  dirty = true;

  updateDispAnchor();
  renderWave();
  if (state.phUnlocked) updatePhononUI();
  applyAnnihilationVisibility();
  runAutomation();
  if (state.annihilations >= 1) {
    updateSpUI();
    updateAutomationUI();
    if (state.annihilations >= 20) updateDistortUI();
    if (bhUnlocked()) updateBlackholeUI();
  }
  if (!document.getElementById("page-stats").classList.contains("hidden")) renderStats();
  if (!document.getElementById("page-achievements").classList.contains("hidden")) updateAchievementsUI();
}

// ---------- Wire up UI ----------
function setupUI() {
  document.querySelectorAll(".tab").forEach(t => {
    t.addEventListener("click", () => switchTab(t.dataset.tab));
  });
  document.querySelectorAll(".subtab").forEach(t => {
    t.addEventListener("click", () => switchSubtab(t.dataset.subtab));
  });

  document.getElementById("theme-white").addEventListener("click", () => { applyTheme("white"); saveGame(); });
  document.getElementById("theme-black").addEventListener("click", () => { applyTheme("black"); saveGame(); });

  document.querySelectorAll("#notation-row button").forEach(b => {
    b.addEventListener("click", () => {
      const prev = state.settings.notation;
      applyNotation(b.dataset.notation);
      if (state.settings.notation !== prev) {
        state.notationSwitches.push(Date.now());
        checkS6();
      }
      saveGame(); renderAll();
    });
  });

  const decInp = document.getElementById("decimals-input");
  decInp.addEventListener("change", () => {
    applyDecimals(decInp.value);
    saveGame();
    renderAll();
  });

  // 界面刷新频率
  document.querySelectorAll("#uifps-row button").forEach(b => {
    b.addEventListener("click", () => {
      applyUiFps(b.dataset.uifps);
      saveGame();
      setAutosaveStatus("界面刷新频率已调整");
    });
  });

  document.getElementById("save-export").addEventListener("click", () => {
    state.lastTick = Date.now();
    document.getElementById("save-io").value = encodeSave(state);
    setAutosaveStatus("已导出存档");
  });
  document.getElementById("save-load-from-io").addEventListener("click", () => {
    const str = document.getElementById("save-io").value;
    if (!str.trim()) { setAutosaveStatus("文本框为空"); return; }
    try {
      // S9 柚子厨蒸鹅心：在导入存档处输入 0721 并导入
      if (str.trim() === "0721") {
        const newlyGranted = !state.ach.hidden.includes("S9");
        grantHidden("S9");
        updateAchievementsUI();
        if (newlyGranted) setAutosaveStatus("隐藏成就达成：柚子厨蒸鹅心");
        else setAutosaveStatus("导入失败：存档无效");
        return;
      }
      const obj = decodeSave(str);
      state = Object.assign(defaultState(), obj);
      state.settings = Object.assign({ theme: "black", notation: "scientific", decimals: 3 }, obj.settings || {});
      state.ach = Object.assign({ normal: [], hidden: [], hiddenRevealed: [] }, obj.ach || {});
      migrateState();
      if (obj.frequency !== undefined && obj.U === undefined) { setU(obj.frequency); state.L = 1; state.logL10 = 0; }
      if (obj.totalFrequency !== undefined && state.totalFGained === undefined) setTotalFGained(obj.totalFrequency);
      state.lastTick = Date.now();
      applyTheme(state.settings.theme);
      applyNotation(state.settings.notation);
      applyDecimals(state.settings.decimals);
      saveGame();
      renderAll();
      setAutosaveStatus("已导入存档");
    } catch { setAutosaveStatus("导入失败：存档无效"); }
  });
  document.getElementById("save-import").addEventListener("click", () => {
    const io = document.getElementById("save-io"); io.focus(); io.select();
    setAutosaveStatus("请将存档粘贴到文本框后点“从文本框导入”");
  });
  document.getElementById("save-copy").addEventListener("click", async () => {
    const io = document.getElementById("save-io");
    if (!io.value) { setAutosaveStatus("文本框为空，先导出"); return; }
    try { await navigator.clipboard.writeText(io.value); setAutosaveStatus("已复制到剪贴板"); }
    catch { io.select(); document.execCommand("copy"); setAutosaveStatus("已复制（备用方式）"); }
  });

  document.getElementById("hard-reset").addEventListener("click", hardReset);

  // 测试按钮：临时打破宇宙规则（取消温度上限，期间不获 Sp；v0.4.3 移除）
  const testBtn = document.getElementById("test-break-rules");
  const refreshTestBtn = () => {
    testBtn.textContent = state.testBreakRules
      ? "测试：恢复宇宙规则（温度上限回归，可正常获得奇点）"
      : "测试：打破宇宙规则（取消温度上限，期间无法获得奇点）";
  };
  testBtn.addEventListener("click", () => {
    state.testBreakRules = !state.testBreakRules;
    refreshTestBtn();
    saveGame();
    renderAll();
    setAutosaveStatus(state.testBreakRules ? "测试模式：宇宙规则已打破（不获 Sp）" : "测试模式：规则已恢复");
  });
  refreshTestBtn();

  // 测试：弹出成就弹窗
  document.getElementById("test-popup").addEventListener("click", () => {
    showAchPopup("测试弹窗", false);
  });

  // rua摆线：rua 按钮下方显示文字；好感度每天最多 100；独立倍率按钮（CD 1h，效果 10min）
  const ruaBtn = document.getElementById("rua-btn");
  const ruaStatus = document.getElementById("rua-status");
  const ruaBoostBtn = document.getElementById("rua-boost-btn");
  const ruaBoostInfo = document.getElementById("rua-boost-info");
  const refreshRuaUI = () => {
    const now = Date.now();
    // 每天重置好感度获取窗口（86400000ms = 24h）
    if (!state.ruaDayStart || now - state.ruaDayStart >= 86400000) {
      state.ruaDayStart = now;
      state.ruaCountToday = 0;
      state.ruaClicksToday = 0;
    }
    // rua 按钮下方文字
    if (state.ruaCountToday >= 100) {
      ruaStatus.textContent = `好感度 ${fmt(state.ruaFav)}（今天已上限，明天再来）`;
    } else {
      ruaStatus.textContent = `好感度 ${fmt(state.ruaFav)}（今天已 rua ${state.ruaCountToday}/100）`;
    }
    // 倍率按钮：显示倍率和剩余时间（持续时间或 CD）
    const inCD = state.ruaBoostCD && now < state.ruaBoostCD;
    const inBoost = state.ruaBoostUntil && now < state.ruaBoostUntil;
    if (inBoost) {
      const remain = Math.ceil((state.ruaBoostUntil - now) / 1000);
      ruaBoostBtn.textContent = `×${fmt(state.ruaBoostMult)} 剩余 ${remain}s`;
      ruaBoostBtn.disabled = true;
    } else if (inCD) {
      const remain = Math.ceil((state.ruaBoostCD - now) / 1000);
      ruaBoostBtn.textContent = `CD ${remain}s`;
      ruaBoostBtn.disabled = true;
    } else {
      ruaBoostBtn.textContent = "获取倍率";
      ruaBoostBtn.disabled = false;
    }
    ruaBoostInfo.textContent = inBoost ? `当前倍率 ×${fmt(state.ruaBoostMult)}（剩余 ${Math.ceil((state.ruaBoostUntil - now) / 1000)}s）` : "点击获取随机倍率加成（持续 10 分钟，CD 1 小时）";
  };
  ruaBtn.addEventListener("click", () => {
    const now = Date.now();
    if (!state.ruaDayStart || now - state.ruaDayStart >= 86400000) {
      state.ruaDayStart = now;
      state.ruaCountToday = 0;
      state.ruaClicksToday = 0;
    }
    state.ruaClicksToday++;
    // S24：一天内 rua 200 次（点击次数不受好感度上限限制）
    if (state.ruaClicksToday >= 200 && !state.ach.hidden.includes("S24")) { grantHidden("S24"); updateAchievementsUI(); }
    if (state.ruaCountToday >= 100) {
      ruaStatus.textContent = `要被 rua 秃了 qwq（好感度 ${fmt(state.ruaFav)}）`;
      return;
    }
    state.ruaCountToday++;
    state.ruaFav++;
    // S25：好感度达到 1000
    if (state.ruaFav >= 1000 && !state.ach.hidden.includes("S25")) { grantHidden("S25"); updateAchievementsUI(); }
    // rua 按钮下方文字
    ruaStatus.textContent = `你 rua 了 rua 摆线，好感度 +1（今天 ${state.ruaCountToday}/100）`;
    refreshRuaUI();
    saveGame();
  });
  ruaBoostBtn.addEventListener("click", () => {
    const now = Date.now();
    if (state.ruaBoostCD && now < state.ruaBoostCD) return;
    if (state.ruaBoostUntil && now < state.ruaBoostUntil) return;
    // 随机倍率：random(min(1+Fav/1000, 2), 2)
    const lo = Math.min(1 + state.ruaFav / 1000, 2);
    state.ruaBoostMult = lo + Math.random() * (2 - lo);
    state.ruaBoostUntil = now + 600000; // 效果 10 分钟
    state.ruaBoostCD = now + 3600000;   // CD 1 小时
    refreshRuaUI();
    saveGame();
  });
  // 实时刷新 rua UI（每秒）
  setInterval(refreshRuaUI, 1000);
  refreshRuaUI();

  // 湮灭按钮（首次湮灭后显示；点击直接湮灭）
  document.getElementById("annihilate-btn").addEventListener("click", () => {
    if (state.annihilations === 0) return;
    // 扭曲宇宙中：达标 → 湮灭该宇宙；未达标 → 退出
    if (state.distortActive) {
      if (annihilationReady()) doAnnihilation();
      else exitDistort();
      switchTab("wave");
      switchSubtab("main");
      return;
    }
    doAnnihilation();
    switchTab("wave");
    switchSubtab("main");
  });
  // S20：version control —— 查看 changelog
  const clLink = document.querySelector(".changelog-link");
  if (clLink) clLink.addEventListener("click", () => {
    if (!state.ach.hidden.includes("S20")) { grantHidden("S20"); updateAchievementsUI(); saveGame(); }
  });
  // 扭曲页重试/退出
  document.getElementById("distort-retry-btn").addEventListener("click", retryDistort);
  document.getElementById("distort-exit-btn").addEventListener("click", exitDistortBtn);
  // 首次湮灭遮罩按钮
  document.getElementById("ann-overlay-btn").addEventListener("click", confirmFirstAnnihilation);
}

// ---------- Boot ----------
function init() {
  const loaded = loadGame();
  if (!loaded) state = defaultState();
  // 重置瞬时成就状态（避免离线时间干扰 S3/S5/S6 的计时）
  state.hiddenClicks = [];
  state.metaClicks = [];
  state.notationSwitches = [Date.now()];
  state.phToggles = [];
  applyTheme(state.settings.theme);
  applyNotation(state.settings.notation);
  applyDecimals(state.settings.decimals);
  applyUiFps(state.settings.uiFps);
  setupUI();
  applyPhononVisibility();
  applyAnnihilationVisibility();
  if (state.annihilations >= 1 && !state.annStartReal) {
    state.annStartReal = Date.now();
    state.annStartGame = state.playTime;
  }
  switchTab("wave");
  switchSubtab("main");
  renderAll();

  state.lastTick = Date.now();
  setInterval(tick, 100); // 逻辑 tick 恒定 100ms（数值节奏不变）
  // 显示循环：按所选频率刷新快变数字（全局资源栏 + 声子资源行）
  const uiLoop = (t) => {
    if (t - uiLastFrame >= uiFrameInterval) {
      uiLastFrame = t;
      renderFast();
      if (state.phUnlocked && !document.getElementById("sub-phonon").classList.contains("hidden")) {
        renderPhononFast();
      }
      // 自动湮灭高频检查：走统一入口（含时间模式节流与时间戳更新，防双执行）
      autoAnnTick();
    }
    requestAnimationFrame(uiLoop);
  };
  requestAnimationFrame(uiLoop);
  // 黑洞旋转动画循环（仅解锁后绘制，未解锁时低频空转）
  requestAnimationFrame(bhAnimLoop);
  setInterval(() => { if (dirty) { saveGame(); dirty = false; } }, AUTOSAVE_INTERVAL);
  window.addEventListener("beforeunload", () => saveGame());

  setAutosaveStatus(loaded ? "存档已载入" : "新游戏开始");
}

init();
