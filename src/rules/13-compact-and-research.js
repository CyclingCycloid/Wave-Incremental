// ---------- 卷缩层（v0.6.0.0 测试：第三重置层）----------
// A55 解锁按钮，首次卷缩解锁「卷缩」主选项卡（里程碑/维度/理论树三个子页）。
// SS=超弦（卷缩货币，橙色）、Ins=灵感（理论树货币）、CM=卡拉比-丘流形（维度折叠器产出）。
// 全部数值采用「log10 权威 + double 缓存」双表示；CM 后台小数计算、显示取整。
// 卷缩重置此前所有内容（统计-通用 与 统计-挑战 保留）；湮灭不重置卷缩层内容。

const COMPACT_SS_GAIN_FIRST = 1; // 第一次卷缩固定获得 1 SS（后续卷缩的获取公式待定；第二次暂不开放）

// ---------- SS / Ins / CM 资源双表示（仿 VP 模式，零哨兵 NLOG）----------
function getLogSS() {
  if (state.logDss !== undefined && isFinite(state.logDss)) return clampLog(state.logDss);
  return state.ss > 0 ? clampLog(Math.log10(state.ss)) : NLOG;
}
function setSS(v) {
  state.ss = v;
  if (v > 0 && isFinite(v)) state.logDss = clampLog(Math.log10(v));
  else if (v <= 0) state.logDss = NLOG;
}
function setSSLog(lg) {
  state.logDss = clampLog(lg);
  state.ss = (lg <= NLOG + 1) ? 0 : (lg > 308 ? Infinity : Math.pow(10, lg));
}
function addSSLog(addLog) { setSSLog(logAddLogs(getLogSS(), addLog)); snapSS(); }
function subSSLog(costLog) {
  const r = logAddSigned(getLogSS(), 1, costLog, -1);
  if (r.sign < 0) setSS(0); else setSSLog(r.log);
  snapSS();
}
// SS/灵感为纯整数货币：log 域加减的 ~1ulp 浮点残差在源头吸附回整数
//（否则显示层 floor 会把 1.9999999999999998 显示成 1）
function snapIntCurrency(v) {
  const r = Math.round(v);
  return (isFinite(r) && Math.abs(v - r) <= 1e-6 * Math.max(1, r)) ? r : v;
}
function snapSS() {
  const r = snapIntCurrency(state.ss);
  if (r !== state.ss) {
    if (r > 0) { state.ss = r; state.logDss = clampLog(Math.log10(r)); }
    else { state.ss = 0; state.logDss = NLOG; }
  }
}
function snapIns() {
  const r = snapIntCurrency(state.ins);
  if (r !== state.ins) {
    if (r > 0) { state.ins = r; state.logDins = clampLog(Math.log10(r)); }
    else { state.ins = 0; state.logDins = NLOG; }
  }
}
function getLogTotalSS() {
  if (state.logDtotalSS !== undefined && isFinite(state.logDtotalSS)) return clampLog(state.logDtotalSS);
  return state.totalSS > 0 ? clampLog(Math.log10(state.totalSS)) : NLOG;
}
function addTotalSSLog(addLog) {
  const nLog = logAddLogs(getLogTotalSS(), addLog);
  state.logDtotalSS = nLog;
  state.totalSS = nLog <= NLOG + 1 ? 0 : (nLog > 308 ? Infinity : Math.pow(10, nLog));
}
function getLogIns() {
  if (state.logDins !== undefined && isFinite(state.logDins)) return clampLog(state.logDins);
  return state.ins > 0 ? clampLog(Math.log10(state.ins)) : NLOG;
}
function setIns(v) {
  state.ins = v;
  if (v > 0 && isFinite(v)) state.logDins = clampLog(Math.log10(v));
  else if (v <= 0) state.logDins = NLOG;
}
function setInsLog(lg) {
  state.logDins = clampLog(lg);
  state.ins = (lg <= NLOG + 1) ? 0 : (lg > 308 ? Infinity : Math.pow(10, lg));
}
function addInsLog(addLog) { setInsLog(logAddLogs(getLogIns(), addLog)); snapIns(); }
function subInsLog(costLog) {
  const r = logAddSigned(getLogIns(), 1, costLog, -1);
  if (r.sign < 0) setIns(0); else setInsLog(r.log);
  snapIns();
}
function getLogTotalIns() {
  if (state.logDtotalIns !== undefined && isFinite(state.logDtotalIns)) return clampLog(state.logDtotalIns);
  return state.totalIns > 0 ? clampLog(Math.log10(state.totalIns)) : NLOG;
}
function addTotalInsLog(addLog) {
  const nLog = logAddLogs(getLogTotalIns(), addLog);
  state.logDtotalIns = nLog;
  state.totalIns = nLog <= NLOG + 1 ? 0 : (nLog > 308 ? Infinity : Math.pow(10, nLog));
  snapTotalIns();
}
// 总灵感为整数货币：log 域累加的浮点残差吸附回整数（否则显示层四舍五入成 55 而
// 可购判定用原始值 54.99…，节点51 等总灵感门槛会被边界残差卡住）
function snapTotalIns() {
  const r = snapIntCurrency(state.totalIns);
  if (r !== state.totalIns) {
    if (r > 0) { state.totalIns = r; state.logDtotalIns = clampLog(Math.log10(r)); }
    else { state.totalIns = 0; state.logDtotalIns = NLOG; }
  }
}
function getLogCM() {
  if (state.logCM !== undefined && isFinite(state.logCM)) return clampLog(state.logCM);
  return state.cm > 0 ? clampLog(Math.log10(state.cm)) : NLOG;
}
function setCMLog(lg) {
  state.logCM = clampLog(lg);
  state.cm = (lg <= NLOG + 1) ? 0 : (lg > 308 ? Infinity : Math.pow(10, lg));
}
// 可负担性（价格以 log10 给出；double 范围内走 cmpGE 零回归，之外退 log 域比较）
function spAffordLog(costLog) {
  return costLog < 290 ? cmpGE(state.sp, Math.pow(10, costLog), getLogSp(), costLog) : getLogSp() >= costLog;
}
function ssAffordLog(costLog) {
  return costLog < 290 ? cmpGE(state.ss, Math.pow(10, costLog), getLogSS(), costLog) : getLogSS() >= costLog;
}

