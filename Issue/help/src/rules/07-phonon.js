// ---------- 声子系统 ----------
function buyPhUnlock() {
  if (annihilationFrozen()) return; // 冻结态禁购（只能湮灭）
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  if (state.phUnlocked) return;
  if (cmpLT(F(), costOf(PH_UNLOCK_COST), FLog(), costOfLog(LOG_PH_UNLOCK_COST))) return;
  if (!upgradesFree()) subULog(costOfLog(LOG_PH_UNLOCK_COST));
  markPurchase();
      state.phUnlocked = 1;
  applyPhononVisibility();
  updateUpgradesUI();
  updatePhononUI();
  setAutosaveStatus("已解锁：声子");
}

function togglePhononGen() {
  state.phOn = !state.phOn;
  // S7 请注意使用规范：10 秒内反复开关 20 次
  const now = Date.now();
  state.phToggles = state.phToggles.filter(t => now - t < 10000);
  state.phToggles.push(now);
  if (state.phToggles.length >= 20 && !state.ach.hidden.includes("S7")) {
    grantHidden("S7");
    state.phToggles = [];
    updateAchievementsUI();
  }
  updatePhononUI();
  setAutosaveStatus(state.phOn ? "声子发生器已启动" : "声子发生器已关闭");
}

// 声子升级价格（下一次购买）
function pg1Cost() { return costOf(1e10 * Math.pow(100, state.pg1)); }  // 花 F，增速 ×100
function pg2Cost() { return costOf(100 * Math.pow(2, state.pg2)); }     // 花 P，增速 ×2
function pg3Cost() { return costOf(1e4 * Math.pow(10, state.pg3)); }    // 花 P，增速 ×10
const FLUCT_COST = 1000;    // 声子涨落（P）
const COUPLING_COST = 1e6; // 声波耦合（P）
const LOG_FLUCT_COST = Math.log10(FLUCT_COST);
const LOG_COUPLING_COST = Math.log10(COUPLING_COST);

function buyPG1(bulk) {
  if (annihilationFrozen()) return; // 冻结态禁购（只能湮灭）
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  if (inDistort("adiabatic")) return; // 绝热宇宙：无法购买声子发生器效率
  const c = pg1Cost();
  if (cmpLT(F(), c, FLog(), pg1CostLog())) return; // 资源必须达标（前奇点升级免费只免扣款，不免门槛）
  if (!upgradesFree()) subULog(pg1CostLog());
  markPurchase();
      state.pg1++;
  if (!bulk) { saveGame(); renderWave(); updatePhononUI(); }
}
function buyPG2(bulk) {
  if (annihilationFrozen()) return; // 冻结态禁购（只能湮灭）
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  const c = pg2Cost();
  if (cmpLT(state.phonons, c, getLogPhonons(), pg2CostLog())) return;
  if (!upgradesFree()) subPhononsLog(pg2CostLog());
  markPurchase();
      state.pg2++;
  if (!bulk) { saveGame(); updatePhononUI(); }
}
function buyPG3(bulk) {
  if (annihilationFrozen()) return; // 冻结态禁购（只能湮灭）
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  if (state.pg3 >= pg3Cap()) return;
  if (inDistort("rigid") || inDistort("adiabatic") || inDistort("simple")) return; // 刚性/热寂/简洁：无法购买声子升级3
  const c = pg3Cost();
  if (cmpLT(state.phonons, c, getLogPhonons(), pg3CostLog())) return;
  if (!upgradesFree()) subPhononsLog(pg3CostLog());
  markPurchase();
      state.pg3++;
  if (!bulk) { saveGame(); updatePhononUI(); }
}
function buyFluct() {
  if (annihilationFrozen()) return; // 冻结态禁购（只能湮灭）
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  if (state.phFluct) return;
  if (cmpLT(state.phonons, costOf(FLUCT_COST), getLogPhonons(), costOfLog(LOG_FLUCT_COST))) return;
  if (!upgradesFree()) subPhononsLog(costOfLog(LOG_FLUCT_COST));
  markPurchase();
      state.phFluct = 1;
  updatePhononUI();
  setAutosaveStatus("已购买：声子涨落");
}
function buyCoupling() {
  if (annihilationFrozen()) return; // 冻结态禁购（只能湮灭）
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  if (state.phCoupling) return;
  if (cmpLT(state.phonons, costOf(COUPLING_COST), getLogPhonons(), costOfLog(LOG_COUPLING_COST))) return;
  if (!upgradesFree()) subPhononsLog(costOfLog(LOG_COUPLING_COST));
  markPurchase();
      state.phCoupling = 1;
  checkAchievements(); // A23 耦合
  updatePhononUI();
  setAutosaveStatus("已购买：声波耦合");
}

