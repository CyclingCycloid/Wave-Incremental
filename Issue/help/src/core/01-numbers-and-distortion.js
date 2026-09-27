// ---------- 扭曲宇宙（v0.4.2.1 测试）----------
// 进入扭曲宇宙会立刻湮灭重置；达到该宇宙的普朗克温度即可湮灭它（首杀奖励 Sp 获取 ×2）。
// 宇宙内湮灭不获得 Sp；未达标时点击湮灭按钮 = 退出该宇宙。
const DISTORT_UNIVERSES = [
  {
    id: "rigid", name: "刚性",
    desc: "无法缩短波长，且无法购买声子升级 3",
    tp: 1e100,
  },
  {
    id: "expand", name: "膨胀",
    desc: "波速获取指数随时间下降（每秒 -0.1，到 0 为止），波长每秒 ×1e20",
    tp: 1e300,
  },
  {
    id: "directed", name: "定向",
    desc: "每刻有 50% 概率波速获取变为相反数（波速有 0 的硬下限）；声波耦合失效",
    tp: 1e70,
  },
  {
    id: "cooldown", name: "冷却",
    desc: "波速获取受到指数削弱（最高 0.75 次方），购买任何升级后指数在 15 秒内从 0 线性回复到 0.75；进入时即视为已完全回复",
    tp: 1e90,
  },
  {
    id: "inflation", name: "滞涨",
    desc: "前奇点资源不消耗被禁用，价格折算即刻生效且变得更强，声子升级价格平方，波速获取和温度开平方根",
    tp: 1e100,
  },
  {
    id: "adiabatic", name: "热寂",
    desc: "热涨落与声子涨落无效，声波耦合无效，无法购买声子发生器效率，温度以 ^-0.5 的倍率除波速获取",
    tp: 1e155,
  },
  {
    id: "narrow", name: "狭窄",
    desc: "你一共只能购买十次升级，购买类自动化禁用（自动湮灭可用）",
    tp: 1e165,
  },
  {
    id: "simple", name: "简洁",
    desc: "基础波速获取固定为 1 m/s²，波动升级 1/2 与声子升级 3 无效，热涨落无效，声子数始终为 1，升级 3 效果变为原来的平方根，奇点波速效果加成削弱，普朗克常数倍率无效",
    tp: 1e100,
  },
];

function inDistort(id) {
  // 里程碑3「度规塌缩」：定向的削弱在虚空中不再生效（VF 结算的乘数与生效数仍按 voidRules 保留）
  if (id === "directed" && state.voidActive && voidMilestone3()) return false;
  // 虚空挑战：选中的扭曲宇宙削弱同时生效（多削弱叠加）
  return state.distortActive === id || (state.voidActive && state.voidRules.includes(id));
}

