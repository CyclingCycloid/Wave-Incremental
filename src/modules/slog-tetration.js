/** 超对数（slog）与迭代幂次（tetration/sexp）的 Kneser 数值近似——底数 2 与 10。
 * 2026-10-10 更新版：96 项系数（展开中心为高度 −0.5，PARI/GP 101 位十进制工作
 * 精度生成，内部 double-double 扩展运算；41 个局部参考点最大绝对误差 ~1.11e-16），
 * 系数生成算法来源：Sheldon kneser.gp (2013)，tetrationforum attachment 1025。
 * 忠实移植自用户的独立 UMD 模块（slog2.js/slog10.js/tetration.js，仅去 UMD 壳）；
 * 两底数文件除系数表/LNB/BASE/工厂名外逐字节相同，故共享参数化内核 createSlogBase。
 * 接口（对旧版兼容，tet2/tet10 即新版 sexp 工厂）：
 *  - slog2/slog10(value) → Number：常规接口（value 可为 Number/数字串/Decimal），
 *    输入受 break_infinity 表示范围限制（|指数| < 9e15）
 *  - slog2.fromLog10(t) → Number：slog(10^t)，t ∈ [−1e16, 1e16]——绕开完整数值
 *    表示上限（正方向支持到 N = 10^(10^16)，即 1ee16）
 *  - tet2/tet10(height) → Decimal：完整数值结果（height > −2；整数高度走 Decimal
 *    幂链保持精确；结果超 Decimal 范围抛 RangeError，改用 .log10）
 *  - tet2.log10(h) → Number：结果值的 log10
 *  - tet2.shiftLog10(t, d) → Number：log10(sexp(slog(10^t) + d))——高度在内部以
 *    double-double 保留后再取指数，微小增量不丢失（大数正向运算的推荐接口；
 *    d=0 精确返回 t）
 *  - tet2.number(h)：结果可被 Number 容纳时返回 Number，否则抛错
 * 归一化：slog_b(1)=0、sexp_b(0)=1、sexp_b(h+1)=b^sexp_b(h)、sexp_b(−1)=0。
 * 当前无游戏逻辑调用，供未来超高量级内容备用。 */

// ln2 / ln10 的 double-double（hi/lo）表示：两底数的源文件中逐字节相同，故共享
const SLOG_LN2 = [0.6931471805599453, 2.3190468138462996e-17];
const SLOG_LN10 = [2.302585092994046, -2.1707562233822494e-16];