// ---------- 维度折叠器（CM 产出：TP² × 3^√(3·b₁·b₂) 每真实秒）----------
// 拓扑节点 TP（SS 购买，第 n 个 floor(1.5^n)）可转换为点 V/边 E/面 F（各消耗 1 TP，可退回）。
// 贝蒂数：b₁ = max(0, E−V+1)；b₂ = max(0, min(F, ⌊2E/3⌋)−E+V)。
// TP² 按**总节点数**（含已转换的 V/E/F）计；CM 后台小数计算、显示取整；卷缩重置 CM（配置保留）。
function tpTotal() { return state.tp + state.tpV + state.tpE + state.tpF; }
function betti1() { return Math.max(0, state.tpE - state.tpV + 1); }
function betti2() { return Math.max(0, Math.min(state.tpF, Math.floor(2 * state.tpE / 3)) - state.tpE + state.tpV); }
// 基础 CM 获取速率的 log10（TP=0 时为 NLOG 零哨兵）；
// R1「托特管状折叠」：基础获取变为 ×100 或 ^1.03 的更大值（log 域 = max(+2, ×1.03)）
function cmRateLog() {
  const n = tpTotal();
  if (n <= 0) return NLOG;
  const sLog = Math.sqrt(3 * betti1() * betti2()) * Math.log10(3);
  let rateLog = 2 * Math.log10(n) + sLog;
  if (researchBought("R1")) rateLog = Math.max(rateLog + 2, rateLog * 1.03);
  return clampLog(rateLog);
}
// 折叠器速度的附加乘数（log10，加在速率上）：R7「Ricci流预解算」×min(10^√lg(Inf+1), Inf^0.25)
// + 里程碑3「度规塌缩」的第四虚空泡沫效果 ×max(1, VF^0.1)（+0.1·lgVF）
function cmSpeedBonusLog() {
  let add = 0;
  if (researchBought("R7")) {
    const lgInf = getLogInf();
    if (lgInf > NLOG + 1) add += Math.min(Math.sqrt(lg1FromLog(lgInf)), 0.25 * lgInf);
  }
  if (voidMilestone3()) {
    const lgVF = state.logVoidVF10;
    // N06：规则为 max(1, VF^0.1)——0<VF<1 时不得产生负加成（低于无 VF 基线）
    const term = 0.1 * lgVF;
    if (term > 0) add += term;
  }
  return add;
}
// 理论树节点 01「最小作用量原理」：折叠器受严重削弱的时间倍率加成——
// 折叠器时间乘数 = max((1+lg(1+Speed))/2, Speed^0.005)（未购买时乘数为 1：不受游戏速度影响）
function cmTimeMultLog() {
  if (!theoryOwned("01")) return 0;
  const trLog = timeRateLog();
  const x = logAddLogs(0, trLog); // lg(1+Speed)
  const la = Math.log10(Math.max(1 + x, 1e-300)) - Math.log10(2); // lg((1+x)/2)
  const lb = 0.005 * trLog; // lg(Speed^0.005)
  return clampLog(Math.max(la, lb));
}
// 理论树节点 31「电动力学」：基于奇点加速维度折叠器 ×(1+lg(Sp+1))^0.8（返回 log10）。
// lg(Sp+1) 走 lg1FromLog；注意 Sp 的零哨兵是字面 0（getLogSp()=0 非 lg 语义），
// sp=0 须显式判 sp>0 取 lg(Sp+1)=0，否则 lg1FromLog(0)=lg(2) 会让无奇点时也获得 ×1.235。
// 内层 1+lg(Sp+1) 为小数值，double 直接算；与节点 01 的时间乘数并列的独立乘数——
// 基于持有 Sp，不受游戏速度影响
function cmSpAccelMultLog() {
  if (!theoryOwned("31")) return 0;
  const lgs = state.sp > 0 ? lg1FromLog(getLogSp()) : 0; // lg(Sp+1)（sp=0 时为 0）
  return clampLog(0.8 * Math.log10(1 + lgs));
}
// 折叠器 tick：CM 按真实时间累积（挂 applyProduction，离线模拟共用）。
// 初始不受游戏速度影响；节点 01 后乘上严重削弱的时间倍率（真实 dt × 乘数）；
// 节点 31 后再乘上基于奇点的加速乘数；R6 与里程碑3 第四 VF 效果再加速度乘数（cmSpeedBonusLog）
function cmTick(realDt) {
  if (state.compactions < 1 || !state.testMode) return;
  if (tpTotal() <= 0) return;
  const rateLog = cmRateLog();
  if (rateLog <= NLOG + 1) return;
  const dtLog = Math.log10(Math.max(realDt, 1e-300)) + cmTimeMultLog();
  setCMLog(logAddLogs(getLogCM(), rateLog + dtLog + cmSpAccelMultLog() + cmSpeedBonusLog()));
}
// 整数约束下的最佳分配（A64 奖励「自动最佳分配」的实现）。
// 连续最优 E*=(21T−9)/48（此时 F=2E/3 边界恰好活跃）附近 ±2 的每个 E，其最优 V 只可能在
// 内点 V₀=(E−⌊2E/3⌋+1)/2（F≥cap 段）或 F=cap 边界 V_b=T−E−⌊2E/3⌋ —— 常数个候选、
// 用真实整数公式评估取最大，计算量不随 T 增长（T=10⁶ 与宽邻域精确参考一致）。
// 小 T（≤64）连续锚点失真，直接 O(T²) 暴力（≤4096 次循环，无感）；
// T=65…3000 已与暴力逐一比对一致。剩余节点全部计入 F 恒不劣于留着不转（超出 cap 不影响 b₂）
function bestAllocInt(T) {
  const score = (V, E, F) => {
    const b1 = E - V + 1, b2 = Math.min(F, Math.floor(2 * E / 3)) - E + V;
    return (V >= 0 && E >= 0 && F >= 0 && b1 > 0 && b2 > 0) ? b1 * b2 : -1;
  };
  if (T <= 64) {
    let best = null;
    for (let E = 0; E <= T; E++) {
      const cap = Math.floor(2 * E / 3);
      for (let V = 0; V + E <= T; V++) {
        const s = score(V, E, T - E - V);
        if (s > 0 && (!best || s > best.score)) best = { V, E, F: T - E - V, score: s };
      }
    }
    return best;
  }
  let best = null;
  const consider = (V, E) => {
    if (V < 0 || V > E || E > T) return;
    const F = T - E - V;
    if (F < 0) return;
    const s = score(V, E, F);
    if (s > 0 && (!best || s > best.score)) best = { V, E, F, score: s };
  };
  const ef = (21 * T - 9) / 48;
  for (let E = Math.floor(ef) - 2; E <= Math.ceil(ef) + 2; E++) {
    if (E < 0) continue;
    const cap = Math.floor(2 * E / 3);
    const v0 = (E - cap + 1) / 2;
    consider(Math.floor(v0), E);
    consider(Math.ceil(v0), E);
    consider(T - E - cap, E); // F=cap 边界
  }
  return best;
}
// 「自动最佳分配」按钮（A64 奖励）：计算并应用整数约束下的最优 V/E/F
function applyAutoAlloc() {
  if (!state.ach.normal.includes("A64")) return;
  const T = tpTotal();
  const best = bestAllocInt(T);
  if (!best) { setAutosaveStatus("拓扑节点不足，暂无可行的几何分配"); return; }
  state.tpV = best.V; state.tpE = best.E; state.tpF = best.F;
  state.tp = T - best.V - best.E - best.F;
  saveGame();
  updateCompactUI();
  saveGame();
  setAutosaveStatus(`已自动最佳分配：点 ${best.V} · 边 ${best.E} · 面 ${best.F}（3b₁b₂ = ${3 * best.score}）`);
}
// 购买拓扑节点：第 n 个花费 floor(1.5^n) SS（n 从 1 起，按**总节点数**计——
// 含已转换为点/边/面的部分，否则转换后再购买会重新从第 1 个的价钱起算）
function tpNextCostValue() {
  const n = tpTotal() + 1;
  const lg = n * Math.log10(1.5);
  return lg < 15 ? Math.floor(Math.pow(1.5, n)) : null; // null：小数位已无意义，走 log 口径
}
// 最大购买信息（UI 显示用，不改状态）：逐个累加「第 n 个」价格直到买不动——
// 数值域走整数精确比较（snapSS 保证 state.ss 为整数），跨入 log 域后走 ssAffordLog 累计口径；
// costV 为整数总价（一旦跨入 log 域为 null，仅供显示），costLog 为总价 log10（log 域权威）
function tpMaxBuyInfo() {
  const n0 = tpTotal();
  let k = 0, spent = 0, spentLog = NLOG, lastValue = true;
  for (let guard = 0; guard < 1e5; guard++) {
    const n = n0 + k + 1;
    const lg = n * Math.log10(1.5);
    const v = lg < 15 ? Math.floor(Math.pow(1.5, n)) : null;
    const stepLog = v !== null ? Math.log10(Math.max(v, 1)) : lg;
    const totalLog = logAddLogs(spentLog, stepLog);
    if (v !== null && Number.isFinite(state.ss)) {
      if (spent + v > state.ss) break;
      spent += v;
    } else {
      if (!ssAffordLog(totalLog)) break;
      lastValue = false;
    }
    spentLog = totalLog;
    k++;
  }
  return { count: k, costLog: clampLog(spentLog), costV: lastValue && Number.isFinite(state.ss) ? spent : null };
}
// 购买拓扑节点（点击一次买满可负担的最大数量）：第 n 个花费 floor(1.5^n) SS（n 从 1 起，按**总节点数**计——
// 含已转换为点/边/面的部分，否则转换后再购买会重新从第 1 个的价钱起算）
function buyTP() {
  let bought = 0;
  for (let guard = 0; guard < 1e5; guard++) {
    const v = tpNextCostValue();
    const cLog = clampLog((tpTotal() + 1) * Math.log10(1.5));
    if (v !== null) {
      if (cmpLT(state.ss, v, getLogSS(), Math.log10(Math.max(v, 1)))) break;
      subSSLog(Math.log10(Math.max(v, 1)));
    } else {
      if (!ssAffordLog(cLog)) break;
      subSSLog(cLog);
    }
    state.tp++;
    bought++;
  }
  if (bought > 0) saveGame();
  return bought;
}
// 转换 / 退回：kind 为 "V"/"E"/"F"，dir=+1 消耗 1 TP 转换，dir=-1 退回 1 TP
function convertTP(kind, dir) {
  const key = "tp" + kind;
  if (dir > 0) {
    if (state.tp < 1) return;
    state.tp--; state[key]++;
  } else {
    if (state[key] < 1) return;
    state[key]--; state.tp++;
  }
  saveGame();
}

