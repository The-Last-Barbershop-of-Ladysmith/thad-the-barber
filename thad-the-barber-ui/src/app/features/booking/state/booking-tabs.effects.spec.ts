import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { Observable } from 'rxjs';
import { testConfirmation } from '../../../../testing/test-booking';
import { encodeBase64 } from '../../../shared/utils/base64.utils';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import * as BookingActions from './booking.actions';
import { adoptBookingFromOtherTab } from './booking-tabs.effects';

const ONE_DAY_MS: number = 24 * 60 * 60 * 1000;
const tomorrow: BookingConfirmation = testConfirmation(new Date(Date.now() + ONE_DAY_MS).toISOString(), 'made-up-tomorrow');
const nextWeek: BookingConfirmation = testConfirmation(new Date(Date.now() + 7 * ONE_DAY_MS).toISOString(), 'made-up-next-week');
const yesterday: BookingConfirmation = testConfirmation(new Date(Date.now() - ONE_DAY_MS).toISOString(), 'made-up-yesterday');

function saved(savedConfirmations: BookingConfirmation[]): string {
  return encodeBase64(JSON.stringify({ savedConfirmations }));
}

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

        otherTabWrites('ttb-booking', saved([
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

        otherTabWrites('ttb-booking', saved([]));

        expect(emitted).toEqual([BookingActions.SavedConfirmationsAdopt({ savedConfirmations: [] })]);
      },
    );

    it(
      "ignores other keys, a removed entry and a value that isn't the app's",
      (): void => {
        const emitted: Action[] = listen('browser');

        otherTabWrites('ttb-shop', saved([tomorrow]));
        otherTabWrites('ttb-booking', 'not base64 {');
        otherTabWrites('ttb-booking', null);

        expect(emitted).toEqual([]);
      },
    );

    it(
      'does nothing while prerendering',
      (): void => {
        const emitted: Action[] = listen('server');

        otherTabWrites('ttb-booking', saved([tomorrow]));

        expect(emitted).toEqual([]);
      },
    );
  },
);
