import { BackdropVariant } from './backdrop-variant';
import { CLIP_COUNT, FRAMES_PER_CLIP, frameInClip, frameUrl, keyframeUrls } from './backdrop.frames';

const TOTAL_FRAMES: number = CLIP_COUNT * FRAMES_PER_CLIP;

/** Loading passes per clip: every 8th frame, then every 4th, 2nd, and finally all of them. */
const PASS_STEPS: readonly number[] = [
  8,
  4,
  2,
  1,
];
const ALL_PASSES: number = PASS_STEPS.length - 1;

/** Before the first scroll, only clip 0 up to every 4th frame (16 frames), so the first load stays light. */
const IDLE_PASS_LIMIT: number = 2;

/** The next clip gets every 4th frame until the visitor is halfway through the current clip. */
const NEXT_CLIP_PASS_LIMIT: number = 1;

/** Parallel requests; enough to stream quickly without starving the frames needed first. */
const MAX_IN_FLIGHT: number = 8;

/** Clips played per second when moving to the next keyframe: about 1.4 s a clip with the ease in and out. */
const PLAYBACK_CLIPS_PER_SECOND: number = 0.9;

/** Further behind than this many clips, the playback cuts ahead instead of playing through them all. */
const CATCH_UP_LIMIT_CLIPS: number = 1.5;

/** After a cut, this many clips are left to play into the keyframe. */
const CLIPS_PLAYED_AFTER_CUT: number = 1;

/** How quickly the playback speeds up and slows down, in clips per second per second. Slowing at this rate stops
 * exactly on the keyframe, with no long crawl over the last frames. */
const ACCELERATION: number = 3;

/** Closer than this to the keyframe counts as arrived. */
const ARRIVED_DISTANCE: number = 0.002;

/** A tab that was asleep must not make the next step jump the whole distance. */
const MAX_STEP_SECONDS: number = 0.1;

const REFERENCE_STEP_SECONDS: number = 1 / 60;

/** Frames (out of 60) either side of a keyframe over which the high-res still fades in. */
const KEYFRAME_FADE_FRAMES: number = 2;

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
 * The wireframe's video, drawn on a canvas and played between keyframes as the visitor moves between sections.
 *
 * Position is measured in clips: 2.5 is halfway through clip 2, and a whole number sits on a keyframe. The page sets
 * the keyframe to show; the canvas plays toward it at a steady pace with an ease in and out, whatever the scroll speed,
 * then holds the still. A scroll that lands several clips away cuts ahead and plays only the last clip, so the
 * backdrop never spends seconds catching up. It blends neighbouring frames for sub-frame precision and fades in the
 * high-res keyframe still as it arrives. Until frames arrive, the nearest keyframe still is shown.
 *
 * Unlike the wireframe, which fetched every frame, frames are only fetched near the visitor: the clips either side of
 * the keyframe on screen and a coarse pass of the next one, so a visitor downloads only the clips they play.
 */
