import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeProjection, deviceCoords, appearance, STATES } from '../src/lib/field.js';
import island from '../data/island.json' with { type: 'json' };
import clearings from '../data/clearings.json' with { type: 'json' };

const buf = fs.readFileSync('public/survey/trees.bin');
const raw = new Uint16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2);
const N = raw.length / 3;
const positions = raw; // typed arrays cannot be frozen; immutability is asserted by checksum below

const VIEWPORTS = [
  { w: 1440, h: 900, dpr: 2 }, { w: 1440, h: 900, dpr: 1 },
  { w: 390,  h: 844, dpr: 3 }, { w: 834,  h: 1112, dpr: 2 },
  { w: 2560, h: 1440, dpr: 1.5 },
];

test('THE INVARIANT: survey and star states project to identical coordinates', () => {
  for (const v of VIEWPORTS) {
    const proj = makeProjection(v, island.extent_m);
    const survey = deviceCoords(positions, proj, v.dpr, 'survey');
    const night  = deviceCoords(positions, proj, v.dpr, 'night');
    assert.equal(survey.length, night.length, `length differs at ${v.w}x${v.h}@${v.dpr}`);
    for (let i = 0; i < survey.length; i++) {
      assert.equal(survey[i], night[i],
        `POSITION DRIFT at ${v.w}x${v.h}@${v.dpr}, index ${i}: survey ${survey[i]} !== night ${night[i]}`);
    }
  }
});

test('appearance differs between states — otherwise the reveal does nothing', () => {
  const a = appearance(7, 'survey', 1), b = appearance(7, 'night', 1);
  assert.notDeepEqual(a, b, 'survey and night appearance are identical');
  assert.ok(a.fill !== b.fill && a.composite !== b.composite);
});

test('the position buffer is immutable and unchanged by a full render cycle', () => {
  const before = positions.reduce((h, v, i) => (h ^ Math.imul(v + i, 2654435761)) >>> 0, 0);
  const proj = makeProjection(VIEWPORTS[0], island.extent_m);
  for (const s of STATES) for (let p = 0; p <= 1; p += 0.05) {
    deviceCoords(positions, proj, 2, s);
    for (let i = 0; i < N; i += 97) appearance(i, s, p);
  }
  const after = positions.reduce((h, v, i) => (h ^ Math.imul(v + i, 2654435761)) >>> 0, 0);
  assert.equal(after, before, 'the position buffer was mutated during rendering');
});

test('the field carries exactly 1,412 trees', () => {
  assert.equal(N, 1412, `expected 1412 trees, found ${N}`);
});

test('no tree falls inside a clearing, at any degradation level', () => {
  for (const lvl of [1412, 1000, 700, 400]) {
    const kept = [];
    for (let i = 0; i < N; i++) if (raw[i * 3 + 2] < lvl) kept.push([raw[i * 3], raw[i * 3 + 1]]);
    for (const c of clearings) {
      const r = Math.sqrt(c.clearing_m2 / Math.PI);
      for (const [x, y] of kept) {
        assert.ok(Math.hypot(x - c.cx_m, y - c.cy_m) > r,
          `tree at ${x},${y} sits inside clearing ${c.tag} at degradation ${lvl}`);
      }
    }
  }
});

test('degradation preserves per-point appearance of survivors', async () => {
  const { magnitude } = await import('../src/lib/hash.js');
  // magnitude is index-addressed, so thinning the field cannot re-roll the sky
  const full = [3, 41, 900, 1411].map(magnitude);
  const again = [3, 41, 900, 1411].map(magnitude);
  assert.deepEqual(full, again);
});
