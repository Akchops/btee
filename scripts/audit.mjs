import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const base = 'http://localhost:4321';
const pages = ['/', '/clearings/', '/clearings/0412/', '/reserve/', '/south-end/', '/contents/', '/practical/', '/404/'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const seen = new Set(); const problems = [];
for (const path of pages) {
  for (const vp of [{ w: 1920, h: 1080, n: 'wide' }, { w: 1440, h: 900, n: 'desktop' }, { w: 834, h: 1112, n: 'tablet' }, { w: 430, h: 932, n: 'largemobile' }, { w: 360, h: 740, n: 'narrowmobile' }]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
    page.on('response', (r) => r.status() >= 400 && errs.push(`${r.status()} ${r.url()}`));
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    // horizontal overflow
    const ovf = await page.evaluate(() => {
      const de = document.documentElement;
      const wide = [...document.querySelectorAll('body *')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > de.clientWidth + 2 || r.left < -2) && getComputedStyle(el).position !== 'fixed';
      }).slice(0, 4).map((el) => el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0]);
      return { scrollW: de.scrollWidth, clientW: de.clientWidth, wide };
    });
    if (ovf.scrollW > ovf.clientW + 1) problems.push(`P0 OVERFLOW ${path} ${vp.n}: ${ovf.scrollW}>${ovf.clientW} — ${ovf.wide.join(', ')}`);
    if (errs.length) errs.forEach((e) => { const k = path + e; if (!seen.has(k)) { seen.add(k); problems.push(`P0 CONSOLE ${path} ${vp.n}: ${e.slice(0, 130)}`); } });
    if (vp.n === 'desktop') {
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      for (const v of res.violations) {
        const k = path + v.id;
        if (!seen.has(k)) { seen.add(k); problems.push(`${v.impact === 'critical' || v.impact === 'serious' ? 'P1' : 'P2'} A11Y ${path}: ${v.id} (${v.impact}, ${v.nodes.length}) — ${v.nodes[0]?.target?.join(' ')}`); }
      }
      const meta = await page.evaluate(() => ({ title: document.title, desc: document.querySelector('meta[name=description]')?.content?.length || 0, h1: document.querySelectorAll('h1').length, lang: document.documentElement.lang }));
      if (!meta.title || meta.title.length < 8) problems.push(`P1 META ${path}: weak title`);
      if (meta.h1 !== 1) problems.push(`P1 META ${path}: ${meta.h1} h1 elements`);
      if (!meta.desc) problems.push(`P1 META ${path}: no description`);
    }
    await ctx.close();
  }
}
// internal link check
const ctx = await b.newContext(); const page = await ctx.newPage();
await page.goto(base + '/contents/', { waitUntil: 'networkidle' });
const links = await page.evaluate(() => [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')));
for (const href of [...new Set(links)]) {
  const r = await page.request.get(base + href);
  if (!r.ok()) problems.push(`P0 LINK ${href} → ${r.status()}`);
}
await b.close();
console.log(problems.length ? problems.sort().join('\n') : 'no automated problems found');
console.log(`\n${problems.length} finding(s)`);
