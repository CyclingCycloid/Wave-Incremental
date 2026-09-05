/* ===== Wave Incremental v0.5.1 — game logic ===== */

// ---------- Save schema ----------
function defaultState() {
  return {
    version: "0.5.1",
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
    annBestSp: 0,          // 最好单次奇点获取（double 缓存，≤1.79e308 量级）
    annBestSpLog: NLOG,    // 最好单次奇点获取的 log10 权威（封顶后仍可超 double）
    annBestRate: 0,        // 最好单次奇点/分（double 缓存，≤1.79e308 量级）
    annBestRateLog: NLOG,  // 最好单次奇点/分的 log10 权威（封顶后仍可超 double）
    annFastest: 0,         // 最快湮灭时间（真实秒，0=无记录）
    annHistory: [],        // 最近十次湮灭记录
    annGameElapsed: 0,     // 本次湮灭的游戏时长（double 缓存，超 double 时封顶 MAX_VALUE）
    annGameElapsedLog: NLOG, // 本次湮灭游戏时长的 log10 权威（时间倍率超 double 时持续累积）
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
    autoAnnCDLvl: 0,       // A42 奖励解锁：自动湮灭 CD 缩减升级等级（每级 ÷2，最低 25ms）
    sau1: 0, sau2: 0, sau3: 0, sau4: 0,
    vpuCondMet: [],        // VPU 解锁条件已达成记录（达成一次永久解锁；A45 后生效）
    voidActive: false,     // 虚空挑战进行中
    voidRules: [],         // 虚空中生效的扭曲宇宙削弱（id 数组，D1-D8）
    voidVF: 0,             // 虚空泡沫（double 缓存；极端值看 logVoidVF10）
    logVoidVF10: NLOG,     // log10(虚空泡沫) 权威表示（选满削弱时 VF 可超 double）
    voidBestRules: 0,      // 虚空里程碑：已完成的虚空最大同时生效削弱数（0=未完成过）
    svu1SpLog: NLOG,       // SVU1 虚空共振：累计投入的 Sp（log10；投入持久）
    svu1VpLog: NLOG,       // SVU1：累计投入的 VP（log10）
    svu1VfLog: NLOG,       // SVU1：累计投入的 VF（log10）
    svu1Filling: false,    // SVU1：填充开关（开启时每真实秒投入现有资源 1%）
    svu2Level: 0,          // SVU2 能标偏移等级（虚空外增长，不清零不重置）
    au: {},                                 // 奇点单次升级已购标记（id→1）
    testBreakRules: false, // 测试按钮：临时打破规则（不获 Sp，v0.4.3 移除）
    testMode: false,       // 测试模式：开发者预览开关（隔离未发布的开发内容，如未来的新重置层）

    // 黑洞系统（v0.4.3 实装，5DA 解锁）
    bhMass: 1,             // 黑洞质量（太阳质量，double 缓存）
    logBhMass: 0,          // log10(M) 权威
    bhState: "accrete",    // 黑洞状态：accrete/distorl/pulse（吸积/扭曲/脉冲）
    virtualParticles: 0,   // 虚粒子数（double 缓存）
    logVP: NLOG,           // log10(虚粒子) 权威
    sbu1: 0, sbu2: 0, sbu3: 0, // 黑洞升级：事件视界/引力潮汐/霍金辐射
    svpu1: 0, svpu2: 0, svpu3: 0, svpu4: 0, svpu5: 0, // 黑洞虚粒子升级：全息原理/虚幻湮灭/非欧几何/热能超载/潮汐撕裂
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
    settings: { theme: "black", notation: "scientific", decimals: 3, uiFps: 33, hideLockedRows: true, hideDoneRows: false, offlineEnabled: true },
    lastTick: Date.now(),
  };
}

const SAVE_KEY = "waveIncremental_save";
const SLOT_KEY_PREFIX = "waveIncremental_slot";
const SLOT_COUNT = 6;
const SLOT_NAME_PREFIX = "waveIncremental_slotName"; // 存档槽自定义名（localStorage 独立 key）
function slotNameKey(i) { return SLOT_NAME_PREFIX + i; }
function getSlotName(i) {
  const n = localStorage.getItem(slotNameKey(i));
  return (n && n.trim()) ? n.trim() : `存档槽 ${i + 1}`;
}
function setSlotName(i, name) {
  const t = (name || "").trim().slice(0, 20); // 上限 20 字符防溢出布局
  if (t) localStorage.setItem(slotNameKey(i), t);
  else localStorage.removeItem(slotNameKey(i));
}
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
// 虚拟时钟：离线模拟期间 simTimeOffset>0，生产链中依赖墙钟的公式（膨胀波长、
// 冷却指数、rua 倍率、自动化节流等）经 gameNow() 读到连续推进的虚拟时间。
// 在线时恒为 0，gameNow() === Date.now()，行为逐位不变
let simTimeOffset = 0;
function gameNow() { return Date.now() + simTimeOffset; }
// 离线模拟进行中标志：UI 函数（渲染/弹窗/保存）见此标志早退，防止模拟步进触发 DOM 操作
let simActive = false;
// 待结算的离线时长（秒）：加载存档时记录，init 尾部 DOM 就绪后统一模拟并弹窗
let pendingOffline = null;

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
    desc: "波速获取受到指数削弱（最高 0.75 次方），购买任何升级后指数在 15 秒内从 0 线性回复到 0.75；进入时即视为已完全回复",
    tp: 1e90,
  },
  {
    id: "inflation", name: "滞涨",
    desc: "前奇点资源不消耗被禁用，价格折算即刻生效且变得更强，声子升级价格平方，波速获取和温度开平方根",
    tp: 1e110,
  },
  {
    id: "adiabatic", name: "热寂",
    desc: "热涨落与声子涨落无效，声波耦合无效，无法购买声子发生器效率，温度以 ^-0.5 的倍率除波速获取",
    tp: 1e155,
  },
  {
    id: "narrow", name: "狭窄",
    desc: "你一共只能购买十次升级，禁用所有自动化",
    tp: 1e170,
  },
  {
    id: "simple", name: "简洁",
    desc: "基础波速获取固定为 1 m/s²，波动升级 1/2 与声子升级 3 无效，热涨落无效，声子数始终为 1，升级 3 效果变为原来的平方根，奇点波速效果加成削弱，普朗克常数倍率无效",
    tp: 1e100,
  },
];
// 膨胀宇宙的进入时刻（真实 ms），用于计算波长倍率
let distortEnterAt = 0;

