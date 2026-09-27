// ---------- 奇点升级（3DA 里程碑解锁）----------
// 第一类：可重复（SAU1-3，一行三个）
const SAU_DEFS = [
  { id: "sau1", key: "sau1", name: "象限拓张", desc: "声子升级3的硬上限 +2/级", vpu1Desc: "声子升级3的硬上限 +3/级", max: 10,
    costLog: (n) => sauCostLog(2, n) }, // 第n次（1起）10^(2+2n)；超10级后增速×当前等级（log 域，价格可超 double）
  { id: "sau2", key: "sau2", name: "奇点凝聚", desc: "第 n 级使奇点效果指数额外乘以 (1+n/10)", max: Infinity,
    costLog: (n) => lateCostLog(n, 250, (m) => 5 * m + (m > 10 ? sau2ExtraCostLog(m) : 0)) }, // 250 级起价格 = 上一级的 1.01 次方（v0.6.2）
  { id: "sau3", key: "sau3", name: "紫外灾难", desc: "热涨落效果指数 +0.015/级", vpu1Desc: "热涨落效果指数 +0.018/级", max: 10,
    costLog: (n) => sauCostLog(3, n) },
];
// SAU1/SAU3 的显示描述：单圈重整（VPU1）后使用加强版描述
function sauDesc(u) {
  return (u.vpu1Desc && vpuOwned("vpu1")) ? u.vpu1Desc : u.desc;
}
// 可重复升级的「总效果」文本（含软上限后缀；软上限 = 有效级别起点与公式）
// 返回 { text, capped } 或 null（该升级无总效果行）
function totalEffectText(id) {
  const n = (k) => state[k];
  const suffix = (eff) => `（受软上限影响，有效级别为 ${eff >= 100 ? fmt(eff) : eff.toFixed(1)}）`;
  const cappedSau = (key) => n(key) > 10;
  switch (id) {
    case "sau1": {
      // 有效级别 = floor(per*(10+(n-10)^指数))/per，与 pg3Cap 的软上限公式同源（含免费等级；节点 21 削弱软上限 0.7 → 0.8）
      const exp = theoryOwned("21") ? 0.8 : 0.7;
      const per = vpuOwned("vpu1") ? 3 : 2;
      const n1 = n("sau1") + sau1FreeLevel();
      const eff = Math.floor(per * (10 + Math.pow(Math.max(n1 - 10, 0), exp))) / per;
      return { text: `总效果：声子升级3上限 +${Math.floor(pg3Cap() - 20)}`, capped: n1 > 10, eff };
    }
    case "sau2": {
      const eff = effLevel(n("sau2"), 10, sau2SoftcapExp());
      return { text: `总效果：奇点效果 ×${fmt(sauMult())}`, capped: cappedSau("sau2"), eff };
    }
    case "sau3": {
      // 热涨落指数本底 0.2 不计入显示：只显示升级加成部分（+0.015/级，单圈重整后 +0.018/级）
      const eff = effLevel(n("sau3") + vpu2FreeLevel(), 10, 1 / 3);
      const per = vpuOwned("vpu1") ? 0.018 : 0.015;
      return { text: `总效果：热涨落效果指数 +${(per * eff).toFixed(3)}`, capped: cappedSau("sau3"), eff };
    }
    case "sau4": {
      const lg = n("sau4") * Math.log10(2);
      return { text: `总效果：奇点获取 ×${fmtNum(Math.pow(10, Math.min(lg, 308)), lg)}`, capped: false };
    }
    case "sbu1": {
      // 事件视界总等级含量子狂潮免费等级（与 bhAccretionGainLog 的扣费口径一致）
      const total = n("sbu1") + vpu2FreeLevel();
      const lg = total * Math.log10(2);
      return { text: `总效果：吸积效率 ×${fmtNum(Math.pow(10, Math.min(lg, 308)), lg)}`, capped: false };
    }
    case "sbu2": {
      const eff = sbu2Eff();
      return { text: `总效果：黑洞效果指数 +${(0.2 + 0.05 * eff).toFixed(2)}`, capped: n("sbu2") > 7, eff };
    }
    case "sbu3": {
      const eff = sbu3Eff();
      const multLog = eff * Math.log10(2);
      const mult = multLog > 308 ? Infinity : Math.pow(10, multLog);
      return { text: `总效果：虚粒子获取 ×${fmtNum(mult, multLog)}`, capped: n("sbu3") > 16, eff };
    }
    case "svpu1": {
      // v0.6.2：质量指数超 1 开平方——显示合并后的有效指数
      const n0 = 0.75 + 0.03 * n("svpu1") + (vpuOwned("vpu4") ? 0.05 : 0);
      const eff = n0 > 1 ? Math.sqrt(n0) : n0;
      return { text: `总效果：吸积质量指数 ${eff.toFixed(3)}`, capped: n0 > 1, eff };
    }
    case "svpu2": {
      const lg = n("svpu2") * Math.log10(2);
      return { text: `总效果：湮灭次数 ×${fmtNum(Math.pow(10, Math.min(lg, 308)), lg)}`, capped: false };
    }
    case "svpu3":
      return { text: `总效果：升级3软上限削弱 ÷${n("svpu3") + 1}`, capped: false };
    case "svpu4": {
      // 节点41 波动光学：SVU2 免费等级与真实等级合并后一并 ×2——分母按合并后的有效等级显示
      const den = (state.svpu4 + svu2Svpu4Bonus()) * (theoryOwned("41") ? 2 : 1) + 2;
      return { text: `总效果：温度软上限缩放指数 1/${Number.isInteger(den) ? den : den.toFixed(2)}` + (svu2Svpu4Bonus() > 0 ? `（含能标偏移 +${fmt(svu2Svpu4Bonus())}）` : ""), capped: false };
    }
    case "svpu5":
      return { text: `总效果：黑洞质量软上限起始 1e${bhMassSoftcapLog()}`, capped: false };
    default:
      return null;
  }
}
// 刷新一张可重复升级卡的总效果行（totalEl 存在时）
function renderTotalEffect(el, id) {
  if (!el) return;
  const t = totalEffectText(id);
  if (!t) { el.textContent = ""; return; }
  el.textContent = t.text + (t.capped ? `（受软上限影响，有效级别为 ${t.eff >= 100 ? fmt(t.eff) : t.eff.toFixed(1)}）` : "");
}

