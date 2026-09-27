/** Pure log-domain arithmetic. Constants are supplied by the game schema. */
function createLogMath({ NLOG, LOG_CAP, LOG_FALLBACK }) {
  function clampLog(v) {
    if (v === -Infinity || v !== v || v < NLOG) return NLOG;
    if (v === Infinity || v > LOG_CAP) return LOG_CAP;
    return v;
  }

  function logAddLogs(la, lb) {
    la = clampLog(la); lb = clampLog(lb);
    if (la === -Infinity) return lb;
    if (lb === -Infinity) return la;
    const mx = Math.max(la, lb), mn = Math.min(la, lb);
    if (mn <= NLOG + 1) return mx;
    return clampLog(mx + Math.log10(1 + Math.pow(10, mn - mx)));
  }

  function logAddSigned(la, sa, lb, sb) {
    la = clampLog(la); lb = clampLog(lb);
    if (la <= NLOG + 1) return { log: lb, sign: sb };
    if (lb <= NLOG + 1) return { log: la, sign: sa };
    if (sa === sb) return { log: logAddLogs(la, lb), sign: sa };
    if (la >= lb) return { log: clampLog(la + Math.log10(1 - Math.pow(10, lb - la))), sign: sa };
    return { log: clampLog(lb + Math.log10(1 - Math.pow(10, la - lb))), sign: sb };
  }

  function cmpGE(a, b, aLog, bLog) {
    if (isFinite(a) && isFinite(b) && a < LOG_FALLBACK && b < LOG_FALLBACK) return a >= b;
    return aLog >= bLog;
  }

  function cmpLT(a, b, aLog, bLog) { return !cmpGE(a, b, aLog, bLog); }

  return Object.freeze({ clampLog, logAddLogs, logAddSigned, cmpGE, cmpLT });
}
