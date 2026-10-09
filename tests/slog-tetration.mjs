// slog-tetration 模块回归（Node 可跑，依赖仓库根的 break_infinity.js 作 Decimal 注入）。
// 用法：node tests/slog-tetration.mjs
// 覆盖：slog2/slog10 整数高度精确点、小值/负枝、超大输入（字符串/Decimal）与 tet 反演往返、
//       tet2/tet10 整数/分数高度、超范围/畸形输入抛错。全程纯计算，不触碰 DOM 与存档。
import { readFileSync } from 'node:fs';

globalThis.self = globalThis; // break_infinity 的 UMD 在 ESM 下依赖 self
eval(readFileSync(new URL('../break_infinity.js', import.meta.url), 'utf8'));
eval(readFileSync(new URL('../src/modules/slog-tetration.js', import.meta.url), 'utf8') +
  '\n;globalThis.__slogTet = createSlogTetration(globalThis);');
const { slog2, slog10, tet2, tet10 } = globalThis.__slogTet;
const Decimal = globalThis.Decimal;

let fails = 0;
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); fails = 1; } else console.log('ok:', msg); };
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

// —— slog2 整数高度精确点（2 的幂链逐级 log2 后全走 localSlog 的精确捷径）——
assert(slog2(1) === 0, 'slog2(1)=0');
assert(slog2(2) === 1, 'slog2(2)=1');
assert(slog2(4) === 2, 'slog2(4)=2');
assert(slog2(16) === 3, 'slog2(16)=3');
assert(slog2(65536) === 4, 'slog2(65536)=4');
assert(slog2(0) === -1, 'slog2(0)=-1');
assert(slog2(-2000) === -2, 'slog2(-2000)=-2（低于 2^x 分辨率下限）');
assert(slog2(0.5) > -1 && slog2(0.5) < 0, 'slog2(0.5) ∈ (-1, 0)');

// —— slog2 超大输入（字符串/Decimal）与 tet 反演往返 ——
const sBig = slog2('1e1000');
assert(Number.isFinite(sBig) && sBig > 4 && sBig < 5.5, 'slog2("1e1000") 有限且 ≈4.85（超 double 输入不溢出）');
const rBig = tet2(sBig);
assert(Math.abs(rBig.log10() - 1000) < 0.1, 'tet2(slog2("1e1000")) 回到 1e1000（log10 差 <0.1）');
assert(Math.abs(slog2(new Decimal('1e100')) - slog2('1e100')) < 1e-12, 'slog2 接受 Decimal 输入且与字符串一致');
const r300 = tet2(slog2(1e300)).toNumber();
assert(Math.abs(r300 / 1e300 - 1) < 1e-6, 'tet2(slog2(1e300)) 相对往返误差 <1e-6');

// —— tet2 整数/分数高度 ——
assert(Math.abs(tet2(3).toNumber() - 16) < 1e-9, 'tet2(3)=16');
assert(tet2(4).toNumber() === 65536, 'tet2(4)=65536');
const t5 = tet2(5);
assert(Math.abs(t5.exponent + Math.log10(t5.mantissa) - 65536 * Math.log10(2)) < 0.01,
  'tet2(5)=2^65536≈10^19728.302（lg 取 exponent+log10(mantissa)，break_infinity 指数为整数部分）');
assert(Math.abs(tet2(0.5).toNumber() - 1.4587818160364) < 1e-6, 'tet2(0.5)≈1.4587818160');
assert(Math.abs(slog2(tet2(0.5).toNumber()) - 0.5) < 1e-6, 'slog2(tet2(0.5)) 往返 ≈0.5');

// —— slog10（基 10 近似精度较低，保守容差）——
assert(slog10(1) === 0, 'slog10(1)=0');
assert(slog10(10) === 1, 'slog10(10)=1');
assert(slog10('1e10') === 2, 'slog10("1e10")=2（10^10 = 10^^3，log 链全走精确捷径）');
assert(Math.abs(slog10(100) - slog10(2) - 1) < 1e-12, 'slog10(100)=slog10(2)+1（函数方程 f(10^x)=f(x)+1）');
assert(slog10(2) > 0.3 && slog10(2) < 0.5, 'slog10(2) ∈ (0.3, 0.5)');
const s10Big = slog10('1e1000000');
assert(Number.isFinite(s10Big) && s10Big > 2 && s10Big < 4, 'slog10("1e1000000") 有限且在 (2,4)');
assert(Math.abs(tet10(2).toNumber() - 1e10) < 1, 'tet10(2)=1e10');
assert(Math.abs(tet10(3).log10() - 1e10) / 1e10 < 1e-9, 'tet10(3)=10^(1e10)（结果的对数≈1e10）');
assert(Math.abs(slog10(tet10(0.5)) - 0.5) < 1e-3, 'slog10(tet10(0.5)) 往返 ≈0.5');

// —— 抛错边界 ——
assert(throws(() => tet2(6)), 'tet2(6) 超 break_infinity 指数范围 → 抛错');
assert(throws(() => tet10(4)), 'tet10(4) 超范围 → 抛错');
assert(throws(() => tet2(-2)), 'height ≤ -2 → 抛错（实数枝要求 > -2）');
assert(throws(() => slog2('1e1000x')), '畸形字符串 → 抛错（拒绝 parseFloat 静默截断）');
assert(throws(() => slog2(Infinity)), 'Infinity 输入 → 抛错');

console.log(fails ? 'slog-tetration: FAIL' : 'slog-tetration: ALL PASS');
process.exit(fails);
