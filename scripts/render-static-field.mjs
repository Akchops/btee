/** No-JS / no-Canvas fallback: the survey and the sky as static SVG. Same data,
 *  same projection — these are the picture, not a placeholder. */
import fs from 'node:fs';
import island from '../data/island.json' with { type: 'json' };
import tokens from '../data/tokens.json' with { type: 'json' };
import { magnitude } from '../src/lib/hash.js';
const raw = new Uint16Array(fs.readFileSync('public/survey/trees.bin').buffer);
const N = raw.length / 3, { w: W, h: H } = island.extent_m;
const render = (state) => {
  const fill = state === 'survey' ? tokens.colour.ink.hex : tokens.colour.sheet.hex;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="The AURELIS survey: 1,412 tagged trees on Ko Lamphu, with 24 clearings shown as gaps."><g fill="${fill}">`;
  for (let i = 0; i < N; i++) {
    const x = raw[i * 3], y = H - raw[i * 3 + 1];
    const r = state === 'survey' ? 2.6 : (1.6 + magnitude(i) * 4.6);
    const o = state === 'survey' ? 1 : (0.25 + magnitude(i) * 0.65);
    s += `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}"${o < 1 ? ` opacity="${o.toFixed(2)}"` : ''}/>`;
  }
  return s + '</g></svg>\n';
};
for (const st of ['survey', 'night']) {
  fs.writeFileSync(`public/survey/field-${st}.svg`, render(st));
  console.log(`public/survey/field-${st}.svg`, (fs.statSync(`public/survey/field-${st}.svg`).size / 1024).toFixed(1) + ' KB');
}
