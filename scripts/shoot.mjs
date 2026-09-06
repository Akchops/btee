import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = process.env.OUT || 'shots';
fs.mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:4321';
const targets = JSON.parse(process.env.TARGETS || '[]');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const t of targets) {
  const ctx = await b.newContext({ viewport: { width: t.w, height: t.h }, deviceScaleFactor: t.dpr || 1, isMobile: t.w < 700 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await page.goto(base + t.path, { waitUntil: 'networkidle' });
  if (t.sel) {
    await page.evaluate(([sel, off]) => {
      const el = document.querySelector(sel); if (!el) return;
      const r = el.getBoundingClientRect();
      window.scrollTo(0, window.scrollY + r.top + (off || 0));
    }, [t.sel, t.off]);
    await page.waitForTimeout(1000);
  } else if (t.scroll != null) { await page.evaluate((y) => window.scrollTo(0, y * document.body.scrollHeight), t.scroll); await page.waitForTimeout(900); }
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${t.name}.png`, fullPage: !!t.full });
  if (errs.length) console.log(`  ! ${t.name}: ${errs.slice(0,3).join(' | ')}`);
  await ctx.close();
}
await b.close();
console.log('shot', targets.length);