// ---------- 理论树（MN 编号：M=层数、N=层内从左往右序号；任意父节点已购即可购买）----------
const THEORY_NODES = [
  { id: "01", name: "最小作用量原理", parents: [], cost: 1,
    desc: "维度折叠器受严重削弱的时间倍率加成" },
  { id: "11", name: "经典场论", parents: ["01"], cost: 2,
    desc: "湮灭次数加成奇点效果",
    effect: () => "当前指数乘数 ×" + theory11Exp().toFixed(4) },
  { id: "12", name: "质点力学", parents: ["01"], cost: 2,
    desc: "略微削弱奇点获取的软上限",
    effect: () => "当前指数 0.12" },
  { id: "21", name: "电磁学", parents: ["11"], cost: 6,
    desc: "基于CM给予象限拓张免费等级，并削弱其软上限",
    effect: () => "当前 +" + fmt(theory21FreeLevel()) + " 免费等级 ｜ 软上限指数 " + (theoryOwned("21") ? "0.8" : "0.7") },
  { id: "22", name: "刚体力学", parents: ["12"], cost: 2,
    desc: "共轭湮灭的效果变为原来的十次方" },
  { id: "23", name: "分析力学", parents: ["12"], cost: 2,
    desc: "略微增强虚幻凝聚的效果",
    effect: () => "虚幻凝聚效果额外 ×" + fmtLog(0.08 * logAddLogs(0, getLogVP())) },
  { id: "31", name: "电动力学", parents: ["21"], cost: 4,
    desc: "基于奇点加速维度折叠器",
    effect: () => "当前 ×" + fmtLog(cmSpAccelMultLog()) },
  { id: "32", name: "几何光学", parents: ["22", "23"], cost: 3,
    desc: "获得的奇点 ×1e15" },
  { id: "41", name: "波动光学", parents: ["31", "32"], cost: 7,
    desc: "增强热能超载的效果，并削弱奇点凝聚与波长二次软上限" },
  { id: "51", name: "双缝干涉实验", parents: ["41"], cost: 0, research: true,
    desc: "拓宽“理论”的深度\n解锁“研究”",
    descHtml: "拓宽<span class=\"color-theory\">“理论”</span>的深度<br>解锁<span class=\"color-research\">“研究”</span>",
    reqIns: 55, hiddenUntilIns: 50, reqA63: true },
  // 光学系列（v0.6.3.2）：粒子说=紫色 / 波动说=青色，两系列互斥（只能购买一种）；
  // 拥有节点51 后才出现在树上。62 定价 35 灵感；61/71/72 价格待定（priceTBD 暂不可购买）
  { id: "61", name: "光学-粒子说 I", parents: ["51"], cost: 40, series: "particle",
    desc: "获得的超弦 ×1000",
    effect: () => "当前 ×1000" },
  { id: "71", name: "光学-粒子说 II", parents: ["61"], cost: 62, series: "particle",
    desc: "波长二次软上限削弱4%",
    effect: () => "当前削弱指数 0.99" },
  { id: "81", name: "光学-粒子说 III", parents: ["71"], cost: 0, series: "particle", placeholder: true,
    desc: "？？？" },
  { id: "62", name: "光学-波动说 I", parents: ["51"], cost: 35, series: "wave",
    desc: "基于当前超弦增加获得的超弦",
    effect: () => "当前 ×" + fmtLog(node62MultLog()) },
  { id: "72", name: "光学-波动说 II", parents: ["62"], cost: 25, series: "wave",
    desc: "基于奇点加强奇点效果",
    effect: () => "当前指数乘数 ×" + fmt(node72SpBoostExpMult()) },
  { id: "82", name: "光学-波动说 III", parents: ["72"], cost: 0, series: "wave", placeholder: true,
    desc: "？？？" },
];
function theoryOwned(id) { return !!state.theoryNodes[id]; }
// 波长公式内指数 e 的基础公式（节点71/72 改造前的原版，供「公式差值」显示）
function wavelengthExpBase() {
  return 1 + Math.log10(1 + cmLg1() / 3) / 10;
}
// 节点62「光学-波动说 I」：基于当前持有超弦的 SS 获取乘数
// min(10^(4+√(lgSS/40)), max(5·lgSS, SS^0.1))（SS=1 时为 1 倍）
function node62MultLog() {
  if (!theoryOwned("62")) return 0;
  const lgSS = Math.max(getLogSS(), 0);
  const aLog = 4 + Math.sqrt(lgSS / 40);
  const bLog = Math.log10(Math.max(5 * lgSS, Math.pow(10, Math.min(0.1 * lgSS, 307))));
  return Math.min(aLog, bLog);
}
// 光学系列（层≥6）节点可见性：拥有节点51 或**曾购买过**（闩锁，重置理论树不清）即出现在树上；
// 深于当前理论深度的节点**不隐藏**，显示为名字/效果/价格全？？？（见 updateCompactUI）
function theoryNodeVisible(def) {
  if (+def.id[0] < 6) return true;
  return theoryOwned("51") || !!state.theory51Bought;
}
// 光学系列互斥：已购任一粒子说节点则波动说全部不可购（反之亦然）
function theorySeriesLocked(def) {
  if (def.series === "particle") return theoryOwned("62");
  if (def.series === "wave") return theoryOwned("61");
  return false;
}
// 理论树节点 21 电磁学：基于 CM 给予象限拓张（SAU1）免费等级 lg(CM+1)×4
function theory21FreeLevel() {
  if (!theoryOwned("21")) return 0;
  return Math.max(0, cmLg1()) * 4;
}
// 象限拓张（SAU1）的免费等级合计：量子狂潮 + 理论树节点 21（软上限前）
function sau1FreeLevel() { return vpu2FreeLevel() + theory21FreeLevel(); }
// 理论树节点 11 经典场论：湮灭次数加成奇点效果——乘在四个奇点效果的**指数**上
//（与 1DA 的 daExpMult 同类实现）：波速获取、普朗克常数、普朗克温度上限、黑洞吸积效率
function theory11Exp() {
  if (!theoryOwned("11") || state.annihilations <= 0) return 1;
  return 1 + Math.log10(state.annihilations + 1) / 80;
}
// 四个奇点效果的指数（总 Sp 缩放项的指数，均受 1DA 与节点 11 加成）。
// 节点72「光学-波动说 II」：四个指数再 ×M（M = 1 + lg(1+lg(总Sp+1)/2)/3——基于奇点加强奇点效果，
// 与四个奇点效果同用总 Sp；多对数增长，totalSp=0 时 M 恰为 1）
function node72SpBoostExpMult() {
  if (!theoryOwned("72")) return 1;
  const l = state.totalSp > 0 ? lg1FromLog(getLogTotalSp()) : 0; // lg(总Sp+1)（哨兵：totalSp=0 时为 0，勿用 lg1FromLog(0)=lg2）
  return 1 + Math.log10(1 + l / 2) / 3;
}
function waveGainExp() { return 2 * daExpMult() * theory11Exp() * node72SpBoostExpMult(); }   // 波速获取 ×(1+Sp)^exp
function planckExp() { return 1.5 * daExpMult() * theory11Exp() * node72SpBoostExpMult(); }   // 普朗克常数 ×(1+Sp)^exp
function tempCapExp() { return 10 * daExpMult() * theory11Exp() * node72SpBoostExpMult(); }   // 普朗克温度上限 ×(1+Sp)^exp
function accretionExp() { return 3 * theory11Exp() * node72SpBoostExpMult(); }                // 黑洞吸积效率（AU43）^exp
function theoryAvailable(def) {
  if (theoryOwned(def.id) || def.placeholder) return false;
  if (+def.id[0] > theoryDepthEff() + 1e-9) return false; // 理论深度：更深层的节点暂不可购（显示？？？；1e-9 容差防浮点残差）
  if (def.hiddenUntilIns && getLogTotalIns() < Math.log10(def.hiddenUntilIns)) return false; // 节点51：总灵感 <50 隐藏
  if (def.reqIns && getLogTotalIns() < Math.log10(def.reqIns) - 1e-9) return false; // 节点51：总灵感门槛（含浮点容差）
  if (def.reqA63 && !state.ach.normal.includes("A63")) return false;
  if (def.priceTBD) return false; // 价格待定：暂无法购买
  if (theorySeriesLocked(def)) return false; // 光学系列互斥：另一系列已购则本系列不可购
  return def.parents.length === 0 || def.parents.some(p => theoryOwned(p));
}
// 灵感（Ins）购买价格（第 n 次，n=已购次数+1）：F：10^(25000n)，价格超过 1e200000
//（第 8 次起）加快为每级 +1e50000（拐点连续：10^(50000n−200000)，n=8 时仍为 1e200000）；
// Sp：10^(200(n-1))；SS：2^(n-1)
function insCostLogAt(src, n) {
  if (src === "F") {
    // 三段：+25000/级（n≤8）→ +50000/级（价格 1e3000000 前，n≤63）→ +100000/级（价格超 1e3000000，每级 ×1e100000）
    if (n <= 8) return clampLog(25000 * n);
    const log5 = 50000 * n - 200000;
    if (log5 <= 3e6) return clampLog(log5);
    return clampLog(100000 * n - 3400000);
  }
  if (src === "Sp") return clampLog(200 * (n - 1));
  if (src === "VP") return clampLog(60 + 15 * (n - 1)); // R8：初始 1e60，每级 ×1e15
  return clampLog((n - 1) * Math.log10(2));
}
function insCostLogF() { return insCostLogAt("F", state.insFromF + 1); }
function insCostLogSp() { return insCostLogAt("Sp", state.insFromSp + 1); }          // 首次 10^0 = 1 Sp
function insCostLogSS() { return insCostLogAt("SS", state.insFromSS + 1); } // 首次 2^0 = 1 SS
// 最大购买信息（UI 显示用，不改状态）：余额按 log 域逐次扣减（F 途径扣 U−cost·L^e 后 F 恰好
// 线性下降 balLog−cLog，与真实扣款同口径），返回可购次数与总价 log10
function insMaxBuyInfo(src) {
  if (src === "SS" && tpTotal() < 1) return { count: 0, costLog: NLOG };
  if (src === "VP" && !researchBought("R8")) return { count: 0, costLog: NLOG };
  let balLog = src === "F" ? FLog() : src === "Sp" ? getLogSp() : src === "VP" ? getLogVP() : getLogSS();
  let k = 0, cumLog = NLOG;
  for (let guard = 0; guard < 1e5; guard++) {
    const cLog = insCostLogAt(src, state["insFrom" + src] + k + 1);
    if (balLog < cLog) break;
    balLog = logAddSigned(balLog, 1, cLog, -1).log;
    cumLog = logAddLogs(cumLog, cLog);
    k++;
  }
  return { count: k, costLog: clampLog(cumLog) };
}
// 购买灵感（点击一次买满可负担的最大数量）：src 为 "F"/"Sp"/"SS"（F 途径沿用既有约定：
// 价格以 F 计，支付扣 U−cost·(有效波长)^e）
function buyIns(src) {
  let bought = 0;
  for (let guard = 0; guard < 1e5; guard++) {
    if (src === "F") {
      const cLog = insCostLogF();
      if (cmpLT(F(), Math.pow(10, Math.min(cLog, 308)), FLog(), cLog)) break;
      subULog(cLog);
    } else if (src === "Sp") {
      const cLog = insCostLogSp();
      if (!spAffordLog(cLog)) break;
      subSpLog(cLog);
    } else if (src === "VP") {
      // R8「启发式假说萃取」：虚粒子购买灵感
      if (!researchBought("R8")) break;
      const cLog = insCostLogAt("VP", state.insFromVP + 1);
      if (getLogVP() < cLog) break;
      subVPLog(cLog);
    } else {
      // SS 途径需拥有维度折叠器（至少 1 个拓扑节点）——第一个 SS 必须花在折叠器上
      if (tpTotal() < 1) break;
      const cLog = insCostLogSS();
      if (!ssAffordLog(cLog)) break;
      subSSLog(cLog);
    }
    state["insFrom" + src]++;
    addInsLog(0);        // 每次 +1 Ins（log10(1)=0）
    addTotalInsLog(0);
    bought++;
  }
  if (bought > 0) { saveGame(); setAutosaveStatus("获得 " + bought + " 灵感（" + src + " 途径）"); }
}
function buyTheoryNode(id) {
  const def = THEORY_NODES.find(n => n.id === id);
  if (!def || def.placeholder || theoryOwned(id) || !theoryAvailable(def)) return;
  if (!def.reqIns) { // reqIns 节点（双缝干涉实验）：不消耗灵感，以总灵感为门槛
    const cLog = Math.log10(Math.max(def.cost, 1));
    if (getLogIns() < cLog) return;
    subInsLog(cLog);
  }
  state.theoryNodes[id] = 1;
  if (id === "51") state.theory51Bought = 1; // 曾购买过 51：光学系列节点此后一直可见
  saveGame();
  setAutosaveStatus("理论解锁：" + def.name);
}
// ---------- 理论树导出/导入/预设（v0.6.0.0 测试）----------
// 格式：层用「;」分隔、同层节点用「,」、末尾固定「0d」段。例：01;11;21,22;31;41;0d
function exportTheoryTree() {
  // 紧凑格式（v0.6.3.2）：空层不输出占位分号，如只购 11/21/31/41 → "11;21;31;41;0d"
  const segs = [];
  for (let li = 0; li <= 8; li++) {
    const ids = THEORY_NODES.filter(n => +n.id[0] === li && theoryOwned(n.id)).map(n => n.id);
    if (ids.length) segs.push(ids.join(","));
  }
  return (segs.length ? segs.join(";") + ";" : "") + "0d";
}
// 解析理论树字符串：返回按「从上往下、从左往右」排序的节点 id 数组；格式有误返回 null。
// 格式：层与层用「;」分隔、同层节点用「,」、末尾固定「0d」段。
// v0.6.3.2 起节点 id 自带层号、段位不再参与校验——空层不占位的紧凑串与旧版带空层
// 占位的串（如 ";11;21;31;41;;0d"、"01;11;21,22;31;41;51;0d"）均可导入
function parseTheoryTree(str) {
  if (typeof str !== "string") return null;
  const segs = str.trim().split(";");
  if (segs.length < 1 || segs.length > 10 || segs[segs.length - 1] !== "0d") return null;
  const out = [];
  for (let li = 0; li < segs.length - 1; li++) {
    if (segs[li] === "") continue; // 兼容旧版空层占位
    for (const tok of segs[li].split(",")) {
      const def = THEORY_NODES.find(n => n.id === tok);
      if (!def) return null; // id 不存在
      if (!out.includes(tok)) out.push(tok);
    }
  }
  out.sort((a, b) => +a[0] - +b[0]); // 跨层排序；同层保持段内顺序
  return out;
}
// 在已购基础上（不清退）按给定顺序尽可能购买：父节点规则与灵感限额逐个判定
function importTheoryTreeList(ids) {
  if (!Array.isArray(ids)) return 0;
  let bought = 0;
  for (const id of ids) {
    const def = THEORY_NODES.find(n => n.id === id);
    if (!def || theoryOwned(id) || !theoryAvailable(def)) continue;
    if (!def.reqIns) {
      const cLog = Math.log10(Math.max(def.cost, 1));
      if (getLogIns() < cLog) continue;
      subInsLog(cLog);
    }
    state.theoryNodes[id] = 1;
    if (id === "51") state.theory51Bought = 1;

    saveGame();
    bought++;
  }
  return bought;
}
function copyTheoryTreeToClipboard() {
  const str = exportTheoryTree();
  const done = () => setAutosaveStatus("理论树已复制到剪贴板：" + str);
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = str;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { setAutosaveStatus("复制失败：" + str); }
    ta.remove();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(str).then(done, fallback);
  else fallback();
}
function doImportTheoryTree() {
  const s = prompt("输入理论树（格式如 01;11;21,22;31;41;0d）");
  if (s === null) return;
  // S28 增量神秘数字：在理论树导入框输入 69
  if (s.trim() === "69") { grantHidden("S28"); updateAchievementsUI(); setAutosaveStatus("隐藏成就达成：增量神秘数字（理论树格式有误，导入失败）"); return; }
  const ids = parseTheoryTree(s);
  if (!ids) { setAutosaveStatus("理论树格式有误，导入失败"); return; }
  const n = importTheoryTreeList(ids);
  saveGame();
  updateCompactUI();
  setAutosaveStatus("已导入理论树：购买 " + n + " 个节点");
}
// 预设（6 槽）：加载=贪心购买槽内树；保存=当前树存入；导入=输入树存入槽位；命名=改名
function loadTheoryPreset(i) {
  const p = state.theoryPresets[i];
  if (!p || !p.tree) { setAutosaveStatus("预设 " + (p ? p.name : "PR" + (i + 1)) + " 为空"); return; }
  const ids = parseTheoryTree(p.tree);
  if (!ids) { setAutosaveStatus("预设格式有误，加载失败"); return; }
  const n = importTheoryTreeList(ids);
  saveGame();
  updateCompactUI();
  setAutosaveStatus("已从预设 " + p.name + " 加载理论树：购买 " + n + " 个节点");
}
function saveTheoryPreset(i) {
  state.theoryPresets[i].tree = exportTheoryTree();
  saveGame();
  updateCompactUI();
  setAutosaveStatus("已保存当前理论树到预设 " + state.theoryPresets[i].name);
}
function importTheoryPreset(i) {
  const s = prompt("输入理论树存入预设（格式如 01;11;21,22;31;41;0d）");
  if (s === null) return;
  const ids = parseTheoryTree(s);
  if (!ids) { setAutosaveStatus("理论树格式有误，导入失败"); return; }
  state.theoryPresets[i].tree = s.trim();
  saveGame();
  updateCompactUI();
  setAutosaveStatus("已导入理论树到预设 " + state.theoryPresets[i].name);
}
function renameTheoryPreset(i) {
  const n = prompt("输入预设名称（大小写字母与数字，最多 5 个字符）");
  if (n === null) return;
  if (!/^[A-Za-z0-9]{1,5}$/.test(n)) { setAutosaveStatus("名称非法（仅大小写字母与数字，≤5 字符）"); return; }
  state.theoryPresets[i].name = n;
  saveGame();
  updateCompactUI();
}
// 预设（6 槽）：左键/右键切换内联菜单（加载/保存/导入/命名，作用于所选槽位）
let theoryMenuIdx = -1; // 当前打开菜单的预设槽位（-1=隐藏）
function closeTheoryPresetMenu() {
  theoryMenuIdx = -1;
  const m = document.getElementById("theory-preset-menu");
  if (m) m.classList.add("hidden");
}
function showTheoryPresetMenu(idx) {
  if (theoryMenuIdx === idx) { closeTheoryPresetMenu(); return; } // 再次点击同一按钮 → 隐藏
  theoryMenuIdx = idx;
  const m = document.getElementById("theory-preset-menu");
  if (!m) return;
  m.classList.remove("hidden");
  // 按钮文案带上所选预设名（如「保存 PR1」），明确作用对象
  const nm = state.theoryPresets[idx] ? state.theoryPresets[idx].name : "PR" + (idx + 1);
  const labels = ["加载", "保存", "导入", "命名"];
  m.querySelectorAll("button").forEach((b, i) => { b.textContent = labels[i] + " " + nm; });
}
function setupTheoryPresetMenu() {
  const m = document.getElementById("theory-preset-menu");
  if (!m || m.dataset.wired) return;
  m.dataset.wired = "1";
  const acts = [loadTheoryPreset, saveTheoryPreset, importTheoryPreset, renameTheoryPreset];
  m.querySelectorAll("button").forEach((b, i) => {
    b.addEventListener("click", () => { const idx = theoryMenuIdx; closeTheoryPresetMenu(); if (idx >= 0) acts[i](idx); });
  });
}

