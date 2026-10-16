/* Independent candidate renderer. Load geometry.js first. */
(function (global) {
  'use strict';
  const models = global.WaveFoldGeometry.models;
  const mounted = new WeakMap();
  const FPS_INTERVAL = 1000 / 30;
  const validTheme = theme => Object.prototype.hasOwnProperty.call(models, theme);
  const validSpeed = speed => Number.isFinite(speed) && speed >= 0 && speed <= 2;

  function mount(canvas, options = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('Expected a canvas element.');
    if (!validTheme(options.theme ?? 'space')) throw new RangeError('Unknown folding theme.');
    if (!validSpeed(options.speed ?? 0.65)) throw new RangeError('Speed must be between 0 and 2.');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D rendering is unavailable.');
    mounted.get(canvas)?.destroy();

    const buffers = Object.fromEntries(Object.entries(models).map(([key, model]) => [key, {
      projected: new Float64Array(model.vertices.length * 3),
      edges: model.edges.map(([a, b]) => ({ a: a * 3, b: b * 3, depth: 0 })),
    }]));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const appearance = matchMedia('(prefers-color-scheme: dark)');
    const probe = document.createElement('span');
    probe.hidden = true;
    probe.setAttribute('aria-hidden', 'true');
    canvas.parentElement.appendChild(probe);
    const clocks = { space: 2.3, time: 2.3, info: 2.3 };
    let theme = options.theme ?? 'space', speed = options.speed ?? 0.65;
    let paused = Boolean(options.paused), enabled = true, intersecting = false, destroyed = false;
    let width = 0, height = 0, ratio = 0, frameId = 0, previous = null;
    let colors;
    const byDepth = (a, b) => a.depth - b.depth;

    function refreshColors() {
      if (destroyed) return;
      const resolve = name => {
        probe.style.color = `var(--fold-${theme}-${name})`;
        return getComputedStyle(probe).color;
      };
      colors = { line: resolve('line'), bright: resolve('bright'), rear: resolve('rear') };
      draw();
    }

    function resize() {
      if (destroyed) return;
      const bounds = canvas.getBoundingClientRect();
      const nextRatio = Math.min(global.devicePixelRatio || 1, 1.5);
      width = bounds.width; height = bounds.height;
      const nextWidth = Math.max(1, Math.round(width * nextRatio));
      const nextHeight = Math.max(1, Math.round(height * nextRatio));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight || ratio !== nextRatio) {
        ratio = nextRatio; canvas.width = nextWidth; canvas.height = nextHeight;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
      draw();
    }

    function draw() {
      if (destroyed || !colors || width <= 0 || height <= 0) return;
      const model = models[theme], rule = model.drawing, buffer = buffers[theme];
      const points = buffer.projected, edges = buffer.edges, t = clocks[theme];
      const sinA = Math.sin(t * rule.angleA + rule.phaseA), cosA = Math.cos(t * rule.angleA + rule.phaseA);
      const sinB = Math.sin(t * rule.angleB + rule.phaseB), cosB = Math.cos(t * rule.angleB + rule.phaseB);
      const sx = Math.sin(rule.tiltX), cx = Math.cos(rule.tiltX), sy = Math.sin(rule.tiltY), cy = Math.cos(rule.tiltY);
      const scale = Math.min(width * rule.widthScale, height * rule.heightScale);
      for (let i = 0; i < model.vertices.length; i++) {
        const v = model.vertices[i];
        // Rotate x-w and y-z, then project 4D -> 3D -> 2D. Unit-radius models
        // stay away from the camera planes; these equations do not use resources.
        const x = v[0] * cosA - v[3] * sinA, w = v[0] * sinA + v[3] * cosA;
        const y = v[1] * cosB - v[2] * sinB, z = v[1] * sinB + v[2] * cosB;
        const p4 = rule.camera4 / (rule.camera4 - w);
        const y2 = (y * cx - z * sx) * p4, z2 = (y * sx + z * cx) * p4;
        const x2 = x * p4 * cy + z2 * sy, depth = -x * p4 * sy + z2 * cy;
        const perspective = rule.camera3 / (rule.camera3 - depth), index = i * 3;
        points[index] = width / 2 + x2 * scale * perspective;
        points[index + 1] = height / 2 + y2 * scale * perspective;
        points[index + 2] = depth;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const edge of edges) edge.depth = (points[edge.a + 2] + points[edge.b + 2]) / 2;
      edges.sort(byDepth);
      for (const edge of edges) {
        const front = edge.depth > 0;
        ctx.strokeStyle = front ? colors.line : colors.rear;
        ctx.globalAlpha = front ? 0.56 + 0.35 * Math.min(1, edge.depth) : 0.17 + 0.17 * Math.max(0, 1 + edge.depth);
        ctx.lineWidth = front ? 1.15 : 0.85;
        ctx.beginPath(); ctx.moveTo(points[edge.a], points[edge.a + 1]);
        ctx.lineTo(points[edge.b], points[edge.b + 1]); ctx.stroke();
      }
      for (let i = 0; i < points.length; i += 3) {
        const front = points[i + 2] > 0;
        ctx.fillStyle = front ? colors.bright : colors.rear; ctx.globalAlpha = front ? 0.9 : 0.28;
        ctx.beginPath(); ctx.arc(points[i], points[i + 1], 1.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function active() {
      return !destroyed && canvas.isConnected && enabled && intersecting && width > 0 && height > 0
        && !document.hidden && !reduced.matches && !paused && speed > 0;
    }
    function schedule() { if (!frameId && active()) frameId = requestAnimationFrame(tick); }
    function stop() {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0; previous = null;
    }
    function tick(now) {
      frameId = 0;
      if (!active()) { previous = null; return; }
      if (previous === null) previous = now;
      const elapsed = now - previous;
      if (elapsed >= FPS_INTERVAL) {
        clocks[theme] += Math.min(elapsed / 1000, 0.1) * speed;
        previous = now; draw();
      }
      schedule();
    }
    function sync() { stop(); draw(); schedule(); }
    function environmentChanged() { resize(); refreshColors(); sync(); }
    function visibilityChanged() { stop(); if (!document.hidden) resize(); schedule(); }

    const sizeObserver = new ResizeObserver(() => { resize(); sync(); });
    const intersectionObserver = new IntersectionObserver(entries => {
      intersecting = entries[0]?.isIntersecting ?? false;
      if (intersecting) resize();
      sync();
    });
    sizeObserver.observe(canvas); intersectionObserver.observe(canvas);
    document.addEventListener('visibilitychange', visibilityChanged);
    global.addEventListener('resize', environmentChanged);
    reduced.addEventListener('change', sync);
    appearance.addEventListener('change', environmentChanged);

    const controller = Object.freeze({
      setTheme(next) {
        if (destroyed) return;
        if (!validTheme(next)) throw new RangeError('Unknown folding theme.');
        if (next === theme) return;
        stop(); theme = next; refreshColors(); schedule();
      },
      setPaused(value) { if (!destroyed) { paused = Boolean(value); sync(); } },
      setVisible(value) { if (!destroyed) { enabled = Boolean(value); sync(); } },
      setSpeed(value) {
        if (destroyed) return;
        if (!validSpeed(value)) throw new RangeError('Speed must be between 0 and 2.');
        speed = value; sync();
      },
      refreshColors, resize, draw,
      destroy() {
        if (destroyed) return;
        stop(); destroyed = true;
        sizeObserver.disconnect(); intersectionObserver.disconnect();
        document.removeEventListener('visibilitychange', visibilityChanged);
        global.removeEventListener('resize', environmentChanged);
        reduced.removeEventListener('change', sync);
        appearance.removeEventListener('change', environmentChanged);
        probe.remove(); ctx.clearRect(0, 0, width, height);
        mounted.delete(canvas);
      },
    });
    mounted.set(canvas, controller);
    refreshColors(); resize(); schedule();
    return controller;
  }
  global.WaveFoldAnimations = Object.freeze({ mount });
})(window);
