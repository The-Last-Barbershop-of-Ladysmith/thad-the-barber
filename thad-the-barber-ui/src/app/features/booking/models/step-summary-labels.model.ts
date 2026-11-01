/** What each step's summary line shows once it's done; `details` is null until the name and phone are valid. */
export interface StepSummaryLabels {
  date: string | null;
  time: string | null;
  details: string | null;
  review: string;
}