// ---------- 研究系统（v0.6.3：实验 ED 与推论 Inf）----------
// ED / Inf 资源双表示（log10 权威 + double 缓存，零哨兵 NLOG，同 SS/Ins 模式）
function getLogED() {
  if (state.logED !== undefined && isFinite(state.logED)) return clampLog(state.logED);
  return state.ed > 0 ? clampLog(Math.log10(state.ed)) : NLOG;
}
function setEDLog(lg) {
  state.logED = clampLog(lg);
  state.ed = (lg <= NLOG + 1) ? 0 : (lg > 308 ? Infinity : Math.pow(10, lg));
}
function getLogInf() {
  if (state.logDinf !== undefined && isFinite(state.logDinf)) return clampLog(state.logDinf);
  return state.inf > 0 ? clampLog(Math.log10(state.inf)) : NLOG;
}
function setInfLog(lg) {
  state.logDinf = clampLog(lg);
  state.inf = (lg <= NLOG + 1) ? 0 : (lg > 308 ? Infinity : Math.pow(10, lg));
}
function addInfLog(addLog) { setInfLog(logAddLogs(getLogInf(), addLog)); }
// inf -= 10^costLog（调用前须已确认可负担；推论为整数货币，浮点残差吸附回整数）
function subInfLog(costLog) {
  const r = logAddSigned(getLogInf(), 1, costLog, -1);
  setInfLog(r.sign < 0 ? NLOG : r.log);
  const snapped = snapIntCurrency(state.inf);
  if (snapped !== state.inf) {
    if (snapped > 0) { state.inf = snapped; state.logDinf = clampLog(Math.log10(snapped)); }
    else { state.inf = 0; state.logDinf = NLOG; }
  }
}
// 实验定义：解锁来自理论树节点（各有需求）；每个实验对应一种削弱
const RESEARCH_EXPS = [
  { id: "slit", name: "双缝干涉实验", unlock: () => theoryOwned("51"),
    science: "展示光子或电子等微观粒子同时具有波动性与粒子性的经典量子力学实验，当粒子穿过双缝时会在屏上形成明暗相间的干涉条纹。",
    debuff: (n) => n >= 1 ? `波长和波速获取公式的指数变为原来的 ${slitMult(n).toFixed(4)} 倍` : "无削弱" },
];
// 双缝干涉实验的每级削弱倍数：等级 1–4 为 0.6·0.8^(n-1)（0.6/0.48/0.384/0.3072）；
// 5 级起每级再 ×0.5（n=5 → 0.1536、n=6 → 0.0768……三处实现共用）
function slitMult(n) {
  if (n <= 4) return 0.6 * Math.pow(0.8, n - 1);
  return 0.3072 * Math.pow(0.5, n - 4);
}
// 双缝干涉的等级（实验进行中返回等级，否则 0）
function researchSlitLevel() {
  if (!state.researchRun) return 0;
  const e = state.researchRun.exps.find(x => x.id === "slit");
  return e ? e.level : 0;
}
// ---------- 研究项目（v0.6.3.2：A71「乌云」解锁；消耗推论购买，每个理论深度 +1/3）----------
// TODO(数值待定)：R6 的需求/价格为占位值，定稿后直接改这里
const RESEARCH_DEFS = [
  { id: "R1", name: "托特管状折叠", reqED: 1e3, costInf: 2e4, desc: "维度折叠器效果更好" },
  { id: "R2", name: "虚空探测器", reqED: 1e3, costInf: 5e4, desc: "解锁新的虚空内容" },
  { id: "R3", name: "动态调整LLM", reqED: 1e3, costInf: 1e5, desc: "引理加成自身获取" },
  { id: "R4", name: "Kähler模相位固化", reqED: 1.3e3, costInf: 1e7, desc: "卷缩不再重置卡拉比-丘流形" },
  { id: "R5", name: "热焓极点回溯", reqED: 3.5e3, costInf: 3e7, desc: "奇点改为使用此次湮灭最高温度计算" },
  { id: "R6", name: "态矢量相干保持", reqED: 3.5e3, costInf: 1e8, desc: "缩短波长不再重置任何东西" },
  { id: "R7", name: "Ricci流预解算", reqED: 3.5e3, costInf: 2.5e8, desc: "基于推论增加维度折叠器速度" },
  { id: "R8", name: "启发式假说萃取", reqTotalIns: 140, costInf: 2e9, desc: "增加一个新的灵感购买途径" },
  { id: "R9", name: "渐进推演范式 I", reqFLog: 3150000, reqVFLog: 30, costInf: 1e10, desc: "解锁一个课题" },
];
function researchDef(id) { return RESEARCH_DEFS.find(x => x.id === id); }
function researchBought(id) { return state.researchBought.includes(id); }
// 需求（可多项）与价格（推论）的可负担判定（含 1e-9 浮点容差，口径与显示一致）。
// 需求类型：reqED（实验数据）/ reqTotalIns（总灵感）/ reqFLog（历史最高频率）
function researchReqMet(def) {
  if (def.reqED !== undefined && getLogED() < Math.log10(def.reqED) - 1e-9) return false;
  if (def.reqTotalIns !== undefined && getLogTotalIns() < Math.log10(def.reqTotalIns) - 1e-9) return false;
  if (def.reqFLog !== undefined && FLog() < def.reqFLog - 1e-9) return false;
  if (def.reqVFLog !== undefined && state.logVoidVFBest10 < def.reqVFLog - 1e-9) return false;
  return true;
}
// 需求显示文本（按类型拼接）
function researchReqText(def) {
  const parts = [];
  if (def.reqED !== undefined) parts.push("需求 " + fmtNum(def.reqED, Math.log10(def.reqED)) + " ED");
  if (def.reqTotalIns !== undefined) parts.push("需求 " + fmtNum(def.reqTotalIns, Math.log10(def.reqTotalIns)) + " 总灵感");
  if (def.reqFLog !== undefined) parts.push("需求 达到 " + fmtLog(def.reqFLog) + " Hz");
  if (def.reqVFLog !== undefined) parts.push("需求 达到 1e" + def.reqVFLog + " VF（历史最高）");
  return parts.join(" ｜ ");
}
function researchCostMet(def) { return getLogInf() >= Math.log10(def.costInf) - 1e-9; }
function buyResearch(id) {
  const def = researchDef(id);
  if (!def || researchBought(id)) return;
  if (!state.ach.normal.includes("A71")) return; // 研究项目由 A71「乌云」解锁
  if (!researchReqMet(def)) { setAutosaveStatus("需求未满足：" + researchReqText(def)); return; }
  if (!researchCostMet(def)) { setAutosaveStatus("推论不足"); return; }
  subInfLog(Math.log10(def.costInf));
  state.researchBought.push(id);
  state.theoryDepth += 1 / 3; // 每购买一个研究，理论深度 +1/3
  if (id === "R1") grantHidden("S30");
  saveGame();
  updateResearchUI();
  updateCompactUI(); // 理论深度变化影响理论树节点可见性
  updateAchievementsUI();
  setAutosaveStatus("研究完成：" + def.name + "（理论深度 +1/3）");
}
// 已完成研究列表（研究项目区内联展开/收起，位于实验列表上方，一行两个）
function toggleResearchDone(force) {
  const grid = document.getElementById("research-done-grid");
  if (!grid) return;
  const show = force !== undefined ? force : grid.classList.contains("hidden");
  grid.classList.toggle("hidden", !show);
  if (show) renderResearchDone();
}
function renderResearchDone() {
  const grid = document.getElementById("research-done-grid");
  if (!grid) return;
  grid.innerHTML = "";
  const done = RESEARCH_DEFS.filter(d => researchBought(d.id));
  if (!done.length) {
    const empty = document.createElement("div");
    empty.className = "rp-desc";
    empty.textContent = "暂无已完成的研究";
    grid.appendChild(empty);
    return;
  }
  for (const def of done) {
    const card = document.createElement("div");
    card.className = "research-proj-card";
    const nm = document.createElement("div"); nm.className = "rp-name"; nm.textContent = def.name;
    const ds = document.createElement("div"); ds.className = "rp-desc"; ds.textContent = def.desc;
    card.append(nm, ds);
    grid.appendChild(card);
  }
}
// ---------- 课题（SR，v0.6.3.2：A72「立论」解锁区块，R9 解锁第一个课题）----------
// SR1 等级（小数）：由累计投入的推论计算 √(lg(累计投入+1))（消耗计入、只增不减）
function sr1Level() {
  return Math.sqrt(lg1FromLog(state.sr1InvestLog));
}
// 课题总等级（当前仅 SR1，未来新课题累加）
function srTotalLevel() { return sr1Level(); }
// 课题提供的理论深度加成：min(n, 5√n)/20（n=总课题等级）
function theoryDepthSrBonus() {
  const n = srTotalLevel();
  if (n <= 0) return 0;
  return Math.min(n, 5 * Math.sqrt(n)) / 20;
}
// 有效理论深度 = 基础深度（研究项目 +1/3 累计）+ 课题加成（判定与显示统一走此函数）
function theoryDepthEff() { return state.theoryDepth + theoryDepthSrBonus(); }
// SR1 效果：up3 指数软上限起点 = 3 + 0.1×等级
function sr1SoftcapStart() { return 3 + 0.1 * sr1Level(); }
// SR1 投入 tick（applyProduction 调用，真实时间 realDt 原始值，不受时间倍率影响）：
// 激活时每秒消耗当前持有推论的 1%（frac = 1−0.99^dt，复用 SVU1 手法）并累计
function sr1Tick(realDt) {
  if (state.srActiveId !== "SR1") return;
  if (!(realDt > 0) || !(state.inf > 0)) return;
  const frac = 1 - Math.pow(0.99, realDt);
  const useLog = clampLog(getLogInf() + Math.log10(frac));
  if (useLog <= NLOG + 1) return;
  subInfLog(useLog);
  state.sr1InvestLog = clampLog(logAddLogs(state.sr1InvestLog, useLog));
}
// 开始/停止研究（互斥：一次只能激活一个课题——当前仅 SR1，未来在此扩展）
function toggleSR1() {
  if (state.srActiveId === "SR1") {
    state.srActiveId = "";
    setAutosaveStatus("已停止课题：晶格弛豫调制");
  } else {
    state.srActiveId = "SR1";
    setAutosaveStatus("开始研究课题：晶格弛豫调制（每秒投入当前推论的 1%）");
  }
  saveGame();
  updateResearchUI();
}
// 三乘数（线性值，显示与结算共用的单一实现）：实验外预测/附加为 0、只算难度分
function researchMultipliers() {
  const run = state.researchRun;
  const exps = run ? run.exps : state.researchSel;
  const sum = exps.reduce((s, x) => s + x.level, 0);
  const difficulty = exps.length ? Math.pow(3, sum) * Math.pow(10, exps.length - 1) : 0;
  let pred = 0, bonus = 0;
  if (run) {
    const lgR1 = state.sp > 0 ? lg1FromLog(getLogSp()) : 0;   // RealSp = 当前持有 Sp
    const lgP1 = lg1FromLog(run.predictSpLog);
    pred = lgP1 <= 0 ? (lgR1 <= 0 ? 100 : 0) : 100 * (1 - Math.min(1, Math.abs(lgR1 - lgP1) / lgP1));
    const effR1 = Math.min(lgR1, lgP1); // 总奇点超过预测时，附加分按预测值计算
    // 附加分 = 奇点相关部分（硬上限 10）× √理论深度（R9「渐进推演范式 I」奖励，理论深度部分不受 10 上限限制）
    bonus = Math.min(10, Math.pow(Math.max(effR1, 0), 0.25)) * (researchBought("R9") ? Math.sqrt(theoryDepthEff()) : 1);
  }
  const total = run ? difficulty * pred * bonus : 0;
  return { difficulty, pred, bonus, total };
}
// 可获得的 ED（log10；三乘数为 0 时返回零哨兵）
function researchEDGainLog() {
  const m = researchMultipliers();
  if (!(m.total > 0) || !isFinite(m.total)) return NLOG;
  return clampLog(Math.log10(m.total));
}
// 实验退出条件：持有 Sp 达到软上限拐点（ED 不要求 VP 与全扭曲虚空）
function researchExitReady() { return getLogSp() >= SP_SOFTCAP_PIVOT_LOG; }
// 「可获得 − 当前 ED」的显示串（里程碑式资源：不足/无 → "0"；顶栏与研究页按钮共用）
function researchExitDiffText() {
  const gainLog = researchEDGainLog();
  const curLog = getLogED();
  if (gainLog > NLOG + 1 && gainLog > curLog) {
    const d = logAddSigned(gainLog, 1, curLog, -1);
    if (d.sign > 0) return fmtLog(d.log);
  }
  return "0";
}
// 研究重置：一次卷缩重置（不计次数、不获 SS），并额外重置虚粒子与黑洞质量
function researchResetBody() {
  applyCompactionResetBody(gameNow());
  setVP(0);
  setBhMass(1);
}
function startResearch() {
  if (state.researchRun) return;
  if (!state.researchSel.length) { setAutosaveStatus("请先选择至少一个实验"); return; }
  if (!(state.researchPredictSpLog > NLOG + 1)) { setAutosaveStatus("请先输入预测的总奇点"); return; }
  state.researchRun = { exps: state.researchSel.map(x => ({ id: x.id, level: x.level })), predictSpLog: state.researchPredictSpLog };
  researchResetBody(); // 进入实验：一次卷缩重置（不计次数），并重置 VP 与黑洞质量
  setAutosaveStatus("实验已开始");
}
function researchExit() {
  if (!state.researchRun || !researchExitReady()) return;
  const gainLog = researchEDGainLog();
  const before = getLogED();
  // 里程碑式：只有超过历史最高才入账；否则视为「获得 0 实验数据」（S29）
  const gained = gainLog > NLOG + 1 && gainLog > before;
  if (gained) setEDLog(gainLog);
  else { grantHidden("S29"); updateAchievementsUI(); }
  // 统计：完成实验计数与各实验最高完成等级（四舍五入去浮点残差；放弃不记）
  state.researchDone++;
  for (const x of state.researchRun.exps) {
    if (!(x.level > 0)) continue;
    state.researchBest[x.id] = Math.max(state.researchBest[x.id] || 0, Math.round(x.level));
  }
  state.researchRun = null;
  researchResetBody();
  setAutosaveStatus(gained ? "实验结束：获得 " + fmtLog(gainLog) + " 实验数据" : "实验结束：未获得实验数据");
}
function researchAbandon() {
  if (!state.researchRun) return;
  state.researchRun = null;
  researchResetBody();
  setAutosaveStatus("已放弃实验（无实验数据）");
}
// 推论产出：Multi × ED^0.8 每秒（真实时间）；R3「动态调整LLM」后 Multi 为 (lg(Inf+1))^3——
// 注意 3 是**对数值上的幂**（+3·lg(lg(Inf+1))），绝不能写成 +3·lg(Inf+1)（= ×Inf^3，直接发散）
function infRateLog() {
  const lg = getLogED();
  if (lg <= NLOG + 1) return NLOG;
  let rateLog = lg * 0.8;
  if (researchBought("R3")) {
    const l = lg1FromLog(getLogInf()); // lg(Inf+1)
    if (l > 0) rateLog += 3 * Math.log10(l); // ×(lg(Inf+1))^3：多对数增长，随 Inf 收敛
  }
  if (researchBought("R9")) rateLog += Math.log10(theoryDepthEff()); // R9：推论获取 ×理论深度
  return clampLog(rateLog);
}
function infTick(realDt) {
  if (!theoryOwned("51")) return;
  const rateLog = infRateLog();
  if (rateLog <= NLOG + 1) return;
  addInfLog(clampLog(rateLog + Math.log10(Math.max(realDt, 1e-300))));
}