function inDistort(id) {
  // 虚空挑战：选中的扭曲宇宙削弱同时生效（多削弱叠加）
  return state.distortActive === id || (state.voidActive && state.voidRules.includes(id));
}

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
// ---------- log 域加减助手（Sp/声子/VP）----------
// 背景：sp/phonons 的 double 缓存可为 Infinity（log 权威仍有限）。裸算
// Infinity±有限=Infinity 会把权威 log 写成 LOG_CAP（触发加载时的污染全清），
// Infinity-Infinity=NaN 会把资源清零并让后续比较恒假/恒真。加减一律走 log 域。
// sp += 10^addLog。sp=0 时零哨兵 logDsp=0 字面量并非 log10(0)，须先归 -Infinity 再加
function addSpLog(addLog) {
  const cur = state.sp > 0 ? getLogSp() : -Infinity;
  setSpLogRaw(logAddLogs(cur, addLog));
}
// sp -= 10^costLog（调用前须已用 cmpGE 确认可负担；浮点相消为负按 0 处理）
function subSpLog(costLog) {
  const cur = state.sp > 0 ? getLogSp() : -Infinity;
  const r = logAddSigned(cur, 1, costLog, -1);
  setSpLogRaw(r.sign < 0 ? NLOG : r.log);
}
// totalSp += 10^addLog（零哨兵同 sp）
function addTotalSpLog(addLog) {
  const cur = state.totalSp > 0 ? getLogTotalSp() : -Infinity;
  const nLog = logAddLogs(cur, addLog);
  state.logDtotal = nLog <= NLOG + 1 ? 0 : nLog;
  state.totalSp = nLog <= NLOG + 1 ? 0 : (nLog > 308 ? Infinity : Math.pow(10, nLog));
}
// 由 log10(sp) 直接写双表示（log 权威；零延续 setSp 的 logDsp=0 零哨兵）
function setSpLogRaw(nLog) {
  nLog = clampLog(nLog);
  state.logDsp = nLog <= NLOG + 1 ? 0 : nLog;
  state.sp = nLog <= NLOG + 1 ? 0 : (nLog > 308 ? Infinity : Math.pow(10, nLog));
}
// phonons -= 10^costLog（调用前须已用 cmpGE/cmpLT 确认可负担）
function subPhononsLog(costLog) {
  const r = logAddSigned(getLogPhonons(), 1, costLog, -1);
  if (r.sign < 0) setPhonons(0); else setPhononsLog(r.log);
}
// VP -= 10^costLog（调用前须已用 cmpGE/cmpLT 确认可负担）
function subVPLog(costLog) {
  const r = logAddSigned(getLogVP(), 1, costLog, -1);
  if (r.sign < 0) setVP(0); else setVPLog(r.log);
}
// Sp 可负担性判断（购买与按钮显示共用口径；sp 缓存 Infinity 或价格超 double 时正确）
function spAfford(cost) { return cmpGE(state.sp, cost, getLogSp(), Math.log10(cost)); }
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
// 购买扣款 U -= cost·L（costLog 为 log10(cost)）。U 与扣款额均在 double 范围内走 double；否则 log 域减法
function subULog(costLog) {
  const uLog = getLogU10();
  // double 路径必须同时保证 U 与扣款额 cost·L 可表示：价格超 1e308 时
  // Math.pow(10,costLog) 为 Infinity，会把 U 减成 -Infinity/NaN 摧毁 logU10 权威
  const subLog = costLog + getLogL10();
  if (isFinite(state.U) && state.U < LOG_FALLBACK && costLog < 308 && subLog < 308) {
    setU(state.U - Math.pow(10, costLog) * state.L);
  } else {
    // log 域：log10(cost·L) = costLog + logL10；U - cost·L（同号相减）
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
// ---------- 派生物理量 ----------
// L 的双表示：logL10 权威（永不下溢），L 为 double 缓存（极端小时可能下溢为 0）
function getLogL10() { return (state.logL10 !== undefined && isFinite(state.logL10)) ? state.logL10 : Math.log10(state.L || 1e-300); }
// F = U / L（定向宇宙：波速取绝对值；膨胀宇宙：波长乘以膨胀倍率）
function distortLMod() {
  if (!inDistort("expand")) return 1;
  const t = (gameNow() - distortEnterAt) / 1000;
  if (t <= 1) return 1;
  return Math.pow(1e20, t - 1); // 进入 1 秒后，每秒波长 ×1e20
}
// 波长倍率的 log10（代数式，避免 double 溢出）
function distortLModLog() {
  if (!inDistort("expand")) return 0;
  const t = (gameNow() - distortEnterAt) / 1000;
  if (t <= 1) return 0;
  return 20 * (t - 1);
}
// 膨胀宇宙：波速获取指数随时间下降，每秒 -0.1，到 0 为止（gain^exp → log *= exp）
function distortGainExp() {
  if (!inDistort("expand")) return 1;
  const t = (gameNow() - distortEnterAt) / 1000;
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
// F=0（FLog 为 NLOG 哨兵）或声子=0 时温度为 0，直接返回 NLOG 哨兵——
// 否则「NLOG + 有限项」会产生 NLOG+ε 噪声，显示层渲染出 1e-9999999xx（定向宇宙 U=0 时实测）
function temperatureLog() {
  if (FLog() <= NLOG + 1 || !(getLogPhonons() > NLOG + 1)) return NLOG;
  return clampLog(getLogPhonons() + LOG_H_OVER_KB + FLog() + planckMultLog());
}
// 当前生效的温度上限 log10：
// 扭曲宇宙用自己的普朗克温度（用于「达到即完成」）；tp 为 Infinity 的测试宇宙
// 回退到主宇宙上限——否则无上限会让「声子↔温度↔热涨落↔波速」正反馈循环失控爆炸。
function effectiveCapLog() {
  if (state.voidActive) return temperatureCapLog(); // 虚空：使用主宇宙 T_p
  if (state.distortActive) {
    const u = DISTORT_UNIVERSES.find(x => x.id === state.distortActive);
    if (u && isFinite(u.tp)) return Math.log10(Math.max(u.tp, 1e-300));
  }
  return temperatureCapLog();
}
// 温度的 log10（经上限裁剪）：热涨落/声子涨落等增益计算必须用这个，
// 与 double 版 temperature() 语义一致，否则 log 域会绕过上限引发数值爆炸。
// 8DA 打破规则（仅主宇宙）：普朗克温度从硬上限变为软上限——
// 超过 Tp 的部分（log 域超出量）按 (lg(Tp)/lg(T))^(1/2)/2 次方缩放。
// 扭曲宇宙中仍为硬上限（该硬上限还是硬上限）。
// 虚空挑战：使用主宇宙 T_p，且与打破规则相同——T 可超过 T_p，超出部分受同一软上限；
// 滞涨削弱（若选）的有效温度开方在软上限之前生效。
function temperatureCappedLog() {
  const raw = temperatureLog();
  if (state.testBreakRules) return raw; // 测试按钮：无上限
  if (state.voidActive) {
    let t = raw;
    if (state.voidRules.includes("inflation")) t /= 2; // 滞涨：有效温度开方（先于软上限）
    const capLog = temperatureCapLog(); // 主宇宙 T_p
    if (t > capLog) {
      const p = Math.pow(capLog / t, 1 / (effSvpu4() + 2)) / 2;
      return clampLog(capLog + (t - capLog) * p);
    }
    return clampLog(t);
  }
  const capLog = effectiveCapLog();
  if (state.rulesBroken && !state.distortActive && raw > capLog) {
    // 软上限：超出部分 × (lg(Tp)/lg(T))^(1/(n+2))/2，n 为热能超载（svpu4）有效等级（n=0 时为 1/2；
    // SVU2 能标偏移在虚空外提供减半的加成）
    const p = Math.pow(capLog / raw, 1 / (effSvpu4() + 2)) / 2;
    return clampLog(capLog + (raw - capLog) * p);
  }
  // 滞涨宇宙：有效温度变为原来的平方根（log ÷ 2），热涨落等加成相应减弱
  const eff = inDistort("inflation") ? raw / 2 : raw;
  return Math.min(eff, capLog);
}
function temperature() {
  const log = temperatureCappedLog();
  return log > 308 ? Infinity : (log <= NLOG + 1 ? 0 : Math.pow(10, log));
}
// 热涨落：波速获取 ×= max(1, T)^0.2
function thermalMult() {
  if (inDistort("adiabatic")) return 1 / Math.pow(Math.max(1, temperature()), svu2AdiabaticExp()); // 热寂：温度反而削弱波速获取（SVU2 削弱虚空内该惩罚）
  if (inDistort("simple")) return 1; // 简洁：热涨落无效
  return Math.pow(Math.max(1, temperature()), thermalExp());
}
// 热涨落的 log10（幂项 → 指数乘；热寂为负、简洁为 0）。必须用经上限裁剪的温度 log，
// 否则 log 域会绕过温度上限，令「声子↔温度↔热涨落」正反馈失控（通胀/滞涨爆炸的根因）。
function thermalMultLog() {
  const tLog = Math.max(0, temperatureCappedLog()); // max(1,T) 的 log（已裁剪）
  if (inDistort("adiabatic")) return clampLog(-svu2AdiabaticExp() * tLog);
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
// 声波耦合的 log10：log10(ceil(10^(0.05·logU10)))；结果超 double 时在 log 域保留真实幂
//（钳到 308.2542 会在 logU10 > 6165 时低估真值——log 域本身可表示任意量级）
function couplingMultLog() {
  if (!state.phCoupling || inDistort("directed") || inDistort("adiabatic")) return 0;
  const pow = 0.05 * Math.max(0, getLogU10()); // 10^(0.05·logU10)，可能 > 1e308
  const v = Math.ceil(pow > 15 ? Infinity : Math.pow(10, pow));
  return v === Infinity ? pow : Math.log10(Math.max(v, 1)); // pow>15 时 ceil(10^pow)+1 的误差可忽略
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
// 扭曲：滞涨（inflation）→ 指数 ÷2（效果开平方根）；简洁（simple）→ 指数 ×0.5（效果开平方根）
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
// 由 log10(F) 计算波长缩减量 F^e 的 log10（含软上限缩放，代数式永不溢出）
function up3WavelengthFromFLog(lf) {
  const e = up3Exp();
  if (!isFinite(lf)) return Infinity;
  if (lf <= 100) return e * lf;
  const scale = up3SoftcapScale(lf);
  return e * 100 + e * scale * (lf - 100);
}
// 冷却宇宙：购买任何升级 → 波速获取量变为 A^k，k 在 15 秒内从 0 线性升到上限 0.75；
// 期间再次购买则 k 重置为 0（获取量瞬间跌到 1）
function narrowBlocked() { return inDistort("narrow") && state.narrowPurchases >= 10; }
function markPurchase() {
  if (inDistort("cooldown")) state.lastPurchaseAt = gameNow();
  if (inDistort("narrow")) state.narrowPurchases++;
}
function cooldownExp() {
  if (!inDistort("cooldown") || !state.lastPurchaseAt) return 1;
  const t = (gameNow() - state.lastPurchaseAt) / 1000;
  if (t >= 15) return 0.75;
  return 0.75 * (t / 15); // k: 0 → 0.75 线性（最大指数 0.75）
}
// 进入冷却环境（冷却扭曲宇宙，或含冷却削弱的虚空）时：
// 冷却视为已完全生效（k=0.75）——lastPurchaseAt 的 0 哨兵语义是「从未购买→不削弱」，
// 直接依赖它会让进入后不买任何升级时指数停留在 1.00。此后每次购买把 k 重置为 0 并线性回复
function startCooldownRamp() {
  if (inDistort("cooldown")) state.lastPurchaseAt = gameNow() - 15000;
}


// ---------- 湮灭层 ----------
const T_P0 = 1.4168e32; // 最初宇宙的普朗克温度
// 普朗克常数受 (1+总Sp)^1.5 加成 → 等价于温度倍率（T = n·h·F/k_B 中 h 同倍放大）
// log10 版本（权威，永不溢出）：log10((1+totalSp)^exp)
function planckMultLog() {
  if (inDistort("simple")) return 0; // 简洁宇宙：普朗克常数倍率始终为 1
  const exp = hasDistortMilestone(1) ? 1.5 * daExpMult() : 1.5;
  return clampLog(exp * (getLogTotalSp() > 250 ? getLogTotalSp() : Math.log10(1 + state.totalSp)) + vpu2SingMultLog());
}
function planckMult() {
  const l = planckMultLog();
  return l > 308 ? Infinity : Math.pow(10, l);
}
// 当前宇宙温度硬上限：t·(1+总Sp)^10
// log10 版本（权威）：log10(T_P0) + exp·log10(1+totalSp)，含 250 软上限收敛
function temperatureCapLog() {
  const exp = hasDistortMilestone(1) ? 10 * daExpMult() : 10;
  let logCap = Math.log10(T_P0) + exp * (getLogTotalSp() > 250 ? getLogTotalSp() : Math.log10(1 + state.totalSp)) + vpu2SingMultLog();
  if (logCap > 250) logCap = (vpuOwned("vpu1") ? 212.5 + 0.15 * logCap : 225 + 0.1 * logCap); // 软上限：超 1e250 部分开十次方根（单圈重整后 0.15 次方）；截距各自校准使 1e250 拐点连续（212.5+0.15×250=225+0.1×250=250）
  return clampLog(logCap);
}
function temperatureCap() {
  const logCap = temperatureCapLog();
  return logCap > 308 ? Infinity : Math.pow(10, logCap);
}
// AU42 虚幻凝聚：基于虚粒子数量增加奇点获取 ×(1+VP)^0.3（返回 log10；
// log 域计算：VP 缓存为 Infinity（log 权威仍有限）时不产生 Infinity/LOG_CAP 污染）
function vpSpMultLog() {
  if (!auOwned("au42")) return 0;
  return 0.3 * logAddLogs(0, getLogVP());
}
// Sp 获取基础值的 log10（log 域全链路，温度超 double 也不产生 Infinity）。
// 三段连续：T<1e50 为 1~10 线性（1 Sp @ T_P0）；1e50≤T<1e100 为 lg(T)/5（10~20）；
// T≥1e100 为 2·T^0.01（在 1e50 与 1e100 处值与导数均连续）
function spGainBaseLog() {
  const tLog = temperatureCappedLog();
  if (tLog < 50) {
    // baseSpGain 在 1~10 区间，直接数值计算后取 log
    const frac = (tLog - Math.log10(T_P0)) / (50 - Math.log10(T_P0));
    const b = 1 + 9 * Math.max(0, frac);
    return Math.log10(Math.max(b, 1e-300));
  }
  if (tLog < 100) return Math.log10(tLog / 5); // lg(T)/5 的 log
  return Math.log10(2) + 0.01 * tLog;          // 2·T^0.01 的 log
}
// 未封顶的最终获取 log10（base + 全部乘数 + 首次保底），spGain* 系列共用
function spRawGainLog() {
  const mLog = Math.log10(state.distortMult) + state.sau4 * Math.log10(2)
    + Math.log10(Math.max(1, phononSpMult())) + vpSpMultLog();
  const bLog = spGainBaseLog() + mLog;
  const first = state.annihilations === 0 ? 1 : 0;
  // 首次保底 max(1, b)：log 域即 max(0, bLog)。
  // 注意不可写成 log10(1+10^bLog)（那是 1+b 的和）：普朗克温度处 b=1，首湮灭会变成 2 Sp
  return first > 0 ? Math.max(0, bLog) : bLog;
}
function spGainExact() {
  if (state.testBreakRules) return 0;
  const capped = spSoftcapLog(spRawGainLog());
  return capped > 308 ? Infinity : Math.pow(10, capped);
}
function spGain() {
  if (state.testBreakRules) return 0;
  const v = spGainExact();
  return v === Infinity ? Infinity : Math.floor(v);
}
// spGain 的 log10（用于 fmtNum 显示，超 double 时显示 1eN）。与 spGain() 同一 log 域链路。
function spGainLog() {
  if (state.testBreakRules) return NLOG;
  return clampLog(spSoftcapLog(spRawGainLog()));
}
// ---------- Sp 获取软上限 ----------
// 奇点获取超过 1.79e308 的部分被压缩：capped = 1.79e308 × (Sp/1.79e308)^(1/lg(Sp)^0.15)
// log10 域：cappedLog = 308.2529 + (spLog − 308.2529)/spLog^0.15（拐点处连续；
// spLog=1000 → ≈554；spLog=5000 → ≈1615，获取量越大压缩越强）
const SP_SOFTCAP_PIVOT_LOG = Math.log10(1.79e308); // ≈308.2529（A55 卷缩的判定阈值同源）
function spSoftcapLog(spLog) {
  if (spLog <= SP_SOFTCAP_PIVOT_LOG) return spLog;
  return SP_SOFTCAP_PIVOT_LOG + (spLog - SP_SOFTCAP_PIVOT_LOG) / Math.pow(spLog, 0.15);
}
// gainRate 的 log10 版本（完整乘法链在 log 域，永不溢出）
function gainRate() {
  let g;
  if (inDistort("simple")) {
    // 简洁：基础固定 1，升级 1/2 无效
    g = 1;
  } else {
    // A21 奖励：up1 的效果变为原来的 1.5 次方；AU11 机械共振：指数 up1Exp()
    const base = Math.pow(getUp1Eff(), (state.ach.normal.includes("A21") ? 1.5 : 1) * up1Exp());
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
    g *= vpu2SingMult(); // 量子狂潮：奇点效果额外乘数
  }
  // 定向：每刻独立 50% 概率取反（原版语义；符号随机而非固定，U 有 0 硬下限，
  // 长程为带反射壁的随机游走——正漂移保证进度推进，不会卡死）
  if (inDistort("directed") && Math.random() < 0.5) g = -g;
  // 冷却宇宙：波速获取量变为 A^k（k 随购买后时间线性 0→1）
  if (inDistort("cooldown")) g = Math.pow(Math.max(0, g), cooldownExp());
  // 滞涨宇宙（原通胀）：波速获取变为原来的平方根（^0.5）
  if (inDistort("inflation")) g = Math.sqrt(Math.max(0, g));
  // 膨胀宇宙：波速获取指数随时间下降（每秒 -0.1，到 0 为止）
  if (inDistort("expand")) g = Math.pow(Math.max(0, g), distortGainExp());
  // 虚空共振（SVU1）：虚空内波速获取速率整体幂次（符号保持——定向宇宙中可为负）；
  // 虚空泡沫第三效果（里程碑 2）：波速获取速率整体幂次（全局，^1+min(0.2, lg(VF+1)/300)）
  {
    const e = svu1GainExp() * vfGainExp();
    if (e !== 1) {
      const s = g < 0 ? -1 : 1;
      g = s * Math.pow(Math.abs(g), e);
    }
  }
  return g;
}
// gainRate 的 log10 版本（完整乘法链在 log 域，永不溢出）。
// 仅在 gainRate() 的 double 链因中间项溢出而饱和（Infinity）时由 tick 调用，
// 故 normal-play 下不参与计算（零回归）。返回 {log: log10(|g|), sign}。
function gainRateLog() {
  let log, sign = 1;
  if (inDistort("simple")) {
    log = 0; // 基础固定 1
  } else if (getUp1Eff() <= 0) {
    // up1=0 且无免费等级（升级3 重置后）：真实增益为 0（0^exp×…，up1Exp 恒 ≥1）。
    // 不提前返回的话 NLOG×exp + up2·lg(base) 会落在 NLOG 与 NLOG+1e9 之间，
    // 逃过所有哨兵守卫，显示层渲染出 1.000e-999999970 之类的下溢误报
    return { log: NLOG, sign: 1 };
  } else {
    // A21：up1 效果 1.5 次方；AU11：指数 up1Exp()
    const up1ExpTotal = (state.ach.normal.includes("A21") ? 1.5 : 1) * up1Exp();
    log = Math.log10(getUp1Eff()) * up1ExpTotal;
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
  log += vpu2SingMultLog(); // 量子狂潮：奇点效果额外乘数
  // 定向：每刻独立 50% 概率取反（与 gainRate 同款原版语义）
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
  // 虚空共振（SVU1）：虚空内波速获取速率整体幂次（幂在 log 域 = 乘指数）；
  // 虚空泡沫第三效果（里程碑 2）：全局整体幂次
  log *= svu1GainExp() * vfGainExp();
  // 超级软上限（仅虚空内）：获取超过 1e20000 的部分变为原来的 0.5 次方——
  // SVU1 幂次加成过强会让获取远超外部；20000 处连续（输入=输出）。
  // double 路径（gainRate）最高 1e308，不会触及此阈值，无需处理
  if (state.voidActive && log > 20000) log = 20000 + Math.pow(log - 20000, 0.5);
  return { log: clampLog(log), sign };
}
// 获取速率的显示口径 log：gain 为 0（gainRateLog 返回 NLOG 哨兵）时保持 NLOG（语义零）。
// 哨兵上直接累加 timeRateLog 等修正会产生 NLOG+noise 噪声（如 -1e9+18.9），
// 显示层会把它渲染成 1.000e-999999xxx（下溢误报）
function gainRateDispLog(extraLog) {
  const grLog = gainRateLog().log;
  return grLog <= NLOG + 1 ? NLOG : clampLog(grLog + extraLog);
}
// 时间速率：每个普通成就给予 ×1.1 的游戏时间速率加成；黑洞扭曲状态给予 ×(1+bhEffect)；
// A41 特殊奖励：总时间倍率再 ^1.1；rua摆线随机倍率加成（持续 10 分钟）
function timeRate() {
  let tr = Math.pow(achTimeBase(), state.ach.normal.length) * timeArrowMult() * absZeroMult() * bhTimeMult();
  if (state.ach.normal.includes("A41")) tr = Math.pow(tr, 1.1);
  if (state.ruaBoostUntil && gameNow() < state.ruaBoostUntil) tr *= state.ruaBoostMult;
  // 时间倍率可能超 double（黑洞扭曲状态效果巨大）：用 Decimal 承载，tick 侧走 timeRateLog
  return tr;
}
// timeRate 的 log10（log 域权威，永不溢出；游戏时间计算用）
function timeRateLog() {
  let log = state.ach.normal.length * Math.log10(achTimeBase());
  const ta = timeArrowMult();
  log += Math.log10(Math.max(ta, 1e-300));
  const az = absZeroMult();
  log += Math.log10(Math.max(az, 1e-300));
  // 黑洞扭曲状态加成：×(1+bhEffect)。乘法在 log 域 = log + log10(1+10^el)，
  // 必须用 logAddLogs(0, el) 再整体相加——若误用 logAddLogs(log, el) 会把
  // 乘法算成加法（A×(1+E) 变成 A+(1+E)），吞掉成就/时间之矢等其它贡献
  if (bhUnlocked() && state.bhState === "distorl") {
    let el = bhEffectLog();
    if (auOwned("au34")) el = clampLog(el * 2);
    if (el > 0) log = clampLog(log + logAddLogs(0, el));
  }
  if (state.ach.normal.includes("A41")) log = clampLog(log * 1.1);
  if (state.ruaBoostUntil && gameNow() < state.ruaBoostUntil) log += Math.log10(Math.max(state.ruaBoostMult, 1e-300));
  return clampLog(log);
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
  // 以 log10 显示：|logV| 在 double 范围内用 double 指数；超出用 log 域还原尾数（a.bbe±N）
  if (!isFinite(logV) || logV >= LOG_CAP) return "∞"; // LOG_CAP 钳制值视为无穷
  if (logV <= NLOG + 1e6) return "0"; // 哨兵噪声区（NLOG~NLOG+1e6）：语义为零，防 1e-9999999xx 误报
  // 小数位数跟随设置（与 fmt 一致），不再硬编码 3 位
  const d = Math.min(6, Math.max(3, (state.settings && state.settings.decimals) || 3));
  if (logV > -308 && logV < 308) return Math.pow(10, logV).toExponential(d).replace("e+", "e");
  // log 域：logV = floor(logV) + frac；值 = 10^frac × 10^floor(logV)
  // （负指数也走此分支：10^frac 是 1~10 间的有限数，不会下溢）
  const exp = Math.floor(logV);
  const frac = logV - exp;
  const mant = Math.pow(10, frac);
  return mant.toFixed(d) + "e" + exp;
}
// 统一显示：double 在范围内走 fmt（现状），饱和/超 1e308 走 fmtLog（输出 1eN）
function fmtNum(doubleVal, logVal) {
  // double 为 0 但 logVal 表示非零值（double 下溢，如波长 <1e-324）时走 log 域显示。
  // logVal===0 是 sp/totalSp 的零哨兵（真值 0 而非 10^0=1），必须排除，否则 0 会显示成 1
  if (doubleVal === 0 && logVal !== undefined && isFinite(logVal) && logVal !== 0 && logVal > NLOG + 1) return fmtLog(logVal);
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
// 时间显示的 log 域版本：秒数为非有限值（double 封顶 MAX_VALUE，fmtTime 会得到天文数字）
// 时按「天」数科学计数显示（天数的 log = log10(秒) − log10(86400)）。普通范围回落 fmtTime
function fmtTimeLog(seconds, secondsLog) {
  if (seconds !== undefined && isFinite(seconds)) return fmtTime(seconds);
  const dLog = (typeof secondsLog === "number" && isFinite(secondsLog) && secondsLog > NLOG + 1)
    ? secondsLog - Math.log10(86400) : null;
  if (dLog === null || dLog <= 4) return fmtTime(86400 * 1e4); // 兜底
  return (10 ** (dLog - Math.floor(dLog))).toFixed(3) + "e" + Math.floor(dLog) + "d";
}
// 湮灭次数等大计数的显示：≥1e4 用科学计数法（如 3.00e4）
function fmtAnnNum(n) {
  return n >= 1e4 ? n.toExponential(2).replace("e+", "e") : `${n}`;
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
  // 存档若带有 logL10 且 L 已下溢为 0：L 保持 0，读取走 getLogL10
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
  // v0.5.0.2：VPU 解锁条件达成记录回填（达成一次永久解锁）
  if (!Array.isArray(state.vpuCondMet)) state.vpuCondMet = [];
  // v0.5.1：测试模式字段保留兼容（内容已全员开放，逻辑不再读取）
  if (state.testMode === undefined) state.testMode = false;
  // 孤儿虚空状态清理：虚空中丢失 A52 的存档会永久软锁
  //（虚空页隐藏、湮灭/自动湮灭/扭曲入口全被阻）。进入虚空时资源已重置，
  // 此处直接清标志即可回到主宇宙（不走 exitVoid——迁移阶段 DOM 未就绪）
  if (state.voidActive && !(state.ach.normal && state.ach.normal.includes("A52"))) {
    state.voidActive = false;
    state.voidRules = [];
  }
  // 修复离线模拟虚拟时钟污染的存量坏档：时间戳落在未来会使 CD 计时（now - 时间戳）
  // 为负、自动湮灭/自动升级3卡死直至现实时间追上（最长 8h）；归位为当前时刻立即恢复。
  // annFastest 为负（realDur 为负时被错误刷新）同样归零
  {
    const nowMs = Date.now();
    const futureKeys = ["lastAutoAnnAt", "lastAutoUp3At", "annStartReal", "capReachedAt", "zeroGainSince", "bhPulseSince", "bhDistorlSince", "lastPurchaseAt"];
    for (const k of futureKeys) {
      if (typeof state[k] === "number" && isFinite(state[k]) && state[k] > nowMs + 5000) state[k] = nowMs;
    }
    if (typeof state.ruaBoostUntil === "number" && state.ruaBoostUntil > nowMs + 11 * 60 * 1000) state.ruaBoostUntil = 0; // 合法窗口仅 10 分钟
    if (typeof state.ruaBoostCD === "number" && state.ruaBoostCD > nowMs + 61 * 60 * 1000) state.ruaBoostCD = 0;        // 合法 CD 1 小时
    if (typeof state.annFastest === "number" && (!isFinite(state.annFastest) || state.annFastest < 0)) state.annFastest = 0;
  }
  // v0.4.3.2：自动湮灭 CD 升级字段回填
  if (state.autoAnnCDLvl === undefined) state.autoAnnCDLvl = 0;
  // v0.5.0：本次湮灭游戏时长独立累计字段回填
  if (state.annGameElapsed === undefined) state.annGameElapsed = 0;
  // 旧版把 gained=Infinity 记入最好单次奇点/历史（JSON 序列化后为 null）：统计页会显示 ∞。
  // 统一归位为软上限拐点（历史最高获取的实际显示口径）。
  // 注意不能用 !isFinite(null)——null 强转 0 后 isFinite 为 true，必须显式判 typeof
  if (state.annBestSp === undefined || typeof state.annBestSp !== "number" || !isFinite(state.annBestSp)) state.annBestSp = Math.pow(10, Math.log10(1.79e308));
  // annBestSp 的 log 权威回填：旧档无此字段时从 annBestSp 重建（含 Infinity→拐点口径）
  if (state.annBestSpLog === undefined || typeof state.annBestSpLog !== "number" || !isFinite(state.annBestSpLog)) {
    state.annBestSpLog = (state.annBestSp > 0 && isFinite(state.annBestSp)) ? Math.log10(state.annBestSp) : Math.log10(1.79e308);
  }
  if (state.annBestRate === undefined || typeof state.annBestRate !== "number" || !isFinite(state.annBestRate)) state.annBestRate = 0;
  // annBestRate 的 log 权威回填
  if (state.annBestRateLog === undefined || typeof state.annBestRateLog !== "number" || !isFinite(state.annBestRateLog)) {
    state.annBestRateLog = (state.annBestRate > 0 && isFinite(state.annBestRate)) ? Math.log10(state.annBestRate) : NLOG;
  }
  // annGameElapsed 的 log 权威回填（旧档封顶为 MAX_VALUE → 按 MAX_VALUE 的 log 归位）
  if (state.annGameElapsedLog === undefined || typeof state.annGameElapsedLog !== "number" || !isFinite(state.annGameElapsedLog)) {
    state.annGameElapsedLog = (state.annGameElapsed > 0 && isFinite(state.annGameElapsed)) ? Math.log10(state.annGameElapsed) : NLOG;
  }
  if (Array.isArray(state.annHistory)) {
    for (const h of state.annHistory) {
      if (h) {
        if (typeof h.sp !== "number" || !isFinite(h.sp)) h.sp = Math.pow(10, Math.log10(1.79e308));
        if (typeof h.rate !== "number" || !isFinite(h.rate)) h.rate = Math.pow(10, Math.log10(1.79e308));
      }
    }
  }
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
  // sp/totalSp 同样从 log 权威回填（playTime=Infinity 序列化为 null 后须恢复，
  // 否则 playTime-annStartGame=NaN、购买比较把 null 当 0）
  if (state.sp === null || state.sp === undefined) {
    state.sp = (state.logDsp !== undefined && isFinite(state.logDsp) && state.logDsp > 0) ? fromLog(state.logDsp) : 0;
  }
  if (state.totalSp === null || state.totalSp === undefined) {
    state.totalSp = (state.logDtotal !== undefined && isFinite(state.logDtotal) && state.logDtotal > 0) ? fromLog(state.logDtotal) : 0;
  }
  if (state.playTime === null || state.playTime === undefined) {
    state.playTime = (state.playTimeLog !== undefined && isFinite(state.playTimeLog))
      ? (state.playTimeLog > 308 ? Number.MAX_VALUE : Math.pow(10, state.playTimeLog))
      : 0;
  }
  if (state.maxF === null || state.maxF === undefined) state.maxF = fromLog(getLogMaxF());
  if (state.maxU === null || state.maxU === undefined) state.maxU = fromLog(getLogMaxU());
  if (state.bhMass === null || state.bhMass === undefined) state.bhMass = fromLog(getLogBhMass());
  if (state.virtualParticles === null || state.virtualParticles === undefined) state.virtualParticles = fromLog(getLogVP());
  // v0.5.1：虚空泡沫 log 权威回填（旧档只有 voidVF；JSON 把 Infinity 存为 null 后由 log 重建）
  if (state.logVoidVF10 === undefined || state.logVoidVF10 === null || !isFinite(state.logVoidVF10)) {
    state.logVoidVF10 = (state.voidVF > 0 && isFinite(state.voidVF)) ? Math.log10(state.voidVF) : NLOG;
  }
  if (state.voidVF === null || state.voidVF === undefined) {
    state.voidVF = state.logVoidVF10 > 308 ? Infinity
      : (state.logVoidVF10 <= NLOG + 1 ? 0 : Math.pow(10, state.logVoidVF10));
  }
  // v0.5.1：虚空里程碑与 SVU 字段回填
  if (state.voidBestRules === undefined) state.voidBestRules = 0;
  if (state.svu1SpLog === undefined || !isFinite(state.svu1SpLog)) state.svu1SpLog = NLOG;
  if (state.svu1VpLog === undefined || !isFinite(state.svu1VpLog)) state.svu1VpLog = NLOG;
  if (state.svu1VfLog === undefined || !isFinite(state.svu1VfLog)) state.svu1VfLog = NLOG;
  if (state.svu1Filling === undefined) state.svu1Filling = false;
  if (state.svu2Level === undefined) state.svu2Level = 0;
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
    state.settings = Object.assign({ theme: "black", notation: "scientific", decimals: 3, uiFps: 33, hideLockedRows: true, hideDoneRows: false, offlineEnabled: true }, obj.settings || {});
    state.ach = Object.assign({ normal: [], hidden: [], hiddenRevealed: [] }, obj.ach || {});
    migrateState();
    // 迁移：v0.1 旧存档用 frequency 字段
    if (obj.frequency !== undefined && obj.U === undefined) {
      setU(obj.frequency);
      state.L = 1; state.logL10 = 0;
    }
    if (obj.totalFrequency !== undefined) {
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
    queueOfflineProgress();
    state.lastTick = Date.now();
    return true;
  } catch (e) {
    console.error("存档读取失败:", e);
    return false;
  }
}

function saveGame() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
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
    currentSlot = i; // 当前游戏已存入槽 i，高亮跟随（否则刷新后回到槽 0）
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
    state.settings = Object.assign({ theme: "black", notation: "scientific", decimals: 3, uiFps: 33, hideLockedRows: true, hideDoneRows: false, offlineEnabled: true }, obj.settings || {});
    state.ach = Object.assign({ normal: [], hidden: [], hiddenRevealed: [] }, obj.ach || {});
    migrateState();
    queueOfflineProgress();
    state.lastTick = Date.now();
    currentSlot = i;
    applyTheme(state.settings.theme);
    applyNotation(state.settings.notation);
    processPendingOffline(); // 槽位加载发生在 init 之后：离线结算须就地执行
    saveGame();
    renderAll();
    setAutosaveStatus(`已从存档槽 ${i + 1} 载入`);
  } catch { setAutosaveStatus("读取槽失败！"); }
}
function deleteSlot(i) {
  if (!confirm(`确定删除「${getSlotName(i)}」的存档？`)) return;
  localStorage.removeItem(slotKey(i));
  renderSlots();
  setAutosaveStatus(`已删除「${getSlotName(i)}」的存档`);
}
// 重命名存档槽（点击槽名；留空恢复默认，最长 20 字）
function renameSlot(i) {
  const cur = getSlotName(i);
  const def = cur.startsWith("存档槽 ") ? "" : cur;
  const name = prompt(`给「存档槽 ${i + 1}」命名（留空恢复默认）：`, def);
  if (name === null) return; // 取消
  setSlotName(i, name);
  renderSlots();
  setAutosaveStatus(name.trim() ? `存档槽已命名为「${name.trim()}」` : "已恢复默认槽名");
}
function renderSlots() {
  const list = document.getElementById("slot-list");
  list.innerHTML = "";
  for (let i = 0; i < SLOT_COUNT; i++) {
    const info = getSlotInfo(i);
    const row = document.createElement("div");
    row.className = "slot" + (i === currentSlot ? " current" : "");
    const name = document.createElement("div"); name.className = "slot-name"; name.textContent = getSlotName(i);
    name.title = "点击重命名";
    name.style.cursor = "pointer";
    name.addEventListener("click", () => renameSlot(i));
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
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  const page = document.getElementById("page-" + name);
  if (page) page.classList.remove("hidden");
  // 记录最后所在的大标签（刷新后恢复）
  try { localStorage.setItem("waveIncremental_lastTab", name); } catch {}
  // 返回上次离开时所处的子标签页；无记录则用默认
  const sub = lastSubtab[name] || DEFAULT_SUBTAB[name];
  if (sub) switchSubtab(sub);
  if (name === "settings") renderSlots();
  if (name === "achievements") updateAchievementsUI();
  if (name === "annihilation") { updateSpUI(); updateDistortUI(); updateBlackholeUI(); updateVoidUI(); }
  if (name === "automation") updateAutomationUI();
}
function switchSubtab(name) {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  const target = document.getElementById("sub-" + name);
  if (!target) return; // 兜底：无效子页名不破坏当前渲染
  document.querySelectorAll(".subtab").forEach(t => t.classList.toggle("active", t.dataset.subtab === name));
  document.querySelectorAll(".subpage").forEach(p => p.classList.add("hidden"));
  target.classList.remove("hidden");
  // 记录当前主标签下最后停留的子标签页
  const activeTab = document.querySelector(".tab.active");
  if (activeTab) lastSubtab[activeTab.dataset.tab] = name;
  if (name === "ann-sp") updateSpUI();
  if (name === "ann-distort") updateDistortUI();
  if (name === "ann-blackhole") updateBlackholeUI();
  if (name === "ann-void") updateVoidUI();
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
  // 边界防卡死：up2 是「×倍率」型，up1=0 时获取速率为 0——没有 spu1（免费）或其失效
  // （spu1 只在主宇宙生效，扭曲宇宙中失效）时要求至少一级升级1（A53 免费等级计入）
  if (getUp1Eff() < 1 && !upgradesFree()) return;
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
  if (-wLog < getLogMinL()) { state.logMinL = -wLog; state.minL = state.L; } // 极值走 log（新波长 log 为 -wLog）
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
      setAutosaveStatus("已购买：频率加成波速获取");
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
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
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
    level: `等级 ${state.up1}` + (up1FreeLevel() ? ` + ${up1FreeLevel()} 免费` : ""),
    effect: `当前获取速率: ${fmtNum(gainRate() * timeRate(), gainRateDispLog(timeRateLog()))} m/s²`,
    cost: fmtNum(up1Cost(), up1CostLog()) + " Hz",
    affordable: cmpGE(f, up1Cost(), FLog(), up1CostLog()),
  });
    const up2MultLog = state.up2 * Math.log10(up2Base());
    const up2Mult = up2MultLog > 308 ? Infinity : Math.pow(10, up2MultLog);
    // 与 buyUp2 同门槛：无 spu1（或失效）时至少需要一级升级1（免费等级计入）
    const up2Allowed = getUp1Eff() >= 1 || upgradesFree();
    up2Card.update({
      level: `等级 ${state.up2}`,
      effect: `当前倍率: ×${fmtNum(up2Mult, up2MultLog)}`,
      cost: fmtNum(up2Cost(), up2CostLog()) + " Hz",
      affordable: up2Allowed && cmpGE(f, up2Cost(), FLog(), up2CostLog()),
  });
  if (up3Card) {
    const lastLog = getLogUp3LastF();
    const affordable3 = FLog() > lastLog;
    const wLog2 = up3WavelengthFromFLog(FLog());
    const multLog = getLogL10() + wLog2;
    up3Card.update({
      level: `上次峰值: ${lastLog > NLOG + 1 ? fmtLog(lastLog) + " Hz" : "—"}`,
      effect: affordable3
        ? `下次重置: ×${fmtNum(Math.pow(10, multLog), multLog)}`
        : `当前波长: ${fmtNum(Math.pow(10, getLogL10()), getLogL10())} m`,
      cost: lastLog > NLOG + 1 ? `需 F > ${fmtLog(lastLog)}` : "首次",
      affordable: affordable3,
    });
  }
  buildMetaOnce();
  const eff = 1 + (fLog > 0 ? fLog : Math.log10(Math.pow(10, fLog) + 1)); // meta1 效果因子，防 F=Infinity 污染
  const owned = state.meta1 >= 1;
  const affordable = owned || cmpGE(f, costOf(META_COST), FLog(), costOfLog(LOG_META_COST));
  metaRefs.root.className = "upgrade-card" + (affordable ? " affordable" : " locked");
  metaRefs.effectEl.textContent = `当前预期效果: ×${fmt(eff)}`;
  metaRefs.costEl.textContent = fmtNum(costOf(META_COST), costOfLog(LOG_META_COST)) + " Hz";
  metaRefs.btn.textContent = owned ? "已购买" : "购买";
  // 解锁声子卡
  const uOwned = state.phUnlocked >= 1;
  const uAff = uOwned || cmpGE(f, costOf(PH_UNLOCK_COST), FLog(), costOfLog(LOG_PH_UNLOCK_COST));
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
  if (!upgradesFree()) subPhononsLog(pg2CostLog());
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
  if (!upgradesFree()) subPhononsLog(pg3CostLog());
  markPurchase();
      state.pg3++;
  updatePhononUI();
}
function buyFluct() {
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  if (state.phFluct) return;
  if (cmpLT(state.phonons, costOf(FLUCT_COST), getLogPhonons(), costOfLog(LOG_FLUCT_COST))) return;
  if (!upgradesFree()) subPhononsLog(costOfLog(LOG_FLUCT_COST));
  markPurchase();
      state.phFluct = 1;
  updatePhononUI();
  setAutosaveStatus("已购买：声子涨落");
}
function buyCoupling() {
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  if (state.phCoupling) return;
  if (cmpLT(state.phonons, costOf(COUPLING_COST), getLogPhonons(), costOfLog(LOG_COUPLING_COST))) return;
  if (!upgradesFree()) subPhononsLog(costOfLog(LOG_COUPLING_COST));
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
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  if (!state.phUnlocked) return;
  const T = temperature();
  // 显示必须用裁剪后的温度 log（temperatureCappedLog），传 raw 会在 T=Infinity 时
  // 显示未封顶的原始温度，看起来像温度超过了上限
  document.getElementById("ph-res-text").textContent =
    `你拥有${fmtInt(state.phonons, getLogPhonons())}声子，温度为${fmtNum(T, temperatureCappedLog())} K`;
  document.getElementById("ph-thermal").textContent =
    `热涨落把你的波速获取变为原来的${fmtNum(thermalMult(), thermalMultLog())}倍`;
  // 8DA 打破规则后：主宇宙普朗克温度为软上限，声子页显示红色提示行
  const noteEl = document.getElementById("ph-softcap-note");
  if (noteEl) {
    if (state.rulesBroken && !state.distortActive && temperatureLog() > effectiveCapLog()) {
      noteEl.classList.remove("hidden");
    } else {
      noteEl.classList.add("hidden");
    }
  }
}
function updatePhononUI() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
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
    effect: `当前倍率: ×${fmt(Math.pow(state.pg2 + 1 + pg2Free(), 2))}`,
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
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
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
// SVPU2 虚幻湮灭：每次湮灭使湮灭次数 +2^svpu2（膨胀计数为有意设计：
// 里程碑/扭曲解锁门槛/统计显示均使用膨胀后的计数；SVPU2 不加成单次 Sp 获取，
// 见 doAnnihilation 的 gained）。
function effAnnihilations() { return state.annihilations; }
function hasMilestone(n) { return state.annihilations >= n; }

// ---------- 扭曲里程碑（按已湮灭的扭曲宇宙数量 DA）----------
const DISTORT_MILESTONES = [
  { n: 1, desc: "" }, // 动态填充：基于扭曲宇宙湮灭数，将奇点效果变为 X 倍
  { n: 3, desc: "解锁更多的奇点升级" },
  { n: 5, desc: "解锁黑洞选项卡", black: true },
  { n: 8, desc: "打破多元宇宙的规则" },
];
function distortDA() { return state.distortDone.length; }
// 1DA 里程碑效果倍率：基于湮灭扭曲宇宙数，奇点效果指数 ×(1 + log2(1+DA))
function daExpMult() {
  return (1 + Math.log2(1 + distortDA())) * sauMult();
}
function hasDistortMilestone(n) { return distortDA() >= n; }

const LOG_T_P0 = Math.log10(T_P0);
function annihilationReady() {
  // log 域比较：用**有效温度**（滞涨为平方根后的温度，其余宇宙等于 raw）与目标比较；
  // 打破规则时无上限，直接用 raw。
  const tLog = state.rulesBroken || state.testBreakRules ? temperatureLog() : temperatureCappedLog();
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
  const realNow = gameNow();
  const realDur = (realNow - state.annStartReal) / 1000;
  const gameDur = state.annGameElapsed || (state.playTime - state.annStartGame);
  // Sp/分（double 缓存口径）：gained 超 double 时为 Infinity，log 口径在下方 pushAnnHistory 计算
  const rate = realDur > 0 && isFinite(gained) ? (gained / realDur) * 60 : 0;
  if (!inDistortMode) {
    // log 域加法：gained 或现有 sp/totalSp 任一超 double（含缓存 Infinity）时也不污染存档
    const sumOK = isFinite(gained)
      && isFinite(state.sp) && state.sp < LOG_FALLBACK && state.sp + gained < LOG_FALLBACK
      && isFinite(state.totalSp) && state.totalSp < LOG_FALLBACK && state.totalSp + gained < LOG_FALLBACK;
    if (sumOK) {
      setSp(state.sp + gained);
      setTotalSp(state.totalSp + gained);
    } else {
      // 任一侧超 double：log 域累积（log 为权威，double 缓存封顶 Infinity）
      const gLog = isFinite(gained) ? Math.log10(gained) : spGainLog();
      addSpLog(gLog);
      addTotalSpLog(gLog);
    }
    // gained 可能为 Infinity（封顶后仍超 double，如 lg=317.8）：记录时改用 log 权威
    // annBestSpLog（软上限拐点以上的真实 log），避免 10^cappedLog 再次溢出 → ∞
    const bestValLog = isFinite(gained) ? Math.log10(gained) : spGainLog();
    state.annBestSpLog = Math.max(state.annBestSpLog ?? NLOG, bestValLog);
    state.annBestSp = Math.pow(10, Math.min(state.annBestSpLog, 308)); // double 缓存（≤1.79e308 量级）
    // bestRate log 权威：lg(每分速率) = lg(获取) + log10(60/真实秒)
    const bestRateLog = bestValLog + Math.log10(60 / Math.max(realDur, 1e-9));
    state.annBestRateLog = Math.max(state.annBestRateLog ?? NLOG, bestRateLog);
    const bestRate = isFinite(rate) ? rate : Math.pow(10, Math.min(bestRateLog, 308)); // double 缓存（≤1.79e308）
    if (bestRate > state.annBestRate) state.annBestRate = bestRate;
    if (state.annFastest === 0 || realDur < state.annFastest) state.annFastest = realDur;
  }
  // 历史记录
  // 历史记录：sp/rate 存 log 权威（spLog/rateLog，可超 double），显示层由 log 驱动。
  // 注意 rate 的 log 分支须判 rate>0（rate=0 时 log10(0)=-Inf → JSON null）；
  // gained=Infinity（rate=0/Infinity）时用 spGainLog()+log10(60/realDur) 口径
  const histSpLog = isFinite(gained) ? Math.log10(gained) : spGainLog();
  const histRateLog = (rate > 0 && isFinite(rate)) ? Math.log10(rate) : histSpLog + Math.log10(60 / Math.max(realDur, 1e-9));
  pushAnnHistory({
    label: inDistortMode ? `扭曲·${dUniverse.name}` : `第 ${fmtAnnNum(state.annihilations + 1)} 次`,
    distort: inDistortMode ? dUniverse.id : "",
    sp: gained, realDur, gameDur, rate, at: realNow,
    spLog: histSpLog,
    rateLog: histRateLog,
  });
  // SVPU2 虚幻湮灭：每次获得的湮灭次数 ×2^svpu2（如 3 级则每次 +8 次而非 +1）。
  // 注意：进入扭曲宇宙（forceAnnihilationReset）也计一次湮灭次数——「进入=湮灭」是有意设计
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
  state.annStartGame = state.playTime; state.annGameElapsed = 0; state.annGameElapsedLog = NLOG;

  updateDispAnchor();
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
  distortEnterAt = gameNow();
  if (id === "simple") setPhonons(1); // 简洁宇宙：声子恒 1
  if (id === "narrow") state.narrowPurchases = 0; // 狭窄宇宙：进入时购买次数强制重置（防残留）
  startCooldownRamp(); // 冷却宇宙：进入时视为已完全生效（k=0.75）
  state.annStartReal = gameNow();
  state.annStartGame = state.playTime; state.annGameElapsed = 0; state.annGameElapsedLog = NLOG;
  applyAnnihilationVisibility(); // 重设按钮为扭曲模式文案
  updateDistortUI();
  switchTab("wave");
  switchSubtab("main");
  updateDispAnchor(); // 重置显示锚点，防止旧宇宙的 gainRate 缓存继续外推
  setAutosaveStatus(`进入扭曲宇宙「${u.name}」`);
}

// 强制重置（进入扭曲用）：gained 为获得的 Sp（可为 0）
function forceAnnihilationReset(gained) {
  const realNow = gameNow();
  const realDur = (realNow - state.annStartReal) / 1000;
  const gameDur = state.annGameElapsed || (state.playTime - state.annStartGame);
  const rate = realDur > 0 ? (gained / realDur) * 60 : 0;
  if (gained > 0) {
    // 与 doAnnihilation 同款防溢出：和超 double 时走 log 域累积
    const sumOK = isFinite(gained)
      && isFinite(state.sp) && state.sp < LOG_FALLBACK && state.sp + gained < LOG_FALLBACK
      && isFinite(state.totalSp) && state.totalSp < LOG_FALLBACK && state.totalSp + gained < LOG_FALLBACK;
    if (sumOK) {
      setSp(state.sp + gained); setTotalSp(state.totalSp + gained);
    } else {
      addSpLog(isFinite(gained) ? Math.log10(gained) : NLOG);
      addTotalSpLog(isFinite(gained) ? Math.log10(gained) : NLOG);
    }
    const bestValLog = isFinite(gained) ? Math.log10(gained) : spGainLog();
    state.annBestSpLog = Math.max(state.annBestSpLog ?? NLOG, bestValLog);
    state.annBestSp = Math.pow(10, Math.min(state.annBestSpLog, 308)); // double 缓存（≤1.79e308 量级）
    // bestRate log 权威：lg(每分速率) = lg(获取) + log10(60/真实秒)
    const bestRateLog = bestValLog + Math.log10(60 / Math.max(realDur, 1e-9));
    state.annBestRateLog = Math.max(state.annBestRateLog ?? NLOG, bestRateLog);
    const bestRate = isFinite(rate) ? rate : Math.pow(10, Math.min(bestRateLog, 308)); // double 缓存（≤1.79e308）
    if (bestRate > state.annBestRate) state.annBestRate = bestRate;
    if (state.annFastest === 0 || realDur < state.annFastest) state.annFastest = realDur;
  }
  const histSpLog = isFinite(gained) ? Math.log10(gained) : spGainLog();
  const histRateLog = (rate > 0 && isFinite(rate)) ? Math.log10(rate) : histSpLog + Math.log10(60 / Math.max(realDur, 1e-9));
  pushAnnHistory({
    label: `第 ${fmtAnnNum(state.annihilations + 1)} 次`, distort: "",
    sp: gained, realDur, gameDur, rate, at: realNow,
    spLog: histSpLog,
    rateLog: histRateLog,
  });
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
  state.annStartGame = state.playTime; state.annGameElapsed = 0; state.annGameElapsedLog = NLOG;
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
  distortEnterAt = gameNow();
  startCooldownRamp(); // 冷却宇宙：进入时视为已完全生效（k=0.75）
  state.annStartReal = gameNow();
  state.annStartGame = state.playTime; state.annGameElapsed = 0; state.annGameElapsedLog = NLOG;
  applyAnnihilationVisibility();
  updateDistortUI();
  switchTab("wave");
  switchSubtab("main");
  updateDispAnchor();
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
  // S14 失败计数与授奖统一在 exitDistort 内进行（本函数与顶部湮灭按钮都经它退出，各计一次）
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
  state.annStartReal = gameNow();
  state.annStartGame = state.playTime; state.annGameElapsed = 0; state.annGameElapsedLog = NLOG;
  applyPhononVisibility();
  applyAnnihilationVisibility();
  renderAll();
  updateDispAnchor();
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
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  applyHelpVisibility();
  const done = state.annihilations >= 1;
  document.getElementById("sp-display").classList.toggle("hidden", !done);
  document.getElementById("tab-annihilation").classList.toggle("hidden", !done);
  document.getElementById("tab-automation").classList.toggle("hidden", !done);
  document.getElementById("subtab-distort").classList.toggle("hidden", state.annihilations < 20);
  document.getElementById("subtab-blackhole").classList.toggle("hidden", !bhUnlocked());
  document.getElementById("subtab-void").classList.toggle("hidden", !state.ach.normal.includes("A52"));
  const ready = annihilationReady();
  if (!done) {
    // 首次湮灭：全屏遮罩接管（类似第一次大塌缩）；序列进行中不重复拉起
    document.getElementById("annihilate-btn").classList.add("hidden");
    if (ready && !annSequenceActive) firstAnnihilationFlow();
    return;
  }
  const overlay = document.getElementById("first-annihilation-overlay");
  if (!overlay.classList.contains("hidden")) overlay.classList.add("hidden");
  // 湮灭按钮：湮灭后一直可见；虚空挑战期间禁用
  const btn = document.getElementById("annihilate-btn");
  btn.classList.remove("hidden");
  btn.disabled = state.voidActive;
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
      btn.disabled = state.voidActive; // 虚空挑战：禁用湮灭
      return;
    }
  }
  btn.classList.remove("distort-mode");
  if (state.voidActive) btn.textContent = "虚空挑战中…";
  if (ready && !state.voidActive) {
    btn.textContent = `湮灭（+${fmtNum(spGain(), spGainLog())} Sp）`;
    btn.disabled = false;
  } else {
    btn.textContent = state.voidActive ? "虚空挑战中…" : `湮灭（须达到 1.42e32 K）`;
    btn.disabled = true;
  }
}

// 帮助页章节与统计湮灭区随游戏进度开放（避免剧透重置层）
function applyHelpVisibility() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  document.getElementById("help-phonon").classList.toggle("hidden", !state.phUnlocked);
  document.getElementById("help-annihilation").classList.toggle("hidden", state.annihilations < 1);
  document.getElementById("help-distort").classList.toggle("hidden", state.annihilations < 20);
  document.getElementById("help-sp-upgrades").classList.toggle("hidden", !hasDistortMilestone(3));
  document.getElementById("help-blackhole").classList.toggle("hidden", !bhUnlocked());  // 黑洞章节内防剧透：虚幻升级（VPU）区相关内容按进度显隐
  document.getElementById("help-vpu-extra").classList.toggle("hidden", !state.ach.normal.includes("A45"));
  document.getElementById("help-svpu-extra").classList.toggle("hidden", !vpuOwned("vpu5"));
  document.getElementById("help-void").classList.toggle("hidden", !state.ach.normal.includes("A52"));
  document.getElementById("stat-ann-group").classList.toggle("hidden", state.annihilations < 1);
  document.getElementById("subtab-stats-challenge").classList.toggle("hidden", state.annihilations < 20);
}

// ---------- 奇点升级 ----------
// spu1 移至 SAU 区（与奇点升级同尺寸按钮）：
const SPU1_DEF = { id: "spu1", name: "奇点之前的升级不再消耗资源", desc: "购买除升级3外奇点之前的升级不再消耗资源" };

// ---------- 奇点升级（3DA 里程碑解锁）----------
// 第一类：可重复（SAU1-3，一行三个）
const SAU_DEFS = [
  { id: "sau1", key: "sau1", name: "象限拓张", desc: "声子升级3的硬上限 +2/级", vpu1Desc: "声子升级3的硬上限 +3/级", max: 10,
    costLog: (n) => sauCostLog(2, n) }, // 第n次（1起）10^(2+2n)；超10级后增速×当前等级（log 域，价格可超 double）
  { id: "sau2", key: "sau2", name: "奇点凝聚", desc: "第 n 级使奇点效果指数额外乘以 (1+n/10)", max: Infinity,
    costLog: (n) => 5 * n + (n > 10 ? sau2ExtraCostLog(n) : 0) },
  { id: "sau3", key: "sau3", name: "紫外灾难", desc: "热涨落效果指数 +0.015/级", vpu1Desc: "热涨落效果指数 +0.018/级", max: 10,
    costLog: (n) => sauCostLog(3, n) },
];
// SAU1/SAU3 的显示描述：单圈重整（VPU1）后使用加强版描述
function sauDesc(u) {
  return (u.vpu1Desc && vpuOwned("vpu1")) ? u.vpu1Desc : u.desc;
}
// 可重复升级的「总效果」文本（含软上限后缀；软上限 = 有效级别起点与公式）
// 返回 { text, capped } 或 null（该升级无总效果行）
function totalEffectText(id) {
  const n = (k) => state[k];
  const suffix = (eff) => `（受软上限影响，有效级别为 ${eff >= 100 ? fmt(eff) : eff.toFixed(1)}）`;
  const cappedSau = (key) => n(key) > 10;
  switch (id) {
    case "sau1": {
      // 有效级别 = floor(3*(10+(n-10)^0.7))/3，与 pg3Cap 的软上限公式同源（含量子狂潮免费等级）
      const eff = Math.floor(3 * (10 + Math.pow(Math.max(n("sau1") + vpu2FreeLevel() - 10, 0), 0.7))) / 3;
      return { text: `总效果：声子升级3上限 +${pg3Cap() - 20}` + (vpu2FreeLevel() > 0 ? `（含免费 +${fmt(vpu2FreeLevel())}）` : ""), capped: cappedSau("sau1"), eff };
    }
    case "sau2": {
      const eff = effLevel(n("sau2"), 10, 1 / 3);
      return { text: `总效果：奇点效果 ×${fmt(sauMult())}`, capped: cappedSau("sau2"), eff };
    }
    case "sau3": {
      // 热涨落指数本底 0.2 不计入显示：只显示升级加成部分（+0.015/级，单圈重整后 +0.018/级）
      const eff = effLevel(n("sau3") + vpu2FreeLevel(), 10, 1 / 3);
      const per = vpuOwned("vpu1") ? 0.018 : 0.015;
      return { text: `总效果：热涨落效果指数 +${(per * eff).toFixed(3)}` + (vpu2FreeLevel() > 0 ? `（含免费 +${fmt(vpu2FreeLevel())}）` : ""), capped: cappedSau("sau3"), eff };
    }
    case "sau4":
      return { text: `总效果：奇点获取 ×${fmt(Math.pow(2, n("sau4")))}`, capped: false };
    case "sbu1": {
      // 事件视界总等级含量子狂潮免费等级（与 bhAccretionGainLog 的扣费口径一致）
      const total = n("sbu1") + vpu2FreeLevel();
      return { text: `总效果：吸积效率 ×${fmt(Math.pow(2, total))}` + (vpu2FreeLevel() > 0 ? `（含免费 +${fmt(vpu2FreeLevel())}）` : ""), capped: false };
    }
    case "sbu2": {
      const eff = sbu2Eff();
      return { text: `总效果：黑洞效果指数 +${(0.2 + 0.05 * eff).toFixed(2)}`, capped: n("sbu2") > 7, eff };
    }
    case "sbu3": {
      const eff = sbu3Eff();
      const multLog = eff * Math.log10(2);
      const mult = multLog > 308 ? Infinity : Math.pow(10, multLog);
      return { text: `总效果：虚粒子获取 ×${fmtNum(mult, multLog)}`, capped: n("sbu3") > 10, eff };
    }
    case "svpu1":
      return { text: `总效果：吸积质量指数 +${(0.03 * n("svpu1")).toFixed(2)}`, capped: false };
    case "svpu2":
      return { text: `总效果：湮灭次数 ×${fmt(Math.pow(2, n("svpu2")))}`, capped: false };
    case "svpu3":
      return { text: `总效果：升级3软上限削弱 ÷${n("svpu3") + 1}`, capped: false };
    case "svpu4":
      return { text: `总效果：温度软上限缩放指数 1/${n("svpu4") + 2}` + (svu2Svpu4Bonus() > 0 ? `（含能标偏移 +${fmt(svu2Svpu4Bonus())}）` : ""), capped: false };
    case "svpu5":
      return { text: `总效果：黑洞质量软上限起始 1e${bhMassSoftcapLog()}`, capped: false };
    default:
      return null;
  }
}
// 刷新一张可重复升级卡的总效果行（totalEl 存在时）
function renderTotalEffect(el, id) {
  if (!el) return;
  const t = totalEffectText(id);
  if (!t) { el.textContent = ""; return; }
  el.textContent = t.text + (t.capped ? `（受软上限影响，有效级别为 ${t.eff >= 100 ? fmt(t.eff) : t.eff.toFixed(1)}）` : "");
}

// ---------- 虚空页 UI ----------
let voidBuilt = false, voidRuleBtns = {};
function buildVoidOnce() {
  if (voidBuilt) return;
  const grid = document.getElementById("void-rules");
  grid.innerHTML = "";
  voidRuleBtns = {};
  for (const u of DISTORT_UNIVERSES) {
    const btn = document.createElement("button");
    btn.className = "void-rule";
    const nm = document.createElement("div"); nm.textContent = u.name;
    const ml = document.createElement("div"); ml.className = "void-rule-mult"; ml.textContent = "乘数 ×" + VOID_MULTIPLIERS[u.id];
    btn.append(nm, ml);
    btn.addEventListener("click", () => {
      if (state.voidActive) return;
      const i = voidSelection.indexOf(u.id);
      if (i >= 0) voidSelection.splice(i, 1); else voidSelection.push(u.id);
      btn.classList.toggle("selected", i < 0);
      document.getElementById("void-enter-btn").disabled = voidSelection.length === 0;
    });
    grid.appendChild(btn);
    voidRuleBtns[u.id] = btn;
  }
  document.getElementById("void-enter-btn").addEventListener("click", () => {
    enterVoid(voidSelection.slice());
  });
  document.getElementById("void-exit-btn").addEventListener("click", exitVoid);
  // 虚空升级（SVU，虚空里程碑 1 解锁；全行卡片）
  const upg = document.getElementById("void-upg-list");
  upg.innerHTML = "";
  voidSvuEls = {};
  for (const def of SVU_DEFS) {
    const card = document.createElement("div");
    card.className = "void-svu-card";
    const nm = document.createElement("div"); nm.className = "sau-name"; nm.textContent = def.name;
    const ds = document.createElement("div"); ds.className = "sau-desc";
    const ct = document.createElement("div"); ct.className = "sau-cost";
    card.append(nm, ds, ct);
    if (def.fill) {
      const fillBtn = document.createElement("button");
      fillBtn.className = "void-svu-fill";
      fillBtn.textContent = "开始填充";
      fillBtn.addEventListener("click", () => {
        if (!voidMilestone1()) return;
        state.svu1Filling = !state.svu1Filling;
        saveGame();
        updateVoidUI();
      });
      card.appendChild(fillBtn);
      voidSvuEls.fillBtn = fillBtn;
    }
    upg.appendChild(card);
    voidSvuEls[def.id] = { card, nm, ds, ct };
  }
  // 虚空里程碑格子（每个里程碑一个独立格子）
  const msGrid = document.getElementById("void-milestone-list");
  msGrid.innerHTML = "";
  voidMsEls = [];
  for (const def of VOID_MILESTONES) {
    const cell = document.createElement("div");
    cell.className = "void-ms-cell";
    const head = document.createElement("div"); head.className = "void-ms-head";
    const title = document.createElement("span"); title.textContent = `里程碑 ${def.n} · ${def.title}`;
    const status = document.createElement("span"); status.className = "void-ms-status";
    head.append(title, status);
    const desc = document.createElement("div"); desc.className = "sau-desc"; desc.textContent = def.desc;
    const prog = document.createElement("div"); prog.className = "void-ms-prog";
    const reward = document.createElement("div"); reward.className = "sau-desc"; reward.textContent = "奖励：" + def.reward;
    cell.append(head, desc, prog, reward);
    msGrid.appendChild(cell);
    voidMsEls.push({ cell, statusEl: status, progEl: prog });
  }
  voidBuilt = true;
}
let voidSelection = []; // 进入前勾选的削弱
let voidSvuEls = {};    // SVU 卡片元素引用
let voidMsEls = [];     // 虚空里程碑格子元素引用
function updateVoidUI() {
  if (simActive) return;
  // 虚空仅测试模式可访问：非测试模式下子页隐藏、UI 不更新
  const voidAccessible = state.ach.normal.includes("A52");
  const subtab = document.getElementById("subtab-void");
  if (subtab) subtab.classList.toggle("hidden", !voidAccessible);
  if (!voidAccessible) return;
  buildVoidOnce();
  document.getElementById("void-enter-row").classList.toggle("hidden", state.voidActive);
  document.getElementById("void-active-panel").classList.toggle("hidden", !state.voidActive);
  const stats = document.getElementById("void-stats");
  const vfMultLog = vfVPMultLog();
  const m1 = voidMilestone1();
  const m2 = voidMilestone2();
  // VF 效果行：第一效果（VP 获取）恒有；第二效果（吸积 ×VF^(2/3)）里程碑 1 解锁；
  // 第三效果（波速获取幂次）里程碑 2 解锁
  const vfLine = state.logVoidVF10 > NLOG + 1
    ? `虚空泡沫（VF）：${fmtLog(state.logVoidVF10)}\nVP 获取 ×${fmtLog(vfMultLog)}`
      + (m1 ? `\n黑洞吸积 ×${fmtLog(clampLog((2 / 3) * state.logVoidVF10))}` : "")
      + (m2 ? `\n波速获取 ^${fmt(vfGainExp())}` : "")
    : "虚空泡沫（VF）：尚无";
  // 虚空里程碑显示（每个里程碑一个独立格子）
  for (let i = 0; i < VOID_MILESTONES.length; i++) {
    const def = VOID_MILESTONES[i];
    const el = voidMsEls[i];
    if (!el) continue;
    const done = def.n === 1 ? voidMilestone1() : voidMilestone2();
    el.cell.classList.toggle("done", done);
    el.statusEl.textContent = done ? "✓ 已完成" : "进行中";
    el.progEl.textContent = `进度：历史最高 ${state.voidBestRules} / ${def.need} 种`;
  }
  // SVU 卡片状态
  for (const def of SVU_DEFS) {
    const el = voidSvuEls[def.id];
    if (!el) continue;
    el.card.classList.toggle("locked", !m1);
    if (!m1) {
      el.ds.textContent = "??? —— 完成虚空里程碑 1 后解锁";
      el.ct.textContent = "";
    } else {
      el.ds.textContent = def.desc;
      el.ct.textContent = def.effect();
    }
  }
  if (voidSvuEls.fillBtn) {
    voidSvuEls.fillBtn.classList.toggle("on", state.svu1Filling);
    voidSvuEls.fillBtn.textContent = state.svu1Filling ? "停止填充" : "开始填充";
    voidSvuEls.fillBtn.disabled = !m1;
  }
  if (state.voidActive) {
    const fLog = FLog();
    const vfLog = voidVFLog(fLog);
    const reached = vfLog > NLOG + 1;
    const preview = reached ? `预计 VF：${fmtLog(vfLog)}` : `频率尚未达到 1e2000 Hz`;
    document.getElementById("void-progress").textContent =
      `当前频率：${fmtNum(Math.pow(10, Math.min(fLog, 308)), fLog)} Hz\n目标：1e2000 Hz\n${preview}`;
    stats.textContent = vfLine;
  } else {
    stats.textContent = vfLine;
    for (const id in voidRuleBtns) voidRuleBtns[id].classList.toggle("selected", voidSelection.includes(id));
    // 进入按钮按已选削弱数量启用（选择状态由按钮 click 维护）
    document.getElementById("void-enter-btn").disabled = voidSelection.length === 0;
  }
}
// SAU1/SAU3 的实际等级上限：单圈重整（VPU1）后取消
function effSauMax(key) {
  return (key === "sau1" || key === "sau3") && vpuOwned("vpu1") ? Infinity : 10;
}
// 奇点凝聚 n>10 后的价格延伸（log10）：每级在原 10^(5n) 基础上额外 ×n⁴
function sau2ExtraCostLog(n) {
  let log = 0;
  for (let k = 11; k <= n; k++) log += 4 * Math.log10(k);
  return log;
}
// SAU1/SAU3 价格的 log10：n≤10 为 base+2n（增速 ×100）；超过 10 级后每级增速 =
// 原增速 ×100 × n²（n 为当前等级），log 域累积
function sauCostLog(base, n) {
  if (n <= 10) return base + 2 * n;
  let log = base + 20; // 第 10 次购买的价格
  for (let k = 11; k <= n; k++) log += 2 + 2 * Math.log10(k);
  return log;
}
// 真空衰变（独立行，位于 spu1 下方、SAU 行上方）：每级奇点获取 ×2，价 10^(3+n)
const VACUUM_DEF = { id: "sau4", key: "sau4", name: "真空衰变", desc: "每级使获得的奇点 ×2", max: Infinity,
  costLog: (n) => 3 + n };
// 第二类：单次（四组×4，两组共一行）
const AU_DEFS = [
  [ // 第1组
    { id: "au11", name: "机械共振", desc: "基于波动升级1等级给予其指数加成：^max(1,√n/5)", cost: 1e6 },
    { id: "au12", name: "受激跃迁", desc: "每个声子升级1等级给予声子升级2免费2级", cost: 1e10 },
    { id: "au13", name: "光子共振", desc: "基于波动升级2等级增强其底数：+min(2, lg(1+n)/4)", cost: 1e16 },
    { id: "au14", name: "黑体辐射", desc: "波长倒数增强声子产生：×max(1, L^-0.1)", cost: 3e16 },
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
    { id: "au41", name: "共轭湮灭", desc: "湮灭次数加成奇点获取", cost: 3e8 },
    { id: "au42", name: "虚幻凝聚", desc: "基于虚粒子数量增加奇点获取", cost: 5e9 },
    { id: "au43", name: "奇点塌缩", desc: "新增一个奇点效果", cost: 5e12 },
    { id: "au44", name: "监察原理", desc: "事件视界的加成在软上限后生效", cost: 1e14 },
  ],
];
function auOwned(id) { return !!state.au[id]; }
function buySAU(id) {
  const u = SAU_DEFS.find(x => x.id === id) || (id === VACUUM_DEF.id ? VACUUM_DEF : null);
  if (!u) return;
  const n = state[u.key] + 1; // 第 n 次购买（1 起）
  const effMax = u.max !== Infinity ? effSauMax(u.key) : Infinity; // 单圈重整取消 sau1/sau3 上限
  if (state[u.key] >= effMax) return;
  const cLog = u.costLog(n); // 价格权威（log 域，超 double 的价格也可正确判定与扣款）
  if (cmpLT(state.sp, Math.pow(10, cLog), getLogSp(), cLog)) return;
  subSpLog(cLog);
  state[u.key]++;
  checkAchievements(); // A35
  updateSpUI();
  setAutosaveStatus("已购买奇点升级：" + u.name);
}
function buyAU(id) {
  const u = AU_DEFS.flat().find(x => x.id === id);
  if (!u || auOwned(id)) return;
  if (cmpLT(state.sp, u.cost, getLogSp(), Math.log10(u.cost))) return;
  subSpLog(Math.log10(u.cost));
  state.au[id] = 1;
  checkAchievements(); // A35
  updateSpUI();
  setAutosaveStatus("已购买奇点升级：" + u.name);
}

// ---- 效果挂钩 ----
// 可重复升级软上限：有效级别 = 软上限起点 + (n-起点)^power（起点处无缝衔接原线性公式）
function effLevel(n, softcap, power) {
  return n <= softcap ? n : softcap + Math.pow(n - softcap, power);
}
// SAU1：声子升级3上限（有效级别 = floor(10+(n-10)^(1/2))；每级 +2，单圈重整后 +3）
// SAU1：声子升级3上限（单圈重整后软上限：超出 20 基础的部分 = 30+floor(3*(n-10)^0.7)，
// 即 n>10 时 pg3Cap = 50+floor(3*(n-10)^0.7)；未购 VPU1 时上限 10 级、每级 +2）
function pg3Cap() {
  // 量子狂潮免费等级计入（软上限前）
  const n1 = state.sau1 + vpu2FreeLevel();
  if (vpuOwned("vpu1")) {
    if (n1 <= 10) return 20 + 3 * n1;
    return 50 + Math.floor(3 * Math.pow(n1 - 10, 0.7));
  }
  return 20 + 2 * n1;
}
// SAU2：奇点效果指数倍率（有效级别 = 10+(n-10)^(1/3)）
function sauMult() {
  const eff = effLevel(state.sau2, 10, 1 / 3);
  return 1 + eff / 10;
}
// SAU3：热涨落指数（有效级别 = 10+(n-10)^(1/3)；每级 +0.015，单圈重整后 +0.018；量子狂潮免费等级计入）
function thermalExp() {
  const eff = effLevel(state.sau3 + vpu2FreeLevel(), 10, 1 / 3);
  return 0.2 + (vpuOwned("vpu1") ? 0.018 : 0.015) * eff;
}
// AU11：up1 指数加成
function up1Exp() { return auOwned("au11") ? Math.max(1, Math.sqrt(state.up1) / 5) : 1; }
// A53 融合奖励：up1 免费等级（计入效果与「up2 需至少一级升级1」的判定，不计入价格/AU11 指数）
function up1FreeLevel() { return state.ach.normal.includes("A53") ? 1 : 0; }
function getUp1Eff() { return state.up1 + up1FreeLevel(); }
// AU12：pg2 免费等级
function pg2Free() { return auOwned("au12") ? state.pg1 * 2 : 0; }
// AU13：up2 底数加成
function up2Base() { return 2 + (auOwned("au13") ? Math.min(2, Math.log10(1 + state.up2) / 4) : 0); }
// AU14：波长倒数增强声子产生
function invLMult() { return auOwned("au14") ? Math.max(1, Math.pow(10, -0.1 * getLogL10())) : 1; }
// 波长倒数增强声子产生的 log10：max(0, -0.1·logL10)
function invLMultLog() { return auOwned("au14") ? Math.max(0, -0.1 * getLogL10()) : 0; }
// AU41：共轭湮灭——湮灭次数 A 加成奇点效果：×(1+lg(1+A)/3)^(1/2)
function phononSpMult() {
  if (!auOwned("au41")) return 1;
  const base = Math.sqrt(1 + Math.log10(1 + state.annihilations) / 3);
  return vpuOwned("vpu5") ? base * base : base; // VPU5 临界湮灭：共轭湮灭效果 ^2
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
// SBU2 引力潮汐的有效级别（软上限：7+(n-7)^(1/4)；量子狂潮免费等级加在真实等级上、软上限前）
function sbu2Eff() { return effLevel(state.sbu2 + vpu2FreeLevel(), 7, 0.25); }
// SBU3 霍金辐射的有效级别（软上限：10+(n-10)^(1/2)，从原上限 10 起算；免费等级同上）
function sbu3Eff() { return effLevel(state.sbu3 + vpu2FreeLevel(), 10, 0.5); }
// 黑洞基础效果：M^（0.2 + sbu2 有效级别·0.05）（引力潮汐：效果指数 +0.05/级）；返回 double（扭曲状态给时间倍率）
function bhEffect() {
  const mLog = getLogBhMass();
  if (mLog <= 0) return 1;
  const exp = 0.2 + sbu2Eff() * 0.05;
  const effLog = exp * mLog;
  return effLog > 308 ? Infinity : Math.pow(10, effLog);
}
// 黑洞效果 log10（log 域，防溢出）
function bhEffectLog() {
  const mLog = getLogBhMass();
  if (mLog <= 0) return 0;
  const exp = 0.2 + sbu2Eff() * 0.05;
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
// 吸积效率倍率（SBU1 事件视界 ×2/级；AU43 奇点塌缩额外 ×spAccretionMult）——以 log 形式接入 bhAccretionRateLog
// AU43 奇点塌缩：黑洞吸积效率倍率 = (lg(Sp+1) + (Sp+1)^0.01)^3（double 版，显示用；
// totalSp 缓存 Infinity 时返回 Infinity，显示层走 spAccretionMultLog）
function spAccretionMult() {
  if (!auOwned("au43")) return 1;
  const sp1 = 1 + state.totalSp;
  return Math.pow(Math.log10(sp1) + Math.pow(sp1, 0.01), 3);
}
// spAccretionMult 的 log10（log 域：totalSp 缓存 Infinity 时仍正确，不产生污染）
function spAccretionMultLog() {
  if (!auOwned("au43")) return 0;
  // l1 = lg(Sp+1) 的数值本身（totalSp=0 时为 0）
  const spLog = state.totalSp > 0 ? getLogTotalSp() : -Infinity;
  const l1 = spLog === -Infinity ? 0 : logAddLogs(0, spLog);
  // lg( lg(Sp+1) + (Sp+1)^0.01 ) × 3
  return 3 * logAddLogs(Math.log10(Math.max(l1, 1e-300)), 0.01 * l1);
}
// 吸积状态：质量获取速率 log10(dM/dt)。M^0.75 × (F/1e200)^0.01 × accretionMult
// → log = massExp*logM + 0.01*(FLog-200) + accretionMult；massExp 受 SVPU1 加成，
// accretionMult = SBU1 ×2^sbu1 × AU43 奇点塌缩倍率（spAccretionMult）
// 本 tick 的质量获取 Gain（log10）超 1e50 时受软上限：
// 实际获得 = 1e(10n+50) × (Gain/1e(10n+50))^( (15/lg(Gain))^(1/2) )，n 为潮汐撕裂（svpu5）等级
// AU44 监察原理：SBU1 事件视界（×2^sbu1）的加成移动到软上限之后生效
// 虚空里程碑 1「聚合浪潮」：完成至少同时 4 种扭曲生效的虚空。
// 效果：解锁虚空泡沫第二效果（黑洞吸积速率 ×VF^(2/3)，软上限前）并解锁虚空升级（SVU）
function voidMilestone1() { return state.voidBestRules >= 4; }
// 虚空里程碑 2：完成至少同时 7 种扭曲生效的虚空。
// 效果：解锁虚空泡沫第三效果——波速获取速率 ^(1+min(0.2, lg(VF+1)/300))
function voidMilestone2() { return state.voidBestRules >= 7; }
// 虚空里程碑列表（虚空页每个里程碑一个独立格子）
const VOID_MILESTONES = [
  { n: 1, title: "聚合浪潮", need: 4,
    desc: "完成至少同时 4 种扭曲生效的虚空",
    reward: "解锁虚空泡沫第二效果，解锁虚空升级" },
  { n: 2, title: "七重湮灭", need: 7,
    desc: "完成至少同时 7 种扭曲生效的虚空",
    reward: "解锁虚空泡沫第三效果" },
];
// 虚空泡沫第三效果的幂次（未解锁里程碑 2 或无 VF 时为 1，即无影响）
function vfGainExp() {
  if (!voidMilestone2() || !(state.logVoidVF10 > NLOG + 1)) return 1;
  return 1 + Math.min(0.2, lg1FromLog(state.logVoidVF10) / 300);
}
// 吸积的软上限前 Gain（log10）——bhAccretionRateLog 与 bhMassSoftcapped 共用的唯一实现。
// AU44 已购买时不含 SBU1 倍率（SBU1 移到软上限之后乘；软上限未触发时正常生效）。
// 倍率以 log 相加（= 数值相乘），totalSp 超 double 时也不产生 Infinity
function bhAccretionGainLog() {
  const mLog = getLogBhMass();
  const fLog = FLog();
  const sbu1Total = state.sbu1 + vpu2FreeLevel(); // 量子狂潮免费等级与 SBU1 同进退（AU44 时一并移到软上限后）
  const accMultLog = (auOwned("au44") ? 0 : sbu1Total) * Math.log10(2) + spAccretionMultLog();
  // 频率部分（1e2000 处非常硬的软上限）：
  // F<1e2000：(F/1e200)^0.01 → log = 0.01×(FLog−200)
  // F>1e2000：1e18×(F/1e2000)^((0.1/lgF)^0.6) → log = 18+(FLog−2000)×(0.1/FLog)^0.6
  // （F=1e2000 处两式均为 1e18，无缝衔接）
  const freqPartLog = fLog < 2000
    ? 0.01 * (fLog - 200)
    : 18 + (fLog - 2000) * Math.pow(0.1 / fLog, 0.6);
  // 虚空里程碑 1：吸积速率 ×VF^(2/3)（软上限前）
  const vfPart = voidMilestone1() && state.logVoidVF10 > NLOG + 1 ? (2 / 3) * state.logVoidVF10 : 0;
  return clampLog(bhAccretionMassExp() * mLog + freqPartLog + accMultLog + vfPart);
}
function bhAccretionRateLog() {
  const au44 = auOwned("au44");
  const sbu1Total = state.sbu1 + vpu2FreeLevel(); // 事件视界总等级（含量子狂潮免费等级）
  let gainLog = bhAccretionGainLog();
  // 软上限：Gain 超起始点（log50，潮汐撕裂每级 +10 个数量级）的部分缩放：
  // 实际获得 = 1e(10n+50) × (Gain/1e(10n+50))^((15/lg(Gain))^e)——e=1/2；
  // 对偶原理（VPU4）削弱软上限：e=1/3（超出部分保留更多）
  const SOFT = bhMassSoftcapLog();
  if (gainLog > SOFT) {
    const e = vpuOwned("vpu4") ? 1 / 3 : 1 / 2;
    gainLog = clampLog(SOFT + (gainLog - SOFT) * Math.pow(15 / gainLog, e));
  }
  // AU44：SBU1 倍率在软上限之后乘上；软上限未触发时正常生效
  //（否则低增益区间该升级完全无效）
  if (au44 && sbu1Total > 0) gainLog = clampLog(gainLog + sbu1Total * Math.log10(2));
  return gainLog;
}
// 黑洞质量获取是否正受软上限影响（显示提示用）：用与 bhAccretionRateLog 相同的软上限前 Gain
// ---------- 虚空（A52 解锁：多扭曲削弱同时生效的挑战，结算虚空泡沫 VF）----------
// D1-D8 顺序对应扭曲宇宙显示顺序；乘数（热寂100 简洁100 为最高档，狭窄20/定向10 为最低档）
const VOID_MULTIPLIERS = { rigid: 20, expand: 20, directed: 10, cooldown: 16, inflation: 40, adiabatic: 100, narrow: 20, simple: 100 };
const VOID_TARGET_FLOG = 2000; // 挑战目标：频率 ≥ 1e2000 Hz（测试模式）
// 当前虚空配置下的预计 VF（log10；FLog 未达标时返回 NLOG）。
// VF = 8^(N-1)×Π乘数×(F/1e2000)^min(0.0003, √(0.0009/lg(F+1)))
function voidVFLog(fLog) {
  const target = 2000;
  if (fLog < target) return NLOG;
  const N = state.voidRules.length;
  if (N < 1) return NLOG;
  let multLog = (N - 1) * Math.log10(8);
  for (const id of state.voidRules) multLog += Math.log10(VOID_MULTIPLIERS[id] || 1);
  const expo = Math.min(0.0003, Math.sqrt(0.0009 / (fLog + 1)));
  return clampLog(multLog + expo * (fLog - target));
}
// 虚空泡沫写入（log 权威；double 缓存超 double 时置 Infinity，存档为 null 后由 log 回填）
function setVoidVFLog(lg) {
  state.logVoidVF10 = clampLog(lg);
  state.voidVF = state.logVoidVF10 <= NLOG + 1 ? 0
    : (state.logVoidVF10 > 308 ? Infinity : Math.pow(10, state.logVoidVF10));
}
// VF 对虚粒子获取的加成（log10）：×(1+VF^((lg(VF+1)+3)/(4lg(VF+1)+6)))。无 VF 时 0
function vfVPMultLog() {
  const lg = state.logVoidVF10;
  if (!(lg > NLOG + 1)) return 0;
  // lg(VF+1)：VF 在 double 范围内用 double 精确算；超出后 +1 可忽略
  const lgVF1 = lg <= 15 && isFinite(state.voidVF) ? Math.log10(state.voidVF + 1) : lg;
  if (!(lgVF1 > 0)) return 0;
  const e = (lgVF1 + 3) / (4 * lgVF1 + 6);
  const inner = Math.min(lg * e, 300);
  return clampLog(Math.log10(1 + Math.pow(10, inner)));
}
// 进入虚空：湮灭重置后应用选中的削弱集合
function enterVoid(ids) {
  if (!state.ach.normal.includes("A52")) return;
  if (state.voidActive || state.distortActive) return;
  const list = (ids || []).filter(id => DISTORT_UNIVERSES.some(u => u.id === id));
  if (!list.length) return;
  forceAnnihilationReset(0); // 进入即重置（同扭曲进入）
  setPhonons(0);
  state.voidActive = true;
  state.voidRules = list;
  // S26 你才是挑战者：进入所有扭曲生效的虚空
  if (list.length >= DISTORT_UNIVERSES.length && !state.ach.hidden.includes("S26")) {
    grantHidden("S26");
    updateAchievementsUI();
    setAutosaveStatus("隐藏成就达成：你才是挑战者");
  }
  state.narrowPurchases = 0; // 狭窄削弱：进入时购买次数清零
  distortEnterAt = gameNow(); // 膨胀削弱的时间基
  startCooldownRamp(); // 冷却削弱：进入时视为已完全生效（k=0.75）
  state.annStartReal = gameNow();
  state.annStartGame = state.playTime; state.annGameElapsed = 0; state.annGameElapsedLog = NLOG;
  updateDispAnchor();
  applyAnnihilationVisibility();
  renderAll();
  updateVoidUI();
  setAutosaveStatus("已进入虚空（" + list.length + " 个削弱生效）");
}
// 退出虚空：达到 1e2000 Hz 时结算 VF（里程碑式：更高才更新），随后湮灭重置回主宇宙。
// 达成结算时记录里程碑（最大同时生效削弱数）
function exitVoid() {
  if (!state.voidActive) return;
  const fLog = FLog();
  const vfLog = voidVFLog(fLog);
  const achieved = vfLog > NLOG + 1;
  if (achieved && state.voidRules.length > state.voidBestRules) {
    state.voidBestRules = state.voidRules.length;
  }
  const prevVFLog = state.logVoidVF10;
  const improved = achieved && vfLog > prevVFLog;
  if (improved) setVoidVFLog(vfLog);
  state.voidActive = false;
  state.voidRules = [];
  forceAnnihilationReset(0);
  updateDispAnchor();
  applyAnnihilationVisibility();
  renderAll();
  saveGame();
  updateVoidUI();
  setAutosaveStatus(achieved
    ? (improved
      ? "已退出虚空：获得虚空泡沫 ×" + fmtLog(state.logVoidVF10)
      : "已退出虚空：未超过历史最高（" + fmtLog(prevVFLog) + "）")
    : "已退出虚空：未达到 1e2000 Hz，无虚空泡沫");
}
function bhMassSoftcapped() {
  if (!bhUnlocked()) return false;
  return bhAccretionGainLog() > bhMassSoftcapLog();
}
// ---------- 虚空升级（SVU，虚空里程碑 1 解锁；给虚空内的游戏提供加成或削弱虚空惩罚）----------
// lg(X+1) 的精确值（X 以 log10 存储；X≤1e15 用 double 精确算 +1，超出后 +1 可忽略）
function lg1FromLog(lg) {
  if (lg <= NLOG + 1) return 0;
  return lg <= 15 ? Math.log10(Math.pow(10, lg) + 1) : lg;
}
// SVU1 虚空共振等级：由累计投入计算（投入持久，不随虚空重置）
// Level = (lg(Sp投+1)/50+1)(lg(VP投+1)/15+1)(lg(VF投+1)/6+1) − 1
function svu1Level() {
  const sp = lg1FromLog(state.svu1SpLog) / 50 + 1;
  const vp = lg1FromLog(state.svu1VpLog) / 15 + 1;
  const vf = lg1FromLog(state.svu1VfLog) / 6 + 1;
  return sp * vp * vf - 1;
}
// SVU2 能标偏移的等级增速（仅虚空外，每真实秒）：SVU1_level/(1+SVU2_level)^1.5
function svu2GainRate() {
  return svu1Level() / Math.pow(1 + state.svu2Level, 1.5);
}
// SVU1 效果：虚空内波速获取速率的幂次 ^= 1 + min(level/6, √(2·level)/6)（虚空外恒 1）
// SVU1 效果幂次：等级换算的指数（仅依赖等级）；应用与否由调用方按 voidActive 判定
function svu1GainExpRaw() {
  const lv = svu1Level();
  if (lv <= 0) return 1;
  return 1 + Math.min(lv / 6, Math.sqrt(2 * lv) / 6);
}
// 实际应用的幂次：仅虚空内生效（虚空外恒 1，但 UI 仍显示潜在值供预览）
function svu1GainExp() {
  return state.voidActive ? svu1GainExpRaw() : 1;
}
// SVU2 效果 1（内外都生效）：热能超载（svpu4）有效等级加成——虚空内 +2·lg(1+lg(n+1))，
// 虚空外 +lg(1+lg(n+1))（n=SVU2 等级）
function svu2Svpu4Bonus() {
  if (state.svu2Level <= 0) return 0;
  const b = Math.log10(1 + Math.log10(state.svu2Level + 1));
  return state.voidActive ? 2 * b : b;
}
// 热能超载的有效等级（温度软上限缩放指数 1/(n+2) 中的 n；含 SVU2 加成）
function effSvpu4() { return state.svpu4 + svu2Svpu4Bonus(); }
// SVU2 效果 2（仅虚空内）：热寂削弱指数 0.5 → 1/(2+lg(n+1))
function svu2AdiabaticExp() {
  if (!state.voidActive || state.svu2Level <= 0) return 0.5;
  return 1 / (2 + Math.log10(state.svu2Level + 1));
}
// SVU1 填充：每真实秒投入现有 Sp/VP/VF 的 1%（连续复利等效：dt 秒投入 1−0.99^dt）。
// 投入量累计到 svu1SpLog/svu1VpLog/svu1VfLog（log 域），对应资源同步扣减
function svu1FillTick(realDt) {
  if (!state.svu1Filling) return;
  const frac = 1 - Math.pow(0.99, realDt); // dt 秒共投入现有量的 frac（每整秒恰为 1%）
  const takeLog = Math.log10(Math.max(frac, 1e-300));
  // 注意 Sp 的零哨兵是字面 0（非 NLOG）：sp=0 时 getLogSp()=0 会越过哨兵判定，必须显式判 sp>0
  if (state.sp > 0) {
    const spLog = getLogSp();
    state.svu1SpLog = clampLog(logAddLogs(state.svu1SpLog, spLog + takeLog)); // 累计投入 += sp×frac
    subSpLog(spLog + takeLog);                                                // 扣减 sp×frac（保留 1−frac）
  }
  if (state.virtualParticles > 0) {
    const vpLog = getLogVP();
    state.svu1VpLog = clampLog(logAddLogs(state.svu1VpLog, vpLog + takeLog));
    subVPLog(vpLog + takeLog);
  }
  if (state.logVoidVF10 > NLOG + 1) {
    state.svu1VfLog = clampLog(logAddLogs(state.svu1VfLog, state.logVoidVF10 + takeLog)); // 累计投入 += VF×frac
    // Sp/VP 走 sub*Log（语义为「扣减量」）；VF 直接写 log 权威，此处须保留 1−frac 而非扣减 frac
    setVoidVFLog(state.logVoidVF10 + Math.log10(Math.max(1 - frac, 1e-300)));
  }
}
// 虚空升级定义（虚空里程碑 1 解锁）
const SVU_DEFS = [
  { id: "svu1", name: "虚空共振", fill: true,
    desc: "根据累计投入的 Sp、VP、VF 计算等级；虚空内的波速获取速率获得指数加成",
    effect: () => `等级 ${fmt(svu1Level())} · 波速获取 ^${fmt(svu1GainExpRaw())}${state.voidActive ? "" : "（仅虚空内生效）"}\n投入：Sp ${fmtLog(state.svu1SpLog)} · VP ${fmtLog(state.svu1VpLog)} · VF ${fmtLog(state.svu1VfLog)}` },
  { id: "svu2", name: "能标偏移", fill: false,
    desc: "削弱温度的软上限（热能超载有效等级增加），并降低虚空内热寂的惩罚；在虚空外随时间自动增长（虚空内不增长）",
    effect: () => `等级 ${fmt(state.svu2Level)}（虚空外 +${fmt(svu2GainRate())}/s）\n热能超载有效等级 +${fmt(svu2Svpu4Bonus())}${state.voidActive ? " · 热寂削弱指数 " + fmt(svu2AdiabaticExp()) : ""}` },
];
// 脉冲状态：虚粒子获取速率（每秒）= floor(mult × (M^0.1 − 1))；M=1 时自然为 0。返回 log10
function bhVPGainLog() {
  const mLog = getLogBhMass();
  if (mLog <= 0) return NLOG; // M=1 → M^0.1−1 = 0，无获取
  const x = 0.1 * mLog;
  // 大质量时 10^x−1 ≈ 10^x（log ≈ x）；小质量直接算，避免精度损失
  const inner = x > 15 ? x : Math.log10(Math.max(Math.pow(10, x) - 1, 1e-300));
  return clampLog(inner + sbu3Eff() * Math.log10(2) + vfVPMultLog()); // VF 加成
}
// 黑洞升级定义
const SBU_DEFS = [
  { id: "sbu1", key: "sbu1", name: "事件视界", desc: "每级使黑洞吸积效率 ×2", max: Infinity, cost: (n) => Math.pow(1e9, 1) * Math.pow(100, n - 1) },
  { id: "sbu2", key: "sbu2", name: "引力潮汐", desc: "每级使黑洞效果指数 +0.05", max: Infinity, cost: (n) => Math.pow(1e10, 1) * Math.pow(1000, n - 1) },
  { id: "sbu3", key: "sbu3", name: "霍金辐射", desc: "每级使虚粒子获取 ×2", max: Infinity, cost: (n) => Math.pow(1e11, 1) * Math.pow(100, n - 1) },
];
function sbuCostLog(u, n) {
  if (u.id === "sbu1") {
    // 1e9 × 100^(n-1)；超过 12 级后每级额外 ×(n-2)²
    let log = 9 + (n - 1) * 2;
    for (let k = 13; k <= n; k++) log += 2 * Math.log10(k - 2);
    return log;
  }
  if (u.id === "sbu2") {
    // 1e10 × 1000^(n-1)；超过 7 级后每级额外 ×n³
    let log = 10 + (n - 1) * 3;
    for (let k = 8; k <= n; k++) log += 3 * Math.log10(k);
    return log;
  }
  if (u.id === "sbu3") return 11 + (n - 1) * 2;      // 1e11 × 100^(n-1)
  return 0;
}
function buySBU(id) {
  if (!bhUnlocked()) return;
  const u = SBU_DEFS.find(x => x.id === id);
  if (!u) return;
  const n = state[u.key] + 1;
  const cLog = sbuCostLog(u, n); // 价格权威（含超限额外缩放），log 域判定与扣款
  if (cmpLT(state.sp, Math.pow(10, cLog), getLogSp(), cLog)) return;
  subSpLog(cLog);
  state[u.key]++;
  updateBlackholeUI();
  setAutosaveStatus("已购买黑洞升级：" + u.name);
}
// 黑洞虚粒子升级（花 VP，位于黑洞页）
const SVPU_DEFS = [
  { id: "svpu1", key: "svpu1", name: "全息原理", desc: "吸积公式中质量的指数 +0.03/级", max: Infinity, costLog: (n) => 1 + 2 * (n - 1) }, // 10×100^(n-1) VP，每级 ×100（实际上限走 svpu1Max：4 级，对偶原理 VPU4 后无上限）
  { id: "svpu2", key: "svpu2", name: "虚幻湮灭", desc: "获得的湮灭次数×2", max: Infinity, costLog: (n) => Math.log10(3) + (n - 1) * Math.log10(5) },  // 3×5^(n-1) VP
  { id: "svpu3", key: "svpu3", name: "非欧几何", desc: "削弱升级3软上限", max: 3, costLog: (n) => 5 * n - 4 },                  // 10^(5n-4) VP，增速 ×1e5
  { id: "svpu4", key: "svpu4", name: "热能超载", desc: "削弱温度的软上限", max: 3, costLog: (n) => 7 + (n - 1) * 3 },              // 1e7×1000^(n-1) VP
  { id: "svpu5", key: "svpu5", name: "潮汐撕裂", desc: "黑洞质量的软上限起始点每级 +10 个数量级", max: Infinity, costLog: (n) => Math.log10(5e7) + (n - 1) * Math.log10(2000) }, // 5e7×2000^(n-1) VP
];
// 全息原理的实际等级上限（对偶原理 VPU4 后取消：4 → 无上限）
function svpu1Max() { return vpuOwned("vpu4") ? Infinity : 4; }
// 黑洞质量软上限起始点（log10）：1e50 起始，潮汐撕裂每级 +10 个数量级
function bhMassSoftcapLog() { return 50 + 10 * state.svpu5; }
function buySVPU(id) {
  if (!bhUnlocked()) return;
  const u = SVPU_DEFS.find(x => x.id === id);
  if (!u) return;
  const effMax = id === "svpu1" ? svpu1Max() : u.max; // 全息原理：对偶原理后 4 → 无上限
  if (state[u.key] >= effMax) return;
  const n = state[u.key] + 1;
  const cLog = u.costLog(n);
  const c = Math.pow(10, cLog);
  if (cmpLT(state.virtualParticles, c, getLogVP(), cLog)) return;
  subVPLog(cLog);
  state[u.key]++;
  updateBlackholeUI();
  setAutosaveStatus("已购买黑洞升级：" + u.name);
}
// ---------- 虚粒子单次升级（VPU，A45 星标奖励解锁；2×2 方格，花 VP / VPU2 花 VF）----------
// 达成 A45 前整区不可见；解锁条件统一由 vpuUnlocked(id) 判定。
// 已实装 VPU1/2/4/5 四个升级；
// 未达成解锁条件时卡片显示具体达成条件（vpuCondText）
const VPU_DEFS = [
  { id: "vpu1", name: "单圈重整", desc: "加强象限拓张和紫外灾难，并取消等级上限，削弱普朗克温度软上限", cost: 5e10 },
  { id: "vpu2", name: "量子狂潮", desc: "虚粒子给三个黑洞升级和奇点升级象限拓张/紫外灾难提供免费等级，并且加成奇点的效果", cost: 1e6, currency: "vf" },
  { id: "vpu4", name: "对偶原理", desc: "取消全息原理的等级限制，吸积公式的质量指数+0.05，并削弱黑洞质量的软上限", cost: 2e8 },
  { id: "vpu5", name: "临界湮灭", desc: "取消自动湮灭的 CD，并把共轭湮灭的效果变为原来的^2，增加两个虚粒子升级", cost: 1e7 },
];
// VPU 解锁条件：解锁 A45 星标奖励（购买所有奇点升级）后全部可见；
// VPU5 额外要求总挑战时间 < 3s；VPU4 要求黑洞质量达到 1e70 太阳质量。
// 条件「达成一次即永久解锁」（latch 于 state.vpuCondMet，随档保存）：
// 之后即使条件回落（如黑洞质量被脉冲消耗到 1e70 以下）仍保持开放；
// 仅当未来出现比湮灭更高层次的重置时才会清除该记录
// 各扭曲宇宙最佳完成时间之和：有未完成的宇宙时返回 Infinity（+∞ 口径，与统计页一致）
function distortBestSumFinite() {
  let s = 0;
  for (const u of DISTORT_UNIVERSES) {
    const t = state.distortBest[u.id];
    if (!(t > 0)) return Infinity;
    s += t;
  }
  return s;
}
function vpuUnlocked(id) {
  if (!state.ach.normal.includes("A45")) return false;
  if (state.vpuCondMet && state.vpuCondMet.includes(id)) return true;
  let met = false;
  if (id === "vpu5") {
    // 「所有扭曲宇宙最佳完成时间之和 < 3 秒」：未完成的宇宙按 +∞ 计（与统计页口径一致）
    met = distortBestSumFinite() < 3;
  } else if (id === "vpu4") {
    met = getLogBhMass() >= 70;
  } else if (id === "vpu1") {
    met = state.sau1 >= 10 && state.sau3 >= 10; // 象限拓张与紫外灾难均满级
  } else if (id === "vpu2") {
    // 量子狂潮：在虚空中（削弱组合任意）达到 1e7000 Hz；达成一次永久解锁
    met = state.voidActive && FLog() >= 7000;
  }
  if (met) {
    if (!state.vpuCondMet) state.vpuCondMet = [];
    state.vpuCondMet.push(id);
  }
  return met;
}
// 未达成解锁条件的 VPU 显示的具体条件文本（空串 = 无（占位））
function vpuCondText(id) {
  if (state.vpuCondMet && state.vpuCondMet.includes(id)) return "解锁条件已达成";
  if (id === "vpu5") {
    const bestSum = distortBestSumFinite();
    if (bestSum !== Infinity && bestSum < 3) return "解锁条件已达成";
    const done = DISTORT_UNIVERSES.filter(u => state.distortBest[u.id] > 0);
    return "解锁条件：所有扭曲宇宙最佳完成时间之和 < 3 秒（当前 "
      + (done.length === DISTORT_UNIVERSES.length ? bestSum.toFixed(2) + " 秒" : "尚有 " + (DISTORT_UNIVERSES.length - done.length) + " 个宇宙未完成") + "）";
  }
  if (id === "vpu4") {
    const mLog = getLogBhMass();
    if (mLog >= 70) return "解锁条件已达成";
    return "解锁条件：黑洞质量达到 1e70 太阳质量（当前 "
      + (mLog > NLOG + 1 ? fmtLog(mLog) : "1.00") + " M☉）";
  }
  if (id === "vpu2") {
    if (state.voidActive && FLog() >= 7000) return "解锁条件已达成";
    return "解锁条件：在虚空中达到 1e7000 Hz（削弱组合任意，当前 "
      + (state.voidActive ? fmtLog(FLog()) + " Hz" : "不在虚空中") + "）";
  }
  if (id === "vpu1") {
    if (state.sau1 >= 10 && state.sau3 >= 10) return "解锁条件已达成";
    return "解锁条件：象限拓张与紫外灾难均达到满级（当前 " + state.sau1 + "/10、" + state.sau3 + "/10）";
  }
  return "";
}
function vpuOwned(id) { return !!state.au["vpu_" + id]; }
// VPU 花虚粒子 VP（与「虚粒子单次升级」定位一致；占位条目 cost=Infinity 恒不可负担）。
// VPU2 例外：花虚空泡沫 VF（可消耗，扣减当前 voidVF）
function buyVPU(id) {
  if (!bhUnlocked() || !vpuUnlocked(id)) return;
  const u = VPU_DEFS.find(x => x.id === id);
  if (!u || vpuOwned(id)) return;
  if (u.currency === "vf") {
    if (!(state.logVoidVF10 >= Math.log10(u.cost))) return;
    setVoidVFLog(state.logVoidVF10 - Math.log10(u.cost));
  } else {
    const cLog = Math.log10(u.cost);
    if (cmpLT(state.virtualParticles, u.cost, getLogVP(), cLog)) return;
    subVPLog(cLog);
  }
  state.au["vpu_" + id] = 1;
  checkAchievements(); // A51 虚幻：购买第一个虚粒子单次升级
  updateBlackholeUI();
  setAutosaveStatus("已购买黑洞升级：" + u.name);
}
// VPU2 量子狂潮：lg(VP+1) 的数值（VP 超 double 时 +1 可忽略）
function logVp1() {
  const v = getLogVP();
  if (v <= NLOG + 1) return 0;
  return v <= 15 ? Math.log10((state.virtualParticles || 0) + 1) : v;
}
// VPU2 量子狂潮：免费等级（软上限前）=(max(0, lg(VP+1)−10))^0.75。
// 作用于三个黑洞升级（SBU1/2/3）与奇点升级象限拓张/紫外灾难（SAU1/SAU3）
function vpu2FreeLevel() {
  if (!vpuOwned("vpu2")) return 0;
  return Math.pow(Math.max(0, logVp1() - 10), 0.75);
}
// VPU2：奇点效果额外乘数：1 + min(2, lg(max(1, lg(VP+1)))/2)/4
//（乘在所有 (1+总Sp)^指数 类效果上：波速获取、温度上限、普朗克常数倍率）
function vpu2SingMult() {
  if (!vpuOwned("vpu2")) return 1;
  return 1 + Math.min(2, Math.log10(Math.max(1, logVp1())) / 2) / 4;
}
function vpu2SingMultLog() { return vpuOwned("vpu2") ? Math.log10(vpu2SingMult()) : 0; }
// VPU5 临界湮灭效果：自动湮灭无 CD（由 autoAnnCD 调用）；共轭湮灭效果 ^2（由 phononSpMult 调用）
// 吸积质量指数：基础 0.75 + 全息原理 0.03/级 + 对偶原理（VPU4）+0.05
function bhAccretionMassExp() { return 0.75 + 0.03 * state.svpu1 + (vpuOwned("vpu4") ? 0.05 : 0); }
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
    // 虚粒子衰减（分段）：VP<1e10 每秒 ×(9/10)；VP≥1e10 每秒 ÷(lg(VP)/9)
    // （lg=10 处连续：两种公式都是 ÷(10/9)；lg 越大消耗越快）。
    // log 域：÷D 每秒 = logVP -= log10(D)·dt
    const vpLog = getLogVP();
    if (vpLog > NLOG + 1) {
      const rateLog = vpLog > 10 ? Math.log10(Math.max(vpLog / 9, 1e-300)) : Math.log10(10 / 9);
      setVPLog(vpLog - rateLog * dt);
      if (getLogVP() <= NLOG + 1) setVPLog(NLOG); // 衰减到 0 停止
    }
  } else if (state.bhState === "distorl") {
    // 扭曲：无质量变化，无虚粒子（时间倍率由 bhTimeMult 给予）
  } else if (state.bhState === "pulse") {
    // 脉冲质量衰减：M>1e30 时每秒指数 -(1+lg(M)×0.1)（质量越大衰减越快）；
    // M≤1e30 时每秒 ÷10（log 每 -1/秒）。到 M=1（log 0）为止。
    if (mLog > 0) {
      const decayRate = mLog > 30 ? -(1 + mLog * 0.1) : -1;
      const newLog = Math.max(0, mLog + decayRate * dt);
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
let bhBuilt = false, bhRefs = {}, bhStateBtns = [], bhAnimRAF = 0, bhAngle = 0, bhParticles = [], bhVpuSection = null, bhSvpuTopRow = null;

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
    const tt = document.createElement("div"); tt.className = "sau-total";
    const ct = document.createElement("div"); ct.className = "sau-cost";
    btn.append(nm, ds, tt, ct);
    btn.addEventListener("click", () => buySBU(u.id));
    sbuRow.appendChild(btn);
    bhRefs[u.id] = { u, btn, descEl: ds, costEl: ct, totalEl: tt };
  }
  // 虚粒子升级（花 VP）
  list.appendChild(mkTitle("虚粒子升级"));
  // 虚粒子升级（花 VP）。布局：SVPU4/5 居中首行（购买 VPU5 后解锁出现），
  // SVPU1/2/3 在下（两行按钮尺寸一致，各为行宽 1/3）
  const svpuTopRow = mkRow();
  svpuTopRow.classList.add("svpu-top-row");
  list.appendChild(svpuTopRow);
  bhSvpuTopRow = svpuTopRow;
  const svpuRow = mkRow();
  list.appendChild(svpuRow);
  for (const u of SVPU_DEFS) {
    const btn = document.createElement("button");
    btn.className = "sau-btn bh-upg-btn svpu-btn";
    const nm = document.createElement("div"); nm.className = "sau-name"; nm.textContent = u.name;
    const ds = document.createElement("div"); ds.className = "sau-desc";
    const tt = document.createElement("div"); tt.className = "sau-total";
    const ct = document.createElement("div"); ct.className = "sau-cost";
    btn.append(nm, ds, tt, ct);
    btn.addEventListener("click", () => buySVPU(u.id));
    const row = (u.id === "svpu4" || u.id === "svpu5") ? svpuTopRow : svpuRow;
    row.appendChild(btn);
    bhRefs[u.id] = { u, btn, descEl: ds, costEl: ct, totalEl: tt, vp: true };
  }
  // 虚粒子单次升级（2×2 方格，A45 星标奖励解锁；达成 A45 前整区不可见）
  bhVpuSection = document.createElement("div");
  bhVpuSection.appendChild(mkTitle("虚幻升级"));
  const vpuRow = document.createElement("div");
  vpuRow.className = "bh-vpu-grid";
  bhVpuSection.appendChild(vpuRow);
  list.appendChild(bhVpuSection);
  bhVpuSection.classList.toggle("hidden", !state.ach.normal.includes("A45"));
  for (const u of VPU_DEFS) {
    const btn = document.createElement("button");
    btn.className = "sau-btn bh-upg-btn vpu-btn" + (u.currency === "vf" ? " vpu2-card" : "");
    const nm = document.createElement("div"); nm.className = "sau-name"; nm.textContent = u.name;
    const ds = document.createElement("div"); ds.className = "sau-desc";
    const ct = document.createElement("div"); ct.className = "sau-cost";
    btn.append(nm, ds, ct);
    btn.addEventListener("click", () => buyVPU(u.id));
    vpuRow.appendChild(btn);
    bhRefs[u.id] = { u, btn, descEl: ds, costEl: ct, vpu: true };
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
  // 直径比例 = max(0.1, min(0.6, min((lg(M)/800)^0.5, lg(M)/200)))（界面宽度的倍数）；返回半径
  // M=1（lg=0）时取下限 0.1 倍界面宽；先按 lg/200 线性增长、(lg/800)^0.5 在大质量时更缓，
  // 最终在 lg(M)≥288 处封顶 0.6 倍
  const mLog = Math.max(0, getLogBhMass());
  const scale = Math.max(0.1, Math.min(0.6, Math.min(Math.sqrt(mLog / 800), mLog / 200)));
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
      `<div class="bh-stat-row"><span>基础效果</span><span>×${fmtNum(bhEffect(), bhEffectLog())}</span></div>` +
      (bhMassSoftcapped() ? `<div class="bh-softcap-note">黑洞质量获取超过 1e${bhMassSoftcapLog()} 的部分将受到软上限影响</div>` : "");
  }
  bhAnimRAF = requestAnimationFrame(bhAnimLoop);
}

function updateBlackholeUI() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  if (!bhUnlocked()) return;
  buildBlackholeOnce();
  document.getElementById("subtab-blackhole").classList.toggle("hidden", !bhUnlocked());
  // VPU 虚粒子单次升级区：达成 A45「万物」前整区不可见
  if (bhVpuSection) bhVpuSection.classList.toggle("hidden", !state.ach.normal.includes("A45"));
  // SVPU4/5（热能超载/潮汐撕裂）：购买 VPU5 后作为其奖励出现
  if (bhSvpuTopRow) bhSvpuTopRow.classList.toggle("hidden", !vpuOwned("vpu5"));
  // 状态按钮高亮
  for (const b of bhStateBtns) {
    b.classList.toggle("active", b.dataset.bhState === state.bhState);
  }
  // SBU 升级（花 Sp）与 SVPU 升级（花 VP）；VPU 单次升级在下方单独处理
  for (const id in bhRefs) {
    const r = bhRefs[id];
    if (r.vpu) continue; // VPU 走下方专属处理（无 key/max/cost 函数）
    const n = state[r.u.key] + 1;
    const effMax = r.u.id === "svpu1" ? svpu1Max() : r.u.max; // 全息原理：对偶原理后 4 → 无上限
    const maxed = effMax !== Infinity && state[r.u.key] >= effMax;
    let c, cLog, affordable, costStr, resUnit;
    if (r.vp) {
      // SVPU：花 VP
      cLog = r.u.costLog(n);
      c = Math.pow(10, cLog);
      affordable = !maxed && cmpGE(state.virtualParticles, c, getLogVP(), cLog);
      costStr = fmtNum(c, cLog) + " VP";
      resUnit = "VP";
    } else {
      // SBU：花 Sp（价格走 sbuCostLog 权威，与 buySBU 扣款一致，含超限额外缩放）
      cLog = sbuCostLog(r.u, n);
      c = Math.pow(10, cLog);
      affordable = !maxed && cmpGE(state.sp, c, getLogSp(), cLog);
      costStr = fmtNum(c, cLog) + " Sp";
      resUnit = "Sp";
    }
    {
      // 等级显示：量子狂潮免费等级以「+N 免费」并入（仅展示，不影响价格）
      const free = (!r.vp && vpu2FreeLevel() > 0) ? " + " + fmt(vpu2FreeLevel()) + " 免费" : "";
      r.descEl.textContent = r.u.desc + (effMax !== Infinity
        ? "（" + state[r.u.key] + free + "/" + effMax + "）"
        : "（等级 " + state[r.u.key] + free + "）");
    }
    if (r.totalEl) renderTotalEffect(r.totalEl, r.u.id);
    r.costEl.textContent = maxed ? "已满级" : costStr;
    r.btn.disabled = maxed || !affordable;
    r.btn.classList.toggle("bought", maxed);
    r.btn.classList.toggle("affordable", !maxed && affordable);
  }
  // VPU 虚粒子单次升级（花 VP；A45 奖励解锁，各自有解锁条件；达成条件前显示具体条件）
  for (const id in bhRefs) {
    const r = bhRefs[id];
    if (!r.vpu) continue;
    const owned = vpuOwned(r.u.id);
    const unlocked = vpuUnlocked(r.u.id);
    if (!unlocked) {
      // 未解锁：已实装（有解锁条件）的显示「未解锁」+ 条件进度，占位的显示「未开放」
      const isReal = isFinite(r.u.cost); // 实装升级有真实价格，占位为 Infinity
      r.descEl.textContent = vpuCondText(r.u.id) || "（占位）";
      r.costEl.textContent = isReal ? "未解锁" : "未开放";
      if (r.nameEl) r.nameEl.textContent = r.u.name;
      r.btn.disabled = true;
      r.btn.classList.remove("bought");
      r.btn.classList.remove("affordable");
      continue;
    }
    r.descEl.textContent = r.u.desc;
    if (r.nameEl) r.nameEl.textContent = r.u.name;
    if (r.u.currency === "vf") {
      // VPU2：VF 购买；描述附当前免费等级与奇点乘数
      r.descEl.textContent = r.u.desc
        + "\n当前免费等级 +" + fmt(vpu2FreeLevel()) + "/个 · 奇点效果 ×" + fmt(vpu2SingMult());
      const afford = state.logVoidVF10 >= Math.log10(r.u.cost);
      r.costEl.textContent = owned ? "已购买" : fmt(r.u.cost) + " VF";
      r.btn.disabled = owned || !afford;
      r.btn.classList.toggle("bought", owned);
      r.btn.classList.toggle("affordable", !owned && afford);
      continue;
    }
    r.costEl.textContent = owned ? "已购买" : (isFinite(r.u.cost) ? fmt(r.u.cost) + " VP" : "未开放");
    const afford = isFinite(r.u.cost) && cmpGE(state.virtualParticles, r.u.cost, getLogVP(), Math.log10(r.u.cost));
    r.btn.disabled = owned || !afford;
    r.btn.classList.toggle("bought", owned);
    r.btn.classList.toggle("affordable", !owned && afford);
  }
}

// 批量购买上限升级（A34 解锁，位于自动化页）
const BATCH_UPG = { id: "batch", name: "批量购买上限翻倍", desc: "批量购买的每次上限翻倍（初始 2）；打破规则且上限超过 128 后变为「最大购买」", key: "batchLvl", repeat: true, cost: () => Math.pow(20, state.batchLvl) };
// A42 星标奖励：自动湮灭 CD 缩减升级（自动化页，Sp 购买；每级 CD ÷2，最低 25ms）
const ANN_CD_UPG = { id: "annCd", name: "自动湮灭 CD 缩减", desc: "每级使自动湮灭 CD ÷2（最低 25ms，最高 3 级）", key: "autoAnnCDLvl", max: 3, cost: () => Math.pow(100, state.autoAnnCDLvl) * 1e12 };
function buyAnnCDUpgrade() {
  if (!state.ach.normal.includes("A42")) return;
  if (state.autoAnnCDLvl >= ANN_CD_UPG.max) return; // 3 级后 CD 已到 25ms 下限，拒绝购买
  const cost = ANN_CD_UPG.cost();
  if (cmpLT(state.sp, cost, getLogSp(), Math.log10(cost))) return;
  subSpLog(Math.log10(cost));
  state.autoAnnCDLvl++;
  updateAutomationUI();
  setAutosaveStatus("已购买：自动湮灭 CD 缩减");
}
function buyBatchUpgrade() {
  if (!state.ach.normal.includes("A34")) return;
  // 打破规则且上限已超 128（「最大购买」状态）后不可购买
  if (batchLimit() === Infinity) return;
  const cost = BATCH_UPG.cost();
  if (cmpLT(state.sp, cost, getLogSp(), Math.log10(cost))) return;
  subSpLog(Math.log10(cost));
  state.batchLvl++;
  state.batchMax = Math.pow(2, state.batchLvl + 1);
  updateAutomationUI();
  setAutosaveStatus("已购买：批量购买上限翻倍");
}
function buySpUpgrade(id) {
  // spu1 单独处理（已移至 SAU 区）
  if (id === "spu1") {
    if (state.spu1 >= 1) return;
    if (cmpLT(state.sp, 1, getLogSp(), 0)) return;
    subSpLog(0);
    state.spu1 = 1;
    checkAchievements(); // A31
    updateSpUI();
    setAutosaveStatus("已购买湮灭升级");
    return;
  }
  // 其余通用奇点升级条目已迁移至 SAU/AU 区，此处无其他可购项
}

// 湮灭页 UI（build-once, in-place update）
let spBuilt = false, msRefs = [], sauRefs = [], auRefs = {}, spu1Ref = null, vacRef = null;
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
  uList.innerHTML = "";
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
    const tt = document.createElement("div"); tt.className = "sau-total";
    const ct = document.createElement("div"); ct.className = "sau-cost";
    btn.append(nm, ds, tt, ct);
    btn.addEventListener("click", () => buySAU(VACUUM_DEF.id));
    vacRow.appendChild(btn);
    vacRef = { u: VACUUM_DEF, btn, descEl: ds, costEl: ct, totalEl: tt };
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
    const tt = document.createElement("div"); tt.className = "sau-total";
    const ct = document.createElement("div"); ct.className = "sau-cost";
    btn.append(nm, ds, tt, ct);
    btn.addEventListener("click", () => buySAU(u.id));
    sauRow.appendChild(btn);
    sauRefs.push({ u, btn, descEl: ds, costEl: ct, totalEl: tt });
  }
  uList.appendChild(sauRow);
  // AU 单次升级（四组；两组并排，按钮按行交错——AU2n 与 AU1n 同行对齐）
  auRefs = {};
  for (let grp = 0; grp < AU_DEFS.length; grp += 2) {
    const gA = AU_DEFS[grp], gB = AU_DEFS[grp + 1] || [];
    for (let i = 0; i < Math.max(gA.length, gB.length); i++) {
      const rowEl = document.createElement("div");
      rowEl.className = "au-row";
      for (const g of [gA, gB]) {
        const u = g[i];
        if (!u) continue;
        const btn = document.createElement("button");
        btn.className = "au-btn";
        const nm = document.createElement("div"); nm.className = "sau-name"; nm.textContent = u.name;
        const ds = document.createElement("div"); ds.className = "sau-desc";
        const ct = document.createElement("div"); ct.className = "sau-cost";
        btn.append(nm, ds, ct);
        btn.addEventListener("click", () => buyAU(u.id));
        rowEl.appendChild(btn);
        auRefs[u.id] = { u, btn, nameEl: nm, descEl: ds, costEl: ct };
      }
      uList.appendChild(rowEl);
    }
  }
  spBuilt = true;
}
function updateSpUI() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  if (state.annihilations < 1) return;
  buildAnnihilationOnce();
  // 扭曲里程碑：解锁扭曲（20 湮灭）前不可见
  const distortMsVisible = state.annihilations >= 20;
  const dtTitleEl = document.getElementById("distort-ms-title");
  if (dtTitleEl) dtTitleEl.classList.toggle("hidden", !distortMsVisible);
  for (const r of msRefs) {
    if (r.distort) r.row.classList.toggle("hidden", !distortMsVisible);
    // 1DA 描述动态显示当前倍率（仅里程碑自身；总倍率中的奇点凝聚部分单独标注）
    if (r.distort && r.m.n === 1 && r.descEl) {
      r.descEl.textContent = "1 DA：基于扭曲宇宙湮灭数，奇点效果指数 ×" + (1 + Math.log2(1 + distortDA())).toFixed(2)
        + (sauMult() > 1 ? "（另受奇点凝聚 ×" + sauMult().toFixed(2) + "）" : "");
    }
    // 8DA：7DA 前显示 ？？？？？（防剧透），7DA 后显示真实描述（金色）
    // 8DA：7DA 前显示 ？？？？？；7DA 后金色文字（完成前红框、完成后金框全金）
    if (r.distort && r.m.n === 8 && r.descEl) {
      r.row.classList.add("ms-8da");
      if (hasDistortMilestone(7)) {
        r.descEl.textContent = "8 DA：" + r.m.desc;
        r.descEl.classList.add("gold-text");
      } else {
        r.descEl.textContent = "8 DA：？？？？？";
        r.descEl.classList.remove("gold-text");
      }
    }
    const done = r.distort ? hasDistortMilestone(r.m.n) : hasMilestone(r.m.n);
    r.row.classList.toggle("done", done);
    const cur = r.distort ? distortDA() : effAnnihilations();
    r.countEl.textContent = done ? "✓" : (cur + " / " + r.m.n);
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
      const cLog = VACUUM_DEF.costLog(n);
      const c = Math.pow(10, cLog);
      vacRef.descEl.textContent = VACUUM_DEF.desc + "（等级 " + state.sau4 + "）";
      if (vacRef.totalEl) renderTotalEffect(vacRef.totalEl, VACUUM_DEF.id);
      vacRef.costEl.textContent = fmtNum(c, cLog) + " Sp";
      vacRef.btn.disabled = !cmpGE(state.sp, c, getLogSp(), cLog);
      vacRef.btn.classList.toggle("affordable", cmpGE(state.sp, c, getLogSp(), cLog));
    }
  }
  for (const r of sauRefs) {
    r.btn.classList.toggle("hidden", !sauUnlocked);
    if (!sauUnlocked) continue;
    const n = state[r.u.key] + 1;
    const effMax = r.u.max !== Infinity ? effSauMax(r.u.key) : Infinity; // 单圈重整取消 sau1/sau3 上限
    const maxed = state[r.u.key] >= effMax;
    const cLog = r.u.costLog(n); // 价格权威（log 域），c 仅作显示缓存（可超 double → Infinity）
    const c = Math.pow(10, cLog);
    const afford = !maxed && cmpGE(state.sp, c, getLogSp(), cLog);
    {
      // 象限拓张/紫外灾难：量子狂潮免费等级以「+N 免费」并入显示（不影响价格与购买上限）
      const isSau13 = r.u.key === "sau1" || r.u.key === "sau3";
      const free = (isSau13 && vpu2FreeLevel() > 0) ? " + " + fmt(vpu2FreeLevel()) + " 免费" : "";
      r.descEl.textContent = sauDesc(r.u) + (effMax !== Infinity ? "（" + state[r.u.key] + free + "/" + effMax + "）" : "（等级 " + state[r.u.key] + free + "）");
    }
    if (r.totalEl) renderTotalEffect(r.totalEl, r.u.id);
    r.costEl.textContent = maxed ? "已满级" : fmtNum(c, cLog) + " Sp";
    r.btn.disabled = maxed || !afford;
    r.btn.classList.toggle("bought", maxed);
    r.btn.classList.toggle("affordable", afford);
  }
  // AU 单次升级（第 4 组 4DA 前显示 ???，解锁后显示真实内容）
  // AU42 需 6DA、AU43 需 7DA、AU44 需打破多元宇宙规则；其余 au4* 需 4DA
  const au4Unlocked = hasDistortMilestone(4);
  for (const id in auRefs) {
    const r = auRefs[id];
    r.btn.classList.toggle("hidden", !sauUnlocked);
    if (!sauUnlocked) continue;
    const owned = auOwned(id);
    const afford = spAfford(r.u.cost);
    const isAu4 = id.startsWith("au4");
    // 未解锁时名字显示？？？、描述显示解锁条件
    const au42Unlocked = hasDistortMilestone(6);
    const au43Unlocked = hasDistortMilestone(7);
    // AU44：7DA 前始终隐藏（？？？？？），7DA 后以「打破多元宇宙的规则」解锁
    const au44Unlocked = hasDistortMilestone(7) && state.rulesBroken;
    const thisUnlocked = !isAu4 ? true : (id === "au42" ? au42Unlocked : id === "au43" ? au43Unlocked : id === "au44" ? au44Unlocked : au4Unlocked);
    if (isAu4 && !thisUnlocked) {
      r.descEl.textContent = id === "au42" ? "（6DA 解锁）" : id === "au43" ? "（7DA 解锁）" : id === "au44" ? "（打破多元宇宙的规则解锁）" : "（4DA 解锁）";
      if (r.nameEl) r.nameEl.textContent = "？？？";
    } else if (id === "au13") {
      // AU13 光子共振：实时显示当前 up2 底数
      r.descEl.textContent = r.u.desc + "（当前底数 " + up2Base().toFixed(3) + "）";
      if (r.nameEl) r.nameEl.textContent = r.u.name;
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
  if (auOwned("au43")) rows.push(["黑洞吸积效率倍率", "×" + fmtNum(spAccretionMult(), spAccretionMultLog())]);
  rows.push(["当前宇宙普朗克温度", fmtNum(temperatureCap(), temperatureCapLog()) + " K"]);
  panel.innerHTML = "";
  for (const [label, value] of rows) {
    const row = document.createElement("div"); row.className = "spb-row";
    const l = document.createElement("span"); l.className = "spb-label"; l.textContent = label;
    const v = document.createElement("span"); v.className = "spb-value"; v.textContent = value;
    row.append(l, v);
    panel.appendChild(row);
  }
  // 温度上限软上限提示：原上限超 1e250 且未打破规则时显示（亮红）
  {
    const expS = hasDistortMilestone(1) ? 10 * daExpMult() : 10;
    const rawLogCap = (getLogTotalSp() > 250 ? expS * getLogTotalSp() : expS * Math.log10(1 + state.totalSp)) + Math.log10(T_P0);
    if (rawLogCap > 250 && !state.rulesBroken) {
      const warn = document.createElement("div");
      warn.className = "spb-warning";
      warn.textContent = "多元宇宙的规则正在阻止你获取更高的温度";
      panel.appendChild(warn);
    }
  }
  // 8DA 打破规则按钮：奇点页顶部居中（红→金）
  {
    const brBtn = document.getElementById("break-rules-btn");
    if (brBtn) {
      brBtn.classList.toggle("hidden", !hasDistortMilestone(8));
      brBtn.classList.toggle("broken", state.rulesBroken);
      brBtn.textContent = state.rulesBroken ? "恢复多元宇宙的规则" : "打破多元宇宙的规则";
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
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
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
  // 拒绝 Infinity（如 1e999）与负数：作为非法输入返回 NaN，由调用方保持原值
  if (!isFinite(v) || v < 0) return NaN;
  return v;
}
// 批量上限：初始 2，奇点升级每级翻倍；打破规则且 >128 时无限制（最大购买）
function batchLimit() {
  if (state.rulesBroken && state.batchMax > 128) return Infinity;
  return state.batchMax;
}
function updateAutomationUI() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
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
      if (unlocked && !r.inputEl.classList.contains("hidden") && document.activeElement !== r.inputEl) {
        // 数值以 AeB 字符串形式显示（如 1e12），小数原样显示
        const v = r.def.input.value();
        r.inputEl.value = (v >= 1e6 ? v.toExponential(6).replace("e+", "e").replace(/\.?0+e/, "e") : v);
      }
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
        if (limit === Infinity && state.batchMode[key]) {
          // 最大购买（开启状态）
          r.batchBtn.textContent = "最大购买";
          r.batchBtn.className = "batch-btn max";
        } else if (limit === Infinity && !state.batchMode[key]) {
          // 最大购买能力下的单次购买模式（点击可切回最大购买）
          r.batchBtn.textContent = "单次购买";
          r.batchBtn.className = "batch-btn single";
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
      const maxBuy = batchLimit() === Infinity; // 打破规则且 >128：已是最大购买，不可再买
      batchRefs.row.classList.toggle("affordable", !maxBuy && spAfford(BATCH_UPG.cost()));
      batchRefs.costEl.textContent = maxBuy
        ? "已达到最大购买（上限无限制）"
        : fmtNum(BATCH_UPG.cost(), Math.log10(BATCH_UPG.cost())) + " Sp（等级 " + state.batchLvl + "）";
      batchRefs.btn.textContent = maxBuy ? "最大购买中" : "购买";
      batchRefs.btn.disabled = maxBuy || !spAfford(BATCH_UPG.cost());
    }
  }
  // 自动湮灭 CD 缩减升级卡（A42 解锁）
  if (annCDRefs) {
    const unlocked = state.ach.normal.includes("A42");
    annCDRefs.row.classList.toggle("hidden", !unlocked);
    if (unlocked) {
      const maxed = state.autoAnnCDLvl >= ANN_CD_UPG.max;
      annCDRefs.row.classList.toggle("affordable", !maxed && spAfford(ANN_CD_UPG.cost()));
      annCDRefs.costEl.textContent = maxed
        ? "已满级（当前 CD " + autoAnnCD() + "ms）"
        : fmtNum(ANN_CD_UPG.cost(), Math.log10(ANN_CD_UPG.cost())) + " Sp（等级 " + state.autoAnnCDLvl + "，当前 CD " + autoAnnCD() + "ms）";
      annCDRefs.btn.textContent = maxed ? "已满级" : "购买";
      annCDRefs.btn.disabled = maxed || !spAfford(ANN_CD_UPG.cost());
    }
  }
}

// 每帧自动购买/自动湮灭逻辑（游戏时间）
// 注意：即使 spu1 已购（购买免费），自动化仍以"资源达到价格"为触发条件，
// 防止免费升级被自动化每 tick 无限购买导致指数爆炸；手动购买不受此限制。
// 批量执行：mode 下每 tick 最多买 batchLimit() 次（单次=1）
// batchLimit() 返回 Infinity 时（打破规则且 >128）封顶 256 防止死循环
function autoBuyTimes(key) {
  if (state.ach.normal.includes("A34") && state.batchMode[key]) {
    const lim = batchLimit();
    return lim === Infinity ? 256 : lim;
  }
  return 1;
}
// 自动湮灭统一入口：所有模式判断与时间戳更新集中在此（tick 与 rAF 共用，防双执行）
function autoAnnTick() {
  if (state.voidActive) return; // 虚空挑战：禁用自动湮灭
  if (state.annihilations < 1 || !state.autoOn.ann || !state.autoAnn) return;
  if (inDistort("narrow")) return;
  if (state.distortActive) {
    // 扭曲宇宙：达标即自动湮灭该宇宙（无 CD——「能湮灭时尽快湮灭」为承诺行为）。
    // 防正反馈说明：湮灭后回到主宇宙，主宇宙侧的 autoAnnCD 与 Sp 阈值仍生效，
    // 自动化不会自动再进入扭曲宇宙，故不会无 CD 连环
    if (annihilationReady()) doAnnihilation();
    return;
  }
  if (auOwned("au22") && state.autoAnnMode === "time") {
    // 时间模式：距上次自动湮灭超过设定真实秒且达标
    if (gameNow() - state.lastAutoAnnAt >= state.autoAnnInterval * 1000 && annihilationReady()) {
      if (doAnnihilation()) state.lastAutoAnnAt = gameNow();
    }
  } else if (gameNow() - state.lastAutoAnnAt >= autoAnnCD() && annihilationReady() && spGainExact() >= state.autoAnnSp) {
    // Sp 模式：CD 防抖（基础 1s，A42 星标 200ms，A44 升级进一步缩减，最低 25ms）
    if (doAnnihilation()) state.lastAutoAnnAt = gameNow();
  }
}
// 自动湮灭 CD（ms）：基础 1000ms；A42 星标奖励 200ms；A42 解锁的升级每级 ÷2，最低 25ms
function autoAnnCD() {
  if (vpuOwned("vpu5")) return 0; // VPU5 临界湮灭：取消自动湮灭 CD
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
    // 防御：购买被宇宙规则拒绝或 spu1 免费但价格达标不变化时，不会因 n=∞ 死循环
    for (let i = 0; i < n; i++) { const lv = state.up1; if (cmpGE(F(), up1Cost(), FLog(), up1CostLog())) buyUp1(); else break; if (state.up1 === lv) break; }
    for (let i = 0; i < n; i++) { const lv = state.up2; if (cmpGE(F(), up2Cost(), FLog(), up2CostLog())) buyUp2(); else break; if (state.up2 === lv) break; }
  }
  if (state.autoOn.phonon && state.autoPhononUpg && state.phUnlocked) {
    const n = autoBuyTimes("phonon");
    for (let i = 0; i < n; i++) { const lv = state.pg1; if (cmpGE(F(), pg1Cost(), FLog(), pg1CostLog())) buyPG1(); else break; if (state.pg1 === lv) break; }
    for (let i = 0; i < n; i++) { const lv = state.pg2; if (cmpGE(state.phonons, pg2Cost(), getLogPhonons(), pg2CostLog())) buyPG2(); else break; if (state.pg2 === lv) break; }
    for (let i = 0; i < n; i++) { const lv = state.pg3; if (state.pg3 < pg3Cap() && cmpGE(state.phonons, pg3Cost(), getLogPhonons(), pg3CostLog())) buyPG3(); else break; if (state.pg3 === lv) break; }
  }
  if (state.autoOn.up3 && state.autoUp3 && up3Card) {
    if (auOwned("au21") && state.autoUp3Mode === "time") {
      // 时间模式：距上次自动升级3超过设定秒数即触发（仍需 F 超过峰值，log 域比较）
      if (gameNow() - state.lastAutoUp3At >= state.autoUp3Interval * 1000 && FLog() > getLogUp3LastF()) {
        if (buyUp3()) state.lastAutoUp3At = gameNow();
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
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
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
  // log 域外推：U ≈ U + (g·timeRate)·dt。log10(|g·dt|) = gainRateLog + log10(timeRate) + log10(dt)。
  // timeRate 超 double 时 Math.log10(timeRate())=Infinity——必须走 timeRateLog（log 域权威）
  const gr = gainRateLog();
  const trLogD = timeRateLog();
  const gdLog = gr.log + trLogD + Math.log10(Math.max(dt, 1e-300));
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
  const trLogD = timeRateLog();
  const gdLog = gr.log + trLogD + Math.log10(Math.max(dt, 1e-300));
  return logAddLogs(dispUBaseLog, gdLog);
}
function renderFast() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  // 膨胀宇宙下 distortLMod 可能超 double：借用 F() 的 log 域逻辑（此处用外推 U）
  let f, fLog;
  const ml3 = distortLModLog();
  // 哨兵感知：U=0（零哨兵 NLOG）时 F 无意义，fLog 保持 NLOG（显示为 0）——
  // 直接相减会产生 NLOG-logL10 哨兵噪声，被显示层渲染成 e-9999999xx
  const uLogD = extrapolatedULog();
  if (uLogD <= NLOG + 1) {
    fLog = NLOG;
    f = 0;
  } else if (ml3 > 0) {
    fLog = clampLog(uLogD - getLogL10() - ml3);
    f = fLog > 308 ? Infinity : (fLog < -308 ? 0 : Math.pow(10, fLog));
  } else {
    fLog = clampLog(uLogD - getLogL10());
    f = (isFinite(extrapolatedU()) && state.L > 0) ? extrapolatedU() / state.L : Math.pow(10, fLog);
  }
  // F 显示：超 double 走 fmtLog（1eN），否则 fmt（现状）
  document.getElementById("freq-value").textContent = fmtNum(f, fLog);
  // Hz/s 显示：膨胀宇宙需除以含倍率的有效波长（log 域防溢出）
  {
    const grD = gainRateLog(); // 单次调用：符号与数值同源（定向宇宙符号为确定性时间窗）
    const gLog = grD.log <= NLOG + 1
      ? NLOG
      : clampLog(grD.log + timeRateLog() - getLogL10() - distortLModLog());
    const gainHz = gLog > 308 ? Infinity : (gLog < -308 ? 0 : Math.pow(10, gLog));
    // 定向宇宙负增益必须带 "-"（历史上只输出了 "+"，负值显示成无符号正值）
    document.getElementById("freq-gain").textContent =
      (gLog > NLOG + 1 ? (grD.sign > 0 ? "+" : "-") : "") + fmtNum(gainHz, gLog) + " Hz/s";
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
    trEl.textContent = "当前游戏速率：×" + fmtNum(timeRate(), timeRateLog());
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
    scNote.textContent = "当频率超过 1e100 Hz 时，升级的价格和效果将被软上限";
  }
  // U 显示：超 double 走 fmtLog（外推 U 的 log 权威）
  document.getElementById("u-value").textContent = fmtNum(Math.abs(extrapolatedU()), extrapolatedULog());
  // 波长显示：超 double（logL10 < -308）走 fmtLog（1eN 带尾数）；膨胀宇宙用 log 域（倍率可能超 double）
  const ml2 = distortLModLog();
  document.getElementById("l-value").textContent = ml2 > 0
    ? fmtLog(getLogL10() + ml2)
    : fmtNum(Math.pow(10, getLogL10()), getLogL10());
}
function renderWave() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  renderFast();
  updateUpgradesUI();
}

function renderStats() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  // 游戏时间超 double 时（playTime=MAX_VALUE）走 playTimeLog 的 log 域显示
  document.getElementById("stat-playtime").textContent = fmtTimeLog(state.playTime, state.playTimeLog);
  document.getElementById("stat-realtime").textContent = fmtTime(state.realTime);
  document.getElementById("stat-total").textContent = fmtNum(state.totalFGained, getLogTotalF()) + " Hz";
  document.getElementById("stat-maxf").textContent = fmtNum(state.maxF, getLogMaxF()) + " Hz";
  document.getElementById("stat-maxu").textContent = fmtNum(state.maxU, getLogMaxU()) + " m/s";
  document.getElementById("stat-minl").textContent = fmtNum(state.minL, getLogMinL()) + " m";
  document.getElementById("stat-ach-n").textContent = `${state.ach.normal.length} / ${NORMAL_ACH.length}`;
  document.getElementById("stat-ach-h").textContent = `${state.ach.hidden.length} / ${HIDDEN_ACH.length}`;
  document.getElementById("stat-timerate").textContent = "×" + fmtNum(timeRate(), timeRateLog());
  // 湮灭统计
  const annReal = state.annihilations >= 1 ? (Date.now() - state.annStartReal) / 1000 : 0;
  const annGame = state.annihilations >= 1 ? (state.annGameElapsed || (state.playTime - state.annStartGame)) : 0;
  // 游戏侧时长超 double 时（annGameElapsed=MAX_VALUE）走 annGameElapsedLog 显示
  document.getElementById("stat-ann-time").textContent =
    state.annihilations >= 1 ? `${fmtTime(annReal, true)} / ${fmtTimeLog(annGame, state.annGameElapsedLog)}` : "— / —";
  document.getElementById("stat-ann-total-sp").textContent = fmtNum(state.totalSp, getLogTotalSp());
  // bestSp/bestRate 都走 log 权威显示（超 double 的值 fmtNum 双参会失效）：double 缓存
  // 仅在 log 权威无有效值时作参考；double 缓存为 Infinity（旧档污染）时显示拐点口径
  const bestSpLog = (state.annBestSpLog !== undefined && typeof state.annBestSpLog === "number" && isFinite(state.annBestSpLog) && state.annBestSpLog > NLOG + 1)
    ? state.annBestSpLog : ((state.annBestSp > 0 && isFinite(state.annBestSp)) ? Math.log10(state.annBestSp) : NLOG);
  const bestRateLog = (state.annBestRateLog !== undefined && typeof state.annBestRateLog === "number" && isFinite(state.annBestRateLog) && state.annBestRateLog > NLOG + 1)
    ? state.annBestRateLog : ((state.annBestRate > 0 && isFinite(state.annBestRate)) ? Math.log10(state.annBestRate) : NLOG);
  const bestSpText = (bestSpLog > NLOG + 1) ? fmtLog(bestSpLog) : ((state.annBestSp > 0 && isFinite(state.annBestSp)) ? fmt(state.annBestSp) : "0");
  const bestRateText = (bestRateLog > NLOG + 1) ? fmtLog(bestRateLog) : ((state.annBestRate > 0 && isFinite(state.annBestRate)) ? fmt(state.annBestRate) : "0");
  document.getElementById("stat-ann-best-sp").textContent = bestSpText + " Sp";
  document.getElementById("stat-ann-best-rate").textContent = bestRateText + " Sp/分";
  document.getElementById("stat-ann-fastest").textContent = state.annFastest > 0 ? fmtTime(state.annFastest) : "—";
  document.getElementById("stat-ann-count").textContent = fmt(effAnnihilations());
  document.getElementById("stat-ann-tp").textContent = fmtNum(Math.pow(10, Math.min(effectiveCapLog(), 308)), effectiveCapLog()) + " K";
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
    // 总和行：各宇宙最佳完成时间之和（而非历史累计 distortTotal）
    const sumRow = document.createElement('div');
    sumRow.className = 'stat-row';
    const sumLabel = document.createElement('span'); sumLabel.className = 'stat-label';
    sumLabel.textContent = '所有挑战时间之和';
    const sumVal = document.createElement('span'); sumVal.className = 'stat-value';
    // 所有宇宙都已湮灭才显示总和；否则视为未定（+∞）
    const allDone = DISTORT_UNIVERSES.every(u => state.distortBest[u.id]);
    const bestSum = DISTORT_UNIVERSES.reduce((s, u) => s + (state.distortBest[u.id] || 0), 0);
    sumVal.textContent = allDone ? fmtTime(bestSum, true) : "+∞";
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
      // gameDur 可能是 dtOverDouble 封顶的 MAX_VALUE：按 log(秒)−log(86400) 显示 eNd 天
      const gdHuge = !(r.gameDur > 0 && isFinite(r.gameDur) && r.gameDur < 86400 * 1e4);
      const durText = gdHuge
        ? (() => { const dLog = Math.log10(Math.max(r.gameDur, 1e-300)) - Math.log10(86400); return (10 ** (dLog - Math.floor(dLog))).toFixed(3) + "e" + Math.floor(dLog) + "d"; })()
        : fmtTime(r.gameDur);
      label.textContent = `${r.label} · ${fmtTime(r.realDur)}（真实）/ ${durText}（游戏）`;
      const val = document.createElement("span"); val.className = "ah-val";
      // sp/rate 显示完全由 log 值驱动（新记录存 spLog/rateLog 权威，可超 double）：
      // 优先 log 权威；旧记录无此字段时从 sp/rate 重建（非有限值按拐点口径归位）。
      // 统一 fmtLog 显示，规避 isFinite(null)===true 走 fmt(null)="0" 的陷阱
      const spLog = (r.spLog !== undefined && typeof r.spLog === "number" && isFinite(r.spLog)) ? r.spLog
        : (r.sp > 0 && isFinite(r.sp)) ? Math.log10(r.sp)
        : (isFinite(r.sp) ? ((r.sp > 0) ? Math.log10(r.sp) : NLOG) : Math.log10(1.79e308));
      const rateLog = (r.rateLog !== undefined && typeof r.rateLog === "number" && isFinite(r.rateLog)) ? r.rateLog
        : (r.rate > 0 && isFinite(r.rate)) ? Math.log10(r.rate)
        : (isFinite(r.rate) ? ((r.rate > 0) ? Math.log10(r.rate) : NLOG) : Math.log10(1.79e308));
      const spText = (spLog > NLOG + 1) ? fmtLog(spLog) : "0";
      const rateText = (rateLog > NLOG + 1) ? fmtLog(rateLog) : "0";
      val.textContent = `${spText} Sp · ${rateText} Sp/分`;
      row.append(label, val);
      hList.appendChild(row);
    }
  }
}

