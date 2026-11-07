import { Signal } from '@angular/core';

export interface RotationOptions {
  count: Signal<number>;
  intervalMs: number;
  isStopped?: Signal<boolean>;
}
