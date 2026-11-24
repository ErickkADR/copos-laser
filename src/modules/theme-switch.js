// Troca de arte coreografada com GSAP:
//   fundo novo abre em círculo a partir do copo -> copo gira 720° com motion blur -> gravação troca no pico do giro
//   elementos implodem para dentro do copo -> trocam de modelo -> explodem para novas posições.
import { gsap } from 'gsap';
import { SETTINGS } from '../config/settings.js';

export function createThemeSwitcher({ cup, elements, ui, reducedMotion }) {
  let current = null;
  let running = null;
  let pending = null;

  function paintColors(theme) {
    const root = document.documentElement.style;
    root.setProperty('--bg', theme.bg);
    root.setProperty('--ink', theme.ink);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bg);
  }

  // primeira pintura: sem animação
  async function init(theme) {
    current = theme;
    paintColors(theme);
    ui.setTexts(theme);
    elements.setLayout(theme.id);
    await cup.first(theme);
  }

  async function run(theme) {
    // a gravação é composta na prancha de reserva ANTES do giro começar, para a troca no pico ser instantânea
    const prepared = await cup.prepare(theme);
    const sameElement = current?.element === theme.element;
    current = theme;

    if (reducedMotion) {
      paintColors(theme);
      ui.setTexts(theme);
      cup.swap(prepared);
      if (!sameElement) await elements.setModel(theme.element);
      return;
    }

    const { reveal } = ui;
    const dur = SETTINGS.spin.duration;
    const tl = gsap.timeline();

    // 1) fundo: círculo da cor nova nasce atrás do copo e cobre o herói
    gsap.set(reveal, { backgroundColor: theme.bg, clipPath: 'circle(0% at 50% 52%)', opacity: 1 });
    tl.to(reveal, { clipPath: 'circle(150% at 50% 52%)', duration: 0.95, ease: 'power3.inOut' }, 0);
    tl.call(() => paintColors(theme), null, 0.55);
    tl.set(reveal, { opacity: 0 }, 0.96);

    // 2) textos saem e voltam
    tl.to(ui.texts, { yPercent: -40, opacity: 0, duration: 0.3, ease: 'power2.in', stagger: 0.04 }, 0);
    tl.call(() => ui.setTexts(theme), null, 0.36);
    tl.fromTo(ui.texts, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.05 }, 0.4);

    // 3) giro de 720° com troca da gravação no pico (meio de um power2.inOut = velocidade máxima, blur máximo)
    tl.to(cup.state, { spin: `+=${SETTINGS.spin.degrees}`, duration: dur, ease: 'power2.inOut' }, 0);
    tl.call(() => cup.swap(prepared), null, dur / 2);
    tl.call(() => { cup.state.spin %= 360; }, null, dur + 0.01);

    // 4) elementos: implodem, trocam de modelo, explodem em posições novas
    const implode = gsap.to(elements.state, { implode: 1, duration: 0.55, ease: 'back.in(1.8)' });
    tl.add(implode, 0);
    await implode.then();
    if (!sameElement) await elements.setModel(theme.element);
    elements.setLayout(theme.id + (theme.custom ? Date.now() : ''));
    await gsap.to(elements.state, { implode: 0, duration: 1.1, ease: 'expo.out' }).then();
    await tl.then();
  }

  // pedidos que chegam no meio de uma troca ficam na fila (só o último vale)
  async function go(theme) {
    if (running) {
      pending = theme;
      return running;
    }
    running = run(theme);
    await running;
    running = null;
    if (pending) {
      const next = pending;
      pending = null;
      return go(next);
    }
  }

  return { init, go, paintColors, get current() { return current; }, set current(t) { current = t; } };
}
