import { ViewportScroller } from '@angular/common';
import { NavigationEnd, Router, UrlTree } from '@angular/router';
import { Subject } from 'rxjs';
import { Mock } from 'vitest';
import { holdFirstAnchor } from './hold-anchor.utils';

describe(
  'holdFirstAnchor',
  (): void => {
    let navigation: Subject<unknown>;
    let scrollToAnchor: Mock<(fragment: string) => void>;
    let notifyResize: () => void;
    let disconnect: Mock<() => void>;
    let observed: Element[];

    beforeEach((): void => {
      vi.useFakeTimers();
      observed = [];
      disconnect = vi.fn<() => void>();
      scrollToAnchor = vi.fn<(fragment: string) => void>();
      navigation = new Subject<unknown>();
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(callback: () => void) {
            notifyResize = callback;
          }

          observe(element: Element): void {
            observed.push(element);
          }

          disconnect: () => void = disconnect;
        },
      );
      const header: HTMLElement = document.createElement('div');
      header.setAttribute('data-site-top', '');
      document.body.append(header);
      holdFirstAnchor(
        document,
        {
          events: navigation,
          parseUrl: (url: string): UrlTree => ({ fragment: url.split('#')[1] ?? null }) as UrlTree,
        } as unknown as Router,
        { scrollToAnchor } as unknown as ViewportScroller,
      );
    });

    afterEach((): void => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
      document.body.replaceChildren();
    });

    function arriveAt(url: string): void {
      navigation.next(new NavigationEnd(
        1,
        url,
        url,
      ));
    }

    it(
      'scrolls to the fragment again each time the page or the fixed header changes size',
      (): void => {
        arriveAt('/#visit');

        notifyResize();
        notifyResize();

        expect(scrollToAnchor.mock.calls).toEqual([['visit'], ['visit']]);
      },
    );

    it(
      'watches the page',
      (): void => {
        arriveAt('/#visit');

        expect(observed).toContain(document.documentElement);
      },
    );

    it(
      'watches the fixed header',
      (): void => {
        arriveAt('/#visit');

        expect(observed.some((element: Element): boolean => element.hasAttribute('data-site-top'))).toBe(true);
      },
    );

    it(
      'watches nothing when the first page has no fragment',
      (): void => {
        arriveAt('/');

        expect(observed).toHaveLength(0);
      },
    );

    it(
      'watches nothing for a later page with a fragment',
      (): void => {
        arriveAt('/');
        arriveAt('/#visit');

        expect(observed).toHaveLength(0);
      },
    );

    it(
      'lets go when the visitor scrolls',
      (): void => {
        arriveAt('/#visit');

        document.dispatchEvent(new Event('wheel'));

        expect(disconnect).toHaveBeenCalledTimes(1);
      },
    );

    it(
      'lets go when the visitor goes to another page',
      (): void => {
        arriveAt('/#visit');

        arriveAt('/privacy');

        expect(disconnect).toHaveBeenCalledTimes(1);
      },
    );

    it(
      'keeps holding however long the page takes to settle',
      (): void => {
        arriveAt('/#visit');

        vi.advanceTimersByTime(10 * 60 * 1000);
        notifyResize();

        expect(scrollToAnchor).toHaveBeenCalledWith('visit');
      },
    );
  },
);
