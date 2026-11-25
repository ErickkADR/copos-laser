// O coração do projeto: a arte vira uma MÁSCARA (alfa) e a máscara vira o material do copo.
//   máscara = 1  -> a tinta saiu: inox escovado (baseColor prateado, metalness 1, roughness ~0,34 com ruído de escovado)
//   máscara = 0  -> pintura eletrostática fosca (baseColor da cor do copo, metalness 0, roughness ~0,74)
// Saem três mapas do mesmo canvas de máscara: baseColor, metallicRoughness (G = rugosidade, B = metal) e um normal leve (a tinta
// tem espessura: a borda da gravação pega luz). Os mapas são escritos de cabeça para baixo de propósito: o CanvasTexture do
// three tem flipY = true e o glTF espera a origem no topo.
import { ART_ZONE, WRAP, NAME_ZONE, BODY_MM, EXPORT_ZONE, STEEL, ROUGH, textureSize } from '../config/engrave.js';

export const FONT = '"Archivo Variable", "Archivo", system-ui, sans-serif';

const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
const imgCache = new Map();
export function loadImage(url) {
  if (!imgCache.has(url)) {
    imgCache.set(url, new Promise((res, rej) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = url;
    }));
  }
  return imgCache.get(url);
}

// ---------- 1. a tinta: tudo que será gravado, em preto sobre transparente ----------
// `s` = px por mm. layout = onde cai cada coisa (mm, a partir do topo do canvas):
//   corpo (padrão): arte em ART_ZONE.y, nome comprimido na parte larga; arquivo do laser: arte em 0 e nome logo abaixo, sem compressão.
const bodyLayout = () => ({ w: BODY_MM.w, artY: ART_ZONE.y, nameCy: NAME_ZONE.y + NAME_ZONE.h / 2, nameSx: NAME_ZONE.sx });
const laserLayout = () => ({ w: EXPORT_ZONE.w, artY: 0, nameCy: EXPORT_ZONE.nameY + NAME_ZONE.h / 2, nameSx: 1 });

export function drawInk(ctx, spec, s, layout = bodyLayout(), { laser = false } = {}) {
  const art = spec.art;
  const ay = layout.artY * s;
  const W = layout.w * s, H = ART_ZONE.h * s; // a arte ocupa a volta INTEIRA (360°): da borda esquerda à direita do mapa
  if (art?.kind === 'mask' && (art.img || art.imgLaser)) {
    const im = (laser && art.imgLaser) || art.img;
    if (art.fit === 'contain') {
      // proporção preservada: altura cheia da faixa, largura em mm reais (1 px do mapa na horizontal vale WRAP.mm / largura do mapa), centrada na volta
      const hh = H, ww = Math.min(W, (H * art.aspect * W) / (WRAP.mm * s)) ;
      ctx.drawImage(im, (W - ww) / 2, ay, ww, hh);
    } else ctx.drawImage(im, 0, ay, W, H);
  } else if (art?.kind === 'upload' && art.layer) {
    ctx.drawImage(art.layer(Math.round(W), Math.round(H)), 0, ay);
  }
  if (NAME_ZONE.on && spec.text?.trim()) drawName(ctx, spec.text.trim(), s, layout);
}

