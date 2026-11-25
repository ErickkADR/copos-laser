// Pacote de artes de fibra laser do Erick (PNG preto e branco, 1820 px) -> máscaras WebP lossless binárias em public/art/pack + manifesto.
//   node scripts/build-pack.mjs <pasta com os PNG extraídos do zip>
// Regra de gravação: arte de fundo ESCURO -> o claro vira inox. Arte de fundo CLARO (papel branco) -> o traço ESCURO vira inox: sai traço prateado sobre o
// preto da pintura, em vez de um bloco prateado (que gastaria o copo todo e ficaria feio).
// Fica de fora quem é pessoa do círculo do Erick (site público): ver EXCLUIR.
import sharp from 'sharp';
import { readdir, writeFile, mkdir } from 'node:fs/promises';

const EXCLUIR = /^(LEANDRO|VICTOR|RICARDO)\b/i;
const dir = process.argv[2];
const out = new URL('../public/art/pack/', import.meta.url).pathname;
await mkdir(out, { recursive: true });

const nice = (f) => {
  let n = f.replace(/\.png$/i, '').replace(/_/g, 'Á').replace(/HAIRD/i, 'HAIR').replace(/-(\d+)$/, (_, d) => ` ${+d + 1}`);
  if (/^image (\d+)$/i.test(n)) return `Arte ${n.split(' ')[1].padStart(2, '0')}`;
  return n.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()).replace('Tent Aculos', 'Tentáculos').replace('Tentáculos', 'Tentáculos');
};
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const list = [];
let total = 0;
for (const f of (await readdir(dir)).filter((x) => x.endsWith('.png')).sort()) {
  if (EXCLUIR.test(f)) { console.log('fora:', f); continue; }
  const { data, info } = await sharp(dir + '/' + f).flatten({ background: '#000' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const px = info.width * info.height, buf = Buffer.alloc(px * 4); // RGB preto, alfa = máscara
  let sum = 0; for (let i = 0; i < px; i += 7) sum += data[i];
  const light = sum / Math.ceil(px / 7) > 118; // fundo claro: grava o escuro
  if (light) console.log('fundo claro (grava o traço):', f);
  for (let i = 0; i < px; i++) buf[i * 4 + 3] = (data[i] >= 128) !== light ? 255 : 0;
  const name = nice(f), id = slug(name);
  const webp = await sharp(buf, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ lossless: true, effort: 6 }).toBuffer();
  await writeFile(out + id + '.webp', webp);
  total += webp.length;
  list.push({ id, name, w: info.width, h: info.height });
}
list.sort((a, b) => (a.name.startsWith('Arte ') - b.name.startsWith('Arte ')) || a.name.localeCompare(b.name, 'pt-BR', { numeric: true })); // as sem nome (Arte NN) vão para o fim
await writeFile(new URL('../src/config/pack-manifest.json', import.meta.url).pathname, JSON.stringify(list) + '\n');
console.log(list.length, 'artes,', (total / 1048576).toFixed(1), 'MB');
