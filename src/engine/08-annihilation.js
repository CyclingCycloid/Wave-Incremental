// ---------- 湮灭 ----------
// 前奇点升级不再消耗资源：15 次湮灭里程碑的直接奖励（不再是可购买升级）。
// 滞涨宇宙（原通胀）：价格是核心机制，免费效果失效（否则自动化免费连买导致数值失控）
function upgradesFree() { return hasMilestone(15) && !inDistort("inflation"); }

const MILESTONES = [
  { n: 1,  desc: "保持解锁声子升级和声子页面的可见性，解锁「自动化」主选项卡" },
  { n: 2,  desc: "湮灭保持单次波动升级，和主要页面自动化的解锁" },
  { n: 3,  desc: "湮灭保持单次声子升级，和声子相关自动化的解锁，湮灭不再播放动画" },
  { n: 5,  desc: "湮灭不重置自动化开关，声子发生器一开始就是启动状态" },
  { n: 8,  desc: "解锁自动购买升级3（可设置在多少倍率时购买）" },
  { n: 10, desc: "解锁自动湮灭（可设置在多少奇点时重置），湮灭不再需要达到当前普朗克温度" },
  { n: 15, desc: "奇点之前的升级不再消耗资源" },
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
  { n: 3, desc: "解锁奇点升级" },
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
  // D01：打破规则/测试模式读 raw 温度绕过上限，但滞涨的有效温度开方仍须应用——
  // 否则可在有效温度远低于目标时完成滞涨宇宙
  const tLog = state.rulesBroken || state.testBreakRules
    ? (inDistort("inflation") ? temperatureLog() / 2 : temperatureLog())
    : temperatureCappedLog();
  // 扭曲宇宙：目标是该宇宙自己的普朗克温度（未知宇宙 id 视为不在扭曲中）
  if (state.distortActive) {
    const u = DISTORT_UNIVERSES.find(x => x.id === state.distortActive);
    if (!u) { state.distortActive = ""; return tLog >= LOG_T_P0; }
    const tpLog = isFinite(u.tp) ? Math.log10(u.tp) : Infinity;
    return tLog >= tpLog;
  }
  // 主宇宙三档门槛：10 次湮灭（里程碑 10）前须达到**当前**普朗克温度（随总 Sp 上抬），
  // 之后回落为最初的普朗克温度。温度贴着上限时 temperatureCappedLog 恰等于 capLog，
  // >= 判定浮点安全；首次湮灭 totalSp=0，当前 cap == T_P0，行为与旧版一致
  const targetLog = hasMilestone(10) ? LOG_T_P0 : temperatureCapLog();
  return tLog >= targetLog;
}

// 10 次湮灭前（自动湮灭解锁前）达到湮灭条件即暂停游戏计算：
// 停止生产与购买自动化，让可获得的奇点数保持在当前上限温度对应的最大值——
// 早期阈值=当前普朗克温度，自动化购买会花掉声子/波速把温度拉低、削弱待获取的 Sp。
// 扭曲/虚空各用自己的目标温度，不在此列；达到 10 次（解锁自动湮灭）后不再暂停
function annihilationFrozen() {
  return state.annihilations >= 1 && !hasMilestone(10)
    && !state.distortActive && !state.voidActive && annihilationReady();
}

// 记录一次湮灭到历史（最近十次）
function pushAnnHistory(entry) {
  state.annHistory.push(entry);
  if (state.annHistory.length > 10) state.annHistory.shift();
}
// 记录一次卷缩到历史（最近十次）
function pushCompHistory(entry) {
  state.compHistory.push(entry);
  if (state.compHistory.length > 10) state.compHistory.shift();
}

