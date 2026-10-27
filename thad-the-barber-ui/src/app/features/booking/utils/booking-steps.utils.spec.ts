import { BookingStep } from '../models/booking-step.model';
import { StepProgress, canOpenStep, isStepDone, toNextStep, toPreviousStep } from './booking-steps.utils';

const NOTHING: StepProgress = {
  hasDate: false,
  hasTime: false,
  areDetailsValid: false,
};
const DAY_ONLY: StepProgress = {
  hasDate: true,
  hasTime: false,
  areDetailsValid: false,
};
const DAY_AND_TIME: StepProgress = {
  hasDate: true,
  hasTime: true,
  areDetailsValid: false,
};
const EVERYTHING: StepProgress = {
  hasDate: true,
  hasTime: true,
  areDetailsValid: true,
};
/** Details typed in before any day: they count only once a day and time are picked. */
const DETAILS_ONLY: StepProgress = {
  hasDate: false,
  hasTime: false,
  areDetailsValid: true,
};

describe(
  'booking steps',
  (): void => {
    it(
      'opens only the date step before anything is picked',
      (): void => {
        expect(canOpenStep(BookingStep.Date, NOTHING)).toBe(true);
        expect(canOpenStep(BookingStep.Time, NOTHING)).toBe(false);
        expect(canOpenStep(BookingStep.Review, NOTHING)).toBe(false);
      },
    );

    it(
      'opens each step once the ones before it are done',
      (): void => {
        expect(canOpenStep(BookingStep.Time, DAY_ONLY)).toBe(true);
        expect(canOpenStep(BookingStep.Details, DAY_ONLY)).toBe(false);
        expect(canOpenStep(BookingStep.Details, DAY_AND_TIME)).toBe(true);
        expect(canOpenStep(BookingStep.Review, DAY_AND_TIME)).toBe(false);
        expect(canOpenStep(BookingStep.Review, EVERYTHING)).toBe(true);
      },
    );

    it(
      "doesn't count details typed in before a day and time are picked",
      (): void => {
        expect(isStepDone(BookingStep.Details, DETAILS_ONLY)).toBe(false);
        expect(canOpenStep(BookingStep.Review, DETAILS_ONLY)).toBe(false);
      },
    );

    it(
      'never marks the review step done',
      (): void => {
        expect(isStepDone(BookingStep.Review, EVERYTHING)).toBe(false);
      },
    );

    it(
      'steps forward and back, stopping at the ends',
      (): void => {
        expect(toNextStep(BookingStep.Date)).toBe(BookingStep.Time);
        expect(toNextStep(BookingStep.Review)).toBeNull();
        expect(toPreviousStep(BookingStep.Details)).toBe(BookingStep.Time);
        expect(toPreviousStep(BookingStep.Date)).toBeNull();
      },
    );
  },
);
