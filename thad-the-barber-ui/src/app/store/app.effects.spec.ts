import { TestBed } from '@angular/core/testing';
import {
  Event,
  NavigationEnd,
  NavigationStart,
  Router,
} from '@angular/router';
import { Action } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { LayoutActions } from './app.actions';
import { closeMenuOnNavigation } from './app.effects';

describe(
  'closeMenuOnNavigation',
  (): void => {
    it(
      'closes the menu when navigation ends, not when it starts',
      (): void => {
        const events: Subject<Event> = new Subject<Event>();
        TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: { events } }] });
        const emitted: Action[] = [];

        const runEffect: () => Observable<Action> = (): Observable<Action> =>
          closeMenuOnNavigation() as Observable<Action>;
        const effect$: Observable<Action> = TestBed.runInInjectionContext(runEffect);
        effect$.subscribe((action: Action): void => {
          emitted.push(action);
        });

        events.next(new NavigationStart(1, '/book'));
        expect(emitted).toEqual([]);

        events.next(new NavigationEnd(
          1,
          '/book',
          '/book',
        ));
        expect(emitted).toEqual([LayoutActions.menuClosed()]);
      },
    );
  },
);
