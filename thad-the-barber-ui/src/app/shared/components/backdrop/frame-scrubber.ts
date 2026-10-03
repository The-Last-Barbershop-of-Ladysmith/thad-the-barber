import {
  CLIP_COUNT,
  FRAMES_PER_CLIP,
  KEYFRAME_URLS,
  frameInClip,
  frameUrl,
} from './backdrop.frames';

const TOTAL_FRAMES: number = CLIP_COUNT * FRAMES_PER_CLIP;

/** Loading passes per clip: every 16th frame, then every 8th, 4th, 2nd, and finally all of them. */
const PASS_STEPS: readonly number[] = [
  16,
  8,
  4,
  2,
  1,
];
const ALL_PASSES: number = PASS_STEPS.length - 1;

/** Before the first scroll, only clip 0 up to every 4th frame (~0.7 MB), so the first load stays light. */
const IDLE_PASS_LIMIT: number = 2;

/** The next clip gets every 8th frame until the visitor is halfway through the current clip. */
const NEXT_CLIP_PASS_LIMIT: number = 1;

/** Parallel requests; enough to stream quickly without starving the frames needed first. */
const MAX_IN_FLIGHT: number = 8;

/** Share of the remaining distance the backdrop eases toward the scroll position each animation frame. */
const EASING: number = 0.2;

/** Frames (out of 120) either side of a keyframe over which the high-res still fades in. */
const KEYFRAME_FADE_FRAMES: number = 4;

/** Frames of one clip for one loading pass, requested in order. */
interface LoadBucket {
  clip: number;
  pass: number;
  frames: number[];
  next: number;
}

/** Every frame appears in exactly one bucket: the coarsest pass that includes it. */
function buildBuckets(): LoadBucket[] {
  const seen: Uint8Array = new Uint8Array(TOTAL_FRAMES);
  const buckets: LoadBucket[] = [];
  for (let clip: number = 0; clip < CLIP_COUNT; clip++) {
    PASS_STEPS.forEach((step: number, pass: number): void => {
      const frames: number[] = [];
      for (let frame: number = 0; frame < FRAMES_PER_CLIP; frame += step) {
        const index: number = clip * FRAMES_PER_CLIP + frame;
        if (!seen[index]) {
          seen[index] = 1;
          frames.push(index);
        }
      }
      buckets.push({
        clip,
        pass,
        frames,
        next: 0,
      });
    });
  }
  return buckets;
}

function isDrawable(image: HTMLImageElement | undefined): image is HTMLImageElement {
  return !!image && image.complete && image.naturalWidth > 0;
}

/**
 * The wireframe's scroll-scrubbed video, drawn on a canvas.
 *
 * Position is measured in clips: 2.5 is halfway through clip 2, and a whole number sits on a keyframe. The canvas
 * eases toward the scroll position, blends neighbouring frames for sub-frame precision, and fades in the high-res
 * keyframe still near each section. Until frames arrive, the nearest keyframe still is shown.
 *
 * Unlike the wireframe, which fetched all 847 frames, frames are only fetched near the visitor: the clip on screen
 * and a coarse pass of the next one, so a visitor downloads only the clips they actually scroll through.
 */
