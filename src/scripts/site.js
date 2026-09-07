/** One rAF loop for the whole site. Reads scroll once, writes once, exits early
 *  when nothing changed. Everything degrades from here. */
import { mountField } from './field-canvas.js';

const root = document.documentElement;
const mq = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = mq.matches;
mq.addEventListener?.('change', (e) => { reduced = e.matches; });

/* ── the live rail: steps between real stations, never interpolates ───── */
const rail = document.querySelector('[data-rail]');
const railEls = rail && {
  elev: rail.querySelector('[data-rail-elev]'),
  time: rail.querySelector('[data-rail-time]'),
  note: rail.querySelector('[data-rail-note]'),
};
const beats = [...document.querySelectorAll('[data-beat]')];
if (railEls && beats.length && 'IntersectionObserver' in window) {
  let current = null;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) {
      const b = e.target;
      if (b === current) continue;
      current = b;
      railEls.elev.textContent = b.dataset.elev ?? '';
      railEls.time.textContent = b.dataset.time ?? '';
      railEls.note.textContent = b.dataset.note ?? '';
      if (b.dataset.ground) {
        root.dataset.ground = b.dataset.ground;
        if (!root.dataset.nightfall) {
          root.style.setProperty('--g-shade', b.dataset.ground === 'shade' ? '1' : '0');
          root.style.setProperty('--g-night', b.dataset.ground === 'night' ? '1' : '0');
        }
      }
    }
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  beats.forEach((b) => io.observe(b));
}

/* ── scroll-progress ranges → CSS custom properties + field progress ──── */
const ranges = [...document.querySelectorAll('[data-progress]')].map((el) => ({
  el, name: el.dataset.progress, field: null, last: -1,
}));

const fields = [];
document.querySelectorAll('[data-field]').forEach((host) => {
  const api = mountField(host, { mode: host.dataset.field, reduced });
  if (!api) return;
  fields.push(api);
  const owner = host.closest('[data-progress]');
  const r = ranges.find((x) => x.el === owner);
  if (r) r.field = api; else api.progress = 1;
});

function progressOf(el) {
  const r = el.getBoundingClientRect();
  const travel = r.height - innerHeight;
  if (travel <= 0) return r.top < innerHeight && r.bottom > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, -r.top / travel));
}

/* ── adaptive watchdog: the primary degradation mechanism ─────────────── */
const watchdog = { frames: 0, slow: 0, level: 0, t: performance.now() };
const STEPS = ['full quality', 'canvas DPR reduced', 'one dapple layer', 'dapple stopped',
               'static but complete', 'field thinned'];
const MAX_LEVEL = STEPS.length - 1;
const escalateListeners = [];
const escalateLog = [];

/** Idempotent: applies the full state for a level rather than a delta, so a
 *  level can be entered, proven and left again. Order of shedding is unchanged. */
function applyLevel(n) {
  fields.forEach((f) => f.setDprCap(n >= 1 ? 1.5 : 2));
  if (n >= 3) root.dataset.dapple = 'static';
  else if (n >= 2) root.dataset.dapple = 'single';
  else delete root.dataset.dapple;
  if (n >= 4) root.dataset.motion = 'static'; else delete root.dataset.motion;
  fields.forEach((f) => f.degrade(n >= 5 ? 900 : Infinity));
  watchdog.level = n;
  const src = applyLevel.source || 'auto';
  escalateLog.push({ n, src, t: Date.now() });
  for (const fn of escalateListeners) fn(n, src);
}
function escalate(source) {
  if (watchdog.level >= MAX_LEVEL) return;
  applyLevel.source = source || 'auto';
  applyLevel(watchdog.level + 1);
  applyLevel.source = null;
}

let running = false, needsDraw = true;
function frame(now) {
  if (document.hidden) { running = false; return; }
  const dt = now - watchdog.t; watchdog.t = now; watchdog.frames++;
  if (dt > 34) { if (++watchdog.slow > 45) { escalate('auto'); watchdog.slow = 0; } } else if (watchdog.slow > 0) watchdog.slow--;

  let changed = false;
  for (const r of ranges) {
    const p = progressOf(r.el);
    if (Math.abs(p - r.last) > 0.0008) {
      r.last = p; changed = true;
      if (r.name) root.style.setProperty(`--p-${r.name}`, p.toFixed(4));
      if (r.name === 'nightfall') {
        if (p > 0 && p < 1) root.dataset.nightfall = 'active'; else delete root.dataset.nightfall;
        const t = Math.max(0, Math.min(1, (p - 0.04) / 0.52));
        root.style.setProperty('--g-shade', '0');
        root.style.setProperty('--g-night', String(t * t * (3 - 2 * t)));
      }
      if (r.field) r.field.progress = reduced ? (p > 0.5 ? 1 : 0) : p;
    }
  }
  if (changed || needsDraw) { for (const f of fields) if (f.onScreen) f.draw(); needsDraw = false; }
  requestAnimationFrame(frame);
}
function start() { if (!running) { running = true; watchdog.t = performance.now(); requestAnimationFrame(frame); } }
let idleT;
addEventListener('scroll', () => {
  start();
  if (!root.dataset.scrolling) root.dataset.scrolling = '1';
  clearTimeout(idleT);
  idleT = setTimeout(() => { delete root.dataset.scrolling; }, 190);
}, { passive: true });
addEventListener('resize', () => { needsDraw = true; start(); }, { passive: true });
document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
start();

