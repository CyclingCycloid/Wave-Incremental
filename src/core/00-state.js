/* ===== Wave Incremental v0.6.3 — game logic ===== */

// ---------- Save schema ----------
function defaultState() {
  return {
    version: "0.6.3.2",
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
    autoWaveUpg: 0,        // 主要页可重复升级自动化解锁（1e10 Hz）
    autoPhononUpg: 0,      // 声子页可重复升级自动化解锁（1e20 Hz）
    autoUp3: 0,            // 升级3自动化解锁（第8次湮灭）
    autoAnn: 0,            // 自动湮灭解锁（第10次湮灭）
    autoOn: { wave: false, phonon: false, up3: false, ann: false, sau: false, sbu: false, svpu: false, comp: false },
    autoUp3Mult: 1.1,      // 升级3自动购买倍率阈值（double 缓存）
    autoUp3MultLog: Math.log10(1.1), // 倍率阈值的 log10 权威（可输入超 double）
    autoAnnSp: 1,          // 自动湮灭 Sp 阈值（double 缓存）
    autoAnnSpLog: 0,       // Sp 阈值的 log10 权威（可输入超 double）
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
    annMaxTLog: NLOG,      // R4 热焓极点回溯：本次湮灭的最高有效温度 log10（各湮灭类重置清零）
    // 扭曲系统（v0.4.2.1 测试）
    distortActive: "",     // 当前所在扭曲宇宙 id（空=普通宇宙）
    distortEnterAtMs: 0,   // 进入扭曲/虚空规则的现实时刻 ms（S02：随存档持久化；膨胀倍率的时间基）
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
    autoAnnMode: "sp",     // AU22：自动湮灭模式（sp=奇点阈值 / time=时间间隔 / heldsp=持有倍率，卷缩里程碑14）
    autoAnnInterval: 60,   // AU22：时间模式的间隔秒数
    autoAnnHeldMult: 1.1,      // heldsp 模式：获取量达到持有奇点的指定倍数时湮灭（double 缓存）
    autoAnnHeldMultLog: Math.log10(1.1), // heldsp 模式倍率的 log10 权威
    lastAutoUp3At: 0,      // 上次自动升级3时刻
    lastAutoAnnAt: 0,      // 上次自动湮灭时刻
    autoAnnCDLvl: 0,       // A42 奖励解锁：自动湮灭 CD 缩减升级等级（每级 ÷2，最低 25ms）
    autoSau: 0,            // 卷缩里程碑16：可重复奇点升级自动购买器
    autoSbu: 0,            // 卷缩里程碑18：黑洞升级自动购买器
    autoSvpu: 0,           // 卷缩里程碑20：虚粒子升级自动购买器
    autoComp: 0,           // 卷缩里程碑30：自动卷缩
    autoCompSS: 0,             // 自动卷缩：SS 阈值（double 缓存）
    autoCompSSLog: NLOG,       // 自动卷缩：SS 阈值的 log10 权威
    sau1: 0, sau2: 0, sau3: 0, sau4: 0,
    vpuCondMet: [],        // VPU 解锁条件已达成记录（达成一次永久解锁；A45 后生效）
    voidActive: false,     // 虚空挑战进行中
    voidRules: [],         // 虚空中生效的扭曲宇宙削弱（id 数组，D1-D8）
    voidVF: 0,             // 虚空泡沫（double 缓存；极端值看 logVoidVF10）
    logVoidVF10: NLOG,     // log10(虚空泡沫) 权威表示（选满削弱时 VF 可超 double）
    logVoidVFCap10: NLOG,  // log10(VF 上限) 权威（退出虚空结算时只增不减；虚空外 current 每秒追赶差值的 5%）
    voidBestRules: 0,      // 虚空里程碑：已完成的虚空最大同时生效削弱数（0=未完成过）
    logVoidVFBest10: NLOG, // 历史最高持有的虚空泡沫 log10（里程碑3 latch，只增不减）
    svu1SpLog: NLOG,       // SVU1 虚空共振：累计投入的 Sp（log10；投入持久）
    svu1VpLog: NLOG,       // SVU1：累计投入的 VP（log10）
    svu1VfLog: NLOG,       // SVU1：累计投入的 VF（log10）
    svu1Filling: false,    // SVU1：填充开关（开启时每真实秒投入现有资源 1%）
    svu2Level: 0,          // SVU2 能标偏移等级（虚空外增长，不清零不重置）
    svu3Rho: 0,            // SVU3 虚数相变：虚数密度 ρ（任何重置不清；相变时归 0）
    svu3N: 0,              // SVU3：相变数 N（任何重置不清；无序化清 N 与 ρ，虚空内不可无序化）

    // 卷缩层（v0.6.0.0 测试：第三重置层；SS=超弦 / Ins=灵感 / CM=卡拉比-丘流形）
    compactions: 0,        // 卷缩次数
    ss: 0,                 // 超弦（double 缓存）
    logDss: NLOG,          // log10(超弦) 权威（零哨兵 NLOG）
    totalSS: 0,            // 总超弦获取（double 缓存）
    logDtotalSS: NLOG,     // log10(总超弦) 权威
    bestSS: 0,             // 最好单次超弦获取（double 缓存）
    logBestSS: NLOG,       // 最好单次超弦获取的 log10 权威
    bestSSRate: 0,         // 最佳 SS/分（double 缓存）
    logBestSSRate: NLOG,   // 最佳 SS/分 的 log10 权威
    ins: 0,                // 灵感（double 缓存）
    logDins: NLOG,         // log10(灵感) 权威
    totalIns: 0,           // 总灵感（double 缓存）
    logDtotalIns: NLOG,    // log10(总灵感) 权威
    insFromF: 0, insFromSp: 0, insFromSS: 0, // 各途径已购灵感次数（决定下一次价格）
    cm: 0,                 // 卡拉比-丘流形（double 缓存；后台小数计算，显示取整）
    logCM: NLOG,           // log10(CM) 权威
    tp: 0,                 // 未转换的拓扑节点（可转换为点/边/面；卷缩重置保留）
    tpV: 0, tpE: 0, tpF: 0, // 已转换的点 V / 边 E / 面 F（各消耗 1 TP，可退回）
    theoryNodes: {},       // 理论树已购节点（id→1，如 "01"）
    theory51Bought: 0,     // 节点51「曾购买过」闩锁（重置理论树不清；光学系列节点以此保持可见）
    theoryRespec: false,   // 理论树重置开关：下次卷缩重置时清空已购理论并返还灵感
    theoryPresets: [1, 2, 3, 4, 5, 6].map(n => ({ name: "PR" + n, tree: "" })), // 理论树预设（右键管理）
    theoryDepth: 5,        // 理论深度：层号 ≤ TD 的理论树节点可购（v0.6.3）
    // 研究系统（v0.6.3 测试）
    ed: 0,                 // 实验数据（里程碑式：只记录历史最高的一次，double 缓存）
    logED: NLOG,           // log10(ED) 权威
    inf: 0,                // 推论（double 缓存）
    logDinf: NLOG,         // log10(推论) 权威
    researchSel: [],       // 实验选择（未激活时可编辑）[{ id, level }]
    researchRun: null,     // 进行中的实验 { exps: [{ id, level }], predictSpLog }
    researchPredictSpLog: NLOG, // 预测的总奇点（log10）
    // 研究项目（v0.6.3.2 测试）：A71「乌云」解锁；每购买一个理论深度 +1/3
    researchBought: [],    // 已购研究项目 id（如 "R1"，按购买顺序）
    researchBest: {},      // 各实验完成的最高等级（id→等级，结束实验时记录）
    researchDone: 0,       // 完成的实验次数（结束实验计数，放弃不计）
    insFromVP: 0,          // R8 后新增：虚粒子购买灵感的次数（价格 1e60·1e15^n）
    sr1InvestLog: NLOG,    // SR1 晶格弛豫调制：累计投入的推论 log10（消耗计入、只增不减）
    srActiveId: "",        // 当前激活的课题 id（""=未激活；一次只能研究一个课题）
    compStartReal: 0,      // 本次卷缩开始（真实时间戳 ms）
    compGameElapsed: 0,    // 本次卷缩的游戏时长（double 缓存，超 double 封顶 MAX_VALUE）
    compGameElapsedLog: NLOG, // 本次卷缩游戏时长的 log10 权威
    compFastest: 0,        // 最快卷缩时间（真实秒，0=无记录）
    compHistory: [],       // 最近十次卷缩记录（统计-重置子页）
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
    achA2324Swapped: 0,    // A23/A24 位置交换（A23=聚变、A24=耦合）的一次性旧档迁移闩锁
    achA3132Swapped: 0,    // A31/A32 位置交换（A31=QoL、A32=创生）的一次性旧档迁移闩锁
    // 成就相关瞬时状态（加载时重置，避免离线干扰）
    hiddenClicks: [],      // S5 点击序列（单元格 id）
    metaClicks: [],        // S3 单次升级点击时间戳
    themeSwitches: [],     // S6 页面主题切换时间戳
    phToggles: [],         // S7 声子发生器开关时间戳
    capReachedAt: 0,       // S11 达到温度上限的时间戳
    settings: { theme: "black", notation: "scientific", decimals: 3, uiFps: 33, hideLockedRows: true, hideDoneRows: false, offlineEnabled: true },
    lastTick: Date.now(),
  };
}

// 全部自动化开关的默认值（新键加入此处；重置体统一用它，避免字面量漏新键）
function defaultAutoOn() { return { wave: false, phonon: false, up3: false, ann: false, sau: false, sbu: false, svpu: false, comp: false }; }

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
const { clampLog, logAddLogs, logAddSigned, cmpGE, cmpLT } =
  createLogMath({ NLOG, LOG_CAP, LOG_FALLBACK });
const { encodeSave, decodeSave } = createSaveCodec(globalThis);

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

