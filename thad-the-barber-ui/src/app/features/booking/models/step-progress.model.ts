/** What each step needs before the next one opens; the review step is done only by booking. */
export interface StepProgress {
  hasDate: boolean;
  hasTime: boolean;
  areDetailsValid: boolean;
}
