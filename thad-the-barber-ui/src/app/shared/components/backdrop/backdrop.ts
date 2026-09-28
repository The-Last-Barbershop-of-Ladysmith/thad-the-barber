import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  type InputSignal,
  type Signal,
  afterNextRender,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { CLIP_COUNT, KEYFRAME_URLS } from './backdrop.frames';
import { FrameScrubber } from './frame-scrubber';

export type BackdropMode = 'scroll' | 'still';

/**
 * A CSS selector for the element whose top edge sits on a keyframe, or `null` for a keyframe placed halfway
 * between its neighbours (the wireframe's removed "services" section).
 */
export type BackdropAnchor = string | null;

/**
 * Fixed full-screen photo behind the page.
 * - `scroll`: the wireframe's scroll-scrubbed video (see `FrameScrubber`). Keyframe k lands when `anchors[k]`
 *   reaches the top of the viewport; the last anchor (the footer) sits at the bottom of the page.
 * - `still`:  one keyframe under a dark wash (booking page).
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
  /** One anchor per keyframe (`CLIP_COUNT + 1`), in page order. Required in `scroll` mode. */
  readonly anchors: InputSignal<readonly BackdropAnchor[]> = input<readonly BackdropAnchor[]>([]);

  protected readonly keyframes: readonly string[] = KEYFRAME_URLS;
  private readonly canvas: Signal<ElementRef<HTMLCanvasElement> | undefined> =
    viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    const destroyRef: DestroyRef = inject(DestroyRef);
    afterNextRender((): void => {
      const canvas: HTMLCanvasElement | undefined = this.canvas()?.nativeElement;
      if (this.mode() !== 'scroll' || !canvas) {
        return;
      }

      const scrubber: FrameScrubber = new FrameScrubber(canvas);
      let frameRequest: number = 0;
      const update: (fromScroll: boolean) => void = (fromScroll: boolean): void => {
        frameRequest = 0;
        scrubber.setTarget(
          this.scrollPosition(),
          fromScroll,
        );
      };
      const onScroll: () => void = (): void => {
        if (frameRequest === 0) {
          frameRequest = requestAnimationFrame((): void => {
            update(true);
          });
        }
      };
      const onResize: () => void = (): void => {
        scrubber.redraw();
        update(false);
      };

      window.addEventListener(
        'scroll',
        onScroll,
        { passive: true },
      );
      window.addEventListener(
        'resize',
        onResize,
      );
      update(false);

      destroyRef.onDestroy((): void => {
        window.removeEventListener(
          'scroll',
          onScroll,
        );
        window.removeEventListener(
          'resize',
          onResize,
        );
        cancelAnimationFrame(frameRequest);
        scrubber.destroy();
      });
    });
  }

  /** Scroll position in clips: 2.5 is halfway between the tops of anchors 2 and 3. */
  private scrollPosition(): number {
    const scrollY: number = window.scrollY;
    const maxScroll: number = document.documentElement.scrollHeight - window.innerHeight;
    const tops: number[] = this.anchors().map((anchor: BackdropAnchor): number => {
      if (anchor === null) {
        return Number.NaN;
      }
      // Component hosts are inline, so measure their first element (the section itself).
      const host: Element | null = document.querySelector(anchor);
      const box: Element | null = host?.firstElementChild ?? host;
      return box
        ? Math.min(
          maxScroll,
          box.getBoundingClientRect().top + scrollY,
        )
        : 0;
    });
    tops.forEach((
      top: number,
      index: number,
    ): void => {
      if (Number.isNaN(top)) {
        tops[index] = ((tops[index - 1] ?? 0) + (tops[index + 1] ?? 0)) / 2;
      }
    });

    for (let clip: number = 0; clip < CLIP_COUNT; clip++) {
      const start: number = tops[clip] ?? 0;
      const end: number = tops[clip + 1] ?? maxScroll;
      if (scrollY < end) {
        return clip + Math.max(
          0,
          (scrollY - start) / Math.max(
            1,
            end - start,
          ),
        );
      }
    }
    return CLIP_COUNT;
  }
}
