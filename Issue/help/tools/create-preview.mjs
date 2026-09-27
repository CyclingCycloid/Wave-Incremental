import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const baseline = '6523dfc7257ca29003eb6e429ea1b858ffc7ec70';
const helpRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(helpRoot, '..', '..');
let html = execFileSync('git', ['show', `${baseline}:index.html`], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 1024 * 1024,
});

const replaceOnce = (from, to) => {
  if (!html.includes(from)) throw new Error(`Missing expected HTML reference: ${from}`);
  html = html.replace(from, to);
};
replaceOnce('href="style.css"', 'href="../../style.css"');
replaceOnce('href="CHANGELOG.md"', 'href="../../CHANGELOG.md"');
replaceOnce('src="break_infinity.js"', 'src="../../break_infinity.js"');
replaceOnce('src="game.js"', 'src="./game.js"');
await writeFile(resolve(helpRoot, 'index.html'), html, 'utf8');
console.log('Created isolated Issue/help/index.html preview');