function renderAll() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  applyPhononVisibility(); renderWave(); updatePhononUI(); renderStats(); renderSlots(); updateAchievementsUI(); updateDistortUI(); updateBlackholeUI();
}
function setAutosaveStatus(msg) {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  document.getElementById("autosave-status").textContent = msg;
}

// ---------- 成就弹窗系统（左上角，堆叠+补位动画）----------
function showAchPopup(name, isHidden) {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
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
  { id: "A12", name: "协同", desc: "购买第一个单次升级", check: () => state.meta1 >= 1 || state.phUnlocked >= 1 },
  { id: "A13", name: "超声", desc: "到达 20000 Hz", check: () => F() >= 20000 },
  { id: "A14", name: "效率", desc: "第一次缩短波长", check: () => state.up3 >= 1 },
  { id: "A15", name: "计算", desc: "到达 1 GHz", check: () => F() >= 1e9 },
  // 第 2 行 (A21-A25) 声子
  { id: "A21", name: "热学", desc: "启动声子发生器", star: true, reward: "up1 的效果变为 1.5 次方", check: () => !!state.phOn },
  { id: "A22", name: "室温", desc: "到达 300 K", check: () => temperature() >= 300 },
  { id: "A23", name: "耦合", desc: "购买声波耦合", check: () => state.phCoupling >= 1 },
  { id: "A24", name: "聚变", desc: "到达 1.5e7 K", check: () => temperature() >= 1.5e7 },
  { id: "A25", name: "湮灭", desc: "达到普朗克温度（1.417e32 K）", star: true, reward: "各个重置后波速为 100 m/s", check: () => state.annihilations >= 1 },
  // 第 3 行 (A31-A35) 湮灭
  { id: "A31", name: "创生", desc: "购买第一个湮灭升级", check: () => state.spu1 >= 1 },
  { id: "A32", name: "QoL", desc: "获得所有自动化", check: () => state.autoWaveUpg && state.autoPhononUpg && state.autoUp3 && state.autoAnn },
  { id: "A33", name: "扭曲", desc: "解锁扭曲选项卡", check: () => state.annihilations >= 20 },
  { id: "A34", name: "秩序", desc: "湮灭一个被扭曲的宇宙", star: true, reward: "解锁批量购买", check: () => state.distortDone.length >= 1 },
  { id: "A35", name: "刻写", desc: "购买第一个奇点升级", check: () => (state.sau1 + state.sau2 + state.sau3 + state.sau4 > 0) || Object.keys(state.au).length > 0 },
  // 第 4 行 (A41-A45) 奇点
  { id: "A41", name: "视界", desc: "解锁黑洞", star: true, reward: "总时间倍率再 ^1.1", check: () => bhUnlocked() },
  { id: "A42", name: "烂柯", desc: "总时间倍率超过 3.65e5", star: true, reward: "自动湮灭 CD 变为 200ms，并解锁一个新的自动化升级", check: () => timeRate() >= 3.65e5 },
  { id: "A43", name: "无限", desc: "打破多元宇宙的规则", check: () => state.rulesBroken && !state.testBreakRules }, // 原 A35
  { id: "A44", name: "永炽", desc: "温度超过 1.79e308 K", check: () => temperature() >= 1.79e308 },
  { id: "A45", name: "万物", desc: "购买所有奇点升级", star: true, reward: "解锁虚幻升级", check: () => ALL_SP_UPGRADES_OWNED() },
  // 第 5 行 (A51-…) 虚粒子
  { id: "A51", name: "虚幻", desc: "购买第一个虚幻升级", check: () => VPU_DEFS.some(u => vpuOwned(u.id)) },
  { id: "A52", name: "超载", desc: "达到 1e50 Sp", star: true, reward: "解锁“虚空”选项卡", check: () => getLogTotalSp() >= 50 },
  { id: "A53", name: "融合", desc: "完成至少两种扭曲的虚空", star: true, reward: "up1 获得免费等级 1（重置不清零）", check: () => state.voidBestRules >= 2 },
  { id: "A54", name: "混沌", desc: "完成所有扭曲生效的虚空", check: () => state.voidBestRules >= 8 },
  { id: "A55", name: "卷缩", desc: "达到 1.79e308 奇点", check: () => getLogSp() >= SP_SOFTCAP_PIVOT_LOG },
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
  { id: "S10", name: "歪了", check: () => false }, // 点击S2时每次有0.3%概率获得
  { id: "S11", name: "踌躇不决", check: () => false }, // 达到当前普朗克温度后五分钟不湮灭
  { id: "S12", name: "就你特殊？？！！", check: () => false }, // 点击QoL成就按钮10次
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
  { id: "S24", name: "你变秃了，也变强了", check: () => false }, // 一天（当日窗口）内 rua 摆线 200 次
  { id: "S25", name: "这是旮旯给木吗？", check: () => false }, // 好感度达到 500
  { id: "S26", name: "你才是挑战者", check: () => false }, // 进入所有（8 种）扭曲生效的虚空
];
// S5 目标序列：S1,S1,S4,S5,S1,S4
const S5_SEQUENCE = ["S1", "S1", "S4", "S5", "S1", "S4"];
// A45 万物：是否拥有所有奇点升级（spu1、SAU1-3、真空衰变、全部 16 个 AU）
function ALL_SP_UPGRADES_OWNED() {
  if (state.spu1 < 1) return false;
  if (state.sau1 < 1 || state.sau2 < 1 || state.sau3 < 1 || state.sau4 < 1) return false;
  // 所有单次奇点升级（AU 全系列）——未实装的 cost=Infinity 永远无法购买，
  // 故 A45 在全部实装并购买后才能达成
  return AU_DEFS.flat().every(u => auOwned(u.id));
}

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

  // S12：就你特殊？？！！ —— 点击 QoL（A32）成就单元格 10 次
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
let normalRowEls = [];
let hiddenCellRefs = [];

