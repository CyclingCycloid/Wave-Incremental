// ---------- 黑洞 UI（build-once, in-place update）+ 旋转动画 ----------
let bhBuilt = false, bhRefs = {}, bhStateBtns = [], bhAnimRAF = 0, bhAngle = 0, bhParticles = [], bhVpuSection = null, bhSvpuTopRow = null;

function buildBlackholeOnce() {
  if (bhBuilt) return;
  const list = document.getElementById("bh-upg-list");
  list.innerHTML = "";
  bhRefs = {};
  // 两组升级：各自三个一排，标题居中
  const mkTitle = (text) => {
    const t = document.createElement("div");
    t.className = "bh-row-title";
    t.textContent = text;
    return t;
  };
  const mkRow = () => {
    const row = document.createElement("div");
    row.className = "bh-upg-row";
    return row;
  };
  // 黑洞升级（花 Sp）
  list.appendChild(mkTitle("黑洞升级"));
  const sbuRow = mkRow();
  list.appendChild(sbuRow);
  for (const u of SBU_DEFS) {
    const btn = document.createElement("button");
    btn.className = "sau-btn bh-upg-btn";
    const nm = document.createElement("div"); nm.className = "sau-name"; nm.textContent = u.name;
    const ds = document.createElement("div"); ds.className = "sau-desc";
    const tt = document.createElement("div"); tt.className = "sau-total";
    const ct = document.createElement("div"); ct.className = "sau-cost";
    btn.append(nm, ds, tt, ct);
    btn.addEventListener("click", () => buyMaxLoop(u.key, (b) => buySBU(u.id, b)));
    sbuRow.appendChild(btn);
    bhRefs[u.id] = { u, btn, descEl: ds, costEl: ct, totalEl: tt };
  }
  // 虚粒子升级（花 VP）
  list.appendChild(mkTitle("虚粒子升级"));
  // 虚粒子升级（花 VP）。布局：SVPU4/5 居中首行（购买 VPU5 后解锁出现），
  // SVPU1/2/3 在下（两行按钮尺寸一致，各为行宽 1/3）
  const svpuTopRow = mkRow();
  svpuTopRow.classList.add("svpu-top-row");
  list.appendChild(svpuTopRow);
  bhSvpuTopRow = svpuTopRow;
  const svpuRow = mkRow();
  list.appendChild(svpuRow);
  for (const u of SVPU_DEFS) {
    const btn = document.createElement("button");
    btn.className = "sau-btn bh-upg-btn svpu-btn";
    const nm = document.createElement("div"); nm.className = "sau-name"; nm.textContent = u.name;
    const ds = document.createElement("div"); ds.className = "sau-desc";
    const tt = document.createElement("div"); tt.className = "sau-total";
    const ct = document.createElement("div"); ct.className = "sau-cost";
    btn.append(nm, ds, tt, ct);
    btn.addEventListener("click", () => buyMaxLoop(u.key, (b) => buySVPU(u.id, b)));
    const row = (u.id === "svpu4" || u.id === "svpu5") ? svpuTopRow : svpuRow;
    row.appendChild(btn);
    bhRefs[u.id] = { u, btn, descEl: ds, costEl: ct, totalEl: tt, vp: true };
  }
  // 虚粒子单次升级（2×2 方格，A45 星标奖励解锁；达成 A45 前整区不可见）
  bhVpuSection = document.createElement("div");
  bhVpuSection.appendChild(mkTitle("虚幻升级"));
  const vpuRow = document.createElement("div");
  vpuRow.className = "bh-vpu-grid";
  bhVpuSection.appendChild(vpuRow);
  list.appendChild(bhVpuSection);
  bhVpuSection.classList.toggle("hidden", !state.ach.normal.includes("A45"));
  for (const u of VPU_DEFS) {
    const btn = document.createElement("button");
    btn.className = "sau-btn bh-upg-btn vpu-btn" + (u.currency === "vf" ? " vpu2-card" : "");
    const nm = document.createElement("div"); nm.className = "sau-name"; nm.textContent = u.name;
    const ds = document.createElement("div"); ds.className = "sau-desc";
    const ct = document.createElement("div"); ct.className = "sau-cost";
    btn.append(nm, ds, ct);
    btn.addEventListener("click", () => buyVPU(u.id));
    vpuRow.appendChild(btn);
    bhRefs[u.id] = { u, btn, descEl: ds, costEl: ct, vpu: true };
  }
  bhStateBtns = [];
  document.querySelectorAll(".bh-state-btn").forEach(b => {
    b.addEventListener("click", () => setBhState(b.dataset.bhState));
    bhStateBtns.push(b);
  });
  // S21 这是饼干点点乐吗？—— 点击黑洞动画界面 100 次
  const canvas = document.getElementById("bh-canvas");
  if (canvas) {
    canvas.addEventListener("click", () => {
      if (!bhUnlocked() || state.ach.hidden.includes("S21")) return;
      state.bhCanvasClicks++;
      if (state.bhCanvasClicks >= 100) {
        grantHidden("S21");
        updateAchievementsUI();
      }
    });
  }
  // 动画初始化：粒子池
  bhParticles = [];
  for (let i = 0; i < 60; i++) bhParticles.push({ a: Math.random() * Math.PI * 2, r: 0.3 + Math.random() * 0.6, s: 0.5 + Math.random(), life: Math.random() });
  bhBuilt = true;
}