// 共享内核：BASE = 底数（2/10），LNB = ln(底数) 的 double-double，COEFF = 96 项系数表
function createSlogBase(Decimal, BASE, LNB, COEFF) {
  "use strict";
  if (typeof Decimal !== "function" || typeof Decimal.prototype.log10 !== "function") {
    throw new TypeError("Pass the Decimal constructor from break_infinity.js");
  }
  const SPLIT = 134217729; // Dekker 分裂常数（2^27+1）：double-double 乘法的尾数拆分用
  function norm(a, b) {
    const s = a + b;
    return [s, b - (s - a)];
  }
  function add(a, b) {
    const s = a[0] + b[0];
    const v = s - a[0];
    const e = (a[0] - (s - v)) + (b[0] - v) + a[1] + b[1];
    return norm(s, e);
  }
  function sub(a, b) { return add(a, [-b[0], -b[1]]); }
  function mul(a, b) {
    const p = a[0] * b[0];
    const ca = SPLIT * a[0], cb = SPLIT * b[0];
    const ah = ca - (ca - a[0]), al = a[0] - ah;
    const bh = cb - (cb - b[0]), bl = b[0] - bh;
    const e = ((ah * bh - p) + ah * bl + al * bh) + al * bl;
    return norm(p, e + a[0] * b[1] + a[1] * b[0] + a[1] * b[1]);
  }
  function div(a, b) {
    const q = a[0] / b[0];
    const r = sub(a, mul(b, [q, 0]));
    return norm(q, (r[0] + r[1]) / b[0]);
  }
  function cmp(a, b) {
    if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
    return a[1] === b[1] ? 0 : a[1] < b[1] ? -1 : 1;
  }
  function num(a) { return a[0] + a[1]; }
  function logDD(x) {
    if (!(x[0] > 0)) throw new RangeError("Logarithm requires a positive value");
    let k = Math.floor(Math.log2(x[0]));
    // Avoid subnormal or overflowing scaling constants.
    k = Math.max(-1022, Math.min(1023, k));
    const m = div(x, [Math.pow(2, k), 0]);
    const z = div(sub(m, [1, 0]), add(m, [1, 0]));
    const z2 = mul(z, z);
    let term = z, sum = z;
    for (let j = 3; j <= 159; j += 2) {
      term = mul(term, z2);
      const contribution = div(term, [j, 0]);
      sum = add(sum, contribution);
      if (Math.abs(contribution[0]) < 1e-34) break;
    }
    return add(mul(SLOG_LN2, [k, 0]), mul(sum, [2, 0]));
  }
  function expDD(x) {
    if (x[0] < -744) return [Math.exp(num(x)), 0];
    if (x[0] > 709) throw new RangeError("Intermediate exponent exceeds Number range");
    const k = Math.round(num(div(x, SLOG_LN2)));
    const r = sub(x, mul(SLOG_LN2, [k, 0]));
    let term = [1, 0], sum = [1, 0];
    for (let j = 1; j <= 40; ++j) {
      term = div(mul(term, r), [j, 0]);
      sum = add(sum, term);
      if (Math.abs(term[0]) < 1e-34) break;
    }
    const scale = Math.pow(2, k);
    return [sum[0] * scale, sum[1] * scale];
  }
  function rawPolynomial(height) {
    const z = add(height, [0.5, 0]);
    let p = COEFF[COEFF.length - 1], dp = [0, 0];
    for (let k = COEFF.length - 2; k >= 0; --k) {
      dp = add(mul(dp, z), p);
      p = add(mul(p, z), COEFF[k]);
    }
    return [p, dp];
  }
  const P0 = rawPolynomial([-1, 0])[0];
  const PSCALE = sub(rawPolynomial([0, 0])[0], P0);
  function localT(height) {
    if (cmp(height, [-1, 0]) === 0) return [[0, 0], div(rawPolynomial(height)[1], PSCALE)];
    if (cmp(height, [0, 0]) === 0) return [[1, 0], div(rawPolynomial(height)[1], PSCALE)];
    const [p, dp] = rawPolynomial(height);
    return [div(sub(p, P0), PSCALE), div(dp, PSCALE)];
  }
  function inverseLocal(x) {
    if (cmp(x, [0, 0]) === 0) return [-1, 0];
    if (cmp(x, [1, 0]) === 0) return [0, 0];
    let lo = [-1, 0], hi = [0, 0], h = sub(x, [1, 0]);
    for (let i = 0; i < 55; ++i) {
      const [p, derivative] = localT(h);
      const error = sub(p, x);
      if (Math.abs(error[0]) < 2e-32) return h;
      if (cmp(error, [0, 0]) < 0) lo = h;
      else hi = h;
      let next = sub(h, div(error, derivative));
      if (cmp(next, lo) <= 0 || cmp(next, hi) >= 0) {
        next = mul(add(lo, hi), [0.5, 0]);
      }
      if (cmp(next, h) === 0) return h;
      h = next;
    }
    return h;
  }
  function slogReduced(x, shift) {
    while (cmp(x, [1, 0]) > 0) {
      x = div(logDD(x), LNB);
      ++shift;
    }
    return add(inverseLocal(x), [shift, 0]);
  }
  function slogFromLog(t) {
    if (t === 0) return [0, 0];
    if (t < 0) {
      const exponent = mul([t, 0], SLOG_LN10);
      if (exponent[0] < -744) return [-1, 0];
      return inverseLocal(expDD(exponent));
    }
    const reduced = mul([t, 0], div(SLOG_LN10, LNB));
    if (!Number.isFinite(reduced[0])) {
      const second = div(add(logDD([t, 0]), logDD(div(SLOG_LN10, LNB))), LNB);
      return slogReduced(second, 2);
    }
    return slogReduced(reduced, 1);
  }
  function checkedHeight(h) {
    if (cmp(h, [-2, 0]) <= 0) throw new RangeError("Real height must be greater than -2");
    const upper = BASE === 2 ? 6 : 4;
    if (cmp(h, [upper, 0]) >= 0) throw new RangeError("Result's logarithm exceeds Number range");
    return h;
  }
  function logT(h) {
    checkedHeight(h);
    if (cmp(h, [-1, 0]) < 0) throw new RangeError("Cannot take log10 of a negative tetration result");
    if (cmp(h, [-1, 0]) === 0) return [-Infinity, 0];
    if (cmp(h, [0, 0]) < 0) return div(logDD(localT(h)[0]), SLOG_LN10);
    let integer = Math.floor(h[0]);
    if (h[0] === integer && h[1] < 0) --integer;
    const fraction = sub(h, [integer, 0]);
    let x = localT(sub(fraction, [1, 0]))[0];
    for (let i = 0; i < integer; ++i) x = expDD(mul(x, LNB));
    return mul(x, div(LNB, SLOG_LN10));
  }

  function scalar(value, name) {
    if (typeof value === "string") {
      value = value.trim();
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
        throw new TypeError(name + " must be a finite real number");
      }
      value = Number(value);
    } else if (value instanceof Decimal) value = value.toNumber();
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(name + " must be a finite real number");
    }
    return value;
  }
  function parse(value) {
    if (typeof value === "string") {
      value = value.trim();
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
        throw new TypeError("Use a finite number or scientific notation");
      }
    } else if (typeof value !== "number" && !(value instanceof Decimal)) {
      throw new TypeError("Expected Number, numeric string, or Decimal");
    }
    const d = new Decimal(value);
    if (!Number.isFinite(d.mantissa) || !Number.isFinite(d.exponent) || Math.abs(d.exponent) >= 9e15) {
      throw new RangeError("Input exceeds break_infinity.js finite range; use fromLog10 instead");
    }
    return d;
  }
  function slog(value) {
    const d = parse(value);
    if (d.lt(0)) {
      const n = d.toNumber();
      if (!Number.isFinite(n) || n * Math.log(BASE) < -744) return -2;
      return num(sub(inverseLocal(expDD(mul([n, 0], LNB))), [1, 0]));
    }
    if (d.lte(1)) return num(inverseLocal([d.toNumber(), 0]));
    // Keep exponent and mantissa separate when extracting log10.
    const logarithm = add([d.exponent, 0], div(logDD([d.mantissa, 0]), SLOG_LN10));
    return num(slogReduced(mul(logarithm, div(SLOG_LN10, LNB)), 1));
  }
  slog.fromLog10 = value => {
    const t = scalar(value, "log10(N)");
    if (Math.abs(t) > 1e16) throw new RangeError("Log10 input must lie between -1e16 and 1e16");
    return num(slogFromLog(t));
  };
  slog.decimal = value => new Decimal(slog(value));

  function sexp(value) {
    const h = checkedHeight([scalar(value, "height"), 0]);
    if (cmp(h, [-1, 0]) === 0) return new Decimal(0);
    if (cmp(h, [0, 0]) < 0) {
      const x = cmp(h, [-1, 0]) > 0 ? localT(h)[0] :
        div(logDD(localT(add(h, [1, 0]))[0]), LNB);
      return new Decimal(num(x));
    }
    const t = num(logT(h));
    if (!Number.isFinite(t) || t >= 9e15) {
      throw new RangeError("Full result exceeds Decimal range; use .log10(height)");
    }
    // Preserve exact small integer anchors through Decimal exponentiation.
    if (h[0] === Math.floor(h[0])) {
      let x = new Decimal(1);
      for (let i = 0; i < h[0]; ++i) x = Decimal.pow(BASE, x);
      return x;
    }
    return Decimal.pow10(t);
  }
  sexp.log10 = value => num(logT([scalar(value, "height"), 0]));
  sexp.shiftLog10 = (value, increment = 0) => {
    const t = scalar(value, "log10(N)");
    const dh = scalar(increment, "slog increment");
    if (Math.abs(t) > 1e16) throw new RangeError("Log10 input must lie between -1e16 and 1e16");
    if (dh === 0) return t;
    const height = add(slogFromLog(t), [dh, 0]);
    return num(logT(height));
  };
  sexp.number = value => {
    const n = sexp(value).toNumber();
    if (!Number.isFinite(n)) throw new RangeError("Use the Decimal or Log10 output for large results");
    return n;
  };
  // Shared local model makes the two functions true numerical inverses.
  slog.sexp = sexp;
  return slog;
}

