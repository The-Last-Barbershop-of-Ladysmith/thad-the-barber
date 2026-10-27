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
];
