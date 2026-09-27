// ---------- 虚空页 UI ----------
let voidBuilt = false, voidRuleBtns = {};
function buildVoidOnce() {
  if (voidBuilt) return;
  const grid = document.getElementById("void-rules");
  grid.innerHTML = "";
  voidRuleBtns = {};
  for (const u of DISTORT_UNIVERSES) {
    const btn = document.createElement("button");
    btn.className = "void-rule";
    const nm = document.createElement("div"); nm.textContent = u.name;
    const ml = document.createElement("div"); ml.className = "void-rule-mult"; ml.textContent = "乘数 ×" + VOID_MULTIPLIERS[u.id];
    btn.append(nm, ml);
    btn.addEventListener("click", () => {
      if (state.voidActive) return;
      const i = voidSelection.indexOf(u.id);
      if (i >= 0) voidSelection.splice(i, 1); else voidSelection.push(u.id);
      btn.classList.toggle("selected", i < 0);
      document.getElementById("void-enter-btn").disabled = voidSelection.length === 0;
    });
    grid.appendChild(btn);
    voidRuleBtns[u.id] = btn;
  }
  document.getElementById("void-enter-btn").addEventListener("click", () => {
    enterVoid(voidSelection.slice());
  });
  // R2「虚空探测器」：全扭曲虚空快捷进入（一次性勾选全部 8 种削弱）
  document.getElementById("void-quick-all-btn").addEventListener("click", () => {
    enterVoid(DISTORT_UNIVERSES.map(u => u.id));
  });
  document.getElementById("void-exit-btn").addEventListener("click", exitVoid);
  // 虚空升级（SVU，虚空里程碑 1 解锁；全行卡片）
  const upg = document.getElementById("void-upg-list");
  upg.innerHTML = "";
  voidSvuEls = {};
  for (const def of SVU_DEFS) {
    const card = document.createElement("div");
    card.className = "void-svu-card";
    const nm = document.createElement("div"); nm.className = "sau-name"; nm.textContent = def.name;
    const ds = document.createElement("div"); ds.className = "sau-desc";
    const ct = document.createElement("div"); ct.className = "sau-cost";
    card.append(nm, ds, ct);
    if (def.fill) {
      const fillBtn = document.createElement("button");
      fillBtn.className = "void-svu-fill";
      fillBtn.textContent = "开始填充";
      fillBtn.addEventListener("click", () => {
        if (!voidMilestone1()) return;
        state.svu1Filling = !state.svu1Filling;
        saveGame();
        updateVoidUI();
      });
      card.appendChild(fillBtn);
      voidSvuEls.fillBtn = fillBtn;
    }
    if (def.id === "svu3") {
      // SVU3「虚数相变」：相变按钮（达标高亮）+ 无序化按钮 + 等级模式悬浮说明（body 级固定黑框）
      const tip = document.createElement("span");
      tip.className = "svu3-tip";
      tip.textContent = "ⓘ 等级模式";
      tip.addEventListener("mouseenter", () => showSvu3TipBox(tip,
        "等级模式：ρ（虚数密度）只在全扭曲虚空（8 种削弱全开）内按真实时间增长，不受时间倍率影响"
        + "——每秒获取 w/(1+ρ)^(1+N/3)，w 为超出波速软上限部分的波速获取对数值。\n"
        + "ρ 达到 500+100N 可「相变」：相变数 +1、ρ 清零，获取更难但推迟更强。"
        + "相变与「无序化」（清零 ρ 与相变数）都只能在虚空外操作。\n"
        + "效果：波速软上限起始点推迟 10^(3(1+N)^1.5·ρ)，并使能标偏移获取 ×N·(1+ρ)^((1+N/5)/2)。详见帮助页「虚空 II」。"));
      tip.addEventListener("mouseleave", hideSvu3TipBox);
      card.appendChild(tip);
      const row = document.createElement("div");
      row.className = "svu3-btns";
      const phaseBtn = document.createElement("button");
      phaseBtn.className = "void-svu-fill svu3-phase-btn";
      phaseBtn.textContent = "相变";
      phaseBtn.addEventListener("click", svu3Phase);
      const disorderBtn = document.createElement("button");
      disorderBtn.className = "void-svu-fill svu3-disorder-btn";
      disorderBtn.textContent = "无序化";
      disorderBtn.addEventListener("click", svu3Disorder);
      row.append(phaseBtn, disorderBtn);
      card.appendChild(row);
      voidSvuEls.phaseBtn = phaseBtn;
      voidSvuEls.disorderBtn = disorderBtn;
    }
    upg.appendChild(card);
    voidSvuEls[def.id] = { card, nm, ds, ct };
  }
  // 虚空里程碑格子（每个里程碑一个独立格子）
  const msGrid = document.getElementById("void-milestone-list");
  msGrid.innerHTML = "";
  voidMsEls = [];
  for (const def of VOID_MILESTONES) {
    const cell = document.createElement("div");
    cell.className = "void-ms-cell";
    const head = document.createElement("div"); head.className = "void-ms-head";
    const title = document.createElement("span"); title.textContent = `里程碑 ${def.n} · ${def.title}`;
    const status = document.createElement("span"); status.className = "void-ms-status";
    head.append(title, status);
    const desc = document.createElement("div"); desc.className = "sau-desc"; desc.textContent = def.desc;
    const prog = document.createElement("div"); prog.className = "void-ms-prog";
    const reward = document.createElement("div"); reward.className = "sau-desc"; reward.textContent = "奖励：" + def.reward;
    cell.append(head, desc, prog, reward);
    msGrid.appendChild(cell);
    voidMsEls.push({ cell, statusEl: status, progEl: prog });
  }
  voidBuilt = true;
}
let voidSelection = []; // 进入前勾选的削弱
let voidSvuEls = {};    // SVU 卡片元素引用
let voidMsEls = [];     // 虚空里程碑格子元素引用
function updateVoidUI() {
  if (simActive) return;
  // 虚空仅测试模式可访问：非测试模式下子页隐藏、UI 不更新
  const voidAccessible = state.ach.normal.includes("A52");
  const subtab = document.getElementById("subtab-void");
  if (subtab) subtab.classList.toggle("hidden", !voidAccessible);
  if (!voidAccessible) return;
  buildVoidOnce();
  document.getElementById("void-enter-row").classList.toggle("hidden", state.voidActive);
  document.getElementById("void-active-panel").classList.toggle("hidden", !state.voidActive);
  const stats = document.getElementById("void-stats");
  const vfMultLog = vfVPMultLog();
  const m1 = voidMilestone1();
  const m2 = voidMilestone2();
  // VF 效果行：第一效果（VP 获取）恒有；第二效果（吸积 ×VF^(2/3)）里程碑 1 解锁；
  // 第三效果（波速获取幂次）里程碑 2 解锁；第四效果（折叠器速度）里程碑 3 解锁
  //（②③④在里程碑3 后按 VF^1.1 / VF^0.1 口径计算；全扭曲超频不做界面展示，见帮助页「虚空 II」）
  const vfLg = vfEffectVFLog(state.logVoidVF10);
  // VF 行附上限标注：cap 有效时显示 (上限 X)；虚空中不增长（增长方式说明见帮助页「虚空」）
  const capLog = getLogVoidVFCap10();
  const capNote = capLog > NLOG + 1 ? `（上限 ${fmtLog(capLog)}）` : "";
  const growNote = state.voidActive ? "（虚空中不增长）" : "";
  const vfLine = vfLg > NLOG + 1
    ? `虚空泡沫（VF）：${fmtLog(state.logVoidVF10)}${capNote}${growNote}\nVP 获取 ×${fmtLog(vfMultLog)}`
      + (m1 ? `\n黑洞吸积 ×${fmtLog(clampLog((2 / 3) * vfLg))}` : "")
      + (m2 ? `\n波速获取 ^${fmt(vfGainExp())}` : "")
      + (voidMilestone3() ? `\n维度折叠器速度 ×${fmtLog(clampLog(0.1 * state.logVoidVF10))}` : "")
    : "虚空泡沫（VF）：尚无" + capNote + growNote;
  // 虚空里程碑显示（每个里程碑一个独立格子）；M1/M2 按削弱种数、M3 按历史最高 VF、M4 占位
  const m3 = voidMilestone3();
  for (let i = 0; i < VOID_MILESTONES.length; i++) {
    const def = VOID_MILESTONES[i];
    const el = voidMsEls[i];
    if (!el) continue;
    const done = def.n === 1 ? voidMilestone1() : def.n === 2 ? voidMilestone2() : def.n === 3 ? m3 : false;
    // R2「虚空探测器」解锁更多里程碑：购买前 M3/M4 整格隐藏
    if (def.n >= 3) el.cell.classList.toggle("hidden", !researchBought("R2"));
    el.cell.classList.toggle("done", done);
    el.statusEl.textContent = def.n === 4 ? "？？？" : (done ? "✓ 已完成" : "进行中");
    el.progEl.textContent = def.n <= 2
      ? `进度：历史最高 ${state.voidBestRules} / ${def.need} 种`
      : def.n === 3
        ? (researchBought("R2")
          ? `进度：历史最高 VF ${fmtLog(state.logVoidVFBest10)} / 1e22`
          : "进度：需先购买研究「虚空探测器」")
        : "进度：？？？";
  }
  // SVU 卡片状态（SVU1/2 由里程碑 1 解锁；SVU3 由里程碑 3 解锁——锁定时只调暗内容，
  // 不给卡片整体加 opacity，保证「等级模式」tooltip 底框始终全不透明可读）
  for (const def of SVU_DEFS) {
    const el = voidSvuEls[def.id];
    if (!el) continue;
    // SVU3 在购买 R2「虚空探测器」前整卡隐藏（不让玩家提前看到该系统）
    if (def.id === "svu3") el.card.classList.toggle("hidden", !researchBought("R2"));
    const unlocked = def.id === "svu3" ? m3 : m1;
    el.card.classList.toggle("locked", !unlocked && def.id !== "svu3");
    el.card.classList.toggle("locked-soft", !unlocked && def.id === "svu3");
    if (!unlocked) {
      el.ds.textContent = def.id === "svu3"
        ? "??? —— 完成虚空里程碑 3「度规塌缩」后解锁"
        : "??? —— 完成虚空里程碑 1 后解锁";
      el.ct.textContent = "";
    } else {
      el.ds.textContent = def.desc;
      el.ct.textContent = def.effect();
    }
  }
  if (voidSvuEls.phaseBtn) {
    const ready = svu3PhaseReady();
    voidSvuEls.phaseBtn.classList.toggle("ready", ready); // 达标仍高亮，提示退出虚空后可相变
    voidSvuEls.phaseBtn.disabled = state.voidActive || !ready; // 相变与无序化均需虚空外
    voidSvuEls.disorderBtn.disabled = state.voidActive || !m3;
  }
  if (voidSvuEls.fillBtn) {
    voidSvuEls.fillBtn.classList.toggle("on", state.svu1Filling);
    voidSvuEls.fillBtn.textContent = state.svu1Filling ? "停止填充" : "开始填充";
    voidSvuEls.fillBtn.disabled = !m1;
  }
  // 进入虚空门槛：总奇点 ≥ 1e50（卷缩重置后需重新达成；此前 A52 达成即已满足，无回归）
  const voidGateOK = getLogTotalSp() >= 50;
  const enterBtn2 = document.getElementById("void-enter-btn");
  enterBtn2.textContent = voidGateOK ? "进入虚空" : "需达到1e50总奇点";
  enterBtn2.title = voidGateOK ? "" : "卷缩重置后，需要重新达到 1e50 总奇点才能进入虚空";
  // R2 解锁的全扭曲快捷按钮：R2 购买后显示，进入门槛与主按钮一致
  const quickAllBtn = document.getElementById("void-quick-all-btn");
  if (quickAllBtn) {
    quickAllBtn.classList.toggle("hidden", !researchBought("R2"));
    quickAllBtn.disabled = !voidGateOK;
    quickAllBtn.textContent = voidGateOK ? "进入全扭曲虚空" : "需达到1e50总奇点";
  }
  if (state.voidActive) {
    const fLog = FLog();
    const vfLog = voidVFLog(fLog);
    const reached = vfLog > NLOG + 1;
    const preview = reached ? `本次结算 VF 上限：${fmtLog(vfLog)}` : `频率尚未达到 1e2000 Hz`;
    document.getElementById("void-progress").textContent =
      `当前频率：${fmtNum(Math.pow(10, Math.min(fLog, 308)), fLog)} Hz\n目标：1e2000 Hz\n${preview}`;
    stats.textContent = vfLine;
  } else {
    stats.textContent = vfLine;
    for (const id in voidRuleBtns) voidRuleBtns[id].classList.toggle("selected", voidSelection.includes(id));
    // 进入按钮按已选削弱数量启用（选择状态由按钮 click 维护）；门槛未达时禁用
    document.getElementById("void-enter-btn").disabled = voidSelection.length === 0 || !voidGateOK;
  }
}
// SAU1/SAU3 的实际等级上限：单圈重整（VPU1）后取消
function effSauMax(key) {
  return (key === "sau1" || key === "sau3") && vpuOwned("vpu1") ? Infinity : 10;
}
// 升级定义的实际等级上限：仅象限拓张/紫外灾难受 effSauMax 约束（单圈重整取消），
// 奇点凝聚/真空衰变定义为 max:Infinity、无上限。购买/显示/自动购买器三处共用——
// 自动购买器曾直接用 effSauMax（对 sau2 恒返回 10），把无上限的奇点凝聚错限在 10 级
function sauDefMax(u) { return u.max !== Infinity ? effSauMax(u.key) : Infinity; }
// 奇点凝聚 n>10 后的价格延伸（log10）：每级在原 10^(5n) 基础上额外 ×n⁴
function sau2ExtraCostLog(n) {
  let log = 0;
  for (let k = 11; k <= n; k++) log += 4 * Math.log10(k);
  return log;
}
// SAU1/SAU3 价格的 log10：n≤10 为 base+2n（增速 ×100）；超过 10 级后每级增速 =
// 原增速 ×100 × n²（n 为当前等级），log 域累积
function sauCostLog(base, n) {
  return lateCostLog(n, 500, (m) => { // 500 级起价格 = 上一级的 1.01 次方（v0.6.2）
    if (m <= 10) return base + 2 * m;
    let log = base + 20; // 第 10 次购买的价格
    for (let k = 11; k <= m; k++) log += 2 + 2 * Math.log10(k);
    return log;
  });
}
// 真空衰变（独立行，SAU 行上方）：每级奇点获取 ×2，价 10^(3+n)；
// 500 级以上每级价格额外 ×级别×100（价 10^(3+500) × ∏_{k=501..n} 100k）
const VACUUM_DEF = { id: "sau4", key: "sau4", name: "真空衰变", desc: "每级使获得的奇点 ×2", max: Infinity,
  // 500 级起每级额外 ×级别×100（原层）；1000 级起价格 = 上一级的 1.01 次方（v0.6.2）
  costLog: (n) => lateCostLog(n, 1000, (m) => (m <= 500 ? 3 + m : 503 + (lgamma10(m) - lgamma10(500)) + 2 * (m - 500))) };
