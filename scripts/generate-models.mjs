// Gera os modelos 3D do projeto de forma procedural (three.js para a geometria, gltf-transform para escrever o .glb).
// Saída CRUA, no padrão "exportei do Blender e joguei na pasta": malha muito densa, texturas PNG 2K com ruído, nada comprimido.
// É o ponto de partida que o scripts/optimize-models.mjs transforma no que vai para produção.
//
//   node scripts/generate-models.mjs            -> assets-src/models-raw/*.glb
//
// O copo é um "quencher" genérico (corpo cônico, base estreita, alça lateral, tampa com canudo dobrado). Marca fictícia: nada de
// modelo ou logotipo de terceiros. Medidas em metros; 1 px do mapa de textura do corpo = 283 mm / 2048 (ver config/engrave.js).
import * as THREE from 'three';
import { Document, NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { statSync } from 'node:fs';

const OUT = new URL('../assets-src/models-raw/', import.meta.url);
const SEG = 256; // densidade de "export padrão": muito acima do necessário

// ---------- helpers ----------
function addPrimitive(doc, mesh, geometry, material) {
  const buffer = doc.getRoot().listBuffers()[0];
  const g = geometry;
  g.computeVertexNormals?.();
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const uv = g.getAttribute('uv');
  const prim = doc.createPrimitive().setMaterial(material);
  prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos.array)).setBuffer(buffer));
  if (nor) prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor.array)).setBuffer(buffer));
  if (uv) {
    // three usa v para cima; glTF usa v para baixo
    const a = new Float32Array(uv.array);
    for (let i = 1; i < a.length; i += 2) a[i] = 1 - a[i];
    prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(a).setBuffer(buffer));
  }
  if (g.index) prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(g.index.array)).setBuffer(buffer));
  mesh.addPrimitive(prim);
  return prim;
}

function newDoc(name) {
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene(name);
  doc.getRoot().setDefaultScene(scene);
  const mesh = doc.createMesh(name);
  scene.addChild(doc.createNode(name).setMesh(mesh));
  return { doc, mesh };
}

function mat(doc, name, hex, { metal = 0, rough = 0.5, double = false } = {}) {
  const c = new THREE.Color(hex); // sRGB -> linear
  return doc.createMaterial(name).setBaseColorFactor([c.r, c.g, c.b, 1]).setMetallicFactor(metal).setRoughnessFactor(rough).setDoubleSided(double);
}

const xform = (geo, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1 } = {}) => {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));
  return geo.applyMatrix4(m);
};
const v2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));
const texture = (doc, name, buf) => doc.createTexture(name).setImage(buf).setMimeType('image/png');

// ruído "de textura exportada": PNG pesado de propósito (é o que um arquivo cru de Blender costuma trazer)
async function noisePng(w, h, mean, sigma, channels = 3) {
  return sharp({ create: { width: w, height: h, channels, background: { r: mean, g: mean, b: mean }, noise: { type: 'gaussian', mean, sigma } } }).png().toBuffer();
}

// ---------- copo ----------
// Corpo cônico: raio 52,5 mm em cima, 36,5 mm embaixo, 220 mm de altura. Circunferência média = 2π·44,5 mm = 279,6 mm (a arte tem 283 mm).
const BODY = { rTop: 0.0525, rBottom: 0.0365, h: 0.22, y0: 0.01 };