function buildAchievementsOnce() {
  if (achBuilt) return;
  const grid = document.getElementById("normal-ach-grid");
  grid.innerHTML = "";
  normalCellRefs = [];
  normalRowEls = [];
  // 已定义行 + 1 行锁定行（展示 ??? 结构）。
  // 每个逻辑行包进独立的 .ach-row 行容器：手机窄屏时一行 5 个拆成 3+2 居中，
  // 不同逻辑行的成就永远不会混到同一视觉行。
  for (let r = 0; r < NORMAL_ROWS + 1; r++) {
    const rowEl = document.createElement("div");
    rowEl.className = "ach-row";
    grid.appendChild(rowEl);
    normalRowEls[r] = rowEl;
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
        // 「//」原意是换行：第一行成就编号，第二行奖励描述。
        // 行解锁后即可点击查看奖励（无需完成该成就）
        tipEl.textContent = a.id + "\n" + a.reward;
        cell.addEventListener("click", () => {
          if (!isRowUnlocked(r)) return; // 未解锁行不可点
          cell.classList.toggle("show-tip");
        });
      }
      // S12：就你特殊？？！！ —— 点击 QoL（A32）成就单元格 10 次
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
  // 行显示过滤选项（勾选状态随存档保存，值同步在 updateAchievementsUI）
  const lk = document.getElementById("ach-hide-locked");
  const dn = document.getElementById("ach-hide-done");
  lk.addEventListener("change", () => {
    state.settings.hideLockedRows = lk.checked;
    saveGame();
    updateAchievementsUI();
  });
  dn.addEventListener("change", () => {
    state.settings.hideDoneRows = dn.checked;
    saveGame();
    updateAchievementsUI();
  });
  achBuilt = true;
}

