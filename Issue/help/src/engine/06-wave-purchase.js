// ---------- Purchase ----------
function buyUp1(bulk) {
  if (annihilationFrozen()) return; // 冻结态禁购（只能湮灭）
  if (inDistort("simple")) return; // 简洁宇宙：波动升级1/2无效（不可购买）
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  const c = up1Cost();
  // 资源必须达标（前奇点升级免费只免扣款，不免门槛）；F/c 均 < LOG_FALLBACK 时走 double（零回归），饱和时退 log 域
  if (cmpLT(F(), c, FLog(), up1CostLog())) return;
  if (!upgradesFree()) subULog(up1CostLog());
  markPurchase();
  state.up1++;
  // bulk（自动化批量）：跳过逐次渲染与成就检查——tick 在 runAutomation 后统一执行
  if (!bulk) { checkAchievements(); renderWave(); }
}
function buyUp2(bulk) {
  if (annihilationFrozen()) return; // 冻结态禁购（只能湮灭）
  if (inDistort("simple")) return; // 简洁宇宙：波动升级1/2无效（不可购买）
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  // 边界防卡死：up2 是「×倍率」型，up1=0 时获取速率为 0——免费未生效时（15 次湮灭前，或滞涨宇宙中）
  // 要求至少一级升级1（A53 免费等级计入）
  if (getUp1Eff() < 1 && !upgradesFree()) return;
  const c = up2Cost();
  if (cmpLT(F(), c, FLog(), up2CostLog())) return; // 资源必须达标（前奇点升级免费只免扣款，不免门槛）
  if (!upgradesFree()) subULog(up2CostLog());
  markPurchase();
  state.up2++;
  if (!bulk) { checkAchievements(); renderWave(); }
}
function buyUp3() {
  if (annihilationFrozen()) return; // 冻结态禁购（只能湮灭）
  if (inDistort("rigid")) return; // 刚性宇宙：升级 3 无效
  if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
  // 仅当当前频率超过上次记录的峰值时才更新（log 域比较，超 double 不截断；不再用 Infinity 哨兵）
  const fLog = FLog();
  const lastLog = getLogUp3LastF();
  if (fLog <= lastLog) return;
  // e100 软上限 + 防下溢：log 域算波长缩减量与新 L
  const wLog = up3WavelengthFromFLog(fLog);
  // S8 无用功：加成小于 1.1 倍时购买（log 域：旧L × 缩减 < 1.1）
  if (getLogL10() + wLog < Math.log10(1.1)) grantHidden("S8");
  setUp3LastF(fLog); // 权威 log（替代旧版 Infinity 哨兵）
  state.logL10 = -wLog;
  state.L = wLog < 308 ? 1 / Math.pow(10, wLog) : 0; // 超 double 下溢为 0（读取走 log）
  if (-wLog < getLogMinL()) { state.logMinL = -wLog; state.minL = state.L; } // 极值走 log（新波长 log 为 -wLog）
  // R6「态矢量相干保持」：缩短波长不再重置任何东西（波速、升级1/2 全部保留）
  if (!researchBought("R6")) {
    setU(resetU());
    // 卷缩里程碑 20：升级3不再重置升级1的等级
    if (!compMilestone(20)) state.up1 = 0;
    if (!auOwned("au23")) state.up2 = 0; // AU23 声纹记忆：购买升级3不再重置升级2
  }
  markPurchase();
  state.up3++;
  checkAchievements();
  renderWave();
  return true; // 成功购买（时间模式自动化用）
}

// ---------- Upgrades rendering (build-once, in-place update) ----------
// 为避免每 tick 重建 DOM 导致按钮闪烁/点击丢失，卡片只在首次构建，
// 之后仅原地更新文本与 class。
let up1Card, up2Card, up3Card = null, metaRefs, unlockRefs;
let upgradesBuilt = false, metaBuilt = false;

function buildUpgradeCard({ name, desc, buyFn }) {
  const card = document.createElement("div");
  card.className = "upgrade-card";
  const left = document.createElement("div"); left.className = "up-card-left";
  const nm = document.createElement("div"); nm.className = "up-name"; nm.textContent = name;
  const d = document.createElement("div"); d.className = "up-desc"; d.textContent = desc;
  const lv = document.createElement("div"); lv.className = "up-level";
  const ef = document.createElement("div"); ef.className = "up-effect";
  left.append(nm, d, lv, ef);
  const right = document.createElement("div"); right.className = "up-card-right";
  const cl = document.createElement("div"); cl.className = "up-cost-label"; cl.textContent = "价格";
  const co = document.createElement("div"); co.className = "up-cost";
  const btn = document.createElement("button"); btn.className = "up-buy"; btn.textContent = "购买";
  if (buyFn) btn.addEventListener("click", buyFn);
  right.append(cl, co, btn);
  card.append(left, right);
  return { root: card, levelEl: lv, effectEl: ef, costEl: co, btn,
    update({ level, effect, cost, affordable, btnText }) {
      this.levelEl.textContent = level;
      this.effectEl.textContent = effect;
      this.costEl.textContent = cost;
      this.root.classList.toggle("affordable", !!affordable);
      this.btn.disabled = !affordable;
      if (btnText !== undefined) this.btn.textContent = btnText;
    } };
}