// 第二类：单次（四组×4，两组共一行）
const AU_DEFS = [
  [ // 第1组
    { id: "au11", name: "机械共振", desc: "基于波动升级1等级给予其指数加成", cost: 1e6 },
    { id: "au12", name: "受激跃迁", desc: "每个声子升级1等级给予声子升级2免费2级", cost: 1e10 },
    { id: "au13", name: "光子共振", desc: "基于波动升级2等级增强其底数", cost: 1e16 },
    { id: "au14", name: "黑体辐射", desc: "波长倒数增强声子产生", cost: 3e16 },
  ],
  [ // 第2组
    { id: "au21", name: "时序扩张", desc: "解锁升级3自动化的间隔模式", cost: 1e5 },
    { id: "au22", name: "末日时钟", desc: "解锁自动湮灭的间隔模式", cost: 1e6 },
    { id: "au23", name: "声纹记忆", desc: "购买升级3不再重置升级2", cost: 1e9 },
    { id: "au24", name: "量子涟漪", desc: "湮灭保留声子数量（进出扭曲宇宙除外）", cost: 1e11 },
  ],
  [ // 第3组
    { id: "au31", name: "时间之矢", desc: "基于真实游玩时间给予时间倍率", cost: 1e6 },
    { id: "au32", name: "成就刻印", desc: "成就的时间倍率 1.1x → 1.2x", cost: 1e7 },
    { id: "au33", name: "绝对零度", desc: "基于「冷却」最佳完成时间给予时间倍率", cost: 1e10 },
    { id: "au34", name: "引力扭曲", desc: "增强黑洞的效果", cost: 1e11 },
  ],
  [ // 第4组（4DA 解锁）
    { id: "au41", name: "共轭湮灭", desc: "湮灭次数加成奇点获取", cost: 3e8 },
    { id: "au42", name: "虚幻凝聚", desc: "基于虚粒子数量增加奇点获取", cost: 5e9 },
    { id: "au43", name: "奇点塌缩", desc: "新增一个奇点效果", cost: 5e12 },
    { id: "au44", name: "监察原理", desc: "事件视界的加成在软上限后生效", cost: 1e14 },
  ],
];
function auOwned(id) { return !!state.au[id]; }
function buySAU(id, bulk) {
  const u = SAU_DEFS.find(x => x.id === id) || (id === VACUUM_DEF.id ? VACUUM_DEF : null);
  if (!u) return;
  const n = state[u.key] + 1; // 第 n 次购买（1 起）
  const effMax = sauDefMax(u); // 单圈重整取消 sau1/sau3 上限
  if (state[u.key] >= effMax) return;
  const cLog = u.costLog(n); // 价格权威（log 域，超 double 的价格也可正确判定与扣款）
  if (cmpLT(state.sp, Math.pow(10, cLog), getLogSp(), cLog)) return;
  subSpLog(cLog);
  state[u.key]++;
  if (!bulk) { saveGame(); checkAchievements(); updateSpUI(); } // 可重复升级：不弹购买提示（防连点刷屏）
}
function buyAU(id) {
  const u = AU_DEFS.flat().find(x => x.id === id);
  if (!u || auOwned(id)) return;
  if (cmpLT(state.sp, u.cost, getLogSp(), Math.log10(u.cost))) return;
  subSpLog(Math.log10(u.cost));
  state.au[id] = 1;
  saveGame();
  checkAchievements(); // A35
  updateSpUI();
  setAutosaveStatus("已购买奇点升级：" + u.name);
}

