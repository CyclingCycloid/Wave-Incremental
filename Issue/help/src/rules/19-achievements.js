// ---------- 成就弹窗系统（左上角，堆叠+补位动画）----------
function showAchPopup(name, isHidden) {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  const stack = document.getElementById("ach-popup-stack");
  if (!stack) return;
  const popup = document.createElement("div");
  popup.className = "ach-popup " + (isHidden ? "hidden-ach" : "normal");
  popup.textContent = "获得成就：" + name;
  stack.appendChild(popup);
  // 1.5s 后移除（CSS 动画已淡出）；移除后下方弹窗自动上浮（CSS transition）
  setTimeout(() => {
    popup.style.opacity = "0";
    popup.style.transform = "translateY(-10px)";
    setTimeout(() => popup.remove(), 300);
  }, 1500);
}

// ---------- Achievements ----------
const NORMAL_ACH = [
  // 第 1 行 (A11-A15)
  { id: "A11", name: "蓝移", desc: "购买第一个升级", check: () => state.up1 >= 1 },
  { id: "A12", name: "协同", desc: "购买第一个单次升级", check: () => state.meta1 >= 1 || state.phUnlocked >= 1 },
  { id: "A13", name: "超声", desc: "到达 20000 Hz", check: () => F() >= 20000 },
  { id: "A14", name: "效率", desc: "第一次缩短波长", check: () => state.up3 >= 1 },
  { id: "A15", name: "计算", desc: "到达 1 GHz", check: () => F() >= 1e9 },
  // 第 2 行 (A21-A25) 声子
  { id: "A21", name: "热学", desc: "启动声子发生器", star: true, reward: "up1 的效果变为 1.5 次方", check: () => !!state.phOn },
  { id: "A22", name: "室温", desc: "到达 300 K", check: () => temperature() >= 300 },
  { id: "A23", name: "聚变", desc: "到达 1.5e7 K", check: () => temperature() >= 1.5e7 },
  { id: "A24", name: "耦合", desc: "购买声波耦合", check: () => state.phCoupling >= 1 },
  { id: "A25", name: "湮灭", desc: "达到普朗克温度（1.417e32 K）", star: true, reward: "各个重置后波速为 100 m/s", check: () => state.annihilations >= 1 },
  // 第 3 行 (A31-A35) 湮灭
  { id: "A31", name: "QoL", desc: "获得所有自动化", check: () => state.autoWaveUpg && state.autoPhononUpg && state.autoUp3 && state.autoAnn },
  { id: "A32", name: "创生", desc: "获取奇点前资源不消耗", check: () => hasMilestone(15) },
  { id: "A33", name: "扭曲", desc: "解锁扭曲选项卡", check: () => state.annihilations >= 20 },
  { id: "A34", name: "秩序", desc: "湮灭一个被扭曲的宇宙", star: true, reward: "解锁批量购买", check: () => state.distortDone.length >= 1 },
  { id: "A35", name: "刻写", desc: "购买第一个奇点升级", check: () => (state.sau1 + state.sau2 + state.sau3 + state.sau4 > 0) || Object.keys(state.au).length > 0 },
  // 第 4 行 (A41-A45) 奇点
  { id: "A41", name: "视界", desc: "解锁黑洞", star: true, reward: "总时间倍率再 ^1.1", check: () => bhUnlocked() },
  { id: "A42", name: "烂柯", desc: "总时间倍率超过 3.65e5", star: true, reward: "自动湮灭 CD 变为 200ms，并解锁一个新的自动化升级", check: () => timeRate() >= 3.65e5 },
  { id: "A43", name: "无限", desc: "打破多元宇宙的规则", check: () => state.rulesBroken && !state.testBreakRules }, // 原 A35
  { id: "A44", name: "永炽", desc: "温度超过 1.79e308 K", check: () => temperature() >= 1.79e308 },
  { id: "A45", name: "万物", desc: "购买所有奇点升级", star: true, reward: "解锁虚幻升级", check: () => ALL_SP_UPGRADES_OWNED() },
  // 第 5 行 (A51-…) 虚粒子
  { id: "A51", name: "虚幻", desc: "购买第一个虚幻升级", check: () => VPU_DEFS.some(u => vpuOwned(u.id)) },
  { id: "A52", name: "超载", desc: "达到 1e50 Sp", star: true, reward: "解锁“虚空”选项卡", check: () => getLogTotalSp() >= 50 },
  { id: "A53", name: "融合", desc: "完成至少两种扭曲的虚空", star: true, reward: "up1 获得免费等级 1（重置不清零）", check: () => state.voidBestRules >= 2 },
  { id: "A54", name: "混沌", desc: "完成所有扭曲生效的虚空", check: () => state.voidBestRules >= 8 },
  { id: "A55", name: "卷缩", desc: "达到 1.79e308 奇点", star: true, reward: "解锁下一个重置层：卷缩（测试中）；任何重置后初始波速为 1e3 m/s", check: () => getLogSp() >= SP_SOFTCAP_PIVOT_LOG },
  { id: "A61", name: "折叠", desc: "开始产出卡拉比-丘流形", check: () => getLogCM() > NLOG + 1 },
  { id: "A62", name: "理论", desc: "购买九个理论树节点", check: () => Object.keys(state.theoryNodes).length >= 9 },
  { id: "A63", name: "里程", desc: "获得所有卷缩里程碑", check: () => COMP_MILESTONES.every(m => state.compactions >= m.n) },
  { id: "A64", name: "几何", desc: "基础CM获取超过 4e6/s", star: true, reward: "解锁「自动最佳分配」按钮", check: () => cmRateLog() > Math.log10(4e6) },
  { id: "A65", name: "研究", desc: "解锁研究选项卡", check: () => theoryOwned("51") },
  // 第 7 行 (A71-…)
  { id: "A71", name: "乌云", desc: "完成一次实验", star: true, reward: "解锁研究项目",
    // 更新前完成过实验的老玩家由 migrateState 补发（ED>0 或 S29 均证明结束过实验）
    check: () => state.researchDone >= 1 || getLogED() > NLOG + 1 || state.ach.hidden.includes("S29") },
  { id: "A72", name: "立论", desc: "解锁课题", star: true, reward: "理论深度加成实验数据与推论获取",
    check: () => researchBought("R9") },
];
const ACH_PER_ROW = 5;
// 已定义行数；之后整行为未解锁 ???
const NORMAL_ROWS = Math.ceil(NORMAL_ACH.length / ACH_PER_ROW);

