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

test('the diagnostic page is unreachable from the site', () => {
  const files = fs.readdirSync('dist', { recursive: true })
    .filter((f) => String(f).endsWith('.html') && !String(f).startsWith('diagnostic'));
  for (const f of files) {
    const html = fs.readFileSync(`dist/${f}`, 'utf8');
    assert.ok(!/href="[^"]*diagnostic/.test(html),
      `${f} links to /diagnostic/ — it must never enter site navigation`);
  }
  const diag = fs.readFileSync('dist/diagnostic/index.html', 'utf8');
  assert.match(diag, /noindex/, 'the diagnostic page must be noindex');
  assert.match(fs.readFileSync('public/robots.txt', 'utf8'), /Disallow: \/diagnostic\//);
});

test('the diagnostic HUD is not loaded for normal visitors', () => {
  const js = fs.readdirSync('dist/_astro').filter((f) => f.endsWith('.js'))
    .map((f) => fs.readFileSync(`dist/_astro/${f}`, 'utf8')).join('\n');
  assert.match(js, /aurelis:diag/, 'the opt-in guard should be present');
  const entry = fs.readdirSync('dist/_astro').find((f) => f.startsWith('Base.astro') && f.endsWith('.js'));
  const src = fs.readFileSync(`dist/_astro/${entry}`, 'utf8');
  const guardIdx = src.indexOf('aurelis:diag');
  const importIdx = src.indexOf('diag-hud');
  assert.ok(guardIdx !== -1 && (importIdx === -1 || guardIdx < importIdx),
    'the HUD import must sit behind the opt-in guard, not run unconditionally');
});
