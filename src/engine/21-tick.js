// ---------- Game loop ----------
// 生产累积（游戏时间）：tick 与离线模拟共用的唯一实现，防止双份公式漂移。
// 包含：游戏时间 dt 累积（playTime/annGameElapsed）、波速 U、累计频率、声子、黑洞 tick。
// realTime（真实游玩时长）不在此处——离线模拟不累计真实游玩时间
function applyProduction(realDt) {
  // 游戏时间倍率走 log 域（timeRateLog 权威），倍率超 double（黑洞扭曲状态等）时
  // 用 Decimal 计算游戏时间增量，不再产生 Infinity
  const trLog = timeRateLog();
  // gameDtLog：本 tick 游戏时间增量 dt 的 log10（log 域权威，供所有生产累积使用）
  let gameDtLog;
  let dt;
  let dtOverDouble = false; // dt 超 double：游戏时间以 log 权威累积，dt 仅作下游量级标记
  if (trLog > 308) {
    dtOverDouble = true;
    gameDtLog = clampLog(trLog + Math.log10(Math.max(realDt, 1e-300)));
  } else {
    dt = realDt * Math.pow(10, trLog);
    if (isFinite(dt)) {
      gameDtLog = Math.log10(Math.max(dt, 1e-300));
    } else {
      // trLog 接近 308 且 realDt 较大（后台标签节流）时 dt 会溢出为 Infinity：
      // 若继续走 double，gameDtLog=Infinity 经 clampLog 变成 LOG_CAP 污染存档，改走 log 域
      dtOverDouble = true;
      gameDtLog = clampLog(trLog + Math.log10(Math.max(realDt, 1e-300)));
    }
  }
  // N09：现有累计 + dt 溢出 double 时同样转入 log 权威（旧判定只查单次 dt）
  const timeOverDouble = dtOverDouble || !Number.isFinite(state.playTime + dt);
  if (timeOverDouble) {
    // 倍率超 double：游戏时间以 log 权威累积，double 缓存封顶 MAX_VALUE
    if (state.playTimeLog === undefined || !Number.isFinite(state.playTimeLog)) state.playTimeLog = Math.log10(Math.max(state.playTime, 1e-300));
    state.playTimeLog = clampLog(logAddLogs(state.playTimeLog, gameDtLog));
    state.playTime = Number.MAX_VALUE;
    dt = Number.MAX_VALUE; // 仅作下游量级标记；生产累积一律走 gameDtLog
  } else {
    state.playTime += dt;
  }
  // 本次湮灭的游戏时长独立累计（避免 playTime 饱和后 playTime-annStartGame 恒为 0）。
  // double 缓存封顶 MAX_VALUE（与 playTime 同语义），log 权威持续累积用于显示
  const annOver = timeOverDouble || !Number.isFinite((state.annGameElapsed || 0) + dt);
  if (state.annihilations >= 1) {
    state.annGameElapsed = annOver
      ? Number.MAX_VALUE
      : (state.annGameElapsed || 0) + dt;
    if (annOver) {
      if (state.annGameElapsedLog === undefined || !isFinite(state.annGameElapsedLog)) state.annGameElapsedLog = NLOG;
      state.annGameElapsedLog = clampLog(logAddLogs(Math.max(state.annGameElapsedLog, NLOG), gameDtLog));
    } else if (dt > 0) {
      // 注意：必须排除 dtOverDouble——此时 dt=MAX_VALUE 占位，log10(dt)=308.25
      // 会把 log 权威反复覆盖成 308 量级（加速 e338 也恒显示 2.08e303d 的根因）
      state.annGameElapsedLog = clampLog(logAddLogs(Math.max(state.annGameElapsedLog ?? NLOG, NLOG), Math.log10(dt)));
    }
  }

  // R5 热焓极点回溯：记录本次湮灭的最高有效温度（与奇点公式同口径；各湮灭类重置清零）
  if (researchBought("R5")) {
    const tLog = temperatureCappedLog();
    if (tLog > state.annMaxTLog) state.annMaxTLog = tLog;
  }

  // 本次卷缩的游戏时长独立累计（与 annGameElapsed 同款：double 缓存封顶 MAX_VALUE，
  // log 权威持续累积用于显示；统计-通用的「本次卷缩所花费时间」读取）
  const compOver = timeOverDouble || !Number.isFinite((state.compGameElapsed || 0) + dt);
  if (state.compactions >= 1) {
    state.compGameElapsed = compOver
      ? Number.MAX_VALUE
      : (state.compGameElapsed || 0) + dt;
    if (compOver) {
      if (state.compGameElapsedLog === undefined || !isFinite(state.compGameElapsedLog)) state.compGameElapsedLog = NLOG;
      state.compGameElapsedLog = clampLog(logAddLogs(Math.max(state.compGameElapsedLog ?? NLOG, NLOG), gameDtLog));
    } else if (dt > 0) {
      state.compGameElapsedLog = clampLog(logAddLogs(Math.max(state.compGameElapsedLog ?? NLOG, NLOG), Math.log10(dt)));
    }
  }

  // 波速生产（double 链不溢出时走原路径，零回归；饱和时退 log 域累积）
  const g = gainRate();
  const gFinite = isFinite(g) && Math.abs(g) < LOG_FALLBACK;
  const uFinite = Math.abs(state.U) < LOG_FALLBACK;
  if (g !== 0) {
    const gd = g * dt;
    if (gFinite && uFinite && isFinite(gd) && Math.abs(gd) < LOG_FALLBACK) {
      // double 路径（现状）
      setU(state.U + gd);
    } else {
      // log 域累积：U_new = U_old + g·dt（U≥0；定向 0 下限）。
      // gameDtLog 为权威 log10(g·dt 中的 dt)：dt 为 MAX_VALUE 占位时也正确
      const { log: gLog, sign } = gainRateLog();
      const gdLog = gLog + gameDtLog;
      let newLogU = logAddLogs(getLogU10(), gdLog);
      if (inDistort("directed") && sign < 0) {
        // 定向：U 可能被减到 0。log 域相减：max(0, U - |gd|)
        const sub = logAddSigned(getLogU10(), 1, gdLog, -1);
        newLogU = sub.sign > 0 ? sub.log : NLOG;
      }
      setULog(newLogU); // double 缓存自动处理超 1e308（存 Infinity，log 权威）
    }
    // 定向宇宙：波速硬下限 0
    if (inDistort("directed") && state.U < 0) setU(0);

    // 累计频率 F 增量 = (g/L^e)·dt（e 为卷缩波长指数）；扭曲宇宙与虚空中的产生不计入通用统计
    if (!state.distortActive && !state.voidActive) {
      const wE = wavelengthExp();
      const gOverLLog = gainPerLLog((gFinite ? Math.log10(Math.max(Math.abs(g), 1e-300)) : gainRateLog().log) + gameDtLog);
      // N02：安全判定改用实际增量的 log（gd/L^e）——旧判定 gd/L 在 e>1 时漏判溢出
      const incSafe = Number.isFinite(gOverLLog) && gOverLLog < Math.log10(LOG_FALLBACK);
      const incDouble = (wE === 1 ? (g / state.L) : (g / Math.pow(state.L, wE))) * dt;
      if (gFinite && uFinite && incSafe && isFinite(state.totalFGained) && state.totalFGained < LOG_FALLBACK && isFinite(incDouble)) {
        state.totalFGained += incDouble;
        state.logTotalF = state.totalFGained > 0 ? Math.log10(state.totalFGained) : NLOG;
      } else {
        // log 域：logTotalF 与 gOverLLog·sign 累积（带符号）
        const sgn = g < 0 ? -1 : 1;
        const r = logAddSigned(getLogTotalF(), 1, gOverLLog, sgn);
        if (r.sign < 0) {
          setTotalFGainedLog(NLOG);
        } else {
          setTotalFGainedLog(r.log);
        }
      }
    }
  }

  // 声子生产（游戏时间；浮点累计，显示取整）。phononRate 过大时走 log 域。
  if (inDistort("simple")) {
    setPhonons(1); // 简洁宇宙：声子数始终为 1
  } else if (state.phOn) {
    const pr = phononRate();
    const prFinite = isFinite(pr) && pr < LOG_FALLBACK;
    const prd = pr * dt;
    // 与 U 路径同款防护：pr·dt 或现有声子超 double（含缓存 Infinity、dt=MAX_VALUE 占位）
    // 时走 log 域，防止 setPhonons(Infinity) 把权威 logDph 写成 LOG_CAP 污染存档
    if (prFinite && isFinite(state.phonons) && state.phonons < LOG_FALLBACK && isFinite(prd) && state.phonons + prd < LOG_FALLBACK) {
      setPhonons(state.phonons + prd);
    } else {
      // log 域：logPhonons + log10(pr·dt)（pr·dt 可能为 0 当 pr=0）
      const prLog = phononRateLog() + gameDtLog;
      if (prLog <= NLOG + 1) {
        // pr·dt ≈ 0，保持原值（双精度微调；prd 本身可为 Infinity 占位，不可直加）
        setPhonons(state.phonons + (prFinite && isFinite(prd) ? prd : 0));
      } else {
        const curLog = getLogPhonons() === -Infinity ? NLOG : getLogPhonons();
        const newLog = logAddLogs(curLog, prLog);
        setPhononsLog(newLog); // double 缓存自动处理超 1e308
      }
    }
  }

  // 黑洞 tick：吸积/脉冲用真实时间（不受时间倍率影响），扭曲状态只给加成（无 tick 效果）
  tickBlackhole(realDt);

  // 卷缩层：维度折叠器产出 CM（真实时间；节点 01 后受削弱的时间倍率加成）。
  // 挂在 applyProduction 内 → 离线模拟自动兼容
  cmTick(realDt);
  infTick(realDt); // 研究：推论产出（真实时间，拥有节点51 后）
  svu3RhoTick(realDt); // SVU3 虚数密度：全扭曲虚空中按真实时间增长（不受时间倍率影响，里程碑3 后）
  sr1Tick(realDt); // 课题 SR1：投入推论（真实时间，R9 后激活时）
  voidVFRegenTick(realDt); // 虚空泡沫：虚空外每秒追赶上限差值的 5%（真实时间）
}

