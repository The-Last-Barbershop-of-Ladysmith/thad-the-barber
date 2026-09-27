import { TestBed } from '@angular/core/testing';
import { type HoursRow } from '../models/shop.models';
import { ShopHoursService } from './shop-hours.service';

describe(
  'ShopHoursService',
  (): void => {
    let service: ShopHoursService;

    beforeEach((): void => {
      service = TestBed.inject(ShopHoursService);
    });

    // 2026-09-26 is a Saturday, 2026-09-27 a Sunday, 2026-09-28 a Monday.
    it(
      'is open during Saturday hours',
      (): void => {
        expect(service.statusAt(new Date(
          2026,
          8,
          26,
          12,
          0,
        ))).toEqual({
          isOpen: true,
          label: 'Open now',
        });
      },
    );

    it(
      'announces a same-day opening before 10 AM',
      (): void => {
        expect(service.statusAt(new Date(
          2026,
          8,
          27,
          8,
          30,
        )).label).toBe('Opens today at 10 AM');
      },
    );

    it(
      'points to Sunday after Saturday closes',
      (): void => {
        expect(service.statusAt(new Date(
          2026,
          8,
          26,
          19,
          0,
        )).label).toBe('Closed · Opens Sun 10 AM');
      },
    );

    it(
      'points to Saturday on a weekday',
      (): void => {
        expect(service.statusAt(new Date(
          2026,
          8,
          28,
          12,
          0,
        ))).toEqual({
          isOpen: false,
          label: 'Closed · Opens Sat 10 AM',
        });
      },
    );

    it(
      'lists open days then one closed row',
      (): void => {
        expect(service.rows.map((row: HoursRow): string => `${row.label}: ${row.range}`)).toEqual([
          'Saturday: 10:00 AM – 7:00 PM',
          'Sunday: 10:00 AM – 4:00 PM',
          'Monday – Friday: Closed',
        ]);
      },
    );

    it(
      'reports Monday–Friday as closed weekdays',
      (): void => {
        expect(service.closedWeekdays()).toEqual([
          1,
          2,
          3,
          4,
          5,
        ]);
      },
    );
  },
);
