import { BookingStep } from '../models/booking-step.model';

export const BOOKING_STEPS: readonly BookingStep[] = [
  BookingStep.Date,
  BookingStep.Time,
  BookingStep.Details,
  BookingStep.Review,
];

/** What each step needs before the next one opens; the review step is done only by booking. */
export interface StepProgress {
  hasDate: boolean;
  hasTime: boolean;
  areDetailsValid: boolean;
}

export function isStepDone(step: BookingStep, progress: StepProgress): boolean {
  const doneBySteps: Record<BookingStep, boolean> = {
    [BookingStep.Date]: progress.hasDate,
    [BookingStep.Time]: progress.hasDate && progress.hasTime,
    [BookingStep.Details]: progress.hasDate && progress.hasTime && progress.areDetailsValid,
    [BookingStep.Review]: false,
  };
  return doneBySteps[step];
}

/** A step opens once every step before it is done. */
export function canOpenStep(step: BookingStep, progress: StepProgress): boolean {
  return BOOKING_STEPS
    .slice(0, BOOKING_STEPS.indexOf(step))
    .every((earlierStep: BookingStep): boolean => isStepDone(earlierStep, progress));
}
