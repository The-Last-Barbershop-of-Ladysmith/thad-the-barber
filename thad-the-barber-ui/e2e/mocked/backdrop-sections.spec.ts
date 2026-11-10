import { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { waitAnimationFrames } from '../support/frames';

interface SectionKeyframe {
  id: string;
  previousId: string;
  keyframe: number;
  previousKeyframe: number;
}

/** In page order, each with the keyframe its title switches the backdrop to. */
const SECTION_KEYFRAMES: readonly SectionKeyframe[] = [
  {
    id: 'hours',
    previousId: 'chair',
    keyframe: 3,
    previousKeyframe: 2,
  },
  {
    id: 'announcements',
    previousId: 'hours',
    keyframe: 4,
    previousKeyframe: 3,
  },
  {
    id: 'gallery',
    previousId: 'announcements',
    keyframe: 5,
    previousKeyframe: 4,
  },
  {
    id: 'reviews',
    previousId: 'gallery',
    keyframe: 6,
    previousKeyframe: 5,
  },
];

/** The trigger line is 70% of the screen height below its top; these put a section's title clearly either side. */
const PAST_TRIGGER_SHARE: number = 0.45;
const BEFORE_TRIGGER_SHARE: number = 0.95;

/** A transition takes about 1.2 s, which is 72 frames at 60 Hz; this holds the screen for well over that. */
const FRAMES_TO_HOLD: number = 180;

/** Playing across several clips takes seconds on a busy machine. */
const PLAYBACK_TIMEOUT_MILLISECONDS: number = 30_000;

const watchCanvasDraws: () => void = (): void => {
  const state: { lastKeyframe: string; } = { lastKeyframe: '' };
  (window as unknown as Record<string, unknown>)['__backdropDraws'] = state;
  const original: typeof CanvasRenderingContext2D.prototype.drawImage =
    // eslint-disable-next-line @typescript-eslint/unbound-method -- it is applied to the real context below
    CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]): void {
    const image: unknown = args[0];
    if (image instanceof HTMLImageElement) {
      const keyframeName: string | undefined = /\/keys\/(k\d)\.avif/.exec(image.src)?.[1];
      if (keyframeName) {
        state.lastKeyframe = keyframeName;
      }
    }
    (original as (...rest: unknown[]) => void).apply(this, args);
  };
};

const lastKeyframe: (page: Page) => () => Promise<string> = (page: Page): () => Promise<string> =>
  (): Promise<string> => page.evaluate((): string =>
    (window as unknown as { __backdropDraws: { lastKeyframe: string; }; }).__backdropDraws.lastKeyframe);

const scrollSectionTo: (page: Page,
  id: string,
  viewportShare: number) => Promise<void> =
  (
    page: Page,
    id: string,
    viewportShare: number,
  ): Promise<void> =>
    page.evaluate(({ sectionId, share }: { sectionId: string; share: number; }): void => {
      const section: HTMLElement | null = document.getElementById(sectionId);
      const marker: Element | null = section?.querySelector('h1, h2, h3') ?? section;
      const top: number = marker?.getBoundingClientRect().top ?? 0;
      window.scrollTo(0, window.scrollY + top - window.innerHeight * share);
    }, { sectionId: id, share: viewportShare });

test.describe(
  'backdrop sections',
  (): void => {
    test.beforeEach(async ({ page }: { page: Page; }): Promise<void> => {
      await page.addInitScript(watchCanvasDraws);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    for (const section of SECTION_KEYFRAMES) {
      test(
        `${section.id} plays to its keyframe once its title is past the trigger line`,
        async ({ page }: { page: Page; }): Promise<void> => {
          await scrollSectionTo(
            page,
            section.id,
            PAST_TRIGGER_SHARE,
          );

          await expect.poll(lastKeyframe(page), { timeout: PLAYBACK_TIMEOUT_MILLISECONDS }).toBe(`k${section.keyframe}`);
        },
      );

      test(
        `${section.id} keeps the previous keyframe until its title is past the trigger line`,
        async ({ page }: { page: Page; }): Promise<void> => {
          await scrollSectionTo(
            page,
            section.previousId,
            PAST_TRIGGER_SHARE,
          );
          await expect.poll(lastKeyframe(page), { timeout: PLAYBACK_TIMEOUT_MILLISECONDS })
            .toBe(`k${section.previousKeyframe}`);

          await scrollSectionTo(
            page,
            section.id,
            BEFORE_TRIGGER_SHARE,
          );
          await waitAnimationFrames(page, FRAMES_TO_HOLD);

          expect(await lastKeyframe(page)()).toBe(`k${section.previousKeyframe}`);
        },
      );
    }
  },
);