async function buildCup() {
  const { doc, mesh } = newDoc('cup');
  // textura embutida de exemplo: preto fosco + gravação prateada, 2048x1600 com ruído de grão
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1600"><rect width="2048" height="1600" fill="#101113"/>
    <text x="1024" y="750" font-family="Helvetica, Arial" font-weight="900" font-size="210" text-anchor="middle" fill="#c9ccd2">GRAVURA</text>
    <text x="1024" y="900" font-family="Helvetica, Arial" font-size="65" text-anchor="middle" fill="#c9ccd2">gravado a laser · inox 18/8</text></svg>`;
  const grain = await noisePng(2048, 1600, 128, 10);
  const baseTex = await sharp(Buffer.from(svg)).composite([{ input: grain, blend: 'soft-light' }]).png({ compressionLevel: 6 }).toBuffer();
  const mrTex = await noisePng(1024, 1024, 150, 30);
  const body = mat(doc, 'Body', '#ffffff', { metal: 1, rough: 1 })
    .setBaseColorTexture(texture(doc, 'engraved', baseTex))
    .setMetallicRoughnessTexture(texture(doc, 'engraved-mr', mrTex));

  // corpo: thetaStart = PI põe u = 0.5 de frente para a câmera (+Z). v corre do topo (0) à base (1).
  const bodyGeo = new THREE.CylinderGeometry(BODY.rTop, BODY.rBottom, BODY.h, SEG, 32, true, Math.PI, Math.PI * 2);
  addPrimitive(doc, mesh, xform(bodyGeo, { y: BODY.y0 + BODY.h / 2 }), body);

  // base de inox (visível embaixo, como nos copos de verdade). A costura do torno nasce em +Z: gira 180° para as costas.
  const steel = mat(doc, 'Steel', '#b9bfc7', { metal: 1, rough: 1, double: true }).setMetallicRoughnessTexture(texture(doc, 'brushed', await noisePng(1024, 1024, 100, 30)));
  const bottom = new THREE.LatheGeometry(v2([[0, 0.004], [0.022, 0.0025], [0.0295, 0.0008], [0.0325, 0.0], [0.0350, 0.0035], [0.0362, 0.0075], [0.0365, 0.010]]), SEG);
  addPrimitive(doc, mesh, xform(bottom, { ry: Math.PI }), steel);

  // tampa (plástico grafite fosco)
  const lid = mat(doc, 'Lid', '#1c1e22', { metal: 0, rough: 0.5 });
  const lidGeo = new THREE.LatheGeometry(v2([[0.0515, 0.226], [0.0545, 0.230], [0.0558, 0.2345], [0.0558, 0.2410], [0.0550, 0.2440], [0.0530, 0.2458], [0.0500, 0.2462], [0.0478, 0.2448], [0.0470, 0.2440], [0, 0.2440]]), SEG);
  addPrimitive(doc, mesh, xform(lidGeo, { ry: Math.PI }), lid);
  // colar do canudo
  const collar = new THREE.LatheGeometry(v2([[0.0108, 0.2440], [0.0108, 0.2492], [0.0100, 0.2516], [0.0078, 0.2524], [0.0072, 0.2510], [0.0072, 0.2440]]), SEG);
  addPrimitive(doc, mesh, xform(collar, { x: -0.014, ry: Math.PI }), lid);
  // aba de beber (retângulo arredondado em relevo)
  const flap = new THREE.Shape();
  const fw = 0.013, fh = 0.0085, fr = 0.0055;
  flap.moveTo(-fw + fr, -fh); flap.lineTo(fw - fr, -fh); flap.quadraticCurveTo(fw, -fh, fw, -fh + fr); flap.lineTo(fw, fh - fr);
  flap.quadraticCurveTo(fw, fh, fw - fr, fh); flap.lineTo(-fw + fr, fh); flap.quadraticCurveTo(-fw, fh, -fw, fh - fr); flap.lineTo(-fw, -fh + fr); flap.quadraticCurveTo(-fw, -fh, -fw + fr, -fh);
  const flapGeo = new THREE.ExtrudeGeometry(flap, { depth: 0.0028, bevelEnabled: true, bevelThickness: 0.0009, bevelSize: 0.0009, bevelSegments: 4, curveSegments: 48 });
  addPrimitive(doc, mesh, xform(flapGeo, { rx: -Math.PI / 2, x: 0.026, y: 0.2440, z: 0.0 }), steel);

  // canudo dobrado
  const straw = mat(doc, 'Straw', '#eef1f4', { metal: 0, rough: 0.22, double: true });
  const curve = new THREE.CatmullRomCurve3([[-0.014, 0.185, 0], [-0.0138, 0.26, 0], [-0.0120, 0.305, 0], [-0.0070, 0.3195, 0], [-0.0010, 0.3235, 0]].map((p) => new THREE.Vector3(...p)));
  addPrimitive(doc, mesh, new THREE.TubeGeometry(curve, 160, 0.0058, 40, false), straw);

  // alça: contorno em "C" extrudado (anel de elipse), as pontas entram no corpo
  const handle = mat(doc, 'Handle', '#101113', { metal: 0, rough: 0.6 });
  const cx = 0.038, cy = 0.115, rx = 0.040, ry = 0.058, hw = 0.0055, N = 128;
  const hs = new THREE.Shape();
  for (let i = 0; i <= N; i++) {
    const t = -Math.PI / 2 + (i / N) * Math.PI;
    const x = cx + (rx + hw) * Math.cos(t), y = cy + (ry + hw) * Math.sin(t);
    i ? hs.lineTo(x, y) : hs.moveTo(x, y);
  }
  for (let i = N; i >= 0; i--) {
    const t = -Math.PI / 2 + (i / N) * Math.PI;
    hs.lineTo(cx + (rx - hw) * Math.cos(t), cy + (ry - hw) * Math.sin(t));
  }
  const handleGeo = new THREE.ExtrudeGeometry(hs, { depth: 0.020, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.0028, bevelSegments: 6, curveSegments: 64 });
  addPrimitive(doc, mesh, xform(handleGeo, { z: -0.010 }), handle);
  return doc;
}

// ---------- elementos decorativos (universo da gravação a laser) ----------
function star() { // estrela de xerife: latão com bolinhas nas pontas (Boiadeira)
  const { doc, mesh } = newDoc('star');
  const brass = mat(doc, 'Brass', '#dca83f', { metal: 1, rough: 0.26 });
  const sh = new THREE.Shape();
  const tips = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.46 : 1, a = Math.PI / 2 + (i / 10) * Math.PI * 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (!(i % 2)) tips.push([x * 0.9, y * 0.9]);
    i ? sh.lineTo(x, y) : sh.moveTo(x, y);
  }
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 12 });
  addPrimitive(doc, mesh, xform(g, { z: -0.08 }), brass);
  for (const [x, y] of tips) addPrimitive(doc, mesh, xform(new THREE.SphereGeometry(0.115, 64, 48), { x, y }), brass);
  addPrimitive(doc, mesh, xform(new THREE.CylinderGeometry(0.17, 0.17, 0.34, 96), { rx: Math.PI / 2 }), brass);
  return doc;
}

function diamond() { // losango de metal com miolo esmaltado (Poker)
  const { doc, mesh } = newDoc('diamond');
  const silver = mat(doc, 'Silver', '#d3d8de', { metal: 1, rough: 0.2 });
  const enamel = mat(doc, 'Enamel', '#16181b', { metal: 0, rough: 0.35 });
  const rh = (sx, sy) => { const s = new THREE.Shape(); s.moveTo(0, sy); s.lineTo(sx, 0); s.lineTo(0, -sy); s.lineTo(-sx, 0); s.closePath(); return s; };
  addPrimitive(doc, mesh, xform(new THREE.ExtrudeGeometry(rh(0.8, 1.25), { depth: 0.14, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.09, bevelSegments: 10 }), { z: -0.07 }), silver);
  addPrimitive(doc, mesh, xform(new THREE.ExtrudeGeometry(rh(0.48, 0.78), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 5 }), { z: 0.15 }), enamel);
  return doc;
}

function tag() { // chapinha gravada com argola (Mandala)
  const { doc, mesh } = newDoc('tag');
  const copper = mat(doc, 'Copper', '#dd9170', { metal: 1, rough: 0.3 });
  const dark = mat(doc, 'Engraved', '#2b2523', { metal: 0.6, rough: 0.5 });
  const rr = (w, h, r) => {
    const s = new THREE.Shape();
    s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r); s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h);
    s.lineTo(-w + r, h); s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
    return s;
  };
  const plate = rr(0.62, 0.95, 0.3);
  const hole = new THREE.Path(); hole.absarc(0, 0.68, 0.11, 0, Math.PI * 2, true);
  plate.holes.push(hole);
  addPrimitive(doc, mesh, xform(new THREE.ExtrudeGeometry(plate, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.045, bevelSegments: 10, curveSegments: 64 }), { z: -0.04 }), copper);
  // moldura gravada: anel retangular em relevo mínimo
  const frame = rr(0.46, 0.78, 0.2);
  const inner = rr(0.40, 0.72, 0.16); inner.holes = [];
  const frameShape = rr(0.46, 0.74, 0.2); frameShape.holes.push(new THREE.Path(rr(0.41, 0.69, 0.16).getPoints(64).reverse()));
  addPrimitive(doc, mesh, xform(new THREE.ExtrudeGeometry(frameShape, { depth: 0.012, bevelEnabled: false, curveSegments: 64 }), { y: -0.08, z: 0.092 }), dark);
  addPrimitive(doc, mesh, xform(new THREE.TorusGeometry(0.2, 0.035, 32, 128), { y: 0.84, rx: Math.PI / 2.4 }), copper);
  void frame; void inner;
  return doc;
}

function spark() { // faísca de 4 pontas em cromo (Constelação e "Sua arte")
  const { doc, mesh } = newDoc('spark');
  const chrome = mat(doc, 'Chrome', '#e8ebf0', { metal: 1, rough: 0.12 });
  const four = (R, k) => {
    const s = new THREE.Shape();
    s.moveTo(R, 0);
    for (let i = 0; i < 4; i++) {
      const a0 = (i * Math.PI) / 2, a1 = ((i + 1) * Math.PI) / 2, am = (a0 + a1) / 2;
      s.quadraticCurveTo(Math.cos(am) * R * k, Math.sin(am) * R * k, Math.cos(a1) * R, Math.sin(a1) * R);
    }
    return s;
  };
  addPrimitive(doc, mesh, xform(new THREE.ExtrudeGeometry(four(1.25, 0.1), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 12, curveSegments: 96 }), { z: -0.06 }), chrome);
  addPrimitive(doc, mesh, xform(new THREE.ExtrudeGeometry(four(0.5, 0.12), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 10, curveSegments: 64 }), { x: 0.85, y: 0.7, z: -0.04, rz: 0.3 }), chrome);
  return doc;
}

await mkdir(OUT, { recursive: true });
const io = new NodeIO();
const all = { cup: await buildCup(), star: star(), diamond: diamond(), tag: tag(), spark: spark() };
for (const [name, doc] of Object.entries(all)) {
  const file = new URL(`${name}.glb`, OUT);
  await io.write(file.pathname, doc);
  console.log(`${name.padEnd(10)} ${(statSync(file).size / 1024).toFixed(0).padStart(7)} KB`);
}
