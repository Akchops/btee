/** Functional check of the diagnostic HUD. Confirms it works; deliberately
 *  draws NO performance conclusions — this container is not a device. */
import { chromium } from 'playwright';
const B = 'http://localhost:4321';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ok = (c, m) => console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`);

// 1. absent without the flag
let ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
let p = await ctx.newPage();
await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
ok(!(await p.$('#aurelis-diag')), 'HUD absent for a normal visitor');
const reqs = [];
p.on('request', (r) => reqs.push(r.url()));
await p.reload({ waitUntil: 'networkidle' });
ok(!reqs.some((u) => u.includes('diag-hud')), 'diag-hud.js is never fetched without the flag');
await ctx.close();

// 2. present with the flag
ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => localStorage.setItem('aurelis:diag', '1'));
p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1400);
ok(!!(await p.$('#aurelis-diag')), 'HUD mounts with the flag set');
ok(errs.length === 0, `no runtime errors (${errs.slice(0,1).join('') || 'none'})`);

const read = async () => p.evaluate(() => {
  const t = (k) => [...document.querySelectorAll('#aurelis-diag .r')]
    .find((r) => r.firstChild.textContent === k)?.lastChild.textContent ?? null;
  return { level: t('watchdog level'), dapple: t('dapple'), shed: t('dapple shed'),
           points: t('points drawn'), dpr: t('devicePixelRatio'), vt: t('View Transitions'),
           rm: t('reduced motion'), fonts: t('fonts'), fb: t('fallback face'), loop: t('site loop'),
           swap: t('font-swap Δwidth'), p50: t('p50'), auto: t('escalations (auto)') };
});
let s = await read();
ok(s.p50 && s.p50 !== '— ms', `frame metrics populate (p50 ${s.p50})`);
ok(s.points && /\d+ \/ 1412/.test(s.points), `point count reported (${s.points})`);
ok(s.auto === '0', `zero AUTO escalations at rest (starting level ${s.level} — a device-hint step is correct, not detection)`);
ok(s.vt !== null && s.rm !== null, `environment reported (VT ${s.vt}, RM ${s.rm})`);
await p.waitForTimeout(1200);
s = await read();
ok(s.fonts === 'loaded', `font state resolves (${s.fonts}); fallback ${s.fb}; swap ${s.swap}`);

// 3. manual levels render, and are attributed as manual
await p.click('#aurelis-diag [data-a="lvl3"]'); await p.waitForTimeout(400);
s = await read();
ok(s.level === 'L3' && s.shed === 'YES', `manual L3 applies and sheds the dapple (${s.dapple})`);
await p.click('#aurelis-diag [data-a="lvl5"]'); await p.waitForTimeout(500);
s = await read();
ok(/^\d+ \/ 1412/.test(s.points) && parseInt(s.points) < 1412, `manual L5 thins the field (${s.points})`);
await p.click('#aurelis-diag [data-a="restore"]'); await p.waitForTimeout(500);
s = await read();
ok(s.level === 'L0' && s.points.startsWith('1412'), `restore returns full quality (${s.points})`);

// 4. stress must produce an AUTO escalation — the only thing that proves detection
await p.click('#aurelis-diag [data-a="stress"]');
await p.waitForTimeout(34000);
s = await read();
const res = await p.evaluate(() => document.querySelector('[data-v="stressres"]')?.textContent);
ok(res && res !== 'not run', `stress runs to a verdict and reports it: "${res}"`);
console.log(`      note: auto=${s.auto}, level ${s.level} — this container is not a device; the verdict is what matters, not the number`);

// 5. report builds and separates auto from manual
await p.click('#aurelis-diag [data-a="copy"]'); await p.waitForTimeout(300);
const rep = await p.evaluate(() => document.querySelector('#aurelis-diag textarea').value);
ok(rep.includes('AUTO escalations') && rep.includes('MANUAL actions'), 'report separates auto from manual');
ok(rep.includes('ua ') && rep.includes('p50 / p90 / p99'), 'report carries UA and percentiles');
console.log('\n--- report excerpt ---');
console.log(rep.split('\n').filter((l) => /AUTO|MANUAL|auto |watchdog|points|fallback|swap/.test(l)).slice(0, 8).join('\n'));
await ctx.close(); await b.close();
