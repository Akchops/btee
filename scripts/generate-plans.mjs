/** One plan per clearing, derived from that clearing's own geometry: its radius,
 *  its built area, and the bearing it opens toward. Twenty-four different
 *  clearings therefore produce twenty-four different plans, and none is a mirror
 *  of another. Coordinates are metres relative to the clearing centre. */
import fs from 'node:fs';
import { CLEARINGS } from '../src/lib/survey.js';
import { rnd } from '../src/lib/hash.js';

const P = (n) => +n.toFixed(2);
const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const poly = (pts, a) => 'M' + pts.map(([x, y]) => { const [rx, ry] = rot(x, y, a); return `${P(rx)} ${P(-ry)}`; }).join('L') + 'Z';

const plans = {};
CLEARINGS.forEach((c, idx) => {
  // 0° bearing is north; the long wall faces the clearing's aspect.
  const a = ((90 - c.aspect_deg) * Math.PI) / 180;
  const j = (s) => rnd(idx, s);
  const depth = 7.5 + j(11) * 3.5;                       // pavilion depth
  const long = c.built_m2 / depth * (0.62 + j(12) * 0.12);
  const wingL = c.built_m2 / depth * (0.26 + j(13) * 0.12);
  const wingD = depth * (0.72 + j(14) * 0.2);
  const gap = 1.8 + j(15) * 2.4;
  const px = c.pool_m, pw = 3.6 + j(16) * 1.2;
  const off = -long / 2 + long * (0.1 + j(17) * 0.3);

  // four partis, chosen deterministically — a bar, an L, a split, a courtyard
  const parti = Math.floor(j(20) * 4);
  const notch = 2.4 + j(21) * 2.2;
  let mainPts;
  if (parti === 0) {                    // bar with a corner cut where a tree stands
    mainPts = [[-long/2,-depth/2],[long/2 - notch,-depth/2],[long/2,-depth/2 + notch],
               [long/2,depth/2],[-long/2,depth/2]];
  } else if (parti === 1) {             // L
    mainPts = [[-long/2,-depth/2],[long/2,-depth/2],[long/2,depth/2 - depth*0.42],
               [long/2 - long*0.38,depth/2 - depth*0.42],[long/2 - long*0.38,depth/2],[-long/2,depth/2]];
  } else if (parti === 2) {             // split — a gap the trees pass through
    mainPts = [[-long/2,-depth/2],[-long*0.08,-depth/2],[-long*0.08,depth/2],[-long/2,depth/2]];
  } else {                              // courtyard
    mainPts = [[-long/2,-depth/2],[long/2,-depth/2],[long/2,depth/2],[-long/2,depth/2]];
  }
  const main = poly(mainPts, a);
  const second = parti === 2
    ? poly([[long*0.08,-depth/2],[long/2,-depth/2],[long/2,depth/2],[long*0.08,depth/2]], a)
    : parti === 3
      ? poly([[-long*0.22,-depth*0.16],[long*0.22,-depth*0.16],[long*0.22,depth*0.16],[-long*0.22,depth*0.16]], a)
      : '';
  // internal partitions: two or three, never symmetrical
  const walls = [];
  const nw = 2 + Math.floor(j(22) * 2);
  for (let k = 0; k < nw; k++) {
    const t = -long/2 + long * (0.22 + j(23 + k) * 0.56);
    const from = j(26 + k) > 0.5 ? -depth/2 : depth/2;
    const to = from > 0 ? depth/2 - depth * (0.34 + j(28 + k) * 0.4) : -depth/2 + depth * (0.34 + j(28 + k) * 0.4);
    const [x1, y1] = rot(t, from, a), [x2, y2] = rot(t, to, a);
    walls.push(`M${P(x1)} ${P(-y1)}L${P(x2)} ${P(-y2)}`);
  }
  const wingSide = j(18) > 0.5 ? 1 : -1;
  const wing = poly([
    [wingSide*(long/2 - wingL), depth/2 + gap], [wingSide*(long/2), depth/2 + gap],
    [wingSide*(long/2), depth/2 + gap + wingD], [wingSide*(long/2 - wingL), depth/2 + gap + wingD],
  ], a);
  const pool = poly([[off,-depth/2-gap-pw],[off+px,-depth/2-gap-pw],[off+px,-depth/2-gap],[off,-depth/2-gap]], a);
  const deck = poly([[-long/2-1.6,-depth/2-gap-pw-1.4],[long/2+1.6,-depth/2-gap-pw-1.4],[long/2+1.6,-depth/2-.4],[-long/2-1.6,-depth/2-.4]], a);

  // the trees the plan had to work around — the reason each plan is its own shape
  const trees = [];
  for (let k = 0; k < 4; k++) {
    const th = j(30 + k) * Math.PI * 2, rr = c.r_m * (0.55 + j(40 + k) * 0.4);
    trees.push({ x: P(Math.cos(th) * rr), y: P(-Math.sin(th) * rr), r: P(0.6 + j(50 + k) * 1.5) });
  }
  plans[c.tag] = { r: P(c.r_m), parti, main, second, wing, walls, pool, deck, trees, aspect: c.aspect_deg };
});
fs.writeFileSync('src/lib/plans.json', JSON.stringify(plans));
console.log(`src/lib/plans.json — ${Object.keys(plans).length} plans, ${(fs.statSync('src/lib/plans.json').size/1024).toFixed(1)} KB`);
