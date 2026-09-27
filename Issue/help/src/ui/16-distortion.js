// ---------- 扭曲宇宙 UI（build-once, in-place update）----------
let distortBuilt = false, distortRefs = [];
function buildDistortOnce() {
  if (distortBuilt) return;
  const list = document.getElementById("distort-list");
  list.innerHTML = ""; distortRefs = [];
  for (const u of DISTORT_UNIVERSES) {
    const card = document.createElement("div");
    card.className = "distort-card";
    const nm = document.createElement("div"); nm.className = "dt-name"; nm.textContent = u.name;
    const ds = document.createElement("div"); ds.className = "dt-desc"; ds.textContent = u.desc;
    const st = document.createElement("div"); st.className = "dt-status";
    const btn = document.createElement("button"); btn.textContent = "进入";
    btn.addEventListener("click", () => enterDistort(u.id));
    card.append(nm, ds, st, btn);
    list.appendChild(card);
    distortRefs.push({ u, card, statusEl: st, btn });
  }
  distortBuilt = true;
}
function updateDistortUI() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  if (state.annihilations < 20) return;
  buildDistortOnce();
  // 重试/退出按钮：仅在扭曲宇宙中可见
  document.getElementById("distort-active-controls").classList.toggle("hidden", !state.distortActive);
  // 顶部汇总行：湮灭的扭曲宇宙数与奇点倍率
  const summary = document.getElementById("distort-summary");
  summary.innerHTML =
    "你湮灭了<span class='ds-red'>" + distortDA() + "</span>个扭曲宇宙，" +
    "<span class='ds-purple'>奇点</span>获取变为<span class='ds-red'>" + fmt(state.distortMult) + "</span>倍";
  for (const r of distortRefs) {
    const done = state.distortDone.includes(r.u.id);
    const active = state.distortActive === r.u.id;
    r.card.classList.toggle("done", done && !active);
    r.card.classList.toggle("active", active);
    const tpLog = isFinite(r.u.tp) ? Math.log10(r.u.tp) : Infinity;
    const tpStr = isFinite(r.u.tp) ? fmt(r.u.tp) : "∞";
    if (active) {
      r.statusEl.textContent = `进行中 · 目标 ${tpStr} K`;
      r.btn.textContent = "进行中";
      r.btn.disabled = true;
    } else if (done) {
      r.statusEl.textContent = `已湮灭 · 可再次进入`;
      r.btn.textContent = "进入";
      r.btn.disabled = false;
    } else {
      r.statusEl.textContent = `目标 ${tpStr} K`;
      r.btn.textContent = "进入";
      r.btn.disabled = false;
    }
  }
}

