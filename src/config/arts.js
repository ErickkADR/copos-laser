// Artes prontas: só o que se grava. O fundo é sempre o mesmo preto.
//  kind 'mask': máscara raster gerada do vetor por scripts/build-art.mjs (public/art/<id>-2048.webp; 400 dpi em <id>-laser.webp)
import manifest from './art-manifest.json';
import pack from './pack-manifest.json';
import { DEFAULT_PAINT } from './engrave.js';

const mask = (id) => ({ kind: 'mask', url: `/art/${manifest[id].screen}`, laserUrl: `/art/${manifest[id].laser}`, widthMm: manifest[id].widthMm, heightMm: manifest[id].heightMm });

export const ARTS = [
  { id: 'mulher-maravilha', name: 'Mulher-Maravilha', art: mask('mulher-maravilha') }, // a primeira: é a que aparece ao entrar na página
  { id: 'homem-de-ferro', name: 'Homem de Ferro', art: mask('homem-de-ferro') },
  { id: 'coringa', name: 'Coringa', art: mask('coringa') },
  { id: 'boiadeira', name: 'Boiadeira', art: mask('boiadeira') },
  { id: 'poker', name: 'Poker', art: mask('poker') },
  // pacote de artes de fibra laser do Erick: PNG preto e branco, proporção preservada (fit: 'contain'), claro = inox
  ...pack.map((p) => ({ id: p.id, name: p.name, art: { kind: 'mask', fit: 'contain', aspect: p.w / p.h, url: `/art/pack/${p.id}.webp`, laserUrl: `/art/pack/${p.id}.webp` } })),
].map((a) => ({ ...a, text: a.name, paint: DEFAULT_PAINT })); // o texto gravado na parte de baixo começa com o nome da arte

export const CUSTOM_BASE = { id: 'custom', name: 'Sua gravação' };
