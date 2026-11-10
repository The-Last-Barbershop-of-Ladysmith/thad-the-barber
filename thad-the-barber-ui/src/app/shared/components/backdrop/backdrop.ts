import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  InputSignal,
  Signal,
  afterNextRender,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { BackdropVariant } from './backdrop-variant';
import { FrameScrubber } from './frame-scrubber';

/**
 * How far below the top of the screen, as a share of its height, a section's title switches the backdrop to that
 * section's keyframe. One line for every section, so tall and short sections switch at the same place; the same
 * line sends the backdrop back when the title leaves.
 */
const KEYFRAME_TRIGGER_LINE: number = 0.7;

/**
 * A CSS selector for the element whose top edge sits on a keyframe, or `null` for a keyframe placed halfway
 * between its neighbours (the wireframe's removed "services" section).
 */
export type BackdropAnchor = string | null;

/**
 * Fixed full-screen photo behind the page: the wireframe's video (see `FrameScrubber`), played from one section's
 * keyframe to the next. Keyframe k is the target once the title of `anchors[k]` (its top, for a section without a
 * title) has reached the trigger line; the last keyframe holds from its anchor to the footer.
 */
@Component({
  selector: 'app-backdrop',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './backdrop.html',
  styleUrl: './backdrop.scss',
})
export class Backdrop {
  /** One anchor per keyframe (`CLIP_COUNT + 1`), in page order. */
  readonly anchors: InputSignal<readonly BackdropAnchor[]> = input<readonly BackdropAnchor[]>([]);

  private readonly canvas: Signal<ElementRef<HTMLCanvasElement> | undefined> =
    viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    const destroyRef: DestroyRef = inject(DestroyRef);
    afterNextRender((): void => {
      const canvas: HTMLCanvasElement | undefined = this.canvas()?.nativeElement;
      if (!canvas) {
        return;
      }

      // Chosen once per visit: phones get the portrait frames, wider screens the landscape ones.
      const isWideScreen: boolean = window.matchMedia('(min-width: 48rem)').matches;
      const variant: BackdropVariant = isWideScreen ? BackdropVariant.Desktop : BackdropVariant.Phone;
      const scrubber: FrameScrubber = new FrameScrubber(canvas, variant);
      let frameRequest: number = 0;
      const update: (fromScroll: boolean) => void = (fromScroll: boolean): void => {
        frameRequest = 0;
        scrubber.setTarget(this.currentKeyframe(), fromScroll);
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
      window.addEventListener('resize', onResize);
      update(false);

      destroyRef.onDestroy((): void => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
        cancelAnimationFrame(frameRequest);
        scrubber.destroy();
      });
    });
  }

  /** The last keyframe whose anchor title has reached the trigger line. */
  private currentKeyframe(): number {
    const scrollY: number = window.scrollY;
    const maxScroll: number = document.documentElement.scrollHeight - window.innerHeight;
    const triggerY: number = scrollY + window.innerHeight * KEYFRAME_TRIGGER_LINE;
    const tops: number[] = this.anchors().map((anchor: BackdropAnchor): number => {
      if (anchor === null) {
        return Number.NaN;
      }
      // Component hosts are inline, so measure their first element (the section itself).
      const host: Element | null = document.querySelector(anchor);
      const box: Element | null = host?.firstElementChild ?? host;
      const marker: Element | null = box?.querySelector('h1, h2, h3') ?? box;
      return marker
        ? Math.min(maxScroll, marker.getBoundingClientRect().top + scrollY)
        : 0;
    });
    tops.forEach((top: number, index: number): void => {
      if (Number.isNaN(top)) {
        tops[index] = ((tops[index - 1] ?? 0) + (tops[index + 1] ?? 0)) / 2;
      }
    });

    let keyframe: number = 0;
    tops.forEach((top: number, index: number): void => {
      if (top <= triggerY) {
        keyframe = index;
      }
    });
    return keyframe;
  }
}
