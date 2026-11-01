import { BookingStep } from '../models/booking-step.model';
import { StepProgress } from '../models/step-progress.model';
import { StepSummaryLabels } from '../models/step-summary-labels.model';
import { StepView } from '../models/step-view.model';

export const STEP_TITLES: Record<BookingStep, string> = {
  [BookingStep.Date]: 'Date',
  [BookingStep.Time]: 'Time',
  [BookingStep.Details]: 'Your details',
  [BookingStep.Review]: 'Review & confirm',
};

export const BOOKING_STEPS: readonly BookingStep[] = [
  BookingStep.Date,
  BookingStep.Time,
  BookingStep.Details,
  BookingStep.Review,
];

/** Moving a booking asks for no details: the booking already has them. */
export const RESCHEDULE_STEPS: readonly BookingStep[] = [
  BookingStep.Date,
  BookingStep.Time,
  BookingStep.Review,
];

export function isStepDone(step: BookingStep, progress: StepProgress): boolean {
  const doneBySteps: Record<BookingStep, boolean> = {
    [BookingStep.Date]: progress.hasDate,
    [BookingStep.Time]: progress.hasDate && progress.hasTime,
    [BookingStep.Details]: progress.hasDate && progress.hasTime && progress.areDetailsValid,
    [BookingStep.Review]: false,
  };
  return doneBySteps[step];
}

/** A step opens once every step before it in `steps` is done. */
export function canOpenStep(
  step: BookingStep,
  progress: StepProgress,
  steps: readonly BookingStep[] = BOOKING_STEPS,
): boolean {
  return steps
    .slice(0, steps.indexOf(step))
    .every((earlierStep: BookingStep): boolean => isStepDone(earlierStep, progress));
}

export function toStepSummaries(progress: StepProgress, labels: StepSummaryLabels): Record<BookingStep, string> {
  return {
    [BookingStep.Date]: labels.date ?? 'Pick a day',
    [BookingStep.Time]: progress.hasDate ? labels.time ?? 'Pick a time' : 'Pick a day first',
    [BookingStep.Details]: labels.details ?? 'Name and phone',
    [BookingStep.Review]: labels.review,
  };
}

/**
 * The step a new pick opens: a new day opens Time; a new time opens the step after it, or review after a review row's
 * Change once review can open. Null when neither pick is new.
 */
export function toStepAfterPick(
  isNewDay: boolean,
  isNewTime: boolean,
  isReturningToReview: boolean,
  progress: StepProgress,
  steps: readonly BookingStep[],
): BookingStep | null {
  if (isNewDay) {
    return BookingStep.Time;
  }
  if (!isNewTime) {
    return null;
  }
  if (isReturningToReview && canOpenStep(
    BookingStep.Review,
    progress,
    steps,
  )) {
    return BookingStep.Review;
  }
  return steps[steps.indexOf(BookingStep.Time) + 1] ?? BookingStep.Review;
}

/** How each of `steps` shows in the step cards and rail. */
export function toStepViews(
  steps: readonly BookingStep[],
  progress: StepProgress,
  summaries: Record<BookingStep, string>,
  openStep: BookingStep,
): StepView[] {
  return steps.map((step: BookingStep, index: number): StepView => ({
    step,
    number: index + 1,
    title: STEP_TITLES[step],
    summary: summaries[step],
    isOpen: step === openStep,
    isDone: isStepDone(step, progress),
    isLocked: !canOpenStep(
      step,
      progress,
      steps,
    ),
  }));
}
