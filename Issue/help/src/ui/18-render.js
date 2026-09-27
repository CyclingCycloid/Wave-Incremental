// ---------- Rendering ----------
// 快变显示：全局资源栏（频率/获取/冷却k/软上限提示）——由显示循环按高频率刷新
// 显示插值：记录逻辑结算时刻的 U 与增速，显示层用真实时间外推，消除 100ms 阶跃感
let dispUAt = 0, dispUBase = 0, dispGRate = 0, dispUBaseLog = NLOG;
function updateDispAnchor() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  dispUAt = Date.now();
  dispUBase = state.U;
  dispUBaseLog = getLogU10();
  // 冻结态外推归零：否则旧速率每帧外推、tick 又拉回，数值循环锯齿跳动
  // 定向宇宙：获取每刻随机取反且 U 有 0 硬下限，外推会失真——不做外推
  dispGRate = annihilationFrozen() ? 0 : (inDistort("directed") ? 0 : gainRate() * timeRate());
}
// 显示外推 U：double 在范围内走原路径；超范围（dispGRate 或 U 饱和）退 log 域外推
function extrapolatedU() {
  const dt = (Date.now() - dispUAt) / 1000;
  if (dt < 0 || dt > 1) return state.U;
  if (isFinite(dispGRate) && isFinite(dispUBase) && Math.abs(dispUBase) < LOG_FALLBACK && Math.abs(dispGRate) < LOG_FALLBACK) {
    const v = dispUBase + dispGRate * dt;
    // 定向宇宙：显示层同样遵守 0 硬下限
    if (inDistort("directed") && v < 0) return 0;
    return v;
  }
  // log 域外推：U ≈ U + (g·timeRate)·dt。log10(|g·dt|) = gainRateLog + log10(timeRate) + log10(dt)。
  // timeRate 超 double 时 Math.log10(timeRate())=Infinity——必须走 timeRateLog（log 域权威）
  const gr = gainRateLog();
  const trLogD = timeRateLog();
  const gdLog = gr.log + trLogD + Math.log10(Math.max(dt, 1e-300));
  if (inDistort("directed") && gr.sign < 0) return state.U; // 定向负向不外推（硬下限 0）
  return logAddLogs(dispUBaseLog, gdLog) <= NLOG + 1 ? state.U : Infinity;
}
// 外推 U 的 log10（显示用，保证 F/U 在 >1e308 时仍可得正确 log）
function extrapolatedULog() {
  const dt = (Date.now() - dispUAt) / 1000;
  if (dt < 0 || dt > 1) return getLogU10();
  if (isFinite(dispGRate) && isFinite(dispUBase) && Math.abs(dispUBase) < LOG_FALLBACK && Math.abs(dispGRate) < LOG_FALLBACK) {
    const v = dispUBase + dispGRate * dt;
    if (v <= 0) return inDistort("directed") ? NLOG : clampLog(Math.log10(Math.max(v, 1e-300)));
    return clampLog(Math.log10(v));
  }
  const gr = gainRateLog();
  if (inDistort("directed") && gr.sign < 0) return getLogU10(); // 定向负向不外推
  const trLogD = timeRateLog();
  const gdLog = gr.log + trLogD + Math.log10(Math.max(dt, 1e-300));
  return logAddLogs(dispUBaseLog, gdLog);
}
function renderFast() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  // 膨胀宇宙下 distortLMod 可能超 double：借用 F() 的 log 域逻辑（此处用外推 U）
  let f, fLog;
  const ml3 = distortLModLog();
  // 哨兵感知：U=0（零哨兵 NLOG）时 F 无意义，fLog 保持 NLOG（显示为 0）——
  // 直接相减会产生 NLOG-logL10 哨兵噪声，被显示层渲染成 e-9999999xx
  const uLogD = extrapolatedULog();
  const wExp = wavelengthExp();
  if (uLogD <= NLOG + 1) {
    fLog = NLOG;
    f = 0;
  } else if (ml3 > 0 || wExp !== 1) {
    // 卷缩后波长带指数（F = U/L^e）或膨胀宇宙：一律走 log 域
    fLog = clampLog(uLogD - wExp * (getLogL10() + ml3));
    f = fLog > 308 ? Infinity : (fLog < -308 ? 0 : Math.pow(10, fLog));
  } else {
    fLog = clampLog(uLogD - getLogL10());
    f = (isFinite(extrapolatedU()) && state.L > 0) ? extrapolatedU() / state.L : Math.pow(10, fLog);
  }
  // 冻结态（10 次湮灭前就绪）：频率显示 Annihilated、增益 +0（生产与外推已停）
  if (annihilationFrozen()) {
    document.getElementById("freq-value").textContent = "Annihilated";
    document.getElementById("freq-gain").textContent = "+0 Hz/s";
  } else {
    // F 显示：超 double 走 fmtLog（1eN），否则 fmt（现状）
    document.getElementById("freq-value").textContent = fmtNum(f, fLog);
    // Hz/s 显示：膨胀宇宙需除以含倍率的有效波长（log 域防溢出）
    {
      const grD = gainRateLog(); // 单次调用：符号与数值同源（定向宇宙符号为确定性时间窗）
      // Hz/s = gain/L^e（e 为卷缩波长指数，e=1 时与原式一致；膨胀宇宙的波长倍率计入）
      const gLog = grD.log <= NLOG + 1
        ? NLOG
        : gainPerLLog(grD.log + timeRateLog());
      const gainHz = gLog > 308 ? Infinity : (gLog < -308 ? 0 : Math.pow(10, gLog));
      // 定向宇宙负增益必须带 "-"（历史上只输出了 "+"，负值显示成无符号正值）
      document.getElementById("freq-gain").textContent =
        (gLog > NLOG + 1 ? (grD.sign > 0 ? "+" : "-") : "") + fmtNum(gainHz, gLog) + " Hz/s";
    }
  }
  // 冷却宇宙：实时显示当前指数 k
  const cdEl = document.getElementById("cooldown-display");
  if (inDistort("cooldown")) {
    cdEl.classList.remove("hidden");
    cdEl.textContent = "当前指数 k = " + cooldownExp().toFixed(2);
  } else {
    cdEl.classList.add("hidden");
  }
  // 挑战状态行（顶栏按钮下方）：主要游戏 / 扭曲宇宙（当前/目标温度）/ 虚空
  {
    const csEl = document.getElementById("challenge-status");
    if (state.voidActive) {
      csEl.textContent = "你现在处于虚空中";
    } else if (state.distortActive) {
      const u = DISTORT_UNIVERSES.find(x => x.id === state.distortActive);
      if (u) {
        const tLog = temperatureCappedLog();
        const tTxt = tLog > NLOG + 1 ? fmtNum(Math.pow(10, Math.min(tLog, 308)), tLog) : "0";
        const tpLog = Math.log10(u.tp);
        csEl.textContent = `你现在处于${u.name}宇宙中（${tTxt}/${fmtNum(u.tp, tpLog)} K）`;
      } else {
        csEl.textContent = "你现在处于主要游戏中（没有激活的挑战）";
      }
    } else {
      csEl.textContent = "你现在处于主要游戏中（没有激活的挑战）";
    }
  }
  // 当前游戏速率（奇点下方）
  const trEl = document.getElementById("timerate-display");
  if (state.annihilations >= 1) {
    trEl.classList.remove("hidden");
    trEl.textContent = "当前游戏速率：×" + fmtNum(timeRate(), timeRateLog());
  } else {
    trEl.classList.add("hidden");
  }
  // 超弦显示（卷缩层：首次卷缩后、测试模式下；显隐由 applyCompactVisibility 管理）
  if (state.testMode && state.compactions >= 1) {
    document.getElementById("ss-value").textContent = fmtIntRound(state.ss, getLogSS());
  }
  // 狭窄宇宙：剩余购买次数
  const nwEl = document.getElementById("narrow-display");
  if (inDistort("narrow")) {
    nwEl.classList.remove("hidden");
    nwEl.textContent = "剩余购买次数：" + Math.max(0, 10 - state.narrowPurchases);
  } else {
    nwEl.classList.add("hidden");
  }
  // e100 软上限提示 / 滞涨宇宙提示（同一位置）
  const scNote = document.getElementById("softcap-note");
  if (inDistort("inflation")) {
    scNote.classList.remove("hidden");
    scNote.textContent = "你处于滞涨宇宙，将始终遭受更强的折算";
  } else {
    scNote.classList.toggle("hidden", !softcapped());
    scNote.textContent = "当频率超过 1e100 Hz 时，升级的价格和效果将被软上限";
  }
  // U 显示：超 double 走 fmtLog（外推 U 的 log 权威）
  document.getElementById("u-value").textContent = fmtNum(Math.abs(extrapolatedU()), extrapolatedULog());
  // 波长显示：超 double（logL10 < -308）走 fmtLog（1eN 带尾数）；膨胀宇宙用 log 域（倍率可能超 double）
  const ml2 = distortLModLog();
  document.getElementById("l-value").textContent = ml2 > 0
    ? fmtLog(getLogL10() + ml2)
    : fmtNum(Math.pow(10, getLogL10()), getLogL10());
}
function renderWave() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  renderFast();
  updateUpgradesUI();
}

