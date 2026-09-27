// ---------- 快捷键（v0.5.0.3 QoL，所有玩家可用）----------
// ←/→ 大标签、↑/↓ 子标签、U 湮灭前升级全买、R 湮灭后升级全买、A 湮灭、L 升级3、C 卷缩、
// 按住 B+1/2/3 黑洞状态、Shift+1~8 进扭曲、Shift+A/T/L/M 自动化开关
let bhHotkeyArmed = false; // 按住 B 的武装状态（松开 B 或窗口失焦解除；按住时可连续切换 1/2/3）
function buyAllPreAnnihilation() {
  // 湮灭前升级：最大购买——循环买到底（升级间有依赖/价格联动，等级无变化即收敛）。
  // 注意不含升级 3（会重置波速与波长，属重置型购买，由快捷键 L 单独触发）
  for (let round = 0; round < 200; round++) {
    const before = [state.up1, state.up2, state.pg1, state.pg2, state.pg3, state.phFluct, state.phCoupling, state.phUnlocked, state.meta1].join(",");
    buyUp1(); buyUp2();
    buyPhUnlock(); buyPG1(); buyPG2(); buyPG3(); buyFluct(); buyCoupling();
    const after = [state.up1, state.up2, state.pg1, state.pg2, state.pg3, state.phFluct, state.phCoupling, state.phUnlocked, state.meta1].join(",");
    if (after === before) return;
  }
}
function buyAllPostAnnihilation() {
  // 湮灭后升级：最大购买（同款收敛判定）
  for (let round = 0; round < 200; round++) {
    const before = [state.sau1, state.sau2, state.sau3, state.sau4, state.sbu1, state.sbu2, state.sbu3, state.svpu1, state.svpu2, state.svpu3, Object.keys(state.au).length].join(",");
    buySAU("sau1"); buySAU("sau2"); buySAU("sau3"); buySAU("sau4");
    for (const grp of AU_DEFS) for (const u of grp) buyAU(u.id);
    if (bhUnlocked()) { buySBU("sbu1"); buySBU("sbu2"); buySBU("sbu3"); }
    for (const u of SVPU_DEFS) buySVPU(u.id);
    for (const u of VPU_DEFS) buyVPU(u.id);
    const after = [state.sau1, state.sau2, state.sau3, state.sau4, state.sbu1, state.sbu2, state.sbu3, state.svpu1, state.svpu2, state.svpu3, Object.keys(state.au).length].join(",");
    if (after === before) return;
  }
}
function visibleTabs() {
  return [...document.querySelectorAll("#tabs .tab")].filter(t => !t.classList.contains("hidden"));
}
function switchTabByOffset(offset) {
  const tabs = visibleTabs();
  const cur = tabs.findIndex(t => t.classList.contains("active"));
  const next = tabs[(cur + offset + tabs.length) % tabs.length];
  if (next) next.click();
}
function visibleSubtabs() {
  const page = [...document.querySelectorAll(".page")].find(p => !p.classList.contains("hidden"));
  if (!page) return [];
  return [...page.querySelectorAll(".subtab")].filter(t => !t.classList.contains("hidden"));
}
function switchSubtabByOffset(offset) {
  const subs = visibleSubtabs();
  const cur = subs.findIndex(t => t.classList.contains("active"));
  const next = subs[(cur + offset + subs.length) % subs.length];
  if (next) next.click();
}
function handleGameHotkey(e) {
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
  if (state.annihilations < 1) return; // 快捷键在首次湮灭后才可用
  if (e.repeat) return;
  const bhArmed = bhHotkeyArmed;
  const k = e.key;
  // 方向键：大标签/子标签
  if (k === "ArrowLeft") { switchTabByOffset(-1); return; }
  if (k === "ArrowRight") { switchTabByOffset(1); return; }
  if (k === "ArrowUp") { switchSubtabByOffset(-1); return; }
  if (k === "ArrowDown") { switchSubtabByOffset(1); return; }
  // 黑洞：按住 B + 1/2/3
  if (bhArmed && (k === "1" || k === "2" || k === "3")) {
    setBhState(k === "1" ? "accrete" : k === "2" ? "distorl" : "pulse");
    return;
  }
  if (e.shiftKey) {
    // Shift 系：自动化开关（须已解锁对应自动化）
    if (k === "A" || k === "a") {
      e.preventDefault(); // 防 Shift+浏览器快捷键抢占
      if (state.autoWaveUpg) { state.autoOn.wave = !state.autoOn.wave; updateAutomationUI(); setAutosaveStatus("主要页自动化：" + (state.autoOn.wave ? "开" : "关")); saveGame(); }
      if (state.autoPhononUpg) { state.autoOn.phonon = !state.autoOn.phonon; updateAutomationUI(); setAutosaveStatus("声子页自动化：" + (state.autoOn.phonon ? "开" : "关")); saveGame(); }
      return;
    }
    if (k === "T" || k === "t") {
      e.preventDefault();
      if (state.autoAnn) { state.autoOn.ann = !state.autoOn.ann; updateAutomationUI(); setAutosaveStatus("自动湮灭：" + (state.autoOn.ann ? "开" : "关")); saveGame(); }
      return;
    }
    if (k === "L" || k === "l") {
      e.preventDefault();
      if (state.autoUp3) { state.autoOn.up3 = !state.autoOn.up3; updateAutomationUI(); setAutosaveStatus("自动升级3：" + (state.autoOn.up3 ? "开" : "关")); saveGame(); }
      return;
    }
    if (k === "M" || k === "m") {
      e.preventDefault();
      if (state.ach.normal.includes("A34")) {
        state.batchMode.wave = !state.batchMode.wave;
        state.batchMode.phonon = !state.batchMode.phonon;
        updateAutomationUI(); saveGame();
        setAutosaveStatus("批量购买模式：" + (state.batchMode.wave ? "开" : "单次"));
      }
      return;
    }
    // Shift+1~8：进入对应扭曲宇宙。注意 Shift+数字的 e.key 是符号（"!"、"@"…），
    // 必须用 e.code（"Digit1"~"Digit8"）判定
    if (e.code && e.code.startsWith("Digit")) {
      const digit = parseInt(e.code.slice(5), 10);
      if (digit >= 1 && digit <= 8) {
        e.preventDefault();
        const u = DISTORT_UNIVERSES[digit - 1];
        if (u) enterDistort(u.id);
      }
      return;
    }
    return;
  }
  switch (k) {
    case "u": case "U":
      buyAllPreAnnihilation();
      renderWave(); updatePhononUI(); updateSpUI();
      break;
    case "r": case "R":
      buyAllPostAnnihilation();
      updateSpUI(); updateBlackholeUI();
      break;
    case "a": case "A":
      if (!bhArmed) document.getElementById("annihilate-btn").click();
      break;
    case "l": case "L":
      buyUp3();
      break;
    case "c": case "C": {
      // 卷缩：仅按钮可见（A55 + 测试开关）时触发，确认与条件判定由 compactify 自带
      const cBtn = document.getElementById("compactify-btn");
      if (cBtn && !cBtn.classList.contains("hidden")) cBtn.click();
      break;
    }
    case "b": case "B":
      bhHotkeyArmed = true; // 按住期间保持武装（keyup B 或窗口失焦解除），可连续按 1/2/3 顺滑切换
      break;
  }
}

