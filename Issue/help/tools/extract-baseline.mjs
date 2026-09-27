import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// This script reads a fixed Git object. It never reads or writes the live game.js.
const BASELINE = '6523dfc7257ca29003eb6e429ea1b858ffc7ec70';
const helpRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(helpRoot, '..', '..');

const segments = [
  [1, 'src/core/00-state.js'],
  [229, 'src/core/01-numbers-and-distortion.js'],
  [449, 'src/rules/02-physics.js'],
  [743, 'src/rules/03-annihilation-formulas.js'],
  [1059, 'src/services/04-format-and-save.js'],
  [1726, 'src/ui/05-shell.js'],
  [1803, 'src/engine/06-wave-purchase.js'],
  [2039, 'src/rules/07-phonon.js'],
  [2222, 'src/engine/08-annihilation.js'],
  [2728, 'src/rules/09-singularity.js'],
  [2818, 'src/ui/10-void.js'],
  [3176, 'src/rules/11-blackhole.js'],
  [3338, 'src/rules/12-void.js'],
  [3910, 'src/rules/13-compact-and-research.js'],
  [5022, 'src/ui/14-compact-and-research.js'],
  [5597, 'src/ui/15-blackhole.js'],
  [6163, 'src/ui/16-distortion.js'],
  [6217, 'src/engine/17-automation-and-bulk.js'],
  [6853, 'src/ui/18-render.js'],
  [7200, 'src/rules/19-achievements.js'],
  [7542, 'src/engine/20-offline.js'],
  [7673, 'src/engine/21-tick.js'],
  [7950, 'src/ui/22-hotkeys.js'],
  [8128, 'src/ui/23-bindings.js'],
  [8484, 'src/app/24-boot.js'],
];

const original = execFileSync('git', ['show', `${BASELINE}:game.js`], {
  cwd: repoRoot,
  maxBuffer: 4 * 1024 * 1024,
});
const text = original.toString('utf8');
const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
const output = [];

for (let index = 0; index < segments.length; index++) {
  const [firstLine, name] = segments[index];
  const nextLine = segments[index + 1]?.[0] ?? lines.length + 1;
  const content = lines.slice(firstLine - 1, nextLine - 1).join('');
  if (!content) throw new Error(`Empty segment: ${name}`);
  const target = resolve(helpRoot, name);
  try {
    await stat(target);
    throw new Error(`Refusing to overwrite existing candidate source: ${name}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
  output.push({ path: name, firstLine, lastLine: nextLine - 1 });
}

const assembled = output.map((entry, index) =>
  lines.slice(entry.firstLine - 1, (segments[index + 1]?.[0] ?? lines.length + 1) - 1).join('')
).join('');
if (!Buffer.from(assembled, 'utf8').equals(original)) {
  throw new Error('Extraction changed the baseline bytes');
}

await writeFile(resolve(helpRoot, 'source-manifest.json'), JSON.stringify({
  baselineCommit: BASELINE,
  baselineSha256: createHash('sha256').update(original).digest('hex'),
  files: output,
}, null, 2) + '\n', 'utf8');
console.log(`Extracted ${output.length} source sections from ${BASELINE}`);
