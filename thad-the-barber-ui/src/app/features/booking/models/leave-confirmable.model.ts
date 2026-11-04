import { Signal } from '@angular/core';

export interface LeaveConfirmable {
  hasUnconfirmedPick: Signal<boolean>;
  isRescheduling: Signal<boolean>;
}
