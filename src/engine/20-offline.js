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
// D05：离线收益只写增益——损耗/归零返回 null（条目整个不写）。
// old/new 为 log10；new−old 用带符号 log 减法求 lg(new−old)（方向与幅度）；
// 幅度 ≥300（超 double）以 eXXX 形式显示——永不出现 ∞，即使资源已到 log 权威上限（1e15）
function offlineAbsGain(oldLog, newLog) {
  const hasOld = oldLog > NLOG + 1, hasNew = newLog > NLOG + 1;
  if (!hasNew) return null;                                    // 结束时为 0（损失）：不写
  if (!hasOld) return magText(newLog);                         // 从零到有：增益
  const r = logAddSigned(newLog, 1, oldLog, -1);               // lg(new−old)，带符号
  if (r.sign < 0 || r.log <= NLOG + 1) return null;             // 损失/完全抵消：不写
  const mag = Math.abs(r.log);
  return mag < 300 ? fmt(Math.pow(10, mag)) : "e" + mag.toFixed(3);
}
// 幅度显示：|lg| < 300 → 常规 fmt；≥300 → eXXX 形式（永不 ∞）
function magText(logV) {
  return Math.abs(logV) < 300 ? fmt(Math.pow(10, logV)) : "e" + Math.abs(logV).toFixed(3);
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
  const uCh = offlineAbsGain(res.uLog0, res.uLog1);
  if (uCh) lines.push("波速 +" + uCh + " m/s");
  // 声子优先显示绝对增量（大基数上的小增量 log 差趋 0 会漏报），超 double 回退 log 带方向差
  const phAbsD = (isFinite(res.phAbs0) && isFinite(res.phAbs1)) ? res.phAbs1 - res.phAbs0 : NaN;
  if (isFinite(phAbsD) && phAbsD >= 1) lines.push("声子 +" + fmt(Math.floor(phAbsD)));
  else { const phCh = offlineAbsGain(res.ph0, res.ph1); if (phCh) lines.push("声子 +" + phCh); }
  if (bhUnlocked()) {
    const mCh = offlineAbsGain(res.m0, res.m1);
    if (mCh) lines.push("黑洞质量 +" + mCh.text + " M☉");
    const vpCh = offlineAbsGain(res.vp0, res.vp1);
    if (vpCh) lines.push("虚粒子 +" + vpCh.text);
  }
  const annD = res.ann1 - res.ann0;
  if (annD >= 1) lines.push("湮灭 +" + fmt(Math.floor(annD)) + " 次");
  const spCh = offlineAbsGain(res.sp0, res.sp1);
  if (spCh) lines.push("奇点 +" + spCh.text);
  const cmCh = offlineAbsGain(res.cm0, res.cm1);
  if (cmCh) lines.push("卡拉比-丘流形 +" + cmCh.text);
  // 离线期间冻结：明示无进度原因（10 次湮灭前达到上限即暂停，等待手动湮灭）
  if (annihilationFrozen()) lines.push("湮灭条件已满足：离线期间计算已暂停（湮灭后恢复）");
  if (lines.length <= 1) return; // 无实质收益（如生产为 0 挂机）不弹
  document.getElementById("offline-text").textContent = lines.join("\n");
  document.getElementById("offline-overlay").classList.remove("hidden");
}

