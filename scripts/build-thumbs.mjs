// Miniaturas quadradas (144 px) de cada arte para a grade da direita: como a gravação aparece no copo (inox prateado sobre o preto da pintura).
//   node scripts/build-thumbs.mjs      (depois de art:build e build-pack)
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';

const root = new URL('../public/art/', import.meta.url).pathname;
const out = root + 'thumb/';
await mkdir(out, { recursive: true });
const S = 144, BG = [15, 16, 18], SILVER = [214, 218, 224];

const jobs = [];
for (const f of await readdir(root)) if (f.endsWith('-2048.webp')) jobs.push([root + f, f.replace('-2048.webp', '')]);
for (const f of await readdir(root + 'pack/')) if (f.endsWith('.webp')) jobs.push([root + 'pack/' + f, f.replace('.webp', '')]);

let total = 0;
for (const [src, id] of jobs) {
  const a = await sharp(src).ensureAlpha().extractChannel('alpha').resize(S, S, { fit: 'cover', position: 'centre', kernel: 'lanczos3' }).raw().toBuffer();
  const rgb = Buffer.alloc(S * S * 3);
  for (let i = 0; i < S * S; i++) for (let c = 0; c < 3; c++) rgb[i * 3 + c] = BG[c] + (SILVER[c] - BG[c]) * (a[i] / 255);
  const buf = await sharp(rgb, { raw: { width: S, height: S, channels: 3 } }).webp({ quality: 72, effort: 6 }).toBuffer();
  await sharp(buf).toFile(out + id + '.webp');
  total += buf.length;
}
console.log(jobs.length, 'miniaturas,', (total / 1024).toFixed(0), 'KB');