// ---------- 资源 Decimal 双表示（3DA 起）----------
// 权威 log10 表示，永不溢出；state.X 为 double 缓存（超 ±1.8e308 时失真但不崩）
function getLogSp() {
  if (state.logDsp !== undefined && isFinite(state.logDsp)) return clampLog(state.logDsp);
  return state.sp > 0 ? clampLog(Math.log10(state.sp)) : 0;
}
function setSp(v) {
  state.sp = v;
  state.logDsp = v > 0 ? clampLog(Math.log10(v)) : 0;
}
function getLogTotalSp() {
  if (state.logDtotal !== undefined && isFinite(state.logDtotal)) return clampLog(state.logDtotal);
  return state.totalSp > 0 ? clampLog(Math.log10(state.totalSp)) : 0;
}
function setTotalSp(v) {
  state.totalSp = v;
  state.logDtotal = v > 0 ? clampLog(Math.log10(v)) : 0;
}
function getLogPhonons() {
  // 声子为 0 时返回 -Infinity（乘积为 0），而非 0（会被当作 1）
  if (state.logDph !== undefined && isFinite(state.logDph)) {
    return state.phonons > 0 ? clampLog(state.logDph) : -Infinity;
  }
  return state.phonons > 0 ? clampLog(Math.log10(state.phonons)) : -Infinity;
}
function setPhonons(v) {
  state.phonons = v;
  state.logDph = (v > 0 && isFinite(v)) ? clampLog(Math.log10(v)) : (v > 0 ? LOG_CAP : 0);
}
// 由 log10(phonons) 直接设（log 域路径）
function setPhononsLog(logP) {
  state.logDph = clampLog(logP);
  state.phonons = (logP <= NLOG + 1) ? 0 : (logP > 308 ? Infinity : Math.pow(10, logP));
}
// ---------- log 域加减助手（Sp/声子/VP）----------
// 背景：sp/phonons 的 double 缓存可为 Infinity（log 权威仍有限）。裸算
// Infinity±有限=Infinity 会把权威 log 写成 LOG_CAP（触发加载时的污染全清），
// Infinity-Infinity=NaN 会把资源清零并让后续比较恒假/恒真。加减一律走 log 域。
// sp += 10^addLog。sp=0 时零哨兵 logDsp=0 字面量并非 log10(0)，须先归 -Infinity 再加
function addSpLog(addLog) {
  const cur = state.sp > 0 ? getLogSp() : -Infinity;
  setSpLogRaw(logAddLogs(cur, addLog));
}
// sp -= 10^costLog（调用前须已用 cmpGE 确认可负担；浮点相消为负按 0 处理）
function subSpLog(costLog) {
  const cur = state.sp > 0 ? getLogSp() : -Infinity;
  const r = logAddSigned(cur, 1, costLog, -1);
  setSpLogRaw(r.sign < 0 ? NLOG : r.log);
}
// totalSp += 10^addLog（零哨兵同 sp）
function addTotalSpLog(addLog) {
  const cur = state.totalSp > 0 ? getLogTotalSp() : -Infinity;
  const nLog = logAddLogs(cur, addLog);
  state.logDtotal = nLog <= NLOG + 1 ? 0 : nLog;
  state.totalSp = nLog <= NLOG + 1 ? 0 : (nLog > 308 ? Infinity : Math.pow(10, nLog));
}
// 由 log10(sp) 直接写双表示（log 权威；零延续 setSp 的 logDsp=0 零哨兵）
function setSpLogRaw(nLog) {
  nLog = clampLog(nLog);
  state.logDsp = nLog <= NLOG + 1 ? 0 : nLog;
  state.sp = nLog <= NLOG + 1 ? 0 : (nLog > 308 ? Infinity : Math.pow(10, nLog));
}
// phonons -= 10^costLog（调用前须已用 cmpGE/cmpLT 确认可负担）
function subPhononsLog(costLog) {
  const r = logAddSigned(getLogPhonons(), 1, costLog, -1);
  if (r.sign < 0) setPhonons(0); else setPhononsLog(r.log);
}
// VP -= 10^costLog（调用前须已用 cmpGE/cmpLT 确认可负担）
function subVPLog(costLog) {
  const r = logAddSigned(getLogVP(), 1, costLog, -1);
  if (r.sign < 0) setVP(0); else setVPLog(r.log);
}
// Sp 可负担性判断（购买与按钮显示共用口径；sp 缓存 Infinity 或价格超 double 时正确）
function spAfford(cost) { return cmpGE(state.sp, cost, getLogSp(), Math.log10(cost)); }
// ---------- U / 累计频率 / 极值 的双表示（v0.4.2.5 完整接入）----------
// U：权威 logU10（U=0 时存 NLOG 哨兵）；double 缓存 U 在极端大时为 Infinity、极端小时为 0，读取走 log
function getLogU10() {
  if (state.logU10 !== undefined && isFinite(state.logU10)) return clampLog(state.logU10);
  return state.U > 0 ? clampLog(Math.log10(state.U)) : NLOG;
}
// 由 double 设 U（double 路径，值在范围内）。v 非有限正数时仅刷新 double 缓存，保留 logU10 权威（不压成 308）
function setU(v) {
  state.U = v;
  if (v > 0 && isFinite(v)) state.logU10 = clampLog(Math.log10(v));
  else if (v <= 0) state.logU10 = NLOG;
  // v>0 但非有限（Infinity）：不改动 logU10，保留先前权威值，仅 double 缓存为 Infinity
}
// 由 log10(U) 直接设 U（log 域路径，U 超 double 时 double 缓存为 Infinity）
function setULog(logU) {
  state.logU10 = clampLog(logU);
  state.U = (logU <= NLOG + 1) ? 0 : (logU > 308 ? Infinity : Math.pow(10, logU));
}
// 购买扣款 U -= cost·(有效波长)^e（costLog 为 log10(cost)，价格以 F 计）。
// F = U/(L·膨胀倍率)^e：扣款必须按有效波长的 e 次幂计，F 才恰好下降 cost——
// e≠1 时若仍扣 cost·L，扣款额与「F≥价格」的判定脱钩（L<1 时每次购买都超额扣款，
// 自动化连买会把 U 拖成负数：频率显示 Xe-299、温度 0 的恶性 bug 根因）
function subULog(costLog) {
  const uLog = getLogU10();
  const wExp = wavelengthExp();
  const ml = distortLModLog();
  // e=1 且无膨胀倍率时与旧公式逐位一致（10^costLog·L）；否则按有效波长 e 次幂
  const legacy = wExp === 1 && ml === 0;
  const subLog = legacy ? costLog + getLogL10() : clampLog(costLog + wExp * (getLogL10() + ml));
  // double 路径必须保证 U 与扣款额均可表示：subLog ≥ 308 时 10^subLog 为 Infinity，
  // 会把 U 减成 -Infinity/NaN 摧毁 logU10 权威，须退 log 域
  if (isFinite(state.U) && state.U >= 0 && state.U < LOG_FALLBACK && costLog < 308 && subLog < 308) {
    setU(legacy ? state.U - Math.pow(10, costLog) * state.L : state.U - Math.pow(10, subLog));
  } else {
    // log 域：U - cost·(有效波长)^e（同号相减）
    const r = logAddSigned(uLog, 1, subLog, -1);
    if (r.sign < 0) setULog(NLOG); else setULog(r.log);
  }
}
// 累计频率：权威 logTotalF
function getLogTotalF() {
  if (state.logTotalF !== undefined && isFinite(state.logTotalF)) return clampLog(state.logTotalF);
  return state.totalFGained > 0 ? clampLog(Math.log10(state.totalFGained)) : NLOG;
}
function setTotalFGained(v) {
  state.totalFGained = v;
  state.logTotalF = (v > 0 && isFinite(v)) ? clampLog(Math.log10(v)) : (v > 0 ? LOG_CAP : NLOG);
}
function setTotalFGainedLog(logF) {
  state.logTotalF = clampLog(logF);
  state.totalFGained = (logF <= NLOG + 1) ? 0 : (logF > 308 ? Infinity : Math.pow(10, logF));
}
// 统计极值：log 权威（maxU 恒 Infinity / minL 下溢 0 的丢精度在此修复）
function getLogMaxF() { return (state.logMaxF !== undefined && isFinite(state.logMaxF)) ? state.logMaxF : Math.log10(Math.max(state.maxF, 1e-300)); }
function getLogMaxU() { return (state.logMaxU !== undefined && isFinite(state.logMaxU)) ? state.logMaxU : Math.log10(Math.max(state.maxU, 1e-300)); }
function getLogMinL() { return (state.logMinL !== undefined && isFinite(state.logMinL)) ? state.logMinL : Math.log10(Math.max(state.minL || 1, 1e-300)); }
// 升级3 历史峰值频率：权威 logUp3LastF（替代旧版用 Infinity 哨兵导致的 Infinity-vs-Infinity 死锁）
function getLogUp3LastF() {
  if (state.logUp3LastF !== undefined && isFinite(state.logUp3LastF) && state.logUp3LastF > NLOG + 1) return state.logUp3LastF;
  return state.up3LastF > 0 ? (isFinite(state.up3LastF) ? Math.log10(state.up3LastF) : 308) : NLOG;
}
function setUp3LastF(fLog) {
  // fLog：峰值的 log10（始终有限，FLog 不再返回 Infinity）
  state.logUp3LastF = isFinite(fLog) ? fLog : 308;
  state.up3LastF = fLog > 308 ? Infinity : (fLog <= 0 ? 0 : Math.pow(10, fLog)); // double 缓存（>1e308 存 Infinity）
}
// ---------- log 域算术助手 ----------
// 具体实现见 src/modules/log-math.js；此处保留原段落位置作为审查锚点。
