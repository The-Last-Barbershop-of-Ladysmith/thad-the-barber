import { Signal } from '@angular/core';

/** What the leave guard asks the booking page before letting the customer go (#210). */
export interface LeaveConfirmable {
  /** A picked day not yet booked or moved; leaving would lose it. */
  hasUnconfirmedPick: Signal<boolean>;
  isRescheduling: Signal<boolean>;
}
