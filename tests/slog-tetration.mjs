// slog-tetration 模块回归（Node 可跑，依赖仓库根的 break_infinity.js 作 Decimal 注入）。
// 用法：node tests/slog-tetration.mjs
// 覆盖：slog2/slog10 整数高度锚点、小值/负枝、超大输入（字符串/Decimal/fromLog10）与
//       tet 反演往返、tet2/tet10 整数/分数高度、Log10 接口族（.log10/.shiftLog10，
//       含 README 参考值）、超范围/畸形输入抛错。全程纯计算，不触碰 DOM 与存档。
// 注：整数锚点（如 slog2(4)=2）走 DD 运算链可能有 1ulp 漂移，统一用 1e-12 容差断言。
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
const near = (a, b, e) => Math.abs(a - b) < (e ?? 1e-12);

// —— slog2 整数高度锚点（2 的幂链）——
assert(slog2(1) === 0, 'slog2(1)=0');
assert(near(slog2(2), 1), 'slog2(2)=1');
assert(near(slog2(4), 2), 'slog2(4)=2');
assert(near(slog2(16), 3), 'slog2(16)=3');
assert(near(slog2(65536), 4), 'slog2(65536)=4');
assert(slog2(0) === -1, 'slog2(0)=-1');
assert(slog2(-2000) === -2, 'slog2(-2000)=-2（低于 2^x 分辨率下限）');
assert(slog2(0.5) > -1 && slog2(0.5) < 0, 'slog2(0.5) ∈ (-1, 0)');

// —— slog2 超大输入与 tet 反演往返 ——
const sBig = slog2('1e1000');
assert(Number.isFinite(sBig) && sBig > 4 && sBig < 5.5, 'slog2("1e1000") 有限且 ≈4.85（超 double 输入不溢出）');
const rBig = tet2(sBig);
assert(Math.abs(rBig.log10() - 1000) < 0.1, 'tet2(slog2("1e1000")) 回到 1e1000（log10 差 <0.1）');
assert(near(slog2(new Decimal('1e100')), slog2('1e100')), 'slog2 接受 Decimal 输入且与字符串一致');
const r300 = tet2(slog2(1e300)).toNumber();
assert(Math.abs(r300 / 1e300 - 1) < 1e-6, 'tet2(slog2(1e300)) 相对往返误差 <1e-6');

// —— tet2 整数/分数高度 ——
assert(near(tet2(3).toNumber(), 16, 1e-9), 'tet2(3)=16');
assert(tet2(4).toNumber() === 65536, 'tet2(4)=65536（整数高度走 Decimal 幂链保精确）');
assert(Math.abs(tet2(5).exponent + Math.log10(tet2(5).mantissa) - 65536 * Math.log10(2)) < 0.01,
  'tet2(5)=2^65536≈10^19728.302');
assert(Math.abs(tet2(0.5).toNumber() - 1.4587818160364) < 1e-6, 'tet2(0.5)≈1.4587818160');
assert(Math.abs(slog2(tet2(0.5).toNumber()) - 0.5) < 1e-6, 'slog2(tet2(0.5)) 往返 ≈0.5');

// —— slog10（基 10）——
assert(slog10(1) === 0, 'slog10(1)=0');
assert(near(slog10(10), 1), 'slog10(10)=1');
assert(near(slog10('1e10'), 2), 'slog10("1e10")=2（10^10 = 10^^3）');
assert(near(slog10(100) - slog10(2), 1, 1e-9), 'slog10(100)=slog10(2)+1（函数方程 f(10^x)=f(x)+1）');
assert(slog10(2) > 0.3 && slog10(2) < 0.5, 'slog10(2) ∈ (0.3, 0.5)');
const s10Big = slog10('1e1000000');
assert(Number.isFinite(s10Big) && s10Big > 2 && s10Big < 4, 'slog10("1e1000000") 有限且在 (2,4)');
assert(near(tet10(2).toNumber(), 1e10, 1), 'tet10(2)=1e10');
assert(Math.abs(tet10(3).log10() - 1e10) / 1e10 < 1e-9, 'tet10(3)=10^(1e10)（结果的对数≈1e10）');
assert(Math.abs(slog10(tet10(0.5)) - 0.5) < 1e-3, 'slog10(tet10(0.5)) 往返 ≈0.5');

// —— Log10 接口族（新版核心：绕开 break_infinity 完整数值表示上限）——
assert(near(slog2.fromLog10(100), slog2('1e100')), 'fromLog10 与常规 slog 一致（t=100）');
assert(near(tet2.log10(3), Math.log10(16)), 'sexp2.log10(3)=lg 16');
assert(near(slog10.fromLog10(tet10.log10(2.5)), 2.5, 1e-9), '基10 Log10 高度往返 fromLog10∘log10 ≡ id');
assert(near(slog2.fromLog10(tet2.log10(2.5)), 2.5, 1e-9), '基2 Log10 高度往返 fromLog10∘log10 ≡ id');
// README 示例：step = Math.min(0.01, 1/√t)（t=1e12 时为 1e-6，非字面 0.01）
const tEg = 1e12, stepEg = Math.min(0.01, 1 / Math.sqrt(tEg));
assert(near(tet2.shiftLog10(tEg, stepEg), 1000115579924.944, 0.5),
  'sexp2.shiftLog10(1e12, 1e-6) ≈ 1000115579924.944（README 参考值）');
assert(near(tet10.shiftLog10(tEg, stepEg), 1000115843409.341, 0.5),
  'sexp10.shiftLog10(1e12, 1e-6) ≈ 1000115843409.341（README 参考值）');
assert(tet2.shiftLog10(1e12, 0) === 1e12, 'shiftLog10(t, 0) 精确返回 t');
assert(Number.isFinite(tet2.shiftLog10(1e15, 0.01)), 'shiftLog10 支持 1ee15 量级输入（超 Decimal 完整数值范围）');
assert(throws(() => tet2.shiftLog10(2e16, 0.01)), 'shiftLog10 |t|>1e16 → 抛错');
assert(throws(() => slog2.fromLog10(2e16)), 'fromLog10 |t|>1e16 → 抛错');
assert(throws(() => tet2(5.5)), 'tet2(5.5) 完整结果超 Decimal 范围 → 抛错');
assert(Number.isFinite(tet2.log10(5.5)), 'tet2.log10(5.5) 有限（Log10 接口不受完整数值范围限制）');
assert(near(slog2.decimal(16).toNumber(), 3, 1e-9), 'slog2.decimal 包装仍可用');

// —— 抛错边界 ——
assert(throws(() => tet2(6)), 'tet2(6) 结果对数超 Number 范围 → 抛错');
assert(throws(() => tet10(4)), 'tet10(4) → 抛错');
assert(throws(() => tet2(-2)), 'height ≤ -2 → 抛错（实数枝要求 > -2）');
assert(throws(() => slog2('1e1000x')), '畸形字符串 → 抛错（拒绝 parseFloat 静默截断）');
assert(throws(() => slog2(Infinity)), 'Infinity 输入 → 抛错');

console.log(fails ? 'slog-tetration: FAIL' : 'slog-tetration: ALL PASS');
process.exit(fails);
