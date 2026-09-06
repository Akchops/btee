/** Seamless tileable canopy-shadow texture. RGBA where RGB is INK and A is the
 *  noise field — so the layer needs no blend mode, only opacity. (A blend-mode
 *  variant is compared at QA per the implementation guardrail.) */
import sharp from 'sharp';
import fs from 'node:fs';
import { splitmix32 } from '../src/lib/hash.js';
const S = 384;
const ink = [36, 39, 32];

const lattice = (n, seed) => { const g = new Float32Array(n * n); for (let i = 0; i < n * n; i++) g[i] = splitmix32(seed * 7919 + i); return g; };
const smooth = (t) => t * t * (3 - 2 * t);
function tileNoise(x, y, n, g) {
  const fx = x * n, fy = y * n, x0 = Math.floor(fx) % n, y0 = Math.floor(fy) % n;
  const x1 = (x0 + 1) % n, y1 = (y0 + 1) % n, tx = smooth(fx - Math.floor(fx)), ty = smooth(fy - Math.floor(fy));
  const a = g[y0 * n + x0], b = g[y0 * n + x1], c = g[y1 * n + x0], d = g[y1 * n + x1];
  return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
}
const octaves = [[3, 1], [6, 2], [12, 3], [24, 4], [48, 5]].map(([n, s]) => ({ n, g: lattice(n, s) }));
const buf = Buffer.alloc(S * S * 4);
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
  const u = x / S, v = y / S;
  let amp = 1, sum = 0, norm = 0;
  for (const o of octaves) { sum += tileNoise(u, v, o.n, o.g) * amp; norm += amp; amp *= 0.62; }
  let n = sum / norm;
  n = Math.pow(Math.max(0, Math.min(1, (n - 0.44) / 0.34)), 2.1); // distinct shadow pools with real light gaps between
  const i = (y * S + x) * 4;
  buf[i] = ink[0]; buf[i + 1] = ink[1]; buf[i + 2] = ink[2]; buf[i + 3] = Math.round(n * 255);
}
fs.mkdirSync('public/survey', { recursive: true });
await sharp(buf, { raw: { width: S, height: S, channels: 4 } }).webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile('public/survey/dapple.webp');
console.log('public/survey/dapple.webp', (fs.statSync('public/survey/dapple.webp').size / 1024).toFixed(1) + ' KB');
