// Authoring aid: nudges non-pinned clearings apart so no two overlap and none
// crowds the coastline. The six clearings whose walk times have been published
// to the client are PINNED and never move.
import fs from 'node:fs';
import { inPolygon, edgeDistance, dist } from '../src/lib/geo.js';
import island from '../data/island.json' with { type: 'json' };
const PIN = new Set(['0087','0651','0412','0930','1109','1288']);
const poly = island.polygon_m;
const cl = JSON.parse(fs.readFileSync('data/clearings.json','utf8'));
const r = (c) => Math.sqrt(c.clearing_m2 / Math.PI);
const P = cl.map(c => ({ ...c, x: c.cx_m, y: c.cy_m, R: r(c) }));

for (let it = 0; it < 4000; it++) {
  const fx = new Float64Array(P.length), fy = new Float64Array(P.length);
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const a = P[i], b = P[j];
    const need = a.R + b.R + 55, d = Math.max(1, dist(a.x, a.y, b.x, b.y));
    if (d < need) {
      const push = (need - d) * 0.5, ux = (a.x - b.x) / d, uy = (a.y - b.y) / d;
      fx[i] += ux * push; fy[i] += uy * push; fx[j] -= ux * push; fy[j] -= uy * push;
    }
  }
  let moved = 0;
  for (let i = 0; i < P.length; i++) {
    if (PIN.has(P[i].tag)) continue;
    let nx = P[i].x + fx[i] * 0.35, ny = P[i].y + fy[i] * 0.35;
    // pull back inside if the nudge breaches the coastline margin
    if (!inPolygon(nx, ny, poly) || edgeDistance(nx, ny, poly) < P[i].R + 30) { nx = P[i].x; ny = P[i].y; }
    moved += Math.abs(nx - P[i].x) + Math.abs(ny - P[i].y);
    P[i].x = nx; P[i].y = ny;
  }
  if (moved < 0.01) { console.log(`settled after ${it} iterations`); break; }
}
const out = cl.map((c, i) => ({ ...c, cx_m: Math.round(P[i].x), cy_m: Math.round(P[i].y) }));
fs.writeFileSync('data/clearings.json', JSON.stringify(out, null, 0).replace(/\},\{/g, '},\n{').replace(/^\[/, '[\n').replace(/\]$/, '\n]') + '\n');
console.log('clearings.json rewritten');
