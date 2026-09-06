import { elevationAt, section } from '../src/lib/terrain.js';
import { CLEARINGS, island } from '../src/lib/survey.js';
let worst = 0;
for (const c of CLEARINGS) {
  const e = elevationAt(c.cx_m, c.cy_m);
  worst = Math.max(worst, Math.abs(e - c.elev_m));
}
console.log(`max clearing elevation error: ${worst.toFixed(3)} m  (must be 0 — the model must agree with the record)`);
const r = elevationAt(island.ridge_m.x, island.ridge_m.y);
console.log(`ridge: model ${r.toFixed(1)} m, record ${island.ridge_m.elev_m} m`);
const s = section(island.jetty_m.x, island.jetty_m.y, 380, 1170, 12);
console.log('jetty → 0412 section (m along, ground, canopy):');
for (const p of s.pts) console.log(`  ${p.s.toFixed(0).padStart(4)}  ${p.ground.toFixed(1).padStart(5)}  ${p.canopy.toFixed(1).padStart(5)}`);
