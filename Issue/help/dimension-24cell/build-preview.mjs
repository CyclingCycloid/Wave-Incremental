import { readFile, writeFile } from 'node:fs/promises';

const source = new URL('./preview-source.html', import.meta.url);
const destination = new URL('./index.html', import.meta.url);
const fragment = (await readFile(source, 'utf8')).replace(/\r\n/g, '\n').trim();

const document = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
  <title>维度折叠器 · 二十四胞体</title>
  <style>
    :root { color-scheme: light dark; background: light-dark(#ffffff, #181818); }
    html { margin: 0; }
    body { box-sizing: border-box; max-width: 820px; margin: 0 auto; padding: 16px; }
  </style>
</head>
<body>
${fragment}
</body>
</html>
`;

await writeFile(destination, document, 'utf8');
console.log('已生成二十四胞体独立预览。');
