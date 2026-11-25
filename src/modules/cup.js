// O copo herói: inclina em direção ao cursor, gira na troca de arte e recebe a gravação gerada no canvas.
// Duas "pranchas" de texturas (A/B): a arte nova é composta na prancha de reserva ANTES do giro e entra no pico dele (troca de 3 slots).
import { SETTINGS } from '../config/settings.js';
import { pointer, idleSway } from './pointer.js';
import { createEngraver, loadImage } from './engrave.js';
import { MODELS, useModel } from '../config/engrave.js';
import { MODELS_BASE } from '../config/settings.js';

export function createCup(el, { initialModel = 'pint', textureWidth, reducedMotion }) {
  const state = { yaw: 0, pitch: 0, roll: 0, spin: 0, drag: 0 }; // drag = giro livre do visitante na HORIZONTAL (graus, sem limite: 360° e mais). Sem inclinação vertical: o visitante não vê a parte de cima.
  let dragging = false;
  let vel = 0; // inércia do giro (graus por segundo)
  const blurNode = document.querySelector('[data-spin-blur]');
  let engraver = null;
  let body = null;
  let tinted = []; // peças que levam a cor da pintura (alça do copo térmico)
  let sets = null;
  let active = 0;
  let lastOrientation = '';
  let lastSpin = 0;
  let blur = 0;
  let loaded = null;
  let modelId = null;

  // Carrega um modelo (cup | pint): liga os materiais, recria o motor de gravação (cada modelo tem a sua geometria) e as pranchas de textura.
  function loadModel(id) {
    modelId = id;
    const cfg = useModel(id);
    el.dataset.model = id;
    loaded = new Promise((resolve) => el.addEventListener('load', resolve, { once: true })).then(() => {
      const mats = el.model.materials;
      body = mats.find((m) => m.name === 'Body');
      tinted = mats.filter((m) => cfg.tintNames.includes(m.name));
      // tampa e aço: inox escovado, não pintados
      for (const m of mats.filter((m) => m.name === 'Lid' || m.name === 'Steel')) { m.pbrMetallicRoughness.setBaseColorFactor([0.78, 0.8, 0.83, 1]); m.pbrMetallicRoughness.setMetallicFactor(1); m.pbrMetallicRoughness.setRoughnessFactor(0.3); }
      // os mapas vêm do canvas: os fatores do glTF multiplicam o mapa (metal 1 x B, rugosidade 1 x G)
      body.pbrMetallicRoughness.setMetallicFactor(1);
      body.pbrMetallicRoughness.setRoughnessFactor(1);
      body.pbrMetallicRoughness.setBaseColorFactor([1, 1, 1, 1]);
      engraver = createEngraver(textureWidth);
      sets = [makeSet(), makeSet()];
      active = 0;
    });
    el.setAttribute('camera-orbit', `0deg 84deg ${window.innerWidth <= 860 ? cfg.cam.mobile : cfg.cam.desktop}m`);
    el.src = `${MODELS_BASE}${cfg.file}`;
    return loaded;
  }
  loadModel(initialModel);

  // Troca de modelo (copo térmico <-> caneca): carrega o outro .glb e repinta a arte atual no novo corpo.
  async function switchModel(id, spec) {
    if (id === modelId) return;
    await loadModel(id);
    await first(spec);
    el.dismissPoster?.();
  }

  function makeSet() {
    const tex = { base: el.createCanvasTexture(), mr: el.createCanvasTexture(), normal: el.createCanvasTexture() };
    const cv = (t, w, h) => { const c = t.source.element; c.width = w; c.height = h; return c; };
    return { tex, base: cv(tex.base, engraver.W, engraver.H), mr: cv(tex.mr, engraver.W, engraver.H), normal: cv(tex.normal, engraver.hw, engraver.hh) };
  }

  const paintParts = (hex) => { for (const m of tinted) m.pbrMetallicRoughness.setBaseColorFactor(hex); };
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
    paintParts(prepared.paint);
  }

  // Edição ao vivo (estúdio): recompõe na prancha que já está no copo, sem giro.
  async function paintLive(spec) {
    await loaded;
    await ready(spec);
    const set = sets[active];
    engraver.compose(spec, set);
    refresh(set);
    paintParts(spec.paint);
  }

  // primeira pintura (sem giro): compõe na prancha ativa e liga os slots
  async function first(spec) {
    await loaded;
    await ready(spec);
    engraver.compose(spec, sets[active]);
    refresh(sets[active]);
    bind(sets[active]);
    paintParts(spec.paint);
  }

  // Arrastar em qualquer ponto livre do herói gira o copo 360° (e mais), com inércia.
  function enableDrag(zone) {
    let lastX = 0, lastT = 0;
    zone.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, a, input, label, .studio, .picker, .site-header')) return;
      dragging = true; lastX = e.clientX; lastT = performance.now(); vel = 0;
      zone.setPointerCapture(e.pointerId);
      zone.classList.add('is-grabbing');
    });
    zone.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const now = performance.now();
      const d = (e.clientX - lastX) * 0.45;
      state.drag += d;
      vel = 0.7 * vel + 0.3 * (d / (Math.max(1, now - lastT) / 1000));
      lastX = e.clientX; lastT = now;
    });
    const up = () => { dragging = false; zone.classList.remove('is-grabbing'); vel = Math.max(-1600, Math.min(1600, vel)); };
    zone.addEventListener('pointerup', up);
    zone.addEventListener('pointercancel', up);
  }

  function tick(dt, now) {
    if (!dragging && vel) { state.drag += vel * dt; vel *= Math.pow(0.03, dt); if (Math.abs(vel) < 2) vel = 0; }
    const src = pointer.active ? pointer : idleSway(now);
    const k = 1 - Math.pow(1 - SETTINGS.tilt.ease, dt * 60);
    state.yaw += (src.nx * SETTINGS.tilt.yaw - state.yaw) * k;
    state.pitch += (src.ny * SETTINGS.tilt.pitch - state.pitch) * k;
    state.roll += (-src.nx * SETTINGS.tilt.roll - state.roll) * k;

    const o = `${state.roll.toFixed(2)}deg ${state.pitch.toFixed(2)}deg ${(state.yaw + state.spin + state.drag).toFixed(2)}deg`;
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

  return { el, state, get loaded() { return loaded; }, get modelId() { return modelId; }, switchModel, tick, enableDrag, prepare, swap, paintLive, first };
}
