// Geometria física da gravação, em milímetros. O copo é o modelo real (SketchUp -> GLB, scripts/convert-dae.mjs): corpo de 284 mm
// de altura com a parte de baixo mais estreita (raio 45 a 50 mm) e a de cima larga (raio 65 mm). O mapa de textura é a planificação do
// corpo inteiro: a largura é UMA volta na parte de baixo (circunferência de referência, ~298 mm), igual para todas as alturas.
// Cada modelo de copo tem a sua geometria. Os objetos abaixo são MUTÁVEIS e preenchidos por useModel(id): quem importa BODY_MM, ART_ZONE...
// sempre vê o modelo atual. Medidas em mm, contadas do TOPO do corpo pintado.
//  cup  (térmico 40 oz): corpo de 284 mm; arte na parte LARGA de cima (raio 65 mm = 408 mm de volta), texto na parte estreita de baixo.
//  pint (caneca de cerveja térmica, feita no Blender): medidas OFICIAIS do Classic Stay-Chill Beer Pint 16 oz (473 ml): 171 mm de altura x 95 mm de diâmetro (3,75" x 6,75"); corpo pintado de 138,5 mm entre as faixas de aço de 12 mm; volta média 237,5 mm.
export const MODELS = {
  cup: {
    // Copo Quencher feito no Blender (assets-src/quencher.blend), medido numa foto de frente do Erick (escala: 274 mm de altura total com canudo): corpo pintado de 190,7 mm,
    // parte larga quase reta (raio 50,5 -> 52 mm) de z = 101 a 190,7 mm, degrau suave de 10 mm e base só ~10% mais estreita (raio 43 -> 46,7 mm) de z = 0 a 91 mm; faixa de aço de 10 mm;
    // alça grossa de cantos arredondados (v5: 93 mm de altura, 56 mm para fora, barras de 21-25 mm).
    // Mapa = volta de 322 mm (raio no meio da arte). Arte de 78 mm (6 mm abaixo do topo), que se repete 2x na volta; texto de 24 mm na base (volta ~281 mm), esticado 1,15x.
    file: 'cup.glb?v=10', name: 'Copo Quencher', cam: { desktop: 0.72, mobile: 0.8 },
    body: { w: 322, h: 190.7 }, art: { y: 6, h: 78 }, wrap: 322,
    name_: { on: true, y: 129, h: 24, maxW: 140, sx: 1.146 }, tintNames: ['Handle'],
  },
  pint: {
    file: 'pint.glb?v=7', name: 'Copo', cam: { desktop: 0.54, mobile: 0.66 },
    body: { w: 237.5, h: 138.5 }, art: { y: 6, h: 126 }, wrap: 237.5,
    name_: { on: false, y: 0, h: 0, maxW: 0, sx: 1 }, tintNames: [],
  },
};
export const MODEL = { id: 'cup' };
export const BODY_MM = { w: 0, h: 0 };
export const ART_ZONE = { y: 0, h: 0 };
export const NAME_ZONE = { on: true, y: 0, h: 0, maxW: 0, sx: 1 };
export const WRAP = { mm: 0 }; // volta onde a arte dá os 360° (mm)
export const EXPORT_ZONE = { w: 0, h: 0, nameY: 0 }; // arquivo do laser: arte da volta inteira + texto logo abaixo, em medidas reais
export function useModel(id) {
  const m = MODELS[id];
  MODEL.id = id;
  Object.assign(BODY_MM, m.body);
  Object.assign(ART_ZONE, m.art);
  Object.assign(NAME_ZONE, m.name_);
  WRAP.mm = m.wrap;
  Object.assign(EXPORT_ZONE, { w: Math.round(m.wrap), h: m.art.h + (m.name_.on ? 6 + m.name_.h : 0), nameY: m.art.h + 6 });
  return m;
}
useModel('cup');
export const LASER_DPI = 400;
export const LASER_PX_PER_MM = LASER_DPI / 25.4;

// largura do mapa de textura por tamanho de tela (a altura sai da proporção do corpo)
export const TEXTURE_W = { desktop: 2048, mobile: 1024 };
export const textureSize = (w) => [w, Math.round((w * BODY_MM.h) / BODY_MM.w)];

// aço inox escovado (cor do metal exposto onde a tinta saiu) e rugosidades
export const STEEL = [201, 205, 211];
export const ROUGH = { paint: 0.74, steel: 0.34 };

export const PAINTS = [
  { id: 'preto', name: 'Preto fosco', hex: '#0f1012' },
  { id: 'grafite', name: 'Grafite', hex: '#383b41' },
  { id: 'branco', name: 'Branco pérola', hex: '#e8e5de' },
  { id: 'marinho', name: 'Azul-marinho', hex: '#17284a' },
  { id: 'vinho', name: 'Vinho', hex: '#5b1523' },
  { id: 'floresta', name: 'Verde-floresta', hex: '#1d3b2c' },
  { id: 'terracota', name: 'Terracota', hex: '#a64a2e' },
];
export const DEFAULT_PAINT = PAINTS[0].hex;
