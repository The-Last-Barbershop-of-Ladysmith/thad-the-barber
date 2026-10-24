import { Weekday } from './weekday.model';

/** One open day, in the shop's timezone. */
export interface ShopOpeningHours {
  day: Weekday;
  /** "HH:mm:ss" */
  opens: string;
  closes: string;
}
