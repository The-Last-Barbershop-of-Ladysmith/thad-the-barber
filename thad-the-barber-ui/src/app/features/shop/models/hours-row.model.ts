export interface HoursRow {
  label: string;
  shortLabel: string;
  /** "10:00 AM – 7:00 PM"; empty for a closed row */
  range: string;
  /** "10 AM – 7 PM" */
  shortRange: string;
  isClosed: boolean;
  /** True for the one row of the shop's current weekday, on the shop's clock. */
  isToday: boolean;
}
