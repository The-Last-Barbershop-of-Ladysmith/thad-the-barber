import { Observable } from 'rxjs';
import { pollWhileVisible } from './poll-while-visible.utils';

describe(
  'pollWhileVisible',
  (): void => {
    const INTERVAL_MS: number = 1_000;

    class FakeDocument extends EventTarget {
      visibilityState: string = 'visible';

      setVisibility(visibilityState: string): void {
        this.visibilityState = visibilityState;
        this.dispatchEvent(new Event('visibilitychange'));
      }
    }

    let fakeDocument: FakeDocument;
    let ticks: number;

    function poll(): void {
      const ticks$: Observable<number> = pollWhileVisible(fakeDocument as unknown as Document, INTERVAL_MS);
      ticks$.subscribe((): void => {
        ticks++;
      });
      vi.advanceTimersByTime(0);
    }

    beforeEach((): void => {
      vi.useFakeTimers();
      fakeDocument = new FakeDocument();
      ticks = 0;
    });

    afterEach((): void => {
      vi.useRealTimers();
    });

    it(
      'ticks at once and then every interval while the tab is visible',
      (): void => {
        poll();
        expect(ticks).toBe(1);

        vi.advanceTimersByTime(INTERVAL_MS * 2);

        expect(ticks).toBe(3);
      },
    );

    it(
      'stops ticking while the tab is hidden and ticks at once when it returns',
      (): void => {
        poll();
        fakeDocument.setVisibility('hidden');
        ticks = 0;

        vi.advanceTimersByTime(INTERVAL_MS * 3);
        expect(ticks).toBe(0);

        fakeDocument.setVisibility('visible');
        vi.advanceTimersByTime(0);
        expect(ticks).toBe(1);
      },
    );

    it(
      'waits for the tab to show when it starts hidden',
      (): void => {
        fakeDocument.visibilityState = 'hidden';
        poll();
        vi.advanceTimersByTime(INTERVAL_MS);
        expect(ticks).toBe(0);

        fakeDocument.setVisibility('visible');
        vi.advanceTimersByTime(0);

        expect(ticks).toBe(1);
      },
    );

    it(
      'ignores a visibility event that does not change visibility, so no extra tick is made',
      (): void => {
        poll();

        fakeDocument.setVisibility('visible');
        vi.advanceTimersByTime(0);

        expect(ticks).toBe(1);
      },
    );
  },
);
