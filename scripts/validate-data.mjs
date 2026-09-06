import { CLEARINGS, RIDGE_WALK, island, brand } from '../src/lib/survey.js';
import { inPolygon, edgeDistance, dist } from '../src/lib/geo.js';
let fail = 0;
const bad = (m) => { console.error('  FAIL ' + m); fail++; };

if (CLEARINGS.length !== brand.clearingCount) bad(`expected ${brand.clearingCount} clearings, got ${CLEARINGS.length}`);
for (const c of CLEARINGS) {
  if (!inPolygon(c.cx_m, c.cy_m, island.polygon_m)) bad(`${c.tag} ${c.name} outside island polygon`);
  if (edgeDistance(c.cx_m, c.cy_m, island.polygon_m) < c.r_m + 20) bad(`${c.tag} too close to the coastline`);
  if (c.elev_m > island.ridge_m.elev_m) bad(`${c.tag} above the ridge`);
  if (c.built_m2 >= c.clearing_m2) bad(`${c.tag} built area exceeds its clearing`);
}
for (let i = 0; i < CLEARINGS.length; i++) for (let j = i + 1; j < CLEARINGS.length; j++) {
  const a = CLEARINGS[i], b = CLEARINGS[j];
  const d = dist(a.cx_m, a.cy_m, b.cx_m, b.cy_m);
  if (d < a.r_m + b.r_m + 40) bad(`${a.tag} and ${b.tag} clearings overlap (${d.toFixed(0)} m apart)`);
}
console.log('\nDerived walk times (published samples must match):');
for (const t of ['0087','0651','0412','0930','1109','1288']) {
  const c = CLEARINGS.find(x => x.tag === t);
  console.log(`  ${c.tag} ${c.name.padEnd(13)} ${String(c.elev_m).padStart(2)} m  ${String(c.aspect_deg).padStart(3)}° ${c.compass.padEnd(3)}  ${c.walk_min} min`);
}
console.log(`  ridge          58 m           ${RIDGE_WALK} min`);
console.log(`\nElevation range: ${Math.min(...CLEARINGS.map(c=>c.elev_m))}–${Math.max(...CLEARINGS.map(c=>c.elev_m))} m`);
console.log(`Walk range:      ${Math.min(...CLEARINGS.map(c=>c.walk_min))}–${Math.max(...CLEARINGS.map(c=>c.walk_min))} min`);
console.log(fail ? `\n${fail} FAILURE(S)` : '\nData layer consistent.');
process.exit(fail ? 1 : 0);
