import { Weekday } from './weekday.model';

/** A moment on a weekly clock: the weekday and minutes after midnight. */
export interface WeekTime {
  day: Weekday;
  minutes: number;
}
