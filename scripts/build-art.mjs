// Artes de gravação: SVG vetorial -> máscara raster (alfa) em dois tamanhos + medição das alternativas de formato.
//   node scripts/build-art.mjs
// - tela:  largura = mm da arte x 2048/283 (o mapa de textura do copo tem 7,24 px/mm). Vai para o runtime.
// - laser: 400 dpi (15,75 px/mm). Só é baixado quando o visitante pede o arquivo de gravação.
// A máscara é o canal alfa de uma imagem toda preta: onde há tinta (gravação) alfa = 255.
// Entradas públicas: assets-src/arte/*.svg (versionadas). Exemplos locais (direitos autorais): exemplos-locais/*.svg -> public/locais (fora do git e do deploy).
import sharp from 'sharp';
import { optimize } from 'svgo';
import { readFile, writeFile, mkdir, stat, readdir } from 'node:fs/promises';

const SCREEN_PX_PER_MM = 2048 / 283;
const LASER_PX_PER_MM = 400 / 25.4;
const root = (p) => new URL(`../${p}`, import.meta.url).pathname;

const PUBLIC = [
  { id: 'mulher-maravilha', src: 'assets-src/arte/mulher-maravilha.svg', out: 'public/art/', invert: true }, // arte em negativo: branco sobre fundo escuro
  { id: 'homem-de-ferro', src: 'assets-src/arte/homem-de-ferro.svg', out: 'public/art/' },
  { id: 'coringa', src: 'assets-src/arte/coringa.svg', out: 'public/art/' },
  { id: 'boiadeira', src: 'assets-src/arte/boiadeira.svg', out: 'public/art/', unit: 'pt' }, // SVG do PDF: sem unidade = pontos
  { id: 'poker', src: 'assets-src/arte/poker.svg', out: 'public/art/' },
];
const LOCAL = [];

const UNITS = { mm: 1, pt: 25.4 / 72, px: 25.4 / 96, cm: 10, in: 25.4 };
function sizeMm(svg, defaultUnit = 'px') {
  const head = svg.slice(0, 1500);
  const get = (k) => {
    const m = head.match(new RegExp(`\\s${k}="([\\d.]+)(mm|pt|px|cm|in)?"`));
    return +m[1] * UNITS[m[2] ?? defaultUnit];
  };
  return { w: get('width'), h: get('height') };
}

const kb = (b) => (b / 1024).toFixed(b < 102400 ? 1 : 0) + ' KB';
const rows = [];
const manifestLocal = [];
const manifest = {};

