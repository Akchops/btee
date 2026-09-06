/** The survey field — pure geometry and appearance. No DOM, no canvas.
 *
 *  THE CENTRAL INVARIANT
 *  Position is a function of (island metres, projection, dpr) ALONE.
 *  `state` is accepted by deviceCoords only so that the CI probe can prove it
 *  is ignored. There is no code path here that lets a state change a coordinate.
 */
import { magnitude, twinklePhase, settleOffset } from './hash.js';

export const STATES = ['survey', 'night'];
const INSET = 0.06;

/** Contain-fit of the island's metre extent into a viewport box. */
export function makeProjection({ w, h }, extent) {
  const availW = w * (1 - INSET * 2), availH = h * (1 - INSET * 2);
  const scale = Math.min(availW / extent.w, availH / extent.h);
  return { scale, ox: (w - extent.w * scale) / 2, oy: (h - extent.h * scale) / 2, extent };
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
    out[i * 2]     = Math.round((ox + xm * scale) * dpr);
    out[i * 2 + 1] = Math.round((oy + (extent.h - ym) * scale) * dpr);
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
