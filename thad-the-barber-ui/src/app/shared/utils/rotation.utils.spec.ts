import { ApplicationRef, Injector, WritableSignal, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Rotation } from '../models/rotation.model';
import { createRotation } from './rotation.utils';

describe(
  'createRotation',
  (): void => {
    const intervalMs: number = 1000;
    let count: WritableSignal<number>;
    let isStopped: WritableSignal<boolean>;
    let rotation: Rotation;

    beforeEach((): void => {
      vi.useFakeTimers();
      count = signal(3);
      isStopped = signal(false);
      rotation = runInInjectionContext(
        TestBed.inject(Injector),
        (): Rotation => createRotation({
          count,
          intervalMs,
          isStopped,
        }),
      );
      TestBed.inject(ApplicationRef).tick();
    });

    afterEach((): void => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    function step(): void {
      vi.advanceTimersByTime(intervalMs);
    }

    it(
      'starts on the first item, with the last one leaving',
      (): void => {
        expect([rotation.shownIndex(), rotation.leavingIndex()]).toEqual([0, 2]);
      },
    );

    it(
      'moves to the next item each interval, with the one before leaving',
      (): void => {
        step();

        expect([rotation.shownIndex(), rotation.leavingIndex()]).toEqual([1, 0]);
      },
    );

    it(
      'wraps round to the first item after the last',
      (): void => {
        step();
        step();
        step();

        expect(rotation.shownIndex()).toBe(0);
      },
    );

    it(
      'stays put while paused',
      (): void => {
        rotation.togglePause();

        step();

        expect(rotation.shownIndex()).toBe(0);
      },
    );

    it(
      'carries on after being resumed',
      (): void => {
        rotation.togglePause();
        rotation.togglePause();

        step();

        expect(rotation.shownIndex()).toBe(1);
      },
    );

    it(
      'stays put while held',
      (): void => {
        rotation.hold();

        step();

        expect(rotation.shownIndex()).toBe(0);
      },
    );

    it(
      'carries on after being released',
      (): void => {
        rotation.hold();
        rotation.release();

        step();

        expect(rotation.shownIndex()).toBe(1);
      },
    );

    it(
      'stays put while stopped',
      (): void => {
        isStopped.set(true);

        step();

        expect(rotation.shownIndex()).toBe(0);
      },
    );

    it(
      'stays put in a hidden tab',
      (): void => {
        vi.spyOn(
          document,
          'hidden',
          'get',
        ).mockReturnValue(true);

        step();

        expect(rotation.shownIndex()).toBe(0);
      },
    );

    it(
      'stays put with a single item',
      (): void => {
        count.set(1);

        step();

        expect(rotation.shownIndex()).toBe(0);
      },
    );

    it(
      'wraps the shown item back into range when the list shrinks',
      (): void => {
        step();
        step();

        count.set(2);

        expect(rotation.shownIndex()).toBe(0);
      },
    );

    it(
      'shows and leaves the first item when the list empties',
      (): void => {
        count.set(0);

        expect([rotation.shownIndex(), rotation.leavingIndex()]).toEqual([0, 0]);
      },
    );
  },
);
