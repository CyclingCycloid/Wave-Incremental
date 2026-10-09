/** 超对数（slog）与迭代幂次（tetration）的 Kneser 数值近似——底数 2 与 10。
 * 三个工厂（createSlog2/createSlog10/createTet2/createTet10）忠实移植自用户
 * 2026-10-09 生成的独立 UMD 模块（slog2.js/slog10.js/tetration.js，仅去 UMD 壳、
 * 系数表移入各自工厂作用域），数值内核逐字保留；createSlogTetration 为游戏侧
 * 统一入口（注入宿主的 break_infinity.js Decimal，一次创建四个可用函数）。
 * 口径：slog2/slog10(value) → Number（超大输入传字符串如 "1e1000" 或 Decimal，
 * 勿传已溢出的 Number）；tet2/tet10(height) → Decimal（.number() 取 Number，
 * 结果超 break_infinity 指数范围抛 RangeError，height > −2）。
 * 归一化 T(0)=1、T(1)=底数、T(−1)=0；f(底数^x)=f(x)+1、f(1)=0。
 * 精度：非任意精度（IEEE-754 double 内核）；基 10 近似精度低于基 2，
 * 保守显示取 6 位小数，无严格误差界。当前无游戏逻辑调用，备用。 */

// Numerical Kneser slog, base 2; f(1)=0. Real inputs only.
// 80 Taylor coefficients at 1: Sheldon, 2010-12-20.
// https://tetrationforum.org/printthread.php?tid=546
// Large range is not arbitrary precision; results use IEEE-754 doubles.
function createSlog2(Decimal) {
  if (typeof Decimal !== "function" ||
      typeof Decimal.prototype.log2 !== "function") {
    throw new TypeError("Pass the Decimal constructor from break_infinity.js");
  }
  const COEFFICIENTS = Object.freeze([
    0.0,
    1.124397801829479,
    -0.01233408638319093,
    -0.15195716580089316,
    0.018680099445212886,
    0.03456100685993162,
    -0.009074170089611118,
    -0.008826111915443512,
    0.003824517214372832,
    0.002280310898007419,
    -0.0015192234658228624,
    -0.0005553257672594856,
    0.0005806875956884512,
    0.00011333875202118827,
    -0.00021492130432643552,
    -1.1211866184624513e-05,
    7.707957627653142e-05,
    -6.2489241946207895e-06,
    -2.6710991738265264e-05,
    5.81456717530582e-06,
    8.885337301519339e-06,
    -3.3076377342135287e-06,
    -2.80211888032739e-06,
    1.5918438552502983e-06,
    8.175401089809902e-07,
    -6.993518217342314e-07,
    -2.085806652969183e-07,
    2.8862436851123337e-07,
    3.8628849778022125e-08,
    -1.1328157592267568e-07,
    9.421765718211485e-10,
    4.24723349586631e-08,
    -6.154781811869009e-09,
    -1.5197704224688238e-08,
    4.407883918655972e-09,
    5.1567487428618015e-09,
    -2.3802045073177293e-09,
    -1.634503733059115e-09,
    1.1308075381686725e-09,
    4.680612479371739e-10,
    -4.961793894232832e-10,
    -1.1074640735137446e-10,
    2.0520322530692159e-10,
    1.4196796848723954e-11,
    -8.06971389411296e-11,
    5.668661056030146e-12,
    3.0247899457701006e-11,
    -6.354763238446085e-12,
    -1.0775825504142363e-11,
    3.938259726779578e-12,
    3.6145507745575107e-12,
    -2.0205908087829917e-12,
    -1.117812358127448e-12,
    9.362105857554216e-13,
    3.0319231965398625e-13,
    -4.046283602138345e-13,
    -6.151258021196049e-14,
    1.6547055506890328e-13,
    9.53031689305854e-16,
    -6.439584830686473e-14,
    8.555440174144253e-15,
    2.3851999823563585e-14,
    -6.636204645441806e-15,
    -8.363462450359525e-15,
    3.744838886207819e-15,
    2.7388958590361204e-15,
    -1.8400132749185125e-15,
    -8.12668923591629e-16,
    8.307915325445658e-16,
    2.0181213382841263e-16,
    -3.5247402372018293e-16,
    -2.98585275636976e-17,
    1.4190787623066308e-16,
    -8.0547624479342e-18,
    -5.438469969331962e-17,
    1.071535590487842e-17,
    1.979662010087425e-17,
    -6.94989588600789e-18,
    -6.78704531046374e-18,
    3.6676810766654e-18,
    2.14963783636005e-18,
  ]);

  function localSlog(x) {
    if (x === 0) return -1;
    if (x === 1) return 0;
    if (x === 2) return 1;
    const h = x - 1;
    let result = 0;
    for (let k = COEFFICIENTS.length - 1; k >= 0; --k) {
      result = result * h + COEFFICIENTS[k];
    }
    return result;
  }

  function parse(value) {
    if (typeof value === "string") {
      value = value.trim();
      // Reject malformed strings rather than letting parseFloat truncate them.
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
        throw new TypeError("Use a real number or scientific notation, e.g. 1e1000");
      }
    } else if (typeof value !== "number" && !(value instanceof Decimal)) {
      throw new TypeError("Expected a number, string, or break_infinity Decimal");
    }
    const d = new Decimal(value);
    if (!Number.isFinite(d.mantissa) || !Number.isFinite(d.exponent) ||
        Math.abs(d.exponent) >= 9e15) {
      throw new RangeError("Input must be finite and within break_infinity.js range");
    }
    return d;
  }

  /** Return a Number. Do not convert large inputs to Number before calling. */
  function slog2(value) {
    const d = parse(value);
    let x;
    let shift = 0;
    if (d.lt(0)) {
      // f(x)=f(2^x)-1. If 2^x is too small to resolve, f rounds to -2.
      if (d.lte(-1075)) return -2;
      x = Math.pow(2, d.toNumber());
      shift = -1;
    } else if (d.gt(2)) {
      // Crucial: take the Decimal logarithm BEFORE any toNumber conversion.
      x = d.log2();
      shift = 1;
      if (typeof x !== "number") {
        throw new TypeError("This adapter expects break_infinity.js log2() to return Number");
      }
    } else {
      x = d.toNumber();
    }
    while (x > 2) {
      x = Math.log2(x);
      ++shift;
    }
    return localSlog(x) + shift;
  }

  /** Return the same floating-point approximation wrapped in a Decimal. */
  slog2.decimal = function (value) {
    return new Decimal(slog2(value));
  };
  return slog2;
}

