import { RequestStatus } from '../../../shared/models/request.models';
import { formatShortDate, fromIsoDate, toIsoDateIn, weekTimeIn } from '../../../shared/utils/date.utils';
import { WEEKDAY_SHORT_NAMES } from '../../../shared/utils/weekday.utils';
import { toTimeLabel } from '../../booking/utils/booking-time.utils';
import { NextTimeSlot } from '../models/next-time-slot.model';

/** The open times with their day and time on the shop's clock; none until the shop's timezone is known. */
export function toNextTimeSlots(startAts: string[], timeZone: string | null): NextTimeSlot[] {
  if (!timeZone) {
    return [];
  }
  return startAts.map((startAt: string): NextTimeSlot => {
    const [time = '', period = '']: string[] = toTimeLabel(timeZone, startAt).split(' ');
    return {
      startAt,
      weekdayLabel: WEEKDAY_SHORT_NAMES[weekTimeIn(timeZone, new Date(startAt)).day],
      dayLabel: formatShortDate(fromIsoDate(toIsoDateIn(timeZone, new Date(startAt)))),
      time,
      period,
    };
  });
}

export function toFirstNextTimeSlot(startAts: string[], timeZone: string | null): NextTimeSlot | null {
  return toNextTimeSlots(startAts.slice(0, 1), timeZone)[0] ?? null;
}

/**
 * True once a load has settled with no time to show. Unlike a failed gallery, a failed refresh with earlier times
 * isn't missing: those stay on the page.
 */
export function toAreNextTimesMissing(status: RequestStatus, startAts: string[]): boolean {
  const isSettled: boolean = status === RequestStatus.Success || status === RequestStatus.Error;
  return isSettled && startAts.length === 0;
}
