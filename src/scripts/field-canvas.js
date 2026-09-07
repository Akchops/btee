/** The survey field, drawn. Geometry and appearance come from src/lib/field.js,
 *  which is the same module the CI invariant test asserts against. */
import { makeProjection, deviceCoords, lerpAppearance, appearance } from '../lib/field.js';
import { settleOffset } from '../lib/hash.js';
import island from '../../data/island.json';

const INK = '#242720', SHEET = '#EAE6DB';
let sharedBuffer = null, loading = null;

async function positions() {
  if (sharedBuffer) return sharedBuffer;
  if (!loading) loading = fetch('/survey/trees.bin')
    .then((r) => { if (!r.ok) throw new Error('trees.bin ' + r.status); return r.arrayBuffer(); })
    .then((b) => (sharedBuffer = new Uint16Array(b)));
  return loading;
}

const BUCKETS = 10;
/** A ladder of pre-rendered sprites. Drawing them 1:1 avoids per-call scaling,
 *  which is what actually costs during a fast scroll. */
function spriteLadder(colour, minR, maxR, dpr) {
  const out = [];
  for (let i = 0; i < BUCKETS; i++) {
    const radius = minR + ((maxR - minR) * i) / (BUCKETS - 1);
    const r = Math.max(0.6, radius * dpr), size = Math.ceil(r * 5) + 2;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); const mid = size / 2;
    const g = x.createRadialGradient(mid, mid, 0, mid, mid, r * 2.4);
    g.addColorStop(0, colour); g.addColorStop(0.26, colour + '9a'); g.addColorStop(0.55, colour + '2a'); g.addColorStop(1, colour + '00');
    x.fillStyle = g; x.beginPath(); x.arc(mid, mid, r * 2.4, 0, Math.PI * 2); x.fill();
    out.push({ c, half: size / 2 });
  }
  return out;
}
const bucketOf = (radius, minR, maxR) =>
  Math.max(0, Math.min(BUCKETS - 1, Math.round(((radius - minR) / (maxR - minR)) * (BUCKETS - 1))));

export function mountField(host, { mode = 'survey', reduced = false } = {}) {
  const canvas = host.querySelector('canvas');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d', { alpha: true }) : null;
  if (!ctx) { host.dataset.fieldState = 'failed'; return null; }

  let pos = null, coords = null, proj = null, dpr = 1, W = 0, H = 0;
  let progress = mode === 'survey' ? (reduced ? 1 : 0) : 0;
  let count = 0, keepLevel = Infinity, dprCap = 2, dirty = true;
  let markLadder = null, starLadder = null;

  function layout() {
    const rect = host.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width)); H = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    proj = makeProjection({ w: W, h: H }, island.extent_m);
    if (pos) coords = deviceCoords(pos, proj, dpr, mode);
    markLadder = spriteLadder(INK, 1.0, 1.0, dpr);
    starLadder = spriteLadder(SHEET, 0.42, 2.32, dpr);
    placeVoids();
    dirty = true;
  }

  function placeVoids() {
    if (!proj) return;
    host.querySelectorAll('[data-void]').forEach((el) => {
      const x = +el.dataset.cx, y = +el.dataset.cy, r = +el.dataset.r;
      const px = proj.ox + x * proj.scale, py = proj.oy + (island.extent_m.h - y) * proj.scale;
      const pr = Math.max(22, r * proj.scale);
      el.style.left = px + 'px'; el.style.top = py + 'px';
      el.style.setProperty('--vr', pr + 'px');
    });
  }

  function draw() {
    if (!coords || !dirty) return;
    dirty = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const nightMix = mode === 'survey' ? 0 : progress;
    ctx.globalCompositeOperation = nightMix > 0.5 ? 'lighter' : 'source-over';
    for (let i = 0; i < count; i++) {
      if (pos[i * 3 + 2] >= keepLevel) continue;
      let alpha, radius;
      if (mode === 'survey') {
        const a = appearance(i, 'survey', progress);
        if (!a.alpha) continue;
        // short per-point fade in, index-seeded: marks arrive like rain, not a sweep
        alpha = Math.min(1, (progress - settleOffset(i)) / 0.06);
        radius = a.radius;
      } else {
        const a = lerpAppearance(i, progress);
        alpha = a.alpha; radius = a.radius;
      }
      if (alpha <= 0.004) continue;
      const night = nightMix > 0.5;
      const sp = night ? starLadder[bucketOf(radius, 0.42, 2.32)] : markLadder[0];
      ctx.globalAlpha = alpha;
      ctx.drawImage(sp.c, coords[i * 2] - sp.half, coords[i * 2 + 1] - sp.half);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  const api = {
    set progress(v) { const n = Math.max(0, Math.min(1, v)); if (n !== progress) { progress = n; dirty = true; } },
    get progress() { return progress; },
    draw, layout,
    degrade(level) { if (level !== keepLevel) { keepLevel = level; dirty = true; } },
    setDprCap(c) { if (c !== dprCap) { dprCap = c; layout(); } },
    get ready() { return !!coords; },
    get onScreen() { const r = host.getBoundingClientRect(); return r.bottom > -200 && r.top < innerHeight + 200; },
  };

  positions().then((p) => {
    pos = p; count = p.length / 3;
    layout(); host.dataset.fieldState = 'live';
    if (reduced) api.progress = 1;
    requestAnimationFrame(() => { dirty = true; draw(); });
  }).catch(() => { host.dataset.fieldState = 'failed'; });

  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layout(); draw(); }, 150); }, { passive: true });
  return api;
}