export class FrameScrubber {
  private readonly frames: (HTMLImageElement | undefined)[] = new Array<HTMLImageElement | undefined>(TOTAL_FRAMES);
  private readonly ready: Uint8Array = new Uint8Array(TOTAL_FRAMES);
  private readonly keyframes: (HTMLImageElement | undefined)[] =
    new Array<HTMLImageElement | undefined>(KEYFRAME_URLS.length);
  private readonly buckets: LoadBucket[] = buildBuckets();
  private inFlight: number = 0;
  private scrolled: boolean = false;
  private target: number = 0;
  private position: number | null = null;
  private animationFrame: number = 0;
  private lastSignature: string = '';
  private destroyed: boolean = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.loadKeyframe(0);
    this.loadFrames();
  }

  /** Moves toward `target` (in clips). `fromScroll` marks the first real scroll, which unlocks full loading. */
  setTarget(target: number, fromScroll: boolean): void {
    this.target = target;
    this.scrolled ||= fromScroll;
    const key: number = Math.floor(target);
    this.loadKeyframe(key);
    this.loadKeyframe(key + 1);
    this.loadFrames();
    this.requestTick();
  }

  /** Redraws at the current size, e.g. after a resize. */
  redraw(): void {
    this.draw(true);
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.animationFrame);
  }

  private loadKeyframe(index: number): void {
    const url: string | undefined = KEYFRAME_URLS[index];
    if (this.keyframes[index] || !url) {
      return;
    }
    const image: HTMLImageElement = new Image();
    image.decoding = 'async';
    image.onload = (): void => {
      this.draw(true);
    };
    image.src = url;
    this.keyframes[index] = image;
  }

  /** How many passes of `clip` may load right now; -1 means none. */
  private passLimit(clip: number): number {
    const current: number = Math.min(CLIP_COUNT - 1, Math.floor(this.target));
    if (!this.scrolled) {
      return clip === 0 ? IDLE_PASS_LIMIT : -1;
    }
    if (clip === current) {
      return ALL_PASSES;
    }
    if (clip === current + 1) {
      return this.target - current >= 0.5 ? ALL_PASSES : NEXT_CLIP_PASS_LIMIT;
    }
    return -1;
  }

  /** The most useful missing frame: coarse passes first, then the clips nearest the visitor. -1 when done for now. */
  private pickFrame(): number {
    let best: LoadBucket | undefined;
    let bestScore: number = Number.POSITIVE_INFINITY;
    for (const bucket of this.buckets) {
      if (bucket.next >= bucket.frames.length || bucket.pass > this.passLimit(bucket.clip)) {
        continue;
      }
      const score: number = bucket.pass + 2 * Math.abs(bucket.clip + 0.5 - this.target);
      if (score < bestScore) {
        bestScore = score;
        best = bucket;
      }
    }
    if (!best) {
      return -1;
    }
    const index: number = best.frames[best.next] ?? -1;
    best.next++;
    return index;
  }

  private loadFrames(): void {
    while (!this.destroyed && this.inFlight < MAX_IN_FLIGHT) {
      const index: number = this.pickFrame();
      if (index < 0) {
        return;
      }
      this.inFlight++;
      const image: HTMLImageElement = new Image();
      image.decoding = 'async';
      image.src = frameUrl(Math.floor(index / FRAMES_PER_CLIP), index % FRAMES_PER_CLIP);
      this.frames[index] = image;
      const done: () => void = (): void => {
        this.inFlight--;
        if (image.naturalWidth > 0) {
          this.ready[index] = 1;
        }
        this.draw(false);
        this.loadFrames();
      };
      image.decode().then(done, done);
    }
  }

  private nearestReady(index: number): number {
    for (let distance: number = 0; distance < TOTAL_FRAMES; distance++) {
      if (index - distance >= 0 && this.ready[index - distance]) {
        return index - distance;
      }
      if (index + distance < TOTAL_FRAMES && this.ready[index + distance]) {
        return index + distance;
      }
    }
    return -1;
  }

  private requestTick(): void {
    if (!this.animationFrame && !this.destroyed) {
      this.animationFrame = requestAnimationFrame(this.tick);
    }
  }

  private readonly tick: () => void = (): void => {
    this.animationFrame = 0;
    const position: number = this.position ?? this.target;
    const distance: number = this.target - position;
    this.position = Math.abs(distance) < 0.001 ? this.target : position + distance * EASING;
    this.draw(false);
    if (this.position !== this.target) {
      this.requestTick();
    }
  };

  private draw(force: boolean): void {
    const canvas: HTMLCanvasElement = this.canvas;
    const pixelRatio: number = Math.min(2, window.devicePixelRatio || 1);
    const width: number = Math.round(canvas.clientWidth * pixelRatio);
    const height: number = Math.round(canvas.clientHeight * pixelRatio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      force = true;
    }

    const position: number = this.position ?? this.target;
    const clip: number = Math.min(CLIP_COUNT - 1, Math.floor(position));
    const exact: number = Math.min(
      TOTAL_FRAMES - 1,
      clip * FRAMES_PER_CLIP + frameInClip(clip, Math.min(1, position - clip)),
    );
    const wanted: number = Math.floor(exact);
    const blend: number = exact - wanted;
    const shown: number = this.nearestReady(wanted);
    const frame: HTMLImageElement | undefined = this.frames[shown];
    const next: HTMLImageElement | undefined = this.frames[Math.min(TOTAL_FRAMES - 1, wanted + 1)];
    const blendNext: boolean = shown === wanted && next !== frame && isDrawable(next);

    const keyIndex: number = Math.round(position);
    const keyframe: HTMLImageElement | undefined = this.keyframes[keyIndex];
    const frameOk: boolean = isDrawable(frame);
    const keyframeOk: boolean = isDrawable(keyframe);
    if (!frameOk && !keyframeOk) {
      return;
    }
    const keyDistance: number = Math.abs(position - keyIndex) * (FRAMES_PER_CLIP - 1);
    const keyframeAlpha: number = !frameOk
      ? 1
      : keyframeOk
        ? Math.max(0, 1 - keyDistance / KEYFRAME_FADE_FRAMES)
        : 0;

    const signature: string = `${frameOk ? shown : `k${keyIndex}`}:${keyframeAlpha.toFixed(2)}:${blendNext ? blend.toFixed(2) : '0'}`;
    if (!force && signature === this.lastSignature) {
      return;
    }
    this.lastSignature = signature;

    const context: CanvasRenderingContext2D | null = canvas.getContext('2d');
    if (!context) {
      return;
    }
    context.imageSmoothingQuality = 'high';
    const cover: (image: HTMLImageElement) => void = (image: HTMLImageElement): void => {
      const scale: number = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const drawWidth: number = image.naturalWidth * scale;
      const drawHeight: number = image.naturalHeight * scale;
      context.drawImage(
        image,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
    };

    context.globalAlpha = 1;
    if (keyframeAlpha < 1 && frame) {
      cover(frame);
      if (blendNext && next && blend > 0.01) {
        context.globalAlpha = blend;
        cover(next);
        context.globalAlpha = 1;
      }
    }
    if (keyframeAlpha > 0 && keyframe) {
      context.globalAlpha = keyframeAlpha;
      cover(keyframe);
      context.globalAlpha = 1;
    }
  }
}
