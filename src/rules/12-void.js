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
  // R2「虚空探测器」全扭曲虚空：频率项在 F=1e20000 处封顶（expo 用封顶后的 F 计算），
  // 超出部分改乘**连续**的 (F/1e20000)^(1/3000)——每 +1e3000 恰好 ×10（非分档）
  const allDistorted = N >= DISTORT_UNIVERSES.length && researchBought("R2");
  const effF = allDistorted ? Math.min(fLog, 20000) : fLog;
  const expo = Math.min(0.0003, Math.sqrt(0.0009 / (effF + 1)));
  let vLog = multLog + expo * (effF - target);
  if (allDistorted && fLog > 20000) vLog += (fLog - 20000) / 3000;
  return clampLog(vLog);
}
// 虚空泡沫写入（log 权威；double 缓存超 double 时置 Infinity，存档为 null 后由 log 回填）。
// 同时更新历史最高持有 VF（里程碑 3 的 latch，只增不减——VF 可被花费，不能用当前值判里程碑）
function setVoidVFLog(lg) {
  state.logVoidVF10 = clampLog(lg);
  state.voidVF = state.logVoidVF10 <= NLOG + 1 ? 0
    : (state.logVoidVF10 > 308 ? Infinity : Math.pow(10, state.logVoidVF10));
  if (state.logVoidVF10 > (state.logVoidVFBest10 ?? NLOG)) state.logVoidVFBest10 = state.logVoidVF10;
}
// VF 上限（log10 权威；退出虚空结算时只增不减）
function getLogVoidVFCap10() {
  return (state.logVoidVFCap10 !== undefined && isFinite(state.logVoidVFCap10)) ? clampLog(state.logVoidVFCap10) : NLOG;
}
function setVoidVFCapLog(lg) {
  lg = clampLog(lg);
  if (lg > getLogVoidVFCap10()) state.logVoidVFCap10 = lg;
}
// 虚空外 VF 追赶（applyProduction 调用，真实时间 realDt，不受时间倍率影响）：
// current 每秒增长上限差值的 5%——闭式精确 cur' = cap − (cap−cur)×0.95^dt（指数逼近）。
// 虚空中不增长；cap 无效或 current 已达上限时早退；cur>cap（异常档）时吸附归位到 cap
function voidVFRegenTick(realDt) {
  if (state.voidActive || !(realDt > 0)) return;
  const capLog = getLogVoidVFCap10();
  if (!(capLog > NLOG + 1)) return;
  const curLog = state.logVoidVF10;
  if (!(curLog > NLOG + 1)) {
    // current 为 0：直接按 0 与 cap 差值追赶（cur' = cap×(1−0.95^dt)）
    setVoidVFLog(capLog + Math.log10(Math.max(1 - Math.pow(0.95, realDt), 1e-300)));
    return;
  }
  if (curLog >= capLog) {
    if (curLog > capLog) setVoidVFLog(capLog); // 异常档归位（防更新期负增长放大）
    return;
  }
  // cur' = cur + (cap−cur)×(1−0.95^dt)：N03——cap−cur 用 logAddSigned（差值可超 1e300，不得钳比截断）
  const diffLog = logAddSigned(capLog, 1, curLog, -1).log; // lg(cap−cur)
  const addLog = clampLog(diffLog + Math.log10(1 - Math.pow(0.95, realDt)));
  let next = logAddLogs(curLog, addLog);
  if (next >= capLog) next = capLog; // 吸附到上限（浮点余量）
  setVoidVFLog(next);
}
// VF 对虚粒子获取的加成（log10）：×(1+VF^((lg(VF+1)+3)/(4lg(VF+1)+6)))。VF=0 无加成；
// N04：0<VF≤1 时 lg(VF+1)≤0，旧代码直接归零——现用稳定 lg(1+10^x) 式按定义计算；
// N05：移除内层 min(...,300) 的无声明截顶，大 VF 按定义增长
function vfVPMultLog() {
  const lg0 = state.logVoidVF10;
  if (!(lg0 > NLOG + 1)) return 0; // VF=0：无加成
  const lgVF1 = logAddLogs(0, vfEffectVFLog(lg0)); // lg(1+VF)——稳定式，0<VF≤1 亦精确
  const e = (lgVF1 + 3) / (4 * lgVF1 + 6);
  const lgVF = vfEffectVFLog(lg0); // lg(VF)——定义的底数是 VF 本身（指数的分母用 lg(VF+1)）
  return clampLog(logAddLogs(0, lgVF * e)); // lg(1+VF^e)
}
// 进入虚空：湮灭重置后应用选中的削弱集合
function enterVoid(ids) {
  if (!state.ach.normal.includes("A52")) return;
  // 卷缩后总奇点归零：需重新达到 1e50 总奇点才能进入虚空（按钮同步显示要求）
  if (getLogTotalSp() < 50) return;
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
  state.distortEnterAtMs = gameNow(); // 膨胀削弱的时间基
  startCooldownRamp(); // 冷却削弱：进入时视为已完全生效（k=0.75）
  state.annStartReal = gameNow();
  state.annStartGame = state.playTime; state.annGameElapsed = 0; state.annGameElapsedLog = NLOG; state.annMaxTLog = NLOG;
  updateDispAnchor();
  applyAnnihilationVisibility();
  renderAll();
  updateVoidUI();
  setAutosaveStatus("已进入虚空（" + list.length + " 个削弱生效）");
}
// 退出虚空：达到 1e2000 Hz 时按公式结算本次 VF 上限（与历史上限取大，只增不减）。
// VF 本体不再一次性入账——回到虚空外后 current 每秒追赶上限差值的 5%（voidVFRegenTick）。
// 达成结算时记录里程碑（最大同时生效削弱数）
function exitVoid() {
  if (!state.voidActive) return;
  const fLog = FLog();
  const vfLog = voidVFLog(fLog);
  const achieved = vfLog > NLOG + 1;
  if (achieved && state.voidRules.length > state.voidBestRules) {
    state.voidBestRules = state.voidRules.length;
  }
  let capRaised = false;
  if (achieved) {
    const prevCapLog = getLogVoidVFCap10();
    setVoidVFCapLog(vfLog);
    capRaised = getLogVoidVFCap10() > prevCapLog;
  }
  state.voidActive = false;
  state.voidRules = [];
  forceAnnihilationReset(0);
  updateDispAnchor();
  applyAnnihilationVisibility();
  renderAll();
  saveGame();
  updateVoidUI();
  const capTxt = fmtLog(getLogVoidVFCap10());
  setAutosaveStatus(achieved
    ? (capRaised
      ? "已退出虚空：VF 上限提升至 " + capTxt
      : "已退出虚空：VF 上限未变（" + capTxt + "）")
    : "已退出虚空：未达到 1e2000 Hz，VF 无入账");
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
// SVU2 能标偏移的等级增速（仅虚空外，每真实秒）：SVU1_level/(1+SVU2_level)^1.5。
// SVU3「虚数相变」解锁后（里程碑3）额外提供倍率 N·(1+ρ_eff)^((1+N/5)/2)——按约定不在 UI 显示
//（ρ_eff 为有效 ρ：超相变阈值部分开方）
function svu2GainRate() {
  let rate = svu1Level() / Math.pow(1 + state.svu2Level, 1.5);
  if (voidMilestone3()) rate *= state.svu3N * Math.pow(1 + svu3RhoEff(), (1 + state.svu3N / 5) / 2);
  return rate;
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
// 热能超载的有效等级（温度软上限缩放指数 1/(n+2) 中的 n）。SVU2 能标偏移提供的是免费等级，
// 与真实等级合并后一并受节点 41「波动光学」的 ×2 加成（而非只乘真实等级、免费等级另行直加）
function effSvpu4() { return (state.svpu4 + svu2Svpu4Bonus()) * (theoryOwned("41") ? 2 : 1); }
// SVU2 效果 2（仅虚空内）：热寂削弱指数 0.5 → 1/(2+lg(n+1))
function svu2AdiabaticExp() {
  if (!state.voidActive || state.svu2Level <= 0) return 0.5;
  return 1 / (2 + Math.log10(state.svu2Level + 1));
}
// SVU1 填充：每真实秒投入现有 Sp/VP/VF 的 1%（连续复利等效：dt 秒投入 1−0.99^dt）。
// 投入量累计到 svu1SpLog/svu1VpLog/svu1VfLog（log 域），对应资源同步扣减；
// 卷缩里程碑 30 起投入不再消耗资源——仍照常记账投入（等级照常增长），仅不扣减
function svu1FillTick(realDt) {
  if (!state.svu1Filling) return;
  const free = compMilestone(30); // 里程碑 30：投入免费（仅记账）
  const frac = 1 - Math.pow(0.99, realDt); // dt 秒共投入现有量的 frac（每整秒恰为 1%）
  const takeLog = Math.log10(Math.max(frac, 1e-300));
  // 注意 Sp 的零哨兵是字面 0（非 NLOG）：sp=0 时 getLogSp()=0 会越过哨兵判定，必须显式判 sp>0
  if (state.sp > 0) {
    const spLog = getLogSp();
    state.svu1SpLog = clampLog(logAddLogs(state.svu1SpLog, spLog + takeLog)); // 累计投入 += sp×frac
    if (!free) subSpLog(spLog + takeLog);                                     // 扣减 sp×frac（保留 1−frac）
  }
  if (state.virtualParticles > 0) {
    const vpLog = getLogVP();
    state.svu1VpLog = clampLog(logAddLogs(state.svu1VpLog, vpLog + takeLog));
    if (!free) subVPLog(vpLog + takeLog);
  }
  if (state.logVoidVF10 > NLOG + 1) {
    state.svu1VfLog = clampLog(logAddLogs(state.svu1VfLog, state.logVoidVF10 + takeLog)); // 累计投入 += VF×frac
    // Sp/VP 走 sub*Log（语义为「扣减量」）；VF 直接写 log 权威，此处须保留 1−frac 而非扣减 frac
    if (!free) setVoidVFLog(state.logVoidVF10 + Math.log10(Math.max(1 - frac, 1e-300)));
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
  // v0.6.3.2：里程碑3「度规塌缩」解锁；等级模式（相变数 N 即等级），机制见帮助页「虚空 II」
  { id: "svu3", name: "虚数相变", fill: false,
    desc: "推迟虚空内的波速软上限",
    effect: () => svu3EffectText() },
];
// ---------- SVU3「虚数相变」（v0.6.3.2）----------
// 软上限起始点推迟量（log10）：3·(1+N)^1.5·ρ（ρ 取有效值——超阈值部分开方；任意虚空生效）
function svu3CapDelay() {
  if (!voidMilestone3()) return 0;
  return 3 * Math.pow(1 + state.svu3N, 1.5) * svu3RhoEff();
}
function svu3CapStart() { return 20000 + svu3CapDelay(); }       // 软上限起始点（log10）
function svu3PhaseThreshold() { return 500 + 100 * state.svu3N; } // 相变阈值：ρ ≥ 500+100N
// ρ 的有效值：超过相变阈值的部分开方（囤 ρ 不相变时效果不再线性增长；相变判定仍用原始 ρ）
function svu3RhoEff() {
  const th = svu3PhaseThreshold();
  return state.svu3Rho <= th ? state.svu3Rho : th + Math.sqrt(state.svu3Rho - th);
}
function svu3PhaseReady() { return voidMilestone3() && state.svu3Rho >= svu3PhaseThreshold(); }
// 卡片显示：ρ / 相变数 / 当前软上限起始点 / 相变阈值
function svu3EffectText() {
  const capStart = svu3CapStart();
  const rhoTxt = state.svu3Rho > 0 ? fmtNum(state.svu3Rho, Math.log10(state.svu3Rho)) : "0";
  return `ρ=${rhoTxt}　相变数：${state.svu3N}`
    + `\n效果：当前软上限起始点：${fmtNum(Math.pow(10, Math.min(capStart, 308)), capStart)}`
    + `\n相变阈值：ρ ≥ ${fmt(svu3PhaseThreshold())}${state.voidActive ? "（虚空中无法相变/无序化）" : ""}`;
}
// ρ 增长（applyProduction 调用，真实时间 realDt 原始值，不受时间倍率影响）：
// 条件=里程碑3 且虚空中且 8 种削弱全开；w = 超出软上限部分的波速获取 log10；
// 瞬时速率 = w/(1+ρ)^(1+N/3)。用**解析精确积分**（单 tick 内 w 视为恒定）而非逐 tick
// 显式累加——显式法在长 realDt（挂起标签补发/离线大步长）下会严重过冲（一次冲上数万 ρ、
// 瞬间越过相变阈值），且同样时长因 tick 切分不同结果差异巨大
function svu3RhoTick(realDt) {
  if (!voidMilestone3() || !state.voidActive) return;
  if (state.voidRules.length < DISTORT_UNIVERSES.length) return;
  if (!(realDt > 0)) return;
  const w = gainRateLog(true).log - svu3CapStart();
  if (!(w > 0)) return;
  const k = 1 + state.svu3N / 3; // 阻尼指数（N=0 时恰为 1，走平方根闭式解）
  const r0 = 1 + state.svu3Rho;
  const r1 = k === 1
    ? Math.sqrt(r0 * r0 + 2 * w * realDt)
    : Math.pow(Math.pow(r0, k + 1) + (k + 1) * w * realDt, 1 / (k + 1));
  const rho = r1 - 1;
  if (isFinite(rho) && rho > state.svu3Rho) state.svu3Rho = rho;
}
// 相变：相变数 +1、ρ 清零（之后 ρ 获取更难，但推迟效果更强）；虚空中不可用，需退出虚空后操作
function svu3Phase() {
  if (state.voidActive) { setAutosaveStatus("虚空中无法相变，请先退出虚空"); return; }
  if (!svu3PhaseReady()) return;
  state.svu3N++;
  state.svu3Rho = 0;
  saveGame();
  updateVoidUI();
  setAutosaveStatus("虚数相变完成：相变数 " + state.svu3N + "（ρ 已重置，软上限推迟更强）");
}
// 无序化：清零 ρ 与相变数；虚空中不可用，需退出虚空后操作
// 等级模式悬浮框：渲染到 document.body 的固定定位独立黑框（脱离卡片合成树，恒全不透明）
function showSvu3TipBox(anchor, text) {
  let box = document.getElementById("svu3-tip-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "svu3-tip-box";
    box.className = "svu3-tip-box";
    document.body.appendChild(box);
  }
  box.textContent = text;
  box.style.display = "block";
  const r = anchor.getBoundingClientRect();
  const left = Math.max(8, Math.min(r.left, (window.innerWidth || 800) - 440));
  box.style.left = left + "px";
  const bh = box.offsetHeight || 120;
  let top = r.bottom + 6;
  if (top + bh > (window.innerHeight || 600) - 8) top = Math.max(8, r.top - bh - 6);
  box.style.top = top + "px";
}
function hideSvu3TipBox() {
  const box = document.getElementById("svu3-tip-box");
  if (box) box.style.display = "none";
}
// 无序化：清零 ρ 与相变数；虚空中不可用，需退出虚空后操作
function svu3Disorder() {
  if (state.voidActive) { setAutosaveStatus("虚空中无法无序化，请先退出虚空"); return; }
  if (!voidMilestone3() || !(state.svu3N > 0 || state.svu3Rho > 0)) return;
  if (!confirm("确定无序化吗？（虚数密度 ρ 与相变数全部清零）")) return;
  state.svu3Rho = 0;
  state.svu3N = 0;
  saveGame();
  updateVoidUI();
  setAutosaveStatus("已无序化：ρ 与相变数已清零");
}
// 脉冲状态：虚粒子获取速率（每秒）= floor(mult × (M^0.1 − 1))；M=1 时自然为 0。返回 log10
function bhVPGainLog() {
  const mLog = getLogBhMass();
  if (mLog <= 0) return NLOG; // M=1 → M^0.1−1 = 0，无获取
  const x = 0.1 * mLog;
  // 大质量时 10^x−1 ≈ 10^x（log ≈ x）；小质量直接算，避免精度损失
  const inner = x > 15 ? x : Math.log10(Math.max(Math.pow(10, x) - 1, 1e-300));
  const raw = clampLog(inner + sbu3Eff() * Math.log10(2) + vfVPMultLog()); // VF 加成
  // v0.6.2：VP 获取超过 1e100 的部分按 min(0.5, 1/lg(VP)^0.135) 幂缩放（各加成后生效；
  // raw=100 处 excess=0 → 输出恒为 100，拐点连续；raw≈169.7 后指数由 0.5 起缓降）
  if (raw > 100) {
    const exp = Math.min(0.5, 1 / Math.pow(raw, 0.135));
    return clampLog(100 + (raw - 100) * exp);
  }
  return raw;
}
// 黑洞升级定义
const SBU_DEFS = [
  { id: "sbu1", key: "sbu1", name: "事件视界", desc: "每级使黑洞吸积效率 ×2", max: Infinity, cost: (n) => Math.pow(1e9, 1) * Math.pow(100, n - 1) },
  { id: "sbu2", key: "sbu2", name: "引力潮汐", desc: "每级使黑洞效果指数 +0.05", max: Infinity, cost: (n) => Math.pow(1e10, 1) * Math.pow(1000, n - 1) },
  { id: "sbu3", key: "sbu3", name: "霍金辐射", desc: "每级使虚粒子获取 ×2", max: Infinity, cost: (n) => Math.pow(1e11, 1) * Math.pow(100, n - 1) },
];
function sbuCostLog(u, n) {
  if (u.id === "sbu1") {
    // 1e9 × 100^(n-1)；超过 12 级后每级额外 ×(n-2)²；500 级起价格 = 上一级的 1.01 次方（v0.6.2）
    return lateCostLog(n, 500, (m) => {
      let log = 9 + (m - 1) * 2;
      for (let k = 13; k <= m; k++) log += 2 * Math.log10(k - 2);
      return log;
    });
  }
  if (u.id === "sbu2") {
    // 1e10 × 1000^(n-1)；超过 7 级后每级额外 ×n³。
    // A04：等级 >300 时改 lgamma 闭式（∑log(k)=lgamma10(n)−lg 7!，
    // lgamma10(x)≡lg(x!) 口径；lg 7! 用精确常数，Stirling 误差只留 n 段），
    // 消除 O(等级) 循环
    if (n > 300) {
      return 10 + (n - 1) * 3 + 3 * (lgamma10(n) - Math.log10(5040));
    }
    let log = 10 + (n - 1) * 3;
    for (let k = 8; k <= n; k++) log += 3 * Math.log10(k);
    return log;
  }
  if (u.id === "sbu3") return lateCostLog(n, 1000, (m) => 11 + (m - 1) * 2); // 1e11 × 100^(n-1)；1000 级起价格 = 上一级的 1.01 次方（v0.6.2）
  return 0;
}
function buySBU(id, bulk) {
  if (!bhUnlocked()) return;
  const u = SBU_DEFS.find(x => x.id === id);
  if (!u) return;
  const n = state[u.key] + 1;
  const cLog = sbuCostLog(u, n); // 价格权威（含超限额外缩放），log 域判定与扣款
  if (cmpLT(state.sp, Math.pow(10, cLog), getLogSp(), cLog)) return;
  subSpLog(cLog);
  state[u.key]++;
  if (!bulk) { saveGame(); updateBlackholeUI(); } // 可重复升级：不弹购买提示（防连点刷屏）
}
// 黑洞虚粒子升级（花 VP，位于黑洞页）
const SVPU_DEFS = [
  { id: "svpu1", key: "svpu1", name: "全息原理", desc: "吸积公式中质量的指数 +0.03/级", max: Infinity, costLog: (n) => lateCostMaxLog(n, 40, (m) => 1 + 2 * (m - 1), 5, 1.05) }, // 10×100^(n-1) VP，每级 ×100（上限走 svpu1Max：4 级，VPU4 后无上限）；40 级起每级价格 = max(上一级×1e5, 上一级^1.05)
  { id: "svpu2", key: "svpu2", name: "虚幻湮灭", desc: "获得的湮灭次数×2", max: Infinity, costLog: (n) => Math.log10(3) + (n - 1) * Math.log10(5) },  // 3×5^(n-1) VP
  { id: "svpu3", key: "svpu3", name: "非欧几何", desc: "削弱升级3软上限", max: 3, costLog: (n) => 5 * n - 4 },                  // 10^(5n-4) VP，增速 ×1e5
  { id: "svpu4", key: "svpu4", name: "热能超载", desc: "削弱温度的软上限", max: 3, costLog: (n) => 7 + (n - 1) * 3 },              // 1e7×1000^(n-1) VP
  { id: "svpu5", key: "svpu5", name: "潮汐撕裂", desc: "黑洞质量的软上限起始点每级 +10 个数量级", max: Infinity, costLog: (n) => lateCostMaxLog(n, 30, (m) => Math.log10(5e7) + (m - 1) * Math.log10(2000), 10, 1.05) }, // 5e7×2000^(n-1) VP；30 级起每级价格 = max(上一级×1e10, 上一级^1.05)
];
// 全息原理的实际等级上限（对偶原理 VPU4 后取消：4 → 无上限）
function svpu1Max() { return vpuOwned("vpu4") ? Infinity : 4; }
// 黑洞质量软上限起始点（log10）：1e50 起始，潮汐撕裂每级 +10 个数量级
function bhMassSoftcapLog() { return 50 + 10 * state.svpu5; }
// 卷缩里程碑 25：虚粒子升级（SVPU）不再消耗虚粒子——只免扣款，不免门槛（与前奇点升级免费同语义：
// 价格仍须达到才可购买，价格增长是免费状态下的天然限速，防止自动购买器无锚点连买）
function vpUpgradesFree() { return compMilestone(25); }
function buySVPU(id, bulk) {
  if (!bhUnlocked()) return;
  const u = SVPU_DEFS.find(x => x.id === id);
  if (!u) return;
  const effMax = id === "svpu1" ? svpu1Max() : u.max; // 全息原理：对偶原理后 4 → 无上限
  if (state[u.key] >= effMax) return;
  const n = state[u.key] + 1;
  const cLog = u.costLog(n);
  const c = Math.pow(10, cLog);
  if (cmpLT(state.virtualParticles, c, getLogVP(), cLog)) return; // 门槛照常
  if (!vpUpgradesFree()) subVPLog(cLog);
  state[u.key]++;
  if (!bulk) { saveGame(); updateBlackholeUI(); } // 可重复升级：不弹购买提示（防连点刷屏）
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
    const cLog = Math.log10(u.cost);
    if (!(state.logVoidVF10 >= cLog)) return;
    // 线性扣款 VF − cost：log 域须用异号相减（此前写成 logVF − log10(cost)，等于 VF÷cost）
    const r = logAddSigned(state.logVoidVF10, 1, cLog, -1);
    setVoidVFLog(r.sign < 0 ? NLOG : r.log);
  } else {
    const cLog = Math.log10(u.cost);
    if (cmpLT(state.virtualParticles, u.cost, getLogVP(), cLog)) return;
    subVPLog(cLog);
  }
  state.au["vpu_" + id] = 1;
  saveGame();
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
function bhAccretionMassExp() {
  const n = 0.75 + 0.03 * state.svpu1 + (vpuOwned("vpu4") ? 0.05 : 0);
  return n > 1 ? Math.sqrt(n) : n; // v0.6.2：质量指数超过 1 的部分开平方（n=1 处连续）
}
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
  saveGame();
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
    // N10：脉冲改为解析推进，消除长步长/短步长积分口径差异——
    // x=lg(M)>30 段 dx/dt=−(1+0.1x) 的精确解 x(t)=(x0+10)e^(−0.1t)−10，越过 x=30 的时刻
    // t*=10·ln((x0+10)/40)；x≤30 段线性 −1/s 至 0。VP 按两段各自起点速率 × 段时长累计
    //（小速率保留既有 floor 语义），在线短 tick 与离线长步长结果一致
    const segVp = (rateLog, dur) => {
      if (dur <= 0 || !(rateLog > NLOG + 1)) return;
      const rl = rateLog > 15 ? rateLog : Math.log10(Math.max(Math.floor(Math.pow(10, rateLog)), 1));
      vpSegLog = logAddLogs(vpSegLog, clampLog(rl + Math.log10(Math.max(dur, 1e-300))));
    };
    const x0 = mLog;
    let vpSegLog = NLOG;
    if (x0 > 30) {
      const tStar = 10 * Math.log((x0 + 10) / 40); // 高段（x>30）持续时间
      const tHigh = Math.min(dt, tStar);
      segVp(bhVPGainLog(), tHigh); // 段起点速率
      setBhMassLog((x0 + 10) * Math.exp(-0.1 * tHigh) - 10);
      if (dt > tStar) {
        const tLow = dt - tStar;
        setBhMassLog(30);
        segVp(bhVPGainLog(), tLow); // 低段起点（x=30）速率
        setBhMassLog(Math.max(30 - tLow, 0));
      }
    } else if (x0 > 0) {
      setBhMassLog(Math.max(0, x0 - dt));
      segVp(bhVPGainLog(), dt);
    }
    if (vpSegLog > NLOG + 1) setVPLog(logAddLogs(getLogVP(), vpSegLog));
  }
}