// 在线 tick 与离线模拟共用的非界面推进阶段（S05/O04：离线同口径）——
// SVU1 投入、SVU2 增长、量子狂潮 latch、自动化解锁（1e10/1e20/里程碑 8/10、卷缩 16/18/20/30）。
// setAutosaveStatus 由 simActive 早退，离线调用安全；不改「真实游玩时长」规则
function tickProgression(realDt) {
  if (state.ach.normal.includes("A52")) {
    svu1FillTick(realDt);
    if (!state.voidActive) {
      const rate = svu2GainRate();
      if (rate > 0) state.svu2Level += rate * realDt;
    }
    // 量子狂潮解锁 latch：虚空中（削弱组合任意）达到 1e7000 Hz（达成一次永久记录）
    if (state.voidActive && state.ach.normal.includes("A45")
      && !(state.vpuCondMet && state.vpuCondMet.includes("vpu2")) && FLog() >= 7000) {
      if (!state.vpuCondMet) state.vpuCondMet = [];
      state.vpuCondMet.push("vpu2");
      setAutosaveStatus("虚幻升级解锁：量子狂潮（虚空中达到 1e7000 Hz）");
    }
  }
  if (state.annihilations >= 1) {
    if (!state.autoWaveUpg && F() >= 1e10) { state.autoWaveUpg = 1; setAutosaveStatus("自动化解锁：主要页升级"); }
    if (!state.autoPhononUpg && F() >= 1e20) { state.autoPhononUpg = 1; setAutosaveStatus("自动化解锁：声子页升级"); }
    // 里程碑 8/10 的自动化授权（老存档补发；新档在 doAnnihilation 内授予）
    if (!state.autoUp3 && hasMilestone(8)) state.autoUp3 = 1;
    if (!state.autoAnn && hasMilestone(10)) state.autoAnn = 1;
  }
  if (state.testMode && state.compactions >= 1) {
    if (!state.autoSau && compMilestone(16)) { state.autoSau = 1; setAutosaveStatus("自动化解锁：可重复奇点升级（卷缩里程碑 16）"); }
    if (!state.autoSbu && compMilestone(18)) { state.autoSbu = 1; setAutosaveStatus("自动化解锁：黑洞升级（卷缩里程碑 18）"); }
    if (!state.autoSvpu && compMilestone(20)) { state.autoSvpu = 1; setAutosaveStatus("自动化解锁：虚粒子升级（卷缩里程碑 20）"); }
    if (!state.autoComp && compMilestone(30)) { state.autoComp = 1; setAutosaveStatus("自动化解锁：自动卷缩（卷缩里程碑 30）"); }
  }
}

