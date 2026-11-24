// Artes prontas. Cada uma define as cores do herói (contraste AA conferido), o que se grava e qual modelo 3D flutua em volta.
//  kind 'mask': máscara raster gerada do vetor por scripts/build-art.mjs (public/art/<id>-2048.webp; 400 dpi em <id>-laser.webp)
//  kind 'proc': arte desenhada por código (modules/procedural.js), zero byte de imagem.
import manifest from './art-manifest.json';
import { DEFAULT_PAINT } from './engrave.js';

const mask = (id) => ({ kind: 'mask', url: `/art/${id}.svg`, laserUrl: `/art/${id}.svg`, widthMm: manifest[id].widthMm, heightMm: manifest[id].heightMm });

export const ARTS = [
  { id: 'boiadeira', name: 'Boiadeira', word: 'BOIADEIRA', tagline: 'Cacto, estrada e horizonte aberto.', bg: '#e3a857', ink: '#24140a', element: 'star', art: mask('boiadeira') },
  { id: 'poker', name: 'Poker', word: 'POKER', tagline: 'Cartas na mesa, ficha na mão.', bg: '#3aa66b', ink: '#031a0c', element: 'diamond', art: mask('poker') },
  { id: 'mandala', name: 'Mandala', word: 'MANDALA', tagline: 'Três rosetas de volta inteira, desenhadas por código.', bg: '#c9b6ff', ink: '#1a1033', element: 'tag', art: { kind: 'proc', draw: 'mandala' } },
  { id: 'constelacao', name: 'Constelação', word: 'ESTRELAS', tagline: 'Lua e estrelas gravadas na volta toda.', bg: '#3d5bff', ink: '#ffffff', element: 'spark', art: { kind: 'proc', draw: 'constelacao' } },
].map((a) => ({ ...a, text: '', paint: DEFAULT_PAINT }));

export const CUSTOM_BASE = {
  id: 'custom',
  name: 'Sua gravação',
  word: 'SUA ARTE',
  tagline: 'Sua arte, seu nome, a cor que você quiser.',
  bg: '#d5d8dd',
  ink: '#101114',
  element: 'spark',
};

// Exemplos locais (só em dev): artes com direitos autorais que ficam em public/locais, fora do git e do deploy.
const LOCAL_BG = [['#e8573f', '#ffffff'], ['#7c5cff', '#ffffff'], ['#f2c230', '#1c1500']];
const LOCAL_EL = ['star', 'diamond', 'spark'];
export async function addLocalArts() {
  try {
    const list = await (await fetch('/locais/index.json')).json();
    list.forEach((e, i) => {
      const [bg, ink] = LOCAL_BG[i % LOCAL_BG.length];
      ARTS.push({ id: e.id, name: e.id.replace(/-/g, ' '), word: e.id.split('-')[0].toUpperCase().slice(0, 9), tagline: 'Exemplo local (direitos autorais): fora do deploy.', bg, ink, element: LOCAL_EL[i % 3], local: true, text: '', paint: DEFAULT_PAINT,
        art: { kind: 'mask', url: `/locais/${e.screen}`, laserUrl: `/locais/${e.laser}`, widthMm: e.widthMm, heightMm: e.heightMm } });
    });
  } catch { /* sem a pasta local: segue só com as artes públicas */ }
}

// Texto legível sobre qualquer cor: escolhe preto ou branco pela luminância relativa (WCAG).
export function inkFor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? '#111111' : '#ffffff';
}