function buildUpgradesOnce() {
  if (upgradesBuilt) return;
  const list = document.getElementById("upgrades-list");
  list.innerHTML = "";
  up1Card = buildUpgradeCard({ name: "增加基础波速获取", desc: "每次购买为基础获取速率 +1", buyFn: buyUp1 });
  up2Card = buildUpgradeCard({ name: "加成波速获取", desc: "每次购买使获取速率 ×2", buyFn: buyUp2 });
  list.append(up1Card.root, up2Card.root);
  up3Card = null;
  upgradesBuilt = true;
}

function buildMetaOnce() {
  if (metaBuilt) return;
  const list = document.getElementById("meta-upgrades-list");
  list.innerHTML = "";
  const card = document.createElement("div");
  card.className = "upgrade-card locked";
  const left = document.createElement("div"); left.className = "up-card-left";
  const nm = document.createElement("div"); nm.className = "up-name"; nm.textContent = "频率加成波速获取";
  const d = document.createElement("div"); d.className = "up-desc"; d.textContent = "单次升级 · 按当前频率加成波速获取";
  const ef = document.createElement("div"); ef.className = "up-effect";
  left.append(nm, d, ef);
  const right = document.createElement("div"); right.className = "up-card-right";
  const cl = document.createElement("div"); cl.className = "up-cost-label"; cl.textContent = "价格";
  const co = document.createElement("div"); co.className = "up-cost";
  const btn = document.createElement("button"); btn.className = "up-buy"; btn.textContent = "购买";
  // 按钮永不 disable：价格充足时购买；价格不足时计入 S3（5 秒 10 次）。
  btn.addEventListener("click", () => {
    if (state.meta1 >= 1) return; // 已拥有
    if (narrowBlocked()) return; // 狭窄宇宙：总共只能购买十次升级
    const f = F();
    if (cmpGE(f, costOf(META_COST), FLog(), costOfLog(LOG_META_COST))) {
      // 价格充足（或奇点升级免费）：消耗并拥有
      if (!upgradesFree()) subULog(costOfLog(LOG_META_COST));
      markPurchase();
      state.meta1 = 1;
      checkAchievements(); // 触发 A12 协同
      updateUpgradesUI();
      updateAchievementsUI();
      setAutosaveStatus("已购买：频率加成波速获取");
      return;
    }
    // 价格不足：计入 S3
    const now = Date.now();
    state.metaClicks = state.metaClicks.filter(t => now - t < 5000);
    state.metaClicks.push(now);
    if (state.metaClicks.length >= 10 && !state.ach.hidden.includes("S3")) {
      grantHidden("S3");
      state.metaClicks = [];
      updateAchievementsUI();
    }
    setAutosaveStatus("价格不足，需要 " + fmt(costOf(META_COST)) + " Hz");
  });
  right.append(cl, co, btn);
  card.append(left, right);
  list.appendChild(card);
  metaRefs = { root: card, effectEl: ef, costEl: co, btn };
  // 解锁声子卡（单次，1e10 Hz）
  const ucard = document.createElement("div");
  ucard.className = "upgrade-card locked";
  const uleft = document.createElement("div"); uleft.className = "up-card-left";
  const unm = document.createElement("div"); unm.className = "up-name"; unm.textContent = "解锁声子";
  const ud = document.createElement("div"); ud.className = "up-desc"; ud.textContent = "单次升级 · 解锁波动标签下的「声子」子页面";
  const uef = document.createElement("div"); uef.className = "up-effect";
  uleft.append(unm, ud, uef);
  const uright = document.createElement("div"); uright.className = "up-card-right";
  const ucl = document.createElement("div"); ucl.className = "up-cost-label"; ucl.textContent = "价格";
  const uco = document.createElement("div"); uco.className = "up-cost";
  const ubtn = document.createElement("button"); ubtn.className = "up-buy"; ubtn.textContent = "购买";
  ubtn.addEventListener("click", buyPhUnlock);
  uright.append(ucl, uco, ubtn);
  ucard.append(uleft, uright);
  list.appendChild(ucard);
  unlockRefs = { root: ucard, effectEl: uef, costEl: uco, btn: ubtn };
  metaBuilt = true;
}

