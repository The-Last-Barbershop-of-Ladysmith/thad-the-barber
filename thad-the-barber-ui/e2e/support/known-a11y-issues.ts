export interface KnownA11yIssue {
  rule: string;
  selector: string;
  issue: string;
}

/**
 * axe violations already tracked in M4. A violation is skipped only when every element it flags matches the
 * selector; it is attached to the report instead. Remove the entry when its issue is fixed.
 */
export const KNOWN_A11Y_ISSUES: readonly KnownA11yIssue[] = [
  {
    rule: 'button-name',
    selector: '.p-carousel-indicator-button',
    issue: '#80',
  },
  {
    rule: 'color-contrast',
    selector: '.p-datepicker-day.p-disabled',
    issue: '#84',
  },
  {
    rule: 'aria-allowed-attr',
    selector: '.p-datepicker-day-selected',
    issue: '#84',
  },
];
