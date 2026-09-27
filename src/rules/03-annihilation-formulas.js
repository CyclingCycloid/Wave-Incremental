// ---------- 湮灭层 ----------
const T_P0 = 1.4168e32; // 最初宇宙的普朗克温度
// 普朗克常数受 (1+总Sp)^1.5 加成 → 等价于温度倍率（T = n·h·F/k_B 中 h 同倍放大）
// log10 版本（权威，永不溢出）：log10((1+totalSp)^exp)
function planckMultLog() {
  if (inDistort("simple")) return 0; // 简洁宇宙：普朗克常数倍率始终为 1
  const exp = planckExp();
  return clampLog(exp * spEffectTermLog() + vpu2SingMultLog());
}
function planckMult() {
  const l = planckMultLog();
  return l > 308 ? Infinity : Math.pow(10, l);
}
// 当前宇宙温度硬上限：t·(1+总Sp)^10
// log10 版本（权威）：log10(T_P0) + exp·log10(1+totalSp)，含 250 软上限收敛
function temperatureCapLog() {
  const exp = tempCapExp();
  let logCap = Math.log10(T_P0) + exp * spEffectTermLog() + vpu2SingMultLog();
  if (logCap > 250) logCap = (vpuOwned("vpu1") ? 212.5 + 0.15 * logCap : 225 + 0.1 * logCap); // 软上限：超 1e250 部分开十次方根（单圈重整后 0.15 次方）；截距各自校准使 1e250 拐点连续（212.5+0.15×250=225+0.1×250=250）
  return clampLog(logCap);
}
function temperatureCap() {
  const logCap = temperatureCapLog();
  return logCap > 308 ? Infinity : Math.pow(10, logCap);
}
// AU42 虚幻凝聚：基于虚粒子数量增加奇点获取 ×(1+VP)^0.4（返回 log10；
// log 域计算：VP 缓存为 Infinity（log 权威仍有限）时不产生 Infinity/LOG_CAP 污染）
// 加成指数：理论树节点23 分析力学使效果 ^1.2（0.4 → 0.48）
function au42Exp() { return 0.4 * (theoryOwned("23") ? 1.2 : 1); }
function vpSpMultLog() {
  if (!auOwned("au42")) return 0;
  return au42Exp() * logAddLogs(0, getLogVP());
}
// Sp 获取基础值的 log10（log 域全链路，温度超 double 也不产生 Infinity）。
// 三段连续：T<1e50 为 1~10 线性（1 Sp @ T_P0）；1e50≤T<1e100 为 lg(T)/5（10~20）；
// T≥1e100 为 2·T^0.01（在 1e50 与 1e100 处值连续；斜率不连续 1/5→1/50）
function spGainBaseLog() {
  // R5「热焓极点回溯」：改用本次湮灭的最高有效温度（与公式同口径的时间最大值）
  const tLog = researchBought("R5") ? Math.max(temperatureCappedLog(), state.annMaxTLog) : temperatureCappedLog();
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
    + Math.log10(Math.max(1, phononSpMult())) + vpSpMultLog() + cmSpMultLog()
    + (theoryOwned("32") ? 15 : 0); // 理论树节点32 几何光学：获得的奇点 ×1e15
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
  // 理论树节点 12「质点力学」：略微削弱软上限（指数 0.15 → 0.12，超出部分保留更多）
  const exp = theoryOwned("12") ? 0.12 : 0.15;
  return SP_SOFTCAP_PIVOT_LOG + (spLog - SP_SOFTCAP_PIVOT_LOG) / Math.pow(spLog, exp);
}
// 有效总奇点（log10，仅四个奇点效果使用）：超过 1e2000 的部分按 1/√(lg Sp) 幂缩放
//（v0.6.2；1e2000 处连续；不改变总奇点的显示与统计口径）
function effTotalSpLog() {
  const lg = getLogTotalSp();
  return lg <= 2000 ? lg : 2000 + (lg - 2000) / Math.pow(lg, 0.5);
}
// 奇点效果用的 Sp 底数项（log10）：>250 走 log 权威并套 1e2000 软上限，否则精确 lg(1+Sp)
function spEffectTermLog() {
  const lg = getLogTotalSp();
  return lg > 250 ? effTotalSpLog() : Math.log10(1 + state.totalSp);
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
    let exp = waveGainExp();
    if (inDistort("simple")) exp /= 2;
    if (getLogTotalSp() > 250) {
      g *= Decimal.pow(10, effTotalSpLog() * exp).toNumber();
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
  // 研究·双缝干涉实验（v0.6.3.2）：波速获取整体幂次 ×(0.6·0.8^(等级-1))
  {
    const slit = researchSlitLevel();
    if (slit >= 1) {
      const sp2 = slitMult(slit);
      const s = g < 0 ? -1 : 1;
      g = s * Math.pow(Math.abs(g), sp2);
    }
  }
  // 虚空共振（SVU1）：虚空内波速获取速率整体幂次（符号保持——定向宇宙中可为负）；
  // 虚空泡沫第三效果（里程碑 2）：波速获取速率整体幂次（全局，^1+min(0.2, lg(VF+1)/300)）
  {
    const e = svu1GainExp() * vfGainExp();
    if (e !== 1) {
      const s = g < 0 ? -1 : 1;
      g = s * Math.pow(Math.abs(g), e);
    }
  }
  // 卷缩（CM 效果①）：波速获取 ×(1+CM)^4
  {
    const cmGl = cmGainMultLog();
    if (cmGl > 0) g *= Math.pow(10, Math.min(cmGl, 309)); // 超 double 时置 Infinity → tick 自动退 log 域
  }
  return g;
}
// gainRate 的 log10 版本（完整乘法链在 log 域，永不溢出）。
// 仅在 gainRate() 的 double 链因中间项溢出而饱和（Infinity）时由 tick 调用，
// 故 normal-play 下不参与计算（零回归）。返回 {log: log10(|g|), sign}。
function gainRateLog(uncapped) {
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
    let exp = waveGainExp();
    if (inDistort("simple")) exp /= 2;
    log += exp * spEffectTermLog();
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
  // 研究·双缝干涉实验（v0.6.3.2）：整体幂次 ×slitMult(n)（=0.6·0.8^(n−1)，5 级起每级再 ×0.5）
  {
    const slit = researchSlitLevel();
    if (slit >= 1) log *= slitMult(slit);
  }
  // 虚空共振（SVU1）：虚空内波速获取速率整体幂次（幂在 log 域 = 乘指数）；
  // 虚空泡沫第三效果（里程碑 2）：全局整体幂次
  log *= svu1GainExp() * vfGainExp();
  // 卷缩（CM 效果①）：波速获取 ×(1+CM)^4（乘在幂次之后，与 double 路径顺序一致）
  log += cmGainMultLog();
  // 超级软上限（仅虚空内）：获取超过 1e20000 的部分变为原来的 0.5 次方——
  // SVU1 幂次加成过强会让获取远超外部；20000 处连续（输入=输出）。
  // double 路径（gainRate）最高 1e308，不会触及此阈值，无需处理。
  // uncapped=true 返回未封顶值（仅 SVU3 的 ρ 增长需要 w=超出软上限的部分）
  if (!uncapped) log = voidGainSoftcap(log);
  return { log: clampLog(log), sign };
}
// 虚空内波速获取的超级软上限（阈值 20000，可被 SVU3「虚数相变」推迟，见 svu3CapDelay）
function voidGainSoftcap(log) {
  if (!state.voidActive) return log;
  const cap = 20000 + svu3CapDelay();
  if (log > cap) log = cap + Math.pow(log - cap, 0.5);
  return log;
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
// A25 奖励：每次重置后初始波速 100 m/s；A55 卷缩奖励：1e3 m/s（否则 10）
function resetU() {
  if (state.ach.normal.includes("A55")) return 1000;
  return state.ach.normal.includes("A25") ? 100 : 10;
}
// 升级价格（下一次购买）
// 通胀宇宙：所有升级的价格变为原来的平方
function costOf(c) { return inDistort("inflation") ? c * c : c; }
// 通胀宇宙下价格的 log10 = 原价 log × 2，否则原价 log
function costOfLog(cLog) { return inDistort("inflation") ? cLog * 2 : cLog; }
function up3Visible() { return state.annihilations >= 1 || F() >= 50000 || state.up3 >= 1; } // 首次湮灭后恒可见（避免卡片随 F<50000 反复增删导致 UI 跳动）
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

