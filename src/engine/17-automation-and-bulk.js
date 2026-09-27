// ---------- 自动化 ----------
const AUTO_DEFS = [
  { key: "wave", unlockState: "autoWaveUpg", name: "自动购买主要页升级", desc: "自动购买波动主要页面的可重复升级（升级1/2）", unlockDesc: "1e10 Hz 解锁" },
  { key: "phonon", unlockState: "autoPhononUpg", name: "自动购买声子页升级", desc: "自动购买波动声子页面的可重复升级", unlockDesc: "1e20 Hz 解锁" },
  { key: "up3", unlockState: "autoUp3", name: "自动购买升级3", desc: "在达到指定倍率时自动购买升级3", unlockDesc: "第 8 次湮灭解锁", input: { id: "auto-up3-mult", label: "倍率", value: () => state.autoUp3Mult } },
  { key: "ann", unlockState: "autoAnn", name: "自动湮灭", desc: "在可获取指定奇点数时自动湮灭", unlockDesc: "第 10 次湮灭解锁", input: { id: "auto-ann-sp", label: "Sp", value: () => state.autoAnnSp } },
  // 卷缩里程碑解锁（达成前整行不可见）
  { key: "sau", unlockState: "autoSau", name: "自动购买可重复奇点升级", desc: "自动购买 SAU 可重复升级与真空衰变", unlockDesc: "卷缩里程碑 16 解锁", hideLocked: true },
  { key: "sbu", unlockState: "autoSbu", name: "自动购买黑洞升级", desc: "自动购买三个黑洞升级（事件视界/引力潮汐/霍金辐射）", unlockDesc: "卷缩里程碑 18 解锁", hideLocked: true },
  { key: "svpu", unlockState: "autoSvpu", name: "自动购买虚粒子升级", desc: "自动购买虚粒子升级（SVPU）", unlockDesc: "卷缩里程碑 20 解锁", hideLocked: true },
  { key: "comp", unlockState: "autoComp", name: "自动卷缩", desc: "在可获取指定超弦数时自动卷缩", unlockDesc: "卷缩里程碑 30 解锁", hideLocked: true, input: { id: "auto-comp-ss", label: "SS", value: () => state.autoCompSS } },
];