function updateAchievementsUI() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  buildAchievementsOnce();
  // 成就页只显示成就本身的乘数（1.1 或 1.2/个），不含时间之矢/成就刻印以外的升级、黑洞与 A41 加成
  document.getElementById("ach-time-rate").textContent = `你的成就将时间速率变为原来的${fmt(Math.pow(achTimeBase(), state.ach.normal.length))}倍`;
  // 行显示过滤：未解锁行默认整体隐藏（勾选项可改回 ??? 占位），已完成行可选隐藏
  const lk = document.getElementById("ach-hide-locked");
  const dn = document.getElementById("ach-hide-done");
  lk.checked = state.settings.hideLockedRows !== false;
  dn.checked = !!state.settings.hideDoneRows;
  for (let r = 0; r < NORMAL_ROWS + 1; r++) {
    const defs = NORMAL_ACH.slice(r * ACH_PER_ROW, (r + 1) * ACH_PER_ROW);
    const unlocked = isRowUnlocked(r);
    const done = defs.length > 0 && defs.every(a => state.ach.normal.includes(a.id));
    let visible = true;
    if (lk.checked && !unlocked) visible = false;
    if (dn.checked && done) visible = false;
    if (normalRowEls[r]) normalRowEls[r].style.display = visible ? "" : "none";
  }
  // 普通成就：行解锁即显示真实名字与星标，奖励可点击查看（无需完成）
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
    starEl.style.display = a.star ? "" : "none";
    idEl.style.display = ""; idEl.textContent = a.id;
    nameEl.style.display = ""; nameEl.textContent = a.name;
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
      lockEl.style.display = ""; lockEl.textContent = "???";
    }
  }
}

