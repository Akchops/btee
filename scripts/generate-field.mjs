/** BUILD TIME ONLY. Generates the 1,412-tree survey field.
 *  Poisson-disc (variable radius) inside the authored island polygon, with the
 *  24 clearings subtracted as hard exclusions. Deterministic: same seed, same
 *  field, on every machine, forever. */
import fs from 'node:fs';
import { splitmix32 } from '../src/lib/hash.js';
import { inPolygon, edgeDistance, dist } from '../src/lib/geo.js';
import island from '../data/island.json' with { type: 'json' };
import brand from '../data/brand.json' with { type: 'json' };
import { CLEARINGS } from '../src/lib/survey.js';

const TARGET = brand.treesTagged;
const { w: W, h: H } = island.extent_m;
const poly = island.polygon_m;
const ridge = island.ridge_m;

let s = 0;
const rand = () => splitmix32(0x5EED ^ (s++ * 0x9e3779b9));

/** Variable spacing: dense on the lower slopes, thinning toward the ridge and
 *  the coastal fringe — which is what gives the silhouette its soft edge. */
function spacing(x, y) {
  const toRidge = dist(x, y, ridge.x, ridge.y) / 900;          // 0 at ridge
  const toEdge  = Math.min(1, edgeDistance(x, y, poly) / 140);  // 0 at coast
  return 11.5 + (1 - Math.min(1, toRidge)) * 8 + (1 - toEdge) * 7;
}

const CELL = 14;
const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
const grid = new Map();
const key = (cx, cy) => cy * cols + cx;
const pts = [];

function fits(x, y) {
  if (!inPolygon(x, y, poly)) return false;
  if (edgeDistance(x, y, poly) < 12) return false;
  for (const c of CLEARINGS) if (dist(x, y, c.cx_m, c.cy_m) < c.r_m + 15) return false;   // the cleared apron
  const need = spacing(x, y);
  const cx = (x / CELL) | 0, cy = (y / CELL) | 0, span = Math.ceil(need / CELL) + 1;
  for (let j = Math.max(0, cy - span); j <= Math.min(rows - 1, cy + span); j++)
    for (let i = Math.max(0, cx - span); i <= Math.min(cols - 1, cx + span); i++) {
      const bucket = grid.get(key(i, j)); if (!bucket) continue;
      for (const k of bucket) {
        const px = pts[k][0], py = pts[k][1];
        if (dist(x, y, px, py) < Math.max(need, spacing(px, py))) return false;
      }
    }
  return true;
}
function add(x, y) {
  const cx = (x / CELL) | 0, cy = (y / CELL) | 0, k = key(cx, cy);
  if (!grid.has(k)) grid.set(k, []);
  grid.get(k).push(pts.length); pts.push([x, y]);
}

for (let attempt = 0; attempt < 9_000_000 && pts.length < TARGET * 1.35; attempt++) {
  const x = rand() * W, y = rand() * H;
  if (fits(x, y)) add(x, y);
}
console.log(`sampled ${pts.length} candidates`);

/** Redundancy rank: nearest-neighbour distance, ascending. The most crowded
 *  points rank highest and are shed first, so thinning the field preserves the
 *  silhouette, the density gradient and every void. */
const nn = pts.map(([x, y], i) => {
  let best = Infinity;
  for (let j = 0; j < pts.length; j++) if (j !== i) {
    const d = dist(x, y, pts[j][0], pts[j][1]); if (d < best) best = d;
  }
  return { i, d: best };
});
nn.sort((a, b) => b.d - a.d);               // most isolated first = most essential
const keep = nn.slice(0, TARGET);
if (keep.length < TARGET) { console.error(`only ${keep.length} points — raise the sample budget`); process.exit(1); }

const out = new Uint16Array(TARGET * 3);
keep.forEach((p, rank) => {
  out[rank * 3]     = Math.round(pts[p.i][0]);
  out[rank * 3 + 1] = Math.round(pts[p.i][1]);
  out[rank * 3 + 2] = rank;                  // 0 = keep longest
});
fs.mkdirSync('public/survey', { recursive: true });
fs.writeFileSync('public/survey/trees.bin', Buffer.from(out.buffer));
console.log(`wrote ${TARGET} trees → public/survey/trees.bin (${(out.byteLength/1024).toFixed(1)} KB)`);
