// ---------- 卷缩层 UI ----------
let compactBuilt = false;
let compMsEls = [];
let compactEls = {};
function buildCompactOnce() {
  if (compactBuilt) return;
  // 里程碑（参照湮灭里程碑横条：编号 + 奖励 + 状态，橙色主题）
  const msGrid = document.getElementById("comp-milestone-list");
  msGrid.innerHTML = "";
  compMsEls = [];
  for (const def of COMP_MILESTONES) {
    const cell = document.createElement("div");
    cell.className = "milestone comp-milestone";
    const label = document.createElement("span"); label.className = "comp-ms-label"; label.textContent = `${def.n}次卷缩`;
    const main = document.createElement("div"); main.className = "comp-ms-main";
    const reward = document.createElement("span"); reward.className = "comp-ms-reward"; reward.textContent = def.reward;
    const status = document.createElement("span"); status.className = "comp-ms-status";
    main.append(reward, status);
    cell.append(label, main);
    msGrid.appendChild(cell);
    compMsEls.push({ cell, statusEl: status });
  }
  // 拓扑节点购买（买完立即刷新：×N 与花费随余额变化）
  document.getElementById("comp-tp-buy").addEventListener("click", () => { buyTP(); updateCompactUI(); });
  // 几何转换按钮（点/边/面 各一对 −/+）
  const geoRow = document.getElementById("comp-geo-row");
  geoRow.innerHTML = "";
  compactEls.geo = {};
  for (const [key, label] of [["V", "点"], ["E", "边"], ["F", "面"]]) {
    const box = document.createElement("div"); box.className = "comp-geo-box";
    const nm = document.createElement("div"); nm.className = "comp-geo-name"; nm.textContent = `${label}（${key}）`;
    const row = document.createElement("div"); row.className = "comp-geo-btns";
    const dec = document.createElement("button"); dec.className = "comp-btn small"; dec.textContent = "−";
    const cnt = document.createElement("span"); cnt.className = "comp-geo-count";
    const inc = document.createElement("button"); inc.className = "comp-btn small"; inc.textContent = "+";
    dec.addEventListener("click", () => convertTP(key, -1));
    inc.addEventListener("click", () => convertTP(key, +1));
    row.append(dec, cnt, inc);
    box.append(nm, row);
    geoRow.appendChild(box);
    compactEls.geo[key] = { cnt, dec, inc };
  }
  // A64 奖励：自动最佳分配按钮（静态 HTML，位于「几何转换」提示与点/边/面行之间、居中）
  const autoBtn = document.getElementById("comp-auto-alloc");
  if (autoBtn) {
    autoBtn.addEventListener("click", applyAutoAlloc);
    compactEls.autoBtn = autoBtn;
  }
  // 灵感购买格子（大框内：频率 / 奇点 / 超弦 / 虚粒子[R8 后]，各自花费）
  const insCells = document.getElementById("comp-ins-cells");
  insCells.innerHTML = "";
  compactEls.ins = {};
  const INS_SRC_NAMES = { F: "频率", Sp: "奇点", SS: "超弦", VP: "虚粒子" };
  const INS_SRCS = ["F", "Sp", "SS", "VP"];
  for (const src of INS_SRCS) {
    const b = document.createElement("button");
    b.className = "comp-ins-cell";
    if (src === "VP") b.classList.add("hidden"); // R8 未购时隐藏：三等分 → 购买后四等分
    const s1 = document.createElement("span"); s1.className = "cis-src"; s1.textContent = INS_SRC_NAMES[src];
    const s2 = document.createElement("span"); s2.className = "cis-cost";
    b.append(s1, s2);
    b.addEventListener("click", () => { buyIns(src); updateCompactUI(); });
    insCells.appendChild(b);
    compactEls.ins[src] = { btn: b, cost: s2 };
  }
  // 理论树工具排（重置开关 / 导出剪贴板 / 导入）
  document.getElementById("theory-respec-btn").addEventListener("click", () => {
    state.theoryRespec = !state.theoryRespec;
    saveGame();
    updateCompactUI();
    setAutosaveStatus(state.theoryRespec ? "已勾选：下次卷缩重置时清空理论树并返还灵感" : "已取消卷缩重置理论树");
  });
  document.getElementById("theory-export-btn").addEventListener("click", copyTheoryTreeToClipboard);
  document.getElementById("theory-import-btn").addEventListener("click", doImportTheoryTree);
  // 预设按钮（左键/右键切换内联菜单：加载/保存/导入/命名——菜单位于六个小按钮下方，样式一致）
  const prRow = document.getElementById("comp-ins-presets");
  prRow.innerHTML = "";
  compactEls.presets = [];
  for (let i = 0; i < 6; i++) {
    const b = document.createElement("button");
    b.className = "comp-btn small theory-preset-btn";
    const openMenu = (e) => { e.preventDefault(); showTheoryPresetMenu(i); };
    b.addEventListener("click", openMenu);
    b.addEventListener("contextmenu", openMenu);
    prRow.appendChild(b);
    compactEls.presets.push(b);
  }
  setupTheoryPresetMenu();
  // 理论树（固定坐标世界 + SVG 连线 + 拖动/缩放；手机与桌面布局完全一致，只有缩放差异）
  const svg = document.getElementById("tree-lines");
  svg.setAttribute("width", TREE_WORLD_W);
  svg.setAttribute("height", TREE_WORLD_H);
  svg.innerHTML = "";
  const SVG_NS = "http://www.w3.org/2000/svg";
  compactEls.lines = {};
  for (const def of THEORY_NODES) {
    for (const p of def.parents) {
      const a = TREE_LAYOUT[p], b = TREE_LAYOUT[def.id];
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", a.x + TREE_NODE_W / 2); line.setAttribute("y1", a.y + TREE_NODE_H);
      line.setAttribute("x2", b.x + TREE_NODE_W / 2); line.setAttribute("y2", b.y);
      line.setAttribute("class", "tree-line");
      svg.appendChild(line);
      compactEls.lines[def.id] = line; // 子节点隐藏时连线一并隐藏
    }
  }
  const world = document.getElementById("tree-world");
  compactEls.nodes = {};
  for (const def of THEORY_NODES) {
    const pos = TREE_LAYOUT[def.id];
    const node = document.createElement("div");
    // 实验类节点：已购后天蓝色光；光学系列：粒子说=紫色、波动说=青色（两系列互斥）
    node.className = "tn-node" + (def.research ? " research-node" : "")
      + (def.series === "particle" ? " particle-node" : "")
      + (def.series === "wave" ? " wave-node" : "");
    node.style.left = pos.x + "px"; node.style.top = pos.y + "px";
    node.style.width = TREE_NODE_W + "px"; node.style.height = TREE_NODE_H + "px";
    const nm = document.createElement("div"); nm.className = "tn-name"; nm.textContent = def.name;
    const idl = document.createElement("div"); idl.className = "tn-id"; idl.textContent = "节点 " + def.id;
    const st = document.createElement("div"); st.className = "tn-state";
    node.append(nm, idl, st);
    if (!def.placeholder) node.addEventListener("click", (e) => { e.stopPropagation(); buyTheoryNode(def.id); updateCompactUI(); });
    world.appendChild(node);
    compactEls.nodes[def.id] = { node, st, nm };
  }
  setupTreePanZoom();
  treeResetView();
  compactBuilt = true;
}
// 理论树固定布局（世界坐标；节点 150×92，层间距 150）。
// 51 下方向左右分出光学两系列（粒子说左/紫色、波动说右/青色）
const TREE_LAYOUT = {
  "01": { x: 445, y: 70 },
  "11": { x: 185, y: 220 }, "12": { x: 705, y: 220 },
  "21": { x: 185, y: 370 }, "22": { x: 525, y: 370 }, "23": { x: 865, y: 370 },
  "31": { x: 185, y: 520 }, "32": { x: 695, y: 520 },
  "41": { x: 445, y: 670 },
  "51": { x: 445, y: 820 },
  "61": { x: 295, y: 970 }, "62": { x: 595, y: 970 },
  "71": { x: 295, y: 1120 }, "72": { x: 595, y: 1120 },
  "81": { x: 295, y: 1270 }, "82": { x: 595, y: 1270 },
};
const TREE_NODE_W = 150, TREE_NODE_H = 92;
const TREE_WORLD_W = 1100, TREE_WORLD_H = 1450;
let treeView = { x: 0, y: 0, z: 1 }; // 平移/缩放状态
function treeApplyView() {
  document.getElementById("tree-world").style.transform =
    `translate(${treeView.x}px, ${treeView.y}px) scale(${treeView.z})`;
}
// 初始/重置视图：自适应宽度并水平居中（手机上缩小到能看全整棵树）
function treeResetView() {
  const vp = document.getElementById("tree-viewport");
  const vw = vp.clientWidth || 700;
  const z = Math.max(0.3, Math.min(1, vw / TREE_WORLD_W));
  treeView = { x: (vw - TREE_WORLD_W * z) / 2, y: 8, z };
  treeApplyView();
}
// 围绕视口内某点缩放
function treeZoomAt(cx, cy, factor) {
  const nz = Math.max(0.3, Math.min(2.2, treeView.z * factor));
  const k = nz / treeView.z;
  treeView.x = cx - (cx - treeView.x) * k;
  treeView.y = cy - (cy - treeView.y) * k;
  treeView.z = nz;
  treeApplyView();
}
// 拖动平移（pointer 事件，兼容触屏）+ 滚轮/按钮缩放。
// 注意：pointerdown 时不能立刻 setPointerCapture——捕获会把后续指针事件重定向到视口，
// click 事件不再落在节点上，导致节点无法点击购买；改为拖动超过阈值后才抢占捕获
function setupTreePanZoom() {
  const vp = document.getElementById("tree-viewport");
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
  // 阻止浏览器原生行为抢拖动：mousedown 默认行为（新建选区/启动原生拖拽）取消——
  // 4px 阈值窗口内指针尚未捕获，此时按下可把页面上已有的文字选区启动为原生拖拽
  //（表现：拖出的不是树而是拖拽图标）。click 不受 mousedown 取消影响，节点购买正常。
  vp.addEventListener("mousedown", (e) => e.preventDefault());
  vp.addEventListener("dragstart", (e) => e.preventDefault()); // 兜底：杀掉一切视口内起源的原生拖拽
  vp.addEventListener("pointerdown", (e) => {
    dragging = false; sx = e.clientX; sy = e.clientY; ox = treeView.x; oy = treeView.y;
  });
  vp.addEventListener("pointermove", (e) => {
    if (e.buttons === 0) return; // 无按下的悬停移动
    if (!dragging) {
      // 拖动阈值 4px：未超过前不捕获，让 click 正常落到节点上
      if (Math.abs(e.clientX - sx) < 4 && Math.abs(e.clientY - sy) < 4) return;
      dragging = true;
      try { vp.setPointerCapture(e.pointerId); } catch {}
      vp.classList.add("grabbing");
    }
    treeView.x = ox + (e.clientX - sx);
    treeView.y = oy + (e.clientY - sy);
    treeApplyView();
  });
  const end = () => { dragging = false; vp.classList.remove("grabbing"); };
  vp.addEventListener("pointerup", end);
  vp.addEventListener("pointercancel", end);
  vp.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = vp.getBoundingClientRect();
    treeZoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.pow(1.0015, -e.deltaY));
  }, { passive: false });
  document.getElementById("tree-zoom-in").addEventListener("click", () => {
    const rect = vp.getBoundingClientRect();
    treeZoomAt(rect.width / 2, rect.height / 2, 1.25);
  });
  document.getElementById("tree-zoom-out").addEventListener("click", () => {
    const rect = vp.getBoundingClientRect();
    treeZoomAt(rect.width / 2, rect.height / 2, 0.8);
  });
  document.getElementById("tree-zoom-reset").addEventListener("click", treeResetView);
}
function updateCompactUI() {
  if (simActive) return;
  if (!state.testMode || state.compactions < 1) return;
  buildCompactOnce();
  // 里程碑（横条：编号 + 进度 + 奖励 + 状态）
  for (let i = 0; i < COMP_MILESTONES.length; i++) {
    const def = COMP_MILESTONES[i], el = compMsEls[i];
    if (!el) continue;
    const done = state.compactions >= def.n;
    el.cell.classList.toggle("done", done);
    el.statusEl.textContent = done ? "✓ 已完成" : `${Math.min(state.compactions, def.n)} / ${def.n}`;
  }
  // 维度折叠器：CM 值（显示 floor，后台小数）与产量
  document.getElementById("comp-cm-value").textContent = fmtIntRes(state.cm, getLogCM());
  const rateLog = cmRateLog();
  // 每秒获取写最终值：基础产量 × 折叠器时间乘数（节点 01 削弱加成）× 节点31 奇点加速（全部计入）
  const finalRateLog = rateLog <= NLOG + 1 ? NLOG : clampLog(rateLog + cmTimeMultLog() + cmSpAccelMultLog() + cmSpeedBonusLog());
  const rateTxt = finalRateLog <= NLOG + 1 ? "0" : fmtNum(Math.pow(10, Math.min(finalRateLog, 308)), finalRateLog);
  document.getElementById("comp-cm-rate").textContent = `每秒 +${rateTxt}`;
  const baseTxt = rateLog <= NLOG + 1 ? "0" : fmtNum(Math.pow(10, Math.min(rateLog, 308)), rateLog);
  // 公式区：贝蒂数与基础 CM 公式（基础产量；最终值见上方「每秒」行）
  document.getElementById("comp-betti-line").textContent =
    `b₁ = max(0, E−V+1) = ${betti1()}　　b₂ = max(0, min(F, ⌊2E/3⌋)−E+V) = ${betti2()}`;
  document.getElementById("comp-formula-line").textContent =
    `基础 CM 获取：TP² × 3^√(3·b₁·b₂) = ${baseTxt} / 秒`;
  // CM 三个效果（一个一行，简洁格式）
  document.getElementById("comp-dim-effect").textContent =
    `波速获取 ×${fmtLog(cmGainMultLog())}\n`
    + `波长公式内指数: ${wavelengthExp().toFixed(4)}\n`
    + `奇点获取 ×${fmtLog(cmSpMultLog())}`;
  // 拓扑节点（价格按总节点数计；点击一次买满可负担的最大数量）
  const tpInfo = tpMaxBuyInfo();
  const tpBuy = document.getElementById("comp-tp-buy");
  if (tpInfo.count > 0) {
    const tpCostTxt = tpInfo.costV !== null ? `${fmtInt(tpInfo.costV)} SS` : `${fmtLog(tpInfo.costLog)} SS`;
    tpBuy.textContent = `购买拓扑节点 ×${tpInfo.count}（花费 ${tpCostTxt}）`;
  } else {
    const tpNextV = tpNextCostValue();
    const tpNextLog = clampLog((tpTotal() + 1) * Math.log10(1.5));
    const tpNextTxt = tpNextV !== null ? `${fmtInt(tpNextV)} SS` : `${fmtLog(tpNextLog)} SS`;
    tpBuy.textContent = `购买拓扑节点（花费 ${tpNextTxt}）`;
  }
  tpBuy.disabled = tpInfo.count < 1;
  document.getElementById("comp-tp-line").textContent =
    `拓扑节点：${tpTotal()}（可用 ${state.tp} ｜ 点 ${state.tpV} · 边 ${state.tpE} · 面 ${state.tpF}）`;
  // 几何格子计数回填（此前从未刷新过，span 一直空白）与 A64 自动分配按钮显隐
  for (const key of ["V", "E", "F"]) {
    const g = compactEls.geo[key];
    if (g) g.cnt.textContent = state["tp" + key];
  }
  if (compactEls.autoBtn) compactEls.autoBtn.classList.toggle("hidden", !state.ach.normal.includes("A64"));
  // 灵感大框：总灵感（可用）+ 购买途径格子（R8 后三变四）
  document.getElementById("comp-ins-line").textContent =
    `总灵感：${fmtIntRound(state.totalIns, getLogTotalIns())}（可用 ${fmtIntRound(state.ins, getLogIns())}）`;
  const insCellsBox = document.getElementById("comp-ins-cells");
  if (insCellsBox) insCellsBox.classList.toggle("four", researchBought("R8")); // R8 后三等分 → 四等分
  const insHint = { F: "", Sp: "", SS: tpTotal() < 1 ? "（需先购买拓扑节点）" : "", VP: "" };
  for (const src of ["F", "Sp", "SS", "VP"]) {
    const el = compactEls.ins[src];
    if (!el) continue;
    if (src === "VP") {
      const vpUnlocked = researchBought("R8");
      el.btn.classList.toggle("hidden", !vpUnlocked);
      if (!vpUnlocked) continue;
    }
    const info = insMaxBuyInfo(src);
    // 可购时显示总价与「×N」；买不动时显示下一级价格（沿用旧显示）
    el.cost.textContent = (info.count > 0
      ? `${fmtLog(info.costLog)}（×${info.count}）`
      : fmtLog(insCostLogAt(src, state["insFrom" + src] + 1))) + insHint[src];
    el.btn.disabled = info.count < 1;
  }
  // 理论树工具：重置开关文案 + 预设按钮名
  const respecBtn = document.getElementById("theory-respec-btn");
  if (respecBtn) {
    respecBtn.textContent = state.theoryRespec ? "卷缩重置理论树：开" : "卷缩重置理论树：关";
    respecBtn.classList.toggle("compact-ready", state.theoryRespec);
  }
  if (compactEls.presets) {
    for (let i = 0; i < 6; i++) {
      const b = compactEls.presets[i];
      if (b && state.theoryPresets[i]) b.textContent = state.theoryPresets[i].name || ("PR" + (i + 1));
    }
  }
  // 理论树节点状态（框内写效果文本）；光学系列（层≥6）在节点51+理论深度达标前整体隐藏
  for (const def of THEORY_NODES) {
    const el = compactEls.nodes[def.id];
    if (!el) continue;
    const visible = theoryNodeVisible(def);
    el.node.classList.toggle("hidden", !visible);
    const line = (compactEls.lines || {})[def.id];
    if (line) line.setAttribute("visibility", visible ? "visible" : "hidden");
    if (!visible) continue;
    const owned = theoryOwned(def.id);
    // 深于当前理论深度的节点不隐藏：名字/效果/价格全部显示？？？（td 判定含 1e-9 容差）
    const tdGated = +def.id[0] > state.theoryDepth + 1e-9;
    el.nm.textContent = tdGated ? "？？？" : def.name;
    el.node.classList.toggle("bought", owned);
    el.node.classList.toggle("available", theoryAvailable(def));
    el.node.classList.toggle("locked", !owned && !theoryAvailable(def));
    let txt;
    let html = null; // 节点51 等带彩色描述的节点走 innerHTML（“理论”橙色、“研究”天蓝色）
    if (owned) {
      // 购买后：提示文字（描述）保持不变 + 显示当前效果，不显示公式
      const effectTxt = def.id === "01" ? "当前乘数 ×" + fmtLog(cmTimeMultLog()) : (def.effect ? def.effect() : "已解锁");
      if (def.descHtml) html = def.descHtml + "<br>" + effectTxt;
      else txt = def.desc + "\n" + effectTxt;
    } else if (tdGated) {
      // 理论深度不足：名字/效果/价格全？？？（编号仍可见）
      txt = "？？？\n？？？";
    } else if (def.placeholder) {
      // 占位节点：无论上级是否已购一律显示「未实装」（信息对玩家无价值）
      txt = "未实装\n（后续版本）";
    } else if (def.hiddenUntilIns && getLogTotalIns() < Math.log10(def.hiddenUntilIns)) {
      // 节点51：总灵感 <50 时一律显示 ？？？
      txt = "？？？\n？？？";
    } else {
      const reqTxt = def.reqIns ? "需求：" + (def.reqA63 ? "拥有 A63、" : "") + "总灵感 " + def.reqIns + "（不消耗）"
        : (def.priceTBD ? "价格待定（暂无法购买）" : "花费 " + def.cost + " 灵感");
      if (def.descHtml) html = def.descHtml + "<br>" + reqTxt;
      else txt = `${def.desc}\n${reqTxt}`;
    }
    if (html !== null) el.st.innerHTML = html;
    else el.st.textContent = txt;
  }
}
// ---------- 研究页 UI（v0.6.3，天蓝色主题；拥有节点51 解锁）----------
let researchBuilt = false, researchEls = {};
function getSelEntry(id) { return state.researchSel.find(x => x.id === id); }
function researchSelLevel(id) { const s = getSelEntry(id); return s ? s.level : 0; } // 0 = 未选择
function buildResearchOnce() {
  if (researchBuilt) return;
  const list = document.getElementById("research-list");
  list.innerHTML = "";
  researchEls.exps = {};
  for (const def of RESEARCH_EXPS) {
    const card = document.createElement("div");
    card.className = "research-exp-card";
    const nm = document.createElement("div"); nm.className = "research-exp-name"; nm.textContent = def.name;
    const sc = document.createElement("div"); sc.className = "research-exp-science"; sc.textContent = def.science;
    const db = document.createElement("div"); db.className = "research-exp-debuff";
    const lv = document.createElement("div"); lv.className = "research-exp-level";
    const dec = document.createElement("button"); dec.className = "comp-btn small"; dec.textContent = "−";
    const cnt = document.createElement("span"); cnt.className = "research-exp-cnt";
    const inc = document.createElement("button"); inc.className = "comp-btn small"; inc.textContent = "+";
    // 等级 0 = 未选择：− 到 0 移除条目，+ 从 0 新增等级 1（无独立的选择按钮）
    dec.addEventListener("click", () => {
      const s = getSelEntry(def.id);
      if (!s) return;
      if (s.level <= 1) state.researchSel.splice(state.researchSel.indexOf(s), 1);
      else s.level--;
      saveGame(); updateResearchUI();
    });
    inc.addEventListener("click", () => {
      const s = getSelEntry(def.id);
      if (!s) state.researchSel.push({ id: def.id, level: 1 });
      else if (s.level < 10) s.level++;
      else return;
      saveGame(); updateResearchUI();
    });
    lv.append(dec, cnt, inc);
    card.append(nm, sc, db, lv);
    list.appendChild(card);
    researchEls.exps[def.id] = { card, db, cnt };
  }
  const predict = document.getElementById("research-predict");
  predict.addEventListener("change", () => {
    const vLog = parseSciInputLog(predict.value);
    if (isNaN(vLog)) { // 拒绝无效输入：状态栏提示并恢复当前有效值
      setAutosaveStatus("预测总奇点格式无效");
      predict.value = state.researchPredictSpLog > NLOG + 1 ? fmtNum(Math.pow(10, Math.min(state.researchPredictSpLog, 308)), state.researchPredictSpLog) : "";
      return;
    }
    state.researchPredictSpLog = vLog; saveGame(); updateResearchUI();
  });
  document.getElementById("research-start-btn").addEventListener("click", () => {
    // 动作按钮双功能：实验中=结束（Sp 拐点上）/放弃，实验外=开始
    if (state.researchRun) {
      if (researchExitReady()) researchExit();
      else researchAbandon();
      return;
    }
    startResearch();
  });
  // 研究项目（R 系列）：待办最多显示 3 个（定义顺序）；已完成的进浮动框
  const projRow = document.getElementById("research-proj-row");
  projRow.innerHTML = "";
  researchEls.projs = {};
  for (const def of RESEARCH_DEFS) {
    const b = document.createElement("button");
    b.className = "research-proj-card";
    const nm = document.createElement("div"); nm.className = "rp-name"; nm.textContent = def.name;
    const ds = document.createElement("div"); ds.className = "rp-desc"; ds.textContent = def.desc;
    const ct = document.createElement("div"); ct.className = "rp-cost";
    b.append(nm, ds, ct);
    b.addEventListener("click", () => buyResearch(def.id));
    projRow.appendChild(b);
    researchEls.projs[def.id] = { btn: b, cost: ct };
  }
  document.getElementById("research-done-toggle").addEventListener("click", () => toggleResearchDone());
  // 课题（SR）：A72 解锁区块、R9 解锁第一个课题；SR1 点击切换投入
  const srRow = document.getElementById("research-sr-row");
  srRow.innerHTML = "";
  researchEls.sr = {};
  {
    const b = document.createElement("button");
    b.className = "research-proj-card";
    const nm = document.createElement("div"); nm.className = "rp-name"; nm.textContent = "晶格弛豫调制";
    const ds = document.createElement("div"); ds.className = "rp-desc"; ds.textContent = "推迟声子升级3的软上限（每级 0.1）";
    const lv = document.createElement("div"); lv.className = "rp-cost";
    const act = document.createElement("div"); act.className = "rp-act"; act.textContent = "开始研究";
    b.append(nm, ds, lv, act);
    b.addEventListener("click", toggleSR1);
    srRow.appendChild(b);
    researchEls.sr.SR1 = { btn: b, lv, act };
  }
  // 研究项目占位卡：待办不足 3 个时补满一行（标题下不留空）
  researchEls.placeholders = [];
  for (let i = 0; i < 3; i++) {
    const ph = document.createElement("div");
    ph.className = "research-proj-card hidden";
    ph.innerHTML = "？？？<br>（后续版本实装）";
    projRow.appendChild(ph);
    researchEls.placeholders.push(ph);
  }
  researchBuilt = true;
}
function updateResearchUI() {
  if (simActive) return;
  const accessible = theoryOwned("51");
  const subtab = document.getElementById("subtab-research");
  if (subtab) subtab.classList.toggle("hidden", !accessible);
  if (!accessible) return;
  buildResearchOnce();
  // 资源显示（主资源样式：大字号数值；ED 浅蓝、Inf 深蓝，各自一行居中；0-1 显 0）
  document.getElementById("research-ed").textContent = fmtIntRes(state.ed, getLogED());
  document.getElementById("research-inf").textContent = fmtIntRes(state.inf, getLogInf());
  const rateLog = infRateLog();
  document.getElementById("research-inf-rate").textContent = rateLog <= NLOG + 1
    ? "（每秒 +0）"
    : `（每秒 +${fmtNum(Math.pow(10, Math.min(rateLog, 308)), rateLog)}）`;
  document.getElementById("research-depth").textContent = fmt(theoryDepthEff());
  // 研究项目（R 系列）：A71 解锁；待办按定义顺序最多显示 3 个，已购的消失（进浮动框）
  const rUnlocked = state.ach.normal.includes("A71");
  const projWrap = document.getElementById("research-projects");
  if (projWrap) projWrap.classList.toggle("hidden", !rUnlocked);
  if (rUnlocked) {
    let shown = 0;
    for (const def of RESEARCH_DEFS) {
      const el = researchEls.projs && researchEls.projs[def.id];
      if (!el) continue;
      const visible = !researchBought(def.id) && shown < 3;
      el.btn.classList.toggle("hidden", !visible);
      if (!visible) continue;
      shown++;
      const reqOk = researchReqMet(def), costOk = researchCostMet(def);
      el.btn.disabled = !(reqOk && costOk);
      el.cost.textContent = researchReqText(def) + " ｜ 价格 "
        + fmtNum(def.costInf, Math.log10(def.costInf)) + " 推论" + (reqOk ? "" : "（需求未满足）");
    }
    // 占位卡补满一行（待办不足 3 个时）
    researchEls.placeholders.forEach((ph, i) => { if (ph) ph.classList.toggle("hidden", i < shown); });
  // 课题（SR）区块：购买 R9 后显示（A72「立论」为其成就）
  const subjectsSection = document.getElementById("research-subjects");
  if (subjectsSection) subjectsSection.classList.toggle("hidden", !researchBought("R9"));
    // SR1 课题卡：等级/当前软上限起点/投入状态（状态行独立更新，绝不覆盖卡片子元素）
    const srEl = researchEls.sr && researchEls.sr.SR1;
    if (srEl && researchBought("R9")) {
      const lv = sr1Level(), st = sr1SoftcapStart(), active = state.srActiveId === "SR1";
      srEl.lv.textContent = "等级 " + fmt(lv) + " ｜ 当前软上限起点 " + fmt(st);
      srEl.act.textContent = active ? "研究中（点击停止）" : "开始研究";
    }
    // 已完成研究列表展开时保持同步（购买后即时反映）
    const doneGrid = document.getElementById("research-done-grid");
    if (doneGrid && !doneGrid.classList.contains("hidden")) renderResearchDone();
  }
  // 实验卡片（实验中显示快照等级并锁定编辑）
  const run = state.researchRun;
  for (const def of RESEARCH_EXPS) {
    const el = researchEls.exps[def.id];
    if (!el) continue;
    const runEntry = run ? run.exps.find(x => x.id === def.id) : null;
    const n = run ? (runEntry ? runEntry.level : 0) : researchSelLevel(def.id);
    el.db.textContent = "削弱：" + def.debuff(n);
    el.cnt.textContent = n >= 1 ? "等级 " + n : "未选择";
    el.card.classList.toggle("selected", n >= 1);
    el.card.classList.toggle("running", !!run);
  }
  // 三乘数实时显示（实验外预测/附加为 0，只算难度分）；整数不带小数、非整数量级 <100 保留两位
  const m = researchMultipliers();
  const fM = (v) => !isFinite(v) ? "∞" : (v >= 100 ? fmt(v) : (Number.isInteger(v) ? String(v) : v.toFixed(2)));
  document.getElementById("research-mult-line").innerHTML =
    `<span class="research-num">${fM(m.difficulty)}</span>(难度)*<span class="research-num">${fM(m.pred)}</span>(预测)*<span class="research-num">${fM(m.bonus)}</span>(附加)=<span class="research-total">${m.total > 0 ? fmtNum(m.total, researchEDGainLog()) : "0"}</span>`;
  // 预测输入与动作按钮（实验中具备与顶栏替换按钮相同的结束/放弃功能）
  const predict = document.getElementById("research-predict");
  if (document.activeElement !== predict) {
    predict.value = run ? fmtLog(run.predictSpLog)
      : (state.researchPredictSpLog > NLOG + 1 ? fmtNum(Math.pow(10, Math.min(state.researchPredictSpLog, 308)), state.researchPredictSpLog) : "");
  }
  const startBtn = document.getElementById("research-start-btn");
  startBtn.classList.remove("research-exit", "research-abandon");
  if (run) {
    if (researchExitReady()) {
      startBtn.textContent = `结束实验（获得 ${researchExitDiffText()} 实验数据）`;
      startBtn.classList.add("research-exit");
    } else {
      startBtn.textContent = "放弃实验";
      startBtn.classList.add("research-abandon");
    }
  } else {
    startBtn.textContent = "开始实验";
  }
}

