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
      vi.useRealTimers();
    });

    function step(): void {
      vi.advanceTimersByTime(intervalMs);
    }

    it(
      'starts on the first item and moves to the next each interval, wrapping round, with the previous one leaving',
      (): void => {
        expect([rotation.shownIndex(), rotation.leavingIndex()]).toEqual([0, 2]);
        step();
        expect([rotation.shownIndex(), rotation.leavingIndex()]).toEqual([1, 0]);
        step();
        step();
        expect([rotation.shownIndex(), rotation.leavingIndex()]).toEqual([0, 2]);
      },
    );

    it(
      'stays put while paused or held, and carries on after',
      (): void => {
        rotation.togglePause();
        step();
        expect(rotation.shownIndex()).toBe(0);
        expect(rotation.isPaused()).toBe(true);

        rotation.togglePause();
        rotation.hold();
        step();
        expect(rotation.shownIndex()).toBe(0);

        rotation.release();
        step();
        expect(rotation.shownIndex()).toBe(1);
      },
    );

    it(
      'stays put while stopped, with one item, or in a hidden tab',
      (): void => {
        isStopped.set(true);
        step();
        expect(rotation.shownIndex()).toBe(0);

        isStopped.set(false);
        vi.spyOn(
          document,
          'hidden',
          'get',
        ).mockReturnValue(true);
        step();
        expect(rotation.shownIndex()).toBe(0);

        vi.restoreAllMocks();
        count.set(1);
        step();
        expect(rotation.shownIndex()).toBe(0);
      },
    );

    it(
      'shows nothing out of range when the list empties or shrinks',
      (): void => {
        step();
        step();
        expect(rotation.shownIndex()).toBe(2);

        count.set(2);
        expect(rotation.shownIndex()).toBe(0);

        count.set(0);
        expect([rotation.shownIndex(), rotation.leavingIndex()]).toEqual([0, 0]);
      },
    );
  },
);
