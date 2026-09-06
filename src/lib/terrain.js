/** A terrain and canopy model for Ko Lamphu, interpolated from the survey
 *  record itself: the 24 clearing elevations, the ridge, and a coastline at
 *  zero. Every section drawn anywhere on the island therefore agrees with every
 *  elevation printed in the rail — the drawings and the instrument cannot drift. */
import island from '../../data/island.json' with { type: 'json' };
import { CLEARINGS } from './survey.js';
import { rnd } from './hash.js';
import { edgeDistance, inPolygon, dist } from './geo.js';

const poly = island.polygon_m;
const KNOWN = [
  ...CLEARINGS.map((c) => ({ x: c.cx_m, y: c.cy_m, z: c.elev_m })),
  { x: island.ridge_m.x, y: island.ridge_m.y, z: island.ridge_m.elev_m },
  { x: island.jetty_m.x, y: island.jetty_m.y, z: 0 },   // the jetty is sea level, by definition
  ...poly.map(([x, y]) => ({ x, y, z: 0 })),
];

/** Inverse-distance weighting. Exact at every known point, so a clearing's
 *  drawn elevation is the elevation the record states. */
export function elevationAt(x, y) {
  let num = 0, den = 0;
  for (const k of KNOWN) {
    const d2 = (x - k.x) ** 2 + (y - k.y) ** 2;
    if (d2 < 1) return k.z;
    const w = 1 / (d2 * d2 ** 0.15);
    num += w * k.z; den += w;
  }
  const z = num / den;
  const shore = Math.min(1, edgeDistance(x, y, poly) / 90);
  return Math.max(0, z * shore);
}

/** Canopy height above ground. Zero inside a clearing — that is what a clearing
 *  is — and tapering at the shore where the trees are shorter and wind-cut. */
export function canopyHeightAt(x, y) {
  for (const c of CLEARINGS) if (dist(x, y, c.cx_m, c.cy_m) < c.r_m) return 0;
  const shore = Math.min(1, edgeDistance(x, y, poly) / 130);
  const n = rnd(Math.round(x / 37) * 91 + Math.round(y / 37), 61);
  return (19 + n * 15) * (0.42 + shore * 0.58);
}

export const canopyAt = (x, y) => elevationAt(x, y) + canopyHeightAt(x, y);
export const onIsland = (x, y) => inPolygon(x, y, poly);

/** Sample a straight section between two points. Returns metres along the
 *  section, ground elevation, and canopy top. */
export function section(ax, ay, bx, by, n = 240) {
  const out = [];
  const len = Math.hypot(bx - ax, by - ay);
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    const on = onIsland(x, y);
    const g = on ? elevationAt(x, y) : 0;
    out.push({ s: len * t, x, y, ground: g, canopy: on ? g + canopyHeightAt(x, y) : 0, on });
  }
  return { pts: out, length: len };
}