const HIDDEN_ACH = [
  { id: "S1", name: "点击即送", check: () => false },
  { id: "S2", name: "二游", check: () => false },
  { id: "S3", name: "快点端上来罢", check: () => false }, // 价格不足时5秒点10次购买按钮
  { id: "S4", name: "您来的真早！", check: () => {
      // 00:00–00:59 打开游戏（"真早"指清早）；若指中午 12:00–13:00，改 h===12
      const h = new Date().getHours();
      return h === 0;
  }},
  { id: "S5", name: "哼哼哼啊——", check: () => false },
  { id: "S6", name: "选择困难症", check: () => false },
  { id: "S7", name: "请注意使用规范", check: () => false }, // 10秒内反复开关20次声子发生器
  { id: "S8", name: "无用功", check: () => false }, // 加成小于1.1x时购买升级3
  { id: "S9", name: "柚子厨蒸鹅心", check: () => false }, // 导入存档处输入0721并导入
  { id: "S10", name: "歪了", check: () => false }, // 点击S2时每次有0.3%概率获得
  { id: "S11", name: "踌躇不决", check: () => false }, // 达到当前普朗克温度后五分钟不湮灭
  { id: "S12", name: "就你特殊？？！！", check: () => false }, // 点击QoL成就按钮10次
  { id: "S13", name: "额，你知道这玩意怎么用吗", check: () => false }, // 升级3自动化填入小于1的数字
  { id: "S14", name: "哦不我无疑是难过的", check: () => false }, // 扭曲宇宙中失败十次（退出计失败）
  { id: "S15", name: "这是距离增量吗？", check: () => false }, // 达到 1e308 m 波长
  { id: "S16", name: "硬核玩家", check: () => false }, // 已在扭曲宇宙中时点击另一个宇宙的进入
  { id: "S17", name: "禅", check: () => false }, // 在扭曲宇宙中停留超过 1h 未完成
  { id: "S18", name: "getting over it", check: () => false }, // 能完成后重试/退出而非完成
  { id: "S19", name: "滚木", check: () => false }, // 生产为 0 Hz/s 超过 10 分钟
  { id: "S20", name: "version control", check: () => false }, // 查看 changelog
  { id: "S21", name: "这是饼干点点乐吗？", check: () => false }, // 点击黑洞动画界面 100 次
  { id: "S22", name: "白洞", check: () => false }, // 黑洞保持脉冲状态 5 分钟以上
  { id: "S23", name: "裸奇点", check: () => false }, // 黑洞倍率为 1 时保持扭曲状态 10 分钟以上
  { id: "S24", name: "你变秃了，也变强了", check: () => false }, // 一天（当日窗口）内 rua 摆线 200 次
  { id: "S25", name: "这是旮旯给木吗？", check: () => false }, // 好感度达到 500
  { id: "S26", name: "你才是挑战者", check: () => false }, // 进入所有（8 种）扭曲生效的虚空
  { id: "S27", name: "几何学不存在了", check: () => state.tpF > state.tpE && state.tpE > 0 }, // 维度折叠器的面 F > 边 E > 0（几何上不可能：面数超过边数）
  { id: "S28", name: "增量神秘数字", check: () => false }, // 在理论树导入框输入 69（doImportTheoryTree 内授予）
  { id: "S29", name: "我想做的前人们都做过了", check: () => false }, // 结束一次获得 0 实验数据的实验（researchExit 内授予）
  { id: "S30", name: "人类完蛋了，欸不对走错片场了", check: () => false }, // 购买研究 R1「托特管状折叠」（buyResearch 内授予）
];
// S5 目标序列：S1,S1,S4,S5,S1,S4
const S5_SEQUENCE = ["S1", "S1", "S4", "S5", "S1", "S4"];
// A45 万物：是否拥有所有奇点升级（SAU1-3、真空衰变、全部 16 个 AU）
function ALL_SP_UPGRADES_OWNED() {
  if (state.sau1 < 1 || state.sau2 < 1 || state.sau3 < 1 || state.sau4 < 1) return false;
  // 所有单次奇点升级（AU 全系列）——未实装的 cost=Infinity 永远无法购买，
  // 故 A45 在全部实装并购买后才能达成
  return AU_DEFS.flat().every(u => auOwned(u.id));
}

