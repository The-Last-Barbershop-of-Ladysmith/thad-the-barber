import { BookingStep } from '../models/booking-step.model';
import { StepProgress } from '../models/step-progress.model';
import { StepView } from '../models/step-view.model';
import {
  BOOKING_STEPS,
  RESCHEDULE_STEPS,
  canOpenStep,
  isStepDone,
  toStepAfterPick,
  toStepSummaries,
  toStepViews,
} from './booking-steps.utils';

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
      'opens Time after a new day, the step after Time after a new time, and review after a Change once it can open',
      (): void => {
        expect(toStepAfterPick(
          true,
          false,
          false,
          DAY_ONLY,
          BOOKING_STEPS,
        )).toBe(BookingStep.Time);
        expect(toStepAfterPick(
          false,
          true,
          false,
          DAY_AND_TIME,
          BOOKING_STEPS,
        )).toBe(BookingStep.Details);
        expect(toStepAfterPick(
          false,
          true,
          false,
          DAY_AND_TIME,
          RESCHEDULE_STEPS,
        )).toBe(BookingStep.Review);
        expect(toStepAfterPick(
          false,
          true,
          true,
          EVERYTHING,
          BOOKING_STEPS,
        )).toBe(BookingStep.Review);
        expect(toStepAfterPick(
          false,
          true,
          true,
          DAY_AND_TIME,
          BOOKING_STEPS,
        )).toBe(BookingStep.Details);
        expect(toStepAfterPick(
          false,
          false,
          false,
          DAY_AND_TIME,
          BOOKING_STEPS,
        )).toBeNull();
      },
    );

    it(
      'sums up each step, or says what to do while nothing is picked',
      (): void => {
        expect(toStepSummaries(NOTHING, {
          date: null,
          time: null,
          details: null,
          review: 'Check and book',
        })).toEqual({
          [BookingStep.Date]: 'Pick a day',
          [BookingStep.Time]: 'Pick a day first',
          [BookingStep.Details]: 'Name and phone',
          [BookingStep.Review]: 'Check and book',
        });
        expect(toStepSummaries(DAY_ONLY, {
          date: 'Monday, February 2nd 2099',
          time: null,
          details: 'Test Customer · (555) 010-0199',
          review: 'Check and move',
        })[BookingStep.Time]).toBe('Pick a time');
      },
    );

    it(
      'numbers the steps in order, with only the open one open and the ones not yet reachable locked',
      (): void => {
        const stepViews: StepView[] = toStepViews(
          RESCHEDULE_STEPS,
          DAY_ONLY,
          toStepSummaries(DAY_ONLY, {
            date: 'Monday, February 2nd 2099',
            time: null,
            details: null,
            review: 'Check and move',
          }),
          BookingStep.Time,
        );

        expect(stepViews.map((stepView: StepView): [BookingStep, number, boolean, boolean] =>
          [
            stepView.step,
            stepView.number,
            stepView.isOpen,
            stepView.isLocked,
          ])).toEqual([
          [
            BookingStep.Date,
            1,
            false,
            false,
          ],
          [
            BookingStep.Time,
            2,
            true,
            false,
          ],
          [
            BookingStep.Review,
            3,
            false,
            true,
          ],
        ]);
      },
    );
  },
);