for (const [list, local] of [[PUBLIC, false], [LOCAL, true]]) {
  for (const art of list) {
    const svg = await readFile(root(art.src), 'utf8');
    const { w: wMm, h: hMm } = sizeMm(svg, art.unit);
    await mkdir(root(art.out), { recursive: true });
    const raster = async (pxPerMm) => {
      const width = Math.round(wMm * pxPerMm);
      // Cálculo do dpi que já cai no alvo, sem reamostrar. Nos SVGs do CorelDRAW (largura em mm + viewBox em centésimos de mm) o
      // librsvg aplica o dpi duas vezes: a largura cresce com o QUADRADO do dpi. Medindo a 72 e a 144 dpi sai o expoente certo.
      const w72 = (await sharp(Buffer.from(svg), { density: 72 }).metadata()).width;
      const w144 = (await sharp(Buffer.from(svg), { density: 144 }).metadata()).width;
      const exp = Math.log2(w144 / w72);
      const density = Math.round(72 * (width / w72) ** (1 / exp));
      // composto sobre branco -> luminância. Arte "preto no claro" grava o escuro (máscara = 255 - lum); arte em negativo
      // (branco sobre fundo escuro, ex.: mulher-maravilha) tem `invert` e grava o claro (máscara = lum).
      const { data, info } = await sharp(Buffer.from(svg), { density })
        .resize({ width })
        .flatten({ background: '#ffffff' })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const px = info.width * info.height;
      const out = Buffer.alloc(px * 4); // RGB preto, alfa = máscara
      for (let i = 0; i < px; i++) out[i * 4 + 3] = art.invert ? data[i] : 255 - data[i];
      return { buf: out, w: info.width, h: info.height };
    };
    const screenSmooth = await raster(SCREEN_PX_PER_MM);
    const laserSmooth = await raster(LASER_PX_PER_MM);
    // O que vai para o ar é binário (alfa 0 ou 255): a gravação a laser é 1 bit mesmo, e a máscara sem meios-tons comprime ~5x melhor.
    // A suavização das bordas na tela vem de um blur de 0,6 px ao desenhar no canvas (textures.js) e do mipmap da GPU.
    const binarize = (r) => {
      const buf = Buffer.from(r.buf);
      for (let i = 3; i < buf.length; i += 4) buf[i] = buf[i] >= 128 ? 255 : 0;
      return { ...r, buf };
    };
    const screen = binarize(screenSmooth);
    const laser = binarize(laserSmooth);
    const enc = (r) => sharp(r.buf, { raw: { width: r.w, height: r.h, channels: 4 } });

    // --- candidatos para a máscara de tela ---
    const cand = {};
    const smooth = (r) => sharp(r.buf, { raw: { width: r.w, height: r.h, channels: 4 } });
    cand['SVG original'] = Buffer.byteLength(svg);
    cand['SVG com svgo (multipass, precisão 1)'] = Buffer.byteLength(optimize(svg, { multipass: true, floatPrecision: 1 }).data);
    cand['PNG 8 bits, suavizada (alfa)'] = (await smooth(screenSmooth).png({ compressionLevel: 9 }).toBuffer()).length;
    cand['WebP lossless, suavizada'] = (await smooth(screenSmooth).webp({ lossless: true, effort: 6 }).toBuffer()).length;
    cand['WebP com perda (q80, alfa 90), suavizada'] = (await smooth(screenSmooth).webp({ quality: 80, alphaQuality: 90, effort: 6 }).toBuffer()).length;
    cand['PNG 1 bit (paleta com alfa), binária'] = (await enc(screen).png({ palette: true, colours: 2, compressionLevel: 9, effort: 10 }).toBuffer()).length;
    const webpLossless = await enc(screen).webp({ lossless: true, effort: 6 }).toBuffer();
    cand['**WebP lossless, binária (escolhido)**'] = webpLossless.length;
    const webpLaser = await enc(laser).webp({ lossless: true, effort: 6 }).toBuffer();

    // escolhido: WebP lossless da máscara binária
    await writeFile(root(`${art.out}${art.id}-2048.webp`), webpLossless);
    await writeFile(root(`${art.out}${art.id}-laser.webp`), webpLaser);
    const entry = { id: art.id, widthMm: +wMm.toFixed(2), heightMm: +hMm.toFixed(2), screen: `${art.id}-2048.webp`, laser: `${art.id}-laser.webp`, screenPx: [screen.w, screen.h], laserPx: [laser.w, laser.h] };
    if (local) manifestLocal.push(entry);
    else manifest[art.id] = entry;
    rows.push({ id: art.id, local, wMm, hMm, cand, laser: webpLaser.length, screen, laserDim: laser });
    console.log(art.id, `${wMm.toFixed(1)}x${hMm.toFixed(1)} mm`, kb(webpLossless.length), 'laser', kb(webpLaser.length));
  }
}

await writeFile(root('src/config/art-manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
if (manifestLocal.length) await writeFile(root('public/locais/index.json'), JSON.stringify(manifestLocal, null, 1) + '\n');

const names = Object.keys(rows[0].cand);
const md = [
  '| Formato da arte (máscara de tela, 2048 px de mapa) | ' + rows.filter((r) => !r.local).map((r) => r.id).join(' | ') + ' |',
  '|---|' + rows.filter((r) => !r.local).map(() => '---:').join('|') + '|',
  ...names.map((n) => `| ${n} | ${rows.filter((r) => !r.local).map((r) => kb(r.cand[n])).join(' | ')} |`),
  `| Máscara de laser, binária (400 dpi, só sob demanda) | ${rows.filter((r) => !r.local).map((r) => `${kb(r.laser)} (${r.laserDim.w}×${r.laserDim.h})`).join(' | ')} |`,
].join('\n');
await mkdir(root('reports'), { recursive: true });
await writeFile(root('reports/art.md'), md + '\n');
console.log('\n' + md);
