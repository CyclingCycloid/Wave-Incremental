// 主游戏构建：按 source-manifest.json 顺序拼接 src/ 分段，前置两个纯函数模块，
// 产出根目录 game.js（经典脚本，无 IIFE/无作用域隔离——与历史工作流和 tail55 回归兼容）。
// 哈希门：分段或模块被改动时构建会拒绝，除非显式 `node tools/build.mjs --update`
// 审查并重写 manifest 的指纹（防「审的版本」与「跑的版本」脱节）。
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const update = process.argv.includes('--update');
const manifest = JSON.parse(await readFile(resolve(root, 'source-manifest.json'), 'utf8'));
const parts = await Promise.all(manifest.files.map(async ({ path }) =>
  readFile(resolve(root, path), 'utf8')
));
const source = parts.join('');
const logMathModule = await readFile(resolve(root, 'src/modules/log-math.js'), 'utf8');
const saveCodecModule = await readFile(resolve(root, 'src/modules/save-codec.js'), 'utf8');

const sourceHash = createHash('sha256').update(source).digest('hex');
const inputsHash = createHash('sha256')
  .update([source, logMathModule, saveCodecModule].join('\0'))
  .digest('hex');

if (update) {
  manifest.candidateSourceSha256 = sourceHash;
  manifest.candidateInputsSha256 = inputsHash;
  await writeFile(resolve(root, 'source-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log('manifest fingerprints updated');
} else {
  if (sourceHash !== (manifest.candidateSourceSha256 ?? manifest.baselineSha256)) {
    throw new Error('Candidate source changed. Review the diff and run `node tools/build.mjs --update` deliberately.');
  }
  if (inputsHash !== manifest.candidateInputsSha256) {
    throw new Error('A module changed. Review the diff and run `node tools/build.mjs --update` deliberately.');
  }
}

// 输出 = 模块源（createLogMath/createSaveCodec 工厂定义）+ 25 个分段。
// 分段内 core/00-state.js 的解构（createLogMath/createSaveCodec）位于文件前部，词法顺序成立。
const output = logMathModule + '\n' + saveCodecModule + '\n' + source;
await writeFile(resolve(root, 'game.js'), output, 'utf8');
console.log(`Built game.js from ${manifest.files.length} source sections (baseline ${manifest.baselineCommit})`);
