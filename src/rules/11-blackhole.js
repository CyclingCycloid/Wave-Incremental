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
function sbu3Eff() { return effLevel(state.sbu3 + vpu2FreeLevel(), 16, 0.5); }
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
// 黑洞对时间速率的加成（仅扭曲状态）的 log10：×(1 + bhEffect)；AU34 引力扭曲：扭曲状态效果额外 ^2。
// 扭曲效果预览（bhTimeMultPreviewLog）供黑洞页三状态常显；实际应用仍仅扭曲状态（bhTimeMultLog 门控）
function bhTimeMultPreviewLog() {
  if (!bhUnlocked()) return 0;
  let el = bhEffectLog();
  if (auOwned("au34")) el = clampLog(el * 2);
  return el > 0 ? clampLog(logAddLogs(0, el)) : 0;
}
function bhTimeMultLog() {
  if (!bhUnlocked() || state.bhState !== "distorl") return 0;
  return bhTimeMultPreviewLog();
}
function bhTimeMult() {
  const l = bhTimeMultLog();
  return l > 0 ? (l > 308 ? Infinity : Math.pow(10, l)) : 1;
}
// 吸积效率倍率（SBU1 事件视界 ×2/级；AU43 奇点塌缩额外 ×spAccretionMult）——以 log 形式接入 bhAccretionRateLog
// AU43 奇点塌缩：黑洞吸积效率倍率 = (lg(Sp+1) + (Sp+1)^0.01)^3（double 版，显示用；
// totalSp 缓存 Infinity 时返回 Infinity，显示层走 spAccretionMultLog）
function spAccretionMult() {
  if (!auOwned("au43")) return 1;
  const sp1 = 1 + state.totalSp;
  // 理论树节点 11：湮灭次数加成奇点效果——第 4 效果（黑洞吸积）的指数同乘
  return Math.pow(Math.log10(sp1) + Math.pow(sp1, 0.01), accretionExp());
}
// spAccretionMult 的 log10（log 域：totalSp 缓存 Infinity 时仍正确，不产生污染）
function spAccretionMultLog() {
  if (!auOwned("au43")) return 0;
  // l1 = lg(Sp+1) 的数值本身（totalSp=0 时为 0）
  const spLog = state.totalSp > 0 ? getLogTotalSp() : -Infinity;
  const l1 = spLog === -Infinity ? 0 : lg1FromLog(effTotalSpLog()); // v0.6.2：lg(有效Sp+1)，套 1e2000 软上限
  // lg( lg(Sp+1) + (Sp+1)^0.01 ) × 指数；理论树节点 11：第 4 效果（黑洞吸积）的指数同乘
  return clampLog(accretionExp() * logAddLogs(Math.log10(Math.max(l1, 1e-300)), 0.01 * l1));
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
// 虚空里程碑 3「度规塌缩」（v0.6.3.2）：购买研究 R2「虚空探测器」后出现；
// 条件=历史最高持有 VF ≥ 1e22（logVoidVFBest10 在 setVoidVFLog 内 latch，只增不减）。
// 效果：定向削弱在虚空中失效（乘数与生效数保留）、解锁 SVU3「虚数相变」、
// 前三个 VF 效果按 VF^1.1 计算、维度折叠器速度 ×max(1, VF^0.1)
function voidMilestone3() { return researchBought("R2") && state.logVoidVFBest10 >= 22; }
// 虚空里程碑列表（虚空页每个里程碑一个独立格子）
const VOID_MILESTONES = [
  { n: 1, title: "聚合浪潮", need: 4,
    desc: "完成至少同时 4 种扭曲生效的虚空",
    reward: "解锁虚空泡沫第二效果，解锁虚空升级" },
  { n: 2, title: "七重湮灭", need: 7,
    desc: "完成至少同时 7 种扭曲生效的虚空",
    reward: "解锁虚空泡沫第三效果" },
  { n: 3, title: "度规塌缩", need: 22,
    desc: "购买研究「虚空探测器」后，持有的虚空泡沫达到 1e22",
    reward: "虚空内定向效果不再生效，增加一个新的虚空升级，增强虚空泡沫效果，以及增加一个新的虚空泡沫效果" },
  { n: 4, title: "???", need: 0, // TODO(内容待定)：占位里程碑，实装时补条件与奖励
    desc: "？？？",
    reward: "？？？" },
];
// 虚空泡沫第三效果的幂次（未解锁里程碑 2 或无 VF 时为 1，即无影响）。
// 里程碑3「度规塌缩」：前三个 VF 效果按真实数量的 ^1.1 计算（log 域 = lgVF ×1.1）
function vfEffectVFLog(lg) { return voidMilestone3() ? lg * 1.1 : lg; }
function vfGainExp() {
  if (!voidMilestone2() || !(state.logVoidVF10 > NLOG + 1)) return 1;
  return 1 + Math.min(0.2, lg1FromLog(vfEffectVFLog(state.logVoidVF10)) / 300);
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
  const vfPart = voidMilestone1() && state.logVoidVF10 > NLOG + 1
    ? (2 / 3) * vfEffectVFLog(state.logVoidVF10) // 里程碑3 后按 VF^1.1 计算
    : 0;
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
