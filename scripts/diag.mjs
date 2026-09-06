import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext({ viewport:{width:1440,height:900} })).newPage();
const bad = [];
p.on('response', r => { if (r.status() >= 400) bad.push(r.status()+' '+r.url()); });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
p.on('console', m => { if (m.type()==='error') console.log('CONSOLE:', m.text()); });
await p.goto('http://localhost:4321/clearings/', { waitUntil:'networkidle' });
await p.waitForTimeout(1200);
console.log('4xx/5xx:', bad.length ? bad : 'none');
console.log(await p.evaluate(() => {
  const f = document.querySelector('.field');
  const c = f?.querySelector('canvas');
  const r = document.querySelector('[data-record]');
  return {
    fieldState: f?.dataset.fieldState, canvasW: c?.width, canvasH: c?.height,
    fieldBox: f ? JSON.stringify(f.getBoundingClientRect().toJSON()) : null,
    voids: document.querySelectorAll('[data-void]').length,
    firstVoidStyle: document.querySelector('[data-void]')?.getAttribute('style'),
    recordHidden: r?.hasAttribute('hidden'), recordDisplay: r ? getComputedStyle(r).display : null,
  };
}));
await b.close();