// ---- 效果挂钩 ----
// 可重复升级软上限：有效级别 = 软上限起点 + (n-起点)^power（起点处无缝衔接原线性公式）
function effLevel(n, softcap, power) {
  return n <= softcap ? n : softcap + Math.pow(n - softcap, power);
}
// SAU1：声子升级3上限（有效级别 = floor(10+(n-10)^(1/2))；每级 +2，单圈重整后 +3）
// SAU1：声子升级3上限（单圈重整后软上限：超出 20 基础的部分 = 30+floor(3*(n-10)^0.7)，
// 即 n>10 时 pg3Cap = 50+floor(3*(n-10)^0.7)；未购 VPU1 时上限 10 级、每级 +2）
function pg3Cap() {
  // 量子狂潮与理论树节点 21 的免费等级计入；节点 21 削弱软上限（指数 0.7 → 0.8）。
  // 未购单圈重整时同样运用有效等级软上限（n1 > 10 的超出部分按 exp 次方缩减，每级增量按 +2/级）
  const n1 = state.sau1 + sau1FreeLevel();
  const exp = theoryOwned("21") ? 0.8 : 0.7;
  const per = vpuOwned("vpu1") ? 3 : 2;
  if (n1 <= 10) return 20 + per * n1;
  return 20 + per * 10 + Math.floor(per * Math.pow(n1 - 10, exp));
}
// SAU2 奇点凝聚软上限的缩放指数：基础 1/3；理论树节点 41「波动光学」削弱为 0.7
//（超出 10 级的部分保留更多；价格超限增速 ×n⁴ 不受影响）
function sau2SoftcapExp() { return theoryOwned("41") ? 0.7 : 1 / 3; }
// SAU2：奇点效果指数倍率（有效级别 = 10+(n-10)^sau2SoftcapExp()）
function sauMult() {
  const eff = effLevel(state.sau2, 10, sau2SoftcapExp());
  return 1 + eff / 10;
}
// SAU3：热涨落指数（有效级别 = 10+(n-10)^(1/3)；每级 +0.015，单圈重整后 +0.018；量子狂潮免费等级计入）
function thermalExp() {
  const eff = effLevel(state.sau3 + vpu2FreeLevel(), 10, 1 / 3);
  return 0.2 + (vpuOwned("vpu1") ? 0.018 : 0.015) * eff;
}
// AU11：up1 指数加成
function up1Exp() { return auOwned("au11") ? Math.max(1, Math.sqrt(state.up1) / 5) : 1; }
// A53 融合奖励：up1 免费等级（计入效果与「up2 需至少一级升级1」的判定，不计入价格/AU11 指数）
function up1FreeLevel() { return state.ach.normal.includes("A53") ? 1 : 0; }
function getUp1Eff() { return state.up1 + up1FreeLevel(); }
// AU12：pg2 免费等级
function pg2Free() { return auOwned("au12") ? state.pg1 * 2 : 0; }
// AU13：up2 底数加成
function up2Base() { return 2 + (auOwned("au13") ? Math.min(2, Math.log10(1 + state.up2) / 4) : 0); }
// AU14：波长倒数增强声子产生
function invLMult() { return auOwned("au14") ? Math.max(1, Math.pow(10, -0.1 * getLogL10())) : 1; }
// 波长倒数增强声子产生的 log10：max(0, -0.1·logL10)
function invLMultLog() { return auOwned("au14") ? Math.max(0, -0.1 * getLogL10()) : 0; }
// AU41：共轭湮灭——湮灭次数 A 加成奇点效果：×(1+lg(1+A)/3)^(1/2)
function phononSpMult() {
  if (!auOwned("au41")) return 1;
  const base = Math.sqrt(1 + Math.log10(1 + state.annihilations) / 3);
  let m = vpuOwned("vpu5") ? base * base : base; // VPU5 临界湮灭：共轭湮灭效果 ^2
  if (theoryOwned("22")) m = Math.pow(m, 10); // 理论树节点22 刚体力学：效果 ^10
  return m;
}
// AU31：时间倍率（真实游玩时间）
function timeArrowMult() { return auOwned("au31") ? 1 + Math.pow(Math.log10(1 + state.realTime), 0.6) : 1; }
// AU32：成就时间倍率底数
function achTimeBase() { return auOwned("au32") ? 1.2 : 1.1; }
// AU33：绝对零度（冷却最佳完成时间 T 秒）：×min(200, max(1, min((1000/T)^0.5, 60/T)))
function absZeroMult() {
  if (!auOwned("au33")) return 1;
  const T = state.distortBest && state.distortBest.cooldown;
  if (!T || T <= 0) return 1;
  return Math.min(200, Math.max(1, Math.min(Math.sqrt(1000 / T), 60 / T)));
}

