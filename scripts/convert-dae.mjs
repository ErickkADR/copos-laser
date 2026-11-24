// Converte o Collada exportado do SketchUp (copo real, fornecido pelo Erick) para um GLB cru, centralizado no eixo do corpo e
// com a base em y = 0, em metros. Uma primitiva por (peça, material), com o grupo de origem no nome do nó para depuração.
//   node scripts/convert-dae.mjs <model.dae> <saida.glb>
import { DOMParser } from '@xmldom/xmldom';
globalThis.DOMParser = DOMParser;
globalThis.document = { createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, style: {}, set src(v) {} }) }; // texturas do .dae não são usadas
import * as THREE from 'three';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { Document, NodeIO } from '@gltf-transform/core';
import { readFileSync } from 'node:fs';

const [src, out] = process.argv.slice(2);
const scene = new ColladaLoader().parse(readFileSync(src, 'utf8'), '').scene;
scene.updateMatrixWorld(true);

const doc = new Document();
const buffer = doc.createBuffer();
const sc = doc.createScene('cup-real');
doc.getRoot().setDefaultScene(sc);
const mats = new Map();
// O SketchUp exporta cada face duas vezes (cor da frente e cor do verso, no mesmo grupo): fica só a da frente.
// grupo -> { material do .dae a manter: nome no GLB }
const KEEP = {
  group_4: { Color_K01: 'Body' }, // corpo
  group_5: { Color_B07: 'Handle' }, // alça
  group_3: { Color_M01: 'Straw' }, // canudo
  group_2: { Color_M02: 'Lid' }, // miolo da tampa
  group_1: { material: 'Lid', Metal_Corrugated_Shiny: 'Lid' }, // tampa
};
const matFor = (m, name) => {
  if (!mats.has(name)) {
    const c = m.color ?? new THREE.Color('#ffffff');
    mats.set(name, doc.createMaterial(name).setBaseColorFactor([c.r, c.g, c.b, 1]).setMetallicFactor(0).setRoughnessFactor(0.6).setDoubleSided(true));
  }
  return mats.get(name);
};

// 1) junta a geometria do mundo (matriz já com escala de polegadas e Z-up -> Y-up) e mede
const parts = [];
const box = new THREE.Box3();
scene.traverse((o) => {
  if (!o.isMesh) return;
  const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
  if (!g.attributes.normal) g.computeVertexNormals();
  g.computeBoundingBox(); box.union(g.boundingBox);
  const list = [].concat(o.material);
  const groups = g.groups.length ? g.groups : [{ start: 0, count: g.index ? g.index.count : g.attributes.position.count, materialIndex: 0 }];
  let group = ''; for (let q = o.parent; q; q = q.parent) if (q.name?.startsWith('group_')) { group = q.name; break; }
  parts.push({ g, list, groups, group });
});
// eixo do corpo: centro em x/z do maior grupo (corpo = group_4), base em y = 0
const body = new THREE.Box3(); for (const p of parts) if (p.group === 'group_4') body.union(p.g.boundingBox);
const cx = (body.min.x + body.max.x) / 2, cz = (body.min.z + body.max.z) / 2, y0 = body.min.y;
console.log('corpo: raio x', ((body.max.x - body.min.x) / 2).toFixed(4), 'altura', (body.max.y - body.min.y).toFixed(4), '| total', box.getSize(new THREE.Vector3()).toArray().map((v) => v.toFixed(3)).join(' x '));

const node = doc.createNode('cup-real');
sc.addChild(node);
let i = 0;
for (const { g, list, groups, group } of parts) {
  const pos = g.attributes.position, nor = g.attributes.normal;
  for (const gr of groups) {
    const dae = list[gr.materialIndex ?? 0] ?? list[0];
    const target = KEEP[group]?.[dae.name];
    if (!target) continue; // verso duplicado
    const mesh = doc.createMesh(`${group}-${i++}`);
    const idx = g.index ? Array.from({ length: gr.count }, (_, k) => g.index.array[gr.start + k]) : Array.from({ length: gr.count }, (_, k) => gr.start + k);
    const P = new Float32Array(idx.length * 3), N = new Float32Array(idx.length * 3);
    idx.forEach((v, k) => {
      P.set([pos.getX(v) - cx, pos.getY(v) - y0, pos.getZ(v) - cz], k * 3);
      N.set([nor.getX(v), nor.getY(v), nor.getZ(v)], k * 3);
    });
    const prim = doc.createPrimitive().setMaterial(matFor(dae, target));
    if (target === 'Body') { // UV cilíndrico: u = ângulo (0,5 de frente, +Z), v = 0 no topo e 1 na base do corpo
      const UV = new Float32Array(idx.length * 2), H = body.max.y - body.min.y;
      for (let t = 0; t < idx.length; t += 3) {
        const u = [0, 1, 2].map((k) => Math.atan2(P[(t + k) * 3], P[(t + k) * 3 + 2]) / (2 * Math.PI) + 0.5);
        if (Math.max(...u) - Math.min(...u) > 0.5) for (let k = 0; k < 3; k++) if (u[k] < 0.5) u[k] += 1; // triângulo na costura: u passa de 1 (a textura repete)
        for (let k = 0; k < 3; k++) UV.set([u[k], 1 - P[(t + k) * 3 + 1] / H], (t + k) * 2);
      }
      prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(UV).setBuffer(buffer));
    }
    prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(P).setBuffer(buffer));
    prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(N).setBuffer(buffer));
    mesh.addPrimitive(prim);
    node.addChild(doc.createNode(mesh.getName()).setMesh(mesh));
  }
}
await new NodeIO().write(out, doc);
console.log('altura do corpo (mm):', ((body.max.y - body.min.y) * 1000).toFixed(0), '| materiais:', [...mats.keys()].join(', '), '->', out);
