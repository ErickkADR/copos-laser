// Ambiente de estúdio para os reflexos do inox: equirretangular 1024x512 desenhada em SVG (caixas de luz sobre fundo escuro).
// O ambiente "neutral" do model-viewer é cinza liso e deixa o metal chapado; as caixas de luz dão a ele o que refletir.
//   node scripts/build-env.mjs   -> public/img/studio-env.jpg
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa3b2"/><stop offset="0.5" stop-color="#5a6070"/><stop offset="1" stop-color="#23262b"/></linearGradient>
    <filter id="b1"><feGaussianBlur stdDeviation="14"/></filter><filter id="b2"><feGaussianBlur stdDeviation="5"/></filter>
  </defs>
  <rect width="1024" height="512" fill="url(#bg)"/>
  <g filter="url(#b1)">
    <rect x="40" y="90" width="190" height="290" fill="#fff"/>
    <rect x="430" y="70" width="180" height="300" fill="#f4f6ff"/>
    <rect x="780" y="100" width="190" height="270" fill="#fff4e6"/>
    <rect x="250" y="20" width="520" height="46" fill="#ffffff"/>
  </g>
  <g filter="url(#b2)">
    <rect x="300" y="170" width="26" height="200" fill="#ffffff"/>
    <rect x="690" y="180" width="26" height="190" fill="#ffffff"/>
  </g>
</svg>`;
await mkdir(new URL('../public/img/', import.meta.url), { recursive: true });
const out = new URL('../public/img/studio-env.jpg', import.meta.url).pathname;
await sharp(Buffer.from(svg)).jpeg({ quality: 82, mozjpeg: true }).toFile(out);
console.log('studio-env.jpg', (await sharp(out).metadata()).size, 'bytes');
