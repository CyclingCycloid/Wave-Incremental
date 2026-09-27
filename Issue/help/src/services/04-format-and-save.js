// ---------- Number / time formatting ----------
function fmt(num) {
  if (num === null || num === undefined || isNaN(num)) return "—";
  if (num === 0) return "0";
  if (!isFinite(num)) return "∞";
  // 小数位数由设置控制（3–6）
  const d = Math.min(6, Math.max(3, (state.settings && state.settings.decimals) || 3));
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);
  const tiny = Math.pow(10, -d); // 小于此值用科学计数法
  if (abs < 1000 && abs >= tiny) return sign + abs.toFixed(d);
  // 恒为科学计数（原「工程/对数」记数设置已删除：超 double 上限后显示全部走 fmtLog
  // 的科学格式，该设置在后期不可用）
  return sign + abs.toExponential(d).replace("e+", "e");
}

function fmtLog(logV) {
  // 以 log10 显示：|logV| 在 double 范围内还原 double 后走 fmt——
  // fmt 自带「<1000 定点小数 / <0.001 科学计数 / ≥1000 按记数法设置」的完整规则，
  // 避免 12.6 显示成 1.259e1 这类小值指数记数（<1000 一律定点）
  if (!isFinite(logV) || logV >= LOG_CAP) return "∞"; // LOG_CAP 钳制值视为无穷
  if (logV <= NLOG + 1e6) return "0"; // 哨兵噪声区（NLOG~NLOG+1e6）：语义为零，防 1e-9999999xx 误报
  // 小数位数跟随设置（与 fmt 一致）
  const d = Math.min(6, Math.max(3, (state.settings && state.settings.decimals) || 3));
  if (logV > -308 && logV < 308) return fmt(Math.pow(10, logV));
  // log 域：logV = floor(logV) + frac；值 = 10^frac × 10^floor(logV)
  // （负指数也走此分支：10^frac 是 1~10 间的有限数，不会下溢）
  const exp = Math.floor(logV);
  const frac = logV - exp;
  const mant = Math.pow(10, frac);
  return mant.toFixed(d) + "e" + exp;
}
// 统一显示：double 在范围内走 fmt（现状），饱和/超 1e308 走 fmtLog（输出 1eN）
function fmtNum(doubleVal, logVal) {
  // double 为 0 但 logVal 表示非零值（double 下溢，如波长 <1e-324）时走 log 域显示。
  // logVal===0 是 sp/totalSp 的零哨兵（真值 0 而非 10^0=1），必须排除，否则 0 会显示成 1
  if (doubleVal === 0 && logVal !== undefined && isFinite(logVal) && logVal !== 0 && logVal > NLOG + 1) return fmtLog(logVal);
  if (isFinite(doubleVal) && Math.abs(doubleVal) < LOG_FALLBACK) return fmt(doubleVal);
  if (logVal !== undefined && isFinite(logVal)) return fmtLog(logVal);
  return "∞";
}
// 整数显示：double 在范围内取 floor 后走 fmt；超 1e308 走 fmtLog（虚粒子等计数类资源）
function fmtInt(doubleVal, logVal) {
  if (isFinite(doubleVal) && Math.abs(doubleVal) < LOG_FALLBACK) return fmt(Math.floor(doubleVal));
  if (logVal !== undefined && isFinite(logVal)) {
    // log 域下整数：取 logVal 的整数部分为 1eN，尾数 floor
    if (logVal <= 15) return fmt(Math.floor(Math.pow(10, logVal)));
    return fmtLog(logVal); // 超大时 1eN 格式（已是整数概念）
  }
  return "∞";
}
function fmtTime(seconds, precise) {
  // precise=true 时显示最小分度 25ms（挑战计时用；计算精度也是 25ms）
  const total = precise ? seconds : Math.floor(seconds);
  const d = Math.floor(total / 86400);
  // 超过 1e4 天：只显示 XXXd 并用科学计数法
  if (d >= 1e4) return d.toExponential(2).replace("e+", "e") + "d";
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const sStr = precise ? (Math.round(s * 40) / 40).toString() : `${s}`;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sStr}s`;
  if (m > 0) return `${m}m ${sStr}s`;
  return `${sStr}s`;
}
// 时间显示的 log 域版本：log 权威超过 double 上限（缓存封顶 MAX_VALUE 已失真）时，
// 直接按「天」数 log 域显示（天数的 log = log10(秒) − log10(86400)）；普通范围回落 fmtTime。
// 不可先判 isFinite(seconds)：playTime 被封顶成 MAX_VALUE（有限）会让显示永远卡在 2.08e303d
const LOG_MAX_DOUBLE = Math.log10(Number.MAX_VALUE); // ≈308.2547
function fmtTimeLog(seconds, secondsLog) {
  const lg = (typeof secondsLog === "number" && isFinite(secondsLog) && secondsLog > NLOG + 1) ? secondsLog : null;
  // seconds === Number.MAX_VALUE（封顶哨兵）而 log 权威有效时也走 log 域——
  // log 可能略低于 double 上限（trLog 刚过 308 且 realDt 小），此时缓存已是哨兵、log 才是真值
  if (lg !== null && (lg > LOG_MAX_DOUBLE || seconds === Number.MAX_VALUE)) {
    const dLog = lg - Math.log10(86400);
    return (10 ** (dLog - Math.floor(dLog))).toFixed(3) + "e" + Math.floor(dLog) + "d";
  }
  if (seconds !== undefined && isFinite(seconds)) return fmtTime(seconds);
  const dLog = lg !== null ? lg - Math.log10(86400) : null;
  if (dLog === null || dLog <= 4) return fmtTime(86400 * 1e4); // 兜底
  return (10 ** (dLog - Math.floor(dLog))).toFixed(3) + "e" + Math.floor(dLog) + "d";
}
// 整数资源显示（超弦/声子/CM 等永远为整数的量）：
// 值 <1（花光后的浮点残差，如 1e-16）显示 0；1–999 显示不带小数的整数；≥1e3 走 e 记数（fmtLog）
function fmtIntRes(doubleVal, logVal) {
  const lg = (typeof logVal === "number" && isFinite(logVal) && logVal > NLOG + 1) ? logVal
    : (doubleVal > 0 && isFinite(doubleVal)) ? Math.log10(doubleVal) : NLOG;
  if (lg <= NLOG + 1 || lg < -1e-9) return "0"; // 零/浮点残差（0 < 值 < 1 只可能是舍入噪声）
  if (lg < 3) return String(Math.floor(Math.pow(10, lg)));
  return fmtLog(lg);
}
// 整数货币显示（超弦/灵感等纯整数货币）：四舍五入（log 域加减残差 ±1ulp 不影响显示），
// 值 <0.5（浮点残差）显示 0；≥1e3 走 e 记数（fmtLog）
function fmtIntRound(doubleVal, logVal) {
  const lg = (typeof logVal === "number" && isFinite(logVal) && logVal > NLOG + 1) ? logVal
    : (doubleVal > 0 && isFinite(doubleVal)) ? Math.log10(doubleVal) : NLOG;
  if (lg <= NLOG + 1 || lg < -0.5) return "0";
  if (lg < 3) return String(Math.round(Math.pow(10, lg)));
  return fmtLog(lg);
}
// 湮灭次数等大计数的显示：≥1e4 用科学计数法（如 3.00e4）
function fmtAnnNum(n) {
  return n >= 1e4 ? n.toExponential(2).replace("e+", "e") : `${n}`;
}

// ---------- Base64 (Unicode-safe) ----------
// WI1 编解码实现见 src/modules/save-codec.js；此处保留原段落位置作审查锚点。

// ---------- Persistence ----------
// 迁移旧存档：旧版 up3 叠加除法、无 up3LastF；按当前波长反推等效峰值频率。
// rawObj = 合并前的原始存档对象（S01）：加载路径先用 defaultState() 合并，旧档缺失的
// log 权威字段会被默认值遮蔽——"字段缺失才回填"必须以原始对象的存在性为准才能触发
function migrateState(rawObj) {
  const rawHas = (k) => !!(rawObj && Object.prototype.hasOwnProperty.call(rawObj, k));
  // 旧档可能直接写 state.L（无 logL10）：同步 log 表示
  if (!rawHas("logL10") || state.logL10 === undefined || state.logL10 === null || !isFinite(state.logL10)) {
    state.logL10 = (state.L > 0) ? Math.log10(state.L) : 0;
  }
  // 存档若带有 logL10 且 L 已下溢为 0：L 保持 0，读取走 getLogL10
  // v0.4.2.5：U/累计频率/极值/升级3峰值 的 log 权威字段回填
  if (!rawHas("logU10") || state.logU10 === undefined || state.logU10 === null || !isFinite(state.logU10)) {
    state.logU10 = state.U > 0 ? Math.log10(state.U) : NLOG;
  }
  if (!rawHas("logTotalF") || state.logTotalF === undefined || state.logTotalF === null || !isFinite(state.logTotalF)) {
    state.logTotalF = state.totalFGained > 0 ? Math.log10(state.totalFGained) : NLOG;
  }
  if (!rawHas("logMaxF") || state.logMaxF === undefined || state.logMaxF === null || !isFinite(state.logMaxF)) {
    state.logMaxF = state.maxF > 0 ? (isFinite(state.maxF) ? Math.log10(state.maxF) : getLogU10()) : 1;
  }
  if (!rawHas("logMaxU") || state.logMaxU === undefined || state.logMaxU === null || !isFinite(state.logMaxU)) {
    state.logMaxU = state.maxU > 0 ? (isFinite(state.maxU) ? Math.log10(state.maxU) : getLogU10()) : 1;
  }
  if (!rawHas("logMinL") || state.logMinL === undefined || state.logMinL === null || !isFinite(state.logMinL)) {
    state.logMinL = (state.minL > 0) ? Math.log10(state.minL) : getLogL10();
  }
  // 升级3 峰值：旧档 up3LastF 可能是 Infinity（JSON 存为 null）或 0；用 log 重建
  if (!rawHas("logUp3LastF") || state.logUp3LastF === undefined || state.logUp3LastF === null || !isFinite(state.logUp3LastF) || state.logUp3LastF <= NLOG + 1) {
    if (state.up3LastF > 0) {
      state.logUp3LastF = isFinite(state.up3LastF) ? Math.log10(state.up3LastF) : 308;
    } else if (state.up3 > 0) {
      // 旧版无 up3LastF 但有 up3：从波长反推等效峰值频率
      state.logUp3LastF = -getLogL10() / up3Exp();
      state.up3LastF = state.logUp3LastF > 308 ? Infinity : Math.pow(10, state.logUp3LastF);
    } else {
      state.logUp3LastF = NLOG;
    }
  }
  // 旧档 up3 反推（logUp3LastF 已建好则跳过）
  if (state.up3 > 0 && !state.up3LastF && state.logUp3LastF <= NLOG + 1) {
    state.logUp3LastF = -getLogL10() / up3Exp();
    state.up3LastF = state.logUp3LastF > 308 ? Infinity : Math.pow(10, state.logUp3LastF);
  }
  // 旧存档无 realTime：以 playTime 作为初始近似值
  if (!state.realTime) state.realTime = state.playTime;
  // 旧存档 distortTotal 为对象（各宇宙分别累计）时：求和迁移为单一数字
  if (typeof state.distortTotal === "object" && state.distortTotal !== null) {
    let s = 0;
    for (const k in state.distortTotal) s += state.distortTotal[k] || 0;
    state.distortTotal = s;
  }
  // v0.4.2.x：批量升级改版（增速 ×20），一次性清除旧价格体系的等级（标记防重复）
  if (!state.batchResetDone && state.batchLvl > 0) { state.batchLvl = 0; state.batchMax = 2; state.batchResetDone = 1; }
  else if (!state.batchResetDone) state.batchResetDone = 1;
  // v0.4.3 黑洞字段回填（旧档无 bhMass/bhState/sbu*）。
  // null（超 double 的缓存被 JSON 存为 null）不得走「旧档缺字段」兜底：那会把 log 权威
  // 一并清成 0，重载后黑洞质量/虚粒子被打回 1/0——权威有效时从 log 恢复缓存
  if (state.bhMass === undefined || state.bhMass === null) {
    if (state.logBhMass === undefined || !isFinite(state.logBhMass)) { state.bhMass = 1; state.logBhMass = 0; }
    else setBhMassLog(state.logBhMass);
  }
  if (!rawHas("logBhMass") || state.logBhMass === undefined || !isFinite(state.logBhMass)) state.logBhMass = clampLog(Math.log10(Math.max(state.bhMass, 0)));
  if (!state.bhState) state.bhState = "accrete";
  if (state.virtualParticles === undefined || state.virtualParticles === null) {
    if (state.logVP === undefined || !isFinite(state.logVP)) { state.virtualParticles = 0; state.logVP = NLOG; }
    else setVPLog(state.logVP);
  }
  if (!rawHas("logVP") || state.logVP === undefined || !isFinite(state.logVP)) state.logVP = clampLog(Math.log10(Math.max(state.virtualParticles, 0)));
  if (state.sbu1 === undefined) state.sbu1 = 0;
  if (state.sbu2 === undefined) state.sbu2 = 0;
  if (state.sbu3 === undefined) state.sbu3 = 0;
  // v0.4.3.1：黑洞成就追踪字段回填
  if (state.bhCanvasClicks === undefined) state.bhCanvasClicks = 0;
  if (state.bhPulseSince === undefined) state.bhPulseSince = 0;
  if (state.bhDistorlSince === undefined) state.bhDistorlSince = 0;
  // v0.4.3.2：rua摆线字段回填
  if (state.ruaFav === undefined) state.ruaFav = 0;
  if (state.ruaCountToday === undefined) state.ruaCountToday = 0;
  if (state.ruaClicksToday === undefined) state.ruaClicksToday = 0;
  if (state.ruaDayStart === undefined) state.ruaDayStart = 0;
  if (state.ruaBoostMult === undefined) state.ruaBoostMult = 1;
  if (state.ruaBoostUntil === undefined) state.ruaBoostUntil = 0;
  if (state.ruaBoostCD === undefined) state.ruaBoostCD = 0;
  // v0.5.0.2：VPU 解锁条件达成记录回填（达成一次永久解锁）
  if (!Array.isArray(state.vpuCondMet)) state.vpuCondMet = [];
  // v0.5.1：测试模式字段保留兼容（内容已全员开放，逻辑不再读取）
  if (state.testMode === undefined) state.testMode = false;
  // v0.6.3.2：数值显示方式设置已删除（超 double 上限后工程/对数记数不可用，显示恒为科学计数）；
  // S6 改按页面主题切换判定——清理旧档残留键；spu1 升级移除（免费效果改为 15 次湮灭里程碑直接奖励）
  if (state.settings) delete state.settings.notation;
  delete state.notationSwitches;
  delete state.spu1;
  // 孤儿虚空状态清理：虚空中丢失 A52 的存档会永久软锁
  //（虚空页隐藏、湮灭/自动湮灭/扭曲入口全被阻）。进入虚空时资源已重置，
  // 此处直接清标志即可回到主宇宙（不走 exitVoid——迁移阶段 DOM 未就绪）
  if (state.voidActive && !(state.ach.normal && state.ach.normal.includes("A52"))) {
    state.voidActive = false;
    state.voidRules = [];
  }
  // S02：膨胀进入时刻随存档恢复——正处于膨胀规则（扭曲或虚空规则）中且字段缺失/为 0 时，
  // 以同次进入写入的 annStartReal 恢复（两条进入路径同时写这两个时间）；仍无效则重新计时
  //（倍率从 1 重启，避免旧档 distortEnterAtMs=0 造成的波长倍率天文数字）
  {
    const inExpand = state.distortActive === "expand"
      || (state.voidActive && Array.isArray(state.voidRules) && state.voidRules.includes("expand"));
    if (inExpand && !(typeof state.distortEnterAtMs === "number" && state.distortEnterAtMs > 0)) {
      state.distortEnterAtMs = (typeof state.annStartReal === "number" && state.annStartReal > 0 && state.annStartReal <= Date.now() + 5000)
        ? state.annStartReal : Date.now();
    }
  }
  // 修复离线模拟虚拟时钟污染的存量坏档：时间戳落在未来会使 CD 计时（now - 时间戳）
  // 为负、自动湮灭/自动升级3卡死直至现实时间追上（最长 8h）；归位为当前时刻立即恢复。
  // annFastest 为负（realDur 为负时被错误刷新）同样归零
  {
    const nowMs = Date.now();
    const futureKeys = ["lastAutoAnnAt", "lastAutoUp3At", "annStartReal", "capReachedAt", "zeroGainSince", "bhPulseSince", "bhDistorlSince", "lastPurchaseAt"];
    for (const k of futureKeys) {
      if (typeof state[k] === "number" && isFinite(state[k]) && state[k] > nowMs + 5000) state[k] = nowMs;
    }
    if (typeof state.ruaBoostUntil === "number" && state.ruaBoostUntil > nowMs + 11 * 60 * 1000) state.ruaBoostUntil = 0; // 合法窗口仅 10 分钟
    if (typeof state.ruaBoostCD === "number" && state.ruaBoostCD > nowMs + 61 * 60 * 1000) state.ruaBoostCD = 0;        // 合法 CD 1 小时
    if (typeof state.annFastest === "number" && (!isFinite(state.annFastest) || state.annFastest < 0)) state.annFastest = 0;
  }
  // v0.4.3.2：自动湮灭 CD 升级字段回填
  if (state.autoAnnCDLvl === undefined) state.autoAnnCDLvl = 0;
  // v0.5.0：本次湮灭游戏时长独立累计字段回填
  if (state.annGameElapsed === undefined) state.annGameElapsed = 0;
  // 旧版把 gained=Infinity 记入最好单次奇点/历史（JSON 序列化后为 null）：统计页会显示 ∞。
  // 统一归位为软上限拐点（历史最高获取的实际显示口径）。
  // 注意不能用 !isFinite(null)——null 强转 0 后 isFinite 为 true，必须显式判 typeof
  if (state.annBestSp === undefined || typeof state.annBestSp !== "number" || !isFinite(state.annBestSp)) state.annBestSp = Math.pow(10, Math.log10(1.79e308));
  // annBestSp 的 log 权威回填：旧档无此字段时从 annBestSp 重建（含 Infinity→拐点口径）
  if (state.annBestSpLog === undefined || typeof state.annBestSpLog !== "number" || !isFinite(state.annBestSpLog)) {
    state.annBestSpLog = (state.annBestSp > 0 && isFinite(state.annBestSp)) ? Math.log10(state.annBestSp) : Math.log10(1.79e308);
  }
  if (state.annBestRate === undefined || typeof state.annBestRate !== "number" || !isFinite(state.annBestRate)) state.annBestRate = 0;
  // annBestRate 的 log 权威回填
  if (state.annBestRateLog === undefined || typeof state.annBestRateLog !== "number" || !isFinite(state.annBestRateLog)) {
    state.annBestRateLog = (state.annBestRate > 0 && isFinite(state.annBestRate)) ? Math.log10(state.annBestRate) : NLOG;
  }
  // annGameElapsed 的 log 权威回填（旧档封顶为 MAX_VALUE → 按 MAX_VALUE 的 log 归位）
  if (state.annGameElapsedLog === undefined || typeof state.annGameElapsedLog !== "number" || !isFinite(state.annGameElapsedLog)) {
    state.annGameElapsedLog = (state.annGameElapsed > 0 && isFinite(state.annGameElapsed)) ? Math.log10(state.annGameElapsed) : NLOG;
  }
  if (Array.isArray(state.annHistory)) {
    for (const h of state.annHistory) {
      if (h) {
        if (typeof h.sp !== "number" || !isFinite(h.sp)) h.sp = Math.pow(10, Math.log10(1.79e308));
        if (typeof h.rate !== "number" || !isFinite(h.rate)) h.rate = Math.pow(10, Math.log10(1.79e308));
      }
    }
  }
  // 测试开关不跨会话残留：加载存档时重置（温度无上限的测试状态若被保存，
  // 热反馈失控会让每次湮灭后十几秒就再次到达 Tcap 且不获 Sp）
  if (state.testBreakRules) state.testBreakRules = false;
  // JSON 无法存 Infinity：超 double 的 double 缓存在存档里是 null。
  // 若不恢复，Math.abs(null)=0 会令 tick 误走 double 路径（setU(null+gd) 打塌 logU10），
  // 且各级回填把 null 当 0。统一从 log 权威恢复缓存。
  const fromLog = (lg) => (lg <= NLOG + 1) ? 0 : (lg > 308 ? Infinity : Math.pow(10, lg));
  if (state.U === null || state.U === undefined) state.U = fromLog(getLogU10());
  // v0.6.0.0 恶性 bug 的存档修复：subULog 扣款与 F 判价不一致（e≠1）曾把 U 扣成负数
  //（log 权威写为零哨兵、double 缓存残留负值，频率恒 ≈0 造成软锁）。负 U 无合法语义，重置为湮灭初值
  if (typeof state.U === "number" && state.U < 0) setU(resetU());
  if (state.totalFGained === null || state.totalFGained === undefined) state.totalFGained = fromLog(getLogTotalF());
  if (state.phonons === null || state.phonons === undefined) {
    state.phonons = (state.logDph !== undefined && isFinite(state.logDph) && state.logDph > 0) ? fromLog(state.logDph) : 0;
  }
  // sp/totalSp 同样从 log 权威回填（playTime=Infinity 序列化为 null 后须恢复，
  // 否则 playTime-annStartGame=NaN、购买比较把 null 当 0）
  if (state.sp === null || state.sp === undefined) {
    state.sp = (state.logDsp !== undefined && isFinite(state.logDsp) && state.logDsp > 0) ? fromLog(state.logDsp) : 0;
  }
  if (state.totalSp === null || state.totalSp === undefined) {
    state.totalSp = (state.logDtotal !== undefined && isFinite(state.logDtotal) && state.logDtotal > 0) ? fromLog(state.logDtotal) : 0;
  }
  if (state.playTime === null || state.playTime === undefined) {
    state.playTime = (state.playTimeLog !== undefined && isFinite(state.playTimeLog))
      ? (state.playTimeLog > 308 ? Number.MAX_VALUE : Math.pow(10, state.playTimeLog))
      : 0;
  }
  if (state.maxF === null || state.maxF === undefined) state.maxF = fromLog(getLogMaxF());
  if (state.maxU === null || state.maxU === undefined) state.maxU = fromLog(getLogMaxU());
  if (state.bhMass === null || state.bhMass === undefined) state.bhMass = fromLog(getLogBhMass());
  if (state.virtualParticles === null || state.virtualParticles === undefined) state.virtualParticles = fromLog(getLogVP());
  // v0.5.1：虚空泡沫 log 权威回填（旧档只有 voidVF；JSON 把 Infinity 存为 null 后由 log 重建）
  if (!rawHas("logVoidVF10") || state.logVoidVF10 === undefined || state.logVoidVF10 === null || !isFinite(state.logVoidVF10)) {
    state.logVoidVF10 = (state.voidVF > 0 && isFinite(state.voidVF)) ? Math.log10(state.voidVF) : NLOG;
  }
  if (state.voidVF === null || state.voidVF === undefined) {
    state.voidVF = state.logVoidVF10 > 308 ? Infinity
      : (state.logVoidVF10 <= NLOG + 1 ? 0 : Math.pow(10, state.logVoidVF10));
  }
  // v0.5.1：虚空里程碑与 SVU 字段回填
  if (state.voidBestRules === undefined) state.voidBestRules = 0;
  if (state.svu1SpLog === undefined || !isFinite(state.svu1SpLog)) state.svu1SpLog = NLOG;
  if (state.svu1VpLog === undefined || !isFinite(state.svu1VpLog)) state.svu1VpLog = NLOG;
  if (state.svu1VfLog === undefined || !isFinite(state.svu1VfLog)) state.svu1VfLog = NLOG;
  if (state.svu1Filling === undefined) state.svu1Filling = false;
  if (state.svu2Level === undefined) state.svu2Level = 0;
  // v0.6.0.0：卷缩层字段回填（Object.assign 已补默认，此处处理 null/非有限与缓存恢复）
  if (state.compactions === undefined || !isFinite(state.compactions)) state.compactions = 0;
  if (state.logDss === undefined || !isFinite(state.logDss)) state.logDss = NLOG;
  if (state.logDtotalSS === undefined || !isFinite(state.logDtotalSS)) state.logDtotalSS = NLOG;
  if (state.logBestSS === undefined || !isFinite(state.logBestSS)) state.logBestSS = NLOG;
  if (state.logBestSSRate === undefined || !isFinite(state.logBestSSRate)) state.logBestSSRate = NLOG;
  if (state.logDins === undefined || !isFinite(state.logDins)) state.logDins = NLOG;
  if (state.logDtotalIns === undefined || !isFinite(state.logDtotalIns)) state.logDtotalIns = NLOG;
  if (state.logCM === undefined || !isFinite(state.logCM)) state.logCM = NLOG;
  if (state.insFromF === undefined || !isFinite(state.insFromF)) state.insFromF = 0;
  if (state.insFromSp === undefined || !isFinite(state.insFromSp)) state.insFromSp = 0;
  if (state.insFromSS === undefined || !isFinite(state.insFromSS)) state.insFromSS = 0;
  if (state.tp === undefined || !isFinite(state.tp)) state.tp = 0;
  if (state.tpV === undefined || !isFinite(state.tpV)) state.tpV = 0;
  if (state.tpE === undefined || !isFinite(state.tpE)) state.tpE = 0;
  if (state.tpF === undefined || !isFinite(state.tpF)) state.tpF = 0;
  if (state.theoryNodes === undefined || typeof state.theoryNodes !== "object" || Array.isArray(state.theoryNodes)) state.theoryNodes = {};
  if (state.theoryRespec === undefined) state.theoryRespec = false;
  if (!Array.isArray(state.theoryPresets)) state.theoryPresets = [];
  while (state.theoryPresets.length < 6) state.theoryPresets.push({ name: "PR" + (state.theoryPresets.length + 1), tree: "" });
  state.theoryPresets.length = 6;
  for (let i = 0; i < 6; i++) {
    const p = state.theoryPresets[i];
    if (!p || typeof p !== "object") state.theoryPresets[i] = { name: "PR" + (i + 1), tree: "" };
    else {
      if (typeof p.name !== "string" || !/^[A-Za-z0-9]{1,5}$/.test(p.name)) p.name = "PR" + (i + 1);
      if (typeof p.tree !== "string") p.tree = "";
    }
  }
  // v0.6.3：理论深度与研究系统字段回填
  if (state.theoryDepth === undefined || !isFinite(state.theoryDepth)) state.theoryDepth = 5;
  if (state.ed === undefined || state.ed === null) state.ed = 0;
  if (state.logED === undefined || !isFinite(state.logED)) state.logED = (state.ed > 0 && isFinite(state.ed)) ? clampLog(Math.log10(state.ed)) : NLOG;
  if (state.inf === undefined || state.inf === null) state.inf = 0;
  if (state.logDinf === undefined || !isFinite(state.logDinf)) state.logDinf = (state.inf > 0 && isFinite(state.inf)) ? clampLog(Math.log10(state.inf)) : NLOG;
  if (!Array.isArray(state.researchSel)) state.researchSel = [];
  state.researchSel = state.researchSel.filter(x => x && typeof x.id === "string" && isFinite(x.level) && x.level >= 1);
  if (state.researchPredictSpLog === undefined || !isFinite(state.researchPredictSpLog)) state.researchPredictSpLog = NLOG;
  if (state.researchRun !== null && (typeof state.researchRun !== "object" || !Array.isArray(state.researchRun.exps) || !isFinite(state.researchRun.predictSpLog))) state.researchRun = null;
  if (state.compGameElapsedLog === undefined || !isFinite(state.compGameElapsedLog)) {
    state.compGameElapsedLog = (state.compGameElapsed > 0 && isFinite(state.compGameElapsed)) ? Math.log10(state.compGameElapsed) : NLOG;
  }
  if (state.compFastest === null || state.compFastest === undefined || !isFinite(state.compFastest) || state.compFastest < 0) state.compFastest = 0;
  if (!Array.isArray(state.compHistory)) state.compHistory = [];
  // v0.6.3.2：研究项目 / SVU3 / 本次湮灭最高温度 / 历史最高 VF 回填
  if (!Array.isArray(state.researchBought)) state.researchBought = [];
  state.researchBought = state.researchBought.filter(x => typeof x === "string");
  if (state.researchBest === null || state.researchBest === undefined || typeof state.researchBest !== "object") state.researchBest = {};
  if (state.researchDone === undefined || state.researchDone === null || !isFinite(state.researchDone) || state.researchDone < 0) state.researchDone = 0;
  if (state.insFromVP === undefined || state.insFromVP === null || !isFinite(state.insFromVP) || state.insFromVP < 0) state.insFromVP = 0;
  if (state.sr1InvestLog === undefined || !isFinite(state.sr1InvestLog)) state.sr1InvestLog = NLOG;
  if (state.srActiveId === undefined || state.srActiveId === null || typeof state.srActiveId !== "string") state.srActiveId = "";
  if (state.svu3Rho === undefined || state.svu3Rho === null || !isFinite(state.svu3Rho) || state.svu3Rho < 0) state.svu3Rho = 0;
  if (state.svu3N === undefined || state.svu3N === null || !isFinite(state.svu3N) || state.svu3N < 0) state.svu3N = 0;
  // 节点51「曾购买过」闩锁：defaultState 已给默认 0，老档不会出现 undefined——
  // 直接按「当前拥有 51 即置位」补记（新档购买路径必置位，不存在拥有 51 但 flag=0 的合法状态）
  if (theoryOwned("51")) state.theory51Bought = 1;
  if (state.annMaxTLog === undefined || !isFinite(state.annMaxTLog)) state.annMaxTLog = NLOG;
  // 历史最高持有 VF：仅对缺失/损坏的字段做一次性初始化（取当前持有量）。
  // 不得用「当前持有量」回填已清零的记录——「清空历史最高VF」测试按钮就是要把记录归 0 重测
  if (!rawHas("logVoidVFBest10") || state.logVoidVFBest10 === undefined || !isFinite(state.logVoidVFBest10)) {
    state.logVoidVFBest10 = (state.logVoidVF10 !== undefined && isFinite(state.logVoidVF10)) ? state.logVoidVF10 : NLOG;
  }
  // v0.6.3.2 虚空泡沫机制改造：新增 VF 上限字段。旧机制下持有量即「曾入账的最大结算值」，
  // 迁移直接把旧持有量写入 cap（等价 max(current,cap)，零跳变）——此后 current ≤ cap 恒成立，
  // 更新不会引发 VF 负增长
  if (!rawHas("logVoidVFCap10") || state.logVoidVFCap10 === undefined || !isFinite(state.logVoidVFCap10)) {
    state.logVoidVFCap10 = (state.logVoidVF10 !== undefined && isFinite(state.logVoidVF10)) ? state.logVoidVF10 : NLOG;
  }
  // 补发 A71「乌云」：更新前已完成过实验（ED>0 或拥有 S29 均证明结束过实验）的玩家直接获得
  if (!state.ach.normal.includes("A71")
    && ((state.logED !== undefined && isFinite(state.logED) && state.logED > NLOG + 1) || state.ach.hidden.includes("S29"))) {
    state.ach.normal.push("A71");
  }
  // v0.6.3.2：A23/A24 位置交换（A23=聚变、A24=耦合）——旧档按旧 id→成就映射一次性换回
  // 已达成标记（只换恰持有其一的存档；两个都有/都没有无需处理），闩锁防重复交换
  if (!state.achA2324Swapped) {
    const has23 = state.ach.normal.includes("A23");
    const has24 = state.ach.normal.includes("A24");
    if (has23 !== has24) {
      if (has23) { state.ach.normal = state.ach.normal.filter(x => x !== "A23"); state.ach.normal.push("A24"); }
      else { state.ach.normal = state.ach.normal.filter(x => x !== "A24"); state.ach.normal.push("A23"); }
    }
    state.achA2324Swapped = 1;
  }
  // v0.6.3.2：A31/A32 位置交换（A31=QoL、A32=创生）——同款一次性迁移
  if (!state.achA3132Swapped) {
    const has31 = state.ach.normal.includes("A31");
    const has32 = state.ach.normal.includes("A32");
    if (has31 !== has32) {
      if (has31) { state.ach.normal = state.ach.normal.filter(x => x !== "A31"); state.ach.normal.push("A32"); }
      else { state.ach.normal = state.ach.normal.filter(x => x !== "A32"); state.ach.normal.push("A31"); }
    }
    state.achA3132Swapped = 1;
  }
  // v0.6.0.0：自动化新键合并（旧档 autoOn 缺 sau/sbu/svpu/comp）与阈值 log 权威回填
  state.autoOn = Object.assign(defaultAutoOn(), state.autoOn || {});
  if (state.autoAnnHeldMultLog === undefined || !isFinite(state.autoAnnHeldMultLog)) {
    state.autoAnnHeldMultLog = (typeof state.autoAnnHeldMult === "number" && state.autoAnnHeldMult > 0 && isFinite(state.autoAnnHeldMult))
      ? Math.log10(state.autoAnnHeldMult) : Math.log10(1.1);
  }
  if (state.autoAnnHeldMult === null || state.autoAnnHeldMult === undefined) state.autoAnnHeldMult = fromLog(state.autoAnnHeldMultLog);
  if (state.autoSau === undefined) state.autoSau = 0;
  if (state.autoSbu === undefined) state.autoSbu = 0;
  if (state.autoSvpu === undefined) state.autoSvpu = 0;
  if (state.autoComp === undefined) state.autoComp = 0;
  if (state.autoCompSSLog === undefined || !isFinite(state.autoCompSSLog)) state.autoCompSSLog = NLOG;
  if (state.autoCompSS === null || state.autoCompSS === undefined) state.autoCompSS = fromLog(state.autoCompSSLog);
  // v0.5.1：自动化阈值的 log10 权威回填（支持输入超 double 的阈值）
  if (state.autoUp3MultLog === undefined || !isFinite(state.autoUp3MultLog)) {
    state.autoUp3MultLog = (typeof state.autoUp3Mult === "number" && state.autoUp3Mult > 0 && isFinite(state.autoUp3Mult))
      ? Math.log10(state.autoUp3Mult) : Math.log10(1.1);
  }
  if (state.autoAnnSpLog === undefined || !isFinite(state.autoAnnSpLog)) {
    state.autoAnnSpLog = (typeof state.autoAnnSp === "number" && state.autoAnnSp > 0 && isFinite(state.autoAnnSp))
      ? Math.log10(state.autoAnnSp) : 0;
  }
  // 阈值 double 缓存：超 double 的设定值经 JSON 序列化为 null，从 log 权威恢复
  //（否则重载后输入框显示「—」，看起来像没有保存）
  if (state.autoUp3Mult === null || state.autoUp3Mult === undefined) state.autoUp3Mult = fromLog(state.autoUp3MultLog);
  if (state.autoAnnSp === null || state.autoAnnSp === undefined) state.autoAnnSp = fromLog(state.autoAnnSpLog);
  if (state.ss === null || state.ss === undefined) state.ss = fromLog(getLogSS());
  if (state.totalSS === null || state.totalSS === undefined) state.totalSS = fromLog(getLogTotalSS());
  if (state.ins === null || state.ins === undefined) state.ins = fromLog(getLogIns());
  if (state.totalIns === null || state.totalIns === undefined) state.totalIns = fromLog(getLogTotalIns());
  if (state.cm === null || state.cm === undefined) state.cm = fromLog(getLogCM());
  if (state.compStartReal === undefined || !isFinite(state.compStartReal)) state.compStartReal = 0;
  if (state.up3LastF === null || state.up3LastF === undefined) {
    const lp = getLogUp3LastF();
    state.up3LastF = (lp <= NLOG + 1) ? 0 : fromLog(lp);
  }
  // 存档净化：clampLog 修复前的失控会把 log 权威字段写成天文数字（污染指纹
  // 集中在 [2.3e14, 1e15]：0.23×LOG_CAP 与 LOG_CAP 本体；正常游玩 log ≥1e12
  // 需连续不湮灭挂机十余小时才会触及）。检测即修复：U 重置为湮灭初值，
  // 派生统计跟随，Sp/声子等资源清为对应零值。
  const SANITY_MAX = 1e12;
  const polluted = [state.logU10, state.logL10, state.logTotalF, state.logMaxF, state.logMaxU, state.logDsp, state.logDtotal, state.logDph, state.logUp3LastF, state.logVP, state.logBhMass,
    state.logDss, state.logDtotalSS, state.logBestSS, state.logBestSSRate, state.logDins, state.logDtotalIns, state.logCM, state.compGameElapsedLog, state.logED, state.logDinf]
    .some(v => v !== undefined && v !== null && isFinite(v) && Math.abs(v) >= SANITY_MAX);
  if (polluted) {
    setU(resetU());
    setTotalFGained(resetU());
    state.L = 1; state.logL10 = 0;
    state.maxF = resetU(); state.logMaxF = 2;
    state.maxU = resetU(); state.logMaxU = 2;
    state.minL = 1; state.logMinL = 0;
    setSp(0); setTotalSp(0);
    setPhonons(0);
    setUp3LastF(NLOG);
    setVP(0);
    setBhMass(1);
    setEDLog(NLOG);
    setInfLog(NLOG);
    state.researchRun = null;
    state.up1 = 0; state.up2 = 0; state.up3 = 0; state.meta1 = 0;
    state.pg1 = 0; state.pg2 = 0; state.pg3 = 0;
    state.phFluct = 0; state.phCoupling = 0;
    state.distortActive = "";
  }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const obj = decodeSave(raw);
    state = Object.assign(defaultState(), obj);
    state.settings = Object.assign({ theme: "black", decimals: 3, uiFps: 33, hideLockedRows: true, hideDoneRows: false, offlineEnabled: true }, obj.settings || {});
    state.ach = Object.assign({ normal: [], hidden: [], hiddenRevealed: [] }, obj.ach || {});
    migrateState(obj);
    // 迁移：v0.1 旧存档用 frequency 字段
    if (obj.frequency !== undefined && obj.U === undefined) {
      setU(obj.frequency);
      state.L = 1; state.logL10 = 0;
    }
    if (obj.totalFrequency !== undefined) {
      setTotalFGained(obj.totalFrequency);
    }
    // 校正派生统计下限（log 域，防 maxF/maxU 恒 Infinity、minL 下溢 0）
    {
      const fLog = FLog();
      if (fLog > getLogMaxF()) { state.maxF = F(); state.logMaxF = fLog; }
      if (getLogU10() > getLogMaxU()) { state.maxU = state.U; state.logMaxU = getLogU10(); }
      if (getLogL10() < getLogMinL()) { state.minL = state.L; state.logMinL = getLogL10(); }
    }
    applyTheme(state.settings.theme);
    queueOfflineProgress();
    state.lastTick = Date.now();
    return true;
  } catch (e) {
    console.error("存档读取失败:", e);
    return false;
  }
}

function saveGame() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  state.lastTick = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, encodeSave(state));
    setAutosaveStatus("已自动保存 " + new Date().toLocaleTimeString());
    return true;
  } catch (e) {
    console.error("存档失败:", e);
    setAutosaveStatus("保存失败！");
    return false;
  }
}

function hardReset() {
  if (!confirm("确定要硬重置吗？这将清除当前存档的所有进度！")) return;
  if (!confirm("再次确认：所有进度与成就都将丢失。继续？")) return;
  localStorage.removeItem(SAVE_KEY);
  state = defaultState();
  applyTheme("black");
  saveGame();
  renderAll();
  setAutosaveStatus("已硬重置");
}

// 从文本框导入存档（「从文本框导入」与「从 TXT 文件导入」共用的唯一实现）
function importSaveFromIo() {
  const str = document.getElementById("save-io").value;
  if (!str.trim()) { setAutosaveStatus("文本框为空"); return; }
  try {
    // S9 柚子厨蒸鹅心：在导入存档处输入 0721 并导入
    if (str.trim() === "0721") {
      const newlyGranted = !state.ach.hidden.includes("S9");
      grantHidden("S9");
      updateAchievementsUI();
      if (newlyGranted) setAutosaveStatus("隐藏成就达成：柚子厨蒸鹅心");
      else setAutosaveStatus("导入失败：存档无效");
      return;
    }
    const obj = decodeSave(str);
    state = Object.assign(defaultState(), obj);
    state.settings = Object.assign({ theme: "black", decimals: 3, uiFps: 33, hideLockedRows: true, hideDoneRows: false, offlineEnabled: true }, obj.settings || {});
    state.ach = Object.assign({ normal: [], hidden: [], hiddenRevealed: [] }, obj.ach || {});
    migrateState(obj);
    // 重置瞬时成就状态（与 init 一致）：旧档携带的计时数组会干扰 S3/S5/S6 判定
    state.hiddenClicks = [];
    state.metaClicks = [];
    state.themeSwitches = [Date.now()];
    state.phToggles = [];
    if (obj.frequency !== undefined && obj.U === undefined) { setU(obj.frequency); state.L = 1; state.logL10 = 0; }
    if (obj.totalFrequency !== undefined) setTotalFGained(obj.totalFrequency);
    queueOfflineProgress();
    state.lastTick = Date.now();
    applyTheme(state.settings.theme);
    applyDecimals(state.settings.decimals);
    processPendingOffline(); // 导入发生在 init 之后：离线结算须就地执行
    saveGame();
    renderAll();
    setAutosaveStatus("已导入存档");
  } catch { setAutosaveStatus("导入失败：存档无效"); }
}

// ---------- Save slots ----------
function slotKey(i) { return SLOT_KEY_PREFIX + "_" + i; }
// 槽内存档的波长指数 e（用该存档自己的 CM；无卷缩数据时为 1）
function slotWavelengthExp(cmLog) {
  if (cmLog === undefined || cmLog === null || !isFinite(cmLog) || cmLog <= NLOG + 1) return 1;
  const c = cmLog <= 15 ? Math.log10(Math.pow(10, cmLog) + 1) : cmLog; // lg(CM+1)
  return 1 + Math.log10(1 + c / 3) / 10;
}
function getSlotInfo(i) {
  try {
    const raw = localStorage.getItem(slotKey(i));
    if (!raw) return null;
    const obj = decodeSave(raw);
    // 槽内存档可能超 double：预览频率用 log 域计算（双精度除法会溢出为 ∞）
    const uLog = (obj.logU10 !== undefined && isFinite(obj.logU10)) ? obj.logU10
      : (obj.U > 0 ? (isFinite(obj.U) ? Math.log10(obj.U) : 308) : 1);
    const lLog = (obj.logL10 !== undefined && isFinite(obj.logL10)) ? obj.logL10
      : (obj.L > 0 ? Math.log10(obj.L) : 0);
    // 预览频率使用该存档自己的维度折叠器指数（F = U/L^e，与加载后的实际频率一致）
    const cmLog = (obj.logCM !== undefined && obj.logCM !== null && isFinite(obj.logCM) && obj.logCM > NLOG + 1)
      ? obj.logCM
      : (obj.cm > 0 && isFinite(obj.cm)) ? Math.log10(obj.cm) : NLOG;
    return { freqLog: clampLog(uLog - slotWavelengthExp(cmLog) * lLog), realTime: obj.realTime || obj.playTime || 0, empty: false };
  } catch { return null; }
}
function saveToSlot(i) {
  state.lastTick = Date.now();
  try {
    localStorage.setItem(slotKey(i), encodeSave(state));
    currentSlot = i; // 当前游戏已存入槽 i，高亮跟随（否则刷新后回到槽 0）
    setAutosaveStatus(`已保存到存档槽 ${i + 1}`);
    renderSlots();
  } catch { setAutosaveStatus("保存到槽失败！"); }
}
function loadFromSlot(i) {
  try {
    const raw = localStorage.getItem(slotKey(i));
    if (!raw) { setAutosaveStatus("该槽为空"); return; }
    const obj = decodeSave(raw);
    state = Object.assign(defaultState(), obj);
    state.settings = Object.assign({ theme: "black", decimals: 3, uiFps: 33, hideLockedRows: true, hideDoneRows: false, offlineEnabled: true }, obj.settings || {});
    state.ach = Object.assign({ normal: [], hidden: [], hiddenRevealed: [] }, obj.ach || {});
    migrateState(obj);
    queueOfflineProgress();
    state.lastTick = Date.now();
    currentSlot = i;
    applyTheme(state.settings.theme);
    processPendingOffline(); // 槽位加载发生在 init 之后：离线结算须就地执行
    saveGame();
    renderAll();
    setAutosaveStatus(`已从存档槽 ${i + 1} 载入`);
  } catch { setAutosaveStatus("读取槽失败！"); }
}
function deleteSlot(i) {
  if (!confirm(`确定删除「${getSlotName(i)}」的存档？`)) return;
  localStorage.removeItem(slotKey(i));
  renderSlots();
  setAutosaveStatus(`已删除「${getSlotName(i)}」的存档`);
}
// 重命名存档槽（点击槽名；留空恢复默认，最长 20 字）
function renameSlot(i) {
  const cur = getSlotName(i);
  const def = cur.startsWith("存档槽 ") ? "" : cur;
  const name = prompt(`给「存档槽 ${i + 1}」命名（留空恢复默认）：`, def);
  if (name === null) return; // 取消
  setSlotName(i, name);
  renderSlots();
  setAutosaveStatus(name.trim() ? `存档槽已命名为「${name.trim()}」` : "已恢复默认槽名");
}
function renderSlots() {
  const list = document.getElementById("slot-list");
  list.innerHTML = "";
  for (let i = 0; i < SLOT_COUNT; i++) {
    const info = getSlotInfo(i);
    const row = document.createElement("div");
    row.className = "slot" + (i === currentSlot ? " current" : "");
    const name = document.createElement("div"); name.className = "slot-name"; name.textContent = getSlotName(i);
    name.title = "点击重命名";
    name.style.cursor = "pointer";
    name.addEventListener("click", () => renameSlot(i));
    const meta = document.createElement("div"); meta.className = "slot-info";
    meta.textContent = (info && !info.empty) ? `${fmtLog(info.freqLog)} Hz · ${fmtTime(info.realTime)}` : "（空）";
    const actions = document.createElement("div"); actions.className = "slot-actions";
    const b1 = document.createElement("button"); b1.textContent = "保存"; b1.onclick = () => saveToSlot(i);
    const b2 = document.createElement("button"); b2.textContent = "读取"; b2.onclick = () => loadFromSlot(i);
    const b3 = document.createElement("button"); b3.textContent = "删除"; b3.className = "danger-btn"; b3.onclick = () => deleteSlot(i);
    actions.append(b1, b2, b3);
    row.append(name, meta, actions);
    list.appendChild(row);
  }
}
