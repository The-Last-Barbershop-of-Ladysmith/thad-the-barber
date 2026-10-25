import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { Observable } from 'rxjs';
import { testSavedConfirmation } from '../../../../testing/test-booking';
import { encodeBase64 } from '../../../shared/utils/base64.utils';
import { SavedConfirmation } from '../models/saved-confirmation.model';
import { KEEP_CONFIRMATION_MS } from '../utils/saved-confirmation.utils';
import * as BookingActions from './booking.actions';
import { adoptBookingFromOtherTab } from './booking-tabs.effects';

const keptConfirmation: SavedConfirmation = testSavedConfirmation(
  new Date().toISOString(),
  new Date(Date.now() + KEEP_CONFIRMATION_MS).toISOString(),
);

function saved(savedConfirmation: SavedConfirmation): string {
  return encodeBase64(JSON.stringify({ savedConfirmation }));
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
      "copies a booking another tab saved into this tab's slice",
      (): void => {
        const emitted: Action[] = listen('browser');

        otherTabWrites('ttb-booking', saved(keptConfirmation));

        expect(emitted).toEqual([BookingActions.BookingConfirm({ savedConfirmation: keptConfirmation })]);
      },
    );

    it(
      "ignores other keys, an expired or missing booking, and a value that isn't the app's",
      (): void => {
        const expired: SavedConfirmation = testSavedConfirmation(
          new Date(Date.now() - KEEP_CONFIRMATION_MS - 60_000).toISOString(),
          keptConfirmation.booking.startAt,
        );
        const emitted: Action[] = listen('browser');

        otherTabWrites('ttb-shop', saved(keptConfirmation));
        otherTabWrites('ttb-booking', saved(expired));
        otherTabWrites('ttb-booking', encodeBase64(JSON.stringify({ savedConfirmation: null })));
        otherTabWrites('ttb-booking', 'not base64 {');
        otherTabWrites('ttb-booking', null);

        expect(emitted).toEqual([]);
      },
    );

    it(
      'does nothing while prerendering',
      (): void => {
        const emitted: Action[] = listen('server');

        otherTabWrites('ttb-booking', saved(keptConfirmation));

        expect(emitted).toEqual([]);
      },
    );
  },
);
