import { Signal } from '@angular/core';

export interface Rotation {
  shownIndex: Signal<number>;
  leavingIndex: Signal<number>;
  isPaused: Signal<boolean>;
  togglePause(): void;
  hold(): void;
  release(): void;
}
