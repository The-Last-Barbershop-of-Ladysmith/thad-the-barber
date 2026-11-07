import { ViewportScroller } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter, take } from 'rxjs';

const VISITOR_INPUT_EVENTS: readonly string[] = [
  'wheel',
  'touchstart',
  'keydown',
  'pointerdown',
];

/**
 * A page opened on a link with a fragment scrolls to it once, then images, the map and the announcement strip arrive
 * and move it. Scrolls to it again whenever the page or the fixed header changes size, until the visitor takes over
 * by scrolling, pressing a key or clicking, or goes to another page.
 */
export function holdFirstAnchor(
  document: Document,
  router: Router,
  viewportScroller: ViewportScroller,
): void {
  router.events.pipe(
    filter((event: unknown): event is NavigationEnd => event instanceof NavigationEnd),
    take(1),
  ).subscribe((event: NavigationEnd): void => {
    const fragment: string | null = router.parseUrl(event.urlAfterRedirects).fragment;
    if (fragment === null) {
      return;
    }
    const sizeObserver: ResizeObserver = new ResizeObserver((): void => {
      viewportScroller.scrollToAnchor(fragment);
    });

    function stop(): void {
      sizeObserver.disconnect();
      VISITOR_INPUT_EVENTS.forEach((name: string): void => {
        document.removeEventListener(name, stop);
      });
    }

    sizeObserver.observe(document.documentElement);
    const header: Element | null = document.querySelector('[data-site-top]');
    if (header !== null) {
      sizeObserver.observe(header);
    }
    VISITOR_INPUT_EVENTS.forEach((name: string): void => {
      document.addEventListener(
        name,
        stop,
        { passive: true },
      );
    });
    router.events.pipe(
      filter((later: unknown): later is NavigationEnd => later instanceof NavigationEnd),
      take(1),
    ).subscribe(stop);
  });
}
