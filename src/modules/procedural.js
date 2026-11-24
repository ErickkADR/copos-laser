// Artes de gravação desenhadas por código (zero byte de imagem). O contexto chega em milímetros, com a origem no canto superior
// esquerdo da faixa da arte (283 x 126 mm); desenha-se em preto sobre transparente: o alfa é a máscara da gravação.
// A faixa tem a largura das artes prontas (283 mm); as pontas se encontram nas costas, então tudo que passa de uma borda reaparece na outra (wrap).
import { ART_ZONE, ART_W } from '../config/engrave.js';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = ART_W;
const H = ART_ZONE.h;

function roseta(ctx, cx, cy, R) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.94, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 32; i++) { // pontos do aro
    const a = (i / 32) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.88, Math.sin(a) * R * 0.88, 1.1, 0, Math.PI * 2); ctx.fill();
  }
  // pétalas externas cheias, com um miolo vazado (destination-out apaga o que já foi gravado)
  const petal = (a, r0, r1, wd) => {
    ctx.save(); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(r0, 0); ctx.quadraticCurveTo((r0 + r1) / 2, wd, r1, 0); ctx.quadraticCurveTo((r0 + r1) / 2, -wd, r0, 0); ctx.fill();
    ctx.restore();
  };
  for (let i = 0; i < 16; i++) petal((i / 16) * Math.PI * 2, R * 0.5, R * 0.82, R * 0.11);
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 16; i++) petal((i / 16) * Math.PI * 2, R * 0.6, R * 0.76, R * 0.05);
  ctx.globalCompositeOperation = 'source-over';
  // estrela {8/3} e círculos concêntricos
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    const a = ((i * 3) / 8) * Math.PI * 2;
    ctx.lineTo(Math.cos(a) * R * 0.46, Math.sin(a) * R * 0.46);
  }
  ctx.stroke();
  for (const f of [0.46, 0.3]) { ctx.beginPath(); ctx.arc(0, 0, R * f, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(0, 0, R * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function mandala(ctx) {
  // três rosetas igualmente espaçadas na volta (0°, 120°, 240°): a do meio fica de frente
  const R = 49;
  for (const k of [-1, 0, 1]) roseta(ctx, W / 2 + k * (W / 3), H / 2, R);
  // losangos entre as rosetas e frisos de pontos em cima e embaixo (período fecha a volta)
  ctx.fillStyle = '#000';
  for (const k of [-0.5, 0.5, -1.5, 1.5]) {
    const x = W / 2 + k * (W / 3);
    ctx.beginPath(); ctx.moveTo(x, H / 2 - 9); ctx.lineTo(x + 5, H / 2); ctx.lineTo(x, H / 2 + 9); ctx.lineTo(x - 5, H / 2); ctx.fill();
  }
  const n = 56;
  for (let i = 0; i < n; i++) {
    const x = ((i + 0.5) / n) * W;
    ctx.beginPath(); ctx.arc(x, 3, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, H - 3, 1.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillRect(0, 7, W, 0.6);
  ctx.fillRect(0, H - 7.6, W, 0.6);
}

function brilho(ctx, x, y, r) { // estrela de 4 pontas
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(a + Math.PI / 4) * r * 0.2, y + Math.sin(a + Math.PI / 4) * r * 0.2);
  }
  ctx.fill();
}

function constelacao(ctx) {
  ctx.fillStyle = ctx.strokeStyle = '#000';
  // lua crescente de frente
  ctx.beginPath(); ctx.arc(W / 2, H * 0.46, 27, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(W / 2 + 11, H * 0.46 - 7, 23, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // estrelas: posição sorteada com semente fixa; as que passam da borda reaparecem do outro lado
  const r = rng(2026);
  const pts = [];
  for (let i = 0; i < 46; i++) {
    const x = r() * W, y = 5 + r() * (H - 10);
    if (Math.hypot(x - W / 2, (y - H * 0.46) * 0.8) < 33) continue;
    pts.push({ x, y, s: 0.8 + r() * 2.4, big: r() > 0.72 });
  }
  const wrap = (fn) => { fn(0); fn(W); fn(-W); };
  ctx.lineWidth = 0.5;
  // linhas de constelação ligando vizinhas por perto
  pts.sort((a, b) => a.x - b.x);
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i], b = pts[i + 1];
    if (i % 5 === 4 || Math.hypot(a.x - b.x, a.y - b.y) > 34) continue;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (const p of pts) wrap((dx) => (p.big ? brilho(ctx, p.x + dx, p.y, 4 + p.s * 2.4) : (ctx.beginPath(), ctx.arc(p.x + dx, p.y, p.s * 0.8, 0, Math.PI * 2), ctx.fill())));
  // brilhos grandes ao lado da lua
  brilho(ctx, W / 2 + 40, H * 0.3, 7);
  brilho(ctx, W / 2 - 42, H * 0.72, 5.5);
}

export const PROCEDURAL = { mandala, constelacao };