// ---------- 声子 UI (build-once, in-place update) ----------
let phBuilt = false, phRefs = {};
function buildPhononOnce() {
  if (phBuilt) return;
  const list = document.getElementById("ph-upg-list");
  const metaList = document.getElementById("ph-meta-list");
  list.innerHTML = ""; metaList.innerHTML = "";
  phRefs.pg1 = buildUpgradeCard({ name: "声子发生器效率", desc: "每次购买使发生间隔 ÷1.5", buyFn: buyPG1 });
  phRefs.pg2 = buildUpgradeCard({ name: "声子发生器倍率", desc: "第 n 级使产量 ×(n+1)²", buyFn: buyPG2 });
  phRefs.pg3 = buildUpgradeCard({ name: "升级3指数加成", desc: "每级使升级3的波长指数 +0.01（上限 20 级）", buyFn: buyPG3 });
  list.append(phRefs.pg1.root, phRefs.pg2.root, phRefs.pg3.root);
  phRefs.fluct = buildUpgradeCard({ name: "声子涨落", desc: "单次 · 温度加成声子获取", buyFn: buyFluct });
  phRefs.coupling = buildUpgradeCard({ name: "声波耦合", desc: "单次 · 波速加成声子获取", buyFn: buyCoupling });
  metaList.append(phRefs.fluct.root, phRefs.coupling.root);
  document.getElementById("ph-gen-btn").addEventListener("click", togglePhononGen);
  phBuilt = true;
}

// 声子页快变显示（资源行与热涨落）——由显示循环高频率刷新
function renderPhononFast() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  if (!state.phUnlocked) return;
  const T = temperature();
  // 显示必须用裁剪后的温度 log（temperatureCappedLog），传 raw 会在 T=Infinity 时
  // 显示未封顶的原始温度，看起来像温度超过了上限
  document.getElementById("ph-res-text").textContent =
    `你拥有${fmtIntRes(state.phonons, getLogPhonons())}声子，温度为${fmtNum(T, temperatureCappedLog())} K`;
  document.getElementById("ph-thermal").textContent =
    `热涨落把你的波速获取变为原来的${fmtNum(thermalMult(), thermalMultLog())}倍`;
  // 8DA 打破规则后：主宇宙普朗克温度为软上限，声子页显示红色提示行
  const noteEl = document.getElementById("ph-softcap-note");
  if (noteEl) {
    if (state.rulesBroken && !state.distortActive && temperatureLog() > effectiveCapLog()) {
      noteEl.classList.remove("hidden");
    } else {
      noteEl.classList.add("hidden");
    }
  }
}
function updatePhononUI() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  if (!state.phUnlocked) return;
  buildPhononOnce();
  renderPhononFast();
  document.getElementById("ph-gen-btn").textContent = state.phOn ? "关闭声子发生器" : "启动声子发生器";
  const f = F();
  const c1 = pg1Cost(), c2 = pg2Cost(), c3 = pg3Cost();
  phRefs.pg1.update({
    level: `等级 ${state.pg1}`,
    effect: `当前产量: ${fmtNum(phononRate(), phononRateLog())} 声子/s（游戏时间）`,
    cost: fmtNum(c1, pg1CostLog()) + " Hz",
    affordable: cmpGE(f, c1, FLog(), pg1CostLog()),
  });
  phRefs.pg2.update({
    level: `等级 ${state.pg2}`,
    effect: `当前倍率: ×${fmt(Math.pow(state.pg2 + 1 + pg2Free(), 2))}`,
    cost: fmtNum(c2, pg2CostLog()) + " P",
    affordable: cmpGE(state.phonons, c2, getLogPhonons(), pg2CostLog()),
  });
  phRefs.pg3.update({
    level: `等级 ${state.pg3} / ${pg3Cap()}`,
    effect: `升级3当前指数: ${up3Exp().toFixed(2)}`,
    cost: fmtNum(c3, pg3CostLog()) + " P",
    affordable: state.pg3 < pg3Cap() && cmpGE(state.phonons, c3, getLogPhonons(), pg3CostLog()),
  });
  const fOwn = state.phFluct >= 1, cOwn = state.phCoupling >= 1;
  phRefs.fluct.update({
    level: fOwn ? "已拥有" : "单次",
    effect: `当前温度加成: ×${fmtNum(fluctMult(), fluctMultLog())}`,
    cost: fmtNum(costOf(FLUCT_COST), costOfLog(LOG_FLUCT_COST)) + " P",
    affordable: fOwn || cmpGE(state.phonons, FLUCT_COST, getLogPhonons(), costOfLog(LOG_FLUCT_COST)),
    btnText: fOwn ? "已购买" : "购买",
  });
  phRefs.coupling.update({
    level: cOwn ? "已拥有" : "单次",
    effect: `当前波速加成: ×${fmtNum(couplingMult(), couplingMultLog())}`,
    cost: fmtNum(costOf(COUPLING_COST), costOfLog(LOG_COUPLING_COST)) + " P",
    affordable: cOwn || cmpGE(state.phonons, COUPLING_COST, getLogPhonons(), costOfLog(LOG_COUPLING_COST)),
    btnText: cOwn ? "已购买" : "购买",
  });
}

function applyPhononVisibility() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  document.getElementById("subtab-phonon").classList.toggle("hidden", !state.phUnlocked);
}