function renderStats() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  // 游戏时间超 double 时（playTime=MAX_VALUE）走 playTimeLog 的 log 域显示
  document.getElementById("stat-playtime").textContent = fmtTimeLog(state.playTime, state.playTimeLog);
  document.getElementById("stat-realtime").textContent = fmtTime(state.realTime);
  document.getElementById("stat-total").textContent = fmtNum(state.totalFGained, getLogTotalF()) + " Hz";
  document.getElementById("stat-maxf").textContent = fmtNum(state.maxF, getLogMaxF()) + " Hz";
  document.getElementById("stat-maxu").textContent = fmtNum(state.maxU, getLogMaxU()) + " m/s";
  document.getElementById("stat-minl").textContent = fmtNum(state.minL, getLogMinL()) + " m";
  document.getElementById("stat-ach-n").textContent = `${state.ach.normal.length} / ${NORMAL_ACH.length}`;
  document.getElementById("stat-ach-h").textContent = `${state.ach.hidden.length} / ${HIDDEN_ACH.length}`;
  document.getElementById("stat-timerate").textContent = "×" + fmtNum(timeRate(), timeRateLog());
  // 湮灭统计
  const annReal = state.annihilations >= 1 ? (Date.now() - state.annStartReal) / 1000 : 0;
  const annGame = state.annihilations >= 1 ? (state.annGameElapsed || (state.playTime - state.annStartGame)) : 0;
  // 游戏侧时长超 double 时（annGameElapsed=MAX_VALUE）走 annGameElapsedLog 显示
  document.getElementById("stat-ann-time").textContent =
    state.annihilations >= 1 ? `${fmtTime(annReal, true)} / ${fmtTimeLog(annGame, state.annGameElapsedLog)}` : "— / —";
  document.getElementById("stat-ann-total-sp").textContent = fmtNum(state.totalSp, getLogTotalSp());
  // bestSp/bestRate 都走 log 权威显示（超 double 的值 fmtNum 双参会失效）：double 缓存
  // 仅在 log 权威无有效值时作参考；double 缓存为 Infinity（旧档污染）时显示拐点口径
  const bestSpLog = (state.annBestSpLog !== undefined && typeof state.annBestSpLog === "number" && isFinite(state.annBestSpLog) && state.annBestSpLog > NLOG + 1)
    ? state.annBestSpLog : ((state.annBestSp > 0 && isFinite(state.annBestSp)) ? Math.log10(state.annBestSp) : NLOG);
  const bestRateLog = (state.annBestRateLog !== undefined && typeof state.annBestRateLog === "number" && isFinite(state.annBestRateLog) && state.annBestRateLog > NLOG + 1)
    ? state.annBestRateLog : ((state.annBestRate > 0 && isFinite(state.annBestRate)) ? Math.log10(state.annBestRate) : NLOG);
  const bestSpText = (bestSpLog > NLOG + 1) ? fmtLog(bestSpLog) : ((state.annBestSp > 0 && isFinite(state.annBestSp)) ? fmt(state.annBestSp) : "0");
  const bestRateText = (bestRateLog > NLOG + 1) ? fmtLog(bestRateLog) : ((state.annBestRate > 0 && isFinite(state.annBestRate)) ? fmt(state.annBestRate) : "0");
  document.getElementById("stat-ann-best-sp").textContent = bestSpText + " Sp";
  document.getElementById("stat-ann-best-rate").textContent = bestRateText + " Sp/分";
  document.getElementById("stat-ann-fastest").textContent = state.annFastest > 0 ? fmtTime(state.annFastest) : "—";
  document.getElementById("stat-ann-count").textContent = fmt(effAnnihilations());
  document.getElementById("stat-ann-tp").textContent = fmtNum(Math.pow(10, Math.min(effectiveCapLog(), 308)), effectiveCapLog()) + " K";
  document.getElementById("stat-ann-distort").textContent = `${state.distortDone.length} / ${DISTORT_UNIVERSES.length}`;
  // 卷缩统计（v0.6.0.0 测试，独立分组；不随卷缩重置——统计-通用/挑战之外的新组）
  const compGroup = document.getElementById("stat-comp-area");
  if (compGroup) {
    compGroup.classList.toggle("hidden", !(state.testMode && state.compactions >= 1));
    if (state.testMode && state.compactions >= 1) {
      const compReal = state.compStartReal > 0 ? (Date.now() - state.compStartReal) / 1000 : 0;
      document.getElementById("stat-comp-time").textContent =
        `${fmtTime(compReal, true)} / ${fmtTimeLog(state.compGameElapsed, state.compGameElapsedLog)}`;
      document.getElementById("stat-total-ss").textContent = fmtNum(state.totalSS, getLogTotalSS()) + " SS";
      document.getElementById("stat-compactions").textContent = fmt(state.compactions);
      document.getElementById("stat-total-ins").textContent = fmtNum(state.totalIns, getLogTotalIns());
      const bssLog = (state.logBestSS > NLOG + 1) ? state.logBestSS
        : ((state.bestSS > 0 && isFinite(state.bestSS)) ? Math.log10(state.bestSS) : NLOG);
      document.getElementById("stat-best-ss").textContent = (bssLog > NLOG + 1 ? fmtLog(bssLog) : "0") + " SS";
      document.getElementById("stat-comp-fastest").textContent = state.compFastest > 0 ? fmtTime(state.compFastest) : "—";
      const bsrLog = (state.logBestSSRate > NLOG + 1) ? state.logBestSSRate
        : ((state.bestSSRate > 0 && isFinite(state.bestSSRate)) ? Math.log10(state.bestSSRate) : NLOG);
      document.getElementById("stat-best-ss-rate").textContent = (bsrLog > NLOG + 1 ? fmtLog(bsrLog) : "0") + " SS/分";
    }
  }
  // 挑战选项卡：分「扭曲宇宙」（红）与「实验项目」（天蓝）两组
  const chList = document.getElementById('challenge-list');
  if (chList) {
    chList.innerHTML = '';
    // —— 扭曲宇宙（红色小标题，与扭曲主题色一致）——
    const dGroup = document.createElement('div');
    dGroup.className = 'stat-group';
    const dTitle = document.createElement('h3');
    dTitle.className = 'sg-title sg-title-distort';
    dTitle.textContent = '扭曲宇宙';
    dGroup.appendChild(dTitle);
    for (const u of DISTORT_UNIVERSES) {
      const best = state.distortBest[u.id];

      const row = document.createElement('div');
      row.className = 'stat-row' + (state.distortDone.includes(u.id) ? '' : ' muted');
      const label = document.createElement('span'); label.className = 'stat-label';
      label.textContent = u.name + '（' + (best ? '已湮灭' : '未湮灭') + '）';
      const val = document.createElement('span'); val.className = 'stat-value';
      val.textContent = '最佳 ' + (best ? fmtTime(best, true) : '—');
      row.append(label, val);
      dGroup.appendChild(row);
    }
    // 总和行：各宇宙最佳完成时间之和（而非历史累计 distortTotal）
    const sumRow = document.createElement('div');
    sumRow.className = 'stat-row';
    const sumLabel = document.createElement('span'); sumLabel.className = 'stat-label';
    sumLabel.textContent = '所有挑战时间之和';
    const sumVal = document.createElement('span'); sumVal.className = 'stat-value';
    // 所有宇宙都已湮灭才显示总和；否则视为未定（+∞）
    const allDone = DISTORT_UNIVERSES.every(u => state.distortBest[u.id]);
    const bestSum = DISTORT_UNIVERSES.reduce((s, u) => s + (state.distortBest[u.id] || 0), 0);
    sumVal.textContent = allDone ? fmtTime(bestSum, true) : "+∞";
    sumRow.append(sumLabel, sumVal);
    dGroup.appendChild(sumRow);
    chList.appendChild(dGroup);
    // —— 实验项目（天蓝色小标题）：研究页解锁（购买理论树节点 51）后才出现，防剧透 ——
    if (theoryOwned("51")) {
    const eGroup = document.createElement('div');
    eGroup.className = 'stat-group';
    const eTitle = document.createElement('h3');
    eTitle.className = 'sg-title sg-title-research';
    eTitle.textContent = '实验项目';
    eGroup.appendChild(eTitle);
    const unlockedExps = RESEARCH_EXPS.filter(def => def.unlock());
    if (!unlockedExps.length) {
      const row = document.createElement('div');
      row.className = 'stat-row muted';
      row.innerHTML = "<span class='stat-label'>尚未解锁任何实验</span><span class='stat-value'>—</span>";
      eGroup.appendChild(row);
    }
    for (const def of unlockedExps) {
      const best = state.researchBest[def.id] || 0;
      const row = document.createElement('div');
      row.className = 'stat-row' + (best > 0 ? '' : ' muted');
      const label = document.createElement('span'); label.className = 'stat-label';
      label.textContent = def.name;
      const val = document.createElement('span'); val.className = 'stat-value';
      val.textContent = best > 0 ? '最高完成等级 ' + best : '未完成';
      row.append(label, val);
      eGroup.appendChild(row);
    }
    chList.appendChild(eGroup);
    }
  }
  // 最近十次湮灭（重置子页）
  const hList = document.getElementById("ann-history-list");
  if (hList) {
    hList.innerHTML = "";
    const rows = state.annHistory.slice(-10).reverse();
    if (rows.length === 0) {
      const empty = document.createElement("div");
      empty.className = "stat-row muted";
      empty.innerHTML = "<span class='stat-label'>暂无湮灭记录</span><span class='stat-value'>—</span>";
      hList.appendChild(empty);
    }
    for (const r of rows) {
      const row = document.createElement("div");
      row.className = "ann-history-row" + (r.distort ? " distort-row" : "");
      const label = document.createElement("span"); label.className = "ah-label";
      // 游戏时长：新记录存 gameDurLog 权威（超 double 时 double 缓存被封顶不可用）；
      // 旧记录无 gameDurLog 时回落旧行为（封顶条目只能显示 2.08e303d 近似，真值已不可恢复）
      const durText = fmtTimeLog(r.gameDur, r.gameDurLog);
      label.textContent = `${r.label} · ${fmtTime(r.realDur)}（真实）/ ${durText}（游戏）`;
      const val = document.createElement("span"); val.className = "ah-val";
      // sp/rate 显示完全由 log 值驱动（新记录存 spLog/rateLog 权威，可超 double）：
      // 优先 log 权威；旧记录无此字段时从 sp/rate 重建（非有限值按拐点口径归位）。
      // 统一 fmtLog 显示，规避 isFinite(null)===true 走 fmt(null)="0" 的陷阱
      const spLog = (r.spLog !== undefined && typeof r.spLog === "number" && isFinite(r.spLog)) ? r.spLog
        : (r.sp > 0 && isFinite(r.sp)) ? Math.log10(r.sp)
        : (isFinite(r.sp) ? ((r.sp > 0) ? Math.log10(r.sp) : NLOG) : Math.log10(1.79e308));
      const rateLog = (r.rateLog !== undefined && typeof r.rateLog === "number" && isFinite(r.rateLog)) ? r.rateLog
        : (r.rate > 0 && isFinite(r.rate)) ? Math.log10(r.rate)
        : (isFinite(r.rate) ? ((r.rate > 0) ? Math.log10(r.rate) : NLOG) : Math.log10(1.79e308));
      const spText = (spLog > NLOG + 1) ? fmtLog(spLog) : "0";
      const rateText = (rateLog > NLOG + 1) ? fmtLog(rateLog) : "0";
      val.textContent = `${spText} Sp · ${rateText} Sp/分`;
      row.append(label, val);
      hList.appendChild(row);
    }
  }
  // 最近十次卷缩（重置子页；SS/速率存 log 权威，显示由 log 驱动）
  const cList = document.getElementById("comp-history-list");
  if (cList) {
    cList.innerHTML = "";
    const rows = state.compHistory.slice(-10).reverse();
    if (rows.length === 0) {
      const empty = document.createElement("div");
      empty.className = "stat-row muted";
      empty.innerHTML = "<span class='stat-label'>暂无卷缩记录</span><span class='stat-value'>—</span>";
      cList.appendChild(empty);
    }
    for (const r of rows) {
      const row = document.createElement("div");
      row.className = "ann-history-row comp-history-row"; // 修饰类：SS 数值用卷缩层橙色（原继承湮灭紫）
      const label = document.createElement("span"); label.className = "ah-label";
      label.textContent = `${r.label} · ${fmtTime(r.realDur)}（真实）/ ${fmtTimeLog(r.gameDur, r.gameDurLog)}（游戏）`;
      const val = document.createElement("span"); val.className = "ah-val";
      const cSsLog = (r.ssLog !== undefined && typeof r.ssLog === "number" && isFinite(r.ssLog)) ? r.ssLog
        : (r.ss > 0 && isFinite(r.ss)) ? Math.log10(r.ss) : NLOG;
      const cRateLog = (r.rateLog !== undefined && typeof r.rateLog === "number" && isFinite(r.rateLog)) ? r.rateLog
        : (r.rate > 0 && isFinite(r.rate)) ? Math.log10(r.rate) : NLOG;
      val.textContent = `${cSsLog > NLOG + 1 ? fmtLog(cSsLog) : "0"} SS · ${cRateLog > NLOG + 1 ? fmtLog(cRateLog) : "0"} SS/分`;
      row.append(label, val);
      cList.appendChild(row);
    }
  }
}

function renderAll() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  applyPhononVisibility(); renderWave(); updatePhononUI(); renderStats(); renderSlots(); updateAchievementsUI(); updateDistortUI(); updateBlackholeUI();
}
function setAutosaveStatus(msg) {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  document.getElementById("autosave-status").textContent = msg;
}

