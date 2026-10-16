/* Independent candidate geometry. No game state, storage or external dependencies. */
(function (global) {
  'use strict';
  const freezeModel = (name, vertices, edges, drawing) => Object.freeze({
    name,
    vertices: Object.freeze(vertices.map(Object.freeze)),
    edges: Object.freeze(edges.map(Object.freeze)),
    drawing: Object.freeze(drawing),
  });

  function cell24() {
    const vertices = [], edges = [];
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
      for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
        const p = [0, 0, 0, 0];
        p[a] = sa / Math.SQRT2; p[b] = sb / Math.SQRT2;
        vertices.push(p);
      }
    }
    for (let i = 0; i < vertices.length; i++) for (let j = i + 1; j < vertices.length; j++) {
      let distance = 0;
      for (let axis = 0; axis < 4; axis++) distance += (vertices[i][axis] - vertices[j][axis]) ** 2;
      if (Math.abs(distance - 1) < 1e-8) edges.push([i, j]);
    }
    return freezeModel('正二十四胞体', vertices, edges, {
      angleA: 0.29, phaseA: 0, angleB: 0.13, phaseB: 0.12,
      camera4: 2.8, camera3: 4, tiltX: -0.28, tiltY: 0.38,
      widthScale: 0.31, heightScale: 0.33,
    });
  }

  function cell16() {
    const vertices = [], edges = [];
    for (let axis = 0; axis < 4; axis++) for (const sign of [-1, 1]) {
      const p = [0, 0, 0, 0]; p[axis] = sign; vertices.push(p);
    }
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
      if (Math.floor(i / 2) !== Math.floor(j / 2)) edges.push([i, j]);
    }
    return freezeModel('正十六胞体', vertices, edges, {
      angleA: 0.27, phaseA: 0.15, angleB: 0.13, phaseB: 0.4,
      camera4: 3.3, camera3: 4.8, tiltX: -0.3, tiltY: 0.42,
      widthScale: 0.275, heightScale: 0.374,
    });
  }

  function cube4() {
    const vertices = [], edges = [];
    for (let bits = 0; bits < 16; bits++) {
      vertices.push(Array.from({ length: 4 }, (_, axis) => ((bits >> axis) & 1) ? 0.5 : -0.5));
      for (let axis = 0; axis < 4; axis++) {
        const neighbor = bits ^ (1 << axis);
        if (neighbor > bits) edges.push([bits, neighbor]);
      }
    }
    return freezeModel('四维超立方体（正八胞体）', vertices, edges, {
      angleA: 0.24, phaseA: 0.25, angleB: 0.17, phaseB: 0.2,
      camera4: 3.3, camera3: 4.8, tiltX: -0.3, tiltY: 0.42,
      widthScale: 0.28, heightScale: 0.39,
    });
  }

  const models = Object.freeze({ space: cell24(), time: cell16(), info: cube4() });
  global.WaveFoldGeometry = Object.freeze({ models });
})(window);
