import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, Subject, of, throwError } from 'rxjs';
import { Mock } from 'vitest';
import { NEXT_TIMES_POLL_INTERVAL_MS } from '../config/next-times';
import { NextTimesService } from '../services/next-times.service';
import * as HomeActions from './home.actions';
import { pollNextTimes } from './home.effects';

describe(
  'pollNextTimes',
  (): void => {
    const startAts: string[] = ['2026-10-04T20:00:00Z', '2026-10-04T20:30:00Z'];

    class FakeDocument extends EventTarget {
      visibilityState: string = 'visible';

      setVisibility(visibilityState: string): void {
        this.visibilityState = visibilityState;
        this.dispatchEvent(new Event('visibilitychange'));
      }
    }

    let actions$: Subject<Action>;
    let fakeDocument: FakeDocument;
    let getNextTimes: Mock<() => Observable<string[]>>;
    let emitted: Action[];

    function open(platform: string = 'browser'): void {
      TestBed.configureTestingModule({
        providers: [
          { provide: Actions, useValue: new Actions(actions$) },
          { provide: NextTimesService, useValue: { getNextTimes } },
          { provide: DOCUMENT, useValue: fakeDocument },
          { provide: PLATFORM_ID, useValue: platform },
        ],
      });
      TestBed.runInInjectionContext((): Observable<Action> => pollNextTimes() as Observable<Action>)
        .subscribe((action: Action): void => {
          emitted.push(action);
        });
      actions$.next(HomeActions.HomePageOpen());
      vi.advanceTimersByTime(0);
    }

    function showTab(): void {
      fakeDocument.setVisibility('visible');
      vi.advanceTimersByTime(0);
    }

    beforeEach((): void => {
      vi.useFakeTimers();
      actions$ = new Subject<Action>();
      fakeDocument = new FakeDocument();
      getNextTimes = vi.fn((): Observable<string[]> => of(startAts));
      emitted = [];
    });

    afterEach((): void => {
      vi.useRealTimers();
    });

    it(
      'loads the times at once and again every minute',
      (): void => {
        open();
        expect(emitted).toEqual([HomeActions.NextTimesRequestSuccess({ startAts })]);

        vi.advanceTimersByTime(NEXT_TIMES_POLL_INTERVAL_MS);
        vi.advanceTimersByTime(NEXT_TIMES_POLL_INTERVAL_MS);

        expect(getNextTimes).toHaveBeenCalledTimes(3);
      },
    );

    it(
      'asks for nothing while the tab is hidden, and refreshes at once when it is visible again',
      (): void => {
        open();
        fakeDocument.setVisibility('hidden');
        getNextTimes.mockClear();

        vi.advanceTimersByTime(NEXT_TIMES_POLL_INTERVAL_MS * 3);
        expect(getNextTimes).not.toHaveBeenCalled();

        showTab();
        expect(getNextTimes).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(NEXT_TIMES_POLL_INTERVAL_MS);
        expect(getNextTimes).toHaveBeenCalledTimes(2);
      },
    );

    it(
      'waits for the tab to show when the page opens in a hidden one',
      (): void => {
        fakeDocument.visibilityState = 'hidden';
        open();
        vi.advanceTimersByTime(NEXT_TIMES_POLL_INTERVAL_MS);
        expect(getNextTimes).not.toHaveBeenCalled();

        showTab();

        expect(getNextTimes).toHaveBeenCalledTimes(1);
      },
    );

    it(
      'reports a failed refresh and keeps polling',
      (): void => {
        getNextTimes.mockReturnValueOnce(throwError((): Error => new Error('503')));
        open();

        vi.advanceTimersByTime(NEXT_TIMES_POLL_INTERVAL_MS);

        expect(emitted).toEqual([
          HomeActions.NextTimesRequestFailure(),
          HomeActions.NextTimesRequestSuccess({ startAts }),
        ]);
      },
    );

    it(
      'stops when the home page closes',
      (): void => {
        open();
        actions$.next(HomeActions.HomePageClose());
        getNextTimes.mockClear();

        vi.advanceTimersByTime(NEXT_TIMES_POLL_INTERVAL_MS * 3);
        fakeDocument.setVisibility('hidden');
        showTab();

        expect(getNextTimes).not.toHaveBeenCalled();
      },
    );

    it(
      'does nothing while prerendering, so no times are baked into the page',
      (): void => {
        open('server');

        expect(getNextTimes).not.toHaveBeenCalled();
        expect(emitted).toEqual([]);
      },
    );
  },
);
