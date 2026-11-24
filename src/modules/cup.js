// O copo herói: inclina em direção ao cursor, gira na troca de arte e recebe a gravação gerada no canvas.
// Duas "pranchas" de texturas (A/B): a arte nova é composta na prancha de reserva ANTES do giro e entra no pico dele (troca de 3 slots).
import { SETTINGS } from '../config/settings.js';
import { pointer, idleSway } from './pointer.js';
import { createEngraver, loadImage } from './engrave.js';

export function createCup(el, { src, textureWidth, reducedMotion }) {
  const state = { yaw: 0, pitch: 0, roll: 0, spin: 0 };
  const blurNode = document.querySelector('[data-spin-blur]');
  const engraver = createEngraver(textureWidth);
  let body = null, handle = null;
  let sets = null;
  let active = 0;
  let lastOrientation = '';
  let lastSpin = 0;
  let blur = 0;

  const loaded = new Promise((resolve) => el.addEventListener('load', resolve, { once: true }));
  el.src = src;
  loaded.then(() => {
    const mats = el.model.materials;
    body = mats.find((m) => m.name === 'Body');
    handle = mats.find((m) => m.name === 'Handle');
    // os mapas vêm do canvas: os fatores do glTF multiplicam o mapa (metal 1 x B, rugosidade 1 x G)
    body.pbrMetallicRoughness.setMetallicFactor(1);
    body.pbrMetallicRoughness.setRoughnessFactor(1);
    body.pbrMetallicRoughness.setBaseColorFactor([1, 1, 1, 1]);
    sets = [makeSet(), makeSet()];
  });

  function makeSet() {
    const tex = { base: el.createCanvasTexture(), mr: el.createCanvasTexture(), normal: el.createCanvasTexture() };
    const cv = (t, w, h) => { const c = t.source.element; c.width = w; c.height = h; return c; };
    return { tex, base: cv(tex.base, engraver.W, engraver.H), mr: cv(tex.mr, engraver.W, engraver.H), normal: cv(tex.normal, engraver.hw, engraver.hh) };
  }

  const refresh = (set) => { set.tex.base.source.update(); set.tex.mr.source.update(); set.tex.normal.source.update(); };

  function bind(set) {
    body.pbrMetallicRoughness.baseColorTexture.setTexture(set.tex.base);
    body.pbrMetallicRoughness.metallicRoughnessTexture.setTexture(set.tex.mr);
    body.normalTexture.setTexture(set.tex.normal);
    body.setNormalScale?.(1);
  }

  // garante que as imagens da arte pronta estão decodificadas antes de compor
  async function ready(spec) {
    if (spec.art?.kind === 'mask' && !spec.art.img) spec.art.img = await loadImage(spec.art.url);
  }

  // Compõe a gravação na prancha de reserva (arte nova, antes do giro). Devolve a prancha.
  async function prepare(spec) {
    await loaded;
    await ready(spec);
    const set = sets[1 - active];
    engraver.compose(spec, set);
    refresh(set);
    return { set, paint: spec.paint };
  }

  // Entra no pico do giro: troca os 3 slots para a prancha preparada.
  function swap(prepared) {
    bind(prepared.set);
    active = 1 - active;
    handle?.pbrMetallicRoughness.setBaseColorFactor(prepared.paint);
  }

  // Edição ao vivo (estúdio): recompõe na prancha que já está no copo, sem giro.
  async function paintLive(spec) {
    await loaded;
    await ready(spec);
    const set = sets[active];
    engraver.compose(spec, set);
    refresh(set);
    handle?.pbrMetallicRoughness.setBaseColorFactor(spec.paint);
  }

  // primeira pintura (sem giro): compõe na prancha ativa e liga os slots
  async function first(spec) {
    await loaded;
    await ready(spec);
    engraver.compose(spec, sets[active]);
    refresh(sets[active]);
    bind(sets[active]);
    handle?.pbrMetallicRoughness.setBaseColorFactor(spec.paint);
  }

  function tick(dt, now) {
    const src = pointer.active ? pointer : idleSway(now);
    const k = 1 - Math.pow(1 - SETTINGS.tilt.ease, dt * 60);
    state.yaw += (src.nx * SETTINGS.tilt.yaw - state.yaw) * k;
    state.pitch += (src.ny * SETTINGS.tilt.pitch - state.pitch) * k;
    state.roll += (-src.nx * SETTINGS.tilt.roll - state.roll) * k;

    const o = `${state.roll.toFixed(2)}deg ${state.pitch.toFixed(2)}deg ${(state.yaw + state.spin).toFixed(2)}deg`;
    if (o !== lastOrientation) {
      el.orientation = o;
      lastOrientation = o;
    }

    // motion blur proporcional à velocidade angular do giro
    const speed = Math.abs(state.spin - lastSpin) / Math.max(dt, 0.001); // graus por segundo
    lastSpin = state.spin;
    const target = reducedMotion ? 0 : Math.min(16, speed / 110);
    blur += (target - blur) * 0.5;
    if (blur > 0.25) {
      blurNode.setAttribute('stdDeviation', `${blur.toFixed(1)} 0`);
      if (!el.classList.contains('is-spinning')) el.classList.add('is-spinning');
    } else if (el.classList.contains('is-spinning')) {
      el.classList.remove('is-spinning');
      blurNode.setAttribute('stdDeviation', '0 0');
    }
  }

  return { el, state, loaded, tick, prepare, swap, paintLive, first, engraver };
}
