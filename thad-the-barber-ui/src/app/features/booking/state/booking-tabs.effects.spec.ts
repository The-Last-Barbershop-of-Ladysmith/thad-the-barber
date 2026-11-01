import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { Observable } from 'rxjs';
import { encodeSavedBookings, testConfirmationIn } from '../../../../testing/test-booking';
import { encodeBase64 } from '../../../shared/utils/base64.utils';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import * as BookingActions from './booking.actions';
import { adoptBookingFromOtherTab } from './booking-tabs.effects';

const tomorrow: BookingConfirmation = testConfirmationIn(1, 'made-up-tomorrow');
const nextWeek: BookingConfirmation = testConfirmationIn(7, 'made-up-next-week');
const yesterday: BookingConfirmation = testConfirmationIn(-1, 'made-up-yesterday');

describe(
  'adoptBookingFromOtherTab',
  (): void => {
    function listen(platform: string): Action[] {
      TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
      const emitted: Action[] = [];
      TestBed.runInInjectionContext((): Observable<Action> => adoptBookingFromOtherTab() as Observable<Action>)
        .subscribe((action: Action): void => {
          emitted.push(action);
        });
      return emitted;
    }

    function otherTabWrites(key: string, newValue: string | null): void {
      window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
    }

    it(
      "replaces this tab's bookings with the upcoming ones another tab saved, soonest first",
      (): void => {
        const emitted: Action[] = listen('browser');

        otherTabWrites('ttb-booking', encodeSavedBookings([
          nextWeek,
          yesterday,
          tomorrow,
        ]));

        expect(emitted).toEqual([BookingActions.SavedConfirmationsAdopt({ savedConfirmations: [tomorrow, nextWeek] })]);
      },
    );

    it(
      'adopts an emptied list, so a booking dropped in one tab is dropped in all',
      (): void => {
        const emitted: Action[] = listen('browser');

        otherTabWrites('ttb-booking', encodeSavedBookings([]));

        expect(emitted).toEqual([BookingActions.SavedConfirmationsAdopt({ savedConfirmations: [] })]);
      },
    );

    it(
      "ignores other keys, a removed entry, a value that isn't the app's and an older build's shape",
      (): void => {
        const emitted: Action[] = listen('browser');

        otherTabWrites('ttb-shop', encodeSavedBookings([tomorrow]));
        otherTabWrites('ttb-booking', 'not base64 {');
        otherTabWrites('ttb-booking', null);
        otherTabWrites('ttb-booking', encodeBase64(JSON.stringify({ savedConfirmation: { booking: tomorrow } })));

        expect(emitted).toEqual([]);
      },
    );

    it(
      'does nothing while prerendering',
      (): void => {
        const emitted: Action[] = listen('server');

        otherTabWrites('ttb-booking', encodeSavedBookings([tomorrow]));

        expect(emitted).toEqual([]);
      },
    );
  },
);