// ---------- 卷缩重置 ----------
// 卷缩里程碑（need = 所需卷缩次数；奖励在该次卷缩后的新纪元生效）
function compMilestone(n) { return state.compactions >= n; }
function compMilestone1() { return compMilestone(1); }
const COMP_MILESTONES = [
  { n: 1, reward: "保持湮灭选项卡的可见性；卷缩后初始拥有 3 次湮灭次数" },
  { n: 2, reward: "卷缩后初始拥有 15 次湮灭次数" },
  { n: 3, reward: "卷缩后初始拥有 20 次湮灭次数和 100 奇点；初始批量购买 8 级，自动湮灭 CD 降至上限 25ms；卷缩不再重置自动化开关" },
  { n: 4, reward: "卷缩后「定向」「冷却」「刚性」为已完成状态" },
  { n: 5, reward: "保持已购的单次奇点升级（AU1n/2n/3n 无条件保留；AU4n 在新纪元解锁条件满足时保留——第 6 次起保留 AU41，第 7 次起 AU42/43，第 8 次起 AU44）" },
  { n: 6, reward: "卷缩后「狭窄」「膨胀」为已完成状态" },
  { n: 7, reward: "卷缩后「热寂」「滞涨」为已完成状态" },
  { n: 8, reward: "卷缩后「简洁」为已完成状态，并自动打破多元宇宙的规则" },
  { n: 10, reward: "卷缩保持「临界湮灭」「对偶原理」的购买；卷缩后初始拥有 1e10 奇点" },
  { n: 12, reward: "卷缩保持「单圈重整」「量子狂潮」的购买；卷缩后初始拥有 1e6 虚空泡沫（VF）" },
  { n: 14, reward: "卷缩不再重置虚空里程碑（保持最佳虚空扭曲生效数）；解锁自动湮灭新类型「持有倍率」（获取量达到当前持有奇点的指定倍数时湮灭）" },
  { n: 16, reward: "卷缩不再重置虚空升级；解锁可重复奇点升级自动购买器（自动化页）" },
  { n: 18, reward: "卷缩不再重置虚空泡沫；解锁黑洞升级自动购买器（自动化页）" },
  { n: 20, reward: "升级3不再重置升级1的等级；解锁虚粒子升级自动购买器（自动化页）" },
  { n: 25, reward: "卷缩不再重置黑洞质量与虚粒子，卷缩后黑洞处于扭曲状态；虚粒子升级不再消耗虚粒子" },
  { n: 30, reward: "解锁自动卷缩（可设置在多少超弦时卷缩，自动化页）；虚空共振的投入不再消耗资源；卷缩不再重置标签页" },
];
// 卷缩条件：VP ≥ 1e36、完成 A54（所有扭曲生效的虚空）、Sp ≥ 1.79e308（Sp 软上限拐点）
function canCompactify() {
  return state.testMode
    && state.ach.normal.includes("A55")
    && !state.voidActive
    && getLogVP() >= 36
    && state.voidBestRules >= 8
    && getLogSp() >= SP_SOFTCAP_PIVOT_LOG;
}
// SS 获取公式：SS = floor(((VP/1e36)^(1/30)×(Sp/1.79e308)^(1/300))^0.8)；
// 节点61「光学-粒子说 I」：×1000（+3）；节点62「光学-波动说 I」：×node62MultLog()（基于当前持有 SS）
function compactSSGainLog() {
  const vp = getLogVP(), sp = getLogSp();
  if (vp < 36 || sp < SP_SOFTCAP_PIVOT_LOG) return NLOG;
  let lg = ((vp - 36) / 30 + (sp - SP_SOFTCAP_PIVOT_LOG) / 300) * 0.8;
  if (theoryOwned("61")) lg += 3;
  if (theoryOwned("62")) lg += node62MultLog();
  return clampLog(lg);
}
function compactSSGain() {
  const lg = compactSSGainLog();
  if (lg <= NLOG + 1) return 0;
  return Math.max(1, Math.floor(Math.pow(10, Math.min(lg, 308))));
}
// SS 单次获取的 log10（整数货币口径，v0.6.2 修正）：<1e15 的获取量先向下取整再取 lg，
// 保证入账/最佳/历史/按钮显示均为整数（否则 log 驱动的显示会出现 199.526 这类小数）；
// ≥1e15 的量级 floor 已无显示意义，直接用原始 log（同时保留 >1e308 入账不封顶的修复）
function compactSSGainIntLog() {
  const lg = compactSSGainLog();
  if (lg <= NLOG + 1) return lg;
  return lg < 15 ? Math.log10(Math.max(1, Math.floor(Math.pow(10, lg)))) : lg;
}
// 卷缩重置：获得超弦并重置此前所有内容（统计-通用 与 统计-挑战 保留）
function compactify(auto) {
  if (!canCompactify()) return;
  // 第二次起不再弹确认框（自动卷缩也跳过）；仅首次卷缩确认
  if (state.compactions === 0 && !auto && !confirm("确定要进行卷缩重置吗？\n这将重置几乎所有内容（统计-通用与统计-挑战保留），并获得超弦（SS）。")) return;
  const realNow = gameNow();
  // 首次卷缩（尚无上一纪元）：本纪元时长 = 开局至今的真实游玩时长
  const realDur = state.compStartReal > 0
    ? Math.max((realNow - state.compStartReal) / 1000, 0)
    : Math.max(state.realTime || 0, 0);
  // 统计：最快卷缩（真实秒）、最好单次 SS、最佳 SS/分（真实分口径，与湮灭一致，log 权威）
  if (state.compFastest === 0 || realDur < state.compFastest) state.compFastest = realDur;
  // SS 获取：首次固定 1；此后按公式（当前 VP/Sp 决定，重置前读取）。
  // gLog 走 compactSSGainIntLog()（v0.6.2 修复：原从封顶 1.79e308 的 gained 反推，
  // SS 获取超 1e308 后每次卷缩只入账 1.79e308——gained 现仅作统计/历史显示）
  const firstComp = state.compactions === 0;
  const gLog = firstComp ? 0 : compactSSGainIntLog();
  const gained = firstComp ? COMPACT_SS_GAIN_FIRST : Math.max(1, Math.floor(Math.pow(10, Math.min(gLog, 308))));
  state.logBestSS = Math.max(state.logBestSS ?? NLOG, gLog);
  state.bestSS = Math.pow(10, Math.min(state.logBestSS, 308));
  const rateLog = clampLog(gLog + Math.log10(60 / Math.max(realDur, 1e-9)));
  state.logBestSSRate = Math.max(state.logBestSSRate ?? NLOG, rateLog);
  state.bestSSRate = Math.max(state.bestSSRate || 0, Math.pow(10, Math.min(rateLog, 308)));
  // 本次卷缩游戏时长的 log 权威（double 缓存被 MAX_VALUE 封顶时以 log 为准）
  const compGameLog = (state.compGameElapsedLog !== undefined && isFinite(state.compGameElapsedLog) && state.compGameElapsedLog > NLOG + 1)
    ? state.compGameElapsedLog
    : ((state.compGameElapsed > 0 && isFinite(state.compGameElapsed)) ? Math.log10(state.compGameElapsed) : NLOG);
  // 历史记录（最近十次卷缩；SS/速率存 log 权威，可超 double）
  pushCompHistory({
    label: `第 ${fmtAnnNum(state.compactions + 1)} 次`,
    ss: gained, realDur,
    gameDur: state.compGameElapsed, gameDurLog: compGameLog,
    rate: realDur > 0 ? (gained / realDur) * 60 : 0, at: realNow,
    ssLog: gLog, rateLog,
  });
  addSSLog(gLog);
  addTotalSSLog(gLog);
  state.compactions++;
  // 卷缩里程碑解锁的自动化（立即授予；老存档由 tick 补发）
  if (compMilestone(16)) state.autoSau = 1;
  if (compMilestone(18)) state.autoSbu = 1;
  if (compMilestone(20)) state.autoSvpu = 1;
  if (compMilestone(30)) state.autoComp = 1;
  applyCompactionResetBody(realNow);
  setAutosaveStatus(`卷缩完成：获得 ${fmtNum(gained, gLog)} 超弦（SS）`);
}

