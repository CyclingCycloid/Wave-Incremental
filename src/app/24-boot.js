// ---------- Boot ----------
function init() {
  const loaded = loadGame();
  if (!loaded) state = defaultState();
  // 重置瞬时成就状态（避免离线时间干扰 S3/S5/S6 的计时）
  state.hiddenClicks = [];
  state.metaClicks = [];
  state.themeSwitches = [Date.now()];
  state.phToggles = [];
  applyTheme(state.settings.theme);
  applyDecimals(state.settings.decimals);
  applyNotation(state.settings.notation);
  applyUiFps(state.settings.uiFps);
  setupUI();
  applyTestModeUIGlobal(); // 刷新后同步测试模式 UI（按钮文案/工具显隐/顶栏版本）——缺失会导致刷新后看起来退出测试
  applyPhononVisibility();
  applyAnnihilationVisibility();
  // 卷缩层：本次卷缩真实时间基缺失时补发（老档/异常档兜底），并同步可见性与按钮
  if (state.testMode && state.compactions >= 1 && !state.compStartReal) {
    state.compStartReal = gameNow();
    state.compGameElapsed = 0; state.compGameElapsedLog = NLOG;
  }
  applyCompactVisibility();
  updateCompactButton();
  if (state.annihilations >= 1 && !state.annStartReal) {
    state.annStartReal = gameNow();
    state.annStartGame = state.playTime; state.annGameElapsed = 0; state.annGameElapsedLog = NLOG; state.annMaxTLog = NLOG;
  }
  // 恢复上次所在的大标签（无记录默认波动页）；子标签由 switchTab 内部恢复默认
  //（不得再无条件 switchSubtab("main")——非波动页上它会把子页全部隐藏，内容不渲染）
  let lastTab = "wave";
  try { lastTab = localStorage.getItem("waveIncremental_lastTab") || "wave"; } catch {}
  switchTab(lastTab);
  renderAll();

  // 离线结算：DOM 就绪后执行（模拟期间 UI 函数早退，此时已可安全刷新）
  processPendingOffline();

  state.lastTick = Date.now();

  // 快捷键（v0.5.0.3 QoL）：全局监听，输入框聚焦时忽略
  document.addEventListener("keydown", handleGameHotkey);
  document.addEventListener("keyup", (e) => {
    if (e.key === "b" || e.key === "B") { bhHotkeyArmed = false; }
  });
  // 窗口失焦兜底：防止 B 的 keyup 丢失导致武装卡死
  window.addEventListener("blur", () => { bhHotkeyArmed = false; });
  setInterval(tick, 100); // 逻辑 tick 恒定 100ms（数值节奏不变）
  // 显示循环：按所选频率刷新快变数字（全局资源栏 + 声子资源行）
  const uiLoop = (t) => {
    if (t - uiLastFrame >= uiFrameInterval) {
      uiLastFrame = t;
      renderFast();
      if (state.phUnlocked && !document.getElementById("sub-phonon").classList.contains("hidden")) {
        renderPhononFast();
      }
    }
    // 自动湮灭每帧检查（rAF ≈60Hz，不受界面刷新频率限制）：检查本身只是几次 log 比较；
    // 触发走 doAnnihilation(true) 跳过 renderAll，由随后的常规渲染承接
    autoAnnTick();
    renderAnnButtonFast(); // 湮灭按钮「+N Sp」预览同步每帧刷新，消除与实际获取的脱节
    requestAnimationFrame(uiLoop);
  };
  requestAnimationFrame(uiLoop);
  // 黑洞旋转动画循环（仅解锁后绘制，未解锁时低频空转）
  requestAnimationFrame(bhAnimLoop);
  setInterval(() => { if (dirty) { saveGame(); dirty = false; } }, AUTOSAVE_INTERVAL);
  window.addEventListener("beforeunload", () => saveGame());

  setAutosaveStatus(loaded ? "存档已载入" : "新游戏开始");
}

init();
