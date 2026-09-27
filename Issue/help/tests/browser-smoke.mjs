// Zero-dependency Chrome DevTools Protocol checks for the isolated help build.
// Usage: node Issue/help/tests/browser-smoke.mjs
// The baseline is loaded from an immutable git commit, never from root game.js.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BASE_SHA = '6523dfc7257ca29003eb6e429ea1b858ffc7ec70';
const HELP_PREFIX = 'waveIncremental_help_';
const CHROME = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find(existsSync);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const baseline = Object.fromEntries(['index.html', 'game.js', 'break_infinity.js', 'style.css'].map(name => [
  name, execFileSync('git', ['show', `${BASE_SHA}:${name}`], { cwd: ROOT, maxBuffer: 4 * 1024 * 1024 }),
]));

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function serverForRepo() {
  const blocked = [];
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const pathname = decodeURIComponent(url.pathname);
      let body;
      if (pathname.startsWith('/baseline/')) {
        const name = pathname.slice('/baseline/'.length);
        body = baseline[name];
        if (!body) throw new Error('Unknown baseline asset');
      } else {
        // Candidate may reference root shared CSS or vendor code, but never root game.js.
        if (pathname === '/game.js' || pathname === '/index.html') {
          blocked.push(pathname);
          res.writeHead(403); res.end('Main game source is excluded from this test'); return;
        }
        const full = path.resolve(ROOT, '.' + pathname);
        if (!full.startsWith(ROOT + path.sep)) throw new Error('Path escaped repository');
        body = await readFile(full);
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(pathname)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch (error) {
      res.writeHead(404); res.end(String(error));
    }
  });
  return { server, blocked };
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.exceptions = [];
    if (process.env.WAVE_HELP_CDP_DEBUG) {
      ws.addEventListener('close', event => console.error('CDP close', event.code, event.reason));
      ws.addEventListener('error', event => console.error('CDP error', event.message || event));
    }
    ws.addEventListener('message', event => {
      if (process.env.WAVE_HELP_CDP_DEBUG) console.error('CDP recv', String(event.data).slice(0, 300));
      const data = JSON.parse(event.data);
      if (data.method === 'Runtime.exceptionThrown') this.exceptions.push(data.params.exceptionDetails.text);
      if (!data.id) return;
      const pending = this.pending.get(data.id);
      if (!pending) return;
      this.pending.delete(data.id);
      clearTimeout(pending.timer);
      if (data.error) pending.reject(new Error(`${pending.method}: ${data.error.message}`));
      else pending.resolve(data.result);
    });
  }
  send(method, params = {}, timeoutMs = 15_000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`${method} timed out`)); }, timeoutMs);
      this.pending.set(id, { method, resolve, reject, timer });
      if (process.env.WAVE_HELP_CDP_DEBUG) console.error('CDP send', method, id);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression, timeoutMs = 15_000) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, timeoutMs);
    if (result.exceptionDetails) throw new Error(`${result.exceptionDetails.text}: ${result.exceptionDetails.exception?.description || ''}`);
    return result.result.value;
  }
  async navigate(url) {
    await this.send('Page.navigate', { url });
    for (let i = 0; i < 200; i++) {
      const ready = await this.evaluate('document.readyState === "complete"').catch(() => false);
      if (ready) { await delay(100); return; }
      await delay(25);
    }
    throw new Error(`Page failed to load: ${url}`);
  }
  close() { this.ws.close(); }
}

