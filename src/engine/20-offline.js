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
// D05：离线收益按绝对增量表述——offlineLogDiff 是倍率 lg(new/old)，不能直接当增量显示。
// old/new 为 log10；双方可表示时取真实绝对差，超大值取 log 域减法 lg(new−old)，无旧值取绝对值。
function offlineAbsGain(oldLog, newLog) {
  const hasOld = oldLog > NLOG + 1, hasNew = newLog > NLOG + 1;
  if (!hasNew) return null;
  if (!hasOld) return newLog < 300 ? fmt(Math.pow(10, newLog)) : fmtLog(newLog);
  if (newLog < 300 && oldLog < 300) return fmt(Math.pow(10, newLog) - Math.pow(10, oldLog));
  return fmtLog(logAddSigned(newLog, 1, oldLog, -1));
}
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
    cm0: getLogCM(),
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
      // 与在线一致：10 次湮灭前达到湮灭条件即暂停（不推进生产与购买）
      if (!annihilationFrozen()) { applyProduction(dt); runAutomation(); }
      // S05/O04：离线同口径执行 SVU 投入/增长、自动化解锁与成就检查
      tickProgression(dt);
      checkAchievements();
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
  res.cm1 = getLogCM();
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
  const uAbs = offlineAbsGain(res.uLog0, res.uLog1);
  if (uAbs !== null) lines.push("波速 +" + uAbs + " m/s");
  // 声子优先显示绝对增量（大基数上的小增量 log 差趋 0 会漏报），超 double 回退 log 差
  const phAbsD = (isFinite(res.phAbs0) && isFinite(res.phAbs1)) ? res.phAbs1 - res.phAbs0 : NaN;
  const phD = offlineLogDiff(res.ph0, res.ph1);
  if (isFinite(phAbsD) && phAbsD >= 1) lines.push("声子 +" + fmt(Math.floor(phAbsD)));
  else { const phAbs = offlineAbsGain(res.ph0, res.ph1); if (phAbs !== null) lines.push("声子 +" + phAbs); }
  if (bhUnlocked()) {
    const mD = offlineLogDiff(res.m0, res.m1);
    const mAbs = offlineAbsGain(res.m0, res.m1);
    if (mAbs !== null) lines.push("黑洞质量 +" + mAbs + " M☉");
    else if (isFinite(mD) && mD < -1e-4) lines.push("黑洞质量 ÷" + fmt(Math.pow(10, -mD)) + "（脉冲衰减）");
    const vpD = offlineLogDiff(res.vp0, res.vp1);
    const vpAbs = offlineAbsGain(res.vp0, res.vp1);
    if (vpAbs !== null) lines.push("虚粒子 +" + vpAbs);
    else if (isFinite(vpD) && vpD < -1e-4) lines.push("虚粒子 ÷" + fmt(Math.pow(10, -vpD)) + "（吸积衰减）");
  }
  const annD = res.ann1 - res.ann0;
  if (annD >= 1) lines.push("湮灭 +" + fmt(Math.floor(annD)) + " 次");
  const spD = offlineLogDiff(res.sp0, res.sp1);
  const spAbs = offlineAbsGain(res.sp0, res.sp1);
  if (spAbs !== null) lines.push("奇点 +" + spAbs);
  // 卡拉比-丘流形（卷缩层离线产出；显示 floor 与页面口径一致）
  const cmD = offlineLogDiff(res.cm0, res.cm1);
  const cmAbs = offlineAbsGain(res.cm0, res.cm1);
  if (cmAbs !== null) lines.push("卡拉比-丘流形 +" + cmAbs);
  if (lines.length <= 1) return; // 无实质收益（如生产为 0 挂机）不弹
  document.getElementById("offline-text").textContent = lines.join("\n");
  document.getElementById("offline-overlay").classList.remove("hidden");
}

