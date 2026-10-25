import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { FunctionalEffect, createEffect } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { EMPTY, Observable, filter, fromEvent, map } from 'rxjs';
import { decodeBase64 } from '../../../shared/utils/base64.utils';
import { toStorageKey } from '../../../store/meta/meta.reducers';
import { SavedConfirmation } from '../models/saved-confirmation.model';
import { toKeptConfirmation } from '../utils/saved-confirmation.utils';
import * as BookingActions from './booking.actions';
import { bookingFeatureKey } from './booking.feature';

/**
 * A booking saved in another tab is copied into this one. Every tab writes its own booking slice to localStorage after
 * each action, so a tab still holding none would otherwise overwrite it (BR-22). A root effect, so it runs on every
 * page, not just /book.
 */
export const adoptBookingFromOtherTab: FunctionalEffect = createEffect(
  (
    platformId: object = inject(PLATFORM_ID),
    document: Document = inject(DOCUMENT),
  ): Observable<Action> => {
    const view: Window | null = document.defaultView;
    const isBrowser: boolean = isPlatformBrowser(platformId);
    if (!isBrowser || !view) {
      return EMPTY;
    }
    const storageKey: string = toStorageKey(bookingFeatureKey);
    return fromEvent<StorageEvent>(view, 'storage').pipe(
      filter((event: StorageEvent): boolean => event.key === storageKey),
      map((event: StorageEvent): SavedConfirmation | null =>
        toKeptConfirmation(readSaved(event.newValue)).savedConfirmation),
      filter((savedConfirmation: SavedConfirmation | null): savedConfirmation is SavedConfirmation =>
        savedConfirmation !== null),
      map((savedConfirmation: SavedConfirmation): Action => BookingActions.BookingConfirm({ savedConfirmation })),
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