// 卷缩重置主体（compactify 与测试工具「导致一次卷缩重置」共用）
function applyCompactionResetBody(realNow) {
  // 里程碑判定按重置后的新 compactions（此时 compactify 已 ++）——奖励对新纪元立即生效
  // —— 波动 / 声子（全量重置；里程碑给予的保留项在下方补发）——
  setU(resetU()); state.L = 1; state.logL10 = 0;
  state.up1 = 0; state.up2 = 0; state.up3 = 0; state.up3LastF = 0; state.logUp3LastF = NLOG;
  state.meta1 = 0;
  setPhonons(0); state.phOn = false; state.phUnlocked = 0;
  state.pg1 = 0; state.pg2 = 0; state.pg3 = 0;
  state.phFluct = 0; state.phCoupling = 0;
  // —— 湮灭层 ——
  setSp(0); setTotalSp(0);
  state.sau1 = 0; state.sau2 = 0; state.sau3 = 0; state.sau4 = 0;
  // AU/VPU 快照：里程碑 5/10/12 按条件恢复（快照于清除前）
  const prevAu = Object.assign({}, state.au);
  const prevCond = Array.isArray(state.vpuCondMet) ? state.vpuCondMet.slice() : [];
  state.au = {};            // AU 与 VPU（vpu_* 存于 au）一并清除
  state.vpuCondMet = [];    // VPU 解锁 latch：「仅当出现比湮灭更高层次的重置时才清除」——卷缩即该重置
  // 湮灭次数阶梯：≥3 → 20；≥2 → 10；≥1 → 3；否则 0（等效对应湮灭里程碑）
  state.annihilations = compMilestone(3) ? 20 : compMilestone(2) ? 15 : compMilestone(1) ? 3 : 0;
  if (compMilestone(1)) {
    state.phUnlocked = 1; state.meta1 = 1; state.phFluct = 1; state.phCoupling = 1;
    state.autoWaveUpg = 1; state.autoPhononUpg = 1;
  }
  if (compMilestone(2)) state.phOn = true; // 第二次卷缩起：声子发生器自动打开
  if (compMilestone(3)) { setSp(100); setTotalSp(100); } // 初始 100 奇点
  if (compMilestone(10)) { setSp(1e10); setTotalSp(1e10); } // 里程碑 10：初始 1e10 奇点（覆盖里程碑 3 的 100）
  state.autoUp3 = 0; state.autoAnn = 0;
  // 里程碑 3 起：卷缩不重置自动化开关（解锁标志 autoUp3/autoAnn 仍清零，
  // 由 tick 按「20 次湮灭」里程碑补发，开关保持即自动恢复运转）
  if (!compMilestone(3)) state.autoOn = defaultAutoOn();
  state.autoAnnCDLvl = compMilestone(3) ? 6 : 0; // 里程碑 3：湮灭自动化 CD 直接打到 25ms 下限
  state.batchLvl = compMilestone(3) ? 8 : 0; // 里程碑 3：初始批量购买 8 级（上限 512）
  state.batchMax = compMilestone(3) ? 512 : 2;
  state.lastAutoUp3At = 0; state.lastAutoAnnAt = 0;
  state.annBestSp = 0; state.annBestSpLog = NLOG;
  state.annBestRate = 0; state.annBestRateLog = NLOG;
  state.annFastest = 0; state.annHistory = [];
  // —— 扭曲（挑战统计 distortBest/distortTotal 保留；里程碑 4/6/7/8 预完成宇宙）——
  state.distortActive = ""; state.distortDone = [];
  if (compMilestone(4)) state.distortDone.push("directed", "cooldown", "rigid");
  if (compMilestone(6)) state.distortDone.push("narrow", "expand");
  if (compMilestone(7)) state.distortDone.push("adiabatic", "inflation");
  if (compMilestone(8)) state.distortDone.push("simple");
  state.distortMult = Math.pow(2, state.distortDone.length);
  state.lastPurchaseAt = 0; state.narrowPurchases = 0;
  // 里程碑 8：所有宇宙预完成 → 自动打破多元宇宙的规则（8DA 里程碑的效果即此）
  state.rulesBroken = compMilestone(8);
  state.testBreakRules = false;
  state.zeroGainSince = 0; state.capReachedAt = 0;
  // —— AU 恢复（里程碑 5）：AU1n/2n/3n 无条件；AU4n 按新纪元解锁条件 ——
  if (compMilestone(5)) {
    for (const k of Object.keys(prevAu)) {
      if (k.startsWith("vpu_")) continue;
      if (k === "au41" && !hasDistortMilestone(4)) continue; // 4DA
      if (k === "au42" && !hasDistortMilestone(6)) continue; // 6DA
      if (k === "au43" && !hasDistortMilestone(7)) continue; // 7DA
      if (k === "au44" && !state.rulesBroken) continue;      // 打破规则
      state.au[k] = 1;
    }
  }
  // —— VPU 恢复：里程碑 10（临界湮灭/对偶原理）、12（单圈重整/量子狂潮）——
  const restoreVpu = (id) => {
    const key = "vpu_" + id;
    if (prevAu[key]) {
      state.au[key] = 1;
      if (prevCond.includes(id) && !state.vpuCondMet.includes(id)) state.vpuCondMet.push(id);
    }
  };
  if (compMilestone(10)) { restoreVpu("vpu4"); restoreVpu("vpu5"); }
  if (compMilestone(12)) { restoreVpu("vpu1"); restoreVpu("vpu2"); }
  // —— 黑洞：里程碑 25 保留质量与虚粒子，且卷缩后处于扭曲状态 ——
  if (!compMilestone(25)) {
    setBhMass(1); state.bhState = "accrete"; setVP(0);
  } else {
    state.bhState = "distorl";
  }
  state.sbu1 = 0; state.sbu2 = 0; state.sbu3 = 0;
  state.svpu1 = 0; state.svpu2 = 0; state.svpu3 = 0; state.svpu4 = 0; state.svpu5 = 0;
  // —— 虚空：里程碑 14/16/18 条件保留，其余重置 ——
  state.voidActive = false; state.voidRules = [];
  if (!compMilestone(18)) { setVoidVFLog(NLOG); state.logVoidVFCap10 = NLOG; } // cap 与 current 一并清零
  if (!compMilestone(16)) {
    state.svu1SpLog = NLOG; state.svu1VpLog = NLOG; state.svu1VfLog = NLOG;
    state.svu1Filling = false;
    state.svu2Level = 0;
  }
  if (!compMilestone(14)) state.voidBestRules = 0;
  if (compMilestone(12)) { // 初始 1e6 VF（不降低已有）：current 与 cap 双写
    setVoidVFCapLog(Math.max(state.logVoidVF10 ?? NLOG, 6));
    setVoidVFLog(clampLog(Math.max(state.logVoidVF10 ?? NLOG, 6)));
  }
  // —— 卷缩层自身：CM 重置（TP/V/E/F 配置、SS/Ins/理论树保留）；
  // R4「Kähler模相位固化」后卷缩（含研究重置）不再清 CM
  if (!researchBought("R4")) setCMLog(NLOG);
  // 理论树：勾选「卷缩重置理论树」时清空已购节点并返还所耗灵感（AD 重置语义），随后解除开关
  if (state.theoryRespec) {
    let refund = 0;
    for (const def of THEORY_NODES) if (theoryOwned(def.id)) refund += def.cost || 0;
    if (refund > 0) addInsLog(Math.log10(refund));
    state.theoryNodes = {};
    state.theoryRespec = false;
  }
  // —— 计时 ——
  state.annStartReal = realNow;
  state.annStartGame = state.playTime; state.annGameElapsed = 0; state.annGameElapsedLog = NLOG; state.annMaxTLog = NLOG;
  state.compStartReal = realNow; state.compGameElapsed = 0; state.compGameElapsedLog = NLOG;
  updateDispAnchor();
  applyPhononVisibility();
  applyAnnihilationVisibility();
  applyCompactVisibility();
  updateCompactButton();
  checkAchievements();
  if (!simActive && !compMilestone(30)) {
    // 卷缩里程碑 30：卷缩不再重置标签页（不再强制切回波动/主要，自动卷缩同样生效）
    switchTab("wave");
    switchSubtab("main");
  }
  saveGame();
  if (!simActive) renderAll();
}

// 测试工具：「导致一次卷缩重置」——执行与卷缩完全相同的重置范围，
// 但不获 SS、不计卷缩次数、不入统计与历史（仅测试模式的危险操作区可见）
function forceCompactReset() {
  if (!state.testMode) return;
  if (!confirm("确定要导致一次卷缩重置吗？（测试：不获得 SS、不计卷缩次数）")) return;
  applyCompactionResetBody(gameNow());
  setAutosaveStatus("已导致一次卷缩重置（测试：无收益）");
}