// 测试模式 UI 同步（全局：危险操作区按钮显隐 + 顶栏版本显示）
// v0.5.1 内容已对全员开放：危险操作区保留「清零VF」「无Sp湮灭」工具，顶栏版本恒为 v0.5.1
// 测试模式：开发者预览开关——用于隔离尚未正式发布的开发中内容（如未来的新重置层）。
// 约定：开发中的内容用 if (state.testMode) 门控逻辑 + UI 显隐，正式发布时删除门控即可；
// 测试模式本身不给予任何已正式发布的内容
function applyTestModeUIGlobal() {
  const enterBtn = document.getElementById("enter-test-btn");
  const clearBtn = document.getElementById("clear-vf-btn");
  const clearVfCapBtn = document.getElementById("clear-vf-cap-btn");
  const clearVpBtn = document.getElementById("clear-vp-btn");
  const clearVoidBtn = document.getElementById("clear-void-btn");
  const clearVfBestBtn = document.getElementById("clear-vf-best-btn");
  const clearResearchBtn = document.getElementById("clear-research-btn");
  const clearInfBtn = document.getElementById("clear-inf-btn");
  const clearResearchBoughtBtn = document.getElementById("clear-research-bought-btn");
  const resetInsBtn = document.getElementById("reset-ins-btn");
  const resetTpCmBtn = document.getElementById("reset-tp-cm-btn");
  const clearCmBtn = document.getElementById("clear-cm-btn");
  const clearSsBtn = document.getElementById("clear-ss-btn");
  const forceAnnBtn = document.getElementById("force-ann-btn");
  const verEl = document.getElementById("version-label");
  if (enterBtn) {
    enterBtn.classList.remove("hidden");
    enterBtn.textContent = state.testMode ? "退出测试" : "进入测试";
  }
  if (clearBtn) clearBtn.classList.toggle("hidden", !state.testMode);
  if (clearVfCapBtn) clearVfCapBtn.classList.toggle("hidden", !state.testMode);
  if (clearVpBtn) clearVpBtn.classList.toggle("hidden", !state.testMode);
  if (clearVoidBtn) clearVoidBtn.classList.toggle("hidden", !state.testMode);
  if (clearVfBestBtn) clearVfBestBtn.classList.toggle("hidden", !state.testMode);
  if (clearResearchBtn) clearResearchBtn.classList.toggle("hidden", !state.testMode);
  if (clearInfBtn) clearInfBtn.classList.toggle("hidden", !state.testMode);
  if (clearResearchBoughtBtn) clearResearchBoughtBtn.classList.toggle("hidden", !state.testMode);
  if (resetInsBtn) resetInsBtn.classList.toggle("hidden", !state.testMode);
  if (resetTpCmBtn) resetTpCmBtn.classList.toggle("hidden", !state.testMode);
  if (clearCmBtn) clearCmBtn.classList.toggle("hidden", !state.testMode);
  if (clearSsBtn) clearSsBtn.classList.toggle("hidden", !state.testMode);
  if (forceAnnBtn) forceAnnBtn.classList.toggle("hidden", !state.testMode);
  const forceCompactBtn = document.getElementById("force-compact-btn");
  if (forceCompactBtn) forceCompactBtn.classList.toggle("hidden", !state.testMode);
  if (verEl) verEl.textContent = state.testMode
    ? "v0.6.3.2 The Research Update（测试）"
    : "v0.5.1 The Void Update";
}

