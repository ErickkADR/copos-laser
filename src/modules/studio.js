// Estúdio "Sua arte": arte (pronta ou enviada, com limiar e inverter), o texto da parte de baixo e o download do arquivo do laser.
// Enquanto o tema atual é o personalizado, cada mudança recompõe a gravação e aplica no copo na hora (sem giro).
// "Girar o copo" roda a coreografia. O arquivo nunca sai do navegador.
import { ARTS, CUSTOM_BASE } from '../config/arts.js';
import { DEFAULT_PAINT, EXPORT_ZONE, LASER_PX_PER_MM, LASER_DPI } from '../config/engrave.js';
import { uploadArt, readUpload, renderLaser } from './engrave.js';
import { withDpi } from './png-dpi.js';

const MAX_UPLOAD = 12 * 1024 * 1024;

export function initStudio({ switcher, cup, onSelectCustom }) {
  const panel = document.querySelector('[data-studio]');
  const form = panel.querySelector('[data-studio-form]');
  const fileInput = form.querySelector('[data-field-file]');
  const tools = form.querySelector('[data-upload-tools]');
  const hint = form.querySelector('[data-upload-hint]');
  const out = form.querySelector('[data-threshold-out]');
  const textInput = form.querySelector('[data-field-text]');
  const chipsBox = form.querySelector('[data-art-chips]');
  const dlBtn = form.querySelector('[data-download-laser]');
  const dlHint = form.querySelector('[data-download-hint]');
  const HINT_DEFAULT = 'SVG, PNG, JPG ou WebP. Fica no seu navegador, nada é enviado.';
  const state = { art: ARTS[0].id, text: ARTS[0].name, textEdited: false, up: null, upArt: null, threshold: 0.5, invert: false };
  let opener = null;
  let live = 0;

  textInput.value = state.text;
  chipsBox.innerHTML = `<select name="art" class="select" aria-label="Arte">${ARTS.map((a) => `<option value="${a.id}">${a.name}</option>`).join('')}<option value="upload" hidden>Arte enviada</option></select>`;
  const artSelect = chipsBox.querySelector('select');

  const isCustom = () => switcher.current?.id === 'custom';

  function theme() {
    const ready = ARTS.find((a) => a.id === state.art);
    return { ...CUSTOM_BASE, art: state.art === 'upload' ? state.upArt : ready.art, text: state.text, paint: DEFAULT_PAINT, custom: true };
  }

  function refresh() {
    if (!isCustom()) return;
    cancelAnimationFrame(live);
    live = requestAnimationFrame(() => cup.paintLive(theme()));
  }

  function rebuildUpload() { if (state.up) state.upArt = uploadArt(state.up, { threshold: state.threshold, invert: state.invert }); }

  form.addEventListener('input', (e) => {
    const t = e.target;
    if (t.name === 'text') { state.text = t.value; state.textEdited = true; }
    if (t.name === 'art') {
      state.art = t.value; tools.hidden = true;
      if (!state.textEdited) { state.text = ARTS.find((a) => a.id === t.value)?.name ?? ''; textInput.value = state.text; } // o texto acompanha o nome da arte até o visitante mexer nele
    }
    if (t.name === 'threshold') { state.threshold = t.value / 100; out.textContent = t.value; rebuildUpload(); }
    if (t.name === 'invert') { state.invert = t.checked; rebuildUpload(); }
    refresh();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD) { hint.textContent = 'Arquivo grande demais (máximo 12 MB).'; return; }
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type) && !/\.svg$/i.test(file.name)) { hint.textContent = 'Use SVG, PNG, JPG ou WebP.'; return; }
    try {
      state.up = await readUpload(file);
      rebuildUpload();
      state.art = 'upload';
      artSelect.value = 'upload';
      tools.hidden = false;
      hint.textContent = `${file.name}: preto vira inox. Ajuste o limiar; se a arte for clara, use Inverter.`;
      refresh();
    } catch {
      hint.textContent = 'Não consegui abrir esse arquivo. Tente outro.';
    }
  });

  form.querySelector('[data-clear-upload]').addEventListener('click', () => {
    state.up = state.upArt = null;
    fileInput.value = '';
    state.art = ARTS[0].id;
    artSelect.value = state.art;
    tools.hidden = true;
    hint.textContent = HINT_DEFAULT;
    refresh();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    switcher.go(theme());
    onSelectCustom?.();
  });

  dlBtn.addEventListener('click', async () => {
    const spec = isCustom() ? theme() : switcher.current;
    if (!spec?.art) { dlHint.textContent = 'Escolha uma arte antes de baixar.'; return; }
    dlBtn.disabled = true;
    dlHint.textContent = 'Preparando o arquivo…';
    try {
      const { blob, w, h } = await renderLaser(spec, { pxPerMm: LASER_PX_PER_MM, zone: EXPORT_ZONE });
      const file = await withDpi(blob, LASER_DPI);
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: `gravacao-${spec.id}-${EXPORT_ZONE.w}x${EXPORT_ZONE.h}mm-${LASER_DPI}dpi.png` });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      dlHint.textContent = `${w} × ${h} px, ${EXPORT_ZONE.w} × ${EXPORT_ZONE.h} mm a ${LASER_DPI} dpi. Preto = gravado.`;
    } catch {
      dlHint.textContent = 'Não consegui gerar o arquivo. Tente de novo.';
    } finally { dlBtn.disabled = false; }
  });

  function open(trigger) {
    opener = trigger ?? document.activeElement;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    document.body.classList.add('studio-open');
    if (!isCustom()) {
      // o estúdio abre já com a arte que estava no copo
      const cur = ARTS.find((a) => a.id === switcher.current?.id);
      if (cur && state.art !== 'upload') {
        state.art = cur.id;
        artSelect.value = cur.id;
      }
      if (!state.textEdited) { state.text = cur?.text ?? state.text; textInput.value = state.text; }
      switcher.go(theme());
      onSelectCustom?.();
    }
    setTimeout(() => textInput.focus({ preventScroll: true }), 50);
  }

  function close() {
    panel.classList.remove('is-open');
    document.body.classList.remove('studio-open');
    setTimeout(() => (panel.hidden = true), 280);
    opener?.focus?.({ preventScroll: true });
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open-studio]');
    if (t) open(t);
    if (e.target.closest('[data-close-studio]')) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });

  return { open, close, get state() { return state; } };
}
