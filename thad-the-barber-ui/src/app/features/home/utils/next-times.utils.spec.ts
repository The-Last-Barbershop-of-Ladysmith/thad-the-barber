import { TEST_SHOP } from '../../../../testing/test-shop';
import { RequestStatus } from '../../../shared/models/request.models';
import { NextTimeSlot } from '../models/next-time-slot.model';
import { toAreNextTimesMissing, toNextTimeSlots } from './next-times.utils';

const HONOLULU: string = TEST_SHOP.timeZone;

describe(
  'toNextTimeSlots',
  (): void => {
    it(
      "labels each time's day and time on the shop's clock, in the order given",
      (): void => {
        // 05:30 UTC on Oct 4th is 7:30 PM on Oct 3rd in Honolulu; 20:00 UTC is 10:00 AM the same day.
        const slots: NextTimeSlot[] = toNextTimeSlots(['2026-10-04T05:30:00Z', '2026-10-04T20:00:00Z'], HONOLULU);

        expect(slots).toEqual([
          {
            startAt: '2026-10-04T05:30:00Z',
            weekdayLabel: 'Sat',
            dayLabel: 'Sat, Oct 3',
            time: '7:30',
            period: 'PM',
          },
          {
            startAt: '2026-10-04T20:00:00Z',
            weekdayLabel: 'Sun',
            dayLabel: 'Sun, Oct 4',
            time: '10:00',
            period: 'AM',
          },
        ]);
      },
    );

    it(
      "shows nothing until the shop's timezone is known",
      (): void => {
        expect(toNextTimeSlots(['2026-10-04T20:00:00Z'], null)).toEqual([]);
      },
    );
  },
);

describe(
  'toAreNextTimesMissing',
  (): void => {
    it(
      'is true once a load has settled with no times, loaded or failed',
      (): void => {
        expect(toAreNextTimesMissing(RequestStatus.Success, [])).toBe(true);
        expect(toAreNextTimesMissing(RequestStatus.Error, [])).toBe(true);
      },
    );

    it(
      'is false before the first load settles',
      (): void => {
        expect(toAreNextTimesMissing(RequestStatus.Idle, [])).toBe(false);
        expect(toAreNextTimesMissing(RequestStatus.Pending, [])).toBe(false);
      },
    );

    it(
      'is false while earlier times stay on show, even after a failed refresh',
      (): void => {
        expect(toAreNextTimesMissing(RequestStatus.Error, ['2026-10-04T20:00:00Z'])).toBe(false);
        expect(toAreNextTimesMissing(RequestStatus.Success, ['2026-10-04T20:00:00Z'])).toBe(false);
      },
    );
  },
);