function drawName(ctx, text, s, layout) {
  let size = NAME_ZONE.h * 0.8 * s;
  ctx.save();
  ctx.translate((layout.w * s) / 2, layout.nameCy * s);
  ctx.scale(layout.nameSx, 1);
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${size}px ${FONT}`;
  const wMax = NAME_ZONE.maxW * s;
  const w = ctx.measureText(text).width;
  if (w > wMax) { size *= wMax / w; ctx.font = `800 ${size}px ${FONT}`; }
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// ---------- arte enviada pelo visitante: SVG/PNG/JPG/WebP -> máscara por limiar de luminância/alfa ----------
// ink = alfa × (1 − luminância); `invert` troca para alfa × luminância (grava o claro, ex.: logo branco em fundo transparente).
// Grava onde ink > 1 − limiar: limiar alto = mais gravado.
export async function readUpload(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    if (!img.naturalWidth) { img.width = img.width || 1000; img.height = img.height || 500; }
    const sw = img.naturalWidth || img.width, sh = img.naturalHeight || img.height;
    const src = canvas(sw, sh);
    src.getContext('2d').drawImage(img, 0, 0, sw, sh);
    return { source: src, name: file.name, aspect: sw / sh };
  } finally { setTimeout(() => URL.revokeObjectURL(url), 5000); }
}

export function uploadArt(up, { threshold = 0.5, invert = false } = {}) {
  let cache = null;
  return {
    kind: 'upload',
    layer(w, h) { // máscara já no tamanho da faixa; a arte enviada se repete (lado a lado, sem distorcer) até dar a volta inteira
      if (cache && cache.w === w && cache.h === h) return cache.c;
      const c = cache?.c ?? canvas(w, h);
      c.width = w; c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.clearRect(0, 0, w, h);
      const tileH = h, tileW = h * (up.source.width / up.source.height);
      const n = Math.max(1, Math.round(w / tileW)), dw = w / n; // n cópias, levemente ajustadas para fechar a volta sem emenda
      ctx.imageSmoothingQuality = 'high';
      for (let i = 0; i < n; i++) ctx.drawImage(up.source, i * dw, 0, dw, tileH);
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const lo = Math.max(0, 1 - threshold - 0.03), hi = Math.min(1, 1 - threshold + 0.03);
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3] / 255;
        const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        const ink = a * (invert ? lum : 1 - lum);
        const t = Math.min(1, Math.max(0, (ink - lo) / (hi - lo || 1))); // limiar com borda de ~6% (suaviza o serrilhado)
        d[i] = d[i + 1] = d[i + 2] = 0;
        d[i + 3] = t * 255;
      }
      ctx.putImageData(img, 0, 0);
      cache = { w, h, c };
      return c;
    },
  };
}

// ---------- 2. a máscara vira material ----------
// ruído de escovado: riscas horizontais (uma por linha) + grão por pixel, ladrilho de 256x256 (calculado uma vez)
const NOISE = (() => {
  const t = new Uint8Array(256 * 256);
  let a = 12345;
  const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let y = 0; y < 256; y++) { const row = r(); for (let x = 0; x < 256; x++) t[y * 256 + x] = (row * 0.6 + r() * 0.4) * 255; }
  return t;
})();

const hexRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

export function createEngraver(width) {
  const [W, H] = textureSize(width);
  const s = W / BODY_MM.w;
  const maskCanvas = canvas(W, H);
  const mctx = maskCanvas.getContext('2d', { willReadFrequently: true });
  const hw = W >> 1, hh = H >> 1;
  const height = new Float32Array(hw * hh);
  let baseImg = null, mrImg = null, nImg = null;

  // desenha a tinta no canvas de máscara e devolve o alfa (RGBA, só o canal A importa)
  function paintMask(spec) {
    mctx.clearRect(0, 0, W, H);
    drawInk(mctx, spec, s);
    return mctx.getImageData(0, 0, W, H).data;
  }

  // `set` = { base, mr, normal } (canvases já com o tamanho certo). Escreve os três mapas.
  function compose(spec, set) {
    const a = paintMask(spec);
    const paint = hexRgb(spec.paint);
    const bc = set.base.getContext('2d'), mc = set.mr.getContext('2d'), nc = set.normal.getContext('2d');
    if (!baseImg) { baseImg = bc.createImageData(W, H); mrImg = mc.createImageData(W, H); nImg = nc.createImageData(hw, hh); }
    const b32 = new Uint32Array(baseImg.data.buffer), m32 = new Uint32Array(mrImg.data.buffer);
    const paintPx = (255 << 24) | (paint[2] << 16) | (paint[1] << 8) | paint[0];
    const paintRoughG = Math.round(ROUGH.paint * 255);
    const mrPaint = (255 << 24) | (0 << 16) | (paintRoughG << 8) | 255; // R=1 (sem AO), G=rugosidade, B=metal 0
    const roughBase = ROUGH.steel * 255;
    for (let y = 0; y < H; y++) {
      const out = (H - 1 - y) * W; // de cabeça para baixo (flipY do CanvasTexture)
      const nrow = (y & 255) << 8;
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const m = a[i * 4 + 3];
        if (m === 0) { b32[out + x] = paintPx; m32[out + x] = mrPaint; continue; }
        const n = NOISE[nrow | (x & 255)] / 255; // 0..1
        const k = 0.9 + n * 0.12; // brilho do aço escovado
        const sr = Math.min(255, STEEL[0] * k), sg = Math.min(255, STEEL[1] * k), sb = Math.min(255, STEEL[2] * k);
        const t = m / 255;
        const r = paint[0] + (sr - paint[0]) * t, g = paint[1] + (sg - paint[1]) * t, bl = paint[2] + (sb - paint[2]) * t;
        b32[out + x] = (255 << 24) | ((bl | 0) << 16) | ((g | 0) << 8) | (r | 0);
        const rough = paintRoughG + (roughBase + (n - 0.5) * 50 - paintRoughG) * t;
        m32[out + x] = (255 << 24) | ((t * 255) << 16) | ((rough | 0) << 8) | 255;
      }
    }
    bc.putImageData(baseImg, 0, 0);
    mc.putImageData(mrImg, 0, 0);

    // normal leve: altura = tinta (1) / aço (0) na meia resolução (média de 2x2 = borda já suave), gradiente por diferenças centrais
    for (let y = 0; y < hh; y++)
      for (let x = 0; x < hw; x++) {
        const i = (y * 2) * W + x * 2;
        height[y * hw + x] = 1 - (a[i * 4 + 3] + a[(i + 1) * 4 + 3] + a[(i + W) * 4 + 3] + a[(i + W + 1) * 4 + 3]) / 1020;
      }
    const nd = nImg.data;
    const K = 2.2;
    for (let y = 0; y < hh; y++) {
      const out = (hh - 1 - y) * hw;
      for (let x = 0; x < hw; x++) {
        const l = height[y * hw + Math.max(0, x - 1)], r = height[y * hw + Math.min(hw - 1, x + 1)];
        const u = height[Math.max(0, y - 1) * hw + x], d = height[Math.min(hh - 1, y + 1) * hw + x];
        let nx = -(r - l) * K, ny = (d - u) * K; // y do glTF aponta para cima na imagem; aqui y cresce para baixo
        const inv = 1 / Math.hypot(nx, ny, 1);
        nx *= inv; ny *= inv;
        const o = (out + x) * 4;
        nd[o] = (nx * 0.5 + 0.5) * 255; nd[o + 1] = (ny * 0.5 + 0.5) * 255; nd[o + 2] = (inv * 0.5 + 0.5) * 255; nd[o + 3] = 255;
      }
    }
    nc.putImageData(nImg, 0, 0);
  }

  return { W, H, hw, hh, compose };
}

// ---------- 3. arquivo para a fibra laser: PNG preto e branco no tamanho real ----------
// Preto = gravado. Sem meios-tons (a fibra trabalha em 1 bit): o texto e as bordas passam por um limiar em 50%.
export async function renderLaser(spec, { pxPerMm, zone = EXPORT_ZONE }) {
  const w = Math.round(zone.w * pxPerMm), h = Math.round(zone.h * pxPerMm);
  const ink = canvas(w, h);
  const ctx = ink.getContext('2d', { willReadFrequently: true });
  if (spec.art?.kind === 'mask' && spec.art.laserUrl) spec = { ...spec, art: { ...spec.art, imgLaser: await loadImage(spec.art.laserUrl) } }; // cópia: o tema original não muda
  drawInk(ctx, spec, pxPerMm, laserLayout(), { laser: true });
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i + 3] >= 128 ? 0 : 255; // gravado = preto, resto = branco
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const blob = await new Promise((res) => ink.toBlob(res, 'image/png'));
  return { blob, w, h };
}

export async function fontsReady() {
  try { await Promise.all([document.fonts.load(`800 100px ${FONT}`), document.fonts.load(`500 40px ${FONT}`)]); } catch { /* sem a fonte, o canvas usa a do sistema */ }
}
