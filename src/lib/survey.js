import island from '../../data/island.json' with { type: 'json' };
import clearings from '../../data/clearings.json' with { type: 'json' };
import brand from '../../data/brand.json' with { type: 'json' };
import { dist } from './geo.js';

const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

/** DERIVED — never authored. Compass letters from the bearing. */
export const compass = (deg) => COMPASS[Math.round(((deg % 360) / 22.5)) % 16];

/** DERIVED — clearing radius in metres from its surveyed area. */
export const radius = (m2) => Math.sqrt(m2 / Math.PI);

/** DERIVED — walk time from the jetty. Path length is straight-line distance
 *  times a sinuosity factor, plus a climb penalty. One model, all 24. */
export function walkMin(cx, cy, elev) {
  const { jetty_m: j, walkModel: w } = island;
  return Math.round((dist(cx, cy, j.x, j.y) * w.sinuosity) / w.metresPerMinute + elev * w.climbMinutesPerMetre);
}

/** The 24, with every derived value attached. Sorted by walk time — which is
 *  also the tab order, so tabbing the instrument walks the island in order. */
export const CLEARINGS = clearings
  .map((c) => ({
    ...c,
    r_m: radius(c.clearing_m2),
    walk_min: walkMin(c.cx_m, c.cy_m, c.elev_m),
    compass: compass(c.aspect_deg),
    href: `/clearings/${c.tag}`,
  }))
  .sort((a, b) => a.walk_min - b.walk_min || a.tag.localeCompare(b.tag));

export const byTag = (tag) => CLEARINGS.find((c) => c.tag === tag);
export const RIDGE_WALK = walkMin(island.ridge_m.x, island.ridge_m.y, island.ridge_m.elev_m);
export { island, brand };