/* ── conservative start from optional coarse hints (never authoritative) ─ */
const mem = navigator.deviceMemory, cores = navigator.hardwareConcurrency;
if ((typeof mem === 'number' && mem <= 4) || (typeof cores === 'number' && cores <= 4)) { escalate('hint'); }

/* ── the survey instrument: selection is explicit, one tap, on every device ─ */
document.querySelectorAll('[data-instrument]').forEach((inst) => {
  const record = inst.querySelector('[data-record]');
  const voids = [...inst.querySelectorAll('[data-void]')];
  const select = (el) => {
    voids.forEach((v) => v.setAttribute('aria-pressed', String(v === el)));
    if (!record) return;
    if (!el) { record.hidden = true; return; }
    record.hidden = false;
    record.querySelectorAll('[data-f]').forEach((f) => { f.textContent = el.dataset[f.dataset.f] ?? ''; });
    const link = record.querySelector('[data-open]');
    if (link) { link.href = el.dataset.href; link.querySelector('[data-open-name]').textContent = el.dataset.name; }
  };
  voids.forEach((v) => {
    v.addEventListener('click', () => select(v));
    v.addEventListener('focus', () => select(v));
    if (matchMedia('(hover:hover)').matches) v.addEventListener('pointerenter', () => select(v));
  });
  inst.addEventListener('keydown', (e) => { if (e.key === 'Escape') select(null); });
});


/* ── the plan draws once, and never again ────────────────────────────── */
document.querySelectorAll('.plan--draw').forEach((svg) => {
  // vector-effect: non-scaling-stroke renders dashes in SCREEN units while
  // getTotalLength() reports user units — so convert, or the plan draws in pieces.
  const measure = () => {
    const vb = svg.viewBox?.baseVal;
    const k = vb && vb.width ? (svg.getBoundingClientRect().width / vb.width) : 1;
    svg.querySelectorAll('path').forEach((p) => {
      try { p.style.setProperty('--len', String(Math.ceil(p.getTotalLength() * k) + 6)); } catch {}
    });
  };
  measure();
  let mt; addEventListener('resize', () => { clearTimeout(mt); mt = setTimeout(measure, 200); }, { passive: true });
  if (!('IntersectionObserver' in window)) { svg.classList.add('is-drawn'); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { svg.classList.add('is-drawn'); io.disconnect(); }
  }), { threshold: 0.35 });
  io.observe(svg);
});

/* ── reserve: real validation, designed success state, no implied delivery ── */
const form = document.querySelector('[data-reserve]');
if (form) {
  const ack = document.querySelector('[data-ack]');
  const msg = (el) => el.validity.valueMissing ? 'We need this one.'
    : el.validity.typeMismatch ? 'That address does not look complete.' : 'Please check this.';
  const check = (el) => {
    const f = el.closest('.f'); if (!f) return true;
    const ok = el.checkValidity();
    f.toggleAttribute('data-invalid', !ok);
    const e = f.querySelector('[data-err]'); if (e) e.textContent = ok ? '' : msg(el);
    return ok;
  };
  form.querySelectorAll('input, select, textarea').forEach((el) => {
    el.addEventListener('blur', () => check(el));
    el.addEventListener('input', () => { if (el.closest('.f')?.hasAttribute('data-invalid')) check(el); });
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = [...form.querySelectorAll('input, select, textarea')];
    const bad = fields.filter((el) => !check(el));
    if (bad.length) { bad[0].focus(); return; }
    form.hidden = true; if (ack) { ack.hidden = false; ack.querySelector('.d3')?.focus?.(); ack.scrollIntoView({ block: 'center' }); }
  });
  document.querySelector('[data-ack-back]')?.addEventListener('click', () => {
    if (ack) ack.hidden = true; form.hidden = false; form.querySelector('input')?.focus();
  });
}


/* ── Opt-in diagnostic HUD. Test infrastructure, not part of the experience.
      Normal visitors never fetch or execute it: the module is only imported
      when the flag is present, which only the /diagnostic/ page sets. ─────── */
try {
  if (localStorage.getItem('aurelis:diag') === '1') {
    import('./diag-hud.js').then((m) => m.mount({
      stats() {
        const s = fields[0]?.stats ?? { total: 0, drawn: 0, dprCap: 2 };
        return {
          level: watchdog.level, stepName: STEPS[watchdog.level],
          dappleState: root.dataset.dapple ?? 'two layers, drifting',
          dappleShed: root.dataset.dapple === 'static',
          total: s.total, drawn: s.drawn, dprCap: s.dprCap,
          loopFrames: watchdog.frames, slowStreak: watchdog.slow, running,
        };
      },
      setLevel(n, source) { applyLevel.source = source; applyLevel(Math.max(0, Math.min(MAX_LEVEL, n))); applyLevel.source = null; },
      restore() { applyLevel.source = 'manual'; applyLevel(0); applyLevel.source = null; },
      onEscalate(fn) { for (const e of escalateLog) fn(e.n, e.src, e.t); escalateListeners.push(fn); },
    }));
  }
} catch { /* storage unavailable — the site is unaffected */ }
