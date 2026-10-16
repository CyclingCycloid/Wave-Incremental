(function () {
  'use strict';
  const root = document.getElementById('fold-preview');
  const canvas = document.getElementById('fold-canvas');
  const caption = document.getElementById('fold-caption');
  const pause = document.getElementById('fold-pause');
  const themeButtons = Array.from(root.querySelectorAll('button[data-theme]'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const descriptions = {
    space: '橙色二十四胞体线框旋转投影',
    time: '紫色十六胞体线框旋转投影',
    info: '蓝色四维超立方体线框旋转投影',
  };
  const animation = WaveFoldAnimations.mount(canvas, { theme: 'space', speed: 0.65 });
  let paused = false;
  function syncPause() {
    pause.disabled = reduced.matches;
    pause.textContent = reduced.matches ? '系统减少动态效果' : paused ? '播放动画' : '暂停动画';
    pause.setAttribute('aria-pressed', String(paused || reduced.matches));
  }
  for (const button of themeButtons) button.addEventListener('click', () => {
    const theme = button.dataset.theme, model = WaveFoldGeometry.models[theme];
    root.dataset.theme = theme;
    for (const item of themeButtons) item.setAttribute('aria-pressed', String(item === button));
    canvas.setAttribute('aria-label', descriptions[theme]);
    caption.textContent = `${model.name} · ${model.vertices.length} 顶点 · ${model.edges.length} 条边`;
    animation.setTheme(theme);
  });
  pause.addEventListener('click', () => { paused = !paused; animation.setPaused(paused); syncPause(); });
  reduced.addEventListener('change', syncPause);
  syncPause();
})();
