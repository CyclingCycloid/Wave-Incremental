; const assert = (cond, msg) => { if (!cond) { console.error("FAIL:", msg); process.exitCode = 1; } else console.log("ok:", msg); };
const PIVOT = Math.log10(1.79e308);
function refBuyUp1() {
  const c = up1Cost();
  if (cmpLT(F(), c, FLog(), up1CostLog())) return 0;
  if (!upgradesFree()) subULog(up1CostLog());
  markPurchase();
  state.up1++;
  return 1;
}
function refLoopUp1(maxN) { let b = 0; for (let i = 0; i < maxN; i++) { if (!refBuyUp1()) break; b++; } return b; }
// === 场景1：中等量级（恢复 U 后对照） ===
state = defaultState(); state.annihilations = 30; state.autoWaveUpg = 1;
state.up1 = 10; state.up2 = 5; state.meta1 = 1;
setULog(1e15); state.logU10 = 15; state.L = 1; state.logL10 = 0;
const savedU = state.logU10, savedUp1 = state.up1;
bulkBuyUp1(1e8);
const e1u = state.up1, e1U = state.logU10;
state.up1 = savedUp1; setULog(savedU); state.logU10 = savedU;
const n1 = refLoopUp1(1e8);
assert(state.up1 === e1u, "中等量级：等级一致 (" + state.up1 + " vs " + e1u + ")");
assert(Math.abs(state.logU10 - e1U) < 1e-6, "U 扣款一致");
assert(cmpLT(F(), up1Cost(), FLog(), up1CostLog()), "下一级不可负担");
// === 场景2：巨量 lg F = 1e6 ===
state = defaultState(); state.annihilations = 30; state.autoWaveUpg = 1;
state.up1 = 0; state.up2 = 0;
setULog(0); state.logU10 = 1e6; state.L = 1e-300; state.logL10 = -300;
const t0 = Date.now();
bulkBuyUp1(1e8);
const dt = Date.now() - t0;
assert(state.up1 > 1e5, "巨量买入 " + state.up1.toExponential(2) + " 级");
assert(dt < 200, "耗时 " + dt + "ms");
assert(cmpLT(F(), up1Cost(), FLog(), up1CostLog()), "巨量收敛");
console.log("  场景2: up1=" + state.up1.toExponential(2) + " 耗时 " + dt + "ms");
// === 场景3：up2 阶乘段 ===
state = defaultState(); state.annihilations = 30;
state.up2 = 150; state.up1 = 5000; setULog(0); state.logU10 = 500; state.L = 1; state.logL10 = 0;
bulkBuyUp2(1e8);
assert(state.up2 > 150, "up2 阶乘段批量: " + state.up2);
assert(cmpLT(F(), up2Cost(), FLog(), up2CostLog()), "up2 收敛：下一级不可负担（next=" + up2CostLog().toFixed(2) + " vs FLog=" + FLog().toFixed(2) + "）");
// === 场景3b：up2 指数段（少量）与逐级一致 ===
state = defaultState(); state.annihilations = 30;
state.up2 = 10; state.up1 = 100; setULog(1e12); state.logU10 = 12; state.L = 1; state.logL10 = 0;
bulkBuyUp2(1e8);
const e2u = state.up2;
state.up2 = 10; setULog(1e12); state.logU10 = 12;
let b2 = 0;
for (let i = 0; i < 1e8; i++) {
  const c = up2Cost();
  if (cmpLT(F(), c, FLog(), up2CostLog())) break;
  if (!upgradesFree()) subULog(up2CostLog());
  state.up2++; b2++;
}
assert(state.up2 === e2u, "up2 指数段：批量(" + e2u + ") 与逐级(" + state.up2 + ") 一致");
// === 场景4：spu1 免费 ===
state = defaultState(); state.annihilations = 30; state.spu1 = 1; state.autoWaveUpg = 1;
state.up1 = 0; setULog(1e6); state.logU10 = 6; state.L = 1; state.logL10 = 0;
bulkBuyUp1(1e8);
assert(state.up1 > 0 && state.U > 0, "spu1 免费：批量购买且不扣 U");
// === 场景5：狭窄限购 ===
state = defaultState(); state.annihilations = 30; state.autoWaveUpg = 1;
state.up1 = 0; setULog(1e6); state.logU10 = 6; state.L = 1; state.logL10 = 0; state.meta1 = 1;
state.distortActive = "narrow"; state.narrowPurchases = 3; state.annStartReal = gameNow();
bulkBuyUp1(1e8);
assert(state.up1 === 7 && state.narrowPurchases === 10, "狭窄限购：恰好买 7 级");
// === 场景6：pg3 上限 ===
state = defaultState(); state.annihilations = 30; state.phUnlocked = 1; state.phOn = true;
state.pg3 = 0; setPhononsLog(100);
state.distortDone = ["a","b","c","d","e","f","g","h"];
bulkBuyPG3(1e8);
assert(state.pg3 === Math.min(pg3Cap(), 97), "pg3 受上限约束: " + state.pg3 + " / cap " + pg3Cap());
// === 场景7：maxN=1 ===
state = defaultState(); state.annihilations = 30; state.autoWaveUpg = 1;
state.up1 = 0; setULog(1e6); state.logU10 = 6; state.L = 1; state.logL10 = 0; state.meta1 = 1;
bulkBuyUp1(1);
assert(state.up1 === 1, "maxN=1 只买 1 级");
// === 三处 inf ===
state = defaultState(); state.sau4 = 2000;
let t = totalEffectText("sau4").text;
assert(t.indexOf("inf") < 0 && t.indexOf("∞") < 0, "sau4: " + t);
state = defaultState(); state.sbu1 = 50; state.au = { vpu_vpu2: 1 }; state.virtualParticles = 1e100; state.logVP = 100;
t = totalEffectText("sbu1").text;
assert(t.indexOf("inf") < 0 && t.indexOf("∞") < 0, "sbu1: " + t);
state = defaultState(); state.svpu2 = 2000;
t = totalEffectText("svpu2").text;
assert(t.indexOf("inf") < 0 && t.indexOf("∞") < 0, "svpu2: " + t);
console.log("ALL DONE");