// 大重置：回到波长1m波速10，重置所有升级购买；里程碑决定保留项
// skipRender=true（自动湮灭路径）：跳过末尾的 renderAll——调用方所在 tick/rAF 随后会
// 统一渲染，免去每次湮灭的全页重建（含存档槽 base64 解码），25ms CD 下才能跑满
function doAnnihilation(skipRender) {
  if (!annihilationReady()) return;
  const inDistortMode = !!state.distortActive;
  const dUniverse = inDistortMode ? DISTORT_UNIVERSES.find(x => x.id === state.distortActive) : null;
  const gained = inDistortMode ? 0 : spGain(); // Sp 获取不受 SVPU2 加成
  if (!inDistortMode && gained < 1 && !state.testBreakRules) return; // 测试模式：Sp=0 也执行湮灭
  const wasFirst = state.annihilations === 0;

  // 统计（扭曲宇宙内不刷新 Sp 相关纪录，但记入历史）
  const realNow = gameNow();
  // 首次湮灭（annStartReal=0）：时长回落为开局至今的真实游玩时长
  //（否则会算出自 1970 年起的天文数字，污染最快湮灭与最佳速率）
  const realDur = state.annStartReal > 0
    ? Math.max((realNow - state.annStartReal) / 1000, 0)
    : Math.max(state.realTime || 0, 0);
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
  // 游戏时长 log 权威（超 double 时 double 缓存被封顶，log 才是真值）
  const gameDurLog = (state.annGameElapsedLog !== undefined && isFinite(state.annGameElapsedLog) && state.annGameElapsedLog > NLOG + 1)
    ? state.annGameElapsedLog
    : ((gameDur > 0 && isFinite(gameDur)) ? Math.log10(gameDur) : NLOG);
  pushAnnHistory({
    label: inDistortMode ? `扭曲·${dUniverse.name}` : `第 ${fmtAnnNum(state.annihilations + 1)} 次`,
    distort: inDistortMode ? dUniverse.id : "",
    sp: gained, realDur, gameDur, gameDurLog, rate, at: realNow,
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
    state.autoOn = defaultAutoOn();
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
  state.annStartGame = state.playTime; state.annGameElapsed = 0; state.annGameElapsedLog = NLOG; state.annMaxTLog = NLOG;

  updateDispAnchor();
  applyPhononVisibility();
  applyAnnihilationVisibility();
  checkAchievements();
  saveGame();
  if (!skipRender) renderAll();
  return true; // 成功执行（wasFirst 语义不再需要，首次流程由 confirmFirstAnnihilation 单独处理）
}

// 进入扭曲宇宙：立即进行一次湮灭重置（一律不结算 Sp——与虚空入口一致；
// 就绪时的待获取 Sp 随重置放弃，不把入口湮灭结算进持有与总 Sp 提供额外加成），然后应用该宇宙规则
function enterDistort(id) {
  if (state.voidActive) return; // 虚空挑战中：禁止进入扭曲宇宙（防双重挑战脏状态）
  // S16：硬核玩家 —— 已在一个扭曲宇宙中时点击另一个扭曲宇宙的进入
  if (state.distortActive && state.distortActive !== id && !state.ach.hidden.includes("S16")) {
    grantHidden("S16"); updateAchievementsUI();
  }
  if (state.distortActive) return;
  const u = DISTORT_UNIVERSES.find(x => x.id === id);
  if (!u) return;
  if (state.annihilations < 20) return; // 扭曲选项卡本身 20 湮灭解锁
  // 强制进行一次湮灭重置（不获 Sp、不计入最好纪录；湮灭次数照常 +1——「进入=湮灭」）
  forceAnnihilationReset(0);
  // AU24 的「湮灭保留声子」在进出扭曲宇宙时不生效：进入扭曲必须清零声子
  setPhonons(0);
  state.distortActive = id;
  state.distortEnterAtMs = gameNow();
  if (id === "simple") setPhonons(1); // 简洁宇宙：声子恒 1
  if (id === "narrow") state.narrowPurchases = 0; // 狭窄宇宙：进入时购买次数强制重置（防残留）
  startCooldownRamp(); // 冷却宇宙：进入时视为已完全生效（k=0.75）
  state.annStartReal = gameNow();
  state.annStartGame = state.playTime; state.annGameElapsed = 0; state.annGameElapsedLog = NLOG; state.annMaxTLog = NLOG;
  applyAnnihilationVisibility(); // 重设按钮为扭曲模式文案
  updateDistortUI();
  switchTab("wave");
  switchSubtab("main");
  updateDispAnchor(); // 重置显示锚点，防止旧宇宙的 gainRate 缓存继续外推
  setAutosaveStatus(`进入扭曲宇宙「${u.name}」`);
}

// 强制重置（进入扭曲/虚空与测试工具共用）：gained 为获得的 Sp（可为 0）；
// noCount=true（「无Sp湮灭」测试按钮）不计入湮灭次数
function forceAnnihilationReset(gained, noCount) {
  const realNow = gameNow();
  // 首次湮灭（annStartReal=0）：时长回落为开局至今的真实游玩时长（同 doAnnihilation）
  const realDur = state.annStartReal > 0
    ? Math.max((realNow - state.annStartReal) / 1000, 0)
    : Math.max(state.realTime || 0, 0);
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
  const gameDurLog = (state.annGameElapsedLog !== undefined && isFinite(state.annGameElapsedLog) && state.annGameElapsedLog > NLOG + 1)
    ? state.annGameElapsedLog
    : ((gameDur > 0 && isFinite(gameDur)) ? Math.log10(gameDur) : NLOG);
  pushAnnHistory({
    label: `第 ${fmtAnnNum(state.annihilations + 1)} 次`, distort: "",
    sp: gained, realDur, gameDur, gameDurLog, rate, at: realNow,
    spLog: histSpLog,
    rateLog: histRateLog,
  });
  // SVPU2 虚幻湮灭：每次获得的湮灭次数 ×2^svpu2（如 3 级则每次 +8 次而非 +1）。
  // 注意：进入扭曲宇宙（forceAnnihilationReset）也计一次湮灭次数——「进入=湮灭」是有意设计；
  // noCount=true（无Sp湮灭测试按钮）不计次数
  if (!noCount) state.annihilations += annSpMult();
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
    state.autoOn = defaultAutoOn();
    state.phOn = false;
  } else {
    state.phOn = true;
  }
  if (hasMilestone(8)) state.autoUp3 = 1;
  if (hasMilestone(10)) state.autoAnn = 1;
  state.annStartReal = realNow;
  state.annStartGame = state.playTime; state.annGameElapsed = 0; state.annGameElapsedLog = NLOG; state.annMaxTLog = NLOG;
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
  state.distortEnterAtMs = gameNow();
  startCooldownRamp(); // 冷却宇宙：进入时视为已完全生效（k=0.75）
  state.annStartReal = gameNow();
  state.annStartGame = state.playTime; state.annGameElapsed = 0; state.annGameElapsedLog = NLOG; state.annMaxTLog = NLOG;
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
  state.annStartGame = state.playTime; state.annGameElapsed = 0; state.annGameElapsedLog = NLOG; state.annMaxTLog = NLOG;
  applyPhononVisibility();
  applyAnnihilationVisibility();
  renderAll();
  updateDispAnchor();
  setAutosaveStatus(`已退出扭曲宇宙「${u ? u.name : ""}」（未达成目标）`);
}

// 前三次湮灭的过场：渐黑 → "你达到了普朗克温度"淡入淡出 → 主文案+按钮 → 点击 → 黑屏动画 → 执行
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
  // 前三次湮灭（里程碑 3 前）：全屏遮罩接管过场动画；序列进行中不重复拉起
  //（扭曲/虚空中不接管——虽然低计数下不可达，防御性排除）
  const cinematic = state.annihilations < 3 && !state.distortActive && !state.voidActive;
  if (cinematic) {
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
    // 未就绪文案随门槛档位：10 次湮灭前显示当前普朗克温度，之后为最初的普朗克温度
    const reqTxt = hasMilestone(10) ? "1.42e32 K" : fmtNum(temperatureCap(), temperatureCapLog()) + " K";
    btn.textContent = state.voidActive ? "虚空挑战中…" : `湮灭（须达到 ${reqTxt}）`;
    btn.disabled = true;
  }
}

