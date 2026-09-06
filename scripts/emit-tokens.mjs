/** tokens.json -> tokens.css. One definition reaches CSS, the canvas module and
 *  the grading pipeline, so the palette cannot drift between page and photograph. */
import fs from 'node:fs';
const t = JSON.parse(fs.readFileSync('data/tokens.json', 'utf8'));
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' ');
let css = `/* GENERATED from data/tokens.json by scripts/emit-tokens.mjs — do not edit */\n@layer tokens {\n:root{\n`;
for (const [k, v] of Object.entries(t.colour)) css += `  --${k}: ${v.hex};\n  --${k}-rgb: ${hex2rgb(v.hex)};\n`;
for (const [g, set] of Object.entries(t.alpha))
  for (const [k, v] of Object.entries(set)) css += `  --a-${g.replace('on', '').toLowerCase()}-${k}: ${v};\n`;
css += `  --dapple-a: ${t.dapple.layerA};\n  --dapple-b: ${t.dapple.layerB};\n`;
css += `  --dapple-pa: ${t.dapple.periodA};\n  --dapple-pb: ${t.dapple.periodB};\n`;
for (const [k, v] of Object.entries(t.ease)) css += `  --ease-${k}: ${v};\n`;
css += `}\n}\n`;
fs.mkdirSync('src/styles', { recursive: true });
fs.writeFileSync('src/styles/tokens.css', css);
console.log('src/styles/tokens.css written');