// Numerical Kneser tetration coefficients generated with PARI/GP at 101
// decimal digits, centered at height -0.5. Each constant is a hi/lo pair.
// Reference algorithm: Sheldon, kneser.gp (2013),
// https://www.tetrationforum.org/attachment.php?aid=1025
// 96 terms per base. Internal arithmetic uses double-double expansions.
// Public Number/Decimal results retain their respective output precision.
const SLOG2_COEFF = [[0.5447641214595568, -3.7596038486380054e-17], [0.9597267977399521, 1.947409320932157e-17], [-0.16276431255942386, 6.5764733016491956e-18], [0.15064221016757776, -1.0332476686568651e-17], [-0.0596532317947748, -3.2709620217473175e-19], [0.03850174795774741, -2.3236659848246838e-18], [-0.020152121675563697, 6.79246112680372e-19], [0.012057330494445523, -5.18911363266716e-19], [-0.006951530784555455, 1.7875263309585484e-19], [0.004162885920683264, 9.91772941193991e-20], [-0.0024935889965896478, -1.3483321788381034e-19], [0.001514889597555275, -9.49699783203325e-20], [-0.000925719461245252, -1.8014568075942315e-20], [0.0005700031553901695, 5.3669866151837314e-20], [-0.0003528891006092209, -4.6990047121021955e-21], [0.00021960923841147335, 1.063454930086569e-21], [-0.00013726237214026107, 1.0893508942917369e-20], [8.612931534076277e-05, -5.159883941994861e-21], [-5.423064928708134e-05, -5.443789805358797e-23], [3.425143150497996e-05, -2.8913707457343074e-21], [-2.1692735625887816e-05, 9.061138039347741e-22], [1.3773232151478425e-05, -8.433933160738355e-23], [-8.764807814632228e-06, -6.434589573614882e-22], [5.589162118186594e-06, 6.106060356089013e-23], [-3.570857017755186e-06, -9.557899589644225e-23], [2.2853498193582745e-06, 1.6366258051061675e-22], [-1.464968333330648e-06, 4.9311117739132874e-23], [9.404736900030193e-07, -8.222458773666278e-24], [-6.045903023732437e-07, -8.470777801371475e-24], [3.8916160198428146e-07, 6.923066715806587e-25], [-2.507930431223032e-07, 1.1293053253194657e-23], [1.6180196742894013e-07, 9.112778622690892e-24], [-1.0449710554897182e-07, 4.6279033845389604e-24], [6.755368500540807e-08, 3.9872770197569354e-24], [-4.371120817974383e-08, -4.691175926736278e-25], [2.8308211102349713e-08, -9.937797749598402e-25], [-1.8347914638404652e-08, 2.619080878062058e-25], [1.190135004926571e-08, -7.744886787622568e-25], [-7.725437756518742e-09, 5.060438487336987e-25], [5.018233074640493e-09, 1.0507281101958716e-25], [-3.261851499303267e-09, -8.044971419451086e-26], [2.1215294307464635e-09, 1.1637977752187513e-25], [-1.38067788362021e-09, 1.7598591051962498e-26], [8.990460637987551e-10, 1.1261693717327539e-26], [-5.857421324928558e-10, 4.7067128091985254e-26], [3.818170937800889e-10, -2.5074727489658468e-26], [-2.490111481201621e-10, 5.787643013813145e-27], [1.6247535905818387e-10, 5.9719685759333216e-27], [-1.0606030383005974e-10, -5.856109623601353e-28], [6.926387188917925e-11, 5.7606069529175995e-27], [-4.5252396300993136e-11, -2.400565805002602e-27], [2.9576729608516725e-11, -2.9483022642149813e-27], [-1.9338630897885877e-11, -9.71056043320973e-29], [1.2649167379752989e-11, -1.2126254910228244e-28], [-8.276615692926256e-12, 4.2348344057245716e-29], [5.417421180825029e-12, 2.4017092191073447e-28], [-3.547121011254707e-12, 7.991453220908237e-31], [2.3232605453832876e-12, -4.1493547466466784e-29], [-1.5221362193890847e-12, 1.72849932439464e-29], [9.975582002776057e-13, -8.568940987184052e-29], [-6.539548201819912e-13, 2.400470978958198e-29], [4.288228329062258e-13, -2.2663453836240654e-29], [-2.8127089040085857e-13, -1.6464256123399834e-29], [1.8453751539527262e-13, 2.1594510311808416e-30], [-1.2110274447814777e-13, -6.004679406132795e-30], [7.94930835548868e-14, 5.726294373392638e-32], [-5.219242859664287e-14, 2.0017766802443482e-30], [3.427562475003413e-14, -1.5019612622054307e-30], [-2.2514380963257715e-14, 2.5309920373616704e-31], [1.4792057057985746e-14, 1.1313500290281298e-31], [-9.720494638104919e-15, -3.964869987725499e-31], [6.389057508613562e-15, 1.8226648098819043e-32], [-4.200213732514472e-15, 3.409406208090313e-31], [2.7617843720643102e-15, -1.80149322580388e-31], [-1.816308641087339e-15, -3.105390102803969e-32], [1.1947274616930052e-15, 4.226501058066204e-32], [-7.860049090085561e-16, 3.277666198961205e-32], [5.171980353649374e-16, -3.1571419238075895e-32], [-3.403781942145314e-16, -1.6989793075993493e-32], [2.2404640631842576e-16, -2.4286899568943132e-32], [-1.4749721749296362e-16, 8.963362758351944e-33], [9.711750946038757e-17, -3.907483604235189e-33], [-6.395543305927962e-17, 5.272580158044087e-33], [4.212325711534882e-17, 9.849580469328804e-34], [-2.7747859845825017e-17, -1.5302316458469561e-33], [1.8280942957249423e-17, 8.272770237562745e-34], [-1.204558256873024e-17, -5.213707009453614e-34], [7.93808506445058e-18, -6.421942843619298e-34], [-5.2319197015697e-18, -3.197923142417165e-35], [3.448756057963548e-18, -1.4770001545672087e-34], [-2.2736243641389317e-18, 1.6299316955023672e-34], [1.4990929873443505e-18, -3.7626382726516606e-36], [-9.88532332234318e-19, -2.961825094440029e-35], [6.519353015452134e-19, -4.190306307384895e-35], [-4.299998797425875e-19, -2.0510148279479965e-35], [2.8364904347932087e-19, 1.927353853718337e-35]];
const SLOG10_COEFF = [[0.3939269895498767, 1.765676492348301e-17], [0.9056822403334664, 1.5501689035945562e-17], [0.37689545674142644, -8.59406713901889e-18], [0.34202559949673217, -2.7445199888104003e-17], [0.17223765004113, -6.0681530009001346e-18], [0.1290058812461938, -1.060548691520654e-17], [0.06376421890059766, 3.0621927972331713e-18], [0.044114445106717755, 8.395323567151976e-19], [0.020847780483165147, -5.678407882615292e-19], [0.014016839911538672, 1.7916053436210554e-19], [0.006235362284362603, 1.554191005274853e-19], [0.004226376041095377, 2.5325980065441867e-19], [0.0017304274875399334, 2.0121113018299894e-20], [0.0012301260080561868, -3.8037908551936385e-20], [0.0004457332290892669, 7.302871491227669e-21], [0.00035123055176840425, 1.4569806561950666e-20], [0.00010468746849056452, -3.560762997027542e-21], [0.00010010073936856612, -1.847535298412155e-21], [2.1076069221374793e-05, 1.1053173939867113e-21], [2.9039723292405808e-05, -1.5025499163240748e-21], [2.7879251938858794e-06, 8.170330217045532e-23], [8.75400107921753e-06, -3.4112953439234343e-22], [-3.7288718972529665e-07, -2.3940376877721952e-24], [2.7904429406925184e-06, 8.615229976780369e-23], [-5.358859446454665e-07, 1.4843584485506296e-23], [9.489558029424244e-07, 3.415737852838927e-23], [-3.152111432055453e-07, -1.493146173304251e-23], [3.43469381189608e-07, 6.92875942069252e-24], [-1.5315820084060628e-07, 5.273008436950099e-24], [1.308759207128361e-07, -3.32416643764417e-24], [-6.898827914493568e-08, -4.511845601441329e-24], [5.178144673912444e-08, 1.8624792807965545e-24], [-3.000968667343273e-08, 2.7731603563889863e-24], [2.10145481428749e-08, -7.314933821533671e-25], [-1.2840946669130321e-08, 4.565404212955744e-25], [8.66959125182468e-09, -5.275759990956979e-25], [-5.454505759530471e-09, -1.7280596354689907e-26], [3.6145285972838634e-09, 1.9846732459812272e-25], [-2.3108642966258117e-09, -2.1370765965261916e-26], [1.5174238898345615e-09, 4.5039684672630144e-26], [-9.787966110833814e-10, 3.794499427750381e-26], [6.400736411763388e-10, -4.135481885196131e-26], [-4.1497167645174176e-10, -1.0839715753053046e-26], [2.709380917610218e-10, -1.531520869020961e-27], [-1.7619020049846883e-10, -1.7113360734105616e-27], [1.1500004486225204e-10, 2.8613998505870826e-29], [-7.493189154134548e-11, 3.5644962863154066e-28], [4.8922586683748965e-11, -2.221884443923179e-27], [-3.192163399427413e-11, -7.2786619146455715e-28], [2.0853069208608102e-11, 1.1126597179659607e-27], [-1.3621175410905425e-11, -7.326760524645251e-28], [8.904000070251262e-12, -1.629547054045631e-28], [-5.821276385351971e-12, 2.0762381590067796e-28], [3.8078822954114125e-12, -3.951134549307071e-28], [-2.491463418934312e-12, 1.3271657775424963e-28], [1.6308268332185505e-12, 5.878467433437283e-29], [-1.0677806833022594e-12, -5.131185084259157e-29], [6.993751680236332e-13, -1.2135072501133786e-29], [-4.582068623107274e-13, 1.8700677832202367e-29], [3.00295735755877e-13, -5.72324101198076e-31], [-1.968596655165786e-13, 1.124770909175709e-30], [1.2908869040113906e-13, 7.552678325019845e-30], [-8.467090671917353e-14, -2.3833333959296395e-30], [5.555135744713377e-14, -2.8257556448723957e-30], [-3.645554547799791e-14, 3.089931424637653e-30], [2.3929808371189637e-14, -1.3760688643995653e-30], [-1.571148402621559e-14, -9.934520750317161e-31], [1.0317992275266778e-14, 4.013867288864202e-31], [-6.777503521037424e-15, -5.424033513993611e-32], [4.452853082546401e-15, -9.25568367072587e-32], [-2.9261603670658016e-15, -7.411262638176954e-32], [1.9232979940036236e-15, 1.5818159689263673e-32], [-1.264390304355714e-15, 1.4931882973445026e-32], [8.313799450682092e-16, -4.6889262569283107e-32], [-5.467633790911484e-16, 2.5568429284920014e-32], [3.59648804024368e-16, -1.2516325938373002e-32], [-2.366110537404257e-16, 1.7953564581141932e-32], [1.5569212260693807e-16, 5.8430280379371645e-33], [-1.0246404621477483e-16, 1.7060378442386525e-33], [6.744468877158724e-17, 2.4053761242757592e-33], [-4.440108672125111e-17, -1.7971510509362416e-33], [2.923528346083385e-17, -9.655389634278922e-34], [-1.925250373262338e-17, -4.191630263135798e-34], [1.2680363908459873e-17, 5.1642661317440055e-34], [-8.352938128355881e-18, -4.911519556740361e-34], [5.50311217946164e-18, 1.796205904767531e-34], [-3.626081668303472e-18, 3.639938254153486e-34], [2.389601712588096e-18, -3.8427828796124645e-35], [-1.5749647650538124e-18, 6.915994131478974e-35], [1.0381790211851414e-18, -2.6534519682940146e-35], [-6.844291324738969e-19, 3.0564283654244005e-35], [4.512719554820346e-19, -1.2122339623882406e-35], [-2.9757788368541045e-19, 8.4423660409232e-36], [1.9625208099768837e-19, -9.591339206570133e-36], [-1.294428619342806e-19, -6.140322328164548e-36], [8.538687032873305e-20, -5.5299310525425996e-36]];

function createSlog2(Decimal) {
  return createSlogBase(Decimal, 2, SLOG_LN2, SLOG2_COEFF);
}
function createSlog10(Decimal) {
  return createSlogBase(Decimal, 10, SLOG_LN10, SLOG10_COEFF);
}
function createTet2(Decimal) { return createSlog2(Decimal).sexp; }
function createTet10(Decimal) { return createSlog10(Decimal).sexp; }

// 游戏侧统一入口：注入宿主（globalThis，读其 break_infinity.js 的 Decimal），
// 一次创建四个可直接调用的函数（src/core/00-state.js 解构接线）。
// tet2/tet10 即 sexp 工厂（附 .log10/.shiftLog10/.number 方法）
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