function updateUpgradesUI() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  buildUpgradesOnce();
  // 升级3 随可见性增删（仅切换时操作 DOM，非每 tick）
  const vis = up3Visible();
  if (vis && !up3Card) {
    up3Card = buildUpgradeCard({ name: "缩短波长，但重置波速", desc: "重置波速与基础/加成升级；按峰值频率更新波长", buyFn: buyUp3 });
    up3Card.nameEl = up3Card.root.querySelector(".up-name");
    up3Card.descEl = up3Card.root.querySelector(".up-desc");
    document.getElementById("upgrades-list").appendChild(up3Card.root);
  } else if (!vis && up3Card) {
    up3Card.root.remove();
    up3Card = null;
  }
  const f = F();
  const fLog = FLog();
  up1Card.update({
    level: `等级 ${state.up1}` + (up1FreeLevel() ? ` + ${up1FreeLevel()} 免费` : ""),
    effect: `当前获取速率: ${fmtNum(gainRate() * timeRate(), gainRateDispLog(timeRateLog()))} m/s²`,
    cost: fmtNum(up1Cost(), up1CostLog()) + " Hz",
    affordable: cmpGE(f, up1Cost(), FLog(), up1CostLog()),
  });
    const up2MultLog = state.up2 * Math.log10(up2Base());
    const up2Mult = up2MultLog > 308 ? Infinity : Math.pow(10, up2MultLog);
    // 与 buyUp2 同门槛：免费未生效时（15 次湮灭前或滞涨）至少需要一级升级1（免费等级计入）
    const up2Allowed = getUp1Eff() >= 1 || upgradesFree();
    up2Card.update({
      level: `等级 ${state.up2}`,
      effect: `当前倍率: ×${fmtNum(up2Mult, up2MultLog)}`,
      cost: fmtNum(up2Cost(), up2CostLog()) + " Hz",
      affordable: up2Allowed && cmpGE(f, up2Cost(), FLog(), up2CostLog()),
  });
  if (up3Card) {
    const lastLog = getLogUp3LastF();
    const affordable3 = FLog() > lastLog;
    const wLog2 = up3WavelengthFromFLog(FLog());
    const multLog = getLogL10() + wLog2;
    // R6「态矢量相干保持」：卡片名称/描述随研究动态切换
    const r6 = researchBought("R6");
    up3Card.nameEl.textContent = r6 ? "缩短波长" : "缩短波长，但重置波速";
    up3Card.descEl.textContent = r6 ? "按峰值频率更新波长（不再重置任何东西）" : "重置波速与基础/加成升级；按峰值频率更新波长";
    up3Card.update({
      level: `上次峰值: ${lastLog > NLOG + 1 ? fmtLog(lastLog) + " Hz" : "—"}`,
      effect: affordable3
        ? `下次${r6 ? "缩减" : "重置"}: ×${fmtNum(Math.pow(10, multLog), multLog)}`
        : `当前波长: ${fmtNum(Math.pow(10, getLogL10()), getLogL10())} m`,
      cost: lastLog > NLOG + 1 ? `需 F > ${fmtLog(lastLog)}` : "首次",
      affordable: affordable3,
    });
  }
  buildMetaOnce();
  const eff = 1 + (fLog > 0 ? fLog : Math.log10(Math.pow(10, fLog) + 1)); // meta1 效果因子，防 F=Infinity 污染
  const owned = state.meta1 >= 1;
  const affordable = owned || cmpGE(f, costOf(META_COST), FLog(), costOfLog(LOG_META_COST));
  metaRefs.root.className = "upgrade-card" + (affordable ? " affordable" : " locked");
  metaRefs.effectEl.textContent = `当前预期效果: ×${fmt(eff)}`;
  metaRefs.costEl.textContent = fmtNum(costOf(META_COST), costOfLog(LOG_META_COST)) + " Hz";
  metaRefs.btn.textContent = owned ? "已购买" : "购买";
  // 解锁声子卡
  const uOwned = state.phUnlocked >= 1;
  const uAff = uOwned || cmpGE(f, costOf(PH_UNLOCK_COST), FLog(), costOfLog(LOG_PH_UNLOCK_COST));
  unlockRefs.root.className = "upgrade-card" + (uAff ? " affordable" : " locked");
  unlockRefs.effectEl.textContent = uOwned ? "声子页面已解锁" : "解锁后可启动声子发生器";
  unlockRefs.costEl.textContent = fmtNum(costOf(PH_UNLOCK_COST), costOfLog(LOG_PH_UNLOCK_COST)) + " Hz";
  unlockRefs.btn.textContent = uOwned ? "已购买" : "购买";
  unlockRefs.btn.disabled = !uAff;
}

