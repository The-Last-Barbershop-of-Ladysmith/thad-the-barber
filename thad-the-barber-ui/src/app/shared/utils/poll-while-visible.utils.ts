import { EMPTY, Observable, distinctUntilChanged, fromEvent, map, startWith, switchMap, timer } from 'rxjs';

/** Emits at once while the tab is visible, then every `intervalMs`; nothing while hidden, and at once on return. */
export function pollWhileVisible(document: Document, intervalMs: number): Observable<number> {
  return fromEvent(document, 'visibilitychange').pipe(
    startWith(null),
    map((): boolean => document.visibilityState === 'visible'),
    distinctUntilChanged(),
    switchMap((isVisible: boolean): Observable<number> => isVisible ? timer(0, intervalMs) : EMPTY),
  );
}
