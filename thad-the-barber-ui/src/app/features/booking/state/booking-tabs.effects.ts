import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { FunctionalEffect, createEffect } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { EMPTY, Observable, filter, fromEvent, map } from 'rxjs';
import { decodeBase64 } from '../../../shared/utils/base64.utils';
import { toStorageKey } from '../../../store/meta/meta.reducers';
import { toKeptConfirmations } from '../utils/saved-confirmation.utils';
import * as BookingActions from './booking.actions';
import { bookingFeatureKey } from './booking.feature';

/**
 * The bookings another tab saved replace this tab's. Every tab writes its own booking slice to localStorage after each
 * action, so a tab holding an older list would otherwise overwrite them (BR-22). A root effect, so it runs on every
 * page, not just /book.
 */
export const adoptBookingFromOtherTab: FunctionalEffect = createEffect(
  (
    platformId: object = inject(PLATFORM_ID),
    document: Document = inject(DOCUMENT),
  ): Observable<Action> => {
    const browserWindow: Window | null = document.defaultView;
    const isBrowser: boolean = isPlatformBrowser(platformId);
    if (!isBrowser || !browserWindow) {
      return EMPTY;
    }
    const storageKey: string = toStorageKey(bookingFeatureKey);
    return fromEvent<StorageEvent>(browserWindow, 'storage').pipe(
      filter((event: StorageEvent): boolean => event.key === storageKey),
      map((event: StorageEvent): unknown => readSaved(event.newValue)),
      filter((saved: unknown): boolean => saved !== null),
      map((saved: unknown): Action =>
        BookingActions.SavedConfirmationsAdopt({ savedConfirmations: toKeptConfirmations(saved).savedConfirmations })),
    );
  },
  { functional: true },
);

/** The other tab's saved slice, or null for a value that isn't base64 JSON. */
function readSaved(value: string | null): unknown {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(decodeBase64(value));
  } catch {
    return null;
  }
}