export class FrameScrubber {
  private readonly frames: (HTMLImageElement | undefined)[] = new Array<HTMLImageElement | undefined>(TOTAL_FRAMES);
  private readonly ready: Uint8Array = new Uint8Array(TOTAL_FRAMES);
  private readonly keyframeUrls: string[];
  private readonly keyframes: (HTMLImageElement | undefined)[];
  private readonly buckets: LoadBucket[] = buildBuckets();
  private inFlight: number = 0;
  private scrolled: boolean = false;
  private target: number = 0;
  private position: number | null = null;
  private velocity: number = 0;
  private readonly isReducedMotion: boolean = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private animationFrame: number = 0;
  private lastTickTime: number = 0;
  private lastSignature: string = '';
  private destroyed: boolean = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly variant: BackdropVariant,
  ) {
    this.keyframeUrls = keyframeUrls(variant);
    this.keyframes = new Array<HTMLImageElement | undefined>(this.keyframeUrls.length);
    this.loadKeyframe(0, 'high');
    this.loadFrames();
  }

  /** Plays toward the keyframe `target`. `fromScroll` marks the first real scroll, which unlocks full loading. */
  setTarget(target: number, fromScroll: boolean): void {
    this.target = target;
    this.scrolled ||= fromScroll;
    const distance: number = target - (this.position ?? target);
    if (Math.abs(distance) > CATCH_UP_LIMIT_CLIPS) {
      this.position = target - Math.sign(distance) * CLIPS_PLAYED_AFTER_CUT;
      this.velocity = 0;
    }
    this.loadKeyframe(target, 'high');
    this.loadKeyframe(Math.round(this.position ?? target), 'high');
    if (this.scrolled) {
      for (let index: number = 0; index < this.keyframeUrls.length; index++) {
        this.loadKeyframe(index, 'low');
      }
    }
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

  private loadKeyframe(index: number, priority: 'high' | 'low'): void {
    const url: string | undefined = this.keyframeUrls[index];
    if (this.keyframes[index] || !url) {
      return;
    }
    const image: HTMLImageElement = new Image();
    image.decoding = 'async';
    image.fetchPriority = priority;
    image.onload = (): void => {
      this.draw(true);
    };
    image.src = url;
    this.keyframes[index] = image;
  }

  /** How many passes of `clip` may load right now; -1 means none. */
  private passLimit(clip: number): number {
    if (!this.scrolled) {
      return clip === 0 ? IDLE_PASS_LIMIT : -1;
    }
    const keyframe: number = Math.round(this.position ?? this.target);
    if (clip === keyframe || clip === keyframe - 1) {
      return ALL_PASSES;
    }
    if (clip === keyframe + 1) {
      return NEXT_CLIP_PASS_LIMIT;
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
      const score: number = bucket.pass + 2 * Math.abs(bucket.clip + 0.5 - (this.position ?? this.target));
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
      image.src = frameUrl(
        this.variant,
        Math.floor(index / FRAMES_PER_CLIP),
        index % FRAMES_PER_CLIP,
      );
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

  /** The closest loaded frame from `from` onward in the direction of `step` (-1 back, 1 forward), or -1. */
  private findReady(from: number, step: -1 | 1): number {
    for (let candidate: number = from; candidate >= 0 && candidate < TOTAL_FRAMES; candidate += step) {
      if (this.ready[candidate]) {
        return candidate;
      }
    }
    return -1;
  }

  private requestTick(): void {
    if (!this.animationFrame && !this.destroyed) {
      this.animationFrame = requestAnimationFrame(this.tick);
    }
  }

  private readonly tick: (time: number) => void = (time: number): void => {
    this.animationFrame = 0;
    const elapsedSeconds: number = this.lastTickTime === 0
      ? REFERENCE_STEP_SECONDS
      : Math.min(MAX_STEP_SECONDS, (time - this.lastTickTime) / 1000);
    this.lastTickTime = time;
    const position: number = this.position ?? this.target;
    const distance: number = this.target - position;
    const wantedVelocity: number = Math.sign(distance) * Math.min(
      PLAYBACK_CLIPS_PER_SECOND * Math.max(1, Math.abs(distance)),
      Math.sqrt(2 * ACCELERATION * Math.abs(distance)),
    );
    const largestChange: number = ACCELERATION * elapsedSeconds;
    this.velocity += Math.min(largestChange, Math.max(-largestChange, wantedVelocity - this.velocity));
    const next: number = position + this.velocity * elapsedSeconds;
    const hasArrived: boolean = this.isReducedMotion
      || Math.abs(distance) < ARRIVED_DISTANCE
      || (this.target - next) * distance <= 0;
    this.position = hasArrived ? this.target : next;
    this.draw(false);
    if (hasArrived) {
      this.velocity = 0;
      this.lastTickTime = 0;
    } else {
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
    const lowerIndex: number = this.findReady(wanted, -1);
    const upperIndex: number = this.findReady(wanted + 1, 1);
    const shown: number = lowerIndex >= 0 ? lowerIndex : upperIndex;
    const frame: HTMLImageElement | undefined = this.frames[shown];
    const next: HTMLImageElement | undefined = this.frames[upperIndex];
    const isSameClip: boolean = Math.floor(lowerIndex / FRAMES_PER_CLIP) === Math.floor(upperIndex / FRAMES_PER_CLIP);
    const blendNext: boolean = lowerIndex >= 0 && upperIndex >= 0 && isSameClip && isDrawable(next);
    const blend: number = blendNext ? (exact - lowerIndex) / (upperIndex - lowerIndex) : 0;

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