function checkAchievements() {
  for (const a of NORMAL_ACH) {
    if (!state.ach.normal.includes(a.id) && a.check()) {
      state.ach.normal.push(a.id);
      showAchPopup(a.name, false);
    }
  }
  for (const a of HIDDEN_ACH) {
    if (!state.ach.hidden.includes(a.id) && a.check()) {
      state.ach.hidden.push(a.id);
      showAchPopup(a.name, true);
    }
  }
}

function isRowUnlocked(r) {
  if (r === 0) return true;
  // 第 r 行解锁条件：第 r-1 行全部完成
  const prev = NORMAL_ACH.slice((r - 1) * ACH_PER_ROW, r * ACH_PER_ROW);
  return prev.length === ACH_PER_ROW && prev.every(a => state.ach.normal.includes(a.id));
}

// ---------- 隐藏成就点击处理 ----------
function grantHidden(id) {
  if (!state.ach.hidden.includes(id)) {
    const a = HIDDEN_ACH.find(x => x.id === id);
    state.ach.hidden.push(id);
    if (a) showAchPopup(a.name, true);
  }
}

function onHiddenClick(id) {
  const done = state.ach.hidden.includes(id);
  const revealed = state.ach.hiddenRevealed.includes(id);
  // S1：点击即送 —— 点击 S1 直接完成
  if (id === "S1" && !done) { grantHidden("S1"); }

  // S2：二游 —— 每次点击 S2 有 0.6% 概率获得
  // S10：歪了 —— 点击 S2 时每次点击有 0.3% 概率获得（独立判定，不受 S2 已完成影响）
  if (id === "S2") {
    if (!done && Math.random() < 0.006) grantHidden("S2");
    if (!state.ach.hidden.includes("S10") && Math.random() < 0.003) grantHidden("S10");
  }

  // S12：就你特殊？？！！ —— 点击 QoL（A31）成就单元格 10 次
  // （在 buildAchievementsOnce 中给 A31 单元格绑定了点击计数）

  // S5：哼哼哼啊—— 按序列 S1,S1,S4,S5,S1,S4 点击
  // （即便目标单元格已完成或未揭示，点击均计入序列）
  if (!state.ach.hidden.includes("S5")) {
    state.hiddenClicks.push(id);
    if (state.hiddenClicks.length > S5_SEQUENCE.length) state.hiddenClicks.shift();
    if (state.hiddenClicks.length === S5_SEQUENCE.length &&
        state.hiddenClicks.every((v, i) => v === S5_SEQUENCE[i])) {
      grantHidden("S5");
      state.hiddenClicks = [];
    }
  }

  // 未揭示的常规揭示逻辑（点击后显示名称）
  if (!done && !revealed) {
    state.ach.hiddenRevealed.push(id);
  }

  // S4 不靠点击，但点击任何隐藏成就时顺便检查一次系统时间
  if (!state.ach.hidden.includes("S4") && HIDDEN_ACH.find(x => x.id === "S4").check()) {
    grantHidden("S4");
  }

  updateAchievementsUI();
}

