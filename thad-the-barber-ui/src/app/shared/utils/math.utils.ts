/** Keeps `value` within [min, max]. */
export function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.max(min, Math.min(max, value));
}

/** FNV-1a → [0, 1). Stable per input, for deterministic pseudo-random picks (e.g. mock data). */
export function hashToUnit(input: string): number {
  let value: number = 2166136261;
  for (let i: number = 0; i < input.length; i++) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0) / 4294967295;
}
