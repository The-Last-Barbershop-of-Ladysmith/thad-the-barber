import { ActionReducer, MetaReducer } from '@ngrx/store';
import { Keys, localStorageSync } from 'ngrx-store-localstorage';
import { decodeBase64, encodeBase64 } from '../../shared/utils/base64.utils';
import { shopFeatureKey } from '../../features/shop/state/shop.feature';
import { bookingFeatureKey } from '../../features/booking/state/booking.state';

/** Slices persisted to localStorage, base64-encoded, each with the fields it keeps. */
const keys: Keys = [
  // Only the shop itself: a saved load status would stop the next visit refreshing it.
  {
    [shopFeatureKey]: {
      encrypt: encodeBase64,
      decrypt: decodeBase64,
      filter: ['shopInfo'],
    },
  },
];

/**
 * The lookup token for the tab only: it dies with the tab, so a shared device never keeps it, and the API expires it
 * after 15 minutes anyway (BR-22).
 */
const sessionKeys: Keys = [
  {
    [bookingFeatureKey]: {
      encrypt: encodeBase64,
      decrypt: decodeBase64,
      filter: ['lookupToken'],
    },
  },
];

/**
 * Saves the synced slices after every action and restores them on start-up (deep-merged over their initial state).
 * Dates stay the ISO strings the slices hold: the library would otherwise turn them into `Date` objects.
 */
export function localStorageSyncReducer<State>(reducer: ActionReducer<State>): ActionReducer<State> {
  return localStorageSync({
    keys,
    rehydrate: true,
    restoreDates: false,
    checkStorageAvailability: true,
    storageKeySerializer: (sliceKey: string): string => `ttb-${sliceKey}`,
  })(reducer);
}

/**
 * The library falls back to `localStorage` whenever it checks availability, so this one checks for itself: prerender
 * has no `sessionStorage`, and a browser may block it.
 */
export function sessionStorageSyncReducer<State>(reducer: ActionReducer<State>): ActionReducer<State> {
  let isSessionStorageAvailable: boolean;
  try {
    isSessionStorageAvailable = typeof sessionStorage !== 'undefined';
  } catch {
    isSessionStorageAvailable = false;
  }
  if (!isSessionStorageAvailable) {
    return reducer;
  }
  return localStorageSync({
    keys: sessionKeys,
    storage: sessionStorage,
    rehydrate: true,
    restoreDates: false,
    storageKeySerializer: (sliceKey: string): string => `ttb-${sliceKey}`,
  })(reducer);
}

export const metaReducers: MetaReducer[] = [localStorageSyncReducer, sessionStorageSyncReducer];