// ---------- Achievements (build-once, in-place update) ----------
let achBuilt = false;
let normalCellRefs = [];
let normalRowEls = [];
let hiddenCellRefs = [];

function buildAchievementsOnce() {
  if (achBuilt) return;
  const grid = document.getElementById("normal-ach-grid");
  grid.innerHTML = "";
  normalCellRefs = [];
  normalRowEls = [];
  // 已定义行 + 1 行锁定行（展示 ??? 结构）。
  // 每个逻辑行包进独立的 .ach-row 行容器：手机窄屏时一行 5 个拆成 3+2 居中，
  // 不同逻辑行的成就永远不会混到同一视觉行。
  for (let r = 0; r < NORMAL_ROWS + 1; r++) {
    const rowEl = document.createElement("div");
    rowEl.className = "ach-row";
    grid.appendChild(rowEl);
    normalRowEls[r] = rowEl;
    for (let c = 0; c < ACH_PER_ROW; c++) {
      const idx = r * ACH_PER_ROW + c;
      const a = NORMAL_ACH[idx];
      const cell = document.createElement("div");
      cell.className = "ach-cell";
      const idEl = document.createElement("div"); idEl.className = "ach-id";
      const nameEl = document.createElement("div"); nameEl.className = "ach-name";
      const descEl = document.createElement("div"); descEl.className = "ach-desc";
      const checkEl = document.createElement("div"); checkEl.className = "ach-check";
      const lockEl = document.createElement("div"); lockEl.className = "ach-locked";
      const starEl = document.createElement("div"); starEl.className = "ach-star"; starEl.textContent = "★";
      // 特殊奖励 tooltip（小黑框，点击切换显示）
      const tipEl = document.createElement("div"); tipEl.className = "ach-reward-tip";
      cell.append(idEl, nameEl, descEl, checkEl, lockEl, starEl, tipEl);
      if (a && a.reward) {
        cell.classList.add("has-reward");
        // 「//」原意是换行：第一行成就编号，第二行奖励描述。
        // 行解锁后即可点击查看奖励（无需完成该成就）
        tipEl.textContent = a.id + "\n" + a.reward;
        cell.addEventListener("click", () => {
          if (!isRowUnlocked(r)) return; // 未解锁行不可点
          cell.classList.toggle("show-tip");
        });
      }
      // S12：就你特殊？？！！ —— 点击 QoL（A31）成就单元格 10 次
      if (a && a.id === "A31") {
        let qolClicks = 0;
        cell.addEventListener("click", () => {
          qolClicks++;
          if (qolClicks >= 10 && !state.ach.hidden.includes("S12")) {
            grantHidden("S12");
            updateAchievementsUI();
          }
        });
      }
      rowEl.appendChild(cell);
      normalCellRefs.push({ root: cell, a, row: r, idEl, nameEl, descEl, checkEl, lockEl, starEl, tipEl });
    }
  }
  const hgrid = document.getElementById("hidden-ach-grid");
  hgrid.innerHTML = "";
  hiddenCellRefs = [];
  for (const a of HIDDEN_ACH) {
    const cell = document.createElement("div");
    cell.className = "ach-cell hidden-ach";
    const idEl = document.createElement("div"); idEl.className = "ach-id"; idEl.textContent = a.id;
    const nameEl = document.createElement("div"); nameEl.className = "ach-name";
    const descEl = document.createElement("div"); descEl.className = "ach-desc";
    const lockEl = document.createElement("div"); lockEl.className = "ach-locked";
    const starEl = document.createElement("div"); starEl.className = "ach-star"; starEl.textContent = "★";
    cell.append(idEl, nameEl, descEl, lockEl, starEl);
    // 点击处理器在构建时绑定一次，之后稳定不变
    cell.addEventListener("click", () => onHiddenClick(a.id));
    hgrid.appendChild(cell);
    hiddenCellRefs.push({ root: cell, a, idEl, nameEl, descEl, lockEl, starEl });
  }
  // 行显示过滤选项（勾选状态随存档保存，值同步在 updateAchievementsUI）
  const lk = document.getElementById("ach-hide-locked");
  const dn = document.getElementById("ach-hide-done");
  lk.addEventListener("change", () => {
    state.settings.hideLockedRows = lk.checked;
    saveGame();
    updateAchievementsUI();
  });
  dn.addEventListener("change", () => {
    state.settings.hideDoneRows = dn.checked;
    saveGame();
    updateAchievementsUI();
  });
  achBuilt = true;
}

