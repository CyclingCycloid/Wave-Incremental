// ---------- Wire up UI ----------
function setupUI() {
  document.querySelectorAll(".tab").forEach(t => {
    t.addEventListener("click", () => switchTab(t.dataset.tab));
  });
  document.querySelectorAll(".subtab").forEach(t => {
    t.addEventListener("click", () => switchSubtab(t.dataset.subtab));
  });

  // 主题切换计入 S6 判定（仅实际变更时记录——重复点击当前主题不算切换）
  const onThemeBtn = (theme) => {
    const prev = state.settings.theme;
    applyTheme(theme);
    if (state.settings.theme !== prev) { state.themeSwitches.push(Date.now()); checkS6(); }
    saveGame();
  };
  document.getElementById("theme-white").addEventListener("click", () => onThemeBtn("white"));
  document.getElementById("theme-black").addEventListener("click", () => onThemeBtn("black"));

  // 离线收益开关 + 收益弹窗关闭按钮
  document.getElementById("offline-on").addEventListener("click", () => {
    state.settings.offlineEnabled = true; syncOfflineToggleUI(); saveGame();
    setAutosaveStatus("离线收益已开启（上限 8 小时）");
  });
  document.getElementById("offline-off").addEventListener("click", () => {
    state.settings.offlineEnabled = false; syncOfflineToggleUI(); saveGame();
    setAutosaveStatus("离线收益已关闭");
  });
  syncOfflineToggleUI();
  document.getElementById("offline-claim").addEventListener("click", () => {
    document.getElementById("offline-overlay").classList.add("hidden");
  });

  document.querySelectorAll("#notation-row button").forEach(b => {
    b.addEventListener("click", () => {
      applyNotation(b.dataset.notation);
      saveGame();
      renderAll();
    });
  });

  const decInp = document.getElementById("decimals-input");
  decInp.addEventListener("change", () => {
    applyDecimals(decInp.value);
    saveGame();
    renderAll();
  });

  // 界面刷新频率
  document.querySelectorAll("#uifps-row button").forEach(b => {
    b.addEventListener("click", () => {
      applyUiFps(b.dataset.uifps);
      saveGame();
      setAutosaveStatus("界面刷新频率已调整");
    });
  });

  // 导出存档为 TXT 文件下载（内容与文本框导出一致）
  document.getElementById("save-download").addEventListener("click", () => {
    state.lastTick = Date.now();
    const code = encodeSave(state);
    document.getElementById("save-io").value = code;
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    a.download = `WaveIncremental-save-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.txt`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    setAutosaveStatus("已导出存档文件");
  });
  document.getElementById("save-load-from-io").addEventListener("click", importSaveFromIo);
  // 从 TXT 文件导入：文件内容填入文本框后走同一导入逻辑（与「导出为 TXT 文件」下载的文件配套）
  const saveFileInput = document.getElementById("save-file-input");
  document.getElementById("save-load-txt").addEventListener("click", () => saveFileInput.click());
  saveFileInput.addEventListener("change", () => {
    const file = saveFileInput.files && saveFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    // 读取结束再清空 input.value（允许连续选择同一文件）——
    // 若在 readAsText 后立即清空，个别浏览器可能取消挂起的读取（选了文件却毫无反应）
    const done = () => { saveFileInput.value = ""; };
    reader.onload = () => {
      document.getElementById("save-io").value = String(reader.result || "");
      done();
      importSaveFromIo();
    };
    reader.onerror = () => { setAutosaveStatus("读取文件失败"); done(); };
    reader.readAsText(file);
  });
  // 导出并复制：存档同步写入文本框呈现，再复制到剪贴板（备用方式：选中后 execCommand）
  document.getElementById("save-copy").addEventListener("click", async () => {
    state.lastTick = Date.now();
    const code = encodeSave(state);
    const io = document.getElementById("save-io");
    io.value = code;
    try { await navigator.clipboard.writeText(code); setAutosaveStatus("已导出到文本框并复制到剪贴板"); }
    catch {
      io.focus(); io.select();
      try { document.execCommand("copy"); setAutosaveStatus("已导出到文本框并复制到剪贴板（备用方式）"); }
      catch { setAutosaveStatus("已导出到文本框，复制失败"); }
    }
  });

  document.getElementById("hard-reset").addEventListener("click", hardReset);

  // 8DA：打破/恢复多元宇宙的规则（奇点页顶部按钮）
  const brBtn = document.getElementById("break-rules-btn");
  brBtn.addEventListener("click", () => {
    if (!hasDistortMilestone(8)) return;
    state.rulesBroken = !state.rulesBroken;
    saveGame();
    renderAll();
    setAutosaveStatus(state.rulesBroken ? "多元宇宙的规则已被打破" : "多元宇宙的规则已恢复");
  });

  // rua摆线：rua 按钮下方显示文字；好感度每天最多 100；独立倍率按钮（CD 1h，效果 10min）
  const ruaBtn = document.getElementById("rua-btn");
  const ruaStatus = document.getElementById("rua-status");
  const ruaBoostBtn = document.getElementById("rua-boost-btn");
  const ruaBoostInfo = document.getElementById("rua-boost-info");
  const refreshRuaUI = () => {
    const now = Date.now();
    // 每天重置好感度获取窗口（86400000ms = 24h）
    if (!state.ruaDayStart || now - state.ruaDayStart >= 86400000) {
      state.ruaDayStart = now;
      state.ruaCountToday = 0;
      state.ruaClicksToday = 0;
    }
    // rua 按钮下方文字
    if (state.ruaCountToday >= 100) {
      ruaStatus.textContent = `好感度 ${fmt(state.ruaFav)}（今天已上限，明天再来）`;
    } else {
      ruaStatus.textContent = `好感度 ${fmt(state.ruaFav)}（今天已 rua ${state.ruaCountToday}/100）`;
    }
    // 倍率按钮：显示倍率和剩余时间（持续时间或 CD）
    const inCD = state.ruaBoostCD && now < state.ruaBoostCD;
    const inBoost = state.ruaBoostUntil && now < state.ruaBoostUntil;
    if (inBoost) {
      const remain = Math.ceil((state.ruaBoostUntil - now) / 1000);
      ruaBoostBtn.textContent = `×${fmt(state.ruaBoostMult)} 剩余 ${remain}s`;
      ruaBoostBtn.disabled = true;
    } else if (inCD) {
      const remain = Math.ceil((state.ruaBoostCD - now) / 1000);
      ruaBoostBtn.textContent = `CD ${remain}s`;
      ruaBoostBtn.disabled = true;
    } else {
      ruaBoostBtn.textContent = "获取倍率";
      ruaBoostBtn.disabled = false;
    }
    ruaBoostInfo.textContent = inBoost ? `当前倍率 ×${fmt(state.ruaBoostMult)}（剩余 ${Math.ceil((state.ruaBoostUntil - now) / 1000)}s）` : "点击获取随机倍率加成（持续 10 分钟，CD 1 小时）";
  };
  ruaBtn.addEventListener("click", () => {
    const now = Date.now();
    if (!state.ruaDayStart || now - state.ruaDayStart >= 86400000) {
      state.ruaDayStart = now;
      state.ruaCountToday = 0;
      state.ruaClicksToday = 0;
    }
    state.ruaClicksToday++;
    // S24：一天内 rua 200 次（点击次数不受好感度上限限制）
    if (state.ruaClicksToday >= 200 && !state.ach.hidden.includes("S24")) { grantHidden("S24"); updateAchievementsUI(); }
    if (state.ruaCountToday >= 100) {
      ruaStatus.textContent = `要被 rua 秃了 qwq（好感度 ${fmt(state.ruaFav)}）`;
      return;
    }
    state.ruaCountToday++;
    state.ruaFav++;
    // S25：好感度达到 500
    if (state.ruaFav >= 500 && !state.ach.hidden.includes("S25")) { grantHidden("S25"); updateAchievementsUI(); }
    // rua 按钮下方文字
    ruaStatus.textContent = `你 rua 了 rua 摆线，好感度 +1（今天 ${state.ruaCountToday}/100）`;
    refreshRuaUI();
    saveGame();
  });
  ruaBoostBtn.addEventListener("click", () => {
    const now = Date.now();
    if (state.ruaBoostCD && now < state.ruaBoostCD) return;
    if (state.ruaBoostUntil && now < state.ruaBoostUntil) return;
    // 随机倍率：random(min(1+Fav/1000, 2), 2)
    const lo = Math.min(1 + state.ruaFav / 1000, 2);
    state.ruaBoostMult = lo + Math.random() * (2 - lo);
    state.ruaBoostUntil = now + 600000; // 效果 10 分钟
    state.ruaBoostCD = now + 3600000;   // CD 1 小时
    refreshRuaUI();
    saveGame();
  });
  // 实时刷新 rua UI（每秒）
  setInterval(refreshRuaUI, 1000);
  refreshRuaUI();


  // 测试模式（危险操作区）：开发者预览开关——密码进入后可预览尚未正式发布的开发内容
  //（未来如新重置层）。退出时只清标志：已正式发布的内容（A52/虚空等）不受影响
  const TEST_PASSWORD = "ilvcycloiduwu";
  const applyTestModeUI = applyTestModeUIGlobal;
  document.getElementById("enter-test-btn").addEventListener("click", () => {
    if (state.testMode) {
      if (state.voidActive) exitVoid(); // 正在虚空中先结算退出，防孤儿状态
      state.testMode = false;
      state.svu1Filling = false; // 停止 SVU1 填充
      applyTestModeUI();
      saveGame();
      renderAll();
      setAutosaveStatus("已退出测试模式");
      return;
    }
    const pw = prompt("输入测试密码：");
    if (pw === null) return;
    if (pw !== TEST_PASSWORD) { setAutosaveStatus("密码错误"); return; }
    state.testMode = true;
    applyTestModeUI();
    saveGame();
    renderAll();
    setAutosaveStatus("已进入测试模式：开发者预览");
  });
  // 危险操作区工具：清零VF / 清空VF上限 / 无Sp湮灭（测试模式下可见）
  document.getElementById("clear-vf-btn").addEventListener("click", () => {
    setVoidVFLog(NLOG); // 仅清当前 VF（cap 不动——「清空VF上限」按钮单独负责重测上限）
    saveGame();
    updateVoidUI();
    setAutosaveStatus("虚空泡沫已清零");
  });
  // 清空VF上限（当前 VF 不动）：重测虚空外追赶；下次退出虚空结算会重新写入上限
  document.getElementById("clear-vf-cap-btn").addEventListener("click", () => {
    state.logVoidVFCap10 = NLOG;
    saveGame();
    updateVoidUI();
    setAutosaveStatus("VF 上限已清零（当前 VF 不动）");
  });
  // 无 Sp 湮灭：执行一次不获取奇点的湮灭重置（扭曲/虚空中不可用——各有专属出口）
  document.getElementById("force-ann-btn").addEventListener("click", () => {
    if (state.distortActive || state.voidActive) { setAutosaveStatus("扭曲/虚空中不可用，请先退出"); return; }
    if (!confirm("确定进行不获取奇点的湮灭重置吗？（当前持有的奇点与进度按湮灭规则重置，但不获得 Sp）")) return;
    forceAnnihilationReset(0, true); // 测试工具：不计入湮灭次数
    updateVoidUI();
    setAutosaveStatus("已执行无 Sp 湮灭重置");
  });
  // 测试工具：导致一次卷缩重置（不获 SS、不计卷缩次数）
  document.getElementById("force-compact-btn").addEventListener("click", forceCompactReset);
  // 测试工具：清除 VP 并将黑洞质量归一
  document.getElementById("clear-vp-btn").addEventListener("click", () => {
    setVP(0);
    setBhMass(1);
    saveGame();
    updateBlackholeUI();
    setAutosaveStatus("虚粒子已清除，黑洞质量归一");
  });
  // 测试工具：清除 VF 与虚空升级（SVU1 累计投入与填充开关、SVU2 等级，与卷缩重置同范围）
  document.getElementById("clear-void-btn").addEventListener("click", () => {
    setVoidVFLog(NLOG);
    state.logVoidVFCap10 = NLOG; // cap 与 current 一并清零
    state.svu1SpLog = NLOG; state.svu1VpLog = NLOG; state.svu1VfLog = NLOG;
    state.svu1Filling = false;
    state.svu2Level = 0;
    saveGame();
    updateVoidUI();
    setAutosaveStatus("虚空泡沫与虚空升级已清零");
  });
  // 测试工具：清空历史最高 VF 记录（里程碑3「度规塌缩」的判定 latch 归零，当前 VF 不动）
  document.getElementById("clear-vf-best-btn").addEventListener("click", () => {
    state.logVoidVFBest10 = NLOG;
    saveGame();
    updateVoidUI();
    setAutosaveStatus("历史最高 VF 记录已清零");
  });
  // 测试工具：清空 ED 与推论
  document.getElementById("clear-research-btn").addEventListener("click", () => {
    setEDLog(NLOG);
    setInfLog(NLOG);
    saveGame();
    updateResearchUI();
    setAutosaveStatus("实验数据与推论已清零");
  });
  // 测试工具：仅清空推论（不动 ED 与已购买的研究）
  document.getElementById("clear-inf-btn").addEventListener("click", () => {
    setInfLog(NLOG);
    saveGame();
    updateResearchUI();
    setAutosaveStatus("推论已清零");
  });
  // 测试工具：清空全部已购买的研究（理论深度 −1/3×数量 回退，推论不返还）
  document.getElementById("clear-research-bought-btn").addEventListener("click", () => {
    if (!state.researchBought.length) { setAutosaveStatus("当前没有已购买的研究"); return; }
    if (!confirm("确定清空全部已购买的研究吗？（推论不返还，理论深度 −1/3×数量 回退）")) return;
    state.theoryDepth -= state.researchBought.length / 3;
    state.researchBought = [];
    saveGame();
    updateResearchUI();
    updateCompactUI(); // 理论深度回退影响理论树节点显示
    setAutosaveStatus("已清空全部已购买的研究（理论深度相应回退）");
  });
  // 测试工具：重置灵感并清空理论树（不执行卷缩重置）
  document.getElementById("reset-ins-btn").addEventListener("click", () => {
    if (!confirm("确定重置灵感（总灵感与可用均归 0、购买价格回初始）并清空理论树吗？（不执行卷缩重置）")) return;
    state.ins = 0; state.logDins = NLOG;
    state.totalIns = 0; state.logDtotalIns = NLOG;
    state.insFromF = 0; state.insFromSp = 0; state.insFromSS = 0; // 各途径购买价格回初始
    state.theoryNodes = {};
    saveGame();
    updateCompactUI();
    setAutosaveStatus("灵感已重置（总灵感/价格回初始），理论树已清空");
  });
  // 测试工具：重置拓扑节点（TP 与点/边/面配置）与 CM（不执行卷缩重置）
  document.getElementById("reset-tp-cm-btn").addEventListener("click", () => {
    if (!confirm("确定重置拓扑节点（TP 与点/边/面全部归 0）与卡拉比-丘流形（CM 归 0）吗？（不执行卷缩重置）")) return;
    state.tp = 0; state.tpV = 0; state.tpE = 0; state.tpF = 0;
    setCMLog(NLOG); // 与卷缩重置的 CM 清零同口径
    saveGame();
    updateCompactUI();
    setAutosaveStatus("拓扑节点与 CM 已归零");
  });
  // 测试工具：仅清空 CM（拓扑节点不动）
  document.getElementById("clear-cm-btn").addEventListener("click", () => {
    setCMLog(NLOG);
    saveGame();
    updateCompactUI();
    setAutosaveStatus("CM 已清零（拓扑节点保留）");
  });
  // 测试工具：仅清空持有的超弦（总超弦统计与拓扑节点不动）
  document.getElementById("clear-ss-btn").addEventListener("click", () => {
    setSSLog(NLOG);
    saveGame();
    updateCompactUI();
    setAutosaveStatus("超弦（SS）已清零（总超弦统计保留）");
  });
  // 湮灭按钮（首次湮灭后显示；点击直接湮灭，不强制切换选项卡）
  document.getElementById("annihilate-btn").addEventListener("click", () => {
    if (state.annihilations === 0) return;
    if (state.voidActive) return; // 虚空挑战：禁用湮灭，只能从虚空页退出结算
    // 扭曲宇宙中：达标 → 湮灭该宇宙；未达标 → 退出
    if (state.distortActive) {
      if (annihilationReady()) doAnnihilation();
      else exitDistort();
      return;
    }
    doAnnihilation();
  });
  // 卷缩按钮（顶栏湮灭按钮下方；A55 + 测试模式下显示，条件满足时可点击）
  document.getElementById("compactify-btn").addEventListener("click", () => {
    // 研究实验中：顶栏按钮为结束/放弃实验（Sp 拐点决定哪个）
    if (state.researchRun) {
      if (researchExitReady()) researchExit();
      else researchAbandon();
      return;
    }
    compactify();
  });
  // S20：version control —— 查看 changelog
  const clLink = document.querySelector(".changelog-link");
  if (clLink) clLink.addEventListener("click", () => {
    if (!state.ach.hidden.includes("S20")) { grantHidden("S20"); updateAchievementsUI(); saveGame(); }
  });
  // 扭曲页重试/退出
  document.getElementById("distort-retry-btn").addEventListener("click", retryDistort);
  document.getElementById("distort-exit-btn").addEventListener("click", exitDistortBtn);
  // 首次湮灭遮罩按钮
  document.getElementById("ann-overlay-btn").addEventListener("click", confirmFirstAnnihilation);
}

