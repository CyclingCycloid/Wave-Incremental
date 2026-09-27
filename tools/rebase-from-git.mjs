// 一次性/可重放的基线抽取工具（忠实改动保证的核心）：
// 从固定 git 对象按「下一分段首行锚点」切出 25 个源码分段写入 src/，
// 然后施加两处模块抽取编辑（与 Issue/help 候选完全相同的转换）：
//   1) core/00-state.js：clampLog 函数体替换为 log-math 解构 + save-codec 解构
//   2) core/01-numbers-and-distortion.js：移除 logAddLogs/logAddSigned/cmpGE/cmpLT 段
//   3) services/04-format-and-save.js：Base64 段替换为 save-codec 锚点注释
// 自校验：分段并集（编辑前）必须逐字节还原基线。
// 用法：node tools/rebase-from-git.mjs <baselineCommitSha>
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASELINE = process.argv[2];
if (!BASELINE) throw new Error('usage: node tools/rebase-from-git.mjs <baselineCommitSha>');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 25 段的首行锚点（与 Issue/help/source-manifest.json 的段序一致）。
// 每段区间 = 本锚点行起、至下一段锚点行前（末段到文件尾）。
const ANCHORS = [
  ['src/core/00-state.js', '/* ===== Wave Incremental v0.6.3 — game logic ===== */'],
  ['src/core/01-numbers-and-distortion.js', '// ---------- 扭曲宇宙（v0.4.2.1 测试）----------'],
  ['src/rules/02-physics.js', '// ---------- 派生物理量 ----------'],
  ['src/rules/03-annihilation-formulas.js', '// ---------- 湮灭层 ----------'],
  ['src/services/04-format-and-save.js', '// ---------- Number / time formatting ----------'],
  ['src/ui/05-shell.js', '// ---------- Theme ----------'],
  ['src/engine/06-wave-purchase.js', '// ---------- Purchase ----------'],
  ['src/rules/07-phonon.js', '// ---------- 声子系统 ----------'],
  ['src/engine/08-annihilation.js', '// ---------- 湮灭 ----------'],
  ['src/rules/09-singularity.js', '// ---------- 奇点升级（3DA 里程碑解锁）----------'],
  ['src/ui/10-void.js', '// ---------- 虚空页 UI ----------'],
  ['src/rules/11-blackhole.js', '// ---------- 黑洞系统（v0.4.3 实装，5DA 解锁）----------'],
  ['src/rules/12-void.js', '// ---------- 虚空（A52 解锁：多扭曲削弱同时生效的挑战，结算虚空泡沫 VF）----------'],
  ['src/rules/13-compact-and-research.js', '// ---------- 卷缩层（v0.6.0.0 测试：第三重置层）----------'],
  ['src/ui/14-compact-and-research.js', '// ---------- 卷缩层 UI ----------'],
  ['src/ui/15-blackhole.js', '// ---------- 黑洞 UI（build-once, in-place update）+ 旋转动画 ----------'],
  ['src/ui/16-distortion.js', '// ---------- 扭曲宇宙 UI（build-once, in-place update）----------'],
  ['src/engine/17-automation-and-bulk.js', '// ---------- 自动化 ----------'],
  ['src/ui/18-render.js', '// ---------- Rendering ----------'],
  ['src/rules/19-achievements.js', '// ---------- 成就弹窗系统（左上角，堆叠+补位动画）----------'],
  ['src/engine/20-offline.js', '// ---------- 离线进度（加载存档时粗步长模拟生产与自动化）----------'],
  ['src/engine/21-tick.js', '// ---------- Game loop ----------'],
  ['src/ui/22-hotkeys.js', '// ---------- 快捷键（v0.5.0.3 QoL，所有玩家可用）----------'],
  ['src/ui/23-bindings.js', '// ---------- Wire up UI ----------'],
  ['src/app/24-boot.js', '// ---------- Boot ----------'],
];

const original = execFileSync('git', ['show', `${BASELINE}:game.js`], {
  cwd: root, maxBuffer: 8 * 1024 * 1024,
});
const text = original.toString('utf8');
const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];

// 顺序定位每段锚点行（从上一段起点之后找起）
const starts = [];
let searchFrom = 0;
for (const [name, anchor] of ANCHORS) {
  let found = -1;
  for (let i = searchFrom; i < lines.length; i++) {
    if (lines[i] === anchor + '\n' || lines[i] === anchor) { found = i; break; }
  }
  if (found < 0) throw new Error(`Anchor not found for ${name}: ${anchor}`);
  starts.push({ name, anchor, first: found });
  searchFrom = found + 1;
}

// 抽取（编辑前的原始分段）并自校验
const segments = starts.map((s, i) => {
  const last = (i + 1 < starts.length ? starts[i + 1].first : lines.length) - 1;
  return { name: s.name, first: s.first + 1, last: last + 1, text: lines.slice(s.first, last + 1).join('') };
});
const assembled = segments.map(s => s.text).join('');
if (!Buffer.from(assembled, 'utf8').equals(original)) throw new Error('Extraction changed the baseline bytes');

