// ---------- 滚动新闻条 ----------
// 文案在根目录 news.js（window.gameNews 字符串数组），改完刷新即生效、无需重新构建。
// 数组为空/文件缺失时整条自动隐藏（可重复调用：文案热更新后重跑即可刷新）。
// 一次至多滚动一条：单条从条右缘进入、完全离开左缘后换下一条（CSS 动画，行程经
// --news-from/--news-to/--news-dur 三个变量传入关键帧，animationend 换条）。
// 调用顺序为不重随机（洗牌袋）：整轮洗牌逐条出袋，一轮放完才重洗；
// 重洗时若与上一条衔接相同则袋内换位（≥2 条时保证相邻不重复）。
// 悬停暂停为纯 CSS（animation-play-state）；速度恒定 NEWS_SPEED px/s；
// 系统开启「减弱动态效果」时退化为静态铺开（截断省略）。
// 实现注记：轨道用常规 in-flow inline-block（起点/终点全靠 transform 变量），
// 不用 absolute+WAAPI——后者在本项目嵌入式浏览器里文本层不绘制
const NEWS_SPEED = 110; // px/s
let newsItems = [];
let newsBag = [];      // 洗牌袋：本轮尚未播出的条目下标
let newsLastShown = -1; // 上一条下标（跨袋防衔接重复用）
// 不重随机取下一条：袋空则 Fisher-Yates 重洗全量下标，袋尾（下一个出袋）与上一条
// 相同则与袋首换位（条目唯一，袋首必不同；仅 1 条时无法避免重复）
function nextNewsIdx() {
  if (!newsBag.length) {
    newsBag = newsItems.map((_, i) => i);
    for (let i = newsBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = newsBag[i]; newsBag[i] = newsBag[j]; newsBag[j] = t;
    }
    if (newsBag.length > 1 && newsBag[newsBag.length - 1] === newsLastShown) {
      const t = newsBag[newsBag.length - 1];
      newsBag[newsBag.length - 1] = newsBag[0];
      newsBag[0] = t;
    }
  }
  newsLastShown = newsBag.pop();
  return newsLastShown;
}
function playNewsItem() {
  const bar = document.getElementById("news-ticker");
  const track = document.getElementById("news-track");
  if (!bar || bar.classList.contains("hidden") || !newsItems.length) return;
  track.textContent = newsItems[nextNewsIdx()];
  const barW = bar.clientWidth, itemW = track.offsetWidth;
  if (barW <= 0 || itemW <= 0) return;
  track.style.setProperty("--news-from", barW + "px");
  track.style.setProperty("--news-to", -itemW + "px");
  track.style.setProperty("--news-dur", ((barW + itemW) / NEWS_SPEED).toFixed(2) + "s");
  // 重置动画：置 none 强制 reflow 后清空，按新变量重新起跑
  track.style.animation = "none";
  void track.offsetWidth;
  track.style.animation = "";
}
function initNewsTicker() {
  const bar = document.getElementById("news-ticker");
  if (!bar) return;
  newsItems = (Array.isArray(window.gameNews) ? window.gameNews : [])
    .filter(s => typeof s === "string" && s.trim() !== "");
  newsBag = []; newsLastShown = -1; // 热更新：文案集已变，袋子重开
  bar.classList.remove("static-mode");
  if (!newsItems.length) { bar.classList.add("hidden"); return; } // 空/缺失：整条隐藏
  bar.classList.remove("hidden");
  const track = document.getElementById("news-track");
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    bar.classList.add("static-mode");
    track.textContent = newsItems.join("\u3000");
    track.onanimationend = null;
    return;
  }
  track.onanimationend = () => playNewsItem();
  playNewsItem();
  if (!initNewsTicker._bound) {
    initNewsTicker._bound = true;
    window.addEventListener("resize", () => {
      if (newsItems.length && track.onanimationend) playNewsItem(); // 当前条按新尺寸重新起跑
    });
  }
}

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
// 离线计算步数（1000–100000）：离线模拟的总步数预算，越高收益越精确、加载计算越久
function applyOfflineSteps(n) {
  n = Math.round(Number(n));
  if (!Number.isFinite(n)) n = 8000;
  n = Math.min(100000, Math.max(1000, n));
  state.settings.offlineSteps = n;
  const inp = document.getElementById("offline-steps-input");
  if (inp) inp.value = n;
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

