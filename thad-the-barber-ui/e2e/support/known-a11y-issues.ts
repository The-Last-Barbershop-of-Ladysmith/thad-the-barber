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
    rule: 'color-contrast',
    selector: '.p-datepicker-day.p-disabled .calendar-day',
    issue: 'A closed day is an inactive control, which WCAG 1.4.3 exempts from contrast; axe cannot tell (#84)',
  },
];
