/** The survey field — pure geometry and appearance. No DOM, no canvas.
 *
 *  THE CENTRAL INVARIANT
 *  Position is a function of (island metres, projection, dpr) ALONE.
 *  `state` is accepted by deviceCoords only so that the CI probe can prove it
 *  is ignored. There is no code path here that lets a state change a coordinate.
 */
import { magnitude, twinklePhase, settleOffset } from './hash.js';

export const STATES = ['survey', 'night'];
const INSET = 0.035;

/** The trees' real extent. The island's mass sits off-centre inside its bounding
 *  box, so fitting the box left the drawing visibly off-centre on screen. */
export function treeBounds(positions) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < positions.length / 3; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1];
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

/** Contain-fit of an extent into a viewport box, centred on that extent. */
export function makeProjection({ w, h }, extent) {
  const e = extent.x0 === undefined ? { x0: 0, y0: 0, x1: extent.w, y1: extent.h, w: extent.w, h: extent.h } : extent;
  const availW = w * (1 - INSET * 2), availH = h * (1 - INSET * 2);
  const scale = Math.min(availW / e.w, availH / e.h);
  return { scale, ox: (w - e.w * scale) / 2, oy: (h - e.h * scale) / 2, extent: e };
}

/** Device-pixel coordinates for every point. Emits, rather than draws, so the
 *  same code path can be asserted in CI. `state` is deliberately unused. */
export function deviceCoords(positions, proj, dpr, state) {
  const n = positions.length / 3;
  const out = new Int32Array(n * 2);
  const { scale, ox, oy, extent } = proj;
  for (let i = 0; i < n; i++) {
    const xm = positions[i * 3], ym = positions[i * 3 + 1];
    // y is flipped: island north is up, canvas y grows downward
    out[i * 2]     = Math.round((ox + (xm - extent.x0) * scale) * dpr);
    out[i * 2 + 1] = Math.round((oy + (extent.y1 - ym) * scale) * dpr);
  }
  return out;
}

/** Appearance only. Never touches position. */
export function appearance(i, state, p) {
  const m = magnitude(i);
  if (state === 'survey') {
    return { fill: 'ink', radius: 1.0, alpha: p >= settleOffset(i) ? 1 : 0, composite: 'source-over' };
  }
  const mm = m * m * m;              // power law: most faint, a few bright
  return {
    fill: 'sheet',
    radius: 0.42 + mm * 1.9,
    alpha: 0.20 + Math.pow(m, 1.7) * 0.72,
    composite: 'lighter',
    phase: twinklePhase(i),
  };
}

/** Interpolated appearance across the transformation. p: 0 = survey, 1 = night. */
export function lerpAppearance(i, p) {
  const a = appearance(i, 'survey', 1), b = appearance(i, 'night', 1);
  const t = p * p * (3 - 2 * p);
  return {
    radius: a.radius + (b.radius - a.radius) * t,
    alpha: a.alpha + (b.alpha - a.alpha) * t,
    mix: t,
    phase: b.phase,
  };
}