// Numerical approximation to the REAL base-10 Kneser superlogarithm.
// f(10^x)=f(x)+1; f(1)=0. Compatible with break_infinity.js.
// Uses a degree-49 numerical tetration polynomial, then bisection inversion.
// Coefficients: Sheldon (2010), post #1:
// https://www.tetrationforum.org/showthread.php?tid=486
// Lower accuracy than the base-2 factory above. This is NOT an
// arbitrary-precision or certified-error implementation. For conservative
// presentation, round to 6 decimal places; no rigorous error bound is given.
function createSlog10(Decimal) {
  if (typeof Decimal !== "function" ||
      typeof Decimal.prototype.log10 !== "function") {
    throw new TypeError("Pass the Decimal constructor from break_infinity.js");
  }
  const TETRATION_COEFFICIENTS = Object.freeze([
    1.00000000003413666821707397610280580973,
    1.6842890280105318114702665361,
    1.4130640093559017784867641066,
    1.3295945895120850984491868131,
    1.1104423522130456306141162585,
    0.90791475960484107525431757972,
    0.70590812180827017012794979492,
    0.53596957102484588479532491192,
    0.39514882149633253685483274509,
    0.28568024972253825344818666302,
    0.20237131278470927324534438107,
    0.14110168269002467755684498200,
    0.096870196895171185635561049276,
    0.065642683799764598157183797364,
    0.043932559903871435514499480872,
    0.029083045516276459146860315440,
    0.019054947684195538710084470697,
    0.0123686846345218426147071658882,
    0.0079582306458762837173385697464,
    0.0050792074578440317507369752633,
    0.0032170388379653970425789785613,
    0.0020231559289094629314623265337,
    0.0012638006922446651516872615141,
    0.00078448455296479211241357653392,
    0.00048404347686816718054617660014,
    0.00029697714889618699433841203816,
    0.00018122446592630282867291500326,
    0.000110023183879937876785387661614,
    0.000066469809662926642710985803857,
    0.000039970210188298586919385209485,
    0.000023927948827218540851314911165,
    0.0000142631537294666506633793631158,
    0.0000084672146369634588559435171282,
    0.0000050067182976642942211046734889,
    0.0000029492933862829666416493809347,
    0.0000017310105129704227353019917697,
    0.0000010124091578563321764991987405,
    0.00000059013055820603257123183162307,
    0.00000034287053679750024168609816182,
    0.00000019859459586612750224033089360,
    0.000000114688324996137110089024467356,
    0.000000066049601906226671780697958378,
    0.000000037941008758273721620067345461,
    0.000000021745359672035340985615756584,
    0.0000000124403916641799613324962201452,
    0.0000000071074328972264520946865200883,
    0.0000000040598591783922772751609136103,
    0.0000000023194687970727546265839419100,
    0.0000000013297332794947389880115713152,
    0.00000000076366914316723959202509556617,
  ]);

  function polynomial(t) {
    let y = 0;
    for (let k = TETRATION_COEFFICIENTS.length - 1; k >= 0; --k) {
      y = y * t + TETRATION_COEFFICIENTS[k];
    }
    return y;
  }
  const P_MINUS_ONE = polynomial(-1);
  const P_ZERO = polynomial(0);
  // Small affine correction to enforce T(-1)=0 and T(0)=1 exactly.
  function localTetration(t) {
    return (polynomial(t) - P_MINUS_ONE) / (P_ZERO - P_MINUS_ONE);
  }
  // Inverse T on [-1,0]: inputs in [0,1], outputs in [-1,0].
  function localSlog(x) {
    if (x === 0) return -1;
    if (x === 1) return 0;
    let lo = -1, hi = 0;
    for (let i = 0; i < 60; ++i) {
      const mid = (lo + hi) / 2;
      if (mid === lo || mid === hi) break;
      if (localTetration(mid) < x) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  function parse(value) {
    if (typeof value === "string") {
      value = value.trim();
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
        throw new TypeError("Use a real number or scientific notation, e.g. 1e1000");
      }
    } else if (typeof value !== "number" && !(value instanceof Decimal)) {
      throw new TypeError("Expected a number, string, or break_infinity Decimal");
    }
    const d = new Decimal(value);
    if (!Number.isFinite(d.mantissa) || !Number.isFinite(d.exponent) ||
        Math.abs(d.exponent) >= 9e15) {
      throw new RangeError("Input must be finite and within break_infinity.js range");
    }
    return d;
  }
  /** Return a Number; pass huge inputs as strings or Decimal objects. */
  function slog10(value) {
    const d = parse(value);
    let x, shift = 0;
    if (d.lt(0)) {
      if (d.lte(-324)) return -2;
      x = Math.pow(10, d.toNumber());
      shift = -1;
    } else if (d.gt(1)) {
      // Take the big-number logarithm BEFORE converting to ordinary Number.
      x = d.log10();
      shift = 1;
      if (typeof x !== "number") {
        throw new TypeError("This adapter expects break_infinity.js log10() to return Number");
      }
    } else {
      x = d.toNumber();
    }
    while (x > 1) {
      x = Math.log10(x);
      ++shift;
    }
    return localSlog(x) + shift;
  }
  /** Wrap the same approximate result in a Decimal; no extra precision. */
  slog10.decimal = value => new Decimal(slog10(value));
  return slog10;
}

function createTet2(Decimal) {
  return createTetration(Decimal, 2, createSlog2);
}
function createTet10(Decimal) {
  return createTetration(Decimal, 10, createSlog10);
}

// Numerical inverse of the accompanying real slog approximations.
// T(0)=1, T(1)=base, T(h+1)=base^T(h).
// Returns break_infinity Decimal; real heights > -2 only.
// Precision inherits the slog approximation and Decimal representation.
function createTetration(Decimal, base, createSlog) {
  const EXPONENT_LIMIT = 9e15;
  if (typeof createSlog !== "function") {
    throw new Error("Load the matching slog factory before the tetration factory");
  }
  const slog = createSlog(Decimal);
  const log10base = Math.log10(base);
  const largestIntegerHeight = base === 2 ? 5 : 3;

  function parseHeight(value) {
    if (typeof value === "string") {
      value = value.trim();
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
        throw new TypeError("Height must be a finite real number");
      }
    } else if (typeof value !== "number" && !(value instanceof Decimal)) {
      throw new TypeError("Height must be a number, string, or Decimal");
    }
    const d = new Decimal(value);
    if (!Number.isFinite(d.mantissa) || !Number.isFinite(d.exponent)) {
      throw new RangeError("Height must be finite");
    }
    if (d.lte(-2)) {
      throw new RangeError("The real tetration branch requires height > -2");
    }
    // Fail before a huge height could become Infinity or cause a long loop.
    if (d.gte(largestIntegerHeight + 1)) {
      throw new RangeError("Result exceeds the range of break_infinity.js");
    }
    return d.toNumber();
  }

  function inverseOnInterval(target, lo, hi) {
    for (let i = 0; i < 80; ++i) {
      const mid = (lo + hi) / 2;
      if (mid === lo || mid === hi) break;
      if (slog(mid) < target) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /**
   * Numerical inverse of the accompanying real slog approximation.
   * T(0)=1, T(1)=base, T(h+1)=base^T(h).
   * Returns break_infinity Decimal; real heights > -2 only.
   * Precision inherits the slog approximation and Decimal representation.
   */
  function tetration(height) {
    const h = parseHeight(height);
    if (h === -1) return new Decimal(0);
    if (h === 0) return new Decimal(1);
    if (h < 0) {
      if (h > -1) {
        return new Decimal(inverseOnInterval(h, 0, 1));
      }
      const positive = inverseOnInterval(h + 1, 0, 1);
      return new Decimal(Math.log(positive) / Math.log(base));
    }

    const steps = Math.floor(h);
    const fraction = h - steps;
    let result = new Decimal(fraction === 0 ? 1 :
      inverseOnInterval(fraction, 1, base));
    for (let i = 0; i < steps; ++i) {
      // base^result = 10^(result*log10(base)). This exponent must fit.
      const exponent = result.mul(log10base).toNumber();
      if (!Number.isFinite(exponent) || exponent >= EXPONENT_LIMIT) {
        throw new RangeError("Result exceeds the range of break_infinity.js");
      }
      result = Decimal.pow(base, result);
      if (!Number.isFinite(result.mantissa) ||
          !Number.isFinite(result.exponent) ||
          result.exponent >= EXPONENT_LIMIT) {
        throw new RangeError("Result exceeds the range of break_infinity.js");
      }
    }
    return result;
  }

  // Small results only. Throws rather than silently returning Infinity.
  tetration.number = height => {
    const value = tetration(height).toNumber();
    if (!Number.isFinite(value)) {
      throw new RangeError("Result does not fit Number; use the Decimal result");
    }
    return value;
  };
  return tetration;
}

// 游戏侧统一入口：注入宿主（globalThis，读其 break_infinity.js 的 Decimal），
// 一次创建四个可直接调用的函数（src/core/00-state.js 解构接线）。
function createSlogTetration(host) {
  const Decimal = host && host.Decimal;
  if (typeof Decimal !== "function") {
    throw new TypeError("createSlogTetration: host.Decimal（break_infinity.js）不可用");
  }
  return Object.freeze({
    slog2: createSlog2(Decimal),
    slog10: createSlog10(Decimal),
    tet2: createTet2(Decimal),
    tet10: createTet10(Decimal),
  });
}
