import { RequestStatus } from '../../../shared/models/request.models';
import { WeekTime } from '../../../shared/models/week-time.model';
import { formatMinutes, formatShortDate, fromIsoDate, toIsoDateIn, weekTimeIn } from '../../../shared/utils/date.utils';
import { isSettledEmpty } from '../../../shared/utils/request.utils';
import { WEEKDAY_SHORT_NAMES } from '../../../shared/utils/weekday.utils';
import { NextTimeSlot } from '../models/next-time-slot.model';

/** The open times with their day and time on the shop's clock; none until the shop's timezone is known. */
export function toNextTimeSlots(startAts: string[], timeZone: string | null): NextTimeSlot[] {
  if (!timeZone) {
    return [];
  }
  return startAts.map((startAt: string): NextTimeSlot => {
    const instant: Date = new Date(startAt);
    const { day, minutes }: WeekTime = weekTimeIn(timeZone, instant);
    const [time = '', period = '']: string[] = formatMinutes(minutes).split(' ');
    return {
      startAt,
      weekdayLabel: WEEKDAY_SHORT_NAMES[day],
      dayLabel: formatShortDate(fromIsoDate(toIsoDateIn(timeZone, instant))),
      time,
      period,
    };
  });
}

/**
 * True once a load has settled with no time to show. Unlike a failed gallery, a failed refresh with earlier times
 * isn't missing: those stay on the page.
 */
export function toAreNextTimesMissing(status: RequestStatus, startAts: string[]): boolean {
  return startAts.length === 0 && isSettledEmpty(status, startAts.length);
}