function tick() {
  const now = Date.now();
  // realDt 钳制：挂起标签的一次性补发上限 60s（真正的离线收益由加载时的
  // 离线模拟系统结算），系统时钟回拨产生的负值归 0（负 dt 会倒扣资源）
  const rawDt = (now - state.lastTick) / 1000;
  const realDt = Math.min(Math.max(rawDt, 0), 60);
  state.lastTick = now;
  state.realTime += realDt;
  if (!annihilationFrozen()) applyProduction(realDt); // 10 次湮灭前就绪即暂停（保持可获取 Sp 最大）
  autoAnnTick(); // 生产后立即检查自动湮灭（同 tick 反应，不必等渲染与购买自动化段）

  // 虚空升级/自动化解锁（S05/O04：提取为 tickProgression，离线模拟同口径调用）
  tickProgression(realDt);

  // 更新统计极值（log 域 max/min，防 maxU 恒 Infinity、minL 下溢 0 丢精度）
  const f = F();
  const fLog = FLog();
  if (fLog > getLogMaxF()) { state.maxF = f; state.logMaxF = fLog; }
  if (getLogU10() > getLogMaxU()) { state.maxU = state.U; state.logMaxU = getLogU10(); }
  if (getLogL10() < getLogMinL()) { state.minL = state.L; state.logMinL = getLogL10(); }

  checkAchievements();
  // S4：在 00:00–00:59 打开游戏（每隔几秒检查一次即可，用 tick 节流）
  if (!state.ach.hidden.includes("S4") && HIDDEN_ACH.find(x => x.id === "S4").check()) {
    grantHidden("S4");
  }
  // S6：随时间推进检测（切换时也会检测）
  checkS6();
  // S17：禅 —— 在扭曲宇宙中停留超过 1h 未完成
  if (!state.ach.hidden.includes("S17") && state.distortActive && state.annStartReal) {
    if ((gameNow() - state.annStartReal) / 1000 >= 3600) grantHidden("S17");
  }
  // S19：滚木 —— 生产为 0 Hz/s 超过 10 分钟（连续）。
  // log 域判定：state.L 下溢为 0 时真实生产仍可能为正（波长 log 权威有限），double 乘除会误判为 0
  {
    const gainLog = gainPerLLog(gainRateLog().log + timeRateLog());
    const zero = gainLog < -30; // 对应原 |gain| < 1e-30（gainRate=0 时 log=NLOG 同样命中）
    if (zero) {
      if (!state.zeroGainSince) state.zeroGainSince = Date.now();
      else if (!state.ach.hidden.includes("S19") && Date.now() - state.zeroGainSince >= 600000) grantHidden("S19");
    } else {
      state.zeroGainSince = 0;
    }
  }
  // S15：这是距离增量吗？—— 有效波长达到 1e308 m（log 域判断）
  if (!state.ach.hidden.includes("S15")) {
    const effLogL = getLogL10() + distortLModLog();
    if (effLogL >= 308) grantHidden("S15");
  }
  // S11：踌躇不决 —— 达到当前宇宙的温度上限后 5 分钟（真实时间）不湮灭
  if (!state.ach.hidden.includes("S11") && state.annihilations >= 1) {
    if (temperature() >= temperatureCap() * 0.999999) {
      if (!state.capReachedAt) state.capReachedAt = Date.now();
      else if (Date.now() - state.capReachedAt >= 300000) grantHidden("S11");
    } else {
      state.capReachedAt = 0;
    }
  }
  // S22：白洞 —— 黑洞保持脉冲状态 5 分钟以上（真实时间，切走即重置）
  if (bhUnlocked() && state.bhState === "pulse") {
    if (!state.bhPulseSince) state.bhPulseSince = Date.now();
    else if (!state.ach.hidden.includes("S22") && Date.now() - state.bhPulseSince >= 300000) grantHidden("S22");
  } else {
    state.bhPulseSince = 0;
  }
  // S23：裸奇点 —— 黑洞倍率为 1（M=1，M^0.2=1）时保持扭曲状态 10 分钟以上
  if (bhUnlocked() && state.bhState === "distorl" && bhEffect() <= 1) {
    if (!state.bhDistorlSince) state.bhDistorlSince = Date.now();
    else if (!state.ach.hidden.includes("S23") && Date.now() - state.bhDistorlSince >= 600000) grantHidden("S23");
  } else {
    state.bhDistorlSince = 0;
  }
  dirty = true;

  updateDispAnchor();
  renderWave();
  if (state.phUnlocked) updatePhononUI();
  applyAnnihilationVisibility();
  applyCompactVisibility();
  updateCompactButton();
  if (!annihilationFrozen()) runAutomation(); // 暂停期间不自动购买（防花掉声子/波速拉低待获取 Sp）
  if (state.annihilations >= 1) {
    updateSpUI();
    updateAutomationUI();
    if (state.annihilations >= 20) updateDistortUI();
    if (bhUnlocked()) updateBlackholeUI();
    if (state.ach.normal.includes("A52")) updateVoidUI();
  }
  if (state.testMode && state.compactions >= 1) updateCompactUI();
  if (theoryOwned("51")) updateResearchUI();
  if (!document.getElementById("page-stats").classList.contains("hidden")) renderStats();
  if (!document.getElementById("page-achievements").classList.contains("hidden")) updateAchievementsUI();
}

