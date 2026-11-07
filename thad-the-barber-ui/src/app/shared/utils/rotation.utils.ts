import { DestroyRef, Signal, WritableSignal, afterNextRender, computed, inject, signal } from '@angular/core';
import { Rotation } from '../models/rotation.model';
import { RotationOptions } from '../models/rotation-options.model';

/** Call from a field initializer. Moves on only in the browser, and not while the tab is hidden. */
export function createRotation(options: RotationOptions): Rotation {
  const destroyRef: DestroyRef = inject(DestroyRef);
  const stepCount: WritableSignal<number> = signal(0);
  const isPaused: WritableSignal<boolean> = signal(false);
  let isHeld: boolean = false;

  const shownIndex: Signal<number> = computed((): number => {
    const count: number = options.count();
    if (count === 0) {
      return 0;
    }
    return stepCount() % count;
  });
  const leavingIndex: Signal<number> = computed((): number => {
    const count: number = options.count();
    if (count === 0) {
      return 0;
    }
    return (shownIndex() - 1 + count) % count;
  });

  afterNextRender((): void => {
    const timerId: ReturnType<typeof setInterval> = setInterval((): void => {
      const isOnlyOne: boolean = options.count() < 2;
      const isStopped: boolean = options.isStopped?.() === true;
      if (document.hidden || isPaused() || isHeld || isStopped || isOnlyOne) {
        return;
      }
      stepCount.update((count: number): number => count + 1);
    }, options.intervalMs);
    destroyRef.onDestroy((): void => {
      clearInterval(timerId);
    });
  });

  return {
    shownIndex,
    leavingIndex,
    isPaused,
    togglePause: (): void => {
      isPaused.update((wasPaused: boolean): boolean => !wasPaused);
    },
    hold: (): void => {
      isHeld = true;
    },
    release: (): void => {
      isHeld = false;
    },
  };
}
