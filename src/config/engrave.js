// Geometria física da gravação, em milímetros. O copo é o modelo real (SketchUp -> GLB, scripts/convert-dae.mjs): corpo de 284 mm
// de altura com a parte de baixo mais estreita (raio 45 a 50 mm) e a de cima larga (raio 65 mm). O mapa de textura é a planificação do
// corpo inteiro: a largura é UMA volta na parte de baixo (circunferência de referência, ~298 mm), igual para todas as alturas.
export const BODY_MM = { w: 298, h: 284 }; // referência 2π·47,5 mm; altura do corpo
export const ART_ZONE = { y: 155, h: 126 }; // faixa da arte, contada do TOPO do corpo: de 3 a 129 mm acima da base (a parte estreita)
export const ART_W = 283; // largura das artes prontas: quase a volta toda da parte estreita
// nome na parte larga (raio 65 mm = 408 mm de volta): o mapa esticaria o texto em 408/298, então ele é desenhado comprimido por NAME_SX
export const NAME_ZONE = { y: 66, h: 28, maxW: 230, sx: 298 / (2 * Math.PI * 65) };
// arquivo do laser: a arte (283 x 126) e o nome (283 x 28), empilhados com 6 mm entre eles. Medidas reais, sem a compensação do mapa.
export const EXPORT_ZONE = { w: ART_W, h: ART_ZONE.h + 6 + NAME_ZONE.h, nameY: ART_ZONE.h + 6 };
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
