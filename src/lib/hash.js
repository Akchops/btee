/** Deterministic, index-addressed hashing.
 *  Every per-point attribute is a PURE FUNCTION OF INDEX — never of iteration
 *  order — so removing points under degradation cannot re-roll any survivor. */
export function splitmix32(a) {
  a |= 0; a = (a + 0x9e3779b9) | 0;
  let t = a ^ (a >>> 16); t = Math.imul(t, 0x21f0aaad);
  t = t ^ (t >>> 15); t = Math.imul(t, 0x735a2d97);
  return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
}
export const SEED = 0x4155524c; // "AURL"
/** Stable pseudo-random in [0,1) for point i, stream s. */
export const rnd = (i, s = 0) => splitmix32(SEED ^ Math.imul(i + 1, 0x85ebca6b) ^ Math.imul(s + 1, 0xc2b2ae35));
/** Per-point appearance attributes. Position is NEVER derived from these. */
export const settleOffset = (i) => rnd(i, 1) * 0.70;
export const magnitude    = (i) => rnd(i, 2);
export const twinklePhase = (i) => rnd(i, 3) * Math.PI * 2;