// 卷缩层可见性：主选项卡与全局栏超弦显示（首次卷缩后、且测试模式下）
function applyCompactVisibility() {
  if (simActive) return;
  const show = state.testMode && state.compactions >= 1;
  document.getElementById("tab-compact").classList.toggle("hidden", !show);
  document.getElementById("ss-display").classList.toggle("hidden", !show);
  if (!show && !document.getElementById("page-compact").classList.contains("hidden")) {
    switchTab("wave"); // 已不满足可见性（如退出测试模式）时退回波动页
  }
}
// 顶栏卷缩按钮（湮灭按钮下方，橙色，形式与湮灭按钮一致）
function updateCompactButton() {
  const btn = document.getElementById("compactify-btn");
  if (!btn) return;
  const show = state.testMode && state.ach.normal.includes("A55");
  btn.classList.toggle("hidden", !show);
  if (!show) return;
  // 研究实验进行中：顶栏按钮替换为结束/放弃实验（结束条件=Sp 拐点，XX 为可获得−当前 ED 的差）
  if (state.researchRun) {
    if (researchExitReady()) {
      btn.className = "annihilate-btn compactify-btn compact-ready research-ready";
      btn.disabled = false;
      btn.innerHTML = `结束实验<br>获得 ${researchExitDiffText()} 实验数据`;
    } else {
      btn.className = "annihilate-btn compactify-btn research-abandon";
      btn.disabled = false;
      btn.textContent = "放弃实验";
    }
    return;
  }
  btn.classList.remove("research-ready", "research-abandon");
  const ready = getLogVP() >= 36 && state.voidBestRules >= 8 && getLogSp() >= SP_SOFTCAP_PIVOT_LOG;
  if (!ready) {
    btn.classList.remove("compact-ready");
    btn.disabled = true;
    btn.textContent = "需要 1e36 VP、1.79e308 Sp、完成全扭曲虚空";
  } else if (state.compactions === 0) {
    // 首次卷缩：剧情文案（固定 1 SS）
    btn.classList.add("compact-ready");
    btn.disabled = false;
    btn.innerHTML = "你的波动已经足以撕开维度的裂隙<br>突破这个维度的极限";
  } else {
    // 后续卷缩：显示本次可获得的基础 SS（整数口径 + log 权威直读，超 1e308 不再封顶失真）
    btn.classList.add("compact-ready");
    btn.disabled = false;
    const gLog = compactSSGainIntLog();
    btn.textContent = `卷缩（+${gLog > NLOG + 1 ? fmtLog(gLog) : 0} SS）`;
  }
}

