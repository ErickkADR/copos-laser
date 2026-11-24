// Artes prontas: só o que se grava. O fundo é sempre o mesmo preto.
//  kind 'mask': máscara raster gerada do vetor por scripts/build-art.mjs (public/art/<id>-2048.webp; 400 dpi em <id>-laser.webp)
//  kind 'proc': arte desenhada por código (modules/procedural.js), zero byte de imagem.
import manifest from './art-manifest.json';
import { DEFAULT_PAINT } from './engrave.js';

const mask = (id) => ({ kind: 'mask', url: `/art/${manifest[id].screen}`, laserUrl: `/art/${manifest[id].laser}`, widthMm: manifest[id].widthMm, heightMm: manifest[id].heightMm });

export const ARTS = [
  { id: 'boiadeira', name: 'Boiadeira', art: mask('boiadeira') },
  { id: 'poker', name: 'Poker', art: mask('poker') },
  { id: 'mandala', name: 'Mandala', art: { kind: 'proc', draw: 'mandala' } },
  { id: 'constelacao', name: 'Constelação', art: { kind: 'proc', draw: 'constelacao' } },
].map((a) => ({ ...a, text: '', paint: DEFAULT_PAINT }));

export const CUSTOM_BASE = { id: 'custom', name: 'Sua gravação' };

// Exemplos locais (só em dev): artes com direitos autorais que ficam em public/locais, fora do git e do deploy.
export async function addLocalArts() {
  try {
    const list = await (await fetch('/locais/index.json')).json();
    list.forEach((e) => {
      ARTS.push({ id: e.id, name: e.id.replace(/-/g, ' '), local: true, text: '', paint: DEFAULT_PAINT,
        art: { kind: 'mask', url: `/locais/${e.screen}`, laserUrl: `/locais/${e.laser}`, widthMm: e.widthMm, heightMm: e.heightMm } });
    });
  } catch { /* sem a pasta local: segue só com as artes públicas */ }
}