function updateAchievementsUI() {
  if (simActive) return; // 离线模拟中不触碰 DOM/存档
  buildAchievementsOnce();
  // 成就页只显示成就本身的乘数（1.1 或 1.2/个），不含时间之矢/成就刻印以外的升级、黑洞与 A41 加成
  document.getElementById("ach-time-rate").textContent = `你的成就将时间速率变为原来的${fmt(Math.pow(achTimeBase(), state.ach.normal.length))}倍`;
  // 行显示过滤：未解锁行默认整体隐藏（勾选项可改回 ??? 占位），已完成行可选隐藏
  const lk = document.getElementById("ach-hide-locked");
  const dn = document.getElementById("ach-hide-done");
  lk.checked = state.settings.hideLockedRows !== false;
  dn.checked = !!state.settings.hideDoneRows;
  for (let r = 0; r < NORMAL_ROWS + 1; r++) {
    const defs = NORMAL_ACH.slice(r * ACH_PER_ROW, (r + 1) * ACH_PER_ROW);
    const unlocked = isRowUnlocked(r);
    const done = defs.length > 0 && defs.every(a => state.ach.normal.includes(a.id));
    let visible = true;
    if (lk.checked && !unlocked) visible = false;
    if (dn.checked && done) visible = false;
    if (normalRowEls[r]) normalRowEls[r].style.display = visible ? "" : "none";
  }
  // 普通成就：行解锁即显示真实名字与星标，奖励可点击查看（无需完成）
  for (const ref of normalCellRefs) {
    const { a, row, root, idEl, nameEl, descEl, checkEl, lockEl, starEl } = ref;
    const unlocked = isRowUnlocked(row);
    if (!a || !unlocked) {
      root.classList.remove("completed");
      idEl.style.display = "none";
      nameEl.style.display = "none";
      descEl.style.display = "none";
      checkEl.style.display = "none";
      starEl.style.display = "none";
      lockEl.style.display = "";
      lockEl.textContent = "???";
      continue;
    }
    const done = state.ach.normal.includes(a.id);
    root.classList.toggle("completed", done);
    lockEl.style.display = "none";
    starEl.style.display = a.star ? "" : "none";
    idEl.style.display = ""; idEl.textContent = a.id;
    nameEl.style.display = ""; nameEl.textContent = a.name;
    descEl.style.display = ""; descEl.textContent = a.desc;
    checkEl.style.display = ""; checkEl.textContent = done ? "✓ 已完成" : "未完成";
  }
  // 隐藏成就
  for (const ref of hiddenCellRefs) {
    const { a, root, idEl, nameEl, descEl, lockEl, starEl } = ref;
    const done = state.ach.hidden.includes(a.id);
    const revealed = state.ach.hiddenRevealed.includes(a.id);
    root.classList.toggle("completed", done);
    idEl.style.display = "";
    starEl.style.display = "none"; // 隐藏成就无特殊奖励，星星不显示
    if (done) {
      nameEl.style.display = ""; nameEl.textContent = a.name;
      descEl.style.display = ""; descEl.textContent = "✓ 已完成";
      lockEl.style.display = "none";
    } else if (revealed) {
      nameEl.style.display = ""; nameEl.textContent = a.name;
      descEl.style.display = ""; descEl.textContent = "未达成";
      lockEl.style.display = "none";
    } else {
      nameEl.style.display = "none";
      descEl.style.display = "none";
      lockEl.style.display = ""; lockEl.textContent = "???";
    }
  }
}