// ---------- 离线进度（加载存档时粗步长模拟生产与自动化）----------
// 上次保存距现在超过 60s 即结算；时长上限 8h；设置页可整体关闭。
// 模拟复用 applyProduction + runAutomation（与在线共用公式），经虚拟时钟推进
const OFFLINE_MIN_SEC = 60;
const OFFLINE_CAP_SEC = 8 * 3600;
// 加载点调用：在覆盖 state.lastTick 之前记录离线时长（开关关闭/时钟异常/过短则跳过）
function queueOfflineProgress() {
  pendingOffline = null;
  const raw = (Date.now() - state.lastTick) / 1000;
  if (state.settings.offlineEnabled === false || !isFinite(raw) || raw < OFFLINE_MIN_SEC) return;
  pendingOffline = { raw, capped: Math.min(raw, OFFLINE_CAP_SEC) };
}
// log 差值 b−a（b 为零哨兵按无增量处理；a 为零哨兵时增量即 b）
function offlineLogDiff(a, b) {
  if (b <= NLOG + 1) return -Infinity;
  if (a <= NLOG + 1) return b;
  return b - a;
}
// 粗步长模拟：每步推进虚拟时钟 → 生产累积 → 自动化（含自动湮灭）。
// simActive 使全部 UI/保存函数早退，模拟中途不触碰 DOM 与 localStorage
function runOfflineSimulation(cappedSec) {
  const res = {
    uLog0: getLogU10(), ph0: getLogPhonons(), m0: getLogBhMass(), vp0: getLogVP(),
    sp0: getLogSp(), phAbs0: state.phonons, ann0: state.annihilations, simmed: false,
  };
  // 模拟期间 gameNow() = Date.now() + offset，自动化写入的时间戳（lastAutoAnnAt 等）
  // 会带上虚拟偏移；模拟结束后须把这些字段平移回现实时间线，否则 CD 计时
  // （gameNow() - lastAutoAnnAt）为负、自动湮灭卡死直至现实时间追上（最长 8h）
  const simStartReal = Date.now();
  const tsBefore = snapshotSimTimestamps();
  simActive = true;
  try {
    // 目标约 800 步：8h → 步长 36s；短离线步长收敛到 1s。步长内自动化至多触发一次（保守方向）
    const step = Math.max(1, Math.min(60, cappedSec / 800));
    let remaining = cappedSec;
    while (remaining > 1e-9) {
      const dt = Math.min(step, remaining);
      simTimeOffset += dt * 1000;
      applyProduction(dt);
      runAutomation();
      remaining -= dt;
    }
    res.simmed = true;
  } catch (e) {
    // 模拟异常即中止：保留已结算部分，时间线归位，绝不让异常拖垮加载
    console.error("离线模拟异常（已中止，保留当前进度）:", e);
  }
  // 平移量 = 虚拟推进总量 − 模拟本身耗掉的现实时间（写入越晚超前越少，线性近似足够精确）
  const shift = simTimeOffset - (Date.now() - simStartReal);
  simTimeOffset = 0;
  restoreSimTimestamps(tsBefore, simStartReal, shift);
  simActive = false;
  res.uLog1 = getLogU10(); res.ph1 = getLogPhonons();
  res.m1 = getLogBhMass(); res.vp1 = getLogVP();
  res.sp1 = getLogSp();
  res.phAbs1 = state.phonons;
  res.ann1 = state.annihilations;
  return res;
}
// 模拟期间可能被虚拟时钟写入的时间戳字段
const SIM_TS_KEYS = [
  "lastAutoAnnAt", "lastAutoUp3At", "annStartReal", "lastPurchaseAt",
  "zeroGainSince", "capReachedAt", "bhPulseSince", "bhDistorlSince",
  "ruaBoostUntil", "ruaBoostCD", "ruaDayStart",
];
function snapshotSimTimestamps() {
  const snap = {};
  for (const k of SIM_TS_KEYS) snap[k] = state[k];
  snap.__distortEnterAt = distortEnterAt;
  return snap;
}
// 模拟结束后：对「模拟期间被写入且落在虚拟未来」的字段平移回现实时间线
function restoreSimTimestamps(before, simStartReal, shift) {
  if (!(shift > 0)) return;
  for (const k of SIM_TS_KEYS) {
    const v = state[k];
    // 仅平移模拟期间变化的字段（值 !== 模拟前）且确为虚拟时间戳（> 模拟开始的真实时刻）
    if (typeof v === "number" && isFinite(v) && v !== before[k] && v > simStartReal) {
      state[k] = Math.max(v - shift, simStartReal);
    }
  }
  if (distortEnterAt !== before.__distortEnterAt && distortEnterAt > simStartReal) {
    distortEnterAt = Math.max(distortEnterAt - shift, simStartReal);
  }
}
// 设置页开关高亮随当前档同步（init、导入、槽位加载后各调一次）
function syncOfflineToggleUI() {
  document.getElementById("offline-on").classList.toggle("active", state.settings.offlineEnabled !== false);
  document.getElementById("offline-off").classList.toggle("active", state.settings.offlineEnabled === false);
}
// init 尾部（DOM 就绪后）调用：执行模拟 → 成就 → 刷新显示 → 保存 → 弹窗
function processPendingOffline() {
  syncOfflineToggleUI(); // 导入/槽位加载会换掉 settings，按钮高亮须随档同步
  if (!pendingOffline) return;
  const { raw, capped } = pendingOffline;
  pendingOffline = null;
  const res = runOfflineSimulation(capped);
  checkAchievements();
  updateDispAnchor();
  renderAll();
  saveGame();
  showOfflineModal(raw, capped, res);
}
// 离线收益弹窗（收益已先行入账，按钮仅关闭；无实质收益则不弹）
function showOfflineModal(raw, capped, res) {
  const lines = ["你离开了 " + fmtTime(raw) + (raw > capped + 1 ? "（结算上限 " + fmtTime(capped) + "）" : "")];
  const uD = offlineLogDiff(res.uLog0, res.uLog1);
  if (uD > 1e-4) lines.push("波速 +" + (uD < 308 ? fmt(Math.pow(10, uD)) : fmtLog(uD)) + " m/s");
  // 声子优先显示绝对增量（大基数上的小增量 log 差趋 0 会漏报），超 double 回退 log 差
  const phAbsD = (isFinite(res.phAbs0) && isFinite(res.phAbs1)) ? res.phAbs1 - res.phAbs0 : NaN;
  const phD = offlineLogDiff(res.ph0, res.ph1);
  if (isFinite(phAbsD) && phAbsD >= 1) lines.push("声子 +" + fmt(Math.floor(phAbsD)));
  else if (phD > 1e-4) lines.push("声子 +" + fmtLog(phD));
  if (bhUnlocked()) {
    const mD = offlineLogDiff(res.m0, res.m1);
    if (mD > 1e-4) lines.push("黑洞质量 +" + (mD < 308 ? fmt(Math.pow(10, mD)) : fmtLog(mD)) + " M☉");
    else if (isFinite(mD) && mD < -1e-4) lines.push("黑洞质量 ÷" + fmt(Math.pow(10, -mD)) + "（脉冲衰减）");
    const vpD = offlineLogDiff(res.vp0, res.vp1);
    if (vpD > 1e-4) lines.push("虚粒子 +" + (vpD < 15 ? fmt(Math.floor(Math.pow(10, vpD))) : fmtLog(vpD)));
    else if (isFinite(vpD) && vpD < -1e-4) lines.push("虚粒子 ÷" + fmt(Math.pow(10, -vpD)) + "（吸积衰减）");
  }
  const annD = res.ann1 - res.ann0;
  if (annD >= 1) lines.push("湮灭 +" + fmt(Math.floor(annD)) + " 次");
  const spD = offlineLogDiff(res.sp0, res.sp1);
  if (spD > 1e-4) lines.push("奇点 +" + (spD < 308 ? fmt(Math.pow(10, spD)) : fmtLog(spD)));
  if (lines.length <= 1) return; // 无实质收益（如生产为 0 挂机）不弹
  document.getElementById("offline-text").textContent = lines.join("\n");
  document.getElementById("offline-overlay").classList.remove("hidden");
}

