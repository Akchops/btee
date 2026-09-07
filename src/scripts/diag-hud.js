/** ─────────────────────────────────────────────────────────────────────────
 *  AURELIS — on-device diagnostic HUD.  TEST INFRASTRUCTURE, NOT DESIGN.
 *
 *  Loaded ONLY when localStorage['aurelis:diag'] === '1'. Normal visitors never
 *  fetch this file and never execute a line of it. It reads the production
 *  runtime; it does not alter it, except through the explicit manual controls,
 *  every use of which is recorded and attributed.
 *
 *  Deliberately styled as a tool: it must never be mistaken for the design.
 *  ───────────────────────────────────────────────────────────────────────── */

const K_SAMPLES = 'aurelis:diag:samples';
const K_EVENTS = 'aurelis:diag:events';
const N = (v, d = 1) => (typeof v === 'number' && isFinite(v) ? v.toFixed(d) : '—');

export function mount(api) {
  const root = document.documentElement;
  let samples = load(K_SAMPLES, []);
  let events = load(K_EVENTS, []);
  let running = true, last = performance.now(), raf = 0;
  let stress = null, fontShift = null, fallbackFace = 'measuring…', lastPaint = 0, mounted = false;

  /* ── attribution: the watchdog escalating is not the same event as a tester
        pressing a button, and the report must never conflate them ─────────── */
  function log(what, source, t) {
    events.push({ t: t || Date.now(), what, source, page: location.pathname });
    if (events.length > 60) events = events.slice(-60);
    save(K_EVENTS, events);
    paintValues();
  }

  /* ── font swap: measure a probe before and after the webfont resolves ───── */
  const probe = document.createElement('span');
  probe.textContent = 'Handgloves 0412 mmmmmmmmmm';
  probe.style.cssText = 'position:absolute;left:-9999px;top:0;white-space:nowrap;font-size:64px;font-family:var(--serif)';
  document.body.appendChild(probe);
  const beforeW = probe.getBoundingClientRect().width;
  fallbackFace = inferFallback();
  const fontsDone = document.fonts?.ready ?? Promise.resolve();
  const swapShifts = [];
  let fontsReady = false;
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput && !fontsReady) swapShifts.push(e.value); })
      .observe({ type: 'layout-shift', buffered: true });
  } catch {}
  fontsDone.then(() => {
    fontsReady = true;
    const afterW = probe.getBoundingClientRect().width;
    fontShift = { beforeW, afterW, deltaPct: beforeW ? ((afterW - beforeW) / beforeW) * 100 : null };
    paintValues();
  });

  function inferFallback() {
    // width-comparison inference. APPROXIMATE — labelled as inferred in the report.
    const mk = (ff) => { const s = document.createElement('span'); s.textContent = 'mmmmmmmmmmwwwwwiiiii';
      s.style.cssText = `position:absolute;left:-9999px;font-size:80px;white-space:nowrap;font-family:${ff}`;
      document.body.appendChild(s); const w = s.getBoundingClientRect().width; s.remove(); return w; };
    const target = mk("'Newsreader Fallback', serif");
    const cands = { Georgia: mk('Georgia, serif'), 'Times New Roman': mk("'Times New Roman', serif"),
                    'Noto Serif': mk("'Noto Serif', serif"), 'generic serif': mk('serif') };
    let best = null, bestD = Infinity;
    for (const [k, w] of Object.entries(cands)) { const d = Math.abs(w - target); if (d < bestD) { bestD = d; best = k; } }
    return bestD < 1.5 ? `${best} (inferred)` : `indeterminate (closest: ${best})`;
  }

  /* ── frame sampling ─────────────────────────────────────────────────────── */
  function tick(now) {
    const dt = now - last; last = now;
    if (running && dt > 0 && dt < 2000) {
      samples.push(+dt.toFixed(2));
      if (samples.length > 4000) samples = samples.slice(-4000);
    }
    if (stress) {
      const end = performance.now() + stress.perFrame;
      while (performance.now() < end) { /* deliberate main-thread pressure */ }
      stress.frames++;
      const elapsed = (now - stress.t0) / 1000;
      const escalated = api.stats().level > stress.startLevel;
      if (escalated) {
        log(`STRESS: watchdog escalated after ${elapsed.toFixed(1)}s / ${stress.frames} frames`, 'result');
        stress = null;
      } else if (elapsed > stress.maxSec) {
        log(`STRESS: NO auto escalation in ${stress.maxSec}s (${stress.frames} frames at ~${stress.perFrame}ms)`, 'result');
        stress = null;
      }
    }
    if (now - lastPaint > 240) { lastPaint = now; paintValues(); }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  const pct = (q) => { if (!samples.length) return null; const s = [...samples].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(s.length * q))]; };

  /* ── UI ─────────────────────────────────────────────────────────────────── */
  const el = document.createElement('div');
  el.id = 'aurelis-diag';
  el.innerHTML = `<style>
    #aurelis-diag{position:fixed;inset:auto 0 0 0;z-index:2147483647;font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;
      background:#0b0f12;color:#d8e6d8;border-top:2px solid #B4644F;max-height:52svh;overflow:auto;
      -webkit-text-size-adjust:100%;padding:8px 10px calc(8px + env(safe-area-inset-bottom))}
    #aurelis-diag.min{max-height:34px;overflow:hidden}
    #aurelis-diag b{color:#fff;font-weight:600}
    #aurelis-diag .hd{display:flex;gap:8px;align-items:center;justify-content:space-between;position:sticky;top:-8px;background:#0b0f12;padding:2px 0 6px}
    #aurelis-diag .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:2px 12px;margin:4px 0}
    #aurelis-diag .r{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid #1d2a22}
    #aurelis-diag .k{color:#7f9c86}
    #aurelis-diag button{background:#16211b;color:#d8e6d8;border:1px solid #2c4034;padding:6px 8px;margin:2px 2px 0 0;
      font:inherit;border-radius:0;min-height:34px;cursor:pointer}
    #aurelis-diag button.on{background:#B4644F;color:#0b0f12;border-color:#B4644F}
    #aurelis-diag h4{margin:10px 0 2px;color:#B4644F;font-size:11px;letter-spacing:.08em;text-transform:uppercase}
    #aurelis-diag ol{margin:0;padding-left:18px}
    #aurelis-diag li{margin:2px 0}
    #aurelis-diag textarea{width:100%;height:120px;background:#06090b;color:#d8e6d8;border:1px solid #2c4034;font:inherit;padding:6px}
    #aurelis-diag .warn{color:#e0a58f}
  </style><div class="hd"><b>AURELIS diagnostic</b><span><button data-a="min">–</button></span></div><div class="bd"></div>`;
  document.body.appendChild(el);
  const bd = el.querySelector('.bd');

  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'min') el.classList.toggle('min');
    if (a === 'run') { running = !running; log(running ? 'measurement started' : 'measurement stopped', 'manual'); }
    if (a === 'reset') { samples = []; events = []; save(K_SAMPLES, []); save(K_EVENTS, []); log('reset', 'manual'); }
    if (a === 'restore') { api.restore(); log('restored full quality', 'manual'); }
    if (a?.startsWith('lvl')) { const n = +a.slice(3); api.setLevel(n, 'manual'); }
    if (a === 'stress') {
      if (stress) { stress = null; log('stress cancelled', 'manual'); }
      else {
        stress = { perFrame: 55, frames: 0, t0: performance.now(), maxSec: 30, startLevel: api.stats().level };
        log('stress started \u2014 runs until the watchdog escalates or 30s elapse', 'manual');
      }
    }
    if (a === 'copy') {
      const t = el.querySelector('textarea'); t.value = report(); t.select();
      navigator.clipboard?.writeText?.(t.value).then(() => log('copied to clipboard', 'manual'),
        () => log('clipboard blocked (plain http) — select the text manually', 'manual'));
    }
    paintValues();
  });

  const V = {};
  function row(k, id, cls = '') {
    return `<div class="r"><span class="k">${k}</span><span data-v="${id}" class="${cls}">—</span></div>`;
  }
  function set(id, v, warn = false) {
    const n = V[id] || (V[id] = el.querySelector(`[data-v="${id}"]`));
    if (!n) return;
    if (n.textContent !== String(v)) n.textContent = v;
    n.classList.toggle('warn', !!warn);
  }

  /* Built once. Rebuilding this every frame made the buttons undickable and put
     the HUD's own cost inside the measurement it was taking. */
  function buildShell() {
    bd.innerHTML = `
      <div class="g">
        ${row('frame now', 'now')}${row('fps est.', 'fps')}${row('p50', 'p50')}
        ${row('p90', 'p90')}${row('p99', 'p99')}${row('samples', 'n')}
      </div>
      <div class="g">
        ${row('watchdog level', 'lvl')}${row('escalations (auto)', 'auto')}${row('device-hint steps', 'hint')}
        ${row('manual actions', 'man')}${row('site loop', 'loop')}${row('slow streak', 'streak')}${row('stress result', 'stressres')}${row('active degradation', 'step')}${row('dapple', 'dap')}
        ${row('dapple shed', 'shed')}${row('points drawn', 'pts')}${row('canvas DPR cap', 'cap')}
        ${row('devicePixelRatio', 'dpr')}${row('viewport', 'vp')}${row('orientation', 'ori')}
        ${row('reduced motion', 'rm')}${row('View Transitions', 'vt')}${row('survey VT name', 'vtn')}
        ${row('fonts', 'fonts')}${row('fallback face', 'fb')}${row('font-swap \u0394width', 'swap')}
        ${row('CLS before fonts', 'cls')}${row('page', 'page')}
      </div>
      <h4>Controls</h4>
      <button data-a="run" class="on">Stop</button>
      <button data-a="reset">Reset</button>
      <button data-a="stress" data-v="stressbtn">Stress until escalation</button>
      <button data-a="restore">Restore full quality</button><br>
      ${[0,1,2,3,4,5].map((n) => `<button data-a="lvl${n}" data-lvl="${n}">L${n}</button>`).join('')}
      <div class="k" style="margin-top:4px">Manual levels prove each degraded state <b>renders</b>. They do NOT prove the
        watchdog <b>detects</b> real pressure — only an <span class="warn">auto</span> escalation during Stress does that.
        <b>Device-hint</b> steps are taken from coarse hardware hints at load; they are not detection either.</div>
      <h4>Checklist</h4>
      <ol>
        <li>Scroll the homepage top to bottom. Watch p90 and stutter.</li>
        <li>Stop at <b>beat 01</b> (survey resolving) and <b>beat 06</b> (trees \u2192 stars). Note frame time in each.</li>
        <li>Navigate <b>home \u2192 /clearings/</b>. Does the survey field morph coherently or awkwardly?</li>
        <li>Rotate to landscape, repeat 1\u20133. Then back to portrait.</li>
        <li><b>Hard reload with cache cleared.</b> Watch the hero line for a font jump; read font-swap \u0394width above.</li>
        <li>Turn <b>Reduce Motion ON</b> in OS settings, reload. Dapple must stay and stop; survey renders complete. Turn it off.</li>
        <li>On /clearings/, <b>one tap</b> on a clearing selects it and opens its record. The record\u2019s link opens the villa.</li>
        <li>Enable <b>VoiceOver / TalkBack</b>, swipe through the 24 clearing controls on /clearings/.</li>
        <li>Press <b>Stress</b> while scrolling. Does <span class="warn">escalations (auto)</span> rise before you see stutter?</li>
      </ol>
      <h4>Report</h4>
      <button data-a="copy">Build &amp; copy report</button>
      <textarea readonly placeholder="Press Build & copy report. On plain http the clipboard is blocked \u2014 select this text and copy manually."></textarea>`;
  }

  function paintValues() {
    if (!mounted || el.classList.contains('min')) return;
    const s = api.stats();
    const auto = events.filter((e) => e.source === 'auto').length;
    const hint = events.filter((e) => e.source === 'hint').length;
    const man = events.filter((e) => e.source === 'manual').length;
    set('now', N(samples.at(-1)) + ' ms');
    set('fps', pct(0.5) ? N(1000 / pct(0.5), 0) : '\u2014');
    set('p50', N(pct(0.5)) + ' ms'); set('p90', N(pct(0.9)) + ' ms'); set('p99', N(pct(0.99)) + ' ms');
    set('n', samples.length);
    set('lvl', `L${s.level}`, s.level > 0);
    set('auto', auto, auto > 0); set('hint', hint); set('man', man);
    set('loop', s.running === false ? 'STOPPED' : `${s.loopFrames} frames`, s.running === false);
    set('streak', `${s.slowStreak} / 45`, s.slowStreak > 20);
    set('step', s.stepName); set('dap', s.dappleState);
    set('shed', s.dappleShed ? 'YES' : 'no', s.dappleShed);
    set('pts', `${s.drawn} / ${s.total}`); set('cap', s.dprCap);
    set('dpr', window.devicePixelRatio); set('vp', `${innerWidth}\u00d7${innerHeight}`);
    set('ori', innerWidth > innerHeight ? 'landscape' : 'portrait');
    set('rm', matchMedia('(prefers-reduced-motion: reduce)').matches ? 'REDUCE' : 'no-preference');
    set('vt', 'startViewTransition' in document ? 'available' : 'unavailable');
    const d = document.querySelector('.datum');
    set('vtn', d && getComputedStyle(d).viewTransitionName && getComputedStyle(d).viewTransitionName !== 'none' ? 'in use' : 'not applied');
    set('fonts', fontsReady ? 'loaded' : 'loading\u2026');
    set('fb', fallbackFace);
    set('swap', fontShift ? N(fontShift.deltaPct, 2) + ' %' : '\u2014', fontShift && Math.abs(fontShift.deltaPct) > 1);
    set('cls', swapShifts.length ? N(swapShifts.reduce((a, b) => a + b, 0), 4) : '0');
    set('page', location.pathname);
    const sb = el.querySelector('[data-a="stress"]');
    if (sb) { sb.textContent = stress ? `Stressing\u2026 ${((performance.now() - stress.t0) / 1000).toFixed(0)}s \u2014 tap to stop` : 'Stress until escalation'; sb.classList.toggle('on', !!stress); }
    const res = events.filter((e) => e.source === 'result').at(-1);
    set('stressres', res ? res.what.replace('STRESS: ', '') : 'not run', !!res && res.what.includes('NO auto'));
    const run = el.querySelector('[data-a="run"]');
    if (run) { run.textContent = running ? 'Stop' : 'Start'; run.classList.toggle('on', running); }
    el.querySelectorAll('[data-lvl]').forEach((b) => b.classList.toggle('on', +b.dataset.lvl === s.level));
  }

  function report() {
    const s = api.stats();
    const autoEv = events.filter((e) => e.source === 'auto');
    const hintEv = events.filter((e) => e.source === 'hint');
    const manEv = events.filter((e) => e.source === 'manual');
    return [
      'AURELIS on-device diagnostic',
      `when            ${new Date().toISOString()}`,
      `page            ${location.pathname}`,
      `ua              ${navigator.userAgent}`,
      `viewport        ${innerWidth}x${innerHeight} @ dpr ${window.devicePixelRatio} (${innerWidth > innerHeight ? 'landscape' : 'portrait'})`,
      `hw hints        cores ${navigator.hardwareConcurrency ?? 'n/a'}, memory ${navigator.deviceMemory ?? 'n/a'}`,
      '',
      'FRAME TIME',
      `samples         ${samples.length}`,
      `p50 / p90 / p99 ${N(pct(0.5))} / ${N(pct(0.9))} / ${N(pct(0.99))} ms`,
      `fps est.        ${pct(0.5) ? N(1000 / pct(0.5), 0) : '—'}`,
      `worst           ${N(Math.max(...(samples.length ? samples : [0])))} ms`,
      '',
      'DEGRADATION',
      `watchdog level  L${s.level} (${s.stepName})`,
      `site loop       ${s.running === false ? 'STOPPED' : s.loopFrames + ' frames'}, slow streak ${s.slowStreak}/45`,
      `dapple          ${s.dappleState}${s.dappleShed ? ' — SHED' : ''}`,
      `points drawn    ${s.drawn} / ${s.total}`,
      `canvas dpr cap  ${s.dprCap}`,
      `AUTO escalations (watchdog DETECTED real frame pressure): ${autoEv.length}`,
      ...autoEv.map((e) => `  auto   ${new Date(e.t).toISOString().slice(11, 19)}  ${e.what}  [${e.page}]`),
      `DEVICE-HINT steps (taken from coarse hardware hints at load, NOT detection): ${hintEv.length}`,
      ...hintEv.map((e) => `  hint   ${new Date(e.t).toISOString().slice(11, 19)}  ${e.what}  [${e.page}]`),
      `STRESS RESULT   ${events.filter((e) => e.source === 'result').at(-1)?.what.replace('STRESS: ', '') ?? 'stress test not run'}`,
      `MANUAL actions (prove rendering only, prove nothing about detection): ${manEv.length}`,
      ...manEv.slice(-12).map((e) => `  manual ${new Date(e.t).toISOString().slice(11, 19)}  ${e.what}  [${e.page}]`),
      '',
      'ENVIRONMENT',
      `reduced motion  ${matchMedia('(prefers-reduced-motion: reduce)').matches ? 'REDUCE' : 'no-preference'}`,
      `View Transitions ${'startViewTransition' in document ? 'available' : 'unavailable'}`,
      '',
      'TYPOGRAPHY',
      `fonts           ${fontsReady ? 'loaded' : 'STILL LOADING'}`,
      `fallback face   ${fallbackFace}   (inferred by width comparison — approximate)`,
      `font-swap Δwidth ${fontShift ? N(fontShift.deltaPct, 2) + ' %' : 'not measured'}  (${fontShift ? `${N(fontShift.beforeW)}px → ${N(fontShift.afterW)}px` : ''})`,
      `CLS before fonts ${swapShifts.length ? N(swapShifts.reduce((a, b) => a + b, 0), 4) : '0'}`,
      '',
      'NOTE: frame samples persist across navigations within this session. Reset between scenarios.',
    ].join('\n');
  }

  function load(k, d) { try { return JSON.parse(sessionStorage.getItem(k)) ?? d; } catch { return d; } }
  function save(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} }
  addEventListener('pagehide', () => { save(K_SAMPLES, samples); cancelAnimationFrame(raf); });
  addEventListener('resize', paintValues, { passive: true });
  buildShell();
  mounted = true;
  // registered only now: any escalation that fired before the HUD mounted — the
  // device-hint step in particular — is replayed into the log on registration.
  api.onEscalate((level, source, t) => log(`degrade \u2192 L${level}`, source, t));
  paintValues();
}
