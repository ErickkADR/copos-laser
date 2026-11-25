// Geometria física da gravação, em milímetros. O copo é o modelo real (SketchUp -> GLB, scripts/convert-dae.mjs): corpo de 284 mm
// de altura com a parte de baixo mais estreita (raio 45 a 50 mm) e a de cima larga (raio 65 mm). O mapa de textura é a planificação do
// corpo inteiro: a largura é UMA volta na parte de baixo (circunferência de referência, ~298 mm), igual para todas as alturas.
export const BODY_MM = { w: 298, h: 284 }; // referência 2π·47,5 mm; altura do corpo
// Arte na parte LARGA de cima (raio 65 mm = 408 mm de volta, ~154 mm de altura útil); texto na parte ESTREITA de baixo (volta ~298 mm).
// Medidas contadas do TOPO do corpo. A arte ocupa a volta INTEIRA (360°).
export const ART_ZONE = { y: 12, h: 154 }; // altura útil da parte larga
export const WRAP_MM = 2 * Math.PI * 65; // volta da parte larga (408 mm): a arte dá a volta INTEIRA (360°), sem lacuna
// O mapa tem uma largura só (298 mm): na parte larga a volta toda cabe nele, então a arte ocupa o mapa inteiro (sem compressão).
export const NAME_ZONE = { y: 215, h: 28, maxW: 230, sx: 1 }; // texto na parte estreita
// arquivo do laser: arte desenhada para a volta toda (408 x 154 mm) e o texto logo abaixo. Medidas reais.
export const EXPORT_ZONE = { w: Math.round(WRAP_MM), h: ART_ZONE.h + 6 + NAME_ZONE.h, nameY: ART_ZONE.h + 6 };
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
