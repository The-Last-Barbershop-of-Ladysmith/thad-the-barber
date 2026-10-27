import { BookingStep } from './booking-step.model';

/** A review row: what was picked, and the step its Change link opens. */
export interface SummaryRow {
  label: string;
  value: string;
  step: BookingStep;
}