// 模块抽取编辑（与 Issue/help 候选相同的转换，逐字复刻）
const edit = (text, from, to) => {
  if (!text.includes(from)) throw new Error('Edit anchor not found:\n' + from.slice(0, 120));
  return text.replace(from, to);
};

for (const seg of segments) {
  if (seg.name === 'src/core/00-state.js') {
    // clampLog 函数体 → log-math 解构 + save-codec 解构（模块注入后可用）
    seg.text = edit(seg.text,
      `function clampLog(v) {
  if (v === -Infinity || v !== v || v < NLOG) return NLOG; // -Inf / NaN / 超下界
  if (v === Infinity || v > LOG_CAP) return LOG_CAP;
  return v;
}`,
      `const { clampLog, logAddLogs, logAddSigned, cmpGE, cmpLT } =
  createLogMath({ NLOG, LOG_CAP, LOG_FALLBACK });
const { encodeSave, decodeSave } = createSaveCodec(globalThis);`);
  }
  if (seg.name === 'src/core/01-numbers-and-distortion.js') {
    // log 域算术助手四函数移入 modules/log-math.js
    seg.text = edit(seg.text,
      `// ---------- log 域算术助手 ----------
// log10(a+b)，已知 la=log10(a)、lb=log10(b)（均含符号无关的量级）
function logAddLogs(la, lb) {
  la = clampLog(la); lb = clampLog(lb);
  if (la === -Infinity) return lb;
  if (lb === -Infinity) return la;
  const mx = Math.max(la, lb), mn = Math.min(la, lb);
  if (mn <= NLOG + 1) return mx; // 较小项可忽略
  return clampLog(mx + Math.log10(1 + Math.pow(10, mn - mx)));
}
// 带符号的 log 加法：sa/sb 为 ±1，返回 {log, sign} 表示 log10(|a+b|) 与符号
function logAddSigned(la, sa, lb, sb) {
  la = clampLog(la); lb = clampLog(lb);
  if (la <= NLOG + 1) return { log: lb, sign: sb };
  if (lb <= NLOG + 1) return { log: la, sign: sa };
  if (sa === sb) return { log: logAddLogs(la, lb), sign: sa };
  // 异号相减
  if (la >= lb) return { log: clampLog(la + Math.log10(1 - Math.pow(10, lb - la))), sign: sa };
  return { log: clampLog(lb + Math.log10(1 - Math.pow(10, la - lb))), sign: sb };
}
// 比较 helper：a、b 均有限且 < LOG_FALLBACK 时走原 double 比较（零回归），
// 任一非有限或 ≥ LOG_FALLBACK 时退化为 log 域比较（aLog >= bLog）
function cmpGE(a, b, aLog, bLog) {
  if (isFinite(a) && isFinite(b) && a < LOG_FALLBACK && b < LOG_FALLBACK) return a >= b;
  return aLog >= bLog;
}
function cmpLT(a, b, aLog, bLog) { return !cmpGE(a, b, aLog, bLog); }
`,
      `// ---------- log 域算术助手 ----------
// clampLog/logAddLogs/logAddSigned/cmpGE/cmpLT 见 src/modules/log-math.js（文件头部解构绑定）。
`);
  }
  if (seg.name === 'src/services/04-format-and-save.js') {
    // Base64 段移入 modules/save-codec.js，留锚点注释
    seg.text = edit(seg.text,
      `// ---------- Base64 (Unicode-safe) ----------
function encodeSave(obj) {
  const json = JSON.stringify(obj);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return "WI1-" + b64;
}
function decodeSave(str) {
  str = str.trim();
  if (str.startsWith("WI1-")) str = str.slice(4);
  const json = decodeURIComponent(escape(atob(str)));
  return JSON.parse(json);
}`,
      `// ---------- Base64 (Unicode-safe) ----------
// WI1 编解码实现见 src/modules/save-codec.js；此处保留原段落位置作审查锚点。`);
  }
}

// 写出 src/ 与 manifest
const manifest = {
  baselineCommit: BASELINE,
  baselineSha256: createHash('sha256').update(original).digest('hex'),
  files: segments.map(s => ({ path: s.name, firstLine: s.first, lastLine: s.last })),
  modules: ['src/modules/log-math.js', 'src/modules/save-codec.js'],
  notes: [
    'firstLine/lastLine 是抽取时基线（HEAD）中的行号；00-state/01-numbers/04-format 三段随后做过模块抽取编辑，实际行数少于记录值。',
    'candidateSourceSha256/candidateInputsSha256 由 tools/update-manifest.mjs 重建。',
  ],
};
await mkdir(resolve(root, 'src'), { recursive: true });
for (const seg of segments) {
  const target = resolve(root, seg.name);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, seg.text, 'utf8');
}
await writeFile(resolve(root, 'source-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`Extracted ${segments.length} sections from ${BASELINE}; baseline sha256=${manifest.baselineSha256}`);
