export interface HoursRow {
  label: string;
  shortLabel: string;
  /** "10:00 AM – 7:00 PM" */
  range: string;
  /** "10 AM – 7 PM" */
  shortRange: string;
  closed: boolean;
}