function bhRadius() {
  // 直径比例 = max(0.1, min(0.6, min((lg(M)/800)^0.5, lg(M)/200)))（界面宽度的倍数）；返回半径
  // M=1（lg=0）时取下限 0.1 倍界面宽；先按 lg/200 线性增长、(lg/800)^0.5 在大质量时更缓，
  // 最终在 lg(M)≥288 处封顶 0.6 倍
  const mLog = Math.max(0, getLogBhMass());
  const scale = Math.max(0.1, Math.min(0.6, Math.min(Math.sqrt(mLog / 800), mLog / 200)));
  const pageW = document.getElementById("app").offsetWidth || 760;
  return { r: pageW * scale / 2, pageW };
}

function drawBlackhole(state2) {
  const canvas = document.getElementById("bh-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const { r } = bhRadius();
  const cx = w / 2, cy = h / 2;
  // 画布内截断：直径不超过画布宽（保留少量边距给事件视界光环）
  const R = Math.min(r, w * 0.48);
  bhAngle += state2 === "distorl" ? 0.04 : (state2 === "pulse" ? 0.02 : 0.012);
  // 吸积盘环（多层）
  for (let ring = 0; ring < 4; ring++) {
    const rr = R * (1.2 + ring * 0.25);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(bhAngle * (1 - ring * 0.15));
    ctx.beginPath();
    ctx.ellipse(0, 0, rr, rr * 0.32, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, ${120 - ring * 20}, 40, ${0.5 - ring * 0.1})`;
    ctx.lineWidth = 2 + ring;
    ctx.stroke();
    ctx.restore();
  }
  // 黑洞本体（径向渐变）
  const grad = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
  if (state2 === "pulse") {
    grad.addColorStop(0, "#7a0a0a");
    grad.addColorStop(0.5, "#3a0000");
    grad.addColorStop(1, "#000");
  } else {
    grad.addColorStop(0, "#000");
    grad.addColorStop(0.7, "#0a0a0a");
    grad.addColorStop(1, "#1a1a2a");
  }
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  // 事件视界光环
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2);
  ctx.strokeStyle = state2 === "pulse" ? "rgba(255,60,60,0.6)" : "rgba(120,80,200,0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 粒子
  for (const p of bhParticles) {
    p.a += (state2 === "distorl" ? 0.06 : 0.03) * p.s;
    p.life += 0.01;
    if (p.life > 1) { p.life = 0; p.r = 0.3 + Math.random() * 0.6; }
    const dist = state2 === "accrete" ? (1 - p.life) : p.life; // 吸积向内、脉冲向外
    const pr = R * (1.1 + dist * 1.5);
    const px = cx + Math.cos(p.a) * pr;
    const py = cy + Math.sin(p.a) * pr * 0.32;
    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = state2 === "pulse" ? `rgba(255,80,80,${1 - p.life})` : `rgba(180,150,255,${0.3 + (1 - p.life) * 0.5})`;
    ctx.fill();
  }
}

function bhAnimLoop() {
  if (!bhBuilt) { bhAnimRAF = requestAnimationFrame(bhAnimLoop); return; }
  drawBlackhole(state.bhState);
  // 快变数字刷新（黑洞状态行）
  const stats = document.getElementById("bh-stats");
  if (stats) {
    const stNames = { accrete: "吸积", distorl: "扭曲", pulse: "脉冲" };
    stats.innerHTML =
      `<div class="bh-stat-row"><span>黑洞质量</span><span>${fmtNum(state.bhMass, getLogBhMass())} M☉</span></div>` +
      `<div class="bh-stat-row"><span>虚粒子</span><span>${fmtInt(state.virtualParticles, getLogVP())}</span></div>` +
      `<div class="bh-stat-row"><span>当前状态</span><span>${stNames[state.bhState] || "—"}</span></div>` +
      `<div class="bh-stat-row"><span>扭曲效果</span><span>×${fmtNum(bhTimeMultPreviewLog() > 0 ? Math.pow(10, Math.min(bhTimeMultPreviewLog(), 308)) : 1, bhTimeMultPreviewLog())}</span></div>` +
      (bhMassSoftcapped() ? `<div class="bh-softcap-note">黑洞质量获取超过 1e${bhMassSoftcapLog()} 的部分将受到软上限影响</div>` : "");
  }
  bhAnimRAF = requestAnimationFrame(bhAnimLoop);
}

function updateBlackholeUI() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  if (!bhUnlocked()) return;
  buildBlackholeOnce();
  document.getElementById("subtab-blackhole").classList.toggle("hidden", !bhUnlocked());
  // VPU 虚粒子单次升级区：达成 A45「万物」前整区不可见
  if (bhVpuSection) bhVpuSection.classList.toggle("hidden", !state.ach.normal.includes("A45"));
  // SVPU4/5（热能超载/潮汐撕裂）：购买 VPU5 后作为其奖励出现
  if (bhSvpuTopRow) bhSvpuTopRow.classList.toggle("hidden", !vpuOwned("vpu5"));
  // 状态按钮高亮
  for (const b of bhStateBtns) {
    b.classList.toggle("active", b.dataset.bhState === state.bhState);
  }
  // SBU 升级（花 Sp）与 SVPU 升级（花 VP）；VPU 单次升级在下方单独处理
  for (const id in bhRefs) {
    const r = bhRefs[id];
    if (r.vpu) continue; // VPU 走下方专属处理（无 key/max/cost 函数）
    const n = state[r.u.key] + 1;
    const effMax = r.u.id === "svpu1" ? svpu1Max() : r.u.max; // 全息原理：对偶原理后 4 → 无上限
    const maxed = effMax !== Infinity && state[r.u.key] >= effMax;
    let c, cLog, affordable, costStr, resUnit;
    if (r.vp) {
      // SVPU：花 VP
      cLog = r.u.costLog(n);
      c = Math.pow(10, cLog);
      affordable = !maxed && cmpGE(state.virtualParticles, c, getLogVP(), cLog);
      costStr = fmtNum(c, cLog) + " VP";
      resUnit = "VP";
    } else {
      // SBU：花 Sp（价格走 sbuCostLog 权威，与 buySBU 扣款一致，含超限额外缩放）
      cLog = sbuCostLog(r.u, n);
      c = Math.pow(10, cLog);
      affordable = !maxed && cmpGE(state.sp, c, getLogSp(), cLog);
      costStr = fmtNum(c, cLog) + " Sp";
      resUnit = "Sp";
    }
    {
      // 等级显示：量子狂潮免费等级以「+N 免费」并入（仅展示，不影响价格）
      const free = (!r.vp && vpu2FreeLevel() > 0) ? " + " + fmt(vpu2FreeLevel()) + " 免费" : "";
      r.descEl.textContent = r.u.desc + (effMax !== Infinity
        ? "（" + state[r.u.key] + free + "/" + effMax + "）"
        : "（等级 " + state[r.u.key] + free + "）");
    }
    if (r.totalEl) renderTotalEffect(r.totalEl, r.u.id);
    r.costEl.textContent = maxed ? "已满级" : costStr;
    r.btn.disabled = maxed || !affordable;
    r.btn.classList.toggle("bought", maxed);
    r.btn.classList.toggle("affordable", !maxed && affordable);
  }
  // VPU 虚粒子单次升级（花 VP；A45 奖励解锁，各自有解锁条件；达成条件前显示具体条件）
  for (const id in bhRefs) {
    const r = bhRefs[id];
    if (!r.vpu) continue;
    const owned = vpuOwned(r.u.id);
    const unlocked = vpuUnlocked(r.u.id);
    if (!unlocked) {
      // 未解锁：已实装（有解锁条件）的显示「未解锁」+ 条件进度，占位的显示「未开放」
      const isReal = isFinite(r.u.cost); // 实装升级有真实价格，占位为 Infinity
      r.descEl.textContent = vpuCondText(r.u.id) || "（占位）";
      r.costEl.textContent = isReal ? "未解锁" : "未开放";
      if (r.nameEl) r.nameEl.textContent = r.u.name;
      r.btn.disabled = true;
      r.btn.classList.remove("bought");
      r.btn.classList.remove("affordable");
      continue;
    }
    r.descEl.textContent = r.u.desc;
    if (r.nameEl) r.nameEl.textContent = r.u.name;
    if (r.u.currency === "vf") {
      // VPU2：VF 购买；描述附当前免费等级与奇点乘数
      r.descEl.textContent = r.u.desc
        + "\n当前免费等级 +" + fmt(vpu2FreeLevel()) + "/个 · 奇点效果 ×" + fmt(vpu2SingMult());
      const afford = state.logVoidVF10 >= Math.log10(r.u.cost);
      r.costEl.textContent = owned ? "已购买" : fmt(r.u.cost) + " VF";
      r.btn.disabled = owned || !afford;
      r.btn.classList.toggle("bought", owned);
      r.btn.classList.toggle("affordable", !owned && afford);
      continue;
    }
    r.costEl.textContent = owned ? "已购买" : (isFinite(r.u.cost) ? fmt(r.u.cost) + " VP" : "未开放");
    const afford = isFinite(r.u.cost) && cmpGE(state.virtualParticles, r.u.cost, getLogVP(), Math.log10(r.u.cost));
    r.btn.disabled = owned || !afford;
    r.btn.classList.toggle("bought", owned);
    r.btn.classList.toggle("affordable", !owned && afford);
  }
}

// 批量购买上限升级（A34 解锁，位于自动化页）
const BATCH_UPG = { id: "batch", name: "批量购买上限翻倍", desc: "批量购买的每次上限翻倍（初始 2）；打破规则且上限超过 128 后变为「最大购买」", key: "batchLvl", repeat: true, cost: () => Math.pow(20, state.batchLvl) };
// A42 星标奖励：自动湮灭 CD 缩减升级（自动化页，Sp 购买；每级 CD ÷2，最低 25ms）
const ANN_CD_UPG = { id: "annCd", name: "自动湮灭 CD 缩减", desc: "每级使自动湮灭 CD ÷2（最低 25ms，最高 3 级）", key: "autoAnnCDLvl", max: 3, cost: () => Math.pow(100, state.autoAnnCDLvl) * 1e12 };
function buyAnnCDUpgrade() {
  if (!state.ach.normal.includes("A42")) return;
  if (state.autoAnnCDLvl >= ANN_CD_UPG.max) return; // 3 级后 CD 已到 25ms 下限，拒绝购买
  const cost = ANN_CD_UPG.cost();
  if (cmpLT(state.sp, cost, getLogSp(), Math.log10(cost))) return;
  subSpLog(Math.log10(cost));
  state.autoAnnCDLvl++;
  saveGame();
  updateAutomationUI();
}
function buyBatchUpgrade() {
  if (!state.ach.normal.includes("A34")) return;
  // 打破规则且上限已超 128（「最大购买」状态）后不可购买
  if (batchLimit() === Infinity) return;
  const cost = BATCH_UPG.cost();
  if (cmpLT(state.sp, cost, getLogSp(), Math.log10(cost))) return;
  subSpLog(Math.log10(cost));
  state.batchLvl++;
  state.batchMax = Math.pow(2, state.batchLvl + 1);
  saveGame();
  updateAutomationUI();
}

// 湮灭页 UI（build-once, in-place update）
let spBuilt = false, msRefs = [], sauRefs = [], auRefs = {}, vacRef = null;
function buildAnnihilationOnce() {
  if (spBuilt) return;
  // 里程碑
  const mList = document.getElementById("milestone-list");
  mList.innerHTML = ""; msRefs = [];
  for (const m of MILESTONES) {
    const row = document.createElement("div");
    row.className = "milestone" + (m.n === 20 ? " distort" : "");
    const d = document.createElement("div"); d.className = "ms-desc"; d.textContent = `第 ${m.n} 次湮灭：${m.desc}`;
    const c = document.createElement("div"); c.className = "ms-count";
    row.append(d, c);
    mList.appendChild(row);
    msRefs.push({ m, row, countEl: c });
  }
  // 扭曲里程碑（接在湮灭里程碑下方，暗红色）
  const mSection = document.getElementById("milestone-list");
  const dtTitle = document.createElement("div");
  dtTitle.className = "ms-distort-title hidden";
  dtTitle.id = "distort-ms-title";
  dtTitle.textContent = "扭曲里程碑（已湮灭的扭曲宇宙数量）";
  mSection.appendChild(dtTitle);
  for (const m of DISTORT_MILESTONES) {
    const row = document.createElement("div");
    row.className = "milestone distort hidden distort-ms" + (m.black ? " black" : "");
    const d = document.createElement("div"); d.className = "ms-desc";
    d.textContent = m.n + " DA：" + m.desc; // 1DA 描述在 updateSpUI 动态刷新
    const c = document.createElement("div"); c.className = "ms-count";
    row.append(d, c);
    mSection.appendChild(row);
    msRefs.push({ m, row, countEl: c, descEl: d, distort: true });
  }
  // 奇点升级
  const uList = document.getElementById("sp-upgrade-list");
  uList.innerHTML = "";
  // 真空衰变（SAU 行上方）
  const vacRow = document.createElement("div");
  vacRow.className = "sau-row vac-row";
  vacRef = null;
  {
    const btn = document.createElement("button");
    btn.className = "sau-btn";
    const nm = document.createElement("div"); nm.className = "sau-name"; nm.textContent = VACUUM_DEF.name;
    const ds = document.createElement("div"); ds.className = "sau-desc";
    const tt = document.createElement("div"); tt.className = "sau-total";
    const ct = document.createElement("div"); ct.className = "sau-cost";
    btn.append(nm, ds, tt, ct);
    btn.addEventListener("click", () => buyMaxLoop(VACUUM_DEF.key, (b) => buySAU(VACUUM_DEF.id, b)));
    vacRow.appendChild(btn);
    vacRef = { u: VACUUM_DEF, btn, descEl: ds, costEl: ct, totalEl: tt };
  }
  uList.appendChild(vacRow);
  // SAU 可重复升级（一行三个扁长方按钮，3DA 解锁）
  const sauRow = document.createElement("div");
  sauRow.className = "sau-row";
  sauRefs = [];
  for (const u of SAU_DEFS) {
    const btn = document.createElement("button");
    btn.className = "sau-btn";
    const nm = document.createElement("div"); nm.className = "sau-name"; nm.textContent = u.name;
    const ds = document.createElement("div"); ds.className = "sau-desc";
    const tt = document.createElement("div"); tt.className = "sau-total";
    const ct = document.createElement("div"); ct.className = "sau-cost";
    btn.append(nm, ds, tt, ct);
    btn.addEventListener("click", () => buyMaxLoop(u.key, (b) => buySAU(u.id, b)));
    sauRow.appendChild(btn);
    sauRefs.push({ u, btn, descEl: ds, costEl: ct, totalEl: tt });
  }
  uList.appendChild(sauRow);
  // AU 单次升级（四组；两组并排，按钮按行交错——AU2n 与 AU1n 同行对齐）
  auRefs = {};
  for (let grp = 0; grp < AU_DEFS.length; grp += 2) {
    const gA = AU_DEFS[grp], gB = AU_DEFS[grp + 1] || [];
    for (let i = 0; i < Math.max(gA.length, gB.length); i++) {
      const rowEl = document.createElement("div");
      rowEl.className = "au-row";
      for (const g of [gA, gB]) {
        const u = g[i];
        if (!u) continue;
        const btn = document.createElement("button");
        btn.className = "au-btn";
        const nm = document.createElement("div"); nm.className = "sau-name"; nm.textContent = u.name;
        const ds = document.createElement("div"); ds.className = "sau-desc";
        const ct = document.createElement("div"); ct.className = "sau-cost";
        btn.append(nm, ds, ct);
        btn.addEventListener("click", () => buyAU(u.id));
        rowEl.appendChild(btn);
        auRefs[u.id] = { u, btn, nameEl: nm, descEl: ds, costEl: ct };
      }
      uList.appendChild(rowEl);
    }
  }
  spBuilt = true;
}
// AU 卡的「当前总效果」后缀（仅已购买的升级显示；AU13 沿用其原有内联显示分支）
// 文本每 tick 随 updateSpUI 实时刷新，与 AU13「（当前底数 X）」同风格
function auEffectSuffix(id) {
  if (!auOwned(id)) return "";
  switch (id) {
    case "au11":
      return "（当前指数 " + up1Exp().toFixed(3) + "）";
    case "au12":
      return "（当前免费等级 " + fmt(pg2Free()) + "）";
    case "au14":
      return "（当前声子获取 ×" + fmtNum(invLMult(), invLMultLog()) + "）";
    case "au31":
      return "（当前时间倍率 ×" + fmt(timeArrowMult()) + "）";
    case "au33":
      return "（当前时间倍率 ×" + fmt(absZeroMult()) + "）";
    case "au34":
      return ""; // 效果总倍率已移至黑洞页「效果」行显示
    case "au41":
      return "（当前奇点获取 ×" + fmt(phononSpMult()) + "）";
    case "au42":
      return "（当前奇点获取 ×" + fmtLog(vpSpMultLog()) + "）";
    default:
      return "";
  }
}
function updateSpUI() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  if (state.annihilations < 1) return;
  buildAnnihilationOnce();
  // 扭曲里程碑：解锁扭曲（20 湮灭）前不可见
  const distortMsVisible = state.annihilations >= 20;
  const dtTitleEl = document.getElementById("distort-ms-title");
  if (dtTitleEl) dtTitleEl.classList.toggle("hidden", !distortMsVisible);
  for (const r of msRefs) {
    if (r.distort) r.row.classList.toggle("hidden", !distortMsVisible);
    // 1DA 描述动态显示当前倍率（仅里程碑自身）
    if (r.distort && r.m.n === 1 && r.descEl) {
      r.descEl.textContent = "1 DA：基于扭曲宇宙湮灭数，奇点效果指数 ×" + (1 + Math.log2(1 + distortDA())).toFixed(2);
    }
    // 8DA：7DA 前显示 ？？？？？（防剧透），7DA 后显示真实描述（金色）
    // 8DA：7DA 前显示 ？？？？？；7DA 后金色文字（完成前红框、完成后金框全金）
    if (r.distort && r.m.n === 8 && r.descEl) {
      r.row.classList.add("ms-8da");
      if (hasDistortMilestone(7)) {
        r.descEl.textContent = "8 DA：" + r.m.desc;
        r.descEl.classList.add("gold-text");
      } else {
        r.descEl.textContent = "8 DA：？？？？？";
        r.descEl.classList.remove("gold-text");
      }
    }
    const done = r.distort ? hasDistortMilestone(r.m.n) : hasMilestone(r.m.n);
    r.row.classList.toggle("done", done);
    const cur = r.distort ? distortDA() : effAnnihilations();
    r.countEl.textContent = done ? "✓" : (cur + " / " + r.m.n);
  }
  // 真空衰变（3DA 解锁）
  const sauUnlocked = hasDistortMilestone(3);
  if (vacRef) {
    vacRef.btn.classList.toggle("hidden", !sauUnlocked);
    if (sauUnlocked) {
      const n = state.sau4 + 1;
      const cLog = VACUUM_DEF.costLog(n);
      const c = Math.pow(10, cLog);
      vacRef.descEl.textContent = VACUUM_DEF.desc + "（等级 " + state.sau4 + "）";
      if (vacRef.totalEl) renderTotalEffect(vacRef.totalEl, VACUUM_DEF.id);
      vacRef.costEl.textContent = fmtNum(c, cLog) + " Sp";
      vacRef.btn.disabled = !cmpGE(state.sp, c, getLogSp(), cLog);
      vacRef.btn.classList.toggle("affordable", cmpGE(state.sp, c, getLogSp(), cLog));
    }
  }
  for (const r of sauRefs) {
    r.btn.classList.toggle("hidden", !sauUnlocked);
    if (!sauUnlocked) continue;
    const n = state[r.u.key] + 1;
    const effMax = sauDefMax(r.u); // 单圈重整取消 sau1/sau3 上限
    const maxed = state[r.u.key] >= effMax;
    const cLog = r.u.costLog(n); // 价格权威（log 域），c 仅作显示缓存（可超 double → Infinity）
    const c = Math.pow(10, cLog);
    const afford = !maxed && cmpGE(state.sp, c, getLogSp(), cLog);
    {
      // 象限拓张/紫外灾难：免费等级以「+N 免费」并入显示（不影响价格与购买上限）；
      // 象限拓张含理论树节点 21 的 CM 免费等级，紫外灾难仅量子狂潮
      const isSau13 = r.u.key === "sau1" || r.u.key === "sau3";
      const freeLvl = r.u.key === "sau1" ? sau1FreeLevel() : vpu2FreeLevel();
      const free = (isSau13 && freeLvl > 0) ? " + " + fmt(freeLvl) + " 免费" : "";
      r.descEl.textContent = sauDesc(r.u) + (effMax !== Infinity ? "（" + state[r.u.key] + free + "/" + effMax + "）" : "（等级 " + state[r.u.key] + free + "）");
    }
    if (r.totalEl) renderTotalEffect(r.totalEl, r.u.id);
    r.costEl.textContent = maxed ? "已满级" : fmtNum(c, cLog) + " Sp";
    r.btn.disabled = maxed || !afford;
    r.btn.classList.toggle("bought", maxed);
    r.btn.classList.toggle("affordable", afford);
  }
  // AU 单次升级（第 4 组 4DA 前显示 ???，解锁后显示真实内容）
  // AU42 需 6DA、AU43 需 7DA、AU44 需打破多元宇宙规则；其余 au4* 需 4DA
  const au4Unlocked = hasDistortMilestone(4);
  for (const id in auRefs) {
    const r = auRefs[id];
    r.btn.classList.toggle("hidden", !sauUnlocked);
    if (!sauUnlocked) continue;
    const owned = auOwned(id);
    const afford = spAfford(r.u.cost);
    const isAu4 = id.startsWith("au4");
    // 未解锁时名字显示？？？、描述显示解锁条件
    const au42Unlocked = hasDistortMilestone(6);
    const au43Unlocked = hasDistortMilestone(7);
    // AU44：7DA 前始终隐藏（？？？？？），7DA 后以「打破多元宇宙的规则」解锁
    const au44Unlocked = hasDistortMilestone(7) && state.rulesBroken;
    const thisUnlocked = !isAu4 ? true : (id === "au42" ? au42Unlocked : id === "au43" ? au43Unlocked : id === "au44" ? au44Unlocked : au4Unlocked);
    if (isAu4 && !thisUnlocked) {
      r.descEl.textContent = id === "au42" ? "（6DA 解锁）" : id === "au43" ? "（7DA 解锁）" : id === "au44" ? "（打破多元宇宙的规则解锁）" : "（4DA 解锁）";
      if (r.nameEl) r.nameEl.textContent = "？？？";
    } else if (id === "au13") {
      // AU13 光子共振：实时显示当前 up2 底数
      r.descEl.textContent = r.u.desc + "（当前底数 " + up2Base().toFixed(3) + "）";
      if (r.nameEl) r.nameEl.textContent = r.u.name;
    } else {
      r.descEl.textContent = r.u.desc + auEffectSuffix(id);
      if (r.nameEl) r.nameEl.textContent = r.u.name;
    }
    r.costEl.textContent = owned ? "已购买"
      : (r.u.cost === Infinity ? "未开放"
      : (isAu4 && !thisUnlocked ? "???" : fmt(r.u.cost) + " Sp"));
    r.btn.disabled = owned || !afford || (isAu4 && !thisUnlocked);
    r.btn.classList.toggle("bought", owned);
    r.btn.classList.toggle("affordable", !owned && afford);
  }
  // 总奇点加成面板
  const panel = document.getElementById("sp-bonus-panel");
  const rows = [
    ["总奇点 (Sp)", fmtNum(state.totalSp, getLogTotalSp())],
    ["波速获取倍率", "×" + fmtNum(hasDistortMilestone(1) ? Decimal.pow(1 + state.totalSp, waveGainExp()).toNumber() : Math.pow(1 + state.totalSp, 2), waveGainExp() * spEffectTermLog())],
    ["普朗克常数倍率", "×" + fmtNum(planckMult(), planckMultLog())],
  ];
  if (auOwned("au43")) rows.push(["黑洞吸积效率倍率", "×" + fmtNum(spAccretionMult(), spAccretionMultLog())]);
  rows.push(["当前宇宙普朗克温度", fmtNum(temperatureCap(), temperatureCapLog()) + " K"]);
  panel.innerHTML = "";
  for (const [label, value] of rows) {
    const row = document.createElement("div"); row.className = "spb-row";
    const l = document.createElement("span"); l.className = "spb-label"; l.textContent = label;
    const v = document.createElement("span"); v.className = "spb-value"; v.textContent = value;
    row.append(l, v);
    panel.appendChild(row);
  }
  // 温度上限软上限提示：原上限超 1e250 且未打破规则时显示（亮红）
  {
    const expS = hasDistortMilestone(1) ? tempCapExp() : 10;
    const rawLogCap = expS * spEffectTermLog() + Math.log10(T_P0);
    if (rawLogCap > 250 && !state.rulesBroken) {
      const warn = document.createElement("div");
      warn.className = "spb-warning";
      warn.textContent = "多元宇宙的规则正在阻止你获取更高的温度";
      panel.appendChild(warn);
    }
  }
  // 8DA 打破规则按钮：奇点页顶部居中（红→金）
  {
    const brBtn = document.getElementById("break-rules-btn");
    if (brBtn) {
      brBtn.classList.toggle("hidden", !hasDistortMilestone(8));
      brBtn.classList.toggle("broken", state.rulesBroken);
      brBtn.textContent = state.rulesBroken ? "恢复多元宇宙的规则" : "打破多元宇宙的规则";
    }
  }
  document.getElementById("sp-value").textContent = fmtNum(state.sp, getLogSp());
}