// ---------- Game loop ----------
// 生产累积（游戏时间）：tick 与离线模拟共用的唯一实现，防止双份公式漂移。
// 包含：游戏时间 dt 累积（playTime/annGameElapsed）、波速 U、累计频率、声子、黑洞 tick。
// realTime（真实游玩时长）不在此处——离线模拟不累计真实游玩时间
function applyProduction(realDt) {
  // 游戏时间倍率走 log 域（timeRateLog 权威），倍率超 double（黑洞扭曲状态等）时
  // 用 Decimal 计算游戏时间增量，不再产生 Infinity
  const trLog = timeRateLog();
  // gameDtLog：本 tick 游戏时间增量 dt 的 log10（log 域权威，供所有生产累积使用）
  let gameDtLog;
  let dt;
  let dtOverDouble = false; // dt 超 double：游戏时间以 log 权威累积，dt 仅作下游量级标记
  if (trLog > 308) {
    dtOverDouble = true;
    gameDtLog = clampLog(trLog + Math.log10(Math.max(realDt, 1e-300)));
  } else {
    dt = realDt * Math.pow(10, trLog);
    if (isFinite(dt)) {
      gameDtLog = Math.log10(Math.max(dt, 1e-300));
    } else {
      // trLog 接近 308 且 realDt 较大（后台标签节流）时 dt 会溢出为 Infinity：
      // 若继续走 double，gameDtLog=Infinity 经 clampLog 变成 LOG_CAP 污染存档，改走 log 域
      dtOverDouble = true;
      gameDtLog = clampLog(trLog + Math.log10(Math.max(realDt, 1e-300)));
    }
  }
  if (dtOverDouble) {
    // 倍率超 double：游戏时间以 log 权威累积，double 缓存封顶 MAX_VALUE
    if (state.playTimeLog === undefined) state.playTimeLog = Math.log10(Math.max(state.playTime, 1e-300));
    state.playTimeLog = clampLog(logAddLogs(state.playTimeLog, gameDtLog));
    state.playTime = Number.MAX_VALUE;
    dt = Number.MAX_VALUE; // 仅作下游量级标记；生产累积一律走 gameDtLog
  } else {
    state.playTime += dt;
  }
  // 本次湮灭的游戏时长独立累计（避免 playTime 饱和后 playTime-annStartGame 恒为 0）。
  // double 缓存封顶 MAX_VALUE（与 playTime 同语义），log 权威持续累积用于显示
  if (state.annihilations >= 1) {
    state.annGameElapsed = dtOverDouble
      ? Number.MAX_VALUE
      : (state.annGameElapsed || 0) + dt;
    if (dtOverDouble) {
      if (state.annGameElapsedLog === undefined || !isFinite(state.annGameElapsedLog)) state.annGameElapsedLog = NLOG;
      state.annGameElapsedLog = clampLog(logAddLogs(Math.max(state.annGameElapsedLog, NLOG), gameDtLog));
    } else if (!dtOverDouble && dt > 0) {
      // 注意：必须排除 dtOverDouble——此时 dt=MAX_VALUE 占位，log10(dt)=308.25
      // 会把 log 权威反复覆盖成 308 量级（加速 e338 也恒显示 2.08e303d 的根因）
      state.annGameElapsedLog = clampLog(logAddLogs(Math.max(state.annGameElapsedLog ?? NLOG, NLOG), Math.log10(dt)));
    }
  }

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
      // log 域累积：U_new = U_old + g·dt（U≥0；定向 0 下限）。
      // gameDtLog 为权威 log10(g·dt 中的 dt)：dt 为 MAX_VALUE 占位时也正确
      const { log: gLog, sign } = gainRateLog();
      const gdLog = gLog + gameDtLog;
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

    // 累计频率 F 增量 = (g/L)·dt；扭曲宇宙与虚空中的产生不计入通用统计
    if (!state.distortActive && !state.voidActive) {
      const gOverLLog = (gFinite ? Math.log10(Math.max(Math.abs(g), 1e-300)) : gainRateLog().log) + gameDtLog - getLogL10();
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
    const prd = pr * dt;
    // 与 U 路径同款防护：pr·dt 或现有声子超 double（含缓存 Infinity、dt=MAX_VALUE 占位）
    // 时走 log 域，防止 setPhonons(Infinity) 把权威 logDph 写成 LOG_CAP 污染存档
    if (prFinite && isFinite(state.phonons) && state.phonons < LOG_FALLBACK && isFinite(prd) && state.phonons + prd < LOG_FALLBACK) {
      setPhonons(state.phonons + prd);
    } else {
      // log 域：logPhonons + log10(pr·dt)（pr·dt 可能为 0 当 pr=0）
      const prLog = phononRateLog() + gameDtLog;
      if (prLog <= NLOG + 1) {
        // pr·dt ≈ 0，保持原值（双精度微调；prd 本身可为 Infinity 占位，不可直加）
        setPhonons(state.phonons + (prFinite && isFinite(prd) ? prd : 0));
      } else {
        const curLog = getLogPhonons() === -Infinity ? NLOG : getLogPhonons();
        const newLog = logAddLogs(curLog, prLog);
        setPhononsLog(newLog); // double 缓存自动处理超 1e308
      }
    }
  }

  // 黑洞 tick：吸积/脉冲用真实时间（不受时间倍率影响），扭曲状态只给加成（无 tick 效果）
  tickBlackhole(realDt);
}

