import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Mock } from 'vitest';
import { Backdrop } from './backdrop';
import { FrameScrubber } from './frame-scrubber';

describe(
  'Backdrop',
  (): void => {
    let setTarget: Mock<FrameScrubber['setTarget']>;

    function stubReducedMotion(isReduced: boolean): void {
      vi.stubGlobal(
        'matchMedia',
        (query: string): Partial<MediaQueryList> => ({
          matches: query.includes('prefers-reduced-motion') ? isReduced : false,
          addEventListener: (): void => undefined,
          removeEventListener: (): void => undefined,
        }),
      );
    }

    async function render(): Promise<ComponentFixture<Backdrop>> {
      const fixture: ComponentFixture<Backdrop> = TestBed.createComponent(Backdrop);
      fixture.detectChanges();
      await fixture.whenStable();
      return fixture;
    }

    function scrollAndWaitForFrame(): void {
      window.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(50);
    }

    beforeEach((): void => {
      setTarget = vi.spyOn(FrameScrubber.prototype, 'setTarget').mockImplementation((): void => undefined);
      vi.stubGlobal(
        'Image',
        class {
          decode: () => Promise<void> = (): Promise<void> => Promise.resolve();
        },
      );
      vi.useFakeTimers();
    });

    afterEach((): void => {
      setTarget.mockRestore();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it(
      'follows the scroll when motion is allowed',
      async (): Promise<void> => {
        stubReducedMotion(false);
        await render();
        setTarget.mockClear();

        scrollAndWaitForFrame();

        expect(setTarget).toHaveBeenCalledWith(0, true);
      },
    );

    it(
      'holds the first keyframe and ignores scrolling when the visitor prefers reduced motion',
      async (): Promise<void> => {
        stubReducedMotion(true);
        await render();

        scrollAndWaitForFrame();

        expect(setTarget.mock.calls).toEqual([[0, false]]);
      },
    );
  },
);
