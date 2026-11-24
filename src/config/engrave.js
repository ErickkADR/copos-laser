// Geometria física da gravação. Tudo em milímetros: o mapa de textura do corpo do copo é a "planificação" do corpo
// (circunferência média x altura), então 1 mm da arte = o mesmo tanto de pixels em qualquer lugar do mapa.
export const BODY_MM = { w: 283, h: 220 }; // circunferência média (2π·44,5) e altura do corpo cônico
export const ART_ZONE = { y: 34, h: 126 }; // faixa da arte, de ponta a ponta da volta (283 x 126 mm: o tamanho das artes prontas)
export const NAME_ZONE = { y: 168, h: 28, maxW: 230 }; // faixa do nome, logo abaixo da arte
export const EXPORT_ZONE = { y: ART_ZONE.y, w: BODY_MM.w, h: NAME_ZONE.y + NAME_ZONE.h - ART_ZONE.y }; // 283 x 162 mm: o que vai para a fibra
export const LASER_DPI = 400;
export const LASER_PX_PER_MM = LASER_DPI / 25.4;

// largura do mapa de textura por tamanho de tela (a altura sai da proporção do corpo)
export const TEXTURE_W = { desktop: 2048, mobile: 2048 };
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
