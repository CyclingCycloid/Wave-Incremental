// ---------- Theme ----------
function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  state.settings.theme = theme;
  document.getElementById("theme-white").classList.toggle("active", theme === "white");
  document.getElementById("theme-black").classList.toggle("active", theme === "black");
}
function applyDecimals(n) {
  n = Math.min(6, Math.max(3, parseInt(n, 10) || 3));
  state.settings.decimals = n;
  const inp = document.getElementById("decimals-input");
  if (inp) inp.value = n;
}
// 数值显示方式：scientific（科学计数）/ e（对数 eXXX，直接显示 log10 值）
function applyNotation(n) {
  n = (n === "e") ? "e" : "scientific";
  state.settings.notation = n;
  document.querySelectorAll("#notation-row button").forEach(b => {
    b.classList.toggle("active", b.dataset.notation === n);
  });
}
// 界面刷新频率（显示层）：16/33/100 ms —— 逻辑 tick 恒为 100ms，不影响数值
let uiFrameInterval = 33;
let uiLastFrame = 0;
function applyUiFps(ms) {
  ms = [16, 33, 100].includes(parseInt(ms, 10)) ? parseInt(ms, 10) : 33;
  state.settings.uiFps = ms;
  uiFrameInterval = ms;
  document.querySelectorAll("#uifps-row button").forEach(b => {
    b.classList.toggle("active", parseInt(b.dataset.uifps, 10) === ms);
  });
}

// S6 选择困难症：在 5 分钟内，没有任何一种页面主题被连续使用超过 1 分钟。
// 实现：记录每次主题切换的时间戳；取当前时间作为末尾，向前找一段连续间隔均 ≤1min 的区间，
// 若该区间跨度 ≥5min 则达成。
function checkS6() {
  if (state.ach.hidden.includes("S6")) return;
  const sw = (state.themeSwitches || []).slice();
  const now = Date.now();
  sw.push(now); // 把"当前时刻"作为最后一个区间端点
  let i = sw.length - 1;
  while (i > 0 && sw[i] - sw[i - 1] <= 60000) i--; // 连续间隔 ≤1min
  const span = sw[sw.length - 1] - sw[i];
  if (span >= 300000) grantHidden("S6");
}

// ---------- Tabs ----------
const DEFAULT_SUBTAB = { wave: "main", stats: "stats-data", annihilation: "ann-sp", compact: "comp-ms" };
let lastSubtab = {}; // 记录每个主标签上次停留的子标签页
function switchTab(name) {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  const page = document.getElementById("page-" + name);
  if (page) page.classList.remove("hidden");
  // 记录最后所在的大标签（刷新后恢复）
  try { localStorage.setItem("waveIncremental_lastTab", name); } catch {}
  // 返回上次离开时所处的子标签页；无记录则用默认
  const sub = lastSubtab[name] || DEFAULT_SUBTAB[name];
  if (sub) switchSubtab(sub);
  if (name === "settings") renderSlots();
  if (name === "achievements") updateAchievementsUI();
  if (name === "annihilation") { updateSpUI(); updateDistortUI(); updateBlackholeUI(); updateVoidUI(); }
  if (name === "automation") updateAutomationUI();
  if (name === "compact") updateCompactUI();
}
function switchSubtab(name) {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  const target = document.getElementById("sub-" + name);
  if (!target) return; // 兜底：无效子页名不破坏当前渲染
  document.querySelectorAll(".subtab").forEach(t => t.classList.toggle("active", t.dataset.subtab === name));
  document.querySelectorAll(".subpage").forEach(p => p.classList.add("hidden"));
  target.classList.remove("hidden");
  // 记录当前主标签下最后停留的子标签页
  const activeTab = document.querySelector(".tab.active");
  if (activeTab) lastSubtab[activeTab.dataset.tab] = name;
  if (name === "ann-sp") updateSpUI();
  if (name === "ann-distort") updateDistortUI();
  if (name === "ann-blackhole") updateBlackholeUI();
  if (name === "ann-void") updateVoidUI();
  if (name === "comp-ms" || name === "comp-dim" || name === "comp-theory") updateCompactUI();
  if (name === "research") updateResearchUI();
}

