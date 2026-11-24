// Faíscas de laser piscando atrás do copo, num canvas 2D. A faísca é desenhada uma vez num sprite e depois só copiada (drawImage).
export function createSparks(canvas, { count }) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let W = 0, H = 0;
  const sparks = [];

  const sprite = document.createElement('canvas');
  const S = 64;
  sprite.width = sprite.height = S;
  const s = sprite.getContext('2d');
  const glow = s.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  glow.addColorStop(0, 'rgba(255,255,255,0.55)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  s.fillStyle = glow; s.fillRect(0, 0, S, S);
  s.fillStyle = '#fff';
  s.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    s.lineTo(S / 2 + Math.cos(a) * S * 0.48, S / 2 + Math.sin(a) * S * 0.48);
    s.lineTo(S / 2 + Math.cos(a + Math.PI / 4) * S * 0.08, S / 2 + Math.sin(a + Math.PI / 4) * S * 0.08);
  }
  s.fill();

  const spawn = (p, initial) => {
    p.x = Math.random() * W;
    p.y = initial ? Math.random() * H : H + 20;
    p.r = 5 + Math.random() * 12;
    p.v = 10 + Math.random() * 28;
    p.ph = Math.random() * Math.PI * 2;
    p.f = 0.0012 + Math.random() * 0.002;
    return p;
  };

  function resize(w, h) {
    W = w; H = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sparks.length = 0;
    for (let i = 0; i < count; i++) sparks.push(spawn({}, true));
  }

  function tick(dt, now) {
    ctx.clearRect(0, 0, W, H);
    for (const p of sparks) {
      p.y -= p.v * dt;
      if (p.y < -20) spawn(p, false);
      const t = 0.5 + 0.5 * Math.sin(now * p.f + p.ph); // pisca
      const r = p.r * (0.35 + 0.65 * t);
      ctx.globalAlpha = 0.25 + 0.7 * t;
      ctx.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2);
    }
  }

  return { resize, tick };
}
