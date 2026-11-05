/** An open time as the home page shows it, on the shop's clock. */
export interface NextTimeSlot {
  /** The UTC instant the API returned, which the booking page opens with. */
  startAt: string;
  /** "Sat" */
  weekdayLabel: string;
  /** "Sat, Oct 3" */
  dayLabel: string;
  /** "10:30" */
  time: string;
  /** "AM" */
  period: string;
}
