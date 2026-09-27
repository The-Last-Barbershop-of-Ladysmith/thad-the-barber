import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type InputSignal,
  type Signal,
  type WritableSignal,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { clamp } from '../../utils/math.utils';

export type BackdropMode = 'scroll' | 'still';

/** Keyframes 1 → 7, then back to 1 so the footer loops to the opening shot. */
const KEYFRAMES: readonly string[] = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  1,
].map((frame: number): string => `assets/keys/k${frame}.webp`);

/**
 * Fixed full-screen photo behind the page.
 * - `scroll`: crossfades the shop keyframe stills as the visitor scrolls (home page).
 * - `still`:  one keyframe under a dark wash (booking page).
 *
 * The wireframe scrubs 847 extracted video frames on a canvas. This base version uses the
 * 7 keyframe stills; swapping in the frame scrubber later only touches this component.
 */
@Component({
  selector: 'app-backdrop',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './backdrop.html',
  styleUrl: './backdrop.scss',
})
export class Backdrop {
  readonly mode: InputSignal<BackdropMode> = input<BackdropMode>('scroll');
  /** Keyframe index (0-6) shown in `still` mode. */
  readonly still: InputSignal<number> = input<number>(5);

  protected readonly frames: readonly string[] = KEYFRAMES;
  private readonly progress: WritableSignal<number> = signal(0);
  private readonly position: Signal<number> = computed((): number => this.progress() * (this.frames.length - 1));

  constructor() {
    const destroyRef: DestroyRef = inject(DestroyRef);
    afterNextRender((): void => {
      if (this.mode() !== 'scroll') {
        return;
      }

      let frameRequest: number = 0;
      const update: () => void = (): void => {
        frameRequest = 0;
        const maxScroll: number = document.documentElement.scrollHeight - window.innerHeight;
        this.progress.set(maxScroll > 0
          ? Math.min(
            1,
            window.scrollY / maxScroll,
          )
          : 0);
      };
      const onScroll: () => void = (): void => {
        if (frameRequest === 0) {
          frameRequest = requestAnimationFrame(update);
        }
      };

      window.addEventListener(
        'scroll',
        onScroll,
        { passive: true },
      );
      window.addEventListener(
        'resize',
        onScroll,
      );
      update();

      destroyRef.onDestroy((): void => {
        window.removeEventListener(
          'scroll',
          onScroll,
        );
        window.removeEventListener(
          'resize',
          onScroll,
        );
        cancelAnimationFrame(frameRequest);
      });
    });
  }

  /** The two keyframes nearest the scroll position blend; the rest stay hidden. */
  protected opacityAt(index: number): number {
    if (index === 0) {
      return 1;
    }
    return clamp(
      this.position() - index + 1,
      0,
      1,
    );
  }
}
