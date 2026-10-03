/**
 * Frame data for the scroll-scrubbed backdrop, ported from the wireframe (`index.html` / `mobile.html`).
 * Frames are the wireframe's `frames3/` re-encoded as AVIF q50 (24 MB instead of 49 MB, no visible change).
 */

/** 7 clips, each played between two neighbouring keyframes. */
export const CLIP_COUNT: number = 7;

/** Frames extracted per clip (24 fps). */
export const FRAMES_PER_CLIP: number = 121;

/** Clip 0-6, frame 0-120 → "assets/frames3/c1/000.avif". */
export function frameUrl(clip: number, frame: number): string {
  return `assets/frames3/c${clip + 1}/${String(frame).padStart(3, '0')}.avif`;
}

/** High-res stills at each clip boundary: keyframes 1 → 7, then back to 1 so the footer loops to the opening shot. */
export const KEYFRAME_URLS: readonly string[] = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  1,
].map((key: number): string => `assets/keys/k${key}.avif`);

/**
 * Measured frame-to-frame motion (mean absolute pixel difference) for the clips that stutter. These clips are
 * retimed so equal scrolling gives equal visual motion; clips not listed play linearly. Values from the wireframe.
 */
/* eslint-disable @stylistic/array-element-newline -- measured data table; one value per line would be 240 lines. */
const MOTION: Readonly<Record<number, readonly number[]>> = {
  0: [
    3.77, 0.94, 0.42, 0.2, 0.22, 0.24, 0.28, 0.2, 0.22, 0.22, 0.28, 0.22, 0.22, 0.22, 0.28,
    0.23, 0.21, 0.22, 0.3, 0.24, 0.27, 0.26, 0.29, 0.23, 0.39, 0.24, 0.31, 0.24, 0.3, 0.31,
    0.4, 0.41, 0.89, 0.8, 0.84, 0.94, 1.64, 1.25, 1.32, 1.41, 2.52, 1.72, 1.87, 1.97, 3.6,
    2.21, 2.38, 2.2, 4.17, 2.54, 2.78, 2.73, 4.32, 2.62, 2.87, 2.88, 3.75, 2.47, 2.33, 2.09,
    2.74, 1.94, 1.9, 1.72, 2.48, 1.38, 1.38, 1.07, 1.29, 0.87, 1.06, 0.91, 1.18, 0.86, 1.03,
    0.86, 1.18, 0.79, 4.64, 2.88, 5.19, 2.47, 2.51, 2.13, 4.11, 1.84, 1.78, 1.47, 3.05, 1.32,
    1.29, 1.02, 1.43, 0.88, 0.88, 0.75, 1, 0.71, 0.68, 0.55, 0.74, 0.55, 0.5, 0.44, 0.53,
    0.48, 0.42, 0.41, 0.49, 0.45, 0.42, 0.38, 0.51, 0.43, 0.38, 0.35, 0.4, 0.34, 0.33, 0.31,
  ],
  1: [
    1.17, 0.44, 0.35, 0.35, 0.55, 0.4, 0.37, 0.41, 0.52, 0.41, 0.36, 0.38, 0.56, 0.4, 0.37,
    0.38, 0.52, 0.41, 0.34, 0.37, 0.49, 0.57, 0.75, 1, 1.97, 1.19, 1.2, 1.28, 2.35, 1.61,
    1.53, 1.66, 3.68, 2.62, 2.71, 3.1, 5.9, 4.41, 4.82, 5.8, 6.87, 6.82, 5.15, 3.55, 2.83,
    1.19, 0.7, 0.49, 0.43, 0.34, 0.36, 0.34, 0.41, 0.33, 0.36, 0.34, 0.41, 0.32, 0.36, 0.32,
    0.36, 0.32, 0.33, 0.31, 0.36, 0.31, 0.32, 0.3, 0.39, 0.34, 0.38, 1.01, 2.78, 2.3, 2.68,
    3.15, 5.37, 2.76, 2.6, 2.27, 2.95, 1.26, 1.22, 1.3, 2.5, 3.51, 3.86, 3.79, 5.95, 6.59,
    8.73, 9.33, 8.31, 3.1, 2.05, 1.53, 1.3, 0.34, 0.69, 0.94, 3.28, 2.81, 2.77, 2.64, 3.15,
    1.05, 0.79, 0.39, 0.5, 0.33, 0.28, 0.26, 0.39, 0.29, 0.26, 0.26, 0.27, 0.2, 0.21, 0.23,
  ],
};
/* eslint-enable @stylistic/array-element-newline */

/**
 * Cumulative 0-1 progress per frame for a retimed clip. Static holds (~0.3 noise floor) get very little scroll,
 * a 0.12 floor keeps progress moving, and the frame-0 pop is skipped quickly. Blended 85% motion-equalized with
 * 15% linear so nothing fully freezes or rushes.
 */
function buildWarpTable(motion: readonly number[]): number[] {
  const steps: number[] = [0];
  let sum: number = 0;
  motion.forEach((delta: number, index: number): void => {
    sum += Math.max(0.12, (index === 0 ? 0.3 : delta) - 0.22);
    steps.push(sum);
  });
  const last: number = steps.length - 1;
  return steps.map((value: number, index: number): number => (value / sum) * 0.85 + (index / last) * 0.15);
}

const WARP_TABLES: ReadonlyMap<number, number[]> = new Map(Object.entries(MOTION).map(
  ([clip, motion]: [string, readonly number[]]): [number, number[]] => [Number(clip), buildWarpTable(motion)],
));

/** Progress 0-1 through a clip → fractional frame index 0-120, retimed for clips with measured motion. */
export function frameInClip(clip: number, progress: number): number {
  const table: number[] | undefined = WARP_TABLES.get(clip);
  if (!table) {
    return progress * (FRAMES_PER_CLIP - 1);
  }
  const at: (index: number) => number = (index: number): number => table[index] ?? 0;
  let low: number = 0;
  let high: number = table.length - 1;
  while (high - low > 1) {
    const mid: number = (low + high) >> 1;
    if (at(mid) <= progress) {
      low = mid;
    } else {
      high = mid;
    }
  }
  const span: number = at(high) - at(low);
  return Math.min(FRAMES_PER_CLIP - 1, low + (span > 0 ? (progress - at(low)) / span : 0));
}
