import { BookingStep } from './booking-step.model';

/** How one step shows in the phone's step cards and the desktop's step rail. */
export interface StepView {
  step: BookingStep;
  number: number;
  title: string;
  /** What's picked ("Monday, October 27th 2026"), or what to do while nothing is ("Pick a day"). */
  summary: string;
  isOpen: boolean;
  isDone: boolean;
  /** A step opens only once every step before it is done. */
  isLocked: boolean;
}
