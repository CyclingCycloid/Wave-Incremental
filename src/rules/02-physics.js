// ---------- 派生物理量 ----------
// L 的双表示：logL10 权威（永不下溢），L 为 double 缓存（极端小时可能下溢为 0）
function getLogL10() { return (state.logL10 !== undefined && isFinite(state.logL10)) ? state.logL10 : Math.log10(state.L || 1e-300); }
// F = U / L（定向宇宙：波速取绝对值；膨胀宇宙：波长乘以膨胀倍率）
function distortLMod() {
  if (!inDistort("expand")) return 1;
  const t = (gameNow() - state.distortEnterAtMs) / 1000;
  if (t <= 1) return 1;
  return Math.pow(1e20, t - 1); // 进入 1 秒后，每秒波长 ×1e20
}
// 波长倍率的 log10（代数式，避免 double 溢出）
function distortLModLog() {
  if (!inDistort("expand")) return 0;
  const t = (gameNow() - state.distortEnterAtMs) / 1000;
  if (t <= 1) return 0;
  return 20 * (t - 1);
}
// 膨胀宇宙：波速获取指数随时间下降，每秒 -0.1，到 0 为止（gain^exp → log *= exp）
function distortGainExp() {
  if (!inDistort("expand")) return 1;
  const t = (gameNow() - state.distortEnterAtMs) / 1000;
  if (t <= 1) return 1;
  return Math.max(0, 1 - 0.1 * (t - 1));
}
// ---------- 卷缩层对物理公式的影响（v0.6.0.0 测试）----------
// CM（卡拉比-丘流形）的两个效果：
// ① 波速获取 ×(1+CM)^4；② 频率公式变为 F = U/L^e（把隐藏维度卷缩进来，改变宏观物理）
// e = 1 + lg(1 + lg(1+CM)/3)/10；CM=0 时 e=1，与原公式逐位一致（零回归）
function cmLg1() { return lg1FromLog(getLogCM()); } // lg(CM+1)（CM=0 时为 0）
// 效果①的 log10：lg((1+CM)^4) = 4·lg(CM+1)
function cmGainMultLog() { return clampLog(4 * cmLg1()); }
// 效果③：奇点获取 ×max(1+lg(CM+1)^2, CM^0.1)（CM=0 时为 1，返回 log10）
function cmSpMultLog() {
  const c = cmLg1();
  if (c <= 0) return 0;
  return clampLog(Math.max(Math.log10(1 + c * c), 0.1 * getLogCM()));
}
// 效果②：波长效果指数 e。
// 节点71「光学-粒子说 II」：公式变为 1 + lg(1+lg(1+CM))/7（更好）；
// 节点72「光学-波动说 II」：基础公式结果 +0.1。两系列互斥，不会叠加
// 效果②：波长效果指数 e（基础公式；原 72 的公式改造已移除——72 现改为增强黑洞效果）
function wavelengthExp() {
  return wavelengthExpBase();
}
// Hz/s 的 log10（log10(gain/L^e)，膨胀宇宙的波长倍率计入指数底数）——
// 累计频率、获取显示与 S19 判定共用的唯一实现
function gainPerLLog(gLog) {
  return clampLog(gLog - wavelengthExp() * (getLogL10() + distortLModLog()));
}
function FLog() {
  // log 域：getLogU10 权威（U 超 1e308 时仍有限），永不返回 Infinity；
  // 卷缩后波长带指数 e：F = U/(L·膨胀倍率)^e（e=1 时与原式逐位一致）
  return clampLog(getLogU10() - wavelengthExp() * (getLogL10() + distortLModLog()));
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
  // v0.6.2：指数超过 3 后按 2+log₂(e−1) 放缓（e=3 处 2+log₂2=3 恰好连续，此后每翻倍只 +1）
  //（双缝干涉实验的削弱不再作用于指数，而是作用于最终波长缩减效果，见 up3WavelengthFromFLog）
  // SR1「晶格弛豫调制」（v0.6.3.2）：软上限起点每级推迟 0.1（st=3+0.1·等级），
  // 超出部分公式随之平移（st−1+log₂(e−st+2)，st 处 st−1+log₂2=st 仍连续）
  const st = 3 + 0.1 * sr1Level();
  if (e > st) e = st - 1 + Math.log2(e - st + 2);
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
// 高段价格（v0.6.2 修正）：付费级别超过 start 后，价格直接变为上一级的 1.01 次方
//（上一级 1e1000 → 下一级 1e1010），即 lg(n) = lg(start)×1.01^(n−start)，闭式 O(1)；
// start 及之前沿用原公式（含既有各层），start 处无缝衔接
function lateCostLog(n, start, origLog) {
  if (n <= start) return origLog(n);
  return origLog(start) * Math.pow(1.01, n - start);
}
// 分段递推高段价格（v0.6.2 修正）：付费级别超过 start 后每级 lg' = max(lg + mulLog, lg × powExp)
//（价格 = max(上一级×10^mulLog, 上一级^powExp)）。lg 低于交点 mulLog/(powExp−1) 时线性 +mulLog，
// 越过阈值后转 ×powExp 几何增长；闭式分段 O(1)，与逐级递推一致
function lateCostMaxLog(n, start, origLog, mulLog, powExp) {
  if (n <= start) return origLog(n);
  const lgStart = origLog(start);
  const j0 = Math.max(0, Math.ceil((mulLog / (powExp - 1) - lgStart) / mulLog)); // 线性段级数
  const cross = lgStart + mulLog * j0;
  if (n <= start + j0) return lgStart + mulLog * (n - start);
  return cross * Math.pow(powExp, n - start - j0);
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
  let w;
  if (lf <= 100) w = e * lf;
  else {
    const scale = up3SoftcapScale(lf);
    w = e * 100 + e * scale * (lf - 100);
  }
  // 二次软上限（v0.6.2）：波长 < 1e-100000（缩减量 w > 1e5）时，超出部分按
  // ((5+lg(lg(1/L)))/10)^0.3 缩放——lg(1/L)=w，故 p = 0.85/((5+lg(w))/10)^0.3
  //（节点41 0.85→0.95）。w=1e5 处 (5+lg w)/10 = 1 → p = 0.95（基础 0.85），
  // excess→0 时 w→1e5，拐点连续；w 越大 base 越大、p 越小（恒 <1），削弱渐强。
  // 实际购买与「下次重置」预览共用本函数
  if (w > 100000) {
    const p = (theoryOwned("71") ? 0.99 : theoryOwned("41") ? 0.95 : 0.85) / Math.pow((5 + Math.log10(w)) / 10, 0.3);
    w = 100000 + Math.pow(w - 100000, p);
  }
  // 研究·双缝干涉实验（v0.6.3.2）：波长缩减效果 ×(0.6·0.8^(等级-1))（等级 1 仍为 0.6，高等级放缓）
  const slit = researchSlitLevel();
  if (slit >= 1) w *= slitMult(slit);
  return w;
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