async function launchChrome() {
  if (!CHROME) throw new Error('Chrome or Edge executable not found');
  const profile = await mkdtemp(path.join(os.tmpdir(), 'wave-help-test-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--disable-gpu-compositing', '--disable-gpu-sandbox',
    '--disable-software-rasterizer', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
    '--remote-allow-origins=*', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: process.env.WAVE_HELP_CDP_DEBUG ? ['ignore', 'pipe', 'pipe'] : 'ignore', windowsHide: true });
  if (process.env.WAVE_HELP_CDP_DEBUG) {
    chrome.stderr?.on('data', chunk => console.error('Chrome stderr', String(chunk).slice(0, 1000)));
    chrome.stdout?.on('data', chunk => console.error('Chrome stdout', String(chunk).slice(0, 1000)));
  }
  let port;
  for (let i = 0; i < 200; i++) {
    try { port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; }
    catch { if (chrome.exitCode !== null) throw new Error(`Chrome exited ${chrome.exitCode}`); await delay(50); }
  }
  if (!port) throw new Error('Chrome did not expose CDP port');
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = tabs.find(tab => tab.type === 'page');
  if (!target) throw new Error('No Chrome page target');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  const cdp = new CDP(ws);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__testClock = 1760000000000;
    Date.now = () => window.__testClock;
    window.setInterval = () => 0;
    window.requestAnimationFrame = () => 0;
  ` });
  return { cdp, chrome, profile };
}

async function shutdown(browser) {
  browser.cdp.close();
  browser.chrome.kill();
  await Promise.race([new Promise(resolve => browser.chrome.once('exit', resolve)), delay(2000)]);
  // Windows cleanup rule: verify the absolute temporary path before recursive removal.
  const safeRoot = path.resolve(os.tmpdir()) + path.sep;
  const target = path.resolve(browser.profile);
  if (!target.startsWith(safeRoot) || !path.basename(target).startsWith('wave-help-test-')) throw new Error('Unsafe Chrome profile cleanup path');
  await rm(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

function storeExpression() {
  return `Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))`;
}

function pick(object, names) { return Object.fromEntries(names.map(name => [name, object[name]])); }
function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return { medianMs: +sorted[Math.floor(sorted.length / 2)].toFixed(2),
    p95Ms: +sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(2),
    maxMs: +sorted.at(-1).toFixed(2) };
}

async function compareScenario(cdp, origin, seed, calls, fields, label, result) {
  const payload = JSON.stringify(seed);
  await cdp.navigate(`${origin}/baseline/index.html`);
  await cdp.evaluate(`state = ${payload}`);
  const old = await cdp.evaluate(`(() => {
    const started = performance.now();
    ${calls.map(({ name, args = [] }) => `${name}(...${JSON.stringify(args)});`).join('\n')}
    return { state: structuredClone(state), ms: performance.now() - started };
  })()`, 60_000);
  await cdp.navigate(`${origin}/Issue/help/index.html`);
  const modern = await cdp.evaluate(`(() => {
    window.__waveHelpDebug.load(${payload});
    const started = performance.now();
    ${calls.map(({ name, args = [] }) => `window.__waveHelpDebug.call(${JSON.stringify(name)}, ...${JSON.stringify(args)});`).join('\n')}
    return { state: window.__waveHelpDebug.snapshot(), ms: performance.now() - started };
  })()`, 60_000);
  assert.deepEqual(pick(modern.state, fields), pick(old.state, fields), `${label}: state diverged`);
  result.checks.push({ name: label, pass: true, baselineMs: +old.ms.toFixed(2), helpMs: +modern.ms.toFixed(2) });
  return { baseline: old, help: modern };
}

async function main() {
  const { server, blocked } = serverForRepo();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  let browser;
  const result = { baseline: BASE_SHA, checks: [] };
  try {
    browser = await launchChrome();
    const cdp = browser.cdp;
    await cdp.navigate(`http://127.0.0.1:${port}/baseline/index.html`);
    const oldInfo = await cdp.evaluate(`({version: state.version, U: state.U, ready: !!document.querySelector('#sub-wave')})`);
    assert.equal(oldInfo.version, '0.6.3.2');
    assert.equal(oldInfo.U, 10);
    result.checks.push({ name: 'baseline boot', pass: true });
    if (process.argv.includes('--baseline-only')) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    await cdp.evaluate(`(() => {
      localStorage.clear();
      state.U = 123456789; state.logU10 = Math.log10(state.U);
      localStorage.setItem('waveIncremental_save', encodeSave(state));
      localStorage.setItem('waveIncremental_slot_0', encodeSave(state));
      localStorage.setItem('waveIncremental_slotName0', 'baseline-slot');
      localStorage.setItem('waveIncremental_lastTab', 'wave');
    })()`);
    const originalKeys = await cdp.evaluate(storeExpression());

    await cdp.navigate(`http://127.0.0.1:${port}/Issue/help/index.html`);
    const helpInfo = await cdp.evaluate(`(() => {
      const d = window.__waveHelpDebug;
      return { available: !!d, methods: d ? Object.keys(d).sort() : [], state: d && d.snapshot ? d.snapshot() : null };
    })()`);
    assert(helpInfo.available, 'Missing window.__waveHelpDebug');
    assert(helpInfo.state, 'Missing snapshot()');
    assert.equal(helpInfo.state.U, 10, 'Candidate read the production save');
    result.checks.push({ name: 'candidate boot and fresh isolated save', pass: true, methods: helpInfo.methods });

    const afterBoot = await cdp.evaluate(storeExpression());
    for (const [key, value] of Object.entries(originalKeys)) assert.equal(afterBoot[key], value, `Candidate changed production storage key ${key}`);
    await cdp.evaluate(`window.__waveHelpDebug.call('saveGame')`);
    const afterSave = await cdp.evaluate(storeExpression());
    for (const [key, value] of Object.entries(originalKeys)) assert.equal(afterSave[key], value, `Candidate save changed production key ${key}`);
    const newKeys = Object.keys(afterSave).filter(key => !(key in originalKeys));
    assert(newKeys.every(key => key.startsWith(HELP_PREFIX)), `Candidate wrote unprefixed storage keys: ${newKeys.join(', ')}`);
    assert(newKeys.includes(`${HELP_PREFIX}waveIncremental_save`), 'Candidate save key was not written');
    assert.equal(blocked.length, 0, `Candidate requested root script: ${blocked.join(', ')}`);
    assert.equal(cdp.exceptions.length, 0, `Uncaught browser exceptions: ${cdp.exceptions.join(' | ')}`);
    result.checks.push({ name: 'storage isolation and browser exceptions', pass: true, newKeys });

    const saved42 = { ...helpInfo.state, U: 42, logU10: Math.log10(42) };
    await cdp.evaluate(`window.__waveHelpDebug.load(${JSON.stringify(saved42)}); window.__waveHelpDebug.call('saveGame')`);
    await cdp.navigate(`http://127.0.0.1:${port}/Issue/help/index.html`);
    assert.equal(await cdp.evaluate(`window.__waveHelpDebug.snapshot().U`), 42, 'Candidate did not reload its own save');
    const afterRefresh = await cdp.evaluate(storeExpression());
    for (const [key, value] of Object.entries(originalKeys)) assert.equal(afterRefresh[key], value, `Refresh changed production storage key ${key}`);
    result.checks.push({ name: 'candidate refresh restores isolated save', pass: true });

    await cdp.evaluate(`(() => {
      document.querySelector('#slot-list .slot-actions button').click();
      window.prompt = () => 'help-slot';
      document.querySelector('#slot-list .slot-name').click();
      document.querySelector('#tabs [data-tab="stats"]').click();
    })()`);
    const afterUiStorage = await cdp.evaluate(storeExpression());
    for (const [key, value] of Object.entries(originalKeys)) assert.equal(afterUiStorage[key], value, `UI action changed production storage key ${key}`);
    assert(afterUiStorage[`${HELP_PREFIX}waveIncremental_slot_0`], 'Candidate manual slot was not saved');
    assert.equal(afterUiStorage[`${HELP_PREFIX}waveIncremental_slotName0`], 'help-slot');
    assert.equal(afterUiStorage[`${HELP_PREFIX}waveIncremental_lastTab`], 'stats');
    result.checks.push({ name: 'manual slot, slot name, and tab UI isolation', pass: true });

    const origin = `http://127.0.0.1:${port}`;
    await cdp.navigate(`${origin}/baseline/index.html`);
    const fresh = await cdp.evaluate('defaultState()');
    // The same seeded state and action list run against both implementations.
    const richWave = { ...fresh, U: 1e18, logU10: 18, L: 1, logL10: 0, lastTick: 1760000000000 };
    await compareScenario(cdp, origin, richWave,
      [{ name: 'buyUp1', args: [false] }, { name: 'buyUp2', args: [false] }, { name: 'buyUp3' }],
      ['U', 'logU10', 'L', 'logL10', 'up1', 'up2', 'up3', 'up3LastF', 'logUp3LastF'],
      'wave purchases', result);

    const phonon = { ...fresh, phonons: 1e15, phUnlocked: 1, phOn: true, lastTick: 1760000000000 };
    await compareScenario(cdp, origin, phonon,
      [{ name: 'buyPG1', args: [false] }, { name: 'buyPG2', args: [false] }, { name: 'buyPG3', args: [false] }],
      ['phonons', 'pg1', 'pg2', 'pg3'], 'phonon purchases', result);

    const growth = { ...fresh, U: 1e8, logU10: 8, up1: 5, up2: 2,
      phUnlocked: 1, phOn: true, pg1: 2, pg2: 3, lastTick: 1760000000000 };
    await compareScenario(cdp, origin, growth,
      [{ name: 'applyProduction', args: [0.1] }, { name: 'runAutomation' }],
      ['U', 'logU10', 'L', 'logL10', 'phonons', 'logDph', 'playTime', 'realTime', 'up1', 'up2'],
      'online production step', result);

    await compareScenario(cdp, origin, growth,
      [{ name: 'runOfflineSimulation', args: [60] }],
      ['U', 'logU10', 'L', 'logL10', 'phonons', 'logDph', 'playTime', 'realTime', 'up1', 'up2'],
      '60 second offline simulation', result);

    await compareScenario(cdp, origin, growth,
      [{ name: 'runOfflineSimulation', args: [28800] }],
      ['U', 'logU10', 'L', 'logL10', 'phonons', 'logDph', 'playTime', 'realTime', 'up1', 'up2'],
      '8 hour offline simulation', result);

    const formulaState = { ...fresh, U: Number.MAX_VALUE, logU10: 1000, L: Number.MIN_VALUE, logL10: -1000,
      up1: 331, up2: 98, phonons: 1e300, phUnlocked: 1 };
    const formulaNames = ['FLog', 'F', 'temperatureLog'];
    const levels = [1, 2, 98, 99, 100, 300, 301, 1000];
    await cdp.navigate(`${origin}/baseline/index.html`);
    await cdp.evaluate(`state = ${JSON.stringify(formulaState)}`);
    const oldFormulas = await cdp.evaluate(`({
      scalars: ${JSON.stringify(formulaNames)}.map(name => globalThis[name]()),
      up1: ${JSON.stringify(levels)}.map(level => up1CostLogAt(level)),
      up2: ${JSON.stringify(levels)}.map(level => up2CostLogAt(level))
    })`);
    await cdp.navigate(`${origin}/Issue/help/index.html`);
    const newFormulas = await cdp.evaluate(`(() => {
      const d = window.__waveHelpDebug; d.load(${JSON.stringify(formulaState)});
      return { scalars: ${JSON.stringify(formulaNames)}.map(name => d.call(name)),
        up1: ${JSON.stringify(levels)}.map(level => d.call('up1CostLogAt', level)),
        up2: ${JSON.stringify(levels)}.map(level => d.call('up2CostLogAt', level)) };
    })()`);
    assert.deepEqual(newFormulas, oldFormulas, 'Formula values changed across module extraction');
    result.checks.push({ name: 'extreme formulas and price segment boundaries', pass: true });

    const numericCases = [
      ['clampLog', '-Infinity'], ['clampLog', 'NaN'], ['clampLog', 'Infinity'],
      ['clampLog', '-1e12'], ['clampLog', '1e16'], ['clampLog', '308'],
      ['logAddLogs', '-1e9, 50'], ['logAddLogs', '300, 299.999999999'],
      ['logAddLogs', '1e15, 1e15'],
      ['logAddSigned', '30, 1, 30, -1'], ['logAddSigned', '300, 1, 299.999, -1'],
      ['logAddSigned', '-1e9, 1, 20, -1'],
      ['cmpGE', '1e250, 1e250, 250, 250'], ['cmpGE', 'Infinity, 1, 500, 0'],
      ['cmpGE', '0, Infinity, -1e9, 500'], ['cmpLT', '0, Infinity, -1e9, 500'],
    ];
    let seed = 0xC0FFEE;
    for (let i = 0; i < 128; i++) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      const a = +(((seed / 2 ** 32) * 2000) - 1000).toFixed(9);
      seed = (1664525 * seed + 1013904223) >>> 0;
      const b = +(((seed / 2 ** 32) * 2000) - 1000).toFixed(9);
      numericCases.push(['logAddLogs', `${a}, ${b}`]);
      numericCases.push(['logAddSigned', `${a}, 1, ${b}, -1`]);
    }
    await cdp.navigate(`${origin}/baseline/index.html`);
    const oldMath = await cdp.evaluate(`[${numericCases.map(([name, args]) => `${name}(${args})`).join(',')}]`);
    await cdp.navigate(`${origin}/Issue/help/index.html`);
    const newMath = await cdp.evaluate(`[${numericCases.map(([name, args]) => `window.__waveHelpDebug.call('${name}', ${args})`).join(',')}]`);
    assert.deepEqual(newMath, oldMath, 'Extracted log math changed edge-case values');
    assert.deepEqual(newMath.slice(0, 6), [-1e9, -1e9, 1e15, -1e9, 1e15, 308]);
    result.checks.push({ name: 'log math extrema and deterministic differential cases', pass: true, cases: numericCases.length });

    const segment = { ...fresh, U: 1e200, logU10: 200, L: 1, logL10: 0, up1: 330, up2: 98 };
    await compareScenario(cdp, origin, segment,
      [{ name: 'bulkBuyUp1', args: [10] }, { name: 'bulkBuyUp2', args: [10] }],
      ['U', 'logU10', 'up1', 'up2'], 'bulk purchase over cost breakpoints', result);

    const fractionalCap = { ...fresh, au: { ...fresh.au, vpu_vpu2: 1 },
      virtualParticles: 1e12, logVP: 12, phonons: 1e100, logDph: 100, pg3: 23 };
    const underCap = await compareScenario(cdp, origin, fractionalCap,
      [{ name: 'bulkBuyPG3', args: [1e13] }], ['pg3', 'phonons', 'logDph'],
      'PG3 fractional cap below one level', result);
    assert.equal(underCap.help.state.pg3, 23, 'PG3 crossed a fractional cap');
    assert(result.checks.at(-1).helpMs < 100, 'PG3 fractional cap stalled a game tick');
    await compareScenario(cdp, origin, { ...fractionalCap, pg3: 22 },
      [{ name: 'bulkBuyPG3', args: [1e13] }], ['pg3', 'phonons', 'logDph'],
      'PG3 fractional cap allows exactly one level', result);

    const saveState = { ...fresh, U: Number.MAX_VALUE, logU10: 1000, L: Number.MIN_VALUE,
      logL10: -1000, playTime: 123456.789, ach: { ...fresh.ach, normal: ['A34'] },
      settings: { ...fresh.settings, theme: 'white' }, annHistory: [{ note: '测试方案 α' }],
      theoryPresets: fresh.theoryPresets.map((p, i) => i === 0 ? { ...p, name: 'A1' } : p) };
    await cdp.navigate(`${origin}/baseline/index.html`);
    await cdp.evaluate(`state = ${JSON.stringify(saveState)}; saveGame()`);
    const oldEncoded = await cdp.evaluate(`localStorage.getItem('waveIncremental_save')`);
    await cdp.navigate(`${origin}/Issue/help/index.html`);
    await cdp.evaluate(`window.__waveHelpDebug.load(${JSON.stringify(saveState)}); window.__waveHelpDebug.call('saveGame')`);
    const newEncoded = await cdp.evaluate(`localStorage.getItem('${HELP_PREFIX}waveIncremental_save')`);
    assert.equal(newEncoded, oldEncoded, 'WI1 encoded save bytes changed');
    await cdp.evaluate(`window.__waveHelpDebug.load(${JSON.stringify(fresh)}); window.__waveHelpDebug.call('loadGame')`);
    const loadedSave = await cdp.evaluate(`window.__waveHelpDebug.snapshot()`);
    assert.equal(loadedSave.U, saveState.U);
    assert.equal(loadedSave.logU10, saveState.logU10);
    assert.equal(loadedSave.theoryPresets[0].name, 'A1');
    assert.equal(loadedSave.annHistory[0].note, '测试方案 α');
    result.checks.push({ name: 'WI1 save bytes and Unicode round trip', pass: true, bytes: newEncoded.length });

    await cdp.evaluate(`localStorage.setItem('${HELP_PREFIX}waveIncremental_save', ${JSON.stringify(oldEncoded.slice(4))}); window.__waveHelpDebug.call('loadGame')`);
    const legacyDecoded = await cdp.evaluate(`window.__waveHelpDebug.snapshot()`);
    assert.equal(legacyDecoded.logU10, saveState.logU10);
    assert.equal(legacyDecoded.theoryPresets[0].name, 'A1');
    assert.equal(legacyDecoded.annHistory[0].note, '测试方案 α');
    result.checks.push({ name: 'unprefixed legacy base64 decode', pass: true });

    const maxAuto = { ...fresh, U: Number.MAX_VALUE, logU10: 1e6, L: 1, logL10: 0,
      annihilations: 1, autoWaveUpg: 1, autoOn: { ...fresh.autoOn, wave: true },
      ach: { ...fresh.ach, normal: ['A34'] }, batchMode: { ...fresh.batchMode, wave: true },
      batchMax: 256, rulesBroken: true, lastTick: 1760000000000 };
    const autoCompare = await compareScenario(cdp, origin, maxAuto, [{ name: 'runAutomation' }],
      ['U', 'logU10', 'L', 'logL10', 'up1', 'up2', 'narrowPurchases'],
      'high resource automatic bulk purchase', result);
    assert(autoCompare.help.state.up1 > 1000, 'High resource scenario did not exercise bulk purchasing');
    const maxAutoResult = result.checks.at(-1);
    assert(maxAutoResult.helpMs < 100, `Automatic bulk purchase exceeded one 100 ms tick: ${maxAutoResult.helpMs} ms`);

    const activeOffline = { ...growth, annihilations: 20, autoWaveUpg: 1,
      autoOn: { ...fresh.autoOn, wave: true }, ach: { ...fresh.ach, normal: ['A34'] },
      batchMode: { ...fresh.batchMode, wave: true }, batchMax: 256, rulesBroken: true };
    await compareScenario(cdp, origin, activeOffline,
      [{ name: 'runOfflineSimulation', args: [28800] }],
      ['U', 'logU10', 'phonons', 'logDph', 'up1', 'up2', 'playTime', 'annGameElapsed'],
      '8 hour offline with active automatic purchases', result);

    await cdp.navigate(`${origin}/Issue/help/index.html`);
    const perfSamples = [];
    for (let i = 0; i < 20; i++) {
      const ms = await cdp.evaluate(`(() => {
        const d = window.__waveHelpDebug; d.load(${JSON.stringify(maxAuto)});
        const start = performance.now(); d.call('runAutomation'); return performance.now() - start;
      })()`);
      perfSamples.push(ms);
    }
    const autoPerf = summarize(perfSamples);
    assert(autoPerf.p95Ms < 100, `Auto purchase p95 exceeded one tick: ${autoPerf.p95Ms} ms`);
    result.checks.push({ name: 'automatic purchase performance samples', pass: true, samples: perfSamples.length, ...autoPerf });

    const offlineSamples = [];
    for (let i = 0; i < 10; i++) {
      const ms = await cdp.evaluate(`(() => {
        const d = window.__waveHelpDebug; d.load(${JSON.stringify(activeOffline)});
        const start = performance.now(); d.call('runOfflineSimulation', 28800); return performance.now() - start;
      })()`, 60_000);
      offlineSamples.push(ms);
    }
    const offlinePerf = summarize(offlineSamples);
    result.checks.push({ name: '8 hour offline performance samples', pass: true, samples: offlineSamples.length, ...offlinePerf });

    const beforeFileErrors = cdp.exceptions.length;
    await cdp.navigate(pathToFileURL(path.join(ROOT, 'Issue', 'help', 'index.html')).href);
    const fileBoot = await cdp.evaluate(`({ ready: !!window.__waveHelpDebug, version: window.__waveHelpDebug?.snapshot().version })`);
    assert.equal(fileBoot.ready, true, 'file:// candidate failed to start');
    assert.equal(fileBoot.version, '0.6.3.2');
    assert.equal(cdp.exceptions.length, beforeFileErrors, `file:// startup exception: ${cdp.exceptions.slice(beforeFileErrors).join(' | ')}`);
    result.checks.push({ name: 'file:// direct-open startup', pass: true });

    assert.equal(cdp.exceptions.length, 0, `Uncaught browser exceptions: ${cdp.exceptions.join(' | ')}`);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (browser) await shutdown(browser);
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error.stack || String(error)); process.exitCode = 1; });
