// log-math / save-codec 不变式回归（Node 可跑，依赖仓库根的 break_infinity.js 作独立参照实现）。
// 用法：node tests/log-math-invariants.mjs
// 覆盖：clampLog 边界、logAddLogs/logAddSigned 对 Decimal 参照的随机差分、
//       哨兵/饱和语义、WI1 编解码 Unicode 往返。全程纯计算，不触碰 DOM 与存档。
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('..', import.meta.url).pathname;
globalThis.self = globalThis; // break_infinity 的 UMD 在 ESM 下依赖 self
eval(readFileSync(new URL('../break_infinity.js', import.meta.url), 'utf8'));
const gameSource = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
// 只取 log-math/save-codec 两个工厂与其常量（避免引入整份游戏逻辑）
const NLOG = -1e9, LOG_CAP = 1e15, LOG_FALLBACK = 1e290;
const grab = (name) => {
  const start = gameSource.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`missing ${name}`);
  let p = gameSource.indexOf('(', start), parens = 0;
  for (let j = p; j < gameSource.length; j++) {
    if (gameSource[j] === '(') parens++;
    else if (gameSource[j] === ')') { parens--; if (parens === 0) { p = j; break; } }
  }
  const bodyStart = gameSource.indexOf('{', p);
  let depth = 0;
  for (let j = bodyStart; j < gameSource.length; j++) {
    if (gameSource[j] === '{') depth++;
    else if (gameSource[j] === '}') { depth--; if (depth === 0) return gameSource.slice(start, j + 1); }
  }
  throw new Error(`unbalanced ${name}`);
};
const factories = [
  grab('createLogMath'), grab('createSaveCodec'),
  'globalThis.logMath = createLogMath({ NLOG: -1e9, LOG_CAP: 1e15, LOG_FALLBACK: 1e290 });' +
  'globalThis.codec = createSaveCodec(globalThis);' +
  'globalThis.clampLog = logMath.clampLog; globalThis.logAddLogs = logMath.logAddLogs;' +
  'globalThis.logAddSigned = logMath.logAddSigned; globalThis.cmpGE = logMath.cmpGE; globalThis.cmpLT = logMath.cmpLT;' +
  'globalThis.encodeSave = codec.encodeSave; globalThis.decodeSave = codec.decodeSave;',
].join('\n');
const sandboxIntro = `
  const logMath = createLogMath({ NLOG: -1e9, LOG_CAP: 1e15, LOG_FALLBACK: 1e290 });
  const codec = createSaveCodec(globalThis);
`;
eval(sandboxIntro + factories);

let fails = 0;
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); fails = 1; } else console.log('ok:', msg); };
const near = (a, b, e) => Math.abs(a - b) < (e ?? 1e-9);
const REF = globalThis.Decimal;

// —— clampLog 边界 ——
assert(logMath.clampLog(-Infinity) === NLOG, 'clampLog(-Inf) → NLOG');
assert(logMath.clampLog(NaN) === NLOG, 'clampLog(NaN) → NLOG');
assert(logMath.clampLog(Infinity) === LOG_CAP, 'clampLog(+Inf) → LOG_CAP');
assert(logMath.clampLog(5) === 5 && logMath.clampLog(0) === 0, 'clampLog 有限值原样');

// —— logAddLogs/logAddSigned 随机差分（vs Decimal 独立参照）——
// 随机对：覆盖常规、跨量级、哨兵、饱和四类
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return (t ^ t >>> 14) >>> 0;
  };
}
const gen = mulberry32(20260927);
const pick = () => {
  const r = gen() / 2147483648;
  if (r < 0.15) return NLOG + (gen() % 10);                       // 哨兵邻域
  if (r < 0.30) return 100000 - (gen() % 50);                     // 近 LOG_CAP
  if (r < 0.45) return -5 + (gen() % 10);                         // 小值
  return (gen() / 2147483648) * 700 - 50;                          // 一般域
};
let checked = 0;
for (let i = 0; i < 300; i++) {
  const la = pick(), lb = pick();
  const got = logAddLogs(la, lb);
  // Decimal 参照：任一端为哨兵/饱和时跳过（参照无法表示）
  if (la <= NLOG + 1 || lb <= NLOG + 1 || la >= LOG_CAP || lb >= LOG_CAP) continue;
  const ref = REF.add(REF.pow(10, la), REF.pow(10, lb)).log10();
  if (!Number.isFinite(ref)) continue;
  checked++;
  if (!near(got, ref, 1e-9)) { assert(false, `logAddLogs(${la},${lb}) got=${got} ref=${ref}`); }
}
assert(checked > 200, `logAddLogs 随机差分 ${checked} 组全部一致`);
let checkedS = 0;
for (let i = 0; i < 300; i++) {
  const la = pick(), lb = pick(); const sa = gen() % 2 ? 1 : -1, sb = gen() % 2 ? 1 : -1;
  if (la <= NLOG + 1 || lb <= NLOG + 1 || la >= LOG_CAP || lb >= LOG_CAP) continue;
  const got = logAddSigned(la, sa, lb, sb);
  const ref = REF.add(REF.pow(10, la) * sa, REF.pow(10, lb) * sb);
  // 参照不可表示（break_infinity 对极端 pow 的边界标记 9e15）时跳过该用例
  const rl = ref.abs().log10();
  if (!Number.isFinite(rl) || Math.abs(rl) > 1e12) continue;
  checkedS++;
  if (!near(got.log, rl, 1e-9) || got.sign !== Math.sign(ref.s)) {
    assert(false, `logAddSigned(${la},${sa},${lb},${sb}) got=${JSON.stringify(got)} ref lg=${rl} sign=${Math.sign(ref.s)}`);
  }
}


// —— WI1 编解码往返 ——
const roundtrip = (obj) => codec.decodeSave(codec.encodeSave(obj));
const sample = { version: '0.6.3.2', s: '中文✓",引号', n: 1.5, arr: [1, [2]], flag: true };
const rt = roundtrip(sample); assert(JSON.stringify(rt) === JSON.stringify(sample), '编解码 Unicode/结构往返');
assert(codec.encodeSave(sample).startsWith('WI1-'), '编码带 WI1- 前缀');
assert(codec.decodeSave('  ' + codec.encodeSave(sample)) .version === '0.6.3.2', '解码容忍首尾空白与前缀');

console.log(fails ? '存在失败' : '全部通过');
process.exitCode = fails;
