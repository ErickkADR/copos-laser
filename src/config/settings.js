// Números que ajustam o comportamento. Tudo que é "quanto" mora aqui; os módulos só têm o "como".
import { TEXTURE_W } from './engrave.js';

export const MODELS_BASE = '/models/';
// O ambiente de estúdio (reflexos do inox) custa caro de gerar (PMREM): o model-viewer nasce com 'neutral' e troca depois do carregamento.
export const ENV_FAST = '/img/studio-env.jpg';
export const ENV_STUDIO = '/img/studio-env.jpg';

export const BREAKPOINTS = { mobile: 640, tablet: 1024 };

export const SETTINGS = {
  // quantos elementos 3D flutuam em volta do copo, por tamanho de tela
  elements: { desktop: 9, tablet: 9, mobile: 9 },
  // tamanho máximo (px) do <model-viewer> de cada elemento; a profundidade escala para baixo
  elementSize: { desktop: 170, tablet: 170, mobile: 170 },
  // inclinação do copo em direção ao cursor (graus) e suavização (0..1 por frame a 60 fps)
  tilt: { yaw: 30, pitch: 12, roll: 6, ease: 0.085 },
  // parallax de profundidade: px de deslocamento por unidade de profundidade
  parallax: 46,
  // campo de repulsão em volta do ponteiro
  repel: { radius: 230, strength: 120, ease: 0.14 },
  // troca de arte
  spin: { degrees: 720, duration: 1.5 },
  // carregamento escalonado dos elementos (ms entre um e outro, depois que o copo carregou)
  stagger: 0,
  // largura do mapa de textura da gravação
  texture: TEXTURE_W,
  // faíscas (canvas 2D)
  sparks: { desktop: 26, mobile: 26 },
};

export function deviceClass(width = window.innerWidth) {
  if (width <= BREAKPOINTS.mobile) return 'mobile';
  if (width <= BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