// 湮灭按钮的「+N Sp」预览每帧刷新：applyAnnihilationVisibility 仅每 tick（100ms）调用，
// 高时间倍率下 100ms 的陈旧窗口会让显示远低于点击时的实际获取；仅接管就绪状态——
// 扭曲/虚空/未就绪等文案仍由 applyAnnihilationVisibility 管理（每 tick 与湮灭时刷新）
function renderAnnButtonFast() {
  if (simActive || state.annihilations < 1 || state.researchRun) return;
  const btn = document.getElementById("annihilate-btn");
  if (!btn || btn.classList.contains("hidden") || state.voidActive || state.distortActive) return;
  if (annihilationReady()) btn.textContent = `湮灭（+${fmtNum(spGain(), spGainLog())} Sp）`;
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
  // 虚空 II 章节：购买研究 R2「虚空探测器」后显示（介绍里程碑 3 与 SVU3）
  const helpVoid2 = document.getElementById("help-void2");
  if (helpVoid2) helpVoid2.classList.toggle("hidden", !researchBought("R2"));
  // 课题帮助段（研究章节内）：购买 R9 解锁课题后显示（防剧透）
  const helpSr = document.getElementById("help-sr-extra");
  if (helpSr) helpSr.classList.toggle("hidden", !researchBought("R9"));
  // 卷缩章节：测试模式下首次卷缩后显示
  // 卷缩相关帮助章节（卷缩/维度/理论树/研究）：首次卷缩后显示（里程碑与卷缩页重复，已删除该节）
  for (const id of ["help-compact", "help-compact-dim", "help-compact-theory", "help-compact-research"]) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", !(state.testMode && state.compactions >= 1));
  }
  document.getElementById("stat-ann-group").classList.toggle("hidden", state.annihilations < 1);
  document.getElementById("stat-comp-area").classList.toggle("hidden", !(state.testMode && state.compactions >= 1));
  // 卷缩后保持统计-挑战子页可见（否则湮灭次数归零会重新隐藏）
  document.getElementById("subtab-stats-challenge").classList.toggle("hidden", state.annihilations < 20 && state.compactions < 1);
  document.getElementById("comp-history-area").classList.toggle("hidden", !(state.testMode && state.compactions >= 1));
}