function tick() {
  const now = Date.now();
  // realDt 钳制：挂起标签的一次性补发上限 60s（真正的离线收益由加载时的
  // 离线模拟系统结算），系统时钟回拨产生的负值归 0（负 dt 会倒扣资源）
  const rawDt = (now - state.lastTick) / 1000;
  const realDt = Math.min(Math.max(rawDt, 0), 60);
  state.lastTick = now;
  state.realTime += realDt;
  applyProduction(realDt);

  // 虚空升级 tick：SVU1 填充（真实时间，任意位置可运转）；
  // SVU2 能标偏移仅在虚空外增长（进入虚空不增长、不清零）
  if (state.ach.normal.includes("A52")) {
    svu1FillTick(realDt);
    if (!state.voidActive) {
      const rate = svu2GainRate();
      if (rate > 0) state.svu2Level += rate * realDt;
    }
    // 量子狂潮解锁 latch：虚空中（削弱组合任意）达到 1e7000 Hz（达成一次永久记录）
    if (state.voidActive && state.ach.normal.includes("A45")
      && !(state.vpuCondMet && state.vpuCondMet.includes("vpu2")) && FLog() >= 7000) {
      if (!state.vpuCondMet) state.vpuCondMet = [];
      state.vpuCondMet.push("vpu2");
      setAutosaveStatus("虚幻升级解锁：量子狂潮（虚空中达到 1e7000 Hz）");
    }
  }

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
    if ((gameNow() - state.annStartReal) / 1000 >= 3600) grantHidden("S17");
  }
  // S19：滚木 —— 生产为 0 Hz/s 超过 10 分钟（连续）。
  // log 域判定：state.L 下溢为 0 时真实生产仍可能为正（波长 log 权威有限），double 乘除会误判为 0
  {
    const gainLog = gainRateLog().log + timeRateLog() - getLogL10();
    const zero = gainLog < -30; // 对应原 |gain| < 1e-30（gainRate=0 时 log=NLOG 同样命中）
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
    if (state.ach.normal.includes("A52")) updateVoidUI();
  }
  if (!document.getElementById("page-stats").classList.contains("hidden")) renderStats();
  if (!document.getElementById("page-achievements").classList.contains("hidden")) updateAchievementsUI();
}

// ---------- 快捷键（v0.5.0.3 QoL，所有玩家可用）----------
// ←/→ 大标签、↑/↓ 子标签、U 湮灭前升级全买、R 湮灭后升级全买、A 湮灭、L 升级3、
// 按住 B+1/2/3 黑洞状态、Shift+1~8 进扭曲、Shift+A/R/L/M 自动化开关
let bhHotkeyArmed = false; // 按住 B 的武装状态（松开 B 或窗口失焦解除；按住时可连续切换 1/2/3）
function buyAllPreAnnihilation() {
  // 湮灭前升级：最大购买——循环买到底（升级间有依赖/价格联动，等级无变化即收敛）
  for (let round = 0; round < 200; round++) {
    const before = [state.up1, state.up2, state.up3, state.pg1, state.pg2, state.pg3, state.phFluct, state.phCoupling, state.phUnlocked, state.meta1].join(",");
    buyUp1(); buyUp2(); buyUp3();
    buyPhUnlock(); buyPG1(); buyPG2(); buyPG3(); buyFluct(); buyCoupling();
    const after = [state.up1, state.up2, state.up3, state.pg1, state.pg2, state.pg3, state.phFluct, state.phCoupling, state.phUnlocked, state.meta1].join(",");
    if (after === before) return;
  }
}
function buyAllPostAnnihilation() {
  // 湮灭后升级：最大购买（同款收敛判定）
  for (let round = 0; round < 200; round++) {
    const before = [state.spu1, state.sau1, state.sau2, state.sau3, state.sau4, state.sbu1, state.sbu2, state.sbu3, state.svpu1, state.svpu2, state.svpu3, Object.keys(state.au).length].join(",");
    buySAU("sau1"); buySAU("sau2"); buySAU("sau3"); buySAU("sau4");
    buySAU("spu1");
    for (const grp of AU_DEFS) for (const u of grp) buyAU(u.id);
    if (bhUnlocked()) { buySBU("sbu1"); buySBU("sbu2"); buySBU("sbu3"); }
    for (const u of SVPU_DEFS) buySVPU(u.id);
    for (const u of VPU_DEFS) buyVPU(u.id);
    const after = [state.spu1, state.sau1, state.sau2, state.sau3, state.sau4, state.sbu1, state.sbu2, state.sbu3, state.svpu1, state.svpu2, state.svpu3, Object.keys(state.au).length].join(",");
    if (after === before) return;
  }
}
function visibleTabs() {
  return [...document.querySelectorAll("#tabs .tab")].filter(t => !t.classList.contains("hidden"));
}
function switchTabByOffset(offset) {
  const tabs = visibleTabs();
  const cur = tabs.findIndex(t => t.classList.contains("active"));
  const next = tabs[(cur + offset + tabs.length) % tabs.length];
  if (next) next.click();
}
function visibleSubtabs() {
  const page = [...document.querySelectorAll(".page")].find(p => !p.classList.contains("hidden"));
  if (!page) return [];
  return [...page.querySelectorAll(".subtab")].filter(t => !t.classList.contains("hidden"));
}
function switchSubtabByOffset(offset) {
  const subs = visibleSubtabs();
  const cur = subs.findIndex(t => t.classList.contains("active"));
  const next = subs[(cur + offset + subs.length) % subs.length];
  if (next) next.click();
}
function handleGameHotkey(e) {
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
  if (state.annihilations < 1) return; // 快捷键在首次湮灭后才可用
  if (e.repeat) return;
  const bhArmed = bhHotkeyArmed;
  const k = e.key;
  // 方向键：大标签/子标签
  if (k === "ArrowLeft") { switchTabByOffset(-1); return; }
  if (k === "ArrowRight") { switchTabByOffset(1); return; }
  if (k === "ArrowUp") { switchSubtabByOffset(-1); return; }
  if (k === "ArrowDown") { switchSubtabByOffset(1); return; }
  // 黑洞：按住 B + 1/2/3
  if (bhArmed && (k === "1" || k === "2" || k === "3")) {
    setBhState(k === "1" ? "accrete" : k === "2" ? "distorl" : "pulse");
    return;
  }
  if (e.shiftKey) {
    // Shift 系：自动化开关（须已解锁对应自动化）
    if (k === "A" || k === "a") {
      e.preventDefault(); // 防 Shift+浏览器快捷键抢占
      if (state.autoWaveUpg) { state.autoOn.wave = !state.autoOn.wave; updateAutomationUI(); setAutosaveStatus("主要页自动化：" + (state.autoOn.wave ? "开" : "关")); saveGame(); }
      if (state.autoPhononUpg) { state.autoOn.phonon = !state.autoOn.phonon; updateAutomationUI(); setAutosaveStatus("声子页自动化：" + (state.autoOn.phonon ? "开" : "关")); saveGame(); }
      return;
    }
    if (k === "T" || k === "t") {
      e.preventDefault();
      if (state.autoAnn) { state.autoOn.ann = !state.autoOn.ann; updateAutomationUI(); setAutosaveStatus("自动湮灭：" + (state.autoOn.ann ? "开" : "关")); saveGame(); }
      return;
    }
    if (k === "L" || k === "l") {
      e.preventDefault();
      if (state.autoUp3) { state.autoOn.up3 = !state.autoOn.up3; updateAutomationUI(); setAutosaveStatus("自动升级3：" + (state.autoOn.up3 ? "开" : "关")); saveGame(); }
      return;
    }
    if (k === "M" || k === "m") {
      e.preventDefault();
      if (state.ach.normal.includes("A34")) {
        state.batchMode.wave = !state.batchMode.wave;
        state.batchMode.phonon = !state.batchMode.phonon;
        updateAutomationUI(); saveGame();
        setAutosaveStatus("批量购买模式：" + (state.batchMode.wave ? "开" : "单次"));
      }
      return;
    }
    // Shift+1~8：进入对应扭曲宇宙。注意 Shift+数字的 e.key 是符号（"!"、"@"…），
    // 必须用 e.code（"Digit1"~"Digit8"）判定
    if (e.code && e.code.startsWith("Digit")) {
      const digit = parseInt(e.code.slice(5), 10);
      if (digit >= 1 && digit <= 8) {
        e.preventDefault();
        const u = DISTORT_UNIVERSES[digit - 1];
        if (u) enterDistort(u.id);
      }
      return;
    }
    return;
  }
  switch (k) {
    case "u": case "U":
      buyAllPreAnnihilation();
      renderWave(); updatePhononUI(); updateSpUI();
      break;
    case "r": case "R":
      buyAllPostAnnihilation();
      updateSpUI(); updateBlackholeUI();
      break;
    case "a": case "A":
      if (!bhArmed) document.getElementById("annihilate-btn").click();
      break;
    case "l": case "L":
      buyUp3();
      break;
    case "b": case "B":
      bhHotkeyArmed = true; // 按住期间保持武装（keyup B 或窗口失焦解除），可连续按 1/2/3 顺滑切换
      break;
  }
}

// 测试模式 UI 同步（全局：危险操作区按钮显隐 + 顶栏版本显示）
// v0.5.1 内容已对全员开放：危险操作区保留「清零VF」「无Sp湮灭」工具，顶栏版本恒为 v0.5.1
// 测试模式：开发者预览开关——用于隔离尚未正式发布的开发中内容（如未来的新重置层）。
// 约定：开发中的内容用 if (state.testMode) 门控逻辑 + UI 显隐，正式发布时删除门控即可；
// 测试模式本身不给予任何已正式发布的内容
function applyTestModeUIGlobal() {
  const enterBtn = document.getElementById("enter-test-btn");
  const clearBtn = document.getElementById("clear-vf-btn");
  const forceAnnBtn = document.getElementById("force-ann-btn");
  const verEl = document.getElementById("version-label");
  if (enterBtn) {
    enterBtn.classList.remove("hidden");
    enterBtn.textContent = state.testMode ? "退出测试" : "进入测试";
  }
  if (clearBtn) clearBtn.classList.toggle("hidden", !state.testMode);
  if (forceAnnBtn) forceAnnBtn.classList.toggle("hidden", !state.testMode);
  if (verEl) verEl.textContent = state.testMode
    ? "v0.6.0.0 The Superstring Update（测试）"
    : "v0.5.1 The Void Update";
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

  // 离线收益开关 + 收益弹窗关闭按钮
  document.getElementById("offline-on").addEventListener("click", () => {
    state.settings.offlineEnabled = true; syncOfflineToggleUI(); saveGame();
    setAutosaveStatus("离线收益已开启（上限 8 小时）");
  });
  document.getElementById("offline-off").addEventListener("click", () => {
    state.settings.offlineEnabled = false; syncOfflineToggleUI(); saveGame();
    setAutosaveStatus("离线收益已关闭");
  });
  syncOfflineToggleUI();
  document.getElementById("offline-claim").addEventListener("click", () => {
    document.getElementById("offline-overlay").classList.add("hidden");
  });

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
  // 导出存档为 TXT 文件下载（内容与文本框导出一致）
  document.getElementById("save-download").addEventListener("click", () => {
    state.lastTick = Date.now();
    const code = encodeSave(state);
    document.getElementById("save-io").value = code;
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    a.download = `WaveIncremental-save-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.txt`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    setAutosaveStatus("已导出存档文件");
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
      state.settings = Object.assign({ theme: "black", notation: "scientific", decimals: 3, uiFps: 33, hideLockedRows: true, hideDoneRows: false, offlineEnabled: true }, obj.settings || {});
      state.ach = Object.assign({ normal: [], hidden: [], hiddenRevealed: [] }, obj.ach || {});
      migrateState();
      // 重置瞬时成就状态（与 init 一致）：旧档携带的计时数组会干扰 S3/S5/S6 判定
      state.hiddenClicks = [];
      state.metaClicks = [];
      state.notationSwitches = [Date.now()];
      state.phToggles = [];
      if (obj.frequency !== undefined && obj.U === undefined) { setU(obj.frequency); state.L = 1; state.logL10 = 0; }
      if (obj.totalFrequency !== undefined) setTotalFGained(obj.totalFrequency);
      queueOfflineProgress();
      state.lastTick = Date.now();
      applyTheme(state.settings.theme);
      applyNotation(state.settings.notation);
      applyDecimals(state.settings.decimals);
      processPendingOffline(); // 导入发生在 init 之后：离线结算须就地执行
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

  // 8DA：打破/恢复多元宇宙的规则（奇点页顶部按钮）
  const brBtn = document.getElementById("break-rules-btn");
  brBtn.addEventListener("click", () => {
    if (!hasDistortMilestone(8)) return;
    state.rulesBroken = !state.rulesBroken;
    saveGame();
    renderAll();
    setAutosaveStatus(state.rulesBroken ? "多元宇宙的规则已被打破" : "多元宇宙的规则已恢复");
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
    // S25：好感度达到 500
    if (state.ruaFav >= 500 && !state.ach.hidden.includes("S25")) { grantHidden("S25"); updateAchievementsUI(); }
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


  // 测试模式（危险操作区）：开发者预览开关——密码进入后可预览尚未正式发布的开发内容
  //（未来如新重置层）。退出时只清标志：已正式发布的内容（A52/虚空等）不受影响
  const TEST_PASSWORD = "ilvcycloiduwu";
  const applyTestModeUI = applyTestModeUIGlobal;
  document.getElementById("enter-test-btn").addEventListener("click", () => {
    if (state.testMode) {
      if (state.voidActive) exitVoid(); // 正在虚空中先结算退出，防孤儿状态
      state.testMode = false;
      state.svu1Filling = false; // 停止 SVU1 填充
      applyTestModeUI();
      saveGame();
      renderAll();
      setAutosaveStatus("已退出测试模式");
      return;
    }
    const pw = prompt("输入测试密码：");
    if (pw === null) return;
    if (pw !== TEST_PASSWORD) { setAutosaveStatus("密码错误"); return; }
    state.testMode = true;
    applyTestModeUI();
    saveGame();
    renderAll();
    setAutosaveStatus("已进入测试模式：开发者预览");
  });
  // 危险操作区工具：清零VF / 无Sp湮灭（测试模式下可见）
  document.getElementById("clear-vf-btn").addEventListener("click", () => {
    setVoidVFLog(NLOG);
    saveGame();
    updateVoidUI();
    setAutosaveStatus("虚空泡沫已清零");
  });
  // 无 Sp 湮灭：执行一次不获取奇点的湮灭重置（扭曲/虚空中不可用——各有专属出口）
  document.getElementById("force-ann-btn").addEventListener("click", () => {
    if (state.distortActive || state.voidActive) { setAutosaveStatus("扭曲/虚空中不可用，请先退出"); return; }
    if (!confirm("确定进行不获取奇点的湮灭重置吗？（当前持有的奇点与进度按湮灭规则重置，但不获得 Sp）")) return;
    forceAnnihilationReset(0);
    updateVoidUI();
    setAutosaveStatus("已执行无 Sp 湮灭重置");
  });
  // 湮灭按钮（首次湮灭后显示；点击直接湮灭，不强制切换选项卡）
  document.getElementById("annihilate-btn").addEventListener("click", () => {
    if (state.annihilations === 0) return;
    if (state.voidActive) return; // 虚空挑战：禁用湮灭，只能从虚空页退出结算
    // 扭曲宇宙中：达标 → 湮灭该宇宙；未达标 → 退出
    if (state.distortActive) {
      if (annihilationReady()) doAnnihilation();
      else exitDistort();
      return;
    }
    doAnnihilation();
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
    state.annStartReal = gameNow();
    state.annStartGame = state.playTime; state.annGameElapsed = 0; state.annGameElapsedLog = NLOG;
  }
  // 恢复上次所在的大标签（无记录默认波动页）；子标签由 switchTab 内部恢复默认
  //（不得再无条件 switchSubtab("main")——非波动页上它会把子页全部隐藏，内容不渲染）
  let lastTab = "wave";
  try { lastTab = localStorage.getItem("waveIncremental_lastTab") || "wave"; } catch {}
  switchTab(lastTab);
  renderAll();

  // 离线结算：DOM 就绪后执行（模拟期间 UI 函数早退，此时已可安全刷新）
  processPendingOffline();

  state.lastTick = Date.now();

  // 快捷键（v0.5.0.3 QoL）：全局监听，输入框聚焦时忽略
  document.addEventListener("keydown", handleGameHotkey);
  document.addEventListener("keyup", (e) => {
    if (e.key === "b" || e.key === "B") { bhHotkeyArmed = false; }
  });
  // 窗口失焦兜底：防止 B 的 keyup 丢失导致武装卡死
  window.addEventListener("blur", () => { bhHotkeyArmed = false; });
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
