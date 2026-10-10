// Export the vector design with the browser's SVG renderer. No dependencies.
// Usage: node Issue/help/icons/render.mjs
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { dirname, resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = dirname(fileURLToPath(import.meta.url));
const executable = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find(existsSync);
if (!executable) throw new Error('Chrome or Edge is required to export the SVG.');
const profile = await mkdtemp(join(tmpdir(), 'wave-icon-render-'));
const browser = spawn(executable, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; }
    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  if (!port) throw new Error('Browser did not start.');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  const send = (method, params) => new Promise((resolve, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`${method} timed out`)); }, 15000);
    pending.set(requestId, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  const svg = await readFile(join(root, 'wave-icon-v1.svg'), 'utf8');
  const result = await send('Runtime.evaluate', {
    expression: `(async () => {
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(${JSON.stringify(svg)});
      await img.decode();
      return [16, 32, 48, 64, 128, 180, 256].map(size => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        canvas.getContext('2d').drawImage(img, 0, 0, size, size);
        return { size, png: canvas.toDataURL('image/png').split(',')[1] };
      });
    })()`, returnByValue: true, awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  const images = result.result.value.map(({ size, png }) => ({ size, bytes: Buffer.from(png, 'base64') }));
  for (const { size, bytes } of images) await writeFile(join(root, `wave-icon-${size}.png`), bytes);
  const icoImages = images.filter(({ size }) => size !== 180);
  const header = Buffer.alloc(6 + 16 * icoImages.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(icoImages.length, 4);
  let offset = header.length;
  icoImages.forEach(({ size, bytes }, index) => {
    const entry = 6 + index * 16;
    header[entry] = header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(bytes.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += bytes.length;
  });
  await writeFile(join(root, 'favicon.ico'), Buffer.concat([header, ...icoImages.map(({ bytes }) => bytes)]));
  console.log('Exported SVG to seven PNG sizes and favicon.ico.');
} finally {
  socket?.close();
  browser.kill();
  await new Promise(resolve => setTimeout(resolve, 500));
  // Only remove the temporary profile that this process created.
  if (dirname(resolve(profile)) !== resolve(tmpdir()) || !basename(profile).startsWith('wave-icon-render-')) {
    throw new Error('Unexpected temporary profile path.');
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
