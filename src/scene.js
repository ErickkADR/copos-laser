// Tudo que é 3D e animação. Carregado sob demanda pelo main.js, depois da primeira pintura.
// Ordem de carregamento: copo (com a gravação já aplicada) -> elementos um a um -> modelos e artes das outras opções no ocioso.
self.ModelViewerElement = { ...(self.ModelViewerElement || {}), meshoptDecoderLocation: '/decoders/meshopt-ready.js' };
await import('@google/model-viewer');

import { ARTS } from './config/arts.js';
import { SETTINGS, MODELS_BASE, ENV_FAST, ENV_STUDIO, deviceClass, prefersReducedMotion } from './config/settings.js';
import { patchModelViewer } from './modules/mv-patch.js';
import { addTick, startLoop, pause, resume } from './modules/loop.js';
import { initPointer, pointer } from './modules/pointer.js';
import { fontsReady, loadImage } from './modules/engrave.js';
import { createCup } from './modules/cup.js';
import { createElements } from './modules/elements.js';
import { createThemeSwitcher } from './modules/theme-switch.js';
import { createSparks } from './modules/sparks.js';
import { initStudio } from './modules/studio.js';

const idle = (fn, timeout = 1500) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 200));

export async function startScene({ ui, initial }) {
  patchModelViewer();
  initPointer();
  const device = deviceClass();
  const reducedMotion = prefersReducedMotion();
  const hero = document.querySelector('[data-hero]');
  const shot = document.body.classList.toggle('is-shot', new URLSearchParams(location.search).has('shot'));
  if (shot) Object.assign(pointer, { active: true, nx: 0.12, ny: -0.1, x: -9999, y: -9999 });

  const cupEl = document.querySelector('[data-cup]');
  cupEl.setAttribute('environment-image', ENV_FAST);
  const cup = createCup(cupEl, {
    src: `${MODELS_BASE}cup.glb`,
    textureWidth: device === 'mobile' ? SETTINGS.texture.mobile : SETTINGS.texture.desktop,
    reducedMotion,
  });
  const elements = createElements(document.querySelector('[data-floats]'), {
    count: SETTINGS.elements[device],
    size: SETTINGS.elementSize[device],
    base: MODELS_BASE,
    mobile: device === 'mobile',
  });
  const sparks = createSparks(document.querySelector('[data-sparks]'), { count: reducedMotion ? 0 : SETTINGS.sparks[device === 'desktop' ? 'desktop' : 'mobile'] });
  const switcher = createThemeSwitcher({ cup, elements, ui, reducedMotion });
  const studio = initStudio({ switcher, cup, onSelectCustom: () => ui.setActive('custom') });

  // ---- medidas: lidas só quando o tamanho muda (ResizeObserver) ou no scroll, nunca no loop ----
  const box = { width: 0, height: 0, left: 0, docTop: 0 };
  const originY = () => (device === 'mobile' || window.innerWidth <= 860 ? 0.58 : 0.52);
  const push = () => elements.measure({ ...box, top: box.docTop - window.scrollY, originY: originY() });
  new ResizeObserver(() => {
    const r = hero.getBoundingClientRect();
    Object.assign(box, { width: r.width, height: r.height, left: r.left, docTop: r.top + window.scrollY });
    sparks.resize(r.width, r.height);
    push();
  }).observe(hero);
  window.addEventListener('scroll', push, { passive: true });

  // herói fora da tela = loop parado (nada de renderizar 3D que ninguém vê)
  new IntersectionObserver(([e]) => (e.isIntersecting ? resume('offscreen') : pause('offscreen'))).observe(hero);

  addTick((dt, now) => {
    sparks.tick(dt, now);
    cup.tick(dt, now);
    elements.tick(dt, now);
  });

  const byId = (id) => ARTS.find((t) => t.id === id) ?? ARTS[0];
  const first = byId(initial);
  ui.setActive(first.id);

  await fontsReady();
  await switcher.init(first);
  cup.el.dismissPoster();
  startLoop();

  // carregamento escalonado: elementos um por vez, depois o resto no ocioso
  idle(async () => {
    await elements.loadStaggered(first.element, shot ? 0 : SETTINGS.stagger);
    // upgrade do ambiente: reflexos de estúdio no inox, depois que a página já está interativa
    setTimeout(() => { cupEl.setAttribute('environment-image', ENV_STUDIO); elements.setEnvironment(ENV_STUDIO); }, shot ? 0 : 2500);
    idle(() => {
      const others = [...new Set(ARTS.map((t) => t.element).concat('spark'))].filter((m) => m !== first.element);
      for (const m of others) fetch(`${MODELS_BASE}${m}.glb`, { priority: 'low' }).catch(() => {});
      ARTS.filter((t) => t !== first && t.art.kind === 'mask').forEach((t, i) => setTimeout(() => loadImage(t.art.url).then((img) => (t.art.img = img)).catch(() => {}), 400 * (i + 1)));
    });
  });

  return {
    handle(action) {
      if (action.type === 'theme') switcher.go(byId(action.id));
      if (action.type === 'studio') studio.open(action.trigger);
    },
  };
}
