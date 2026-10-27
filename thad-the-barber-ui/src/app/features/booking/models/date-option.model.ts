/** An open day in the date step's list: the shop-calendar day ("2026-10-27") and how it reads. */
export interface DateOption {
  date: string;
  label: string;
  /** The label plus the open count, so a screen reader hears "only 3 left" too. */
  accessibleLabel: string;
  openCount: number;
  isFillingUp: boolean;
}
