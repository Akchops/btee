import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import manifest from '../data/plates.json' with { type: 'json' };
import day from '../data/day.json' with { type: 'json' };

const ids = new Set(manifest.slots.map((s) => s.id));

test('every Plate slot referenced in a page exists in the manifest', () => {
  const pages = fs.readdirSync('src/pages', { recursive: true })
    .filter((f) => String(f).endsWith('.astro'))
    .map((f) => fs.readFileSync(`src/pages/${f}`, 'utf8')).join('\n');
  for (const m of pages.matchAll(/<Plate\s+id="([^"]+)"/g)) {
    assert.ok(ids.has(m[1]), `page references plate slot "${m[1]}" which is not in data/plates.json`);
  }
  for (const h of day.hours) if (h.slot) assert.ok(ids.has(h.slot), `day.json references "${h.slot}"`);
});

test('every reserved slot carries the art direction needed to source it later', () => {
  for (const s of manifest.slots) {
    for (const k of ['beat', 'purpose', 'ratio', 'caption', 'search', 'wrongIf']) {
      assert.ok(s[k], `slot ${s.id} is missing ${k}`);
    }
    // a slot carries a sourcing priority, or an explicit reason it has none
    assert.ok(s.priority != null || s.doNotSource,
      `slot ${s.id} needs either a priority or a documented do-not-source reason`);
    assert.ok(Array.isArray(s.search) && s.search.length >= 2, `slot ${s.id} needs search language`);
    assert.ok(['45', '11', '32', '916'].includes(s.ratio), `slot ${s.id} uses a ratio outside the locked system`);
  }
});

test('a slot with a source must also carry its provenance', () => {
  for (const s of manifest.slots) {
    if (!s.src) continue;
    assert.ok(s.credit && s.licence && s.sourceUrl,
      `slot ${s.id} has a source but no credit/licence/sourceUrl — provenance is required before an image ships`);
  }
});

test('the built pages contain no empty plate boxes', () => {
  const html = fs.readFileSync('dist/index.html', 'utf8');
  const boxes = (html.match(/plate__box/g) || []).length;
  const live = manifest.slots.filter((s) => s.src).length;
  assert.equal(boxes, live, `found ${boxes} plate boxes but ${live} live sources — empty boxes break the air treatment`);
});

test('the client-locked sourcing priority is intact', () => {
  const locked = ['under', 'dark', 'day-fire', 'day-water', 'day-rain', 'material'];
  const actual = manifest.slots.filter((s) => s.priority != null)
    .sort((a, b) => a.priority - b.priority).map((s) => s.id);
  assert.deepEqual(actual, locked, 'the photography sourcing order was changed; it is locked by the client');
  const villa = manifest.slots.find((s) => s.id === 'villa-interior');
  assert.equal(villa.priority, null, 'villa-interior must not carry a priority');
  assert.ok(villa.doNotSource, 'villa-interior must keep its do-not-source note');
});