function autoUnlocked(def) {
  if (def.key === "wave") return state.autoWaveUpg >= 1;
  if (def.key === "phonon") return state.autoPhononUpg >= 1;
  if (def.key === "up3") return state.autoUp3 >= 1;
  if (def.key === "ann") return state.autoAnn >= 1;
  if (def.key === "sau") return state.autoSau >= 1;
  if (def.key === "sbu") return state.autoSbu >= 1;
  if (def.key === "svpu") return state.autoSvpu >= 1;
  if (def.key === "comp") return state.autoComp >= 1;
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
      // 阈值以 log10 权威解析与存储（支持输入超 double 的数值，如 1e400）
      const vLog = parseSciInputLog(input.value);
      if (def.key === "up3") {
        if (!isNaN(vLog)) {
          state.autoUp3MultLog = vLog;
          state.autoUp3Mult = vLog <= NLOG + 1 ? 0 : (vLog > 308 ? Infinity : Math.pow(10, vLog));
        }
        // S13：在升级3的自动化中填入小于 1 的数字（vLog<0 即数值<1）
        if (!state.ach.hidden.includes("S13") && !isNaN(vLog) && vLog < 0) { grantHidden("S13"); updateAchievementsUI(); }
      } else if (def.key === "ann") {
        if (!isNaN(vLog)) {
          // 按当前模式写入对应阈值（sp=绝对获取量 / heldsp=持有倍率）
          if (state.autoAnnMode === "heldsp") {
            state.autoAnnHeldMultLog = vLog;
            state.autoAnnHeldMult = vLog <= NLOG + 1 ? 0 : (vLog > 308 ? Infinity : Math.pow(10, vLog));
          } else {
            state.autoAnnSpLog = vLog;
            state.autoAnnSp = vLog <= NLOG + 1 ? 0 : (vLog > 308 ? Infinity : Math.pow(10, vLog));
          }
        }
      } else if (def.key === "comp") {
        if (!isNaN(vLog)) {
          state.autoCompSSLog = vLog;
          state.autoCompSS = vLog <= NLOG + 1 ? 0 : (vLog > 308 ? Infinity : Math.pow(10, vLog));
        }
      }
      saveGame();
    });
    // AU21/AU22：模式切换按钮 + 时间间隔输入框
    let modeBtn = null, timeInput = null;
    if (def.key === "up3" || def.key === "ann") {
      modeBtn = document.createElement("button"); modeBtn.className = "batch-btn single hidden";
      modeBtn.addEventListener("click", () => {
        if (def.key === "up3") state.autoUp3Mode = state.autoUp3Mode === "ratio" ? "time" : "ratio";
        else {
          // 自动湮灭三态循环：sp → time → heldsp（卷缩里程碑14解锁后）→ sp
          if (state.autoAnnMode === "sp") state.autoAnnMode = "time";
          else if (state.autoAnnMode === "time") state.autoAnnMode = compMilestone(14) ? "heldsp" : "sp";
          else state.autoAnnMode = "sp";
        }
        saveGame();
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
      saveGame();
      updateAutomationUI();
    });
    for (const el of [lock, input, timeInput, modeBtn, btn]) if (el) right.append(el);
    // A34 奖励：前两个自动化的批量购买切换按钮
    let batchBtn = null;
    if (def.key === "wave" || def.key === "phonon") {
      batchBtn = document.createElement("button"); batchBtn.className = "batch-btn single hidden";
      batchBtn.addEventListener("click", () => {
        state.batchMode[def.key] = !state.batchMode[def.key];
        saveGame();
        updateAutomationUI();
      });
      right.append(batchBtn);
    }
    row.append(left, right);
    list.appendChild(row);
    autoRefs[def.key] = { def, row, descEl: ds, lockEl: lock, inputEl: input, btn, batchBtn, modeBtn, timeInput };
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
// 解析 AeB 输入为 log10（支持超 double 的指数，如 1e400；非法/负数返回 NaN，调用方保持原值）。
// 先走 parseSciInput（覆盖全部既有合法输入，含边界行为零回归），其拒绝的超 double 值
// 再用 mantissa/指数 分离解析
function parseSciInputLog(str) {
  if (typeof str !== "string") {
    const v = parseFloat(str);
    return (isFinite(v) && v >= 0) ? Math.log10(v) : NaN;
  }
  const v = parseSciInput(str);
  if (!isNaN(v)) return v > 0 ? Math.log10(v) : (v === 0 ? -Infinity : NaN);
  const s = str.trim().replace(/[eE]\+/, "e");
  const m = s.match(/^(\d+(?:\.\d*)?|\.\d+)[eE]([+-]?\d+)$/);
  if (!m) return NaN;
  const mant = parseFloat(m[1]);
  if (!(mant > 0) || !isFinite(mant)) return NaN;
  const exp = parseInt(m[2], 10);
  if (!isFinite(exp)) return NaN;
  return clampLog(Math.log10(mant) + exp);
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
    // 卷缩里程碑解锁的行：达成前整行不可见
    if (r.def.hideLocked) r.row.classList.toggle("hidden", !unlocked);
    r.lockEl.textContent = unlocked ? "" : r.def.unlockDesc;
    // 描述随模式动态更新（AU21/AU22 解锁时间模式后不再停留在倍率/奇点文案）
    if (r.descEl) {
      const isTime = (r.def.key === "up3" && auOwned("au21") && state.autoUp3Mode === "time")
        || (r.def.key === "ann" && auOwned("au22") && state.autoAnnMode === "time");
      const isHeld = r.def.key === "ann" && auOwned("au22") && state.autoAnnMode === "heldsp";
      r.descEl.textContent = isTime
        ? (r.def.key === "up3" ? "每经过指定秒数时自动购买升级3" : "每经过指定秒数时自动湮灭")
        : (isHeld ? "在可获取量达到当前持有奇点的指定倍数时自动湮灭" : r.def.desc);
    }
    if (r.def.input) {
      const isTimeMode = (r.def.key === "up3" && state.autoUp3Mode === "time") || (r.def.key === "ann" && state.autoAnnMode === "time");
      // 时间模式下隐藏比例/Sp 输入框（只留时间框）
      const modeOwned = r.def.key === "up3" ? auOwned("au21") : auOwned("au22");
      r.inputEl.classList.toggle("hidden", !unlocked || (modeOwned && isTimeMode));
      if (unlocked && !r.inputEl.classList.contains("hidden") && document.activeElement !== r.inputEl) {
        // 数值以 AeB 字符串形式显示；阈值走 log10 权威，可显示超 double 的设定值（如 1e400）
        r.inputEl.value = r.def.key === "up3"
          ? fmtNum(state.autoUp3Mult, state.autoUp3MultLog)
          : r.def.key === "comp"
            ? fmtNum(state.autoCompSS, state.autoCompSSLog)
            : (r.def.key === "ann" && state.autoAnnMode === "heldsp")
              ? fmtNum(state.autoAnnHeldMult, state.autoAnnHeldMultLog)
              : fmtNum(state.autoAnnSp, state.autoAnnSpLog);
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
          const isHeld = state.autoAnnMode === "heldsp";
          r.modeBtn.textContent = isTime ? "类型：时间" : isHeld ? "类型：持有倍率" : "类型：奇点";
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
// 注意：即使前奇点升级免费（15 次湮灭里程碑），自动化仍以"资源达到价格"为触发条件，
// 防止免费升级被自动化每 tick 无限购买导致指数爆炸；手动购买不受此限制。
// 批量执行：mode 下每 tick 最多买 batchLimit() 次（单次=1）。
// batchLimit() 返回 Infinity 时（打破规则且 >128，最大购买）：简洁宇宙保持 256（历史卡死防护），
// 其他宇宙 1e8——bulk 迭代只剩纯数值运算，实际购买数由价格增长与可负担性自然终止（远低于上限），
// 上限仅作最后防御
function autoBuyTimes(key) {
  if (state.ach.normal.includes("A34") && state.batchMode[key]) {
    const lim = batchLimit();
    if (lim === Infinity) return inDistort("simple") ? 256 : 1e13;
    return lim;
  }
  return 1;
}
// 自动湮灭统一入口：所有模式判断与时间戳更新集中在此（tick 与 rAF 共用，防双执行）
function autoAnnTick() {
  if (state.voidActive) return; // 虚空挑战：禁用自动湮灭
  if (state.annihilations < 1 || !state.autoOn.ann || !state.autoAnn) return;
  // 狭窄宇宙不再禁用：达标即湮灭扭曲宇宙的承诺行为同样适用（购买类自动化仍禁用）
  if (state.distortActive) {
    // 扭曲宇宙：达标即自动湮灭该宇宙（无 CD——「能湮灭时尽快湮灭」为承诺行为）。
    // 防正反馈说明：湮灭后回到主宇宙，主宇宙侧的 autoAnnCD 与 Sp 阈值仍生效，
    // 自动化不会自动再进入扭曲宇宙，故不会无 CD 连环
    if (annihilationReady()) doAnnihilation(true);
    return;
  }
  if (auOwned("au22") && state.autoAnnMode === "time") {
    // 时间模式：距上次自动湮灭超过设定真实秒且达标
    if (gameNow() - state.lastAutoAnnAt >= state.autoAnnInterval * 1000 && annihilationReady()) {
      if (doAnnihilation(true)) state.lastAutoAnnAt = gameNow();
    }
  } else if (auOwned("au22") && state.autoAnnMode === "heldsp") {
    // 持有倍率模式（卷缩里程碑 14）：可获取量 ≥ 当前持有奇点 × 倍率（log 域；持有为 0 不触发）。
    // 持有判定用 state.sp > 0（sp 的零哨兵是字面 0，sp=1 时 getLogSp()=0 与零值同形）
    if (state.sp > 0 && gameNow() - state.lastAutoAnnAt >= autoAnnCD()
      && annihilationReady() && spGainLog() >= clampLog(getLogSp() + state.autoAnnHeldMultLog)) {
      if (doAnnihilation(true)) state.lastAutoAnnAt = gameNow();
    }
  } else if (gameNow() - state.lastAutoAnnAt >= autoAnnCD() && annihilationReady() && spGainLog() >= state.autoAnnSpLog) {
    // Sp 模式：阈值以 log10 权威比较（可输入超 double 的阈值；spGainLog 与 spGainExact 同口径），
    // CD 防抖（基础 1s，A42 星标 200ms，A44 升级进一步缩减，最低 25ms）
    if (doAnnihilation(true)) state.lastAutoAnnAt = gameNow();
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
// 自动购买主要页升级1/2 的批量购买（runAutomation 与「升级3 购买后即时回购」共用）。
// 闭式精确计数：巨量可负担等级（lg F ≥ 1e5）下不再逐级迭代
function autoBuyWaveLoop() {
  const n = autoBuyTimes("wave");
  bulkBuyUp1(n);
  bulkBuyUp2(n);
}
// 卷缩里程碑解锁的自动购买器（循环购买至不可负担/达上限，等级未变即收敛）
function autoBuySauLoop() {
  for (let i = 0; i < 100; i++) {
    const before = state.sau1 + "," + state.sau2 + "," + state.sau3 + "," + state.sau4;
    for (const u of SAU_DEFS) {
      if (state[u.key] >= sauDefMax(u)) continue;
      const cLog = u.costLog(state[u.key] + 1);
      if (getLogSp() >= cLog) buySAU(u.id, true);
    }
    { // 真空衰变
      const cLog = VACUUM_DEF.costLog(state.sau4 + 1);
      if (getLogSp() >= cLog) buySAU("sau4", true);
    }
    if (before === state.sau1 + "," + state.sau2 + "," + state.sau3 + "," + state.sau4) break;
  }
}
function autoBuySbuLoop() {
  let changed = false;
  for (let i = 0; i < 100; i++) {
    const before = state.sbu1 + "," + state.sbu2 + "," + state.sbu3;
    for (const u of SBU_DEFS) buySBU(u.id, true); // A03：bulk 跳过逐次保存与 DOM 刷新
    if (before === state.sbu1 + "," + state.sbu2 + "," + state.sbu3) break;
    changed = true;
  }
  if (changed) { saveGame(); updateBlackholeUI(); }
}
function autoBuySvpuLoop() {
  let changed = false;
  for (let i = 0; i < 100; i++) {
    const before = state.svpu1 + "," + state.svpu2 + "," + state.svpu3 + "," + state.svpu4 + "," + state.svpu5;
    for (const u of SVPU_DEFS) {
      if ((u.id === "svpu4" || u.id === "svpu5") && !vpuOwned("vpu5")) continue; // VPU5 解锁后才可购买
      buySVPU(u.id, true); // A03：bulk 跳过逐次保存与 DOM 刷新
    }
    if (before === state.svpu1 + "," + state.svpu2 + "," + state.svpu3 + "," + state.svpu4 + "," + state.svpu5) break;
    changed = true;
  }
  if (changed) { saveGame(); updateBlackholeUI(); }
}
// ---------- 自动化批量购买：闭式精确计数（消除巨量等级下的逐级卡顿）----------
// 背景：lg(F)≈1e6 时一次可负担的升级1约 330 万级，逐级循环每级一次价格/扣款计算会卡数秒。
// 这些升级的价格是精确的分段指数（升级2 为 99 级后阶乘增长），可按段闭式求出可购级数，
// 一次扣款、一次加级——结果与逐级购买一致，复杂度 O(1)/O(log)。
// 等比价格（下一级价格 log c0、每级价格增量 log s）下，资源池 resLog 可购买的最大级数
function bulkAffordableExp(c0, s, resLog) {
  if (!(s > 0) || !(resLog > NLOG + 1) || !(c0 > NLOG + 1)) return 0;
  if (resLog < c0) return 0;
  return Math.floor((resLog - c0) / s) + 1;
}
// 等比级数价格和的 log10：Σ_{i=0..k-1} 10^(c0+i·s)（k ≥ 1；数值稳定：由末项与公比表出）
function bulkGeomSumLog(c0, s, k) {
  if (k <= 0) return NLOG;
  if (k === 1) return clampLog(c0);
  const r = Math.pow(10, -s);
  const last = c0 + (k - 1) * s;
  const frac = (1 - Math.pow(r, k)) / (1 - r);
  return clampLog(last + Math.log10(Math.max(frac, 1e-300)));
}
// up1 价格 log（按 1 起的级数 n）——与 up1CostLog 同公式；softcap 旗标取当前 F（同一次批量内恒定）
function up1CostLogAt(n) {
  if (inDistort("inflation")) return clampLog(n * 2); // 通胀：价格 = 100^n
  let l = Math.log10(5) + n * Math.log10(2) + (softcapped() ? Math.max(0, n - 332) * Math.log10(5) : 0);
  return clampLog(l);
}
// up2 价格 log（按 1 起的级数 n）——与 up2CostLog 同公式（阶乘段用 lgamma10 闭式）
function up2CostLogAt(n) {
  const k2 = n - 1;
  if (inDistort("inflation")) {
    // 通胀：1e6 × ∏_{k=1..n-1} max(k²,100) = 1e6 × 100^min(m,10) × (m!/10!)²，m=n-1
    const m = k2;
    let lp = 6;
    if (m <= 10) lp += 2 * m;
    else lp += 20 + 2 * (lgamma10(m) - lgamma10(10));
    return clampLog(lp);
  }
  if (k2 <= 98) return clampLog(costOfLog(n + 1));
  let logP;
  if (k2 <= 300) { logP = 100; for (let i = 100; i <= k2; i++) logP += Math.log10(i); }
  else logP = 100 + lgamma10(k2) - lgamma10(99);
  return clampLog(costOfLog(logP));
}
// 批量购买升级1：返回实际购买级数（0 = 不可购）。
// 资源池随购买消耗而下降（F = U/L^e 随 U 抽水下降），故级数用「总花费(含最后一级)×Le ≤ 池」二分确定，
// 与逐级购买的中断语义完全一致
function bulkBuyUp1(maxN) {
  if (inDistort("simple") || narrowBlocked()) return 0;
  if (inDistort("narrow")) maxN = Math.min(maxN, Math.max(0, 10 - state.narrowPurchases));
  if (maxN <= 0) return 0;
  const resLog = FLog();
  const n0 = state.up1 + 1;
  const infl = inDistort("inflation");
  const slope1 = infl ? 2 : Math.log10(2);
  const slope2 = infl ? 2 : Math.log10(10);
  const costAt = up1CostLogAt;
  // m 级的总价格（log10）：普通一段等比和；软上限跨越 332 级时两段分别求和
  const sumLog = (m) => {
    if (m <= 0) return NLOG;
    if (infl || !softcapped() || n0 + m - 1 <= 332) return bulkGeomSumLog(costAt(n0), slope1, m);
    // A02：高段起点为 max(n0, 333)——n0>332 时旧代码 k1=333−n0 为负、从 333 级重复合计
    const k1 = Math.min(Math.max(333 - n0, 0), m);
    const hiStart = Math.max(n0, 333);
    return logAddLogs(
      k1 > 0 ? bulkGeomSumLog(costAt(n0), slope1, k1) : NLOG,
      bulkGeomSumLog(costAt(hiStart), slope2, m - k1)
    );
  };
  // 购买 m 级的总价格（F 项 log10；不含 Le）——逐级停止条件：Σ_{<m} + cost(m) ≤ F0
  const totalLog = (m) => logAddLogs(m <= 1 ? NLOG : sumLog(m - 1), costAt(n0 + m - 1));
  // 池恒定的闭式计数（上界）
  let k0;
  if (infl) k0 = bulkAffordableExp(costAt(n0), slope1, resLog);
  else if (!softcapped()) k0 = bulkAffordableExp(costAt(n0), slope1, resLog);
  else if (n0 > 332) k0 = bulkAffordableExp(costAt(n0), slope2, resLog);
  else {
    const k1 = bulkAffordableExp(costAt(n0), slope1, resLog);
    k0 = (n0 + k1 <= 332) ? k1 : (333 - n0) + bulkAffordableExp(costAt(333), slope2, resLog);
  }
  let k = Math.min(k0, maxN);
  if (k <= 0) return 0;
  if (!upgradesFree()) {
    // 二分：最大 m 使 Σ_{<m} + cost(m) ≤ F0（逐级停止条件的精确等价）
    if (totalLog(1) > resLog) return 0;
    let l = 1, h = k;
    while (l < h) {
      const mid = Math.floor((l + h + 1) / 2);
      if (totalLog(mid) <= resLog) l = mid; else h = mid - 1;
    }
    k = l;
    // 支付 = Σ价格（F 项等比和）：subULog 内部会加 Le 换算成 U 口径
    subULog(sumLog(k));
  }
  if (inDistort("narrow")) state.narrowPurchases += k - 1;
  markPurchase();
  state.up1 += k;
  return k;
}
// 支付的 log 偏移：从 U 支付的价格（以 F 计价）需乘有效波长 → lg(Le)；从池本身支付（声子）为 0
function bulkPayLe() {
  return wavelengthExp() * (getLogL10() + distortLModLog());
}
// up2 分段总和（log10）。分段：普通=前段(1-99 级, 每级 ×10)+阶乘段(≥100 级, 每级比率≥100)；
// 通胀=前段(1-11 级, 每级 ×100)+阶乘段(≥12 级, 每级比率≥121)。
// N01：通胀前段斜率此前误用 ×10（实际 ×100，少扣多买）。阶乘段价格无单闭式，
// 用「末级反向固定 6 项精确价 + 保守余项」O(1) 计算（比率下界 99 → 6 项后余项相对 <1e-12），
// 无随可买等级增长的循环（热路径约束）
function up2SumLog(n0, m) {
  if (m <= 0) return NLOG;
  const infl = inDistort("inflation");
  const expEnd = infl ? 11 : 99; // 等比段最后一级（通胀第 11/12 级同价换段，普通第 99/100 级）
  const last = n0 + m - 1;
  let sum = NLOG;
  const expHi = Math.min(last, expEnd);
  if (expHi >= n0) sum = bulkGeomSumLog(up2CostLogAt(n0), infl ? 2 : 1, expHi - n0 + 1);
  const fLo = Math.max(n0, expEnd + 1);
  if (last >= fLo) {
    let terms = NLOG, prev = NLOG, counted = 0;
    for (let j = 0; j < 6; j++) {
      const lvl = last - j;
      if (lvl < fLo) break;
      prev = up2CostLogAt(lvl);
      terms = logAddLogs(terms, prev);
      counted++;
    }
    if (last - fLo + 1 > counted) {
      // 余项上界：未计入各级 ≤ prev/99（每级比率≥99）的几何和 = prev/98
      terms = logAddLogs(terms, prev - Math.log10(98));
    }
    sum = logAddLogs(sum, terms);
  }
  return sum;
}
// 逆 lgamma10（A01）：求 k 使 lgamma10(k) ≈ y（k ≥ 2，y 需 ≥ lgamma10(2)）。
// Stirling 主部 k·ln k − k = y·ln10 → w=ln k − 1 满足 w·e^w = y·ln10/e——
// Lambert W 的固定 3 次 Halley 精化（显式近似，O(1)，非迭代求根循环）；
// Stirling 的 0.5·ln(2πk) 项带来的 ~1 级误差由调用方固定 ±2 级精确校正吸收
function invLgamma10(y) {
  const z = (y * Math.LN10) / Math.E;
  if (!(z > 0)) return 2;
  let w = Math.log(z);
  for (let i = 0; i < 3; i++) {
    const ew = Math.exp(w);
    const f = w * ew - z;
    const p = w + 1;
    w = w - f / (ew * p - (f * (w + 2)) / (2 * p));
  }
  return Math.exp(w + 1);
}
// A01：免费 up2 的末项门槛计数（免费只免扣款不免门槛——余额不因扣款下降，
// 逐级「该级单价 ≤ 余额」皆可购）。等比段闭式；阶乘段逆 lgamma10 + 固定 ±2 级精确校正
//（校正只向下保证保守少买；向上至多补 1 级）
function up2FreeGateCount(n0, maxN, resLog) {
  const infl = inDistort("inflation");
  const expEnd = infl ? 11 : 99;
  let k = 0;
  if (n0 <= expEnd) {
    k = Math.min(bulkAffordableExp(up2CostLogAt(n0), infl ? 2 : 1, resLog), expEnd - n0 + 1);
  }
  k = Math.min(k, maxN);
  const fLo = Math.max(n0, expEnd + 1);
  if (k < maxN && resLog >= up2CostLogAt(fLo)) {
    // 阶乘段第 L 级价格：普通 lg = 100 + lgamma10(L−1) − lgamma10(99)；
    // 通胀 lg = 26 + 2·(lgamma10(L−1) − lgamma10(10))。解 lgamma10(L−1) = y
    const y = infl ? (resLog - 26) / 2 + lgamma10(10) : resLog - 100 + lgamma10(99);
    let j = Math.floor(invLgamma10(Math.max(y, lgamma10(2)))) + 1 - fLo;
    j = Math.max(0, Math.min(j, maxN - k));
    // 授予级别为 fLo..fLo+j−1，末级价格必须 ≤ 余额（向下校正，Stirling 误差 ≤~2 级）
    let steps = 0;
    while (j > 0 && steps < 32 && up2CostLogAt(fLo + j - 1) > resLog) { j--; steps++; }
    // 向上校正（有界 8 次，每步精确验价——不会超发；吸收近似残差）
    let ups = 0;
    while (k + j < maxN && ups < 8 && up2CostLogAt(fLo + j) <= resLog) { j++; ups++; }
    k = Math.min(k + j, maxN);
  }
  return k;
}
function bulkBuyUp2(maxN) {
  if (inDistort("simple") || narrowBlocked()) return 0;
  if (getUp1Eff() < 1 && !upgradesFree()) return 0;
  if (inDistort("narrow")) maxN = Math.min(maxN, Math.max(0, 10 - state.narrowPurchases));
  if (maxN <= 0) return 0;
  const n0 = state.up2 + 1;
  const resLog = FLog();
  if (upgradesFree()) {
    // A01：免费按末项门槛计数（累计总价口径会保守少买，与免费语义不符）
    const k = up2FreeGateCount(n0, maxN, resLog);
    if (k <= 0) return 0;
    if (inDistort("narrow")) state.narrowPurchases += k - 1;
    markPurchase();
    state.up2 += k;
    return k;
  }
  const sumLog = (m) => up2SumLog(n0, m);
  const totalLog = (m) => logAddLogs(m <= 1 ? NLOG : sumLog(m - 1), up2CostLogAt(n0 + m - 1));
  if (!(totalLog(1) <= resLog)) return 0;
  let l = 1, h = maxN;
  while (l < h) {
    const mid = Math.floor((l + h + 1) / 2);
    if (totalLog(mid) <= resLog) l = mid; else h = mid - 1;
  }
  const k = l;
  if (!upgradesFree()) subULog(sumLog(k)); // 支付 = Σ价格（F 项等比和），subULog 内部加 Le
  if (inDistort("narrow")) state.narrowPurchases += k - 1;
  markPurchase();
  state.up2 += k;
  return k;
}
// 通用闭式批量：等比价格（下一级 c0、增量 slope）、池 poolLog、支付偏移 payLe（从池本身支付为 0）。
// 返回可购买级数 k 并回调 apply(总价格和的 log)——「总花费(含最后一级)+payLe ≤ 池」二分，
// 与逐级购买「池随消耗下降」的中断语义一致
// 通用「买满」循环：重复调用单次购买直到不可购/达上限（bulk 跳过逐次 UI），返回购买次数
function buyMaxLoop(key, buyFn, cap) {
  let bought = 0;
  for (let i = 0; i < (cap || 1e5); i++) {
    const lv = state[key];
    buyFn(true);
    if (state[key] === lv) break;
    bought++;
  }
  return bought;
}
function bulkBuyGeneric(c0, slope, maxN, poolLog, apply) {
  if (maxN <= 0) return 0;
  const totalLog = (m) => logAddLogs(m <= 1 ? NLOG : bulkGeomSumLog(c0, slope, m - 1),
    clampLog(c0 + slope * (m - 1)));
  if (!(totalLog(1) <= poolLog)) return 0;
  // 上界取整：maxN 可能为小数（bulkBuyPG3 的 pg3Cap()−pg3 受量子狂潮/节点21 免费等级影响），
  // 二分搜索的 mid=floor((l+h+1)/2) 在 l 收敛到 floor(h) 后恒等于 l<h，小数 h 永不退出 → 死循环；
  // floor 后不足一级（如 cap−pg3=0.18）则不买（l 初值 1，不守卫会多买一级越过上限）
  let l = 1, h = Math.floor(maxN);
  if (h < 1) return 0;
  while (l < h) {
    const mid = Math.floor((l + h + 1) / 2);
    if (totalLog(mid) <= poolLog) l = mid; else h = mid - 1;
  }
  const k = l;
  apply(bulkGeomSumLog(c0, slope, k));
  return k;
}
// 批量购买声子升级 1/2/3（纯等比价格；pg3 受上限约束）
function bulkBuyPG1(maxN) {
  if (narrowBlocked() || inDistort("adiabatic")) return 0;
  if (inDistort("narrow")) maxN = Math.min(maxN, Math.max(0, 10 - state.narrowPurchases));
  const slope = inDistort("inflation") ? 4 : 2; // 每级 ×100；通胀平方 → ×1e4
  const k = bulkBuyGeneric(pg1CostLog(), slope, maxN, FLog(),
    (sumLog) => { if (!upgradesFree()) subULog(sumLog); });
  if (k > 0) {
    if (inDistort("narrow")) state.narrowPurchases += k - 1;
    markPurchase();
    state.pg1 += k;
  }
  return k;
}
function bulkBuyPG2(maxN) {
  if (narrowBlocked()) return 0;
  if (inDistort("narrow")) maxN = Math.min(maxN, Math.max(0, 10 - state.narrowPurchases));
  if (maxN <= 0) return 0;
  if (upgradesFree()) {
    // A01：免费按末项门槛计数（纯等比价格，闭式）
    const k = Math.min(maxN, bulkAffordableExp(pg2CostLog(), inDistort("inflation") ? Math.log10(4) : Math.log10(2), getLogPhonons()));
    if (k <= 0) return 0;
    if (inDistort("narrow")) state.narrowPurchases += k - 1;
    markPurchase();
    state.pg2 += k;
    return k;
  }
  const slope = inDistort("inflation") ? Math.log10(2) * 2 : Math.log10(2); // 每级 ×2
  const k = bulkBuyGeneric(pg2CostLog(), slope, maxN, getLogPhonons(),
    (sumLog) => { if (!upgradesFree()) subPhononsLog(sumLog); });
  if (k > 0) {
    if (inDistort("narrow")) state.narrowPurchases += k - 1;
    markPurchase();
    state.pg2 += k;
  }
  return k;
}
function bulkBuyPG3(maxN) {
  if (narrowBlocked()) return 0;
  if (state.pg3 >= pg3Cap()) return 0;
  if (inDistort("rigid") || inDistort("adiabatic") || inDistort("simple")) return 0;
  if (inDistort("narrow")) maxN = Math.min(maxN, Math.max(0, 10 - state.narrowPurchases));
  maxN = Math.min(maxN, pg3Cap() - state.pg3);
  if (maxN <= 0) return 0;
  if (upgradesFree()) {
    // A01：免费按末项门槛计数（纯等比价格，闭式）
    const k = Math.min(Math.floor(maxN), bulkAffordableExp(pg3CostLog(), inDistort("inflation") ? 2 : 1, getLogPhonons()));
    if (k <= 0) return 0;
    if (inDistort("narrow")) state.narrowPurchases += k - 1;
    markPurchase();
    state.pg3 += k;
    return k;
  }
  const slope = inDistort("inflation") ? 2 : 1; // 每级 ×10
  const k = bulkBuyGeneric(pg3CostLog(), slope, maxN, getLogPhonons(),
    (sumLog) => { if (!upgradesFree()) subPhononsLog(sumLog); });
  if (k > 0) {
    if (inDistort("narrow")) state.narrowPurchases += k - 1;
    markPurchase();
    state.pg3 += k;
  }
  return k;
}

function runAutomation() {
  if (state.annihilations < 1) return;
  // 狭窄宇宙：购买类自动化禁用（升级限购 10 次是挑战规则），自动湮灭照常工作
  const narrow = inDistort("narrow");
  autoAnnTick(); // 自动湮灭先行：达标立即湮灭（skipRender），同 tick 的购买循环随即服务新纪元
  if (!narrow && state.autoOn.wave && state.autoWaveUpg) {
    autoBuyWaveLoop();
  }
  if (!narrow && state.autoOn.phonon && state.autoPhononUpg && state.phUnlocked) {
    const n = autoBuyTimes("phonon");
    bulkBuyPG1(n);
    bulkBuyPG2(n);
    bulkBuyPG3(n);
  }
  if (!narrow && state.autoOn.up3 && state.autoUp3 && up3Card) {
    // up3 购买会清零 up1/up2 并重置 U：购买成功后在同一 tick 立即回购，
    // 消除「本 tick 购买块已跑完 → 下个 tick 才买回」的获取归零死窗口（卡顿感来源）
    const rebuyAfterUp3 = () => { if (!narrow && state.autoOn.wave && state.autoWaveUpg) autoBuyWaveLoop(); };
    if (auOwned("au21") && state.autoUp3Mode === "time") {
      // 时间模式：距上次自动升级3超过设定秒数即触发（仍需 F 超过峰值，log 域比较）
      if (gameNow() - state.lastAutoUp3At >= state.autoUp3Interval * 1000 && FLog() > getLogUp3LastF()) {
        if (buyUp3()) { state.lastAutoUp3At = gameNow(); rebuyAfterUp3(); }
      }
    } else {
      // 比例模式：在当前加成倍率达到设定值时购买升级3（log 域，防 mult 溢出；
      // 阈值以 log10 权威存储，可输入超 double 的倍率）
      const fLog = FLog();
      const multLog = getLogL10() + up3WavelengthFromFLog(fLog);
      const autoMultLog = state.autoUp3MultLog;
      if (fLog > getLogUp3LastF() && multLog >= autoMultLog) {
        if (buyUp3()) rebuyAfterUp3();
      }
    }
  }
  // 卷缩里程碑解锁的自动购买器与自动卷缩
  if (!narrow && state.autoOn.sau && state.autoSau) autoBuySauLoop();
  if (!narrow && state.autoOn.sbu && state.autoSbu && bhUnlocked()) autoBuySbuLoop();
  if (!narrow && state.autoOn.svpu && state.autoSvpu && bhUnlocked()) autoBuySvpuLoop();
  if (!narrow && !state.researchRun && state.autoOn.comp && state.autoComp && canCompactify()) {
    const ssLog = compactSSGainLog();
    if (ssLog > NLOG + 1 && ssLog >= state.autoCompSSLog) compactify(true);
  }
  autoAnnTick();
}

