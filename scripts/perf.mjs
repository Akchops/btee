import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
// reduced motion
const rm = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const p1 = await rm.newPage();
await p1.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
await p1.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.12));
await p1.waitForTimeout(1200);
console.log('reduced-motion:', await p1.evaluate(() => ({
  dappleAnim: getComputedStyle(document.querySelector('.dapple > i')).animationName,
  fieldState: document.querySelector('.field')?.dataset.fieldState,
  canvasHasInk: (() => { const c = document.querySelector('.field canvas'); if (!c) return null;
    const x = c.getContext('2d'); const d = x.getImageData(0,0,c.width,c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4000) if (d[i] > 8) n++; return n > 0; })(),
})));
await p1.screenshot({ path: 'shots/qa6/reduced.png' });
await rm.close();

// no-JS
const nj = await b.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
const p2 = await nj.newPage();
await p2.goto('http://localhost:4321/', { waitUntil: 'load' });
await p2.waitForTimeout(700);
console.log('no-JS: text chars =', await p2.evaluate(() => document.body.innerText.replace(/\s+/g,' ').length),
            '| static field visible =', await p2.evaluate(() => !!document.querySelector('.field__static')?.getBoundingClientRect().width));
await p2.screenshot({ path: 'shots/qa6/nojs.png' });
await nj.close();

// scroll frame budget
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p3 = await ctx.newPage();
await p3.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
const frames = await p3.evaluate(async () => {
  const ts = []; let last = performance.now(); let n = 0;
  return await new Promise((res) => {
    const step = () => { const now = performance.now(); ts.push(now - last); last = now;
      window.scrollBy(0, 26);
      if (++n < 260) requestAnimationFrame(step); else res(ts.slice(6)); };
    requestAnimationFrame(step);
  });
});
frames.sort((a, b) => a - b);
const pct = (q) => frames[Math.floor(frames.length * q)].toFixed(1);
console.log(`scroll frame time: p50 ${pct(0.5)}ms  p90 ${pct(0.9)}ms  p99 ${pct(0.99)}ms  max ${frames.at(-1).toFixed(1)}ms`);
const wt = await p3.evaluate(() => { const t = performance.getEntriesByType('navigation')[0];
  const res = performance.getEntriesByType('resource');
  return { transferKB: +(res.reduce((s,r)=>s+(r.transferSize||0),0)/1024).toFixed(0),
           requests: res.length, domContentLoaded: Math.round(t.domContentLoadedEventEnd) }; });
console.log('page weight:', JSON.stringify(wt));
console.log('CLS:', await p3.evaluate(() => new Promise((r) => { let v = 0;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value; }).observe({ type: 'layout-shift', buffered: true });
  setTimeout(() => r(v.toFixed(4)), 500); })));
await b.close();
